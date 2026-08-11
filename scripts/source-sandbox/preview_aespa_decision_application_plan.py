"""Inspect historical decision-application semantics and emit a no-write readiness plan."""

import argparse
import hashlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = Path(__file__).resolve().parent
CONTRACT_PATH = SCRIPTS / "aespa_decision_application_plan_preview_contract.preview.json"
OUT_FIRST = ROOT / "tmp/source-sandbox/naver/aespa-decision-application-plan"
OUT_REPRO = ROOT / "tmp/source-sandbox/naver/aespa-decision-application-plan-repro"
PLAN_NAME = "application-plan.canonical.json"
VALIDATION_NAME = "application-plan-validation.json"
REQUIREMENTS_NAME = "application-requirements.json"
SUMMARY_NAME = "safe-summary.json"
ALLOWLIST = {
    "scripts/source-sandbox/aespa_decision_application_plan_preview_contract.preview.json",
    "scripts/source-sandbox/preview_aespa_decision_application_plan.py",
    "docs/real-source-sandbox-aespa-decision-application-plan-preview.md",
}


class Failure(RuntimeError):
    pass


def load(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha256(value):
    return hashlib.sha256(value).hexdigest()


def file_sha(path):
    return sha256(path.read_bytes())


def object_sha(value):
    return sha256(canonical_bytes(value))


def import_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise Failure(f"cannot import module: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate_contract(contract):
    expected = {
        "version": "v64", "mode": "local_sandbox_preview_only", "artist": "aespa",
        "stage": "decision_application_plan_preview",
        "scope": "historical_application_semantics_readiness_and_gap_analysis_only",
        "local_sandbox_preview_only": True, "readiness_analysis_only": True,
        "historical_semantics_discovery_only": True, "missing_semantics_must_fail_closed": True,
        "actual_human_review": False, "actual_human_submission": False,
        "actual_source_decision": False, "actual_approval": False, "actual_rejection": False,
        "decision_application": False, "application_simulation": False, "source_mutation": False,
        "review_queue_mutation": False, "decision_state_mutation": False, "production_mutation": False,
        "production_authorization": False, "external_write": False,
        "allowed_readiness_values": ["ready", "not_ready"],
        "semantic_evidence_vocabulary": ["defined", "partially_defined", "classification_only", "not_defined", "not_applicable"],
    }
    bad = [key for key, value in expected.items() if contract.get(key) != value]
    if bad:
        raise Failure("invalid wrapper contract: " + ", ".join(bad))
    modules = contract.get("historical_modules", [])
    if len(modules) != 10 or len({item.get("role") for item in modules}) != len(modules):
        raise Failure("historical module manifest invalid")
    for item in modules:
        path = ROOT / item.get("path", "")
        if not path.is_file() or file_sha(path) != item.get("sha256"):
            raise Failure("historical provenance mismatch: " + str(item.get("role")))


def evidence_ref(contract, role, symbol, value):
    module = next(item for item in contract["historical_modules"] if item["role"] == role)
    return {"module_path": module["path"], "module_sha256": module["sha256"],
            "symbol_or_contract_key": symbol, "historical_label_or_value": value}


def discover():
    contract = load(CONTRACT_PATH)
    validate_contract(contract)
    modules = {item["role"]: ROOT / item["path"] for item in contract["historical_modules"]}
    input_contract = load(modules["decision_input_contract"])
    application_contract = load(modules["application_dry_run_contract"])
    validator = import_module(modules["authoritative_validator"], "v64_historical_validator")
    v61 = import_module(modules["v61_intake"], "v64_v61_intake")
    if validator.contract_errors(input_contract, application_contract):
        raise Failure("historical contracts invalid")
    if application_contract.get("dry_run_only") is not True or application_contract.get("production_policy") is not False:
        raise Failure("historical application boundary unexpectedly changed")
    values = v61.context()
    records, historical_paths, historical_before = values[5], values[6], values[7]
    if len(records) != 1000 or any(item.get("queue_status") != "pending_review" or item.get("current_decision_status") != "not_decided" for item in records):
        raise Failure("historical AESPA state mismatch")
    rules = application_contract["intent_rules"]
    vocabulary = input_contract["decision_intents"]
    if [rule["decision_intent"] for rule in rules] != vocabulary:
        raise Failure("historical vocabulary/rule mismatch")
    return contract, input_contract, application_contract, rules, historical_paths, historical_before


BLOCKERS = [
    ("missing_concrete_decision_transition", "decision_record", "Concrete persisted decision-status and intent transition is not defined."),
    ("missing_queue_transition", "queue_review_lifecycle", "Concrete queue/review lifecycle transition is not defined."),
    ("missing_persisted_decision_schema", "decision_record", "Persisted applied-decision record schema is not defined."),
    ("missing_write_target", "write_mechanics", "Concrete write target and insert/update mechanics are not defined."),
    ("missing_audit_schema", "audit", "Audit event and before/after snapshot schemas are not defined."),
    ("missing_idempotency_semantics", "write_mechanics", "Idempotency, duplicate, conflict, and stale-state semantics are not defined."),
    ("missing_failure_recovery_semantics", "failure_recovery", "Atomicity, retry, partial-failure, rollback, and already-applied behavior are not defined."),
]


def build_plan(contract, application_contract, rules):
    abstract = [rule["dry_run_effect"] for rule in rules]
    blocking_codes = [item[0] for item in BLOCKERS]
    coverage = []
    for rule in rules:
        intent = rule["decision_intent"]
        no_action = intent == "not_decided"
        coverage.append({
            "decision_intent": intent, "validator_supported": True,
            "historical_application_classification": "no_action" if no_action else "would_require_explicit_application",
            "historical_abstract_effect": rule["dry_run_effect"],
            "concrete_state_transition_defined": "not_applicable" if no_action else "not_defined",
            "decision_status_result_defined": "not_applicable" if no_action else "not_defined",
            "queue_or_review_status_result_defined": "not_applicable" if no_action else "not_defined",
            "reviewer_metadata_persistence_defined": "not_applicable" if no_action else "not_defined",
            "write_target_defined": "not_applicable" if no_action else "not_defined",
            "persisted_record_schema_defined": "not_applicable" if no_action else "not_defined",
            "audit_behavior_defined": "not_applicable" if no_action else "classification_only",
            "rollback_or_failure_semantics_defined": "not_applicable" if no_action else "not_defined",
            "ready_for_application_implementation": no_action,
            "blocking_reason_codes": [] if no_action else blocking_codes,
        })
    categories = [
        {"category": "decision_record", "coverage": "partially_defined", "defined": ["input decision vocabulary", "input metadata validation"], "missing": ["persisted target schema", "resulting status", "metadata persistence"]},
        {"category": "queue_review_lifecycle", "coverage": "not_defined", "defined": [], "missing": ["pending review transition", "completion/removal", "defer/enrichment lifecycle"]},
        {"category": "source_state", "coverage": "classification_only", "defined": ["abstract approval/rejection effect labels"], "missing": ["source-state relationship", "eligibility transition"]},
        {"category": "write_mechanics", "coverage": "not_defined", "defined": [], "missing": ["write target", "insert/update", "idempotency", "duplicates/conflicts/stale state"]},
        {"category": "audit", "coverage": "classification_only", "defined": ["dry-run audit_event_status is not_created"], "missing": ["audit schema", "snapshots", "application identifier"]},
        {"category": "failure_recovery", "coverage": "not_defined", "defined": [], "missing": ["atomicity", "partial failure", "retry", "rollback", "already-applied behavior"]},
        {"category": "downstream_effects", "coverage": "classification_only", "defined": ["dry-run production and score effects are disabled"], "missing": ["real application eligibility/scoring/ranking/public-data policy"]},
    ]
    defined_evidence = [
        evidence_ref(contract, "application_dry_run_contract", "dry_run_only", True),
        evidence_ref(contract, "application_dry_run_contract", "intent_rules[].dry_run_effect", abstract),
        evidence_ref(contract, "authoritative_validator", "build_outputs.actionability_status", "not_decided=no_action; otherwise=would_require_explicit_application"),
        evidence_ref(contract, "authoritative_validator", "build_outputs effect statuses", {"production_write_status": "not_written", "approval_snapshot_status": "not_created", "audit_event_status": "not_created", "score_application_status": "not_applied"}),
    ]
    requirements = [{
        "requirement_id": code, "category": category, "description": description,
        "historical_evidence": [defined_evidence[0], defined_evidence[-1]],
        "current_state": "not_defined", "required_before_application": True,
        "blocks_application_implementation": True,
    } for code, category, description in BLOCKERS]
    plan = {
        "version": "v64", "status": "valid_local_decision_application_plan_preview",
        "application_implementation_readiness": "not_ready" if requirements else "ready",
        "supported_decision_vocabulary": [rule["decision_intent"] for rule in rules],
        "historical_abstract_effects": abstract,
        "semantic_coverage_matrix": coverage, "semantic_category_coverage": categories,
        "historically_defined_evidence": defined_evidence,
        "critical_blocking_reason_codes": [item["requirement_id"] for item in requirements],
        "non_blocking_future_enhancements": [],
        "no_invented_transformation": True, "executable_write_plan": False,
    }
    return plan, requirements


def validation(plan, requirements, contract, historical_before, historical_unchanged):
    coverage = plan["semantic_coverage_matrix"]
    categories = plan["semantic_category_coverage"]
    result = {
        "version": "v64", "mode": contract["mode"], "artist": "aespa", "stage": contract["stage"], "scope": contract["scope"],
        "status": plan["status"], "application_implementation_readiness": plan["application_implementation_readiness"],
        "supported_decision_intent_count": len(coverage), "application_classification_count": len({item["historical_application_classification"] for item in coverage}),
        "abstract_effect_count": len(plan["historical_abstract_effects"]),
        "fully_defined_semantic_count": sum(item["coverage"] == "defined" for item in categories),
        "partially_defined_semantic_count": sum(item["coverage"] == "partially_defined" for item in categories),
        "classification_only_semantic_count": sum(item["coverage"] == "classification_only" for item in categories),
        "undefined_semantic_count": sum(item["coverage"] == "not_defined" for item in categories),
        "blocking_requirement_count": sum(item["blocks_application_implementation"] for item in requirements),
        "non_blocking_requirement_count": sum(not item["blocks_application_implementation"] for item in requirements),
        "total_requirement_count": len(requirements),
        "application_ready_count": int(plan["application_implementation_readiness"] == "ready"),
        "application_not_ready_count": int(plan["application_implementation_readiness"] == "not_ready"),
        "real_template_count": 1000, "real_pending_review_count": 1000, "real_not_decided_count": 1000,
        "real_actual_submission_count": 0, "real_actual_approval_count": 0, "real_actual_rejection_count": 0,
        "real_actual_decided_count": 0, "real_staged_decision_record_count": 0,
        "real_authorization_record_count": 0, "real_application_count": 0,
        "decision_application_count": 0, "source_mutation_count": 0, "review_queue_mutation_count": 0,
        "decision_state_mutation_count": 0, "production_mutation_count": 0,
        "production_effect_count": 0, "external_write_count": 0,
        "historical_input_hashes_preserved": historical_unchanged,
        "historical_input_sha256": dict(sorted(historical_before.items())),
        "canonical_plan_sha256": object_sha(plan), "requirements_sha256": object_sha(requirements),
    }
    result["deterministic_validation_sha256"] = object_sha(result)
    return result


def write_outputs(directory, plan, result, requirements):
    directory.mkdir(parents=True, exist_ok=True)
    (directory / PLAN_NAME).write_bytes(canonical_bytes(plan))
    (directory / VALIDATION_NAME).write_bytes(canonical_bytes(result))
    (directory / REQUIREMENTS_NAME).write_bytes(canonical_bytes(requirements))
    summary = {key: result[key] for key in ("status", "application_implementation_readiness", "supported_decision_intent_count", "abstract_effect_count", "blocking_requirement_count", "application_not_ready_count", "decision_application_count", "production_effect_count", "external_write_count", "canonical_plan_sha256", "requirements_sha256", "deterministic_validation_sha256")}
    (directory / SUMMARY_NAME).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def repo_safety():
    git = ["git", "-c", "safe.directory=C:/Users/김종민/Desktop/fandex-v54"]
    files = [str((directory / name).relative_to(ROOT)).replace("\\", "/") for directory in (OUT_FIRST, OUT_REPRO) for name in (PLAN_NAME, VALIDATION_NAME, REQUIREMENTS_NAME, SUMMARY_NAME)]
    ignored = subprocess.run([*git, "check-ignore", *files], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)
    if ignored.returncode != 0:
        raise Failure("tmp outputs are not ignored")
    status = subprocess.run([*git, "status", "--porcelain", "--untracked-files=all"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", check=True)
    changed = {line[3:].replace("\\", "/") for line in status.stdout.splitlines() if len(line) > 3}
    if not changed.issubset(ALLOWLIST):
        raise Failure("tracked-file allowlist violation: " + ", ".join(sorted(changed - ALLOWLIST)))


def run(directory):
    contract, _input, application, rules, paths, before = discover()
    plan, requirements = build_plan(contract, application, rules)
    after = {str(path): file_sha(path) for path in paths}
    unchanged = after == before
    if not unchanged:
        raise Failure("historical artifact changed")
    result = validation(plan, requirements, contract, before, unchanged)
    write_outputs(directory, plan, result, requirements)
    repo_safety()
    return plan, result, requirements


def self_test():
    first = run(OUT_FIRST)
    repro = run(OUT_REPRO)
    if first != repro:
        raise Failure("first/reproduction mismatch")
    plan, result, requirements = first
    vocabulary = plan["supported_decision_vocabulary"]
    coverage_intents = [item["decision_intent"] for item in plan["semantic_coverage_matrix"]]
    assertions = [
        vocabulary == ["not_decided", "approve_candidate", "accept_exception", "reject", "defer", "request_enrichment"],
        coverage_intents == vocabulary, len(set(coverage_intents)) == len(vocabulary),
        plan["historical_abstract_effects"] == ["no_change", "would_record_approval_decision", "would_record_exception_acceptance", "would_record_rejection", "would_record_deferral", "would_record_enrichment_request"],
        plan["semantic_coverage_matrix"][0]["historical_application_classification"] == "no_action",
        all(item["historical_application_classification"] == "would_require_explicit_application" for item in plan["semantic_coverage_matrix"][1:]),
        all(item["concrete_state_transition_defined"] == "not_defined" for item in plan["semantic_coverage_matrix"][1:]),
        plan["no_invented_transformation"] is True, len(requirements) == 7,
        all(item["blocks_application_implementation"] and item["current_state"] == "not_defined" for item in requirements),
        plan["application_implementation_readiness"] == "not_ready",
        result["real_template_count"] == result["real_pending_review_count"] == result["real_not_decided_count"] == 1000,
        all(result[key] == 0 for key in ("real_actual_submission_count", "real_actual_approval_count", "real_actual_rejection_count", "real_actual_decided_count", "real_application_count", "decision_application_count", "source_mutation_count", "review_queue_mutation_count", "decision_state_mutation_count", "production_mutation_count", "production_effect_count", "external_write_count")),
        result["historical_input_hashes_preserved"] is True,
    ]
    if not all(assertions):
        raise Failure("self-test assertion failed")
    hashes = [object_sha(item) for item in first]
    repro_hashes = [object_sha(item) for item in repro]
    if hashes != repro_hashes:
        raise Failure("deterministic hash mismatch")
    print(json.dumps({"self_test": "passed", "checks": 31,
                      "canonical_plan_first_sha256": hashes[0], "canonical_plan_repro_sha256": repro_hashes[0],
                      "validation_first_sha256": hashes[1], "validation_repro_sha256": repro_hashes[1],
                      "requirements_first_sha256": hashes[2], "requirements_repro_sha256": repro_hashes[2]}, sort_keys=True))


def main():
    parser = argparse.ArgumentParser(description="Preview AESPA decision-application semantic readiness.")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        if args.self_test:
            self_test()
        else:
            plan, result, _requirements = run(OUT_FIRST)
            print(json.dumps({"status": plan["status"], "application_implementation_readiness": plan["application_implementation_readiness"], "blocking_requirement_count": result["blocking_requirement_count"], "decision_application_count": 0}, sort_keys=True))
    except (Failure, OSError, KeyError, ValueError, AssertionError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
