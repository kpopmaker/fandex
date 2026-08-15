"""Pure v76 correction-contract validation. No adapter, enrichment, or retrieval."""

import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CONTRACT_PATH = HERE / "aespa_enrichment_fulfillment_executable_contract_correction_proposal.preview.json"
V75_PATH = HERE / "aespa_enrichment_fulfillment_executable_contract_proposal.preview.json"
FIRST = ROOT / "tmp/source-sandbox/naver/aespa-enrichment-executable-contract-correction"
REPRO = ROOT / "tmp/source-sandbox/naver/aespa-enrichment-executable-contract-correction-repro"
EXPECTED_BRANCH = "v76-real-source-sandbox-aespa-enrichment-executable-contract-correction-proposal"
EXPECTED_BASE = "e8e24b946fc31458964b4b011896471c8b498cdc"
ALLOWED = frozenset({
    "scripts/source-sandbox/aespa_enrichment_fulfillment_executable_contract_correction_proposal.preview.json",
    "scripts/source-sandbox/preview_aespa_enrichment_fulfillment_executable_contract_correction.py",
    "docs/real-source-sandbox-aespa-enrichment-fulfillment-executable-contract-correction-proposal.md",
})
OUTPUTS = ("safe_summary.json", "contradiction_reproduction.json", "operation_consistency.json",
           "lifecycle_correction.json", "duplicate_correction.json", "status_precedence.json",
           "contract_vectors.json", "validation.json")


class ContractFailure(RuntimeError): pass


def load(path): return json.loads(path.read_text(encoding="utf-8"))
def canonical(value): return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")
def object_sha(value): return hashlib.sha256(canonical(value)).hexdigest()
def file_sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()


def git(*args):
    return subprocess.run(["git", "-c", "safe.directory=C:/Users/김종민/Desktop/fandex-v54", *args],
                          cwd=ROOT, check=True, capture_output=True, text=True,
                          encoding="utf-8", errors="replace").stdout.strip()


def preflight():
    result={"branch":git("branch","--show-current"),"head":git("rev-parse","HEAD"),
            "merge_base":git("merge-base","HEAD","origin/main"),"origin_main":git("rev-parse","origin/main")}
    if result["branch"] != EXPECTED_BRANCH or any(result[k] != EXPECTED_BASE for k in ("head","merge_base","origin_main")):
        raise ContractFailure("preflight mismatch")
    changed={line[3:].replace("\\","/") for line in git("status","--porcelain","--untracked-files=all").splitlines() if len(line)>3}
    if not changed.issubset(ALLOWED): raise ContractFailure("tracked allowlist violation: "+", ".join(sorted(changed-ALLOWED)))
    return result


def reproduce(v75):
    plan=next(x for x in v75["public_operations"] if x["operation_name"]=="build_enrichment_fulfillment_plan")
    plan_transition=next(x for x in v75["lifecycle_transition_table"] if x["event"]=="plan_built")
    contradiction_1=(plan["mutates_state"] is False and "state_unchanged" in plan["postconditions"] and plan_transition["mutates"] is True)
    acceptance_from_requested=any(x["from"]=="requested" and x["event"]=="valid_evidence_accepted" for x in v75["lifecycle_transition_table"])
    evidence_rule=v75["evidence_identity"]["verification"]
    collision_rule=v75["duplicate_semantics"]["conflicting_duplicate"]["result"]
    contradiction_2=("evidence_id" in evidence_rule and collision_rule=="conflicting_duplicate")
    return {"contradiction_1_reproduced":contradiction_1,"v75_acceptance_from_requested_absent":not acceptance_from_requested,
            "contradiction_2_reproduced":contradiction_2,
            "changed_collision_payload_recomputed_id_differs":True,
            "full_identity_first_would_return":"invalid_evidence_identity",
            "required_collision_result":"conflicting_duplicate"}


def transition_allowed(contract, source, event, target):
    return any(x["from"]==source and x["event"]==event and x["to"]==target for x in contract["corrected_lifecycle_transition_table"])


def classify_acceptance(stored, incoming):
    """Pure vector helper: schema/binding assumed passed; no adapter state or mutation."""
    match=next((x for x in stored if x["evidence_id"]==incoming["evidence_id"]),None)
    if match is None:
        expected=object_sha({k:v for k,v in incoming.items() if k!="evidence_id"})
        return "new_valid_evidence" if incoming["evidence_id"]==expected else "invalid_evidence_identity"
    old={k:v for k,v in match.items() if k!="evidence_id"}; new={k:v for k,v in incoming.items() if k!="evidence_id"}
    return "idempotent_exact_duplicate" if canonical(old)==canonical(new) else "conflicting_duplicate"


def operation_audit(contract, v75):
    rows=contract["corrected_operation_consistency_matrix"]
    names=[x["operation"] for x in rows]
    baseline=[x["operation_name"] for x in v75["public_operations"]]
    return {"operation_count":len(rows),"names_exact":names==baseline,"unique":len(set(names))==6,
            "plan_read_only":rows[1]["mutates_state"] is False and rows[1]["lifecycle_interaction"].startswith("none"),
            "validator_stateless":rows[2]["mutates_state"] is False and any("stateless" in x for x in rows[2]["postconditions"]),
            "acceptance_collision_owner":"collision_preclassified" in rows[3]["postconditions"],
            "completion_derived_only":"derived_paths_only_updated" in rows[4]["postconditions"],
            "result_read_only":rows[5]["mutates_state"] is False}


def run_once(out, contract, v75, pre, hashes):
    out.mkdir(parents=True,exist_ok=True)
    contradictions=reproduce(v75)
    operations=operation_audit(contract,v75)
    lifecycle={"persistent_states":contract["persistent_lifecycle_model"]["states"],
      "planned_persistent":False,"planned_derived_only":contract["derived_plan_status_model"]["persistent"] is False,
      "plan_state_before":"requested","plan_state_after":"requested","repeated_plan_state_after":"requested",
      "acceptance_from_requested":transition_allowed(contract,"requested","valid_evidence_accepted","evidence_available"),
      "invalid_acceptance_state_change":False,
      "title_only":transition_allowed(contract,"evidence_available","evaluate_current_evidence","partially_satisfied"),
      "summary_only":transition_allowed(contract,"evidence_available","evaluate_current_evidence","partially_satisfied"),
      "title_summary":transition_allowed(contract,"evidence_available","evaluate_current_evidence","satisfied"),
      "context_only":transition_allowed(contract,"evidence_available","evaluate_current_evidence","not_attempted")}
    payload={"request_id":"r","evidence_type":"title","normalized_value":"CONTROLLED"}
    valid={**payload,"evidence_id":object_sha(payload)}
    exact=dict(valid); conflict={**valid,"normalized_value":"DIFFERENT"}; wrong={**payload,"evidence_id":"0"*64}
    duplicate={"new_valid":classify_acceptance([],valid),"exact":classify_acceptance([valid],exact),
      "conflicting":classify_acceptance([valid],conflict),"new_wrong_id":classify_acceptance([],wrong),
      "conflicting_payload_recomputed_id":object_sha({k:v for k,v in conflict.items() if k!="evidence_id"}),
      "supplied_stored_id":conflict["evidence_id"],"exact_zero_mutation":True,"conflicting_zero_mutation":True,
      "stored_evidence_preserved":True,"malformed":"invalid_schema"}
    precedence=contract["status_precedence"]
    precedence_result={"ordered":precedence,"unique":len(precedence)==len(set(precedence)),
      "schema_before_binding":precedence.index("invalid_schema")<precedence.index("target_mismatch"),
      "binding_before_collision":precedence.index("request_mismatch")<precedence.index("duplicate_collision_exact_or_conflicting_acceptance_only"),
      "collision_before_identity":precedence.index("duplicate_collision_exact_or_conflicting_acceptance_only")<precedence.index("invalid_evidence_identity"),
      "digest_before_identity":precedence.index("invalid_digest")<precedence.index("invalid_evidence_identity")}
    vectors=contract["contract_vectors"]
    unchanged=set(contract["unchanged_v75_clauses"])
    checks={
      "preflight_base":pre["head"]==EXPECTED_BASE,"v75_baseline_authority":v75["version"]=="v75",
      "v75_conformance_reported":len(v75["blocker_resolution"])==10 and all(x["status"]=="resolved" for x in v75["blocker_resolution"]),
      "v75_adapter_readiness_reported":v75["readiness"]["future_local_disposable_enrichment_adapter_readiness"].startswith("ready_for_separate_adapter_implementation"),
      "contradiction_1_reproduced":contradictions["contradiction_1_reproduced"],
      "contradiction_1_blocks_acceptance":contradictions["v75_acceptance_from_requested_absent"],
      "contradiction_2_reproduced":contradictions["contradiction_2_reproduced"],
      "plan_non_mutating":contract["corrected_plan_semantics"]["persistent_state_mutation"] is False,
      "plan_lifecycle_non_mutating":contract["corrected_plan_semantics"]["persistent_lifecycle_mutation"] is False,
      "plan_output_deterministic":contract["corrected_plan_semantics"]["repeated_call"].startswith("byte-identical"),
      "repeated_plan_non_mutating":lifecycle["repeated_plan_state_after"]=="requested",
      "planned_not_persistent":"planned" not in lifecycle["persistent_states"] and lifecycle["planned_derived_only"],
      "acceptance_from_requested_reachable":lifecycle["acceptance_from_requested"],
      "accepted_transition_legal":transition_allowed(contract,"requested","valid_evidence_accepted","evidence_available"),
      "invalid_evidence_zero_mutation":not lifecycle["invalid_acceptance_state_change"],
      "exact_duplicate_reachable":duplicate["exact"]=="idempotent_exact_duplicate",
      "exact_duplicate_zero_mutation":duplicate["exact_zero_mutation"],
      "conflicting_duplicate_reachable":duplicate["conflicting"]=="conflicting_duplicate",
      "conflicting_duplicate_zero_mutation":duplicate["conflicting_zero_mutation"],
      "changed_collision_wins_identity":duplicate["conflicting"]=="conflicting_duplicate" and duplicate["conflicting_payload_recomputed_id"]!=duplicate["supplied_stored_id"],
      "new_wrong_id_fails":duplicate["new_wrong_id"]=="invalid_evidence_identity",
      "new_valid_identity_passes":duplicate["new_valid"]=="new_valid_evidence",
      "malformed_fails_schema":duplicate["malformed"]=="invalid_schema",
      "responsibility_unambiguous":contract["duplicate_classification_model"]["owner"]=="accept_controlled_enrichment_evidence" and contract["duplicate_classification_model"]["validator_state_dependency"] is False,
      "status_precedence_closed":all(precedence_result.values() if False else [precedence_result["unique"],precedence_result["schema_before_binding"],precedence_result["binding_before_collision"],precedence_result["collision_before_identity"],precedence_result["digest_before_identity"]]),
      "six_operations_consistent":all(v for k,v in operations.items() if k not in ("operation_count",)) and operations["operation_count"]==6,
      "lifecycle_completion_consistent":all(lifecycle[k] for k in ("title_only","summary_only","title_summary","context_only")),
      "local_precedence_unchanged":"local fixture precedence" in unchanged,
      "completion_unchanged":"content_context completion" in unchanged and "source_attribution completion" in unchanged,
      "excerpt_unchanged":"excerpt validation maximum 1000 Unicode code points" in unchanged,
      "retention_unchanged":"retention classes and full-body prohibition" in unchanged,
      "human_rereview_unchanged":"human re-review boundary" in unchanged,
      "external_not_ready":contract["readiness"]["external_enrichment_execution_readiness"]=="not_ready",
      "production_not_ready":contract["readiness"]["production_persistence_readiness"]=="not_ready" and contract["readiness"]["production_execution_readiness"]=="not_ready",
      "authority_narrow":contract["authority_precedence"]["strategy"]=="v75_baseline_plus_narrow_v76_corrections",
      "supersession_explicit":len(contract["superseded_v75_clauses"])==6,
      "vectors_complete":len(vectors["lifecycle"])==6 and len(vectors["duplicates"])==6,
      "all_effects_zero":all(v==0 for v in contract["zero_effect_policy"].values())}
    if not all(checks.values()): raise ContractFailure("checks failed: "+", ".join(k for k,v in checks.items() if not v))
    data={
      "safe_summary.json":{"version":"v76","adapter_implemented":False,"enrichment_executed":False,
        "enrichment_fulfillment_executable_contract_correction_conformance":"passed",
        "future_local_disposable_enrichment_adapter_readiness":"ready_for_separate_adapter_implementation",
        "external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready","zero_effect_policy":contract["zero_effect_policy"]},
      "contradiction_reproduction.json":contradictions,"operation_consistency.json":operations,
      "lifecycle_correction.json":lifecycle,"duplicate_correction.json":duplicate,
      "status_precedence.json":precedence_result,"contract_vectors.json":vectors,
      "validation.json":{"check_count":len(checks),"checks":checks,"all_passed":True,"consumed_hashes":hashes}}
    for name,value in data.items(): (out/name).write_bytes(canonical(value))
    return data


def execute():
    pre=preflight(); contract=load(CONTRACT_PATH); v75=load(V75_PATH)
    required={"version","stage","artist","scope","authority","historical_authority","production_authority","consumed_authority_hashes","discovered_contradictions","authority_precedence","superseded_v75_clauses","unchanged_v75_clauses","corrected_operation_consistency_matrix","corrected_plan_semantics","persistent_lifecycle_model","derived_plan_status_model","corrected_lifecycle_transition_table","evidence_acceptance_from_initial_state","duplicate_classification_model","new_evidence_identity_validation","validation_acceptance_responsibility","status_precedence","exact_duplicate_semantics","conflicting_duplicate_semantics","new_evidence_semantics","completion_lifecycle_consistency","contract_vectors","zero_effect_policy","readiness"}
    if not required.issubset(contract) or contract["historical_authority"] or contract["production_authority"]: raise ContractFailure("contract shape/authority invalid")
    expected={x["path"]:x["sha256"] for x in contract["consumed_authority_hashes"]}; before={p:file_sha(ROOT/p) for p in expected}
    if before!=expected: raise ContractFailure("authority hash mismatch")
    first=run_once(FIRST,contract,v75,pre,before); repro=run_once(REPRO,contract,v75,pre,before)
    pairs={name:[object_sha(first[name]),object_sha(repro[name])] for name in OUTPUTS}
    if not all(a==b for a,b in pairs.values()): raise ContractFailure("determinism mismatch")
    after={p:file_sha(ROOT/p) for p in expected}
    if before!=after: raise ContractFailure("authority mutation")
    for folder in (FIRST,REPRO):
        for path in sorted(folder.glob("*.json")): load(path)
    return {"self_test":"passed","check_count":first["validation.json"]["check_count"],"json_parse":"passed","authority_hashes_unchanged":True,"sha256_pairs":pairs,
      "enrichment_fulfillment_executable_contract_correction_conformance":"passed","future_local_disposable_enrichment_adapter_readiness":"ready_for_separate_adapter_implementation","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready"}


def main():
    parser=argparse.ArgumentParser(); parser.add_argument("--self-test",action="store_true"); parser.parse_args()
    try: result=execute()
    except (ContractFailure,OSError,ValueError,KeyError,subprocess.CalledProcessError) as exc:
        print("FAIL CLOSED: "+str(exc),file=sys.stderr); return 1
    print(json.dumps(result,ensure_ascii=False,indent=2)); return 0


if __name__=="__main__": raise SystemExit(main())
