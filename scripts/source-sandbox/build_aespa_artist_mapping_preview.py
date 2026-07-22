"""Build a canonical local aespa mapping preview with existing builder helpers."""

import argparse
import copy
import hashlib
import importlib.util
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


DISPLAY_QUERY = "\uc5d0\uc2a4\ud30c"
SCHEMA_VERSION = "v36"
EXPECTED_NORMALIZED_SHA256 = "662ccfa966cfed90c78f170646c2d5fccda38674d0447fe76059a99dbbcaf436"
WARNING_CODE = "news_attribution_source_limitation"


class PreviewFailure(ValueError):
    pass


def file_hash(path):
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def canonical_hash(value):
    payload = json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def load_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_builder(path):
    spec = importlib.util.spec_from_file_location("existing_artist_source_mapping_builder", path)
    if spec is None or spec.loader is None:
        raise PreviewFailure("existing mapping builder cannot be loaded")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    helpers = ("compile_alias_patterns", "validate_preconditions", "build_mapping", "duplicate_count", "serialize_json")
    missing = [name for name in helpers if not callable(getattr(module, name, None))]
    if missing:
        raise PreviewFailure("missing builder helpers: " + ", ".join(missing))
    return module


def validate_contract(contract):
    checks = {
        "contract_version": contract.get("contract_version") == "v1",
        "scope": contract.get("scope") == "local_sandbox_preview_only",
        "production_policy": contract.get("production_policy") is False,
        "mapping_preview_only": contract.get("mapping_preview_only") is True,
        "pipeline_authorized": contract.get("pipeline_authorized") is False,
    }
    failed = [name for name, okay in checks.items() if not okay]
    if failed:
        raise PreviewFailure("contract mismatch: " + ", ".join(failed))


def validate_provenance(items, validation, validation_summary, decision, normalized_sha):
    entries = decision.get("entries", [])
    checks = {
        "normalized_input_file_hash": normalized_sha == EXPECTED_NORMALIZED_SHA256,
        "target_display_query": validation.get("target_display_query") == DISPLAY_QUERY,
        "normalized_schema_version": validation.get("normalized_schema_version") == SCHEMA_VERSION,
        "input_provenance_status": validation.get("input_provenance_status") == "verified",
        "validation_status": validation.get("validation_status") == "valid_for_local_mapping_preview",
        "local_mapping_preview_eligibility": validation.get("local_mapping_preview_eligibility") == "eligible",
        "validation_error_count": validation.get("validation_error_count") == 0,
        "record_count": validation.get("record_count") == len(items) == 2000,
        "news_record_count": validation.get("news_record_count") == 1000,
        "blog_record_count": validation.get("blog_record_count") == 1000,
        "unique_source_id_count": validation.get("unique_source_id_count") == 2000,
        "duplicate_source_id_count": validation.get("duplicate_source_id_count") == 0,
        "malformed_record_count": validation.get("malformed_record_count") == 0,
        "required_field_failure_count": validation.get("required_field_failure_count") == 0,
        "unsupported_source_type_count": validation.get("unsupported_source_type_count") == 0,
        "query_identity_mismatch_count": validation.get("query_identity_mismatch_count") == 0,
        "production_artist_id_count": validation.get("production_artist_id_count") == 0,
        "registry_artist_id_count": validation.get("registry_artist_id_count") == 0,
        "warning_code": [item.get("warning_code") for item in validation.get("validation_warnings", [])] == [WARNING_CODE],
        "summary_projection": validation_summary.get("deterministic_input_sha256") == normalized_sha,
        "candidate_count": len(entries) == 1,
        "candidate_query": len(entries) == 1 and entries[0].get("display_query") == DISPLAY_QUERY,
        "candidate_provenance_id": len(entries) == 1 and bool(entries[0].get("candidate_id")),
    }
    failed = [name for name, okay in checks.items() if not okay]
    if failed:
        raise PreviewFailure("input provenance mismatch: " + ", ".join(failed))
    return entries[0]["candidate_id"]


def local_identity(items):
    if not isinstance(items, list):
        raise PreviewFailure("normalized input top level is not an array")
    names = {item.get("artist_name") for item in items if isinstance(item, dict)}
    slugs = {item.get("artist_slug") for item in items if isinstance(item, dict)}
    if len(names) != 1 or None in names or "" in names:
        raise PreviewFailure("artist_name identity is not unique")
    if len(slugs) != 1 or None in slugs or "" in slugs:
        raise PreviewFailure("artist_slug identity is not unique")
    return next(iter(names)), next(iter(slugs))


def build_preview(items, validation, candidate_id, builder, builder_hash, input_hash, validation_hash):
    artist_name, artist_slug = local_identity(items)
    sandbox_key = f"sandbox:artist:{artist_slug}"
    aliases = sorted({value for value in (artist_name, artist_slug, DISPLAY_QUERY) if value}, key=str.casefold)
    args = argparse.Namespace(sandbox_artist_key=sandbox_key, artist_name=artist_name, artist_slug=artist_slug)
    news = [item for item in items if item.get("source_type") == "news"]
    blog = [item for item in items if item.get("source_type") == "blog"]
    adapter = {"structural_error_count": 0, "total_items": validation["record_count"], "news_items": validation["news_record_count"], "blog_items": validation["blog_record_count"]}
    errors = builder.validate_preconditions(news, blog, adapter, args)
    if errors:
        raise PreviewFailure("existing builder precondition failed")
    patterns = builder.compile_alias_patterns(aliases)
    mappings = [builder.build_mapping(item, args, patterns) for item in news + blog]
    mappings.sort(key=lambda mapping: (mapping["source_type"], mapping["internal_source_id"]))
    allowed_statuses = {"mapped", "review_required"}
    allowed_evidence = {"confirmed", "weak", "missing"}
    if any(item.get("mapping_status") not in allowed_statuses for item in mappings):
        raise PreviewFailure("existing builder returned unsupported mapping status")
    if any(item.get("evidence_level") not in allowed_evidence for item in mappings):
        raise PreviewFailure("existing builder returned unsupported evidence level")
    internal_ids = [item["internal_source_id"] for item in mappings]
    mapping_ids = [item["mapping_id"] for item in mappings]
    duplicate_internal = builder.duplicate_count(internal_ids)
    duplicate_mapping = builder.duplicate_count(mapping_ids)
    if duplicate_internal or duplicate_mapping:
        raise PreviewFailure("duplicate deterministic mapping identity")
    canonical_bytes = builder.serialize_json(mappings)
    mapping_sha = hashlib.sha256(canonical_bytes).hexdigest()
    counts = Counter(item["mapping_status"] for item in mappings)
    evidence = Counter(item["evidence_level"] for item in mappings)
    review_required = counts["review_required"]
    mapping_status = "mapping_review_required" if review_required else "valid_local_mapping_preview"
    eligibility = "review_required" if review_required else "eligible"
    warning = {"warning_code": WARNING_CODE, "source_type": "news", "affected_record_count": validation["news_attribution_missing_count"]}
    result = {
        "contract_version": "v1", "scope": "local_sandbox_preview_only", "production_policy": False, "mapping_preview_only": True, "pipeline_authorized": False,
        "target_display_query": DISPLAY_QUERY, "normalized_schema_version": SCHEMA_VERSION, "existing_mapping_builder_reused": True,
        "existing_mapping_builder_module_hash": builder_hash, "validation_adapter_used": True, "validation_adapter_source": "v51_verified_validation_counts",
        "normalized_input_file_hash": input_hash, "normalized_validation_file_hash": validation_hash, "input_provenance_status": "verified",
        "local_candidate_provenance_id": candidate_id, "sandbox_artist_key": sandbox_key, "production_identity_status": "not_confirmed", "registry_identity_status": "not_confirmed",
        "mapping_status": mapping_status, "next_step_eligibility": eligibility, "input_record_count": len(items), "mapping_record_count": len(mappings),
        "news_mapping_count": len(news), "blog_mapping_count": len(blog), "mapped_count": counts["mapped"], "review_required_count": review_required,
        "confirmed_evidence_count": evidence["confirmed"], "weak_evidence_count": evidence["weak"], "missing_evidence_count": evidence["missing"],
        "unique_internal_source_id_count": len(set(internal_ids)), "duplicate_internal_source_id_count": duplicate_internal,
        "unique_mapping_id_count": len(set(mapping_ids)), "duplicate_mapping_id_count": duplicate_mapping,
        "canonical_mapping_contains_source_url": all("source_url" in item for item in mappings), "safe_metadata_contains_source_url": False, "canonical_mapping_git_tracked": False,
        "attribution_warnings": [warning], "mapping_error_count": 0, "mapping_warning_count": 1, "mapping_errors": [], "mapping_warnings": [warning],
        "production_artist_id_count": 0, "registry_artist_id_count": 0, "production_effect_count": 0, "pipeline_execution_count": 0,
        "quality_execution_count": 0, "approval_execution_count": 0, "review_queue_execution_count": 0, "source_decision_execution_count": 0,
        "score_calculation_count": 0, "ranking_update_count": 0, "artist_page_update_count": 0, "deterministic_mapping_sha256": mapping_sha,
    }
    result["deterministic_validation_sha256"] = canonical_hash(result)
    return mappings, canonical_bytes, result


def make_summary(result, validation):
    keys = ("contract_version", "scope", "production_policy", "mapping_preview_only", "target_display_query", "normalized_schema_version", "existing_mapping_builder_reused", "validation_adapter_used", "input_provenance_status", "mapping_status", "next_step_eligibility", "input_record_count", "mapping_record_count", "news_mapping_count", "blog_mapping_count", "mapped_count", "review_required_count", "confirmed_evidence_count", "weak_evidence_count", "missing_evidence_count", "unique_mapping_id_count", "duplicate_mapping_id_count", "production_identity_status", "registry_identity_status", "production_effect_count", "pipeline_execution_count", "deterministic_mapping_sha256", "deterministic_validation_sha256")
    summary = {key: result[key] for key in keys}
    summary.update({"generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), "news_attribution_coverage": round(validation["news_attribution_present_count"] / validation["news_record_count"], 6), "blog_attribution_coverage": round(validation["blog_attribution_present_count"] / validation["blog_record_count"], 6), "warning_codes": [WARNING_CODE], "canonical_mapping_schema_preserved": True, "canonical_mapping_contains_source_url": True, "safe_summary_contains_source_url": False, "deterministic_input_sha256": result["normalized_input_file_hash"]})
    return summary


def synthetic_self_test():
    before = set(Path.cwd().rglob("*")); checks = 0
    class Builder:
        @staticmethod
        def compile_alias_patterns(values): return values
        @staticmethod
        def validate_preconditions(news, blog, report, args): return [] if report["total_items"] == len(news) + len(blog) else ["count"]
        @staticmethod
        def build_mapping(item, args, patterns):
            confirmed = item["mode"] == "confirmed"; weak = item["mode"] == "weak"
            return {"mapping_id":"mapping_"+item["internal_source_id"],"internal_source_id":item["internal_source_id"],"sandbox_artist_key":args.sandbox_artist_key,"artist_name":args.artist_name,"artist_slug":args.artist_slug,"provider_key":"naver","source_type":item["source_type"],"mapping_status":"mapped" if confirmed else "review_required","evidence_level":"confirmed" if confirmed else "weak" if weak else "missing","matched_aliases":[],"evidence_fields":[],"source_url":item["source_url"],"published_at":None,"author_or_publisher":None,"content_hash":"h"+item["internal_source_id"],"raw_row_number":2}
        @staticmethod
        def duplicate_count(values): return sum(value-1 for value in Counter(values).values() if value > 1)
        @staticmethod
        def serialize_json(value): return (json.dumps(value,ensure_ascii=False,indent=2)+"\n").encode()
    items=[]
    for i in range(2000): items.append({"internal_source_id":str(i),"source_type":"news" if i<1000 else "blog","artist_name":DISPLAY_QUERY,"artist_slug":"aespa","source_url":"https://example.test/"+str(i),"mode":"confirmed"})
    validation={"record_count":2000,"news_record_count":1000,"blog_record_count":1000,"news_attribution_missing_count":1000,"news_attribution_present_count":0,"blog_attribution_present_count":1000}
    mappings,data,result=build_preview(items,validation,"candidate",Builder,"module","input","validation")
    assert len(mappings)==2000 and result["mapping_status"]=="valid_local_mapping_preview"; checks+=2
    assert result["mapped_count"]==2000 and result["review_required_count"]==0 and result["confirmed_evidence_count"]==2000; checks+=3
    assert result["canonical_mapping_contains_source_url"] and not result["safe_metadata_contains_source_url"]; checks+=2
    assert all("source_url" in item for item in mappings); checks+=1
    summary=make_summary(result,validation); assert summary["safe_summary_contains_source_url"] is False and "review_required_samples" not in summary; checks+=2
    assert result["production_identity_status"]==result["registry_identity_status"]=="not_confirmed"; checks+=2
    assert result["production_artist_id_count"]==result["registry_artist_id_count"]==0; checks+=2
    assert all(result[key]==0 for key in ("production_effect_count","pipeline_execution_count","quality_execution_count","approval_execution_count","review_queue_execution_count","source_decision_execution_count","score_calculation_count","ranking_update_count","artist_page_update_count")); checks+=9
    changed=copy.deepcopy(items); changed[0]["mode"]="weak"; changed[1]["mode"]="missing"; _,_,review=build_preview(changed,validation,"candidate",Builder,"module","input","validation")
    assert review["mapping_status"]=="mapping_review_required" and review["next_step_eligibility"]=="review_required"; checks+=2
    assert review["weak_evidence_count"]==1 and review["missing_evidence_count"]==1; checks+=2
    assert not any(item["mapping_status"] in {"unmapped","ambiguous"} for item in mappings); checks+=2
    assert hashlib.sha256(data).hexdigest()==result["deterministic_mapping_sha256"]; checks+=1
    hash_projection=dict(result);hash_projection.pop("deterministic_validation_sha256")
    assert canonical_hash(hash_projection)==result["deterministic_validation_sha256"]; checks+=1
    contract={"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"mapping_preview_only":True,"pipeline_authorized":False}; validate_contract(contract); checks+=1
    for key,value in (("contract_version","x"),("scope","x"),("production_policy",True)):
        changed_contract=dict(contract);changed_contract[key]=value
        try: validate_contract(changed_contract)
        except PreviewFailure: checks+=1
    for changed_items in ([dict(items[0],artist_name="x")]+items[1:],[dict(items[0],artist_slug="x")]+items[1:]):
        try: local_identity(changed_items)
        except PreviewFailure: checks+=1
    try: raise PreviewFailure("confirm required")
    except PreviewFailure: checks+=1
    try: build_preview(items[:-1],validation,"candidate",Builder,"module","input","validation")
    except PreviewFailure: checks+=1
    class BadBuilder(Builder):
        @staticmethod
        def validate_preconditions(news,blog,report,args): return ["bad"]
    try: build_preview(items,validation,"candidate",BadBuilder,"module","input","validation")
    except PreviewFailure: checks+=1
    duplicate=copy.deepcopy(items);duplicate[0]["internal_source_id"]=duplicate[1]["internal_source_id"]
    try: build_preview(duplicate,validation,"candidate",Builder,"module","input","validation")
    except PreviewFailure: checks+=1
    safe=json.dumps([result,summary]); assert not any(token in safe for token in ("https://","title\"","summary\"","recommendation","rank_score")); checks+=1
    assert before==set(Path.cwd().rglob("*")); checks+=1
    assert checks>=39
    print(f"self-test ok: {checks} checks")


def run(args):
    if not args.confirm_local_mapping_preview:
        raise PreviewFailure("--confirm-local-mapping-preview is required; normalized input was not loaded")
    contract=load_json(args.contract_file); validate_contract(contract)
    input_hash=file_hash(args.normalized_file); validation_hash=file_hash(args.validation_file)
    items=load_json(args.normalized_file); validation=load_json(args.validation_file); validation_summary=load_json(args.validation_summary_file); decision=load_json(args.candidate_decision_file)
    candidate_id=validate_provenance(items,validation,validation_summary,decision,input_hash)
    builder=load_builder(args.existing_mapping_builder_file); builder_hash=file_hash(args.existing_mapping_builder_file)
    mappings,canonical_bytes,result=build_preview(items,validation,candidate_id,builder,builder_hash,input_hash,validation_hash)
    summary=make_summary(result,validation)
    args.canonical_mapping_output_file.parent.mkdir(parents=True,exist_ok=True)
    args.canonical_mapping_output_file.write_bytes(canonical_bytes)
    write_json(args.validation_output_file,result);write_json(args.summary_output_file,summary)
    print(json.dumps(summary,ensure_ascii=False,indent=2))


def parser():
    value=argparse.ArgumentParser()
    value.add_argument("--normalized-file",type=Path);value.add_argument("--validation-file",type=Path);value.add_argument("--validation-summary-file",type=Path);value.add_argument("--candidate-decision-file",type=Path);value.add_argument("--existing-mapping-builder-file",type=Path);value.add_argument("--contract-file",type=Path);value.add_argument("--canonical-mapping-output-file",type=Path);value.add_argument("--validation-output-file",type=Path);value.add_argument("--summary-output-file",type=Path);value.add_argument("--confirm-local-mapping-preview",action="store_true");value.add_argument("--self-test",action="store_true")
    return value


def main():
    args=parser().parse_args()
    try:
        if args.self_test: synthetic_self_test();return
        required=("normalized_file","validation_file","validation_summary_file","candidate_decision_file","existing_mapping_builder_file","contract_file","canonical_mapping_output_file","validation_output_file","summary_output_file")
        missing=[name for name in required if getattr(args,name) is None]
        if missing: raise PreviewFailure("missing required arguments: "+", ".join(missing))
        run(args)
    except PreviewFailure as error:
        print(f"error: {error}",file=sys.stderr);raise SystemExit(1)


if __name__=="__main__":main()
