"""Read and validate one local human-authored decision without applying it."""

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
TMP_ROOT = (ROOT / "tmp/source-sandbox").resolve()
CONTRACT_PATH = SCRIPTS / "aespa_human_authored_decision_input_preview_contract.preview.json"
INPUT_CONTRACT_PATH = SCRIPTS / "human_review_decision_contract.preview.json"
APPLICATION_CONTRACT_PATH = SCRIPTS / "human_review_decision_application_contract.preview.json"
V59_FIRST = ROOT / "tmp/source-sandbox/naver/aespa-human-decision-submission"
V59_REPRO = ROOT / "tmp/source-sandbox/naver/aespa-human-decision-submission-repro"
V59_CANONICAL = "human-decision-submission-preview.canonical.json"
V59_VALIDATION = "human-decision-submission-validation.json"
OUT_FIRST = ROOT / "tmp/source-sandbox/naver/aespa-human-authored-decision-input"
OUT_REPRO = ROOT / "tmp/source-sandbox/naver/aespa-human-authored-decision-input-repro"
CANONICAL_NAME = "human-authored-decision-intake.canonical.json"
VALIDATION_NAME = "human-authored-decision-intake-validation.json"
SUMMARY_NAME = "human-authored-decision-intake-summary.json"
LINKAGE_FIELDS = ("decision_input_id", "decision_preview_id", "queue_id", "gate_id", "internal_source_id", "sandbox_artist_key", "source_type")
DECISION_FIELDS = ("internal_source_id", "gate_id", "queue_item_id", "gate_status", "decision_intent", "reviewer_id", "rationale_codes", "reviewer_note", "reviewed_at", "requested_enrichment_fields")
ALLOWLIST = {
    "scripts/source-sandbox/aespa_human_authored_decision_input_preview_contract.preview.json",
    "scripts/source-sandbox/preview_aespa_human_authored_decision_input.py",
    "docs/real-source-sandbox-aespa-human-authored-decision-input-preview.md",
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
        raise Failure(f"cannot import historical module: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate_contract(contract):
    expected = {
        "version": "v61", "mode": "local_sandbox_preview_only", "artist": "aespa",
        "stage": "human_authored_decision_input_preview", "scope": "intake_validation_only",
        "local_sandbox_preview_only": True, "human_authored_input_supported": True,
        "intake_validation_only": True, "actual_human_review": False,
        "actual_human_submission_recorded": False, "actual_source_decision": False,
        "actual_approval": False, "actual_rejection": False, "decision_application": False,
        "production_mutation": False, "pipeline_authorization": False, "external_write": False,
        "allowed_submission_count_per_invocation": 1,
    }
    bad = [key for key, value in expected.items() if contract.get(key) != value]
    if bad:
        raise Failure("invalid wrapper contract: " + ", ".join(bad))
    for key in ("historical_validator", "historical_template_builder"):
        item = contract.get(key, {})
        path = ROOT / item.get("path", "")
        if not path.is_file() or file_sha(path) != item.get("sha256"):
            raise Failure(f"historical module provenance mismatch: {key}")


def load_lineage():
    paths = [V59_FIRST / V59_CANONICAL, V59_REPRO / V59_CANONICAL,
             V59_FIRST / V59_VALIDATION, V59_REPRO / V59_VALIDATION]
    if any(not path.is_file() for path in paths):
        raise Failure("required v59 historical evidence is missing")
    before = {str(path): file_sha(path) for path in paths}
    first, repro, first_meta, repro_meta = (load(path) for path in paths)
    if first != repro or file_sha(paths[0]) != file_sha(paths[1]):
        raise Failure("v59 first/repro historical lineage mismatch")
    required = {
        "preview_status": "valid_local_human_decision_submission_preview",
        "human_decision_submission_preview_eligibility": "eligible",
        "source_record_count": 1000, "submission_template_record_count": 1000,
        "pending_review_count": 1000, "not_decided_count": 1000,
        "actual_human_submission_count": 0, "actual_approval_count": 0,
        "actual_rejection_count": 0, "actual_decided_count": 0,
        "decision_application_execution_count": 0, "production_mutation_count": 0,
        "production_effect_count": 0,
    }
    for meta in (first_meta, repro_meta):
        bad = [key for key, value in required.items() if meta.get(key) != value]
        if bad:
            raise Failure("historical real state mismatch: " + ", ".join(bad))
    if len(first) != 1000:
        raise Failure("historical real template count mismatch")
    for record in first:
        template = record.get("submission_template", {})
        if (record.get("queue_status") != "pending_review" or record.get("current_decision_status") != "not_decided"
                or template.get("decision_intent") != "not_decided" or template.get("reviewer_id") is not None
                or template.get("rationale_codes") != [] or template.get("reviewed_at") is not None):
            raise Failure("historical real decision state is not blank")
    return first, paths, before


def ensure_local_submission_path(path):
    resolved = path.resolve()
    try:
        resolved.relative_to(TMP_ROOT)
    except ValueError as exc:
        raise Failure("submission file must be under tmp/source-sandbox") from exc
    if resolved.suffix.casefold() != ".json" or not resolved.is_file():
        raise Failure("submission file must be an existing local JSON file")
    return resolved


def parse_one(path):
    before = file_sha(path)
    try:
        value = load(path)
    except json.JSONDecodeError as exc:
        raise Failure("malformed JSON submission") from exc
    if not isinstance(value, dict):
        raise Failure("exactly one submission object is required")
    after = file_sha(path)
    if before != after:
        raise Failure("submission input changed during parsing")
    return value, before


def index_lineage(records):
    indexes = {field: {} for field in LINKAGE_FIELDS}
    for record in records:
        for field in LINKAGE_FIELDS:
            indexes[field].setdefault(record.get(field), []).append(record)
    return indexes


def evaluate(submission, input_sha, records, validator, input_contract, application_contract):
    reasons = []
    if not isinstance(submission, dict):
        reasons.append("submission_must_be_object")
        submission = {}
    for field in LINKAGE_FIELDS:
        if not isinstance(submission.get(field), str) or not submission[field].strip():
            reasons.append(f"missing_linkage_field:{field}")
    indexes = index_lineage(records)
    matches = []
    if not reasons:
        anchor = indexes["decision_input_id"].get(submission["decision_input_id"], [])
        matches = [record for record in anchor if all(record.get(field) == submission.get(field) for field in LINKAGE_FIELDS)]
        if len(anchor) != 1:
            reasons.append("decision_input_id_not_unique_or_missing")
        if len(matches) != 1:
            reasons.append("historical_linkage_not_exactly_one")
        for field in LINKAGE_FIELDS[1:5]:
            if len(indexes[field].get(submission.get(field), [])) != 1:
                reasons.append(f"linkage_not_unique_or_missing:{field}")
    schema_reasons, effect = ["schema_not_evaluated_due_to_linkage"], "no_change"
    decision = {field: submission.get(field) for field in DECISION_FIELDS}
    if len(matches) == 1:
        target = matches[0]
        decision["internal_source_id"] = submission.get("internal_source_id")
        decision["gate_id"] = submission.get("gate_id")
        decision["queue_item_id"] = submission.get("queue_id")
        decision["gate_status"] = target["submission_template"]["gate_status"]
        schema_reasons, effect = validator.validate_entry(decision, decision["gate_status"], input_contract, application_contract)
        reasons.extend(f"schema:{reason}" for reason in schema_reasons)
    valid = not reasons
    canonical = {
        "intake_status": "valid_local_human_authored_decision_input_preview" if valid else "invalid_local_human_authored_decision_input_preview",
        "intake_eligibility": "eligible_for_local_validation_only" if valid else "ineligible",
        "input_file_sha256": input_sha, "input_file_unchanged": True,
        "submission": copy.deepcopy(submission), "historical_validation_reason_codes": schema_reasons,
        "linkage_match_count": len(matches), "validation_reason_codes": sorted(set(reasons)),
        "historical_dry_run_effect_classification": effect,
        "application_status": "stopped_before_application",
    }
    return canonical


def validation_evidence(result, contract, historical_hashes, input_contract):
    submission = result.get("submission", {})
    valid = result["intake_status"].startswith("valid_")
    linkage_valid = result["linkage_match_count"] == 1
    evidence = {
        "version": "v61", "mode": contract["mode"], "artist": "aespa", "stage": contract["stage"],
        "scope": contract["scope"], "intake_status": result["intake_status"],
        "intake_eligibility": result["intake_eligibility"], "historical_provenance_status": "verified",
        "historical_validator_reused": True, "historical_template_reused": True,
        "historical_validator_path": contract["historical_validator"]["path"],
        "historical_validator_sha256": contract["historical_validator"]["sha256"],
        "historical_template_builder_path": contract["historical_template_builder"]["path"],
        "historical_template_builder_sha256": contract["historical_template_builder"]["sha256"],
        "historical_helpers_reused": ["decision_template", "contract_errors", "validate_entry", "canonical_bytes"],
        "supported_decision_vocabulary": input_contract["decision_intents"],
        "required_submission_fields": input_contract["required_fields"],
        "conditional_decision_fields": ["reviewer_id", "rationale_codes"],
        "optional_metadata_fields": input_contract["optional_fields"], "linkage_fields": list(LINKAGE_FIELDS),
        "input_file_sha256": result["input_file_sha256"], "input_file_unchanged": result["input_file_unchanged"],
        "submission_count": 1, "source_type": submission.get("source_type"),
        "decision_vocabulary_used": submission.get("decision_intent"), "parsed_count": 1,
        "valid_submission_count": int(valid), "invalid_submission_count": int(not valid),
        "schema_valid_count": int(not result["historical_validation_reason_codes"]),
        "linkage_valid_count": int(linkage_valid),
        "reviewer_id_present_count": int(bool(submission.get("reviewer_id"))),
        "reviewed_at_present_count": int(bool(submission.get("reviewed_at"))),
        "rationale_present_count": int(bool(submission.get("rationale_codes"))),
        "reviewer_note_present_count": int(bool(submission.get("reviewer_note"))),
        "real_template_count": 1000, "real_pending_review_count": 1000, "real_not_decided_count": 1000,
        "real_actual_submission_count": 0, "real_actual_approval_count": 0,
        "real_actual_rejection_count": 0, "real_actual_decided_count": 0,
        "source_mutation_count": 0, "review_queue_mutation_count": 0, "decision_state_mutation_count": 0,
        "decision_application_count": 0, "decision_application_execution_count": 0,
        "production_mutation_count": 0, "production_effect_count": 0, "external_write_count": 0,
        "human_review_execution_count": 0, "human_submission_execution_count": 0,
        "pipeline_authorization_count": 0, "historical_input_hashes_preserved": True,
        "historical_input_sha256": dict(sorted(historical_hashes.items())),
        "validation_reason_codes": result["validation_reason_codes"],
        "application_status": "stopped_before_application",
        "canonical_intake_sha256": object_sha(result),
    }
    evidence["deterministic_validation_sha256"] = object_sha(evidence)
    return evidence


def safe_summary(evidence):
    keys = ("version", "mode", "artist", "stage", "scope", "intake_status", "intake_eligibility",
            "historical_provenance_status", "input_file_sha256", "input_file_unchanged", "submission_count",
            "source_type", "decision_vocabulary_used", "valid_submission_count", "invalid_submission_count",
            "schema_valid_count", "linkage_valid_count", "real_template_count", "real_pending_review_count",
            "real_not_decided_count", "real_actual_submission_count", "real_actual_approval_count",
            "real_actual_rejection_count", "real_actual_decided_count", "source_mutation_count",
            "review_queue_mutation_count", "decision_state_mutation_count", "decision_application_count",
            "production_mutation_count", "production_effect_count", "external_write_count", "application_status",
            "canonical_intake_sha256", "deterministic_validation_sha256")
    return {key: evidence[key] for key in keys}


def write_outputs(directory, result, evidence):
    directory.mkdir(parents=True, exist_ok=True)
    (directory / CANONICAL_NAME).write_bytes(canonical_bytes(result))
    (directory / VALIDATION_NAME).write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (directory / SUMMARY_NAME).write_text(json.dumps(safe_summary(evidence), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def repo_safety():
    git = ["git", "-c", "safe.directory=C:/Users/김종민/Desktop/fandex-v54"]
    ignored_files = [str(path.relative_to(ROOT)).replace("\\", "/") for path in
                     (OUT_FIRST / CANONICAL_NAME, OUT_REPRO / CANONICAL_NAME)]
    ignored = subprocess.run([*git, "check-ignore", *ignored_files], cwd=ROOT, capture_output=True,
                             text=True, encoding="utf-8", errors="replace", check=False)
    if ignored.returncode != 0:
        raise Failure("tmp outputs are not ignored")
    status = subprocess.run([*git, "status", "--porcelain", "--untracked-files=all"], cwd=ROOT,
                            capture_output=True, text=True, encoding="utf-8", errors="replace", check=True)
    changed = {line[3:].replace("\\", "/") for line in status.stdout.splitlines() if len(line) > 3}
    if not changed.issubset(ALLOWLIST):
        raise Failure("tracked-file allowlist violation: " + ", ".join(sorted(changed - ALLOWLIST)))


def context():
    contract = load(CONTRACT_PATH)
    validate_contract(contract)
    validator = import_module(ROOT / contract["historical_validator"]["path"], "v61_historical_validator")
    builder = import_module(ROOT / contract["historical_template_builder"]["path"], "v61_historical_builder")
    if not callable(getattr(builder, "decision_template", None)) or not callable(getattr(validator, "validate_entry", None)):
        raise Failure("required historical helper unavailable")
    input_contract, application_contract = load(INPUT_CONTRACT_PATH), load(APPLICATION_CONTRACT_PATH)
    if validator.contract_errors(input_contract, application_contract):
        raise Failure("historical contracts invalid")
    if contract["supported_historical_decision_vocabulary"] != input_contract["decision_intents"]:
        raise Failure("supported vocabulary provenance mismatch")
    records, historical_paths, historical_before = load_lineage()
    queue = [{"queue_item_id": item["queue_id"], "internal_source_id": item["internal_source_id"],
              "gate_id": item["gate_id"], "gate_status": item["submission_template"]["gate_status"]}
             for item in records]
    rebuilt = builder.decision_template(queue)
    if len(rebuilt) != 1000 or any(item["decision_intent"] != "not_decided" for item in rebuilt):
        raise Failure("historical template builder state mismatch")
    return contract, validator, builder, input_contract, application_contract, records, historical_paths, historical_before


def run_submission(path, output_dir=OUT_FIRST):
    contract, validator, _builder, input_contract, application_contract, records, historical_paths, historical_before = context()
    local_path = ensure_local_submission_path(path)
    submission, input_before = parse_one(local_path)
    result = evaluate(submission, input_before, records, validator, input_contract, application_contract)
    if file_sha(local_path) != input_before:
        raise Failure("submission input hash changed")
    historical_after = {str(path): file_sha(path) for path in historical_paths}
    if historical_after != historical_before:
        raise Failure("historical input hash changed")
    evidence = validation_evidence(result, contract, historical_before, input_contract)
    write_outputs(output_dir, result, evidence)
    repo_safety()
    return result, evidence


def fixture(target, intent, rationale, **changes):
    value = {field: target[field] for field in LINKAGE_FIELDS}
    value.update({"decision_intent": intent, "reviewer_id": "synthetic_intake_reviewer",
                  "rationale_codes": [rationale], "reviewer_note": "synthetic controlled intake; not a real human decision",
                  "reviewed_at": "2026-01-01T00:00:00Z", "requested_enrichment_fields": [],
                  "controlled_fixture_only": True, "synthetic_input_only": True,
                  "not_a_real_human_decision": True, "not_for_application": True, "not_for_production": True})
    value.update(changes)
    return value


def self_test():
    contract, validator, _builder, input_contract, application_contract, records, historical_paths, historical_before = context()
    targets = sorted(records, key=lambda item: item["queue_id"])
    approval = next(item for item in targets if item["submission_template"]["gate_status"] == "exception_review_required")
    rejection = next(item for item in targets if item["queue_id"] != approval["queue_id"])
    cases = [
        ("valid_accept_exception", fixture(approval, "accept_exception", "provider_attribution_unavailable_verified"), True),
        ("valid_reject", fixture(rejection, "reject", "unreliable_source"), True),
        ("invalid_unsupported", fixture(approval, "unsupported", "unreliable_source"), False),
        ("invalid_missing_metadata", fixture(approval, "accept_exception", "provider_attribution_unavailable_verified", reviewer_id=None), False),
        ("invalid_broken_linkage", fixture(approval, "accept_exception", "provider_attribution_unavailable_verified", gate_id="broken_gate"), False),
    ]
    def one_run(directory):
        results, evidence = [], []
        directory.mkdir(parents=True, exist_ok=True)
        for name, value, expected in cases:
            path = directory / f"synthetic-{name}.json"
            path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            before = file_sha(path)
            parsed, parsed_hash = parse_one(path)
            result = evaluate(parsed, parsed_hash, records, validator, input_contract, application_contract)
            if result["intake_status"].startswith("valid_") != expected or file_sha(path) != before:
                raise Failure(f"self-test case failed: {name}")
            item = validation_evidence(result, contract, historical_before, input_contract)
            results.append({"case": name, "result": result})
            evidence.append({"case": name, "validation": item})
        (directory / CANONICAL_NAME).write_bytes(canonical_bytes(results))
        (directory / VALIDATION_NAME).write_bytes(canonical_bytes(evidence))
        (directory / SUMMARY_NAME).write_text(json.dumps({"self_test": "passed", "case_count": 5}, indent=2) + "\n", encoding="utf-8")
        return results, evidence
    first, first_validation = one_run(OUT_FIRST)
    repro, repro_validation = one_run(OUT_REPRO)
    malformed = OUT_FIRST / "synthetic-malformed.json"
    malformed.write_text("{not-json\n", encoding="utf-8")
    try:
        parse_one(malformed)
        raise Failure("malformed JSON self-test did not fail")
    except Failure as exc:
        if "malformed JSON" not in str(exc):
            raise
    multi = OUT_FIRST / "synthetic-multiple.json"
    multi.write_text(json.dumps([cases[0][1], cases[1][1]]) + "\n", encoding="utf-8")
    try:
        parse_one(multi)
        raise Failure("multiple submission self-test did not fail")
    except Failure as exc:
        if "exactly one" not in str(exc):
            raise
    historical_after = {str(path): file_sha(path) for path in historical_paths}
    if historical_after != historical_before or first != repro or first_validation != repro_validation:
        raise Failure("self-test historical immutability or determinism failure")
    canonical_first, canonical_repro = object_sha(first), object_sha(repro)
    validation_first, validation_repro = object_sha(first_validation), object_sha(repro_validation)
    if canonical_first != canonical_repro or validation_first != validation_repro:
        raise Failure("self-test hash mismatch")
    repo_safety()
    output = {"self_test": "passed", "checks": 24, "case_count": 5,
              "canonical_first_sha256": canonical_first, "canonical_repro_sha256": canonical_repro,
              "validation_first_sha256": validation_first, "validation_repro_sha256": validation_repro}
    print(json.dumps(output, sort_keys=True))


def main():
    parser = argparse.ArgumentParser(description="Preview one local human-authored AESPA decision input.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--submission-file", type=Path)
    group.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        if args.self_test:
            self_test()
        else:
            result, evidence = run_submission(args.submission_file)
            print(json.dumps({"intake_status": result["intake_status"],
                              "intake_eligibility": result["intake_eligibility"],
                              "input_file_sha256": evidence["input_file_sha256"],
                              "canonical_intake_sha256": evidence["canonical_intake_sha256"],
                              "deterministic_validation_sha256": evidence["deterministic_validation_sha256"]}, sort_keys=True))
            if evidence["invalid_submission_count"]:
                raise SystemExit(1)
    except (Failure, OSError, KeyError, ValueError, AssertionError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
