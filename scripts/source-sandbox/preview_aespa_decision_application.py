"""Build a local-only no-action AESPA decision-application dry-run preview."""
import argparse, copy, hashlib, importlib.util, json, sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

INPUT_SHA = "12801c4a5b9af1773d7ea54b1b96c7c330b6a923d7fd53868c879d7e19e82d9c"
INPUT_VALIDATION_FILE_SHA = "4c50277862199a14349a9fa3fe9b4bcf13e8a86dd39f535cf26fb0bd3e2ae64d"
INPUT_VALIDATION_SHA = "846bd6eba724f83963038660bb49de039a263754e43761cb1f7488e23af48067"
SCHEMA = "v36"
KEY = "sandbox:artist:aespa"
PREVIEW_FIELDS = ("dry_run_id", "validation_id", "queue_item_id", "internal_source_id", "gate_id", "gate_status", "decision_intent", "dry_run_effect", "actionability_status", "production_write_status", "approval_snapshot_status", "audit_event_status", "score_application_status", "decision_input_hash")
FORBIDDEN_DECISIONS = {"approved", "rejected", "approve", "reject", "accepted", "denied", "completed", "decided", "approve_candidate", "accept_exception"}
HELPERS = ("contract_errors", "linkage_errors", "validate_entry", "build_outputs", "canonical_bytes", "digest", "duplicates")

class Failure(ValueError): pass

def file_hash(path):
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1048576), b""): digest.update(chunk)
    return digest.hexdigest()

def load(path): return json.loads(path.read_text(encoding="utf-8"))
def object_hash(value): return hashlib.sha256(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
def write(path, value): path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes((json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode())
def duplicate_count(values): return sum(count - 1 for count in Counter(values).values() if count > 1)

def load_builder(path):
    if not path.is_file(): raise Failure("historical application helper unavailable")
    spec = importlib.util.spec_from_file_location("historical_decision_application_builder", path)
    if spec is None or spec.loader is None: raise Failure("historical application helper unavailable")
    module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    missing = [name for name in HELPERS if not callable(getattr(module, name, None))]
    if missing: raise Failure("historical application helper unavailable: " + ", ".join(missing))
    return module

def validate_wrapper(contract):
    expected = {"contract_version": "v1", "scope": "local_sandbox_preview_only", "production_policy": False, "decision_application_dry_run_only": True, "human_review_execution_authorized": False, "source_decision_authorized": False, "decision_application_authorized": False, "production_mutation_authorized": False, "pipeline_authorized": False, "actual_approve": False, "actual_reject": False, "actual_application": False, "production_promotion": False}
    bad = [key for key, value in expected.items() if contract.get(key) != value]
    if bad: raise Failure("wrapper contract mismatch: " + ", ".join(bad))

def validate_provenance(items, repro, validation, input_hash, repro_hash, validation_hash):
    checks = {
        "canonical_hash": input_hash == INPUT_SHA, "repro_hash": repro_hash == INPUT_SHA,
        "hash_match": input_hash == repro_hash, "record_match": items == repro,
        "validation_file_hash": validation_hash == INPUT_VALIDATION_FILE_SHA,
        "deterministic_validation": validation.get("deterministic_validation_sha256") == INPUT_VALIDATION_SHA,
        "provenance": validation.get("input_preview_provenance_status") == "verified",
        "preview_status": validation.get("preview_status") == "valid_local_decision_input_preview",
        "eligibility": validation.get("decision_input_preview_eligibility") == "eligible",
        "count": validation.get("decision_input_source_record_count") == validation.get("decision_input_template_record_count") == len(items) == len(repro) == 1000,
        "source": validation.get("news_template_count") == 1000 and validation.get("blog_template_count") == 0,
        "states": validation.get("pending_review_input_count") == validation.get("not_decided_input_count") == 1000,
        "decisions": all(validation.get(key) == 0 for key in ("decision_value_provided_count", "approval_value_provided_count", "rejection_value_provided_count", "decided_value_count")),
        "review_metadata": all(validation.get(key) == 0 for key in ("reviewer_value_provided_count", "review_timestamp_value_provided_count", "review_note_value_provided_count")),
        "duplicates": all(validation.get(key) == 0 for key in ("duplicate_decision_input_id_count", "duplicate_decision_preview_id_count", "duplicate_queue_id_count", "duplicate_gate_id_count", "duplicate_internal_source_id_count")),
        "identities": validation.get("production_identity_status") == validation.get("registry_identity_status") == "not_confirmed",
        "effects": all(validation.get(key) == 0 for key in ("actual_human_review_execution_count", "source_decision_execution_count", "decision_application_execution_count", "production_effect_count", "database_write_count", "storage_write_count", "pipeline_execution_count", "score_calculation_count", "ranking_update_count", "artist_page_update_count")),
    }
    bad = [key for key, okay in checks.items() if not okay]
    if bad: raise Failure("v57 input mismatch: " + ", ".join(bad))
    for field in ("queue_item_id", "gate_id", "internal_source_id"):
        if duplicate_count(item.get(field) for item in items): raise Failure("duplicate " + field)
    for item in items:
        strings = {value.casefold() for value in item.values() if isinstance(value, str)}
        if strings & FORBIDDEN_DECISIONS or item.get("decision_intent") != "not_decided": raise Failure("actual decision value detected")
        if item.get("reviewer_id") is not None or item.get("reviewed_at") is not None or item.get("reviewer_note") is not None: raise Failure("review metadata detected")

def build(items, input_validation, builder, builder_path, builder_hash, input_hash, repro_hash):
    input_contract = load(builder_path.with_name("human_review_decision_contract.preview.json"))
    application_contract = load(builder_path.with_name("human_review_decision_application_contract.preview.json"))
    if builder.contract_errors(input_contract, application_contract): raise Failure("historical application contract error")
    queue = [{"queue_item_id": x["queue_item_id"], "internal_source_id": x["internal_source_id"], "gate_id": x["gate_id"], "gate_status": x["gate_status"]} for x in items]
    gates = [{"gate_id": x["gate_id"], "gate_status": x["gate_status"]} for x in items]
    queue_summary = {"active_queue_count": len(queue), "decision_template_entry_count": len(items), "total_gate_records": len(gates)}
    if builder.linkage_errors(queue, items, gates, queue_summary): raise Failure("historical application linkage error")
    validation_records, preview, historical_summary = builder.build_outputs(input_contract, application_contract, queue, items, gates, queue_summary)
    if any(tuple(record) != PREVIEW_FIELDS for record in preview): raise Failure("historical application schema mismatch")
    if not (len(validation_records) == len(preview) == len(items)): raise Failure("dry-run inspection count mismatch")
    if historical_summary.get("invalid_decision_count") or any(x["dry_run_effect"] != "no_change" or x["actionability_status"] != "no_action" for x in preview): raise Failure("historical no-op semantics violated")
    preview_ids = [x["dry_run_id"] for x in preview]; decision_input_ids = [hashlib.sha256(builder.canonical_bytes(x)).hexdigest() for x in items]
    decision_preview_ids = preview_ids; queue_ids = [x["queue_item_id"] for x in preview]; gate_ids = [x["gate_id"] for x in preview]; source_ids = [x["internal_source_id"] for x in preview]
    if any(duplicate_count(values) for values in (preview_ids, decision_input_ids, decision_preview_ids, queue_ids, gate_ids, source_ids)): raise Failure("duplicate linkage ID")
    source_counts = {"news": len(items)}; queue_counts = {"pending_review": len(items)}; decision_counts = Counter(x["decision_intent"] for x in items); application_counts = Counter(x["actionability_status"] for x in preview)
    reason_counts = input_validation["decision_reason_code_counts"]
    warnings = [{"warning_code": "historical_pending_review_status_preserved", "affected_count": len(items)}, {"warning_code": "historical_blank_not_decided_template_preserved", "affected_count": len(items)}]
    canonical = builder.canonical_bytes(preview); preview_sha = hashlib.sha256(canonical).hexdigest()
    result = {
        "contract_version": "v1", "scope": "local_sandbox_preview_only", "production_policy": False, "decision_application_dry_run_only": True,
        "human_review_execution_authorized": False, "source_decision_authorized": False, "decision_application_authorized": False, "production_mutation_authorized": False, "pipeline_authorized": False,
        "target_display_query": input_validation["target_display_query"], "normalized_schema_version": SCHEMA,
        "existing_application_builder_reused": True, "existing_application_builder_module_path": "scripts/source-sandbox/validate_human_review_decisions.py", "existing_application_builder_module_hash": builder_hash, "existing_application_builder_main_executed": False, "reused_helpers": list(HELPERS),
        "input_decision_provenance_status": input_validation["input_preview_provenance_status"], "input_decision_preview_status": input_validation["preview_status"], "input_decision_preview_eligibility": input_validation["decision_input_preview_eligibility"],
        "input_record_count": len(items), "input_sha256": input_hash, "input_repro_sha256": repro_hash, "input_hash_match": input_hash == repro_hash,
        "sandbox_artist_key": KEY, "production_identity_status": "not_confirmed", "registry_identity_status": "not_confirmed",
        "preview_status": "valid_local_decision_application_dry_run", "application_dry_run_eligibility": "eligible", "dry_run_inspection_record_count": len(preview),
        "actual_decision_value_count": 0, "actual_approved_decision_count": 0, "actual_rejected_decision_count": 0, "actual_decided_count": 0,
        "actual_application_candidate_count": 0, "actual_application_execution_count": 0, "no_application_due_to_undecided_count": len(preview),
        "news_count": len(items), "blog_count": 0, "pending_review_count": len(items), "not_decided_count": decision_counts["not_decided"],
        "reviewer_value_count": 0, "review_timestamp_value_count": 0, "review_note_value_count": 0,
        "unique_application_preview_id_count": len(set(preview_ids)), "duplicate_application_preview_id_count": duplicate_count(preview_ids),
        "unique_decision_input_id_count": len(set(decision_input_ids)), "duplicate_decision_input_id_count": duplicate_count(decision_input_ids),
        "unique_decision_preview_id_count": len(set(decision_preview_ids)), "duplicate_decision_preview_id_count": duplicate_count(decision_preview_ids),
        "unique_queue_id_count": len(set(queue_ids)), "duplicate_queue_id_count": duplicate_count(queue_ids), "unique_gate_id_count": len(set(gate_ids)), "duplicate_gate_id_count": duplicate_count(gate_ids), "unique_internal_source_id_count": len(set(source_ids)), "duplicate_internal_source_id_count": duplicate_count(source_ids),
        "source_type_counts": source_counts, "queue_status_counts": queue_counts, "decision_status_counts": dict(sorted(decision_counts.items())), "application_status_counts": dict(sorted(application_counts.items())), "reason_code_counts": reason_counts,
        "canonical_output_git_tracked": False, "safe_metadata_contains_source_url_value": False, "safe_metadata_contains_author_value": False, "safe_metadata_contains_title_value": False, "safe_metadata_contains_summary_value": False,
        "preview_error_count": 0, "preview_warning_count": len(warnings), "preview_errors": [], "preview_warnings": warnings,
        "local_application_dry_run_execution_count": 1, "actual_human_review_execution_count": 0, "source_decision_execution_count": 0, "decision_application_execution_count": 0,
        "production_mutation_count": 0, "production_effect_count": 0, "database_write_count": 0, "storage_write_count": 0, "pipeline_execution_count": 0, "score_calculation_count": 0, "ranking_update_count": 0, "artist_page_update_count": 0,
        "deterministic_application_preview_sha256": preview_sha,
    }
    result["deterministic_validation_sha256"] = object_hash(result)
    return preview, canonical, result

def safe_summary(validation):
    keys = ("contract_version", "scope", "production_policy", "decision_application_dry_run_only", "target_display_query", "existing_application_builder_reused", "input_decision_provenance_status", "input_decision_preview_status", "preview_status", "application_dry_run_eligibility", "input_record_count", "dry_run_inspection_record_count", "actual_decision_value_count", "actual_approved_decision_count", "actual_rejected_decision_count", "actual_decided_count", "actual_application_candidate_count", "actual_application_execution_count", "no_application_due_to_undecided_count", "news_count", "blog_count", "pending_review_count", "not_decided_count", "duplicate_application_preview_id_count", "source_type_counts", "queue_status_counts", "decision_status_counts", "application_status_counts", "reason_code_counts", "production_identity_status", "registry_identity_status", "actual_human_review_execution_count", "source_decision_execution_count", "decision_application_execution_count", "production_mutation_count", "production_effect_count", "deterministic_application_preview_sha256", "deterministic_validation_sha256")
    result = {key: validation[key] for key in keys}
    result.update({"generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), "warning_codes": [x["warning_code"] for x in validation["preview_warnings"]], "canonical_application_schema_preserved": True, "safe_summary_contains_source_url_value": False, "safe_summary_contains_author_value": False, "deterministic_input_sha256": validation["input_sha256"]})
    return result

def run(args):
    if not args.confirm_local_decision_application_dry_run: raise Failure("--confirm-local-decision-application-dry-run is required; v57 inputs were not loaded")
    validate_wrapper(load(args.wrapper_contract_file)); builder = load_builder(args.historical_application_builder_file)
    input_hash = file_hash(args.decision_input_file); repro_hash = file_hash(args.decision_input_repro_file); validation_hash = file_hash(args.decision_input_validation_file); repro_validation_hash = file_hash(args.decision_input_repro_validation_file)
    items = load(args.decision_input_file); repro = load(args.decision_input_repro_file); input_validation = load(args.decision_input_validation_file); repro_validation = load(args.decision_input_repro_validation_file)
    if validation_hash != repro_validation_hash or input_validation != repro_validation: raise Failure("v57 first/repro validation mismatch")
    validate_provenance(items, repro, input_validation, input_hash, repro_hash, validation_hash)
    preview, canonical, validation = build(items, input_validation, builder, args.historical_application_builder_file, file_hash(args.historical_application_builder_file), input_hash, repro_hash)
    summary = safe_summary(validation); args.canonical_output_file.parent.mkdir(parents=True, exist_ok=True); args.canonical_output_file.write_bytes(canonical); write(args.validation_output_file, validation); write(args.summary_output_file, summary)
    print(json.dumps({"preview_status": validation["preview_status"], "inspection_count": len(preview), "application_candidate_count": 0, "deterministic_application_preview_sha256": validation["deterministic_application_preview_sha256"], "deterministic_validation_sha256": validation["deterministic_validation_sha256"]}, ensure_ascii=False))

def self_test():
    before = set(Path.cwd().rglob("*")); checks = 0
    good = {"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"decision_application_dry_run_only":True,"human_review_execution_authorized":False,"source_decision_authorized":False,"decision_application_authorized":False,"production_mutation_authorized":False,"pipeline_authorized":False,"actual_approve":False,"actual_reject":False,"actual_application":False,"production_promotion":False}
    validate_wrapper(good); checks += len(good)
    class NoConfirm: confirm_local_decision_application_dry_run = False
    try: run(NoConfirm()); assert False
    except Failure as error: assert "required" in str(error); checks += 1
    for key, bad in (("contract_version","x"),("scope","x"),("production_policy",True),("decision_application_dry_run_only",False),("human_review_execution_authorized",True),("source_decision_authorized",True),("decision_application_authorized",True),("production_mutation_authorized",True),("pipeline_authorized",True),("actual_approve",True),("actual_reject",True),("actual_application",True),("production_promotion",True)):
        try: validate_wrapper(dict(good, **{key:bad})); assert False
        except Failure: checks += 1
    try: load_builder(Path("synthetic-missing-helper.py")); assert False
    except Failure: checks += 1
    item = {"internal_source_id":"s1","gate_id":"g1","queue_item_id":"q1","gate_status":"exception_review_required","decision_intent":"not_decided","reviewer_id":None,"rationale_codes":[],"reviewer_note":None,"reviewed_at":None,"requested_enrichment_fields":[]}
    class Builder:
        canonical_bytes = staticmethod(lambda v: json.dumps(v, sort_keys=True, separators=(",", ":")).encode())
        contract_errors = staticmethod(lambda i,a: [])
        linkage_errors = staticmethod(lambda q,d,g,s: [])
        duplicates = staticmethod(lambda v: [])
        digest = staticmethod(lambda *p: hashlib.sha256("\n".join(p).encode()).hexdigest())
        validate_entry = staticmethod(lambda *a: ([], "no_change"))
        @staticmethod
        def build_outputs(i,a,q,d,g,s):
            output=[]
            for x in sorted(d,key=lambda z:z["queue_item_id"]):
                ih=hashlib.sha256(Builder.canonical_bytes(x)).hexdigest(); vid=Builder.digest("v1",x["queue_item_id"],ih)
                output.append({"dry_run_id":Builder.digest("v1",vid,"no_change"),"validation_id":vid,"queue_item_id":x["queue_item_id"],"internal_source_id":x["internal_source_id"],"gate_id":x["gate_id"],"gate_status":x["gate_status"],"decision_intent":"not_decided","dry_run_effect":"no_change","actionability_status":"no_action","production_write_status":"not_written","approval_snapshot_status":"not_created","audit_event_status":"not_created","score_application_status":"not_applied","decision_input_hash":ih})
            return ([{"validation_status":"valid"} for _ in output],output,{"invalid_decision_count":0})
    validation={"target_display_query":"synthetic","input_preview_provenance_status":"verified","preview_status":"valid_local_decision_input_preview","decision_input_preview_eligibility":"eligible","decision_reason_code_counts":{"provider_limitation_verified":1}}
    original_load=globals()["load"]
    globals()["load"]=lambda p: {"contract_version":"v1"}
    try: preview,canonical,result=build([item],validation,Builder,Path("synthetic.py"),"module-hash","input-hash","input-hash")
    finally: globals()["load"]=original_load
    assertions=[len(preview)==1,result["dry_run_inspection_record_count"]==1,result["pending_review_count"]==1,result["not_decided_count"]==1,result["actual_decision_value_count"]==0,result["actual_approved_decision_count"]==0,result["actual_rejected_decision_count"]==0,result["actual_decided_count"]==0,result["actual_application_candidate_count"]==0,result["actual_application_execution_count"]==0,result["no_application_due_to_undecided_count"]==1,result["reviewer_value_count"]==0,result["review_timestamp_value_count"]==0,result["review_note_value_count"]==0,result["production_mutation_count"]==0,result["production_effect_count"]==0,result["database_write_count"]==0,result["storage_write_count"]==0,result["pipeline_execution_count"]==0,result["score_calculation_count"]==0,result["ranking_update_count"]==0,result["artist_page_update_count"]==0,result["production_identity_status"]=="not_confirmed",result["registry_identity_status"]=="not_confirmed",not result["canonical_output_git_tracked"],not result["safe_metadata_contains_source_url_value"],not result["safe_metadata_contains_author_value"],not result["safe_metadata_contains_title_value"],not result["safe_metadata_contains_summary_value"],preview[0]["decision_intent"]=="not_decided",preview[0]["dry_run_effect"]=="no_change",preview[0]["actionability_status"]=="no_action",preview[0]["production_write_status"]=="not_written",preview[0]["approval_snapshot_status"]=="not_created",preview[0]["audit_event_status"]=="not_created",preview[0]["score_application_status"]=="not_applied",result["duplicate_application_preview_id_count"]==0,result["duplicate_decision_input_id_count"]==0,result["duplicate_decision_preview_id_count"]==0,result["duplicate_queue_id_count"]==0,result["duplicate_gate_id_count"]==0,result["duplicate_internal_source_id_count"]==0,result["application_status_counts"]=={"no_action":1},result["reason_code_counts"]=={"provider_limitation_verified":1},result["existing_application_builder_main_executed"] is False]
    for okay in assertions: assert okay; checks += 1
    globals()["load"]=lambda p: {"contract_version":"v1"}
    try: p2,c2,r2=build(copy.deepcopy([item]),validation,Builder,Path("synthetic.py"),"module-hash","input-hash","input-hash")
    finally: globals()["load"]=original_load
    assert canonical==c2; checks+=1; assert result["deterministic_application_preview_sha256"]==r2["deterministic_application_preview_sha256"];checks+=1;assert result["deterministic_validation_sha256"]==r2["deterministic_validation_sha256"];checks+=1
    safe=json.dumps([result,safe_summary(result)]).casefold()
    for token in ("https://","author_value\": true","title_value\": true","summary_value\": true","raw_sample","archive_path","filename"):
        assert token not in safe;checks+=1
    for mutation in ({"decision_intent":"approved"},{"decision_intent":"rejected"},{"decision_intent":"decided"},{"reviewer_id":"r"},{"reviewed_at":"2026-01-01T00:00:00Z"},{"reviewer_note":"note"}):
        changed=dict(item,**mutation)
        try: validate_provenance([changed],[changed],{},INPUT_SHA,INPUT_SHA,INPUT_VALIDATION_FILE_SHA);assert False
        except Failure:checks+=1
    assert checks >= 80 and before == set(Path.cwd().rglob("*")); print(f"self-test ok: {checks} checks")

def parser():
    p=argparse.ArgumentParser()
    for name in ("decision_input_file","decision_input_repro_file","decision_input_validation_file","decision_input_repro_validation_file","historical_application_builder_file","wrapper_contract_file","canonical_output_file","validation_output_file","summary_output_file"): p.add_argument("--"+name.replace("_","-"),type=Path)
    p.add_argument("--confirm-local-decision-application-dry-run",action="store_true");p.add_argument("--self-test",action="store_true");return p

def main():
    args=parser().parse_args()
    try:
        if args.self_test:self_test();return
        missing=[key for key,value in vars(args).items() if key not in ("self_test","confirm_local_decision_application_dry_run") and value is None]
        if missing:raise Failure("missing required arguments: "+", ".join(missing))
        run(args)
    except Failure as error:print("error: "+str(error),file=sys.stderr);raise SystemExit(1)

if __name__ == "__main__": main()
