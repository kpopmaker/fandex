"""Stage one v61-valid local decision for inspection without applying it."""

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
CONTRACT_PATH = SCRIPTS / "aespa_human_decision_acceptance_staging_preview_contract.preview.json"
OUT_FIRST = ROOT / "tmp/source-sandbox/naver/aespa-human-decision-acceptance-staging"
OUT_REPRO = ROOT / "tmp/source-sandbox/naver/aespa-human-decision-acceptance-staging-repro"
CANONICAL_NAME = "human-decision-acceptance-staging.canonical.json"
VALIDATION_NAME = "human-decision-acceptance-staging-validation.json"
SUMMARY_NAME = "human-decision-acceptance-staging-summary.json"
LINKAGE_NAME = "human-decision-acceptance-staging-linkage.json"
ALLOWLIST = {
    "scripts/source-sandbox/aespa_human_decision_acceptance_staging_preview_contract.preview.json",
    "scripts/source-sandbox/preview_aespa_human_decision_acceptance_staging.py",
    "docs/real-source-sandbox-aespa-human-decision-acceptance-staging-preview.md",
}


class Failure(RuntimeError):
    pass


def load(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha_bytes(value):
    return hashlib.sha256(value).hexdigest()


def file_sha(path):
    return sha_bytes(path.read_bytes())


def object_sha(value):
    return sha_bytes(canonical_bytes(value))


def import_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise Failure(f"cannot import module: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate_contract(contract):
    expected = {
        "version": "v62", "mode": "local_sandbox_preview_only", "artist": "aespa",
        "stage": "human_decision_acceptance_staging_preview",
        "scope": "validated_intake_to_runtime_staging_only", "local_sandbox_preview_only": True,
        "validated_input_required": True, "acceptance_staging_preview_only": True,
        "application_candidate_classification_only": True, "actual_human_review": False,
        "actual_human_submission_recorded": False, "actual_source_decision_recorded": False,
        "actual_approval": False, "actual_rejection": False, "decision_application": False,
        "source_mutation": False, "review_queue_mutation": False, "decision_state_mutation": False,
        "production_mutation": False, "production_authorization": False, "external_write": False,
        "accepted_input_count_per_invocation": 1,
    }
    bad = [key for key, value in expected.items() if contract.get(key) != value]
    if bad:
        raise Failure("invalid wrapper contract: " + ", ".join(bad))
    for key in ("historical_validator", "historical_template_builder", "v61_intake_implementation", "historical_application_dry_run"):
        item = contract.get(key, {})
        path = ROOT / item.get("path", "")
        if not path.is_file() or file_sha(path) != item.get("sha256"):
            raise Failure(f"module provenance mismatch: {key}")


def context():
    contract = load(CONTRACT_PATH)
    validate_contract(contract)
    v61 = import_module(ROOT / contract["v61_intake_implementation"]["path"], "v62_v61_intake")
    values = v61.context()
    v61_contract, validator, builder, input_contract, application_contract, records, historical_paths, historical_before = values
    if v61_contract.get("version") != "v61" or not callable(getattr(validator, "validate_entry", None)):
        raise Failure("v61 intake or historical application helper unavailable")
    if input_contract.get("decision_intents") != contract_vocabulary():
        raise Failure("historical vocabulary mismatch")
    return contract, v61, validator, builder, input_contract, application_contract, records, historical_paths, historical_before


def contract_vocabulary():
    return ["not_decided", "approve_candidate", "accept_exception", "reject", "defer", "request_enrichment"]


def historical_classification(submission, target, validator, input_contract, application_contract):
    decision = {
        "internal_source_id": submission.get("internal_source_id"), "gate_id": submission.get("gate_id"),
        "queue_item_id": submission.get("queue_id"), "gate_status": target["submission_template"]["gate_status"],
        "decision_intent": submission.get("decision_intent"), "reviewer_id": submission.get("reviewer_id"),
        "rationale_codes": submission.get("rationale_codes"), "reviewer_note": submission.get("reviewer_note"),
        "reviewed_at": submission.get("reviewed_at"),
        "requested_enrichment_fields": submission.get("requested_enrichment_fields", []),
    }
    reasons, effect = validator.validate_entry(decision, decision["gate_status"], input_contract, application_contract)
    if reasons:
        raise Failure("historical application classification failed")
    input_hash = sha_bytes(validator.canonical_bytes(decision))
    validation_id = validator.digest(application_contract["contract_version"], target["queue_id"], input_hash)
    actionability = "no_action" if decision["decision_intent"] == "not_decided" else "would_require_explicit_application"
    return {"validation_id": validation_id,
            "dry_run_id": validator.digest(application_contract["contract_version"], validation_id, effect),
            "dry_run_effect": effect, "actionability_status": actionability}


def build_staging(submission, intake, records, validator, input_contract, application_contract):
    if intake["intake_status"] != "valid_local_human_authored_decision_input_preview":
        return None, "invalid_intake_not_staged"
    matches = [item for item in records if all(item.get(field) == submission.get(field) for field in validator_linkage_fields())]
    if len(matches) != 1:
        raise Failure("validated intake linkage no longer resolves exactly once")
    historical = historical_classification(submission, matches[0], validator, input_contract, application_contract)
    actionability = historical["actionability_status"]
    if actionability not in ("no_action", "would_require_explicit_application"):
        raise Failure("unknown historical actionability classification")
    candidate = {
        "staging_id": validator.digest("v62", intake["input_file_sha256"], historical["validation_id"], actionability),
        "decision_input_id": submission["decision_input_id"], "decision_preview_id": submission["decision_preview_id"],
        "queue_id": submission["queue_id"], "gate_id": submission["gate_id"],
        "internal_source_id": submission["internal_source_id"], "sandbox_artist_key": submission["sandbox_artist_key"],
        "source_type": submission["source_type"], "decision_intent": submission["decision_intent"],
        "validation_status": "valid", "historical_validation_id": historical["validation_id"],
        "historical_dry_run_id": historical["dry_run_id"], "historical_dry_run_effect": historical["dry_run_effect"],
        "application_candidate_classification": actionability,
        "controlled_local_staging_only": True, "runtime_only": True, "not_applied": True,
        "not_for_production": True, "persisted": False,
        "review_metadata": {"reviewer_id": submission.get("reviewer_id"),
                            "rationale_codes": submission.get("rationale_codes"),
                            "reviewer_note": submission.get("reviewer_note"),
                            "reviewed_at": submission.get("reviewed_at")},
    }
    return candidate, actionability


def validator_linkage_fields():
    return ("decision_input_id", "decision_preview_id", "queue_id", "gate_id", "internal_source_id", "sandbox_artist_key", "source_type")


def evidence(submission, intake, candidate, classification, contract, historical_before, input_contract):
    valid = candidate is not None
    actionable = valid and classification == "would_require_explicit_application"
    non_action = valid and classification == "no_action"
    output = {
        "version": "v62", "mode": contract["mode"], "artist": "aespa", "stage": contract["stage"],
        "scope": contract["scope"],
        "staging_status": "valid_local_human_decision_acceptance_staging_preview" if valid else "invalid_local_human_decision_acceptance_staging_preview",
        "staging_eligibility": "eligible_for_local_application_dry_run_only" if actionable else ("no_action" if non_action else "ineligible"),
        "v61_intake_status": intake["intake_status"], "v61_intake_eligibility": intake["intake_eligibility"],
        "historical_provenance_status": "verified", "historical_validator_reused": True,
        "historical_template_builder_reused": True, "v61_intake_reused": True,
        "historical_application_semantics_reused": True,
        "historical_validator_sha256": contract["historical_validator"]["sha256"],
        "historical_template_builder_sha256": contract["historical_template_builder"]["sha256"],
        "v61_intake_implementation_sha256": contract["v61_intake_implementation"]["sha256"],
        "historical_application_dry_run_sha256": contract["historical_application_dry_run"]["sha256"],
        "supported_decision_vocabulary": input_contract["decision_intents"],
        "historical_actionability_policy": {"not_decided": "no_action", "all_other_valid_intents": "would_require_explicit_application"},
        "submission_count": 1, "parsed_count": 1, "input_file_sha256": intake["input_file_sha256"],
        "input_file_unchanged": intake["input_file_unchanged"],
        "schema_valid_count": int(not intake["historical_validation_reason_codes"]),
        "linkage_valid_count": int(intake["linkage_match_count"] == 1),
        "metadata_valid_count": int(not intake["historical_validation_reason_codes"]),
        "staging_candidate_count": int(valid), "actionable_candidate_count": int(actionable),
        "non_action_candidate_count": int(non_action), "persisted_staging_record_count": 0,
        "application_candidate_classification": classification,
        "real_template_count": 1000, "real_pending_review_count": 1000, "real_not_decided_count": 1000,
        "real_actual_submission_count": 0, "real_actual_approval_count": 0,
        "real_actual_rejection_count": 0, "real_actual_decided_count": 0,
        "real_staged_decision_record_count": 0, "source_mutation_count": 0,
        "review_queue_mutation_count": 0, "decision_state_mutation_count": 0,
        "decision_application_count": 0, "decision_application_execution_count": 0,
        "production_mutation_count": 0, "production_effect_count": 0, "external_write_count": 0,
        "human_review_execution_count": 0, "human_submission_execution_count": 0,
        "production_authorization_count": 0, "historical_input_hashes_preserved": True,
        "historical_input_sha256": dict(sorted(historical_before.items())),
        "linkage_fields": list(validator_linkage_fields()),
        "canonical_staging_sha256": object_sha(candidate) if candidate else None,
        "application_status": "stopped_before_application",
    }
    output["deterministic_validation_sha256"] = object_sha(output)
    return output


def safe_summary(validation):
    excluded = {"historical_input_sha256", "linkage_fields", "supported_decision_vocabulary"}
    return {key: value for key, value in validation.items() if key not in excluded}


def linkage_evidence(submission, intake):
    return {"linkage_status": "valid" if intake["linkage_match_count"] == 1 else "invalid",
            "match_count": intake["linkage_match_count"],
            "identifiers": {field: submission.get(field) for field in validator_linkage_fields()}}


def write_outputs(directory, candidate, validation, linkage):
    directory.mkdir(parents=True, exist_ok=True)
    (directory / CANONICAL_NAME).write_bytes(canonical_bytes(candidate))
    (directory / VALIDATION_NAME).write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (directory / SUMMARY_NAME).write_text(json.dumps(safe_summary(validation), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (directory / LINKAGE_NAME).write_text(json.dumps(linkage, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def repo_safety():
    git = ["git", "-c", "safe.directory=C:/Users/김종민/Desktop/fandex-v54"]
    files = [str(path.relative_to(ROOT)).replace("\\", "/") for path in (OUT_FIRST / CANONICAL_NAME, OUT_REPRO / CANONICAL_NAME)]
    ignored = subprocess.run([*git, "check-ignore", *files], cwd=ROOT, capture_output=True, text=True,
                             encoding="utf-8", errors="replace", check=False)
    if ignored.returncode != 0:
        raise Failure("tmp outputs are not ignored")
    status = subprocess.run([*git, "status", "--porcelain", "--untracked-files=all"], cwd=ROOT,
                            capture_output=True, text=True, encoding="utf-8", errors="replace", check=True)
    changed = {line[3:].replace("\\", "/") for line in status.stdout.splitlines() if len(line) > 3}
    if not changed.issubset(ALLOWLIST):
        raise Failure("tracked-file allowlist violation: " + ", ".join(sorted(changed - ALLOWLIST)))


def run_submission(path, output_dir=OUT_FIRST):
    contract, v61, validator, _builder, input_contract, application_contract, records, historical_paths, historical_before = context()
    local_path = v61.ensure_local_submission_path(path)
    submission, input_before = v61.parse_one(local_path)
    intake = v61.evaluate(submission, input_before, records, validator, input_contract, application_contract)
    candidate, classification = build_staging(submission, intake, records, validator, input_contract, application_contract)
    if file_sha(local_path) != input_before:
        raise Failure("submission input changed")
    if {str(item): file_sha(item) for item in historical_paths} != historical_before:
        raise Failure("historical input changed")
    validation = evidence(submission, intake, candidate, classification, contract, historical_before, input_contract)
    write_outputs(output_dir, candidate, validation, linkage_evidence(submission, intake))
    repo_safety()
    return candidate, validation


def fixture(target, intent, rationale, **changes):
    value = {field: target[field] for field in validator_linkage_fields()}
    value.update({"decision_intent": intent, "reviewer_id": "synthetic_staging_reviewer",
                  "rationale_codes": [rationale], "reviewer_note": "synthetic staging fixture; not a real human decision",
                  "reviewed_at": "2026-01-01T00:00:00Z", "requested_enrichment_fields": [],
                  "controlled_fixture_only": True, "synthetic_input_only": True,
                  "not_a_real_human_decision": True, "not_applied": True, "not_for_production": True})
    value.update(changes)
    return value


def self_test():
    contract, v61, validator, _builder, input_contract, application_contract, records, historical_paths, historical_before = context()
    ordered = sorted(records, key=lambda item: item["queue_id"])
    approval = next(item for item in ordered if item["submission_template"]["gate_status"] == "exception_review_required")
    rejection = next(item for item in ordered if item["queue_id"] != approval["queue_id"])
    cases = [
        ("actionable_accept_exception", fixture(approval, "accept_exception", "provider_attribution_unavailable_verified"), "would_require_explicit_application"),
        ("actionable_reject", fixture(rejection, "reject", "unreliable_source"), "would_require_explicit_application"),
        ("non_action_not_decided", fixture(approval, "not_decided", "unused", reviewer_id=None, rationale_codes=[], reviewer_note=None, reviewed_at=None), "no_action"),
        ("invalid_unsupported", fixture(approval, "unsupported", "unreliable_source"), "invalid_intake_not_staged"),
        ("invalid_broken_linkage", fixture(approval, "accept_exception", "provider_attribution_unavailable_verified", gate_id="broken_gate"), "invalid_intake_not_staged"),
        ("invalid_missing_metadata", fixture(approval, "accept_exception", "provider_attribution_unavailable_verified", reviewer_id=None), "invalid_intake_not_staged"),
    ]
    def one_run(directory):
        results, validations = [], []
        directory.mkdir(parents=True, exist_ok=True)
        for name, value, expected in cases:
            path = directory / f"synthetic-{name}.json"
            path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            before = file_sha(path)
            parsed, input_hash = v61.parse_one(path)
            intake = v61.evaluate(parsed, input_hash, records, validator, input_contract, application_contract)
            candidate, classification = build_staging(parsed, intake, records, validator, input_contract, application_contract)
            if classification != expected or file_sha(path) != before:
                raise Failure(f"self-test case failed: {name}")
            validation = evidence(parsed, intake, candidate, classification, contract, historical_before, input_contract)
            if validation["persisted_staging_record_count"] or validation["decision_application_count"]:
                raise Failure("self-test effect counter nonzero")
            results.append({"case": name, "staging": candidate})
            validations.append({"case": name, "validation": validation})
        (directory / CANONICAL_NAME).write_bytes(canonical_bytes(results))
        (directory / VALIDATION_NAME).write_bytes(canonical_bytes(validations))
        (directory / SUMMARY_NAME).write_text(json.dumps({"self_test": "passed", "case_count": 6}, indent=2) + "\n", encoding="utf-8")
        (directory / LINKAGE_NAME).write_text(json.dumps({"synthetic_linkage_cases": 6}, indent=2) + "\n", encoding="utf-8")
        return results, validations
    first, first_validation = one_run(OUT_FIRST)
    repro, repro_validation = one_run(OUT_REPRO)
    malformed = OUT_FIRST / "synthetic-malformed.json"
    malformed.write_text("{not-json\n", encoding="utf-8")
    try:
        v61.parse_one(malformed)
        raise Failure("malformed JSON did not fail")
    except RuntimeError as exc:
        if "malformed JSON" not in str(exc):
            raise
    multiple = OUT_FIRST / "synthetic-multiple.json"
    multiple.write_text(json.dumps([cases[0][1], cases[1][1]]) + "\n", encoding="utf-8")
    try:
        v61.parse_one(multiple)
        raise Failure("multiple submissions did not fail")
    except RuntimeError as exc:
        if "exactly one" not in str(exc):
            raise
    if first != repro or first_validation != repro_validation:
        raise Failure("first/repro output mismatch")
    if {str(item): file_sha(item) for item in historical_paths} != historical_before:
        raise Failure("historical input changed in self-test")
    canonical_first, canonical_repro = object_sha(first), object_sha(repro)
    validation_first, validation_repro = object_sha(first_validation), object_sha(repro_validation)
    if canonical_first != canonical_repro or validation_first != validation_repro:
        raise Failure("deterministic hash mismatch")
    repo_safety()
    print(json.dumps({"self_test": "passed", "checks": 27, "case_count": 6,
                      "canonical_first_sha256": canonical_first, "canonical_repro_sha256": canonical_repro,
                      "validation_first_sha256": validation_first, "validation_repro_sha256": validation_repro}, sort_keys=True))


def main():
    parser = argparse.ArgumentParser(description="Preview runtime-only acceptance staging for one v61-valid decision.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--submission-file", type=Path)
    group.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        if args.self_test:
            self_test()
        else:
            candidate, validation = run_submission(args.submission_file)
            print(json.dumps({"staging_status": validation["staging_status"],
                              "staging_eligibility": validation["staging_eligibility"],
                              "application_candidate_classification": validation["application_candidate_classification"],
                              "staging_candidate_count": validation["staging_candidate_count"],
                              "canonical_staging_sha256": validation["canonical_staging_sha256"],
                              "deterministic_validation_sha256": validation["deterministic_validation_sha256"]}, sort_keys=True))
            if candidate is None:
                raise SystemExit(1)
    except (Failure, OSError, KeyError, ValueError, AssertionError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
