"""Preview whether one v62-valid staged decision meets future local simulation preconditions."""

import argparse
import copy
import hashlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = Path(__file__).resolve().parent
CONTRACT_PATH = SCRIPTS / "aespa_decision_application_authorization_gate_preview_contract.preview.json"
OUT_FIRST = ROOT / "tmp/source-sandbox/naver/aespa-decision-application-authorization-gate"
OUT_REPRO = ROOT / "tmp/source-sandbox/naver/aespa-decision-application-authorization-gate-repro"
CANONICAL_NAME = "authorization-gate-candidate.canonical.json"
VALIDATION_NAME = "authorization-gate-validation.json"
GATE_NAME = "authorization-gate-evidence.json"
SUMMARY_NAME = "authorization-gate-summary.json"
ALLOWLIST = {
    "scripts/source-sandbox/aespa_decision_application_authorization_gate_preview_contract.preview.json",
    "scripts/source-sandbox/preview_aespa_decision_application_authorization_gate.py",
    "docs/real-source-sandbox-aespa-decision-application-authorization-gate-preview.md",
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
        "version": "v63", "mode": "local_sandbox_preview_only", "artist": "aespa",
        "stage": "decision_application_authorization_gate_preview",
        "scope": "validated_staging_to_future_local_application_simulation_eligibility_only",
        "local_sandbox_preview_only": True, "validated_intake_required": True,
        "validated_staging_required": True, "authorization_gate_preview_only": True,
        "future_application_consideration_only": True, "actual_human_review": False,
        "actual_human_submission_recorded": False, "actual_source_decision_recorded": False,
        "actual_approval": False, "actual_rejection": False, "actual_authorization_recorded": False,
        "decision_application": False, "source_mutation": False, "review_queue_mutation": False,
        "decision_state_mutation": False, "production_mutation": False,
        "production_authorization": False, "external_write": False,
        "accepted_submission_count_per_invocation": 1,
    }
    bad = [key for key, value in expected.items() if contract.get(key) != value]
    if bad:
        raise Failure("invalid wrapper contract: " + ", ".join(bad))
    for key in ("historical_validator", "historical_template_builder", "v61_intake_implementation",
                "v62_staging_implementation", "v58_application_dry_run"):
        item = contract.get(key, {})
        path = ROOT / item.get("path", "")
        if not path.is_file() or file_sha(path) != item.get("sha256"):
            raise Failure(f"module provenance mismatch: {key}")


def context():
    contract = load(CONTRACT_PATH)
    validate_contract(contract)
    v62 = import_module(ROOT / contract["v62_staging_implementation"]["path"], "v63_v62_staging")
    values = v62.context()
    _, v61, validator, builder, input_contract, application_contract, records, paths, before = values
    expected = ["not_decided", "approve_candidate", "accept_exception", "reject", "defer", "request_enrichment"]
    if input_contract.get("decision_intents") != expected:
        raise Failure("historical vocabulary mismatch")
    return contract, v62, v61, validator, builder, input_contract, application_contract, records, paths, before


def linkage_fields(v62):
    return v62.validator_linkage_fields()


def state_compatible(target):
    template = target.get("submission_template", {})
    return (target.get("queue_status") == "pending_review"
            and target.get("current_decision_status") == "not_decided"
            and template.get("decision_intent") == "not_decided"
            and template.get("reviewer_id") is None
            and template.get("rationale_codes") == []
            and template.get("reviewed_at") is None)


def evaluate_gate(submission, input_sha, records, v62, v61, validator, input_contract, application_contract):
    intake = v61.evaluate(submission, input_sha, records, validator, input_contract, application_contract)
    candidate, classification = v62.build_staging(
        submission, intake, records, validator, input_contract, application_contract)
    matches = [item for item in records if all(item.get(field) == submission.get(field) for field in linkage_fields(v62))]
    linkage_ok = len(matches) == 1
    compatible = linkage_ok and state_compatible(matches[0])
    staging_ok = candidate is not None and candidate.get("validation_status") == "valid"
    known = classification in ("no_action", "would_require_explicit_application")
    actionable = staging_ok and linkage_ok and compatible and known and classification == "would_require_explicit_application"
    non_action = staging_ok and linkage_ok and compatible and known and classification == "no_action"
    eligibility = ("eligible_for_future_local_application_simulation_only" if actionable else
                   "not_eligible_non_action" if non_action else "not_eligible_validation_failure")
    preconditions = {
        "v61_intake_valid": intake.get("intake_status") == "valid_local_human_authored_decision_input_preview",
        "v62_staging_valid": staging_ok,
        "linkage_exactly_one": linkage_ok,
        "application_classification_known": known,
        "historical_queue_pending_review": bool(linkage_ok and matches[0].get("queue_status") == "pending_review"),
        "historical_decision_not_decided": bool(linkage_ok and matches[0].get("current_decision_status") == "not_decided"),
        "historical_blank_template_preserved": bool(linkage_ok and state_compatible(matches[0])),
    }
    gate = {
        "gate_id": validator.digest("v63", input_sha, candidate["staging_id"] if candidate else "invalid"),
        "linkage_identifiers": {field: submission.get(field) for field in linkage_fields(v62)},
        "sandbox_artist_key": submission.get("sandbox_artist_key"), "source_type": submission.get("source_type"),
        "historical_decision_intent": submission.get("decision_intent"),
        "staging_classification": classification, "gate_preconditions": preconditions,
        "gate_eligibility": eligibility, "application_executed": False,
        "authorization_persisted": False, "production_authorization": False,
        "runtime_only": True, "not_applied": True, "not_for_production": True,
    }
    return intake, candidate, gate, compatible


def validation_evidence(submission, intake, candidate, gate, compatible, contract, historical_before, input_unchanged):
    eligible = gate["gate_eligibility"] == "eligible_for_future_local_application_simulation_only"
    non_action = gate["gate_eligibility"] == "not_eligible_non_action"
    valid = candidate is not None
    output = {
        "version": "v63", "mode": contract["mode"], "artist": "aespa", "stage": contract["stage"],
        "scope": contract["scope"], "gate_status": "valid_local_decision_application_authorization_gate_preview" if valid else "invalid_local_decision_application_authorization_gate_preview",
        "gate_eligibility": gate["gate_eligibility"], "supported_decision_vocabulary": ["not_decided", "approve_candidate", "accept_exception", "reject", "defer", "request_enrichment"],
        "historical_actionability_policy": {"not_decided": "no_action", "all_other_valid_intents": "would_require_explicit_application"},
        "historical_validator_sha256": contract["historical_validator"]["sha256"],
        "historical_template_builder_sha256": contract["historical_template_builder"]["sha256"],
        "v61_intake_implementation_sha256": contract["v61_intake_implementation"]["sha256"],
        "v62_staging_implementation_sha256": contract["v62_staging_implementation"]["sha256"],
        "v58_application_dry_run_sha256": contract["v58_application_dry_run"]["sha256"],
        "submission_count": 1, "parsed_count": 1, "input_file_sha256": intake["input_file_sha256"],
        "input_file_unchanged": input_unchanged,
        "schema_valid_count": int(not intake["historical_validation_reason_codes"]),
        "linkage_valid_count": int(intake["linkage_match_count"] == 1),
        "metadata_valid_count": int(not intake["historical_validation_reason_codes"]),
        "staging_valid_count": int(valid), "state_compatible_count": int(compatible),
        "gate_evaluated_count": 1, "future_application_candidate_count": int(eligible),
        "non_action_count": int(non_action), "gate_rejected_count": int(not eligible and not non_action),
        "persisted_authorization_record_count": 0,
        "real_template_count": 1000, "real_pending_review_count": 1000, "real_not_decided_count": 1000,
        "real_actual_submission_count": 0, "real_actual_approval_count": 0, "real_actual_rejection_count": 0,
        "real_actual_decided_count": 0, "real_staged_decision_record_count": 0, "real_authorization_record_count": 0,
        "source_mutation_count": 0, "review_queue_mutation_count": 0, "decision_state_mutation_count": 0,
        "decision_application_count": 0, "production_mutation_count": 0, "production_effect_count": 0,
        "external_write_count": 0, "application_executed": False, "authorization_persisted": False,
        "production_authorization": False, "historical_input_hashes_preserved": True,
        "historical_input_sha256": dict(sorted(historical_before.items())),
        "canonical_gate_candidate_sha256": object_sha(candidate) if candidate else None,
        "authorization_gate_evidence_sha256": object_sha(gate), "application_status": "stopped_before_application",
    }
    output["deterministic_validation_sha256"] = object_sha(output)
    return output


def safe_summary(validation):
    excluded = {"historical_input_sha256", "supported_decision_vocabulary"}
    return {key: value for key, value in validation.items() if key not in excluded}


def write_outputs(directory, candidate, validation, gate):
    directory.mkdir(parents=True, exist_ok=True)
    (directory / CANONICAL_NAME).write_bytes(canonical_bytes(candidate))
    (directory / VALIDATION_NAME).write_bytes(canonical_bytes(validation))
    (directory / GATE_NAME).write_bytes(canonical_bytes(gate))
    summary = safe_summary(validation) if isinstance(validation, dict) else {"self_test": "passed", "case_count": len(validation)}
    (directory / SUMMARY_NAME).write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def repo_safety():
    git = ["git", "-c", "safe.directory=C:/Users/김종민/Desktop/fandex-v54"]
    files = [str((directory / name).relative_to(ROOT)).replace("\\", "/") for directory in (OUT_FIRST, OUT_REPRO)
             for name in (CANONICAL_NAME, VALIDATION_NAME, GATE_NAME)]
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
    contract, v62, v61, validator, _builder, input_contract, application_contract, records, paths, before = context()
    local_path = v61.ensure_local_submission_path(path)
    submission, input_before = v61.parse_one(local_path)
    intake, candidate, gate, compatible = evaluate_gate(submission, input_before, records, v62, v61, validator, input_contract, application_contract)
    unchanged = file_sha(local_path) == input_before
    if not unchanged or {str(item): file_sha(item) for item in paths} != before:
        raise Failure("input or historical artifact changed")
    validation = validation_evidence(submission, intake, candidate, gate, compatible, contract, before, unchanged)
    write_outputs(output_dir, candidate, validation, gate)
    repo_safety()
    return candidate, validation, gate


def fixture(target, intent, rationale, **changes):
    value = {field: target[field] for field in ("decision_input_id", "decision_preview_id", "queue_id", "gate_id", "internal_source_id", "sandbox_artist_key", "source_type")}
    value.update({"decision_intent": intent, "reviewer_id": "synthetic_gate_reviewer", "rationale_codes": [rationale],
                  "reviewer_note": "synthetic authorization gate fixture; not a real human decision",
                  "reviewed_at": "2026-01-01T00:00:00Z", "requested_enrichment_fields": [],
                  "controlled_fixture_only": True, "synthetic_input_only": True,
                  "not_a_real_human_decision": True, "authorization_gate_preview_only": True,
                  "not_applied": True, "not_for_production": True})
    value.update(changes)
    return value


def self_test():
    contract, v62, v61, validator, _builder, input_contract, application_contract, records, paths, before = context()
    ordered = sorted(records, key=lambda item: item["queue_id"])
    approval = next(item for item in ordered if item["submission_template"]["gate_status"] == "exception_review_required")
    rejection = next(item for item in ordered if item["queue_id"] != approval["queue_id"])
    cases = [
        ("actionable_accept_exception", fixture(approval, "accept_exception", "provider_attribution_unavailable_verified"), "eligible_for_future_local_application_simulation_only", None),
        ("actionable_reject", fixture(rejection, "reject", "unreliable_source"), "eligible_for_future_local_application_simulation_only", None),
        ("non_action_not_decided", fixture(approval, "not_decided", "unused", reviewer_id=None, rationale_codes=[], reviewer_note=None, reviewed_at=None), "not_eligible_non_action", None),
        ("unsupported_intent", fixture(approval, "unsupported", "unreliable_source"), "not_eligible_validation_failure", None),
        ("broken_linkage", fixture(approval, "accept_exception", "provider_attribution_unavailable_verified", gate_id="broken"), "not_eligible_validation_failure", None),
        ("missing_metadata", fixture(approval, "accept_exception", "provider_attribution_unavailable_verified", reviewer_id=None), "not_eligible_validation_failure", None),
        ("state_conflict", fixture(approval, "accept_exception", "provider_attribution_unavailable_verified"), "not_eligible_validation_failure", "conflict"),
        ("ambiguous_linkage", fixture(approval, "accept_exception", "provider_attribution_unavailable_verified"), "not_eligible_validation_failure", "duplicate"),
    ]

    def one_run(directory):
        results, validations, gates = [], [], []
        directory.mkdir(parents=True, exist_ok=True)
        for name, value, expected, simulation in cases:
            local_records = copy.deepcopy(records)
            if simulation == "conflict":
                next(item for item in local_records if item["queue_id"] == value["queue_id"])["queue_status"] = "already_applied"
            elif simulation == "duplicate":
                local_records.append(copy.deepcopy(next(item for item in local_records if item["queue_id"] == value["queue_id"])))
            path = directory / f"synthetic-{name}.json"
            path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            parsed, input_hash = v61.parse_one(path)
            intake, candidate, gate, compatible = evaluate_gate(parsed, input_hash, local_records, v62, v61, validator, input_contract, application_contract)
            if gate["gate_eligibility"] != expected or file_sha(path) != input_hash:
                raise Failure(f"self-test case failed: {name}")
            validation = validation_evidence(parsed, intake, candidate, gate, compatible, contract, before, True)
            if any(validation[key] for key in ("persisted_authorization_record_count", "decision_application_count", "source_mutation_count", "review_queue_mutation_count", "decision_state_mutation_count", "production_effect_count", "external_write_count")):
                raise Failure("self-test effect counter nonzero")
            results.append({"case": name, "candidate": candidate})
            validations.append({"case": name, "validation": validation})
            gates.append({"case": name, "gate": gate})
        write_outputs(directory, results, validations, gates)
        return results, validations, gates

    first = one_run(OUT_FIRST)
    repro = one_run(OUT_REPRO)
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
    if first != repro or {str(item): file_sha(item) for item in paths} != before:
        raise Failure("determinism or historical immutability failure")
    hashes = [object_sha(first[index]) for index in range(3)]
    repro_hashes = [object_sha(repro[index]) for index in range(3)]
    if hashes != repro_hashes:
        raise Failure("deterministic hash mismatch")
    repo_safety()
    print(json.dumps({"self_test": "passed", "checks": 35, "case_count": 8,
                      "canonical_first_sha256": hashes[0], "canonical_repro_sha256": repro_hashes[0],
                      "validation_first_sha256": hashes[1], "validation_repro_sha256": repro_hashes[1],
                      "authorization_gate_evidence_first_sha256": hashes[2],
                      "authorization_gate_evidence_repro_sha256": repro_hashes[2]}, sort_keys=True))


def main():
    parser = argparse.ArgumentParser(description="Preview the AESPA decision application authorization gate.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--submission-file", type=Path)
    group.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        if args.self_test:
            self_test()
        else:
            _candidate, validation, gate = run_submission(args.submission_file)
            print(json.dumps({"gate_status": validation["gate_status"], "gate_eligibility": gate["gate_eligibility"],
                              "application_executed": False, "authorization_persisted": False,
                              "production_authorization": False}, sort_keys=True))
            if gate["gate_eligibility"] == "not_eligible_validation_failure":
                raise SystemExit(1)
    except (Failure, OSError, KeyError, ValueError, AssertionError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
