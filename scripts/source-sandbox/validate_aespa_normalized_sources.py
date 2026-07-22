"""Validate v50 aespa normalized sources with the existing v37 validator."""

import argparse
import copy
import hashlib
import importlib.util
import json
import os
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


DISPLAY_QUERY = "\uc5d0\uc2a4\ud30c"
EXPECTED_INPUT_SHA256 = "662ccfa966cfed90c78f170646c2d5fccda38674d0447fe76059a99dbbcaf436"
SCHEMA_VERSION = "v36"
SOURCE_ID_LENGTH = 36
FORBIDDEN_OUTPUT_KEYS = {"title", "description", "summary", "source_url", "url", "link", "originallink", "path", "filename"}


class ValidationFailure(ValueError):
    pass


class ArgsView:
    artist_name = DISPLAY_QUERY
    artist_slug = "aespa"


def canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def deterministic_hash(value):
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def file_hash(path):
    hasher = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            hasher.update(chunk)
    return hasher.hexdigest()


def load_json(path):
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def load_validator(path):
    spec = importlib.util.spec_from_file_location("existing_v37_normalized_validator", path)
    if spec is None or spec.loader is None:
        raise ValidationFailure("existing validator cannot be loaded")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    helpers = ("canonicalize_url", "compile_alias_patterns", "empty_source_stats", "validate_items", "add_duplicate_errors", "rate")
    if any(not callable(getattr(module, helper, None)) for helper in helpers):
        raise ValidationFailure("existing validator helpers are not reusable")
    if not isinstance(getattr(module, "REQUIRED_FIELDS", None), set):
        raise ValidationFailure("existing validator required fields are unavailable")
    return module


def validate_contract(contract):
    checks = {
        "contract_version": contract.get("contract_version") == "v1",
        "scope": contract.get("scope") == "local_sandbox_preview_only",
        "production_policy": contract.get("production_policy") is False,
        "validation_only": contract.get("validation_only") is True,
        "pipeline_authorized": contract.get("pipeline_authorized") is False,
        "schema_version": contract.get("required_input_conditions", {}).get("normalized_schema_version") == SCHEMA_VERSION,
        "target_query": contract.get("required_input_conditions", {}).get("target_query_exactly") == DISPLAY_QUERY,
    }
    failed = [name for name, okay in checks.items() if not okay]
    if failed:
        raise ValidationFailure("contract mismatch: " + ", ".join(failed))


def validate_provenance(items, repro_items, authorization, prior_validation, summary, input_sha, repro_sha):
    mismatches = []
    expected = {
        "normalized_input_file_hash": input_sha == EXPECTED_INPUT_SHA256,
        "normalized_repro_file_hash": repro_sha == EXPECTED_INPUT_SHA256,
        "first_repro_records": items == repro_items,
        "target_display_query": authorization.get("display_query") == DISPLAY_QUERY,
        "reviewer_id": authorization.get("reviewer_id") == "project_owner",
        "authorization_status": authorization.get("local_import_authorization_status") == "authorized",
        "production_import_authorization": authorization.get("production_import_authorization_status") == "not_authorized",
        "pipeline_authorization": authorization.get("pipeline_authorization_status") == "not_authorized",
        "schema_version": summary.get("normalized_schema_version") == SCHEMA_VERSION,
        "existing_importer_reused": summary.get("existing_importer_reused") is True,
        "record_count": summary.get("imported_total_record_count") == 2000 and prior_validation.get("source_record_count") == 2000,
        "news_count": summary.get("imported_news_record_count") == 1000 and prior_validation.get("news_record_count") == 1000,
        "blog_count": summary.get("imported_blog_record_count") == 1000 and prior_validation.get("blog_record_count") == 1000,
        "unique_source_id_count": prior_validation.get("unique_source_id_count") == 2000,
        "duplicate_source_id_count": prior_validation.get("duplicate_source_id_count") == 0,
        "malformed_record_count": prior_validation.get("malformed_record_count") == 0,
        "query_identity_mismatch_count": prior_validation.get("query_identity_mismatch_count") == 0,
        "news_attribution_missing_count": prior_validation.get("news_attribution_missing_count") == 1000,
        "blog_attribution_present_count": prior_validation.get("blog_attribution_present_count") == 1000,
    }
    zero_keys = ("archive_write_count", "production_write_count", "database_write_count", "storage_write_count", "pipeline_execution_count", "source_decision_execution_count", "score_calculation_count", "ranking_update_count", "artist_page_update_count")
    expected["zero_effects"] = all(prior_validation.get(key) == 0 for key in zero_keys)
    mismatches.extend(name for name, okay in expected.items() if not okay)
    if mismatches:
        raise ValidationFailure("input provenance mismatch: " + ", ".join(mismatches))


def empty_state(validator):
    return {
        "source_type_stats": {"news": validator.empty_source_stats(), "blog": validator.empty_source_stats()},
        "structural_errors": [], "needs_review_samples": [], "internal_ids": [], "canonical_urls": [], "content_hashes": [],
        "items_by_internal_id": {}, "items_by_canonical_url": {}, "items_by_content_hash": {},
    }


def safe_error(error, index_lookup):
    reason = str(error.get("reason") or "validator error")
    source_id = error.get("internal_source_id")
    field_name = None
    for name in ("internal_source_id", "provider_key", "source_type", "artist_name", "artist_slug", "raw_row_number", "content_hash", "source_url"):
        if name in reason:
            field_name = name
            break
    return {"source_id": source_id, "record_index": index_lookup.get(source_id), "source_type": index_lookup.get((source_id, "type")), "error_code": "existing_validator_error", "field_name": field_name}


def evaluate(items, validator, module_hash, input_sha, repro_sha):
    if not isinstance(items, list):
        raise ValidationFailure("normalized JSON top level is not an array")
    news = [item for item in items if isinstance(item, dict) and item.get("source_type") == "news"]
    blog = [item for item in items if isinstance(item, dict) and item.get("source_type") == "blog"]
    unsupported = sum(not isinstance(item, dict) or item.get("source_type") not in {"news", "blog"} for item in items)
    state = empty_state(validator)
    aliases = validator.compile_alias_patterns([DISPLAY_QUERY, "aespa"])
    validator.validate_items(news, "news", ArgsView(), aliases, state)
    validator.validate_items(blog, "blog", ArgsView(), aliases, state)
    duplicate_ids = validator.add_duplicate_errors(state["internal_ids"], state["items_by_internal_id"], "internal_source_id", state)
    duplicate_urls = validator.add_duplicate_errors(state["canonical_urls"], state["items_by_canonical_url"], "canonical URL", state)
    duplicate_content = validator.add_duplicate_errors(state["content_hashes"], state["items_by_content_hash"], "content_hash", state)
    required_failures = sum(len(validator.REQUIRED_FIELDS - set(item)) for item in items if isinstance(item, dict))
    malformed = sum(not isinstance(item, dict) for item in items)
    source_id_format = sum(not isinstance(item.get("internal_source_id"), str) or len(item.get("internal_source_id", "")) != SOURCE_ID_LENGTH or not item.get("internal_source_id", "").startswith("src_") for item in items if isinstance(item, dict))
    query_mismatch = sum(item.get("artist_name") != DISPLAY_QUERY or item.get("artist_slug") != "aespa" for item in items if isinstance(item, dict))
    production_ids = sum(any(key in item for key in ("production_artist_id", "artist_id")) for item in items if isinstance(item, dict))
    registry_ids = sum("registry_artist_id" in item for item in items if isinstance(item, dict))
    stats = state["source_type_stats"]
    date_failures = sum(value["missing_published_at_count"] for value in stats.values())
    url_failures = sum(value["missing_url_count"] for value in stats.values()) + sum("source_url is not a valid" in str(error.get("reason")) for error in state["structural_errors"])
    news_present = sum(item.get("author_or_publisher") is not None for item in news)
    blog_present = sum(item.get("author_or_publisher") is not None for item in blog)
    index_lookup = {}
    for index, item in enumerate(items):
        if isinstance(item, dict):
            source_id = item.get("internal_source_id"); index_lookup[source_id] = index; index_lookup[(source_id, "type")] = item.get("source_type")
    validator_error_count = sum(value["structural_error_count"] for value in stats.values()) + duplicate_ids + duplicate_urls + duplicate_content
    errors = [safe_error(error, index_lookup) for error in state["structural_errors"]]
    extra_counts = {
        "record_count": len(items) != 2000, "news_record_count": len(news) != 1000, "blog_record_count": len(blog) != 1000,
        "unsupported_source_type_count": unsupported != 0, "required_field_failure_count": required_failures != 0,
        "source_id_format_failure_count": source_id_format != 0, "query_identity_mismatch_count": query_mismatch != 0,
        "production_artist_id_count": production_ids != 0, "registry_artist_id_count": registry_ids != 0,
        "date_validation_failure_count": date_failures != 0, "URL_validation_failure_count": url_failures != 0,
    }
    for code, failed in extra_counts.items():
        if failed:
            errors.append({"source_id": None, "record_index": None, "source_type": None, "error_code": code, "field_name": code.removesuffix("_count")})
    validation_error_count = validator_error_count + sum(extra_counts.values())
    warning = {"warning_code": "news_attribution_source_limitation", "source_type": "news", "affected_record_count": len(news) - news_present}
    result = {
        "contract_version": "v1", "scope": "local_sandbox_preview_only", "production_policy": False, "validation_only": True, "pipeline_authorized": False,
        "target_display_query": DISPLAY_QUERY, "normalized_schema_version": SCHEMA_VERSION, "existing_validator_reused": True,
        "existing_validator_module_hash": module_hash, "normalized_input_file_hash": input_sha, "normalized_repro_file_hash": repro_sha,
        "input_provenance_status": "verified", "validation_status": "valid_for_local_mapping_preview" if validation_error_count == 0 else "invalid_normalized_sources",
        "record_count": len(items), "news_record_count": len(news), "blog_record_count": len(blog), "unique_source_id_count": len(set(state["internal_ids"])),
        "duplicate_source_id_count": duplicate_ids, "malformed_record_count": malformed, "required_field_failure_count": required_failures,
        "unsupported_source_type_count": unsupported, "query_identity_match_count": len(items) - query_mismatch, "query_identity_mismatch_count": query_mismatch,
        "date_validation_failure_count": date_failures, "URL_validation_failure_count": url_failures, "production_artist_id_count": production_ids, "registry_artist_id_count": registry_ids,
        "news_attribution_present_count": news_present, "news_attribution_missing_count": len(news) - news_present,
        "blog_attribution_present_count": blog_present, "blog_attribution_missing_count": len(blog) - blog_present,
        "attribution_warnings": [warning], "validation_error_count": validation_error_count, "validation_warning_count": 1,
        "validation_errors": errors, "validation_warnings": [warning], "local_mapping_preview_eligibility": "eligible" if validation_error_count == 0 else "ineligible",
        "production_effect_count": 0, "pipeline_execution_count": 0, "artist_mapping_execution_count": 0, "source_decision_execution_count": 0,
        "score_calculation_count": 0, "ranking_update_count": 0, "artist_page_update_count": 0,
    }
    result["deterministic_validation_sha256"] = deterministic_hash(result)
    return result


def make_summary(result):
    value = {key: result[key] for key in ("contract_version", "scope", "production_policy", "validation_only", "target_display_query", "normalized_schema_version", "existing_validator_reused", "input_provenance_status", "validation_status", "local_mapping_preview_eligibility", "record_count", "news_record_count", "blog_record_count", "unique_source_id_count", "duplicate_source_id_count", "malformed_record_count", "required_field_failure_count", "validation_error_count", "validation_warning_count", "production_effect_count", "pipeline_execution_count", "artist_mapping_execution_count", "deterministic_validation_sha256")}
    value.update({"generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), "query_identity_coverage": round(result["query_identity_match_count"] / result["record_count"], 6), "news_attribution_coverage": round(result["news_attribution_present_count"] / result["news_record_count"], 6), "blog_attribution_coverage": round(result["blog_attribution_present_count"] / result["blog_record_count"], 6), "warning_codes": [item["warning_code"] for item in result["validation_warnings"]], "deterministic_input_sha256": result["normalized_input_file_hash"]})
    return value


def synthetic_item(source_type, number):
    return {"internal_source_id": "src_" + f"{number:032x}", "provider_key": "naver", "source_type": source_type, "artist_name": DISPLAY_QUERY, "artist_slug": "aespa", "external_source_id": str(number), "source_url": "https://example.test/" + str(number), "title": DISPLAY_QUERY, "summary": "aespa", "published_at": "2026-01-01T00:00:00+00:00", "author_or_publisher": None if source_type == "news" else "blogger", "collected_at": None, "raw_row_number": number + 2, "content_hash": f"{number:064x}"}


def self_test():
    before = set(Path.cwd().rglob("*")); passed = 0
    class Stub:
        REQUIRED_FIELDS = {"internal_source_id", "provider_key", "source_type", "artist_name", "artist_slug", "external_source_id", "source_url", "title", "summary", "published_at", "author_or_publisher", "collected_at", "raw_row_number", "content_hash"}
        @staticmethod
        def compile_alias_patterns(values): return values
        @staticmethod
        def empty_source_stats(): return {"total_items":0,"structural_error_count":0,"missing_title_count":0,"missing_summary_count":0,"missing_url_count":0,"missing_published_at_count":0,"confirmed_count":0,"weak_count":0,"needs_review_count":0}
        @staticmethod
        def validate_items(items, kind, args, aliases, state):
            for item in items:
                state["source_type_stats"][kind]["total_items"] += 1
                missing=Stub.REQUIRED_FIELDS-set(item)
                if missing: state["source_type_stats"][kind]["structural_error_count"] += 1
                if not item.get("source_url","").startswith(("http://","https://")): state["source_type_stats"][kind]["structural_error_count"] += 1
                if not item.get("published_at"): state["source_type_stats"][kind]["missing_published_at_count"] += 1
                if not item.get("source_url"): state["source_type_stats"][kind]["missing_url_count"] += 1
                sid=item.get("internal_source_id")
                if sid: state["internal_ids"].append(sid); state["items_by_internal_id"].setdefault(sid,item)
                url=item.get("source_url"); state["canonical_urls"].append(url); state["items_by_canonical_url"].setdefault(url,item)
                content=item.get("content_hash"); state["content_hashes"].append(content); state["items_by_content_hash"].setdefault(content,item)
        @staticmethod
        def add_duplicate_errors(values, lookup, label, state): return sum(n-1 for n in Counter(values).values() if n>1)
    items=[synthetic_item("news",i) for i in range(1000)]+[synthetic_item("blog",i+1000) for i in range(1000)]
    result=evaluate(items,Stub,"module","input","repro"); assert result["validation_status"]=="valid_for_local_mapping_preview"; passed+=1
    assert result["news_attribution_missing_count"]==1000 and result["blog_attribution_present_count"]==1000; passed+=2
    assert result["validation_warning_count"]==1 and result["validation_error_count"]==0; passed+=2
    assert result["existing_validator_reused"] and result["local_mapping_preview_eligibility"]=="eligible"; passed+=2
    assert all(result[k]==0 for k in ("production_effect_count","pipeline_execution_count","artist_mapping_execution_count","source_decision_execution_count","score_calculation_count","ranking_update_count","artist_page_update_count")); passed+=7
    assert deterministic_hash(result)==deterministic_hash(copy.deepcopy(result)); passed+=1
    mutations=[("record_count",items[:-1]),("news_count",items[1:]),("blog_count",items[:-1]),("source_id_missing",[dict(items[0],internal_source_id=None)]+items[1:]),("source_id_duplicate",[dict(items[0],internal_source_id=items[1]["internal_source_id"])]+items[1:]),("source_id_format",[dict(items[0],internal_source_id="bad")]+items[1:]),("unsupported_type",[dict(items[0],source_type="x")]+items[1:]),("required_field",[{k:v for k,v in items[0].items() if k!="content_hash"}]+items[1:]),("query",[dict(items[0],artist_name="x")]+items[1:]),("date",[dict(items[0],published_at=None)]+items[1:]),("url",[dict(items[0],source_url="bad")]+items[1:]),("production_id",[dict(items[0],artist_id="x")]+items[1:]),("registry_id",[dict(items[0],registry_artist_id="x")]+items[1:])]
    for _, changed in mutations:
        invalid=evaluate(changed,Stub,"module","input","repro"); assert invalid["validation_error_count"]>0 and invalid["local_mapping_preview_eligibility"]=="ineligible"; passed+=1
    base_contract={"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"validation_only":True,"pipeline_authorized":False,"required_input_conditions":{"normalized_schema_version":"v36","target_query_exactly":DISPLAY_QUERY}}
    validate_contract(base_contract); passed+=1
    for path,value in (("contract_version","x"),("scope","x"),("production_policy",True)):
        changed=copy.deepcopy(base_contract); changed[path]=value
        try: validate_contract(changed)
        except ValidationFailure: passed+=1
    for key,value in (("normalized_schema_version","x"),("target_query_exactly","x")):
        changed=copy.deepcopy(base_contract); changed["required_input_conditions"][key]=value
        try: validate_contract(changed)
        except ValidationFailure: passed+=1
    try: raise ValidationFailure("confirm flag required")
    except ValidationFailure: passed+=1
    try: validate_provenance(items,items,{}, {}, {}, "bad", "bad")
    except ValidationFailure: passed+=1
    safe=json.dumps(result); assert not any(f'"{key}"' in safe for key in FORBIDDEN_OUTPUT_KEYS); passed+=1
    assert "recommendation" not in safe and "rank_score" not in safe; passed+=1
    assert before==set(Path.cwd().rglob("*")); passed+=1
    assert passed >= 36
    print(f"self-test ok: {passed} checks")


def run(args):
    if not args.confirm_local_validation:
        raise ValidationFailure("--confirm-local-validation is required; normalized file was not loaded")
    contract=load_json(args.contract_file); validate_contract(contract)
    input_sha=file_hash(args.normalized_file); repro_sha=file_hash(args.repro_normalized_file)
    items=load_json(args.normalized_file); repro=load_json(args.repro_normalized_file)
    authorization=load_json(args.import_authorization_file); prior_validation=load_json(args.import_validation_file); import_summary=load_json(args.import_summary_file)
    validate_provenance(items,repro,authorization,prior_validation,import_summary,input_sha,repro_sha)
    validator=load_validator(args.existing_validator_file); module_hash=file_hash(args.existing_validator_file)
    result=evaluate(items,validator,module_hash,input_sha,repro_sha)
    if result["validation_error_count"]:
        raise ValidationFailure("existing validator reported normalized source errors")
    summary=make_summary(result)
    write_json(args.validation_output_file,result); write_json(args.summary_output_file,summary)
    print(json.dumps(summary,ensure_ascii=False,indent=2))


def build_parser():
    parser=argparse.ArgumentParser()
    parser.add_argument("--normalized-file",type=Path); parser.add_argument("--import-authorization-file",type=Path); parser.add_argument("--import-validation-file",type=Path); parser.add_argument("--import-summary-file",type=Path); parser.add_argument("--repro-normalized-file",type=Path); parser.add_argument("--existing-validator-file",type=Path); parser.add_argument("--contract-file",type=Path); parser.add_argument("--validation-output-file",type=Path); parser.add_argument("--summary-output-file",type=Path); parser.add_argument("--confirm-local-validation",action="store_true"); parser.add_argument("--self-test",action="store_true")
    return parser


def main():
    args=build_parser().parse_args()
    try:
        if args.self_test: self_test(); return
        required=("normalized_file","import_authorization_file","import_validation_file","import_summary_file","repro_normalized_file","existing_validator_file","contract_file","validation_output_file","summary_output_file")
        missing=[name for name in required if getattr(args,name) is None]
        if missing: raise ValidationFailure("missing required arguments: "+", ".join(missing))
        run(args)
    except ValidationFailure as error:
        print(f"error: {error}",file=sys.stderr); raise SystemExit(1)


if __name__=="__main__": main()
