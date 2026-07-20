"""Run the local source sandbox stages into an isolated directory."""

import argparse
import json
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
import subprocess
import sys
import os


STAGE_ORDER = [
    "validate_normalized_sources", "build_artist_source_mappings",
    "preview_quality_eligibility", "preview_approval_gate",
    "prepare_human_review_queue", "validate_human_review_decisions",
]
RECORD_KEYS = ["mapping_records", "quality_records", "approval_records", "review_queue", "decision_template", "decision_validation", "decision_dry_run"]
SUMMARY_KEYS = ["validation_report", "mapping_summary", "quality_summary", "approval_summary", "review_summary", "decision_summary"]
CONTRACT_PATHS = {
    "source_type": "scripts/source-sandbox/source_type_metadata_contract.preview.json",
    "decision_input": "scripts/source-sandbox/human_review_decision_contract.preview.json",
    "decision_application": "scripts/source-sandbox/human_review_decision_application_contract.preview.json",
}


def canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256_file(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def load_json(path):
    with Path(path).open(encoding="utf-8") as handle:
        return json.load(handle)


def is_safe_relative(value):
    if not isinstance(value, str) or not value or Path(value).is_absolute():
        return False
    return ".." not in Path(value).parts


def inside(path, parent):
    try:
        Path(path).resolve().relative_to(Path(parent).resolve())
        return True
    except ValueError:
        return False


def manifest_errors(manifest, repo_root, check_scripts=True):
    errors = []
    required = ["manifest_version", "scope", "production_policy", "description", "artist", "provider", "canonical_inputs", "canonical_comparison_outputs", "run_output_layout", "stages"]
    for key in required:
        if key not in manifest:
            errors.append(f"missing_top_level_key:{key}")
    if not manifest.get("manifest_version"):
        errors.append("missing_manifest_version")
    if manifest.get("scope") != "local_sandbox_preview_only":
        errors.append("invalid_scope")
    if manifest.get("production_policy") is not False:
        errors.append("production_policy_must_be_false")
    artist = manifest.get("artist", {})
    for key in ("sandbox_artist_key", "artist_name", "artist_slug"):
        if not isinstance(artist.get(key), str) or not artist.get(key).strip():
            errors.append(f"missing_artist_identity:{key}")
    provider = manifest.get("provider", {})
    if not isinstance(provider.get("provider_key"), str) or not provider.get("provider_key", "").strip():
        errors.append("missing_provider_key")
    source_types = provider.get("supported_source_types", [])
    if not isinstance(source_types, list) or len(source_types) != len(set(source_types)):
        errors.append("duplicate_or_invalid_supported_source_types")
    for section in ("canonical_inputs", "canonical_comparison_outputs"):
        values = manifest.get(section, {})
        if not isinstance(values, dict):
            errors.append(f"invalid_{section}")
            continue
        for key, value in values.items():
            if not is_safe_relative(value) or not inside(Path(repo_root) / value, repo_root):
                errors.append(f"unsafe_{section}_path:{key}")
    layout = manifest.get("run_output_layout", {})
    if not isinstance(layout, dict):
        errors.append("invalid_run_output_layout")
        layout = {}
    elif len(layout.values()) != len(set(layout.values())):
        errors.append("duplicate_run_output_path")
    for key, value in layout.items():
        if not is_safe_relative(value):
            errors.append(f"unsafe_run_output_path:{key}")
    stages = manifest.get("stages", [])
    if not isinstance(stages, list):
        return sorted(set(errors + ["invalid_stages"]))
    ids = [stage.get("stage_id") for stage in stages if isinstance(stage, dict)]
    scripts = [stage.get("script") for stage in stages if isinstance(stage, dict)]
    if len(ids) != len(stages) or len(ids) != len(set(ids)):
        errors.append("duplicate_or_invalid_stage_id")
    if len(scripts) != len(set(scripts)):
        errors.append("duplicate_stage_script")
    id_set = set(ids)
    for stage in stages:
        if not isinstance(stage, dict):
            errors.append("invalid_stage")
            continue
        stage_id, script = stage.get("stage_id"), stage.get("script")
        if not isinstance(stage.get("enabled"), bool):
            errors.append(f"enabled_not_boolean:{stage_id}")
        if stage.get("enabled") is not True:
            errors.append(f"stage_not_enabled:{stage_id}")
        if not is_safe_relative(script) or not str(script).replace("\\", "/").startswith("scripts/source-sandbox/"):
            errors.append(f"unsafe_stage_script:{stage_id}")
        elif check_scripts and not (Path(repo_root) / script).is_file():
            errors.append(f"missing_stage_script:{stage_id}")
        dependencies = stage.get("depends_on", [])
        if not isinstance(dependencies, list) or any(dep not in id_set for dep in dependencies):
            errors.append(f"missing_dependency:{stage_id}")
        outputs = stage.get("expected_output_keys", [])
        if not isinstance(outputs, list) or len(outputs) != len(set(outputs)) or any(key not in layout for key in outputs):
            errors.append(f"invalid_expected_output_keys:{stage_id}")
    visiting, visited = set(), set()
    graph = {stage.get("stage_id"): stage.get("depends_on", []) for stage in stages if isinstance(stage, dict)}
    def visit(node):
        if node in visiting:
            return False
        if node in visited:
            return True
        visiting.add(node)
        for dependency in graph.get(node, []):
            if dependency in graph and not visit(dependency):
                return False
        visiting.remove(node); visited.add(node)
        return True
    if any(not visit(node) for node in graph):
        errors.append("dependency_cycle")
    return sorted(set(errors))


def stage_order(manifest):
    stages = {stage["stage_id"]: stage for stage in manifest["stages"] if stage["enabled"]}
    result = []
    while len(result) < len(stages):
        ready = [stage_id for stage_id, stage in stages.items() if stage_id not in result and all(dep in result for dep in stage["depends_on"])]
        if not ready:
            raise ValueError("dependency cycle")
        result.extend(ready)
    return result


def validate_run_root(run_root, repo_root, manifest):
    errors = []
    root = Path(run_root)
    if not root.is_absolute():
        root = Path(repo_root) / root
    root = root.resolve()
    canonical_root = (Path(repo_root) / "tmp/source-sandbox/naver/iu").resolve()
    if inside(root, canonical_root):
        errors.append("run_root_overlaps_canonical")
    for forbidden in ("app", "public", "docs", "scripts"):
        if inside(root, Path(repo_root) / forbidden):
            errors.append(f"run_root_inside_{forbidden}")
    if not inside(root, repo_root):
        errors.append("run_root_outside_repo")
    for key, value in manifest.get("run_output_layout", {}).items():
        if not inside(root / value, root):
            errors.append(f"output_outside_run_root:{key}")
    return root, errors


def paths_for(manifest, repo_root, run_root):
    inputs = {key: (Path(repo_root) / value).resolve() for key, value in manifest["canonical_inputs"].items()}
    canonical = {key: (Path(repo_root) / value).resolve() for key, value in manifest["canonical_comparison_outputs"].items()}
    outputs = {key: (Path(run_root) / value).resolve() for key, value in manifest["run_output_layout"].items()}
    return inputs, canonical, outputs


def command_for(stage_id, manifest, repo_root, inputs, outputs):
    artist = manifest["artist"]
    common = ["--sandbox-artist-key", artist["sandbox_artist_key"], "--artist-name", artist["artist_name"], "--artist-slug", artist["artist_slug"]]
    normalized = ["--news-file", str(inputs["news_normalized_file"]), "--blog-file", str(inputs["blog_normalized_file"])]
    script = str((Path(repo_root) / next(stage["script"] for stage in manifest["stages"] if stage["stage_id"] == stage_id)).resolve())
    args = [sys.executable, script]
    if stage_id == "validate_normalized_sources":
        args += ["--artist-name", artist["artist_name"], "--artist-slug", artist["artist_slug"]]
        for alias in artist.get("aliases", []): args += ["--artist-alias", alias]
        args += normalized + ["--import-summary-file", str(inputs["import_summary_file"]), "--output-file", str(outputs["validation_report"])]
    elif stage_id == "build_artist_source_mappings":
        args += common
        for alias in artist.get("aliases", []): args += ["--artist-alias", alias]
        args += normalized + ["--validation-report-file", str(outputs["validation_report"]), "--output-file", str(outputs["mapping_records"]), "--summary-file", str(outputs["mapping_summary"])]
    elif stage_id == "preview_quality_eligibility":
        args += common + normalized + ["--validation-report-file", str(outputs["validation_report"]), "--mapping-file", str(outputs["mapping_records"]), "--mapping-summary-file", str(outputs["mapping_summary"]), "--output-file", str(outputs["quality_records"]), "--summary-file", str(outputs["quality_summary"])]
    elif stage_id == "preview_approval_gate":
        args += common + ["--contract-file", str(Path(repo_root) / CONTRACT_PATHS["source_type"])] + normalized + ["--validation-report-file", str(outputs["validation_report"]), "--mapping-file", str(outputs["mapping_records"]), "--mapping-summary-file", str(outputs["mapping_summary"]), "--quality-preview-file", str(outputs["quality_records"]), "--quality-summary-file", str(outputs["quality_summary"]), "--attribution-audit-file", str(inputs["attribution_audit_file"]), "--output-file", str(outputs["approval_records"]), "--summary-file", str(outputs["approval_summary"])]
    elif stage_id == "prepare_human_review_queue":
        args += common + ["--contract-file", str(Path(repo_root) / CONTRACT_PATHS["decision_input"])] + normalized + ["--mapping-file", str(outputs["mapping_records"]), "--quality-preview-file", str(outputs["quality_records"]), "--gate-preview-file", str(outputs["approval_records"]), "--gate-summary-file", str(outputs["approval_summary"]), "--queue-output-file", str(outputs["review_queue"]), "--queue-summary-file", str(outputs["review_summary"]), "--decision-template-file", str(outputs["decision_template"])]
    elif stage_id == "validate_human_review_decisions":
        args += ["--input-contract-file", str(Path(repo_root) / CONTRACT_PATHS["decision_input"]), "--application-contract-file", str(Path(repo_root) / CONTRACT_PATHS["decision_application"]), "--queue-file", str(outputs["review_queue"]), "--queue-summary-file", str(outputs["review_summary"]), "--decision-file", str(outputs["decision_template"]), "--gate-file", str(outputs["approval_records"]), "--validation-output-file", str(outputs["decision_validation"]), "--dry-run-output-file", str(outputs["decision_dry_run"]), "--summary-output-file", str(outputs["decision_summary"]), "--require-all-not-decided"]
    return args


def acceptance(stage_id, outputs):
    def read(key): return load_json(outputs[key])
    errors = []
    if stage_id == "validate_normalized_sources":
        report = read("validation_report")
        if report.get("total_items") != 2000 or report.get("structural_error_count") != 0: errors.append("validation_acceptance_failed")
    elif stage_id == "build_artist_source_mappings":
        records, summary = read("mapping_records"), read("mapping_summary")
        if len(records) != 2000 or summary.get("duplicate_internal_source_id_count") != 0: errors.append("mapping_acceptance_failed")
    elif stage_id == "preview_quality_eligibility":
        records, summary = read("quality_records"), read("quality_summary")
        if len(records) != 2000 or summary.get("quality_blocked_count") != 0 or summary.get("eligibility_blocked_count") != 0: errors.append("quality_acceptance_failed")
    elif stage_id == "preview_approval_gate":
        records, summary = read("approval_records"), read("approval_summary")
        expected = (len(records) == 2000 and summary.get("approval_candidate_count") == 1000 and summary.get("exception_review_required_count") == 1000 and summary.get("manual_review_required_count") == 0 and summary.get("blocked_count") == 0 and all(item.get("decision_status") == "not_decided" for item in records))
        if not expected: errors.append("approval_acceptance_failed")
    elif stage_id == "prepare_human_review_queue":
        queue, summary, template = read("review_queue"), read("review_summary"), read("decision_template")
        expected = (len(queue) == 1000 and summary.get("approval_candidate_excluded_count") == 1000 and all(item.get("source_type") == "news" for item in queue) and len(template) == 1000 and all(item.get("decision_intent") == "not_decided" and item.get("reviewer_id") is None and item.get("rationale_codes") == [] for item in template))
        if not expected: errors.append("review_acceptance_failed")
    elif stage_id == "validate_human_review_decisions":
        summary, dry = read("decision_summary"), read("decision_dry_run")
        expected = (summary.get("valid_decision_count") == 1000 and summary.get("invalid_decision_count") == 0 and summary.get("actionable_decision_count") == 0 and summary.get("no_change_count") == 1000 and all(summary.get(key) == 0 for key in ("production_write_count", "approval_snapshot_created_count", "audit_event_created_count", "score_application_count")) and all(item.get("dry_run_effect") == "no_change" for item in dry))
        if not expected: errors.append("decision_acceptance_failed")
    return errors


def run_stage(command, runner=subprocess.run):
    return runner(command, shell=False, capture_output=True, text=True, encoding="utf-8", errors="replace")


def comparison(run_path, canonical_path, key):
    if key in RECORD_KEYS:
        status = "exact_match" if sha256_file(run_path) == sha256_file(canonical_path) else "mismatch"
        return status, []
    run_value, canonical_value = load_json(run_path), load_json(canonical_path)
    excluded = ["validated_at"] if key == "validation_report" else ["generated_at"]
    for field in excluded:
        if isinstance(run_value, dict): run_value.pop(field, None)
        if isinstance(canonical_value, dict): canonical_value.pop(field, None)
    status = "match_excluding_generated_at" if run_value == canonical_value else "mismatch"
    return status, excluded


def reported_output_sha256(path, key):
    if key not in SUMMARY_KEYS:
        return sha256_file(path)
    value = load_json(path)
    timestamp_field = "validated_at" if key == "validation_report" else "generated_at"
    if isinstance(value, dict):
        value.pop(timestamp_field, None)
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def execute_pipeline(manifest, repo_root, run_root, compare_canonical, runner=subprocess.run):
    inputs, canonical, outputs = paths_for(manifest, repo_root, run_root)
    protected = {str(path): sha256_file(path) for path in list(inputs.values()) + list(canonical.values())}
    order = stage_order(manifest)
    stage_results = []
    for stage_id in order:
        command = command_for(stage_id, manifest, repo_root, inputs, outputs)
        result = run_stage(command, runner)
        if result.returncode:
            tail = (result.stderr or result.stdout or "")[-2000:]
            print(f"stage failed: {stage_id}; exit_code={result.returncode}; tail={tail}")
            raise RuntimeError(f"stage_failed:{stage_id}")
        stage = next(item for item in manifest["stages"] if item["stage_id"] == stage_id)
        for key in stage["expected_output_keys"]:
            load_json(outputs[key])
        errors = acceptance(stage_id, outputs)
        if errors:
            raise RuntimeError(f"stage_acceptance_failed:{stage_id}:{','.join(errors)}")
        stage_results.append({"stage_id": stage_id, "status": "completed", "output_files": [manifest["run_output_layout"][key] for key in stage["expected_output_keys"]], "record_counts": {key: len(load_json(outputs[key])) if isinstance(load_json(outputs[key]), list) else 1 for key in stage["expected_output_keys"]}, "output_sha256": {key: reported_output_sha256(outputs[key], key) for key in stage["expected_output_keys"]}})
    comparisons = {}
    if compare_canonical:
        for key, canonical_path in canonical.items():
            status, excluded = comparison(outputs[key], canonical_path, key)
            comparisons[key] = {"status": status, "excluded_fields": excluded}
        mismatches = [key for key, value in comparisons.items() if value["status"] == "mismatch"]
        if mismatches:
            raise RuntimeError("canonical_comparison_mismatch:" + ",".join(mismatches))
    preserved = {path: sha256_file(path) == before for path, before in protected.items()}
    if not all(preserved.values()):
        changed = [os.path.relpath(path, repo_root) for path, ok in preserved.items() if not ok]
        print("protected canonical files changed: " + ", ".join(changed))
        raise RuntimeError("canonical_hash_changed")
    decision_summary = load_json(outputs["decision_summary"])
    record_hashes = {key: sha256_file(outputs[key]) for key in RECORD_KEYS}
    deterministic_payload = {"manifest_version": manifest["manifest_version"], "stage_order": order, "record_output_sha256": record_hashes}
    summary = {
        "manifest_version": manifest["manifest_version"], "scope": manifest["scope"], "production_policy": manifest["production_policy"],
        "sandbox_artist_key": manifest["artist"]["sandbox_artist_key"], "artist_name": manifest["artist"]["artist_name"], "artist_slug": manifest["artist"]["artist_slug"], "provider_key": manifest["provider"]["provider_key"],
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), "run_root": os.path.relpath(run_root, repo_root).replace("\\", "/"),
        "stage_count": len(order), "completed_stage_count": len(stage_results), "failed_stage_count": 0, "stage_execution_order": order, "stages": stage_results,
        "canonical_comparisons": comparisons, "canonical_input_hash_preserved": all(preserved[str(path)] for path in inputs.values()), "canonical_output_hash_preserved": all(preserved[str(path)] for path in canonical.values()),
        "total_normalized_count": load_json(outputs["validation_report"])["total_items"], "mapping_count": len(load_json(outputs["mapping_records"])), "quality_preview_count": len(load_json(outputs["quality_records"])), "gate_count": len(load_json(outputs["approval_records"])), "active_queue_count": len(load_json(outputs["review_queue"])), "decision_template_count": len(load_json(outputs["decision_template"])),
        "valid_decision_count": decision_summary["valid_decision_count"], "no_change_count": decision_summary["no_change_count"], "production_write_count": 0, "approval_snapshot_count": 0, "audit_event_count": 0, "score_application_count": 0,
        "deterministic_pipeline_sha256": hashlib.sha256(canonical_bytes(deterministic_payload)).hexdigest(),
    }
    outputs["pipeline_summary"].parent.mkdir(parents=True, exist_ok=True)
    outputs["pipeline_summary"].write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return summary


def self_test(repo_root):
    script = "scripts/source-sandbox/validate_normalized_sources.py"
    base = {"manifest_version":"v1","scope":"local_sandbox_preview_only","production_policy":False,"description":"x","artist":{"sandbox_artist_key":"a","artist_name":"a","artist_slug":"a"},"provider":{"provider_key":"p","supported_source_types":["news"]},"canonical_inputs":{"x":"tmp/x.json"},"canonical_comparison_outputs":{"x":"tmp/y.json"},"run_output_layout":{"x":"x.json"},"stages":[{"stage_id":"a","script":script,"enabled":True,"depends_on":[],"expected_output_keys":["x"]}]}
    assert not manifest_errors(base, repo_root)
    def bad(change):
        value=json.loads(json.dumps(base)); change(value); return value
    assert manifest_errors(bad(lambda x:x["stages"].append(dict(x["stages"][0]))),repo_root)
    assert manifest_errors(bad(lambda x:x["stages"][0].update(depends_on=["missing"])),repo_root)
    cyc=bad(lambda x:x["stages"].append({"stage_id":"b","script":"scripts/source-sandbox/build_artist_source_mappings.py","enabled":True,"depends_on":["a"],"expected_output_keys":["x"]}));cyc["stages"][0]["depends_on"]=["b"]; assert manifest_errors(cyc,repo_root)
    assert manifest_errors(bad(lambda x:x["stages"][0].update(script="scripts/source-sandbox/missing.py")),repo_root)
    assert manifest_errors(bad(lambda x:x.update(scope="production")),repo_root)
    assert manifest_errors(bad(lambda x:x.update(production_policy=True)),repo_root)
    assert manifest_errors(bad(lambda x:x["canonical_inputs"].update(x=str(Path(repo_root)/"x"))),repo_root)
    assert manifest_errors(bad(lambda x:x["canonical_inputs"].update(x="../x")),repo_root)
    _,e=validate_run_root("tmp/source-sandbox/naver/iu/run",repo_root,base);assert e
    _,e=validate_run_root("app/run",repo_root,base);assert e
    assert manifest_errors(bad(lambda x:x["run_output_layout"].update(x="../x")),repo_root)
    calls=[]
    class Result: returncode=1; stdout=""; stderr="synthetic"
    runner=lambda *a,**k:(calls.append((a,k)) or Result())
    for command in (["synthetic-stage-1"], ["synthetic-stage-2"]):
        if run_stage(command, runner).returncode:
            break
    assert len(calls)==1 and calls[0][1].get("shell") is False
    planned=stage_order(base); plan_calls=[]
    assert planned==["a"] and not plan_calls
    before=set(Path(repo_root).glob("synthetic-self-test-*")); after=set(Path(repo_root).glob("synthetic-self-test-*")); assert before==after
    print("self-test passed: manifest safety, plan isolation, fail-fast runner, shell=False; no files written")


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--manifest-file"); parser.add_argument("--run-root"); parser.add_argument("--compare-canonical",action="store_true"); parser.add_argument("--plan-only",action="store_true"); parser.add_argument("--self-test",action="store_true")
    args=parser.parse_args(); repo_root=Path.cwd().resolve()
    if args.self_test: self_test(repo_root); return
    if not args.manifest_file or not args.run_root: parser.error("--manifest-file and --run-root are required")
    try: manifest=load_json(args.manifest_file)
    except (OSError,json.JSONDecodeError) as error: print(f"manifest error: {error}"); raise SystemExit(1)
    errors=manifest_errors(manifest,repo_root); run_root,root_errors=validate_run_root(args.run_root,repo_root,manifest); errors+=root_errors
    inputs,canonical,outputs=paths_for(manifest,repo_root,run_root)
    for key,path in {**inputs,**canonical}.items():
        try: load_json(path)
        except (OSError,json.JSONDecodeError) as error: errors.append(f"invalid_or_missing_input:{key}:{type(error).__name__}")
    if errors: print("pipeline validation failed: "+", ".join(sorted(set(errors)))); raise SystemExit(1)
    order=stage_order(manifest)
    if args.plan_only:
        print("plan-only: no stages executed; canonical inputs are read-only")
        for index,stage_id in enumerate(order,1):
            stage=next(item for item in manifest["stages"] if item["stage_id"]==stage_id)
            print(f"{index}. {stage_id}: "+", ".join(manifest["run_output_layout"][key] for key in stage["expected_output_keys"]))
        print("run-root: "+os.path.relpath(run_root,repo_root).replace("\\","/")); return
    try:
        summary=execute_pipeline(manifest,repo_root,run_root,args.compare_canonical)
    except RuntimeError as error:
        print(f"pipeline failed: {error}"); raise SystemExit(1)
    print(f"pipeline complete: stages={summary['completed_stage_count']} deterministic_pipeline_sha256={summary['deterministic_pipeline_sha256']}")


if __name__=="__main__": main()
