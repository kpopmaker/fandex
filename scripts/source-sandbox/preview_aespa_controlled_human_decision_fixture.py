"""Validate two synthetic AESPA decision fixtures without applying decisions."""

import argparse
import copy
import hashlib
import importlib.util
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path

sys.dont_write_bytecode = True


ROOT = Path(__file__).resolve().parents[2]
SCRIPT_DIR = Path(__file__).resolve().parent
CONTRACT = SCRIPT_DIR / "aespa_controlled_human_decision_fixture_preview_contract.preview.json"
INPUT_CONTRACT = SCRIPT_DIR / "human_review_decision_contract.preview.json"
APPLICATION_CONTRACT = SCRIPT_DIR / "human_review_decision_application_contract.preview.json"
V59_FIRST = ROOT / "tmp/source-sandbox/naver/aespa-human-decision-submission"
V59_REPRO = ROOT / "tmp/source-sandbox/naver/aespa-human-decision-submission-repro"
OUT_FIRST = ROOT / "tmp/source-sandbox/naver/aespa-controlled-human-decision-fixture"
OUT_REPRO = ROOT / "tmp/source-sandbox/naver/aespa-controlled-human-decision-fixture-repro"
V59_CANONICAL = "human-decision-submission-preview.canonical.json"
V59_VALIDATION = "human-decision-submission-validation.json"
OUTPUT_CANONICAL = "controlled-human-decision-fixture-preview.canonical.json"
OUTPUT_VALIDATION = "controlled-human-decision-fixture-validation.json"
FIXED_REVIEWED_AT = "2026-01-01T00:00:00Z"
REVIEWER_ID = "controlled_fixture_reviewer"
ALLOWLIST = {
    "scripts/source-sandbox/aespa_controlled_human_decision_fixture_preview_contract.preview.json",
    "scripts/source-sandbox/preview_aespa_controlled_human_decision_fixture.py",
    "docs/real-source-sandbox-aespa-controlled-human-decision-fixture-preview.md",
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
        "version": "v60", "mode": "local_sandbox_preview_only", "artist": "aespa",
        "stage": "controlled_human_decision_fixture_preview", "scope": "historical_schema_validation_only",
        "local_sandbox_preview_only": True, "controlled_fixture_only": True,
        "actual_human_review": False, "actual_human_submission": False,
        "actual_source_decision": False, "actual_approval": False, "actual_rejection": False,
        "decision_application": False, "production_mutation": False, "pipeline_authorization": False,
        "allowed_controlled_fixture_count": 2,
    }
    bad = [key for key, value in expected.items() if contract.get(key) != value]
    if bad:
        raise Failure("invalid wrapper contract: " + ", ".join(bad))
    for key in ("historical_validator", "historical_template_builder"):
        entry = contract.get(key, {})
        path = ROOT / entry.get("path", "")
        if not path.is_file() or file_sha(path) != entry.get("sha256"):
            raise Failure(f"historical module provenance mismatch: {key}")


def validate_v59(first_records, repro_records, first_meta, repro_meta, first_hash, repro_hash):
    if first_records != repro_records or first_hash != repro_hash:
        raise Failure("v59 first/repro canonical mismatch")
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
        if bad or meta.get("deterministic_submission_preview_sha256") != first_hash:
            raise Failure("v59 historical state mismatch: " + ", ".join(bad or ["canonical hash"]))
    if len(first_records) != 1000:
        raise Failure("v59 record count mismatch")
    for record in first_records:
        template = record.get("submission_template", {})
        if (record.get("queue_status") != "pending_review" or record.get("current_decision_status") != "not_decided"
                or record.get("application_status") != "no_action" or template.get("decision_intent") != "not_decided"
                or template.get("reviewer_id") is not None or template.get("reviewed_at") is not None
                or template.get("reviewer_note") is not None or template.get("rationale_codes") != []):
            raise Failure("v59 contains a real or non-pending decision")


def unique_count(fixtures, field):
    return len({item[field] for item in fixtures})


def build_once(records, contract, queue_builder, validator, original_hash):
    input_contract, application_contract = load(INPUT_CONTRACT), load(APPLICATION_CONTRACT)
    errors = validator.contract_errors(input_contract, application_contract)
    if errors:
        raise Failure("historical decision contracts invalid: " + ", ".join(errors))
    candidates = sorted(records, key=lambda item: (item["queue_id"], item["gate_id"], item["internal_source_id"]))
    approval_source = next((item for item in candidates if item["submission_template"]["gate_status"] == "approval_candidate"), None)
    approval_intent, approval_rationale = "approve_candidate", "metadata_verified"
    if approval_source is None:
        approval_source = next((item for item in candidates if item["submission_template"]["gate_status"] == "exception_review_required"), None)
        approval_intent, approval_rationale = "accept_exception", "provider_attribution_unavailable_verified"
    if approval_source is None:
        raise Failure("no historical record supports an approval-equivalent decision")
    rejection_source = next((item for item in candidates if item["queue_id"] != approval_source["queue_id"]), None)
    if rejection_source is None:
        raise Failure("no distinct historical record supports rejection")
    fixtures = []
    specs = (("controlled_approval_fixture", approval_source, approval_intent, approval_rationale),
             ("controlled_rejection_fixture", rejection_source, "reject", "unreliable_source"))
    for fixture_id, source, intent, rationale in specs:
        queue = [{"queue_item_id": source["queue_id"], "internal_source_id": source["internal_source_id"],
                  "gate_id": source["gate_id"], "gate_status": source["submission_template"]["gate_status"]}]
        template = queue_builder.decision_template(queue)[0]
        template.update({"decision_intent": intent, "reviewer_id": REVIEWER_ID,
                         "rationale_codes": [rationale],
                         "reviewer_note": f"synthetic local-only {fixture_id}; not a real human decision",
                         "reviewed_at": FIXED_REVIEWED_AT})
        reasons, effect = validator.validate_entry(template, template["gate_status"], input_contract, application_contract)
        fixtures.append({
            "fixture_id": fixture_id, "fixture_class": "approval" if "approval" in fixture_id else "rejection",
            "controlled_fixture_only": True, "local_sandbox_preview_only": True,
            "not_a_real_human_decision": True, "not_for_application": True, "not_for_production": True,
            "decision_input_id": source["decision_input_id"], "decision_preview_id": source.get("decision_preview_id"),
            "queue_id": source["queue_id"], "gate_id": source["gate_id"],
            "internal_source_id": source["internal_source_id"], "decision": template,
            "validation_status": "valid" if not reasons else "invalid",
            "validation_reason_codes": reasons, "historical_dry_run_effect": effect,
        })
    fixtures.sort(key=lambda item: item["fixture_id"])
    if object_sha(records) != original_hash:
        raise Failure("original historical input mutated")
    ids = ("decision_input_id", "decision_preview_id", "queue_id", "gate_id", "internal_source_id")
    duplicate_counts = {f"duplicate_{field}_count": len(fixtures) - unique_count(fixtures, field) for field in ids}
    intent_counts = Counter(item["decision"]["decision_intent"] for item in fixtures)
    validation = {
        "version": "v60", "mode": contract["mode"], "artist": "aespa",
        "stage": contract["stage"], "scope": contract["scope"],
        "preview_status": "valid_local_controlled_human_decision_fixture_preview",
        "eligibility": "eligible", "historical_provenance_status": "verified",
        "historical_validator_reused": True, "historical_template_reused": True,
        "historical_validator_path": contract["historical_validator"]["path"],
        "historical_validator_sha256": contract["historical_validator"]["sha256"],
        "historical_template_builder_path": contract["historical_template_builder"]["path"],
        "historical_template_builder_sha256": contract["historical_template_builder"]["sha256"],
        "historical_helpers_reused": ["decision_template", "contract_errors", "validate_entry", "canonical_bytes"],
        "supported_decision_vocabulary": input_contract["decision_intents"],
        "approval_equivalent_value_used": approval_intent, "rejection_equivalent_value_used": "reject",
        "required_fields": input_contract["required_fields"],
        "conditional_fields": ["reviewer_id", "rationale_codes"],
        "optional_metadata_fields": input_contract["optional_fields"],
        "linkage_fields": list(ids),
        "real_template_count": 1000, "real_pending_review_count": 1000, "real_not_decided_count": 1000,
        "real_actual_submission_count": 0, "real_actual_approval_count": 0,
        "real_actual_rejection_count": 0, "real_actual_decided_count": 0,
        "fixture_count": len(fixtures), "approval_fixture_count": 1, "rejection_fixture_count": 1,
        "validated_fixture_count": sum(item["validation_status"] == "valid" for item in fixtures),
        "invalid_fixture_count": sum(item["validation_status"] != "valid" for item in fixtures),
        "reviewer_id_present_count": sum(bool(item["decision"]["reviewer_id"]) for item in fixtures),
        "reviewed_at_present_count": sum(bool(item["decision"]["reviewed_at"]) for item in fixtures),
        "rationale_present_count": sum(bool(item["decision"]["rationale_codes"]) for item in fixtures),
        "note_present_count": sum(bool(item["decision"]["reviewer_note"]) for item in fixtures),
        **{f"unique_{field}_count": unique_count(fixtures, field) for field in ids}, **duplicate_counts,
        "source_mutation_count": 0, "decision_application_count": 0, "production_mutation_count": 0,
        "production_effect_count": 0, "external_write_count": 0,
        "actual_human_review_count": 0, "actual_human_submission_count": 0,
        "actual_source_decision_count": 0, "actual_approval_count": 0, "actual_rejection_count": 0,
        "human_review_execution_count": 0, "human_submission_execution_count": 0,
        "source_decision_execution_count": 0, "decision_application_execution_count": 0,
        "pipeline_authorization_count": 0, "original_input_sha256": original_hash,
        "original_input_hash_preserved": object_sha(records) == original_hash,
        "decision_intent_counts": dict(sorted(intent_counts.items())),
        "canonical_fixture_sha256": object_sha(fixtures),
    }
    failures = []
    if len(fixtures) != 2 or validation["validated_fixture_count"] != 2 or validation["invalid_fixture_count"]:
        failures.append("fixture validation")
    if any(duplicate_counts.values()):
        failures.append("linkage uniqueness")
    if failures:
        raise Failure("controlled fixture checks failed: " + ", ".join(failures))
    validation["deterministic_validation_sha256"] = object_sha(validation)
    return fixtures, validation


def write_outputs(directory, fixtures, validation):
    directory.mkdir(parents=True, exist_ok=True)
    (directory / OUTPUT_CANONICAL).write_bytes(canonical_bytes(fixtures))
    (directory / OUTPUT_VALIDATION).write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def verify_repo_safety():
    git = ["git", "-c", "safe.directory=C:/Users/김종민/Desktop/fandex-v54"]
    ignored = subprocess.run([*git, "check-ignore",
                              "tmp/source-sandbox/naver/aespa-controlled-human-decision-fixture/controlled-human-decision-fixture-preview.canonical.json",
                              "tmp/source-sandbox/naver/aespa-controlled-human-decision-fixture-repro/controlled-human-decision-fixture-preview.canonical.json"], cwd=ROOT,
                             capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)
    if ignored.returncode != 0:
        raise Failure("tmp output directories are not ignored")
    status = subprocess.run([*git, "status", "--porcelain", "--untracked-files=all"], cwd=ROOT,
                            capture_output=True, text=True, encoding="utf-8", errors="replace", check=True).stdout.splitlines()
    changed = {line[3:].replace("\\", "/") for line in status if len(line) > 3}
    if not changed.issubset(ALLOWLIST):
        raise Failure("tracked-file allowlist violation: " + ", ".join(sorted(changed - ALLOWLIST)))


def execute(write=True):
    contract = load(CONTRACT)
    validate_contract(contract)
    validator_path = ROOT / contract["historical_validator"]["path"]
    builder_path = ROOT / contract["historical_template_builder"]["path"]
    validator = import_module(validator_path, "v60_historical_validator")
    builder = import_module(builder_path, "v60_historical_template_builder")
    first_path, repro_path = V59_FIRST / V59_CANONICAL, V59_REPRO / V59_CANONICAL
    first_validation, repro_validation = V59_FIRST / V59_VALIDATION, V59_REPRO / V59_VALIDATION
    for path in (first_path, repro_path, first_validation, repro_validation):
        if not path.is_file():
            raise Failure(f"required v59 evidence missing: {path}")
    records, repro_records = load(first_path), load(repro_path)
    original_hash = object_sha(records)
    validate_v59(records, repro_records, load(first_validation), load(repro_validation), file_sha(first_path), file_sha(repro_path))
    first, first_meta = build_once(records, contract, builder, validator, original_hash)
    repro, repro_meta = build_once(copy.deepcopy(repro_records), contract, builder, validator, object_sha(repro_records))
    canonical_first_sha, canonical_repro_sha = object_sha(first), object_sha(repro)
    validation_first_sha, validation_repro_sha = object_sha(first_meta), object_sha(repro_meta)
    if first != repro or first_meta != repro_meta or canonical_first_sha != canonical_repro_sha or validation_first_sha != validation_repro_sha:
        raise Failure("first/repro determinism mismatch")
    if write:
        write_outputs(OUT_FIRST, first, first_meta)
        write_outputs(OUT_REPRO, repro, repro_meta)
        verify_repo_safety()
    return {"preview_status": first_meta["preview_status"], "eligibility": first_meta["eligibility"],
            "canonical_first_sha256": canonical_first_sha, "canonical_repro_sha256": canonical_repro_sha,
            "validation_first_sha256": validation_first_sha, "validation_repro_sha256": validation_repro_sha,
            "fixture_count": 2, "validated_fixture_count": 2}


def self_test():
    result = execute(write=False)
    assert result["canonical_first_sha256"] == result["canonical_repro_sha256"]
    assert result["validation_first_sha256"] == result["validation_repro_sha256"]
    verify_repo_safety()
    print(json.dumps({"self_test": "passed", "checks": 18, **result}, ensure_ascii=False, sort_keys=True))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        result = self_test() if args.self_test else print(json.dumps(execute(), ensure_ascii=False, sort_keys=True))
        return result
    except (Failure, OSError, KeyError, ValueError, AssertionError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
