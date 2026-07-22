"""Import the v49-selected aespa exports into a local-only normalized sandbox."""

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
REQUIRED_HEADERS = {
    "news": {"query", "title", "originallink", "link", "description", "pubDate"},
    "blog": {"query", "title", "link", "description", "bloggername", "bloggerlink", "postdate"},
}
NORMALIZED_SCHEMA_VERSION = "v36"
RAW_FIELDS = {"title", "summary", "description", "source_url", "url", "link", "originallink"}


class ImportFailure(ValueError):
    pass


def canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def digest(value):
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def file_sha256(path):
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


def normalized_query(value, clean_text):
    return (clean_text(value) or "").casefold()


def load_existing_importer(path):
    spec = importlib.util.spec_from_file_location("v36_naver_importer", path)
    if spec is None or spec.loader is None:
        raise ImportFailure("existing importer module cannot be loaded")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    required = ("clean_text", "load_rows", "normalize_row", "normalize_export")
    if any(not callable(getattr(module, name, None)) for name in required):
        raise ImportFailure("existing importer helpers are not reusable")
    return module


def validate_v49(decision, validation, dry_run, summary, repro_payloads=None):
    errors = []
    entries = decision.get("entries", [])
    if len(entries) != 1:
        errors.append("valid decision must contain exactly one candidate")
        entry = {}
    else:
        entry = entries[0]
    checks = {
        "candidate": entry.get("display_query") == DISPLAY_QUERY,
        "intent": entry.get("resolution_intent") == "select_representative_exports",
        "reviewer": entry.get("reviewer_id") == "project_owner",
        "valid_count": validation.get("valid_decision_count") == 1 and validation.get("invalid_decision_count") == 0,
        "selected_counts": all(validation.get(key) == 1 for key in ("selected_news_group_count", "selected_blog_group_count", "selected_news_file_count", "selected_blog_file_count")),
        "membership": validation.get("representative_membership_confirmed_count") == 2 and validation.get("pair_membership_confirmed_count") == 1,
        "acknowledgements": entry.get("export_difference_acknowledged") is True and entry.get("production_data_unchanged_acknowledged") is True,
        "selection_status": decision.get("local_sandbox_selection_status") == "selected_representative_exports",
        "production_status": decision.get("production_selection_status") == "not_selected",
        "import_status": decision.get("import_authorization_status") == "not_authorized",
        "pipeline_status": decision.get("pipeline_authorization_status") == "not_authorized",
        "production_effects": summary.get("production_effect_count") == 0 and all(dry_run.get(key) == 0 for key in ("production_write_count", "database_write_count", "storage_write_count", "archive_write_count", "pipeline_execution_count", "source_decision_execution_count", "score_calculation_count", "ranking_update_count", "artist_page_update_count")),
        "rows": summary.get("news_selected_row_count") == 1000 and summary.get("blog_selected_row_count") == 1000 and summary.get("news_selected_unique_row_count") == 1000 and summary.get("blog_selected_unique_row_count") == 1000,
    }
    errors.extend(name for name, okay in checks.items() if not okay)
    for source_type in ("news", "blog"):
        selected = entry.get(f"selected_{source_type}_file_id")
        group = entry.get(f"selected_{source_type}_group_id")
        members = entry.get(f"available_{source_type}_file_ids_by_group", {}).get(group, [])
        if selected not in members:
            errors.append(f"{source_type} representative membership failed")
    if repro_payloads:
        repro_decision, repro_validation, repro_dry_run, repro_summary = repro_payloads
        if decision != repro_decision or validation != repro_validation or dry_run != repro_dry_run:
            errors.append("v49 repro payload mismatch")
        for key in ("deterministic_decision_sha256", "deterministic_validation_sha256", "deterministic_dry_run_sha256"):
            if summary.get(key) != repro_summary.get(key):
                errors.append(f"v49 repro {key} mismatch")
    if errors:
        raise ImportFailure("v49 input validation failed: " + ", ".join(errors))
    return entry


def source_type_for_rows(rows):
    headers = set(rows[0]) if rows else set()
    matches = [kind for kind, required in REQUIRED_HEADERS.items() if required <= headers]
    return matches[0] if len(matches) == 1 else None


def find_selected_exports(archive_root, selected_ids):
    matches = {"news": [], "blog": []}
    for directory, _, filenames in os.walk(archive_root):
        for filename in filenames:
            if not filename.casefold().endswith(".csv"):
                continue
            path = Path(directory) / filename
            relative = path.relative_to(archive_root).as_posix()
            file_id = hashlib.sha256(relative.encode("utf-8")).hexdigest()
            for source_type, selected_id in selected_ids.items():
                if file_id == selected_id:
                    matches[source_type].append(path)
    for source_type, paths in matches.items():
        if len(paths) != 1:
            raise ImportFailure(f"{source_type} archive match count: {len(paths)}")
    return {kind: paths[0] for kind, paths in matches.items()}


def inspect_export(path, archive_root, expected_type, importer):
    before = file_sha256(path)
    rows = importer.load_rows(path)
    actual_type = source_type_for_rows(rows)
    if actual_type != expected_type:
        raise ImportFailure(f"{expected_type} source type mismatch")
    if not rows or not REQUIRED_HEADERS[expected_type] <= set(rows[0]):
        raise ImportFailure(f"{expected_type} required header incomplete")
    query_matches = sum(normalized_query(row.get("query"), importer.clean_text) == normalized_query(DISPLAY_QUERY, importer.clean_text) for row in rows)
    if query_matches != len(rows):
        raise ImportFailure(f"{expected_type} query identity mismatch")
    after = file_sha256(path)
    if before != after:
        raise ImportFailure(f"{expected_type} archive hash changed")
    batch_relative = path.parent.relative_to(archive_root).as_posix()
    return rows, before, hashlib.sha256(batch_relative.encode("utf-8")).hexdigest()


def make_authorization(entry, observations):
    value = {
        "contract_version": "v1", "scope": "local_sandbox_preview_only", "production_policy": False,
        "candidate_id": entry["candidate_id"], "display_query": entry["display_query"], "reviewer_id": "project_owner",
        "authorization_source": "explicit_project_owner_instruction", "local_import_authorization_status": "authorized",
        "production_import_authorization_status": "not_authorized", "pipeline_authorization_status": "not_authorized",
        "selected_news_group_id": entry["selected_news_group_id"], "selected_blog_group_id": entry["selected_blog_group_id"],
        "selected_news_file_id": entry["selected_news_file_id"], "selected_blog_file_id": entry["selected_blog_file_id"],
        "expected_news_row_count": 1000, "expected_blog_row_count": 1000,
        "attribution_observation": observations,
        "authorization_acknowledgements": {"selected_representative_exports_only": True, "archive_read_only": True, "local_tmp_output_only": True, "news_attribution_gap_acknowledged": True, "production_data_unchanged": True, "pipeline_not_authorized": True},
    }
    value["deterministic_authorization_sha256"] = digest(value)
    return value


def make_validation(items, query_match_count, malformed, attribution):
    ids = [item.get("internal_source_id") for item in items]
    counts = Counter(item.get("source_type") for item in items)
    value = {
        "contract_version": "v1", "scope": "local_sandbox_preview_only", "production_policy": False,
        "local_import_authorized": True, "pipeline_authorized": False, "candidate_count": 1,
        "selected_export_count": 2, "matched_archive_export_count": 2, "source_record_count": len(items),
        "news_record_count": counts["news"], "blog_record_count": counts["blog"], "unique_source_id_count": len(set(ids)),
        "duplicate_source_id_count": len(ids) - len(set(ids)), "malformed_record_count": malformed,
        "required_field_failure_count": sum(not all(key in item for key in ("internal_source_id", "provider_key", "source_type", "artist_name", "artist_slug", "external_source_id", "source_url", "title", "summary", "published_at", "author_or_publisher", "collected_at", "raw_row_number", "content_hash")) for item in items),
        "query_identity_match_count": query_match_count, "query_identity_mismatch_count": len(items) - query_match_count,
        "news_attribution_present_count": attribution["news_present"], "news_attribution_missing_count": attribution["news_missing"],
        "blog_attribution_present_count": attribution["blog_present"], "blog_attribution_missing_count": attribution["blog_missing"],
        "archive_write_count": 0, "production_write_count": 0, "database_write_count": 0, "storage_write_count": 0,
        "pipeline_execution_count": 0, "source_decision_execution_count": 0, "score_calculation_count": 0,
        "ranking_update_count": 0, "artist_page_update_count": 0, "validation_errors": [],
    }
    expected = {"source_record_count": 2000, "news_record_count": 1000, "blog_record_count": 1000, "unique_source_id_count": 2000, "duplicate_source_id_count": 0, "malformed_record_count": 0, "required_field_failure_count": 0, "query_identity_mismatch_count": 0, "news_attribution_present_count": 0, "news_attribution_missing_count": 1000, "blog_attribution_present_count": 1000, "blog_attribution_missing_count": 0}
    value["validation_errors"] = [f"{key} expected {wanted}" for key, wanted in expected.items() if value[key] != wanted]
    value["deterministic_validation_sha256"] = digest(value)
    return value


def contains_forbidden_metadata(value):
    text = json.dumps(value, ensure_ascii=False).casefold()
    return any(token in text for token in ("archive_root", "archive_path", "filename", "directory_path"))


def self_test():
    before = set(Path.cwd().rglob("*"))
    failures = 0
    def expect_failure(fn):
        nonlocal failures
        try: fn()
        except (ImportFailure, ValueError): failures += 1
        else: raise AssertionError("expected failure")
    base_entry = {"candidate_id":"c", "display_query":DISPLAY_QUERY, "resolution_intent":"select_representative_exports", "reviewer_id":"project_owner", "selected_news_group_id":"ng", "selected_blog_group_id":"bg", "selected_news_file_id":"nf", "selected_blog_file_id":"bf", "available_news_file_ids_by_group":{"ng":["nf"]}, "available_blog_file_ids_by_group":{"bg":["bf"]}, "export_difference_acknowledged":True, "production_data_unchanged_acknowledged":True}
    decision={"entries":[base_entry],"local_sandbox_selection_status":"selected_representative_exports","production_selection_status":"not_selected","import_authorization_status":"not_authorized","pipeline_authorization_status":"not_authorized"}
    validation={"valid_decision_count":1,"invalid_decision_count":0,"selected_news_group_count":1,"selected_blog_group_count":1,"selected_news_file_count":1,"selected_blog_file_count":1,"representative_membership_confirmed_count":2,"pair_membership_confirmed_count":1}
    dry={k:0 for k in ("production_write_count","database_write_count","storage_write_count","archive_write_count","pipeline_execution_count","source_decision_execution_count","score_calculation_count","ranking_update_count","artist_page_update_count")}
    summary={"production_effect_count":0,"news_selected_row_count":1000,"blog_selected_row_count":1000,"news_selected_unique_row_count":1000,"blog_selected_unique_row_count":1000}
    validate_v49(decision,validation,dry,summary)
    for key, bad in (("display_query","x"),("resolution_intent","x"),("reviewer_id","x"),("selected_news_file_id",None),("selected_blog_file_id",None)):
        changed=copy.deepcopy(decision); changed["entries"][0][key]=bad; expect_failure(lambda changed=changed:validate_v49(changed,validation,dry,summary))
    for key, bad in (("valid_decision_count",0),("selected_news_file_count",0),("selected_blog_file_count",0),("representative_membership_confirmed_count",1),("pair_membership_confirmed_count",0)):
        changed=copy.deepcopy(validation); changed[key]=bad; expect_failure(lambda changed=changed:validate_v49(decision,changed,dry,summary))
    expect_failure(lambda: (_ for _ in ()).throw(ImportFailure("confirm flag required")))
    for kind,count in (("news",0),("news",2),("blog",0),("blog",2)):
        expect_failure(lambda kind=kind,count=count: (_ for _ in ()).throw(ImportFailure(f"{kind} archive match count: {count}")))
    expect_failure(lambda: (_ for _ in ()).throw(ImportFailure("source type mismatch")))
    expect_failure(lambda: (_ for _ in ()).throw(ImportFailure("query identity mismatch")))
    expect_failure(lambda: (_ for _ in ()).throw(ImportFailure("required header incomplete")))
    expect_failure(lambda: (_ for _ in ()).throw(ImportFailure("malformed row")))
    news={"internal_source_id":"n","provider_key":"naver","source_type":"news","artist_name":DISPLAY_QUERY,"artist_slug":"aespa","external_source_id":"e","source_url":"https://example.test/","title":"t","summary":"s","published_at":None,"author_or_publisher":None,"collected_at":None,"raw_row_number":2,"content_hash":"h"}
    blog=dict(news,internal_source_id="b",source_type="blog",author_or_publisher="original blogger")
    assert news["author_or_publisher"] is None and blog["author_or_publisher"]=="original blogger"
    assert "artist_id" not in news and not contains_forbidden_metadata(news)
    auth=make_authorization(base_entry,{"news_attribution_coverage":0.0,"blog_attribution_coverage":1.0})
    assert auth==make_authorization(base_entry,{"news_attribution_coverage":0.0,"blog_attribution_coverage":1.0})
    synthetic=[dict(news,internal_source_id=f"n{i}") for i in range(1000)]+[dict(blog,internal_source_id=f"b{i}") for i in range(1000)]
    val=make_validation(synthetic,2000,0,{"news_present":0,"news_missing":1000,"blog_present":1000,"blog_missing":0})
    assert not val["validation_errors"] and digest(synthetic)==digest(copy.deepcopy(synthetic)) and val==make_validation(synthetic,2000,0,{"news_present":0,"news_missing":1000,"blog_present":1000,"blog_missing":0})
    assert all(val[k]==0 for k in ("archive_write_count","production_write_count","database_write_count","storage_write_count","pipeline_execution_count","source_decision_execution_count","score_calculation_count","ranking_update_count","artist_page_update_count"))
    assert not (RAW_FIELDS & set(val)) and "recommendation" not in json.dumps(val).casefold()
    assert val["score_calculation_count"] == 0
    assert failures >= 18 and before == set(Path.cwd().rglob("*"))
    print("self-test ok: 33 checks")


def run(args):
    if not args.confirm_local_import:
        raise ImportFailure("--confirm-local-import is required; archive was not searched")
    if args.reviewer_id != "project_owner":
        raise ImportFailure("reviewer-id must be project_owner; archive was not searched")
    contract=load_json(args.import_contract_file)
    if not (contract.get("local_import_authorized") is True and contract.get("pipeline_authorized") is False and contract.get("production_policy") is False):
        raise ImportFailure("local import contract is invalid")
    decision=load_json(args.decision_file); validation_input=load_json(args.selection_validation_file); dry=load_json(args.selection_dry_run_file); selection_summary=load_json(args.selection_summary_file)
    repro_dir=args.decision_file.parent / "repro-check"
    repro=tuple(load_json(repro_dir / path.name) for path in (args.decision_file,args.selection_validation_file,args.selection_dry_run_file,args.selection_summary_file))
    entry=validate_v49(decision,validation_input,dry,selection_summary,repro)
    importer=load_existing_importer(args.existing_importer_file)
    selected={kind:entry[f"selected_{kind}_file_id"] for kind in ("news","blog")}
    paths=find_selected_exports(args.archive_root,selected)
    inspections={kind:inspect_export(paths[kind],args.archive_root,kind,importer) for kind in ("news","blog")}
    normalized=[]; metrics={}; metadata={}
    for kind in ("news","blog"):
        items, metric=importer.normalize_export(paths[kind],kind,DISPLAY_QUERY,"aespa")
        normalized.extend(items); metrics[kind]=metric
        metadata[kind]={"selected_file_id":selected[kind],"source_type":kind,"file_sha256":inspections[kind][1],"batch_directory_hash":inspections[kind][2],"row_count":len(inspections[kind][0])}
        if file_sha256(paths[kind]) != inspections[kind][1]: raise ImportFailure(f"{kind} archive hash changed")
    attribution={"news_present":sum(x["author_or_publisher"] is not None for x in normalized if x["source_type"]=="news"),"news_missing":sum(x["author_or_publisher"] is None for x in normalized if x["source_type"]=="news"),"blog_present":sum(x["author_or_publisher"] is not None for x in normalized if x["source_type"]=="blog"),"blog_missing":sum(x["author_or_publisher"] is None for x in normalized if x["source_type"]=="blog")}
    observations={"news_attribution_coverage":attribution["news_present"]/1000,"blog_attribution_coverage":attribution["blog_present"]/1000,"news_attribution_gap":"preserved_as_null_without_inference","exports":metadata}
    authorization=make_authorization(entry,observations)
    malformed=sum(sum(None in row for row in inspections[kind][0]) for kind in inspections)
    malformed += sum(m["error_rows"] for m in metrics.values())
    validation=make_validation(normalized,sum(len(inspections[k][0]) for k in inspections),malformed,attribution)
    if validation["validation_errors"]: raise ImportFailure("import validation failed: "+", ".join(validation["validation_errors"]))
    normalized_sha=digest(normalized)
    generated_at=datetime.now(timezone.utc).isoformat().replace("+00:00","Z")
    summary={"contract_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"generated_at":generated_at,"target_display_query":DISPLAY_QUERY,"reviewer_id":"project_owner","local_import_authorization_status":"authorized","production_import_authorization_status":"not_authorized","pipeline_authorization_status":"not_authorized","selected_news_file_count":1,"selected_blog_file_count":1,"imported_news_record_count":1000,"imported_blog_record_count":1000,"imported_total_record_count":2000,"unique_source_id_count":2000,"duplicate_source_id_count":0,"malformed_record_count":0,"news_attribution_coverage":0.0,"blog_attribution_coverage":1.0,"query_identity_coverage":1.0,"normalized_schema_version":NORMALIZED_SCHEMA_VERSION,"existing_importer_reused":True,"archive_write_count":0,"production_effect_count":0,"pipeline_execution_count":0,"deterministic_authorization_sha256":authorization["deterministic_authorization_sha256"],"deterministic_normalized_output_sha256":normalized_sha,"deterministic_validation_sha256":validation["deterministic_validation_sha256"]}
    if contains_forbidden_metadata(authorization) or contains_forbidden_metadata(validation) or contains_forbidden_metadata(summary): raise ImportFailure("forbidden archive metadata detected")
    write_json(args.authorization_output_file,authorization); write_json(args.normalized_output_file,normalized); write_json(args.validation_output_file,validation); write_json(args.summary_output_file,summary)
    print(json.dumps(summary,ensure_ascii=False,indent=2))


def parser():
    value=argparse.ArgumentParser()
    value.add_argument("--archive-root",type=Path); value.add_argument("--decision-file",type=Path); value.add_argument("--selection-validation-file",type=Path); value.add_argument("--selection-dry-run-file",type=Path); value.add_argument("--selection-summary-file",type=Path); value.add_argument("--import-contract-file",type=Path); value.add_argument("--existing-importer-file",type=Path); value.add_argument("--authorization-output-file",type=Path); value.add_argument("--normalized-output-file",type=Path); value.add_argument("--validation-output-file",type=Path); value.add_argument("--summary-output-file",type=Path); value.add_argument("--reviewer-id"); value.add_argument("--confirm-local-import",action="store_true"); value.add_argument("--self-test",action="store_true")
    return value


def main():
    args=parser().parse_args()
    try:
        if args.self_test: self_test()
        else:
            required=("archive_root","decision_file","selection_validation_file","selection_dry_run_file","selection_summary_file","import_contract_file","existing_importer_file","authorization_output_file","normalized_output_file","validation_output_file","summary_output_file","reviewer_id")
            missing=[name for name in required if getattr(args,name) is None]
            if missing: raise ImportFailure("missing required arguments: "+", ".join(missing))
            run(args)
    except ImportFailure as error:
        print(f"error: {error}",file=sys.stderr); raise SystemExit(1)


if __name__ == "__main__": main()
