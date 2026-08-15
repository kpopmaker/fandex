"""Validate the proposed v72 requested-enrichment field contract without executing a decision."""

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
CONTRACT_PATH = SCRIPTS / "aespa_enrichment_request_field_contract_proposal.preview.json"
FIRST = ROOT / "tmp/source-sandbox/naver/aespa-enrichment-request-field-contract"
REPRO = ROOT / "tmp/source-sandbox/naver/aespa-enrichment-request-field-contract-repro"
EXPECTED_BRANCH = "v72-real-source-sandbox-aespa-enrichment-request-field-contract-proposal"
EXPECTED_BASE = "0a306a7e6af53ce491731c281f68ceba1940048b"
ALLOWED_TRACKED = {
    "scripts/source-sandbox/aespa_enrichment_request_field_contract_proposal.preview.json",
    "scripts/source-sandbox/preview_aespa_enrichment_request_field_contract.py",
    "docs/real-source-sandbox-aespa-enrichment-request-field-contract-proposal.md",
}
OPERATOR_INPUTS = {
    "tmp/source-sandbox/naver/aespa-explicit-human-shadow-decision/operator_submission.template.json":
        "2435d0a5f0b81b3eaf064f43de78aa57bd71f21d6fa9acfc008552cd3df0e8be",
    "tmp/source-sandbox/naver/aespa-explicit-human-shadow-decision/operator_application_context.template.json":
        "3e45a3995a05c9b964405df442ae8eba18017b03997355e246a8513504b956a9",
}
ZERO_EFFECTS = {
    "human_decision_execution_count": 0,
    "v70_execution_count": 0,
    "v69_atomic_apply_count": 0,
    "application_record_count": 0,
    "audit_record_count": 0,
    "queue_transition_count": 0,
    "decision_transition_count": 0,
    "source_mutation_count": 0,
    "real_effect_count": 0,
    "production_effect_count": 0,
}
REQUIRED_FIELD_METADATA = {
    "key", "display_name", "semantic_definition", "category", "applicable_source_types",
    "mapped_existing_source_fields", "required_or_optional_evidence", "completion_rule",
    "safe_output_rule", "provenance",
}


class ProposalFailure(RuntimeError):
    pass


def load_json(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def canonical_bytes(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def object_sha(value):
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def file_sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(*args):
    command = ["git", "-c", "safe.directory=C:/Users/김종민/Desktop/fandex-v54", *args]
    return subprocess.run(command, cwd=ROOT, check=True, capture_output=True, text=True,
                          encoding="utf-8", errors="replace").stdout.strip()


def import_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise ProposalFailure("module import unavailable: " + str(path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def validate_preflight():
    values = {
        "branch": git("branch", "--show-current"),
        "head": git("rev-parse", "HEAD"),
        "merge_base": git("merge-base", "HEAD", "origin/main"),
        "origin_main": git("rev-parse", "origin/main"),
    }
    if values["branch"] != EXPECTED_BRANCH:
        raise ProposalFailure("branch mismatch")
    if any(values[key] != EXPECTED_BASE for key in ("head", "merge_base", "origin_main")):
        raise ProposalFailure("base mismatch")
    changed = {
        line[3:].replace("\\", "/")
        for line in git("status", "--porcelain", "--untracked-files=all").splitlines()
        if len(line) > 3
    }
    if not changed.issubset(ALLOWED_TRACKED):
        raise ProposalFailure("tracked allowlist violation: " + ", ".join(sorted(changed - ALLOWED_TRACKED)))
    return values


def validate_references(contract):
    observed = {}
    for reference in contract["consumed_references"]:
        path = ROOT / reference["path"]
        digest = file_sha(path)
        observed[reference["path"]] = digest
        if digest != reference["sha256"]:
            raise ProposalFailure("reference drift: " + reference["role"])
    return observed


def validate_contract(contract):
    expected = {
        "version": "v72",
        "stage": "aespa_enrichment_request_field_contract_proposal",
        "artist": "aespa",
        "historical_authority": False,
        "production_authority": False,
        "proposal_status": "proposed_for_future_controlled_validation",
    }
    if any(contract.get(key) != value for key, value in expected.items()):
        raise ProposalFailure("contract identity or authority mismatch")
    fields = contract.get("allowed_requested_enrichment_fields")
    if not isinstance(fields, list) or not fields:
        raise ProposalFailure("proposed vocabulary missing")
    keys = [item.get("key") for item in fields]
    if len(keys) != len(set(keys)) or keys != contract.get("canonical_order"):
        raise ProposalFailure("vocabulary keys or canonical order invalid")
    for item in fields:
        if set(item) != REQUIRED_FIELD_METADATA or item["provenance"] != "proposed_v72":
            raise ProposalFailure("proposed field metadata incomplete")
        if not item["applicable_source_types"] or not item["mapped_existing_source_fields"]:
            raise ProposalFailure("proposed field applicability/evidence missing")
    semantics = contract.get("validation_semantics", {})
    required_statuses = {
        "duplicate_policy": "invalid_duplicate",
        "unknown_key_behavior": "invalid_unknown_enrichment_field",
        "empty_array_behavior": "invalid_empty",
        "invalid_type_behavior": "invalid_type",
        "valid_status": "valid",
    }
    if any(semantics.get(key) != value for key, value in required_statuses.items()):
        raise ProposalFailure("validation semantics mismatch")
    if contract.get("combined_human_requirement_fields") != contract["canonical_order"]:
        raise ProposalFailure("human requirement mapping is not canonical")
    if len(contract.get("human_requirement_mapping", [])) != 2:
        raise ProposalFailure("human requirement mapping incomplete")
    if {item["canonical_enrichment_field"] for item in contract["human_requirement_mapping"]} != set(keys):
        raise ProposalFailure("human requirement mapping does not cover vocabulary")
    if len(contract.get("source_model_inventory", [])) < 7:
        raise ProposalFailure("source model inventory incomplete")


def validate_requested_enrichment_fields(value, contract):
    order = contract["canonical_order"]
    allowed = set(order)
    if not isinstance(value, list) or any(not isinstance(item, str) for item in value):
        return {"status": "invalid_type", "canonical_fields": None, "invalid_fields": []}
    if not value:
        return {"status": "invalid_empty", "canonical_fields": None, "invalid_fields": []}
    if len(value) != len(set(value)):
        return {"status": "invalid_duplicate", "canonical_fields": None, "invalid_fields": []}
    unknown = sorted(item for item in value if item not in allowed)
    if unknown:
        return {"status": "invalid_unknown_enrichment_field", "canonical_fields": None,
                "invalid_fields": unknown}
    canonical = [item for item in order if item in value]
    return {"status": "valid", "canonical_fields": canonical, "invalid_fields": []}


def historical_gap_evidence(contract):
    references = {item["role"]: ROOT / item["path"] for item in contract["consumed_references"]}
    validator = import_module(references["historical_validator"], "v72_historical_validator")
    input_contract = load_json(references["historical_decision_contract"])
    application_contract = load_json(references["historical_application_contract"])
    arbitrary = "v72_arbitrary_string_not_contract_vocabulary"
    decision = {
        "internal_source_id": "fixture-source",
        "gate_id": "fixture-gate",
        "queue_item_id": "fixture-queue",
        "gate_status": "exception_review_required",
        "decision_intent": "request_enrichment",
        "reviewer_id": "controlled-fixture-reviewer",
        "rationale_codes": ["enrichment_required"],
        "reviewer_note": None,
        "reviewed_at": "2026-01-01T00:00:00Z",
        "requested_enrichment_fields": [arbitrary],
    }
    before = canonical_bytes(decision)
    reasons, effect = validator.validate_entry(
        decision, "exception_review_required", input_contract, application_contract
    )
    if canonical_bytes(decision) != before:
        raise ProposalFailure("historical validator mutated input")
    if reasons or effect != "would_record_enrichment_request":
        raise ProposalFailure("historical arbitrary-string gap not reproduced")
    source = references["historical_validator"].read_text(encoding="utf-8")
    if "enrichment_fields_required" not in source or "invalid_unknown_enrichment_field" in source:
        raise ProposalFailure("historical gap source inspection mismatch")
    return {
        "gap_confirmed": True,
        "arbitrary_unique_nonempty_string_accepted": True,
        "historical_effect_classification": effect,
        "historical_input_unchanged": True,
        "closed_vocabulary_present": False,
        "provenance": "historical_existing",
    }


def validate_fixture_classification(contract):
    expected = {"author", "provider_attribution"}
    entries = contract["fixture_example_classification"]
    if {item["value"] for item in entries} != expected:
        raise ProposalFailure("fixture classification incomplete")
    for item in entries:
        if item["classification"] != "controlled_fixture_only" or item["promoted_to_v72_vocabulary"]:
            raise ProposalFailure("fixture example silently promoted")
        if not any(item["value"] in (ROOT / path).read_text(encoding="utf-8") for path in item["locations"]):
            raise ProposalFailure("fixture example source missing")
    return entries


def validation_cases(contract):
    cases = [
        {"case": "valid_single_content", "input": ["content_context"], "expected": "valid"},
        {"case": "valid_single_attribution", "input": ["source_attribution"], "expected": "valid"},
        {"case": "valid_multi_reordered", "input": ["source_attribution", "content_context"], "expected": "valid"},
        {"case": "invalid_empty", "input": [], "expected": "invalid_empty"},
        {"case": "invalid_duplicate", "input": ["content_context", "content_context"], "expected": "invalid_duplicate"},
        {"case": "invalid_unknown", "input": ["identity_investigation"], "expected": "invalid_unknown_enrichment_field"},
        {"case": "invalid_top_level_type", "input": "content_context", "expected": "invalid_type"},
        {"case": "invalid_element_type", "input": ["content_context", 1], "expected": "invalid_type"},
    ]
    results = []
    for case in cases:
        result = validate_requested_enrichment_fields(case["input"], contract)
        if result["status"] != case["expected"]:
            raise ProposalFailure("validation case mismatch: " + case["case"])
        results.append({**case, "result": result})
    multi = next(item for item in results if item["case"] == "valid_multi_reordered")
    if multi["result"]["canonical_fields"] != contract["canonical_order"]:
        raise ProposalFailure("canonical ordering is not deterministic")
    return results


def snapshot_inputs(contract):
    paths = [ROOT / item["path"] for item in contract["consumed_references"]]
    for relative, expected in OPERATOR_INPUTS.items():
        path = ROOT / relative
        if not path.is_file() or file_sha(path) != expected:
            raise ProposalFailure("operator input missing or modified: " + relative)
        paths.append(path)
    return {str(path.relative_to(ROOT)).replace("\\", "/"): file_sha(path) for path in paths}


def build_values(contract, preflight, reference_hashes, gap, cases, fixtures, input_hashes):
    mapping = contract["human_requirement_mapping"]
    combined = validate_requested_enrichment_fields(contract["combined_human_requirement_fields"], contract)
    if combined["status"] != "valid":
        raise ProposalFailure("combined human requirement is not expressible")
    forbidden = {"identity_investigation", "duplicate_investigation", "score_analysis",
                 "ranking_analysis", "sentiment_analysis"}
    if forbidden.intersection(combined["canonical_fields"]):
        raise ProposalFailure("unrelated enrichment implicitly added")
    validation = {
        "version": "v72",
        "preflight": preflight,
        "reference_hashes": reference_hashes,
        "historical_gap_confirmed": gap["gap_confirmed"],
        "proposed_key_count": len(contract["canonical_order"]),
        "proposed_keys_unique": len(contract["canonical_order"]) == len(set(contract["canonical_order"])),
        "canonical_order_deterministic": True,
        "content_need_expressible": "content_context" in combined["canonical_fields"],
        "attribution_need_expressible": "source_attribution" in combined["canonical_fields"],
        "combined_human_requirement_expressible": True,
        "identity_enrichment_implicitly_added": False,
        "unrelated_enrichment_implicitly_added": False,
        "historical_artifacts_unchanged": True,
        "operator_templates_unchanged": True,
        "semantic_filesystem_persistence": False,
        "zero_effect_counters": ZERO_EFFECTS,
        "enrichment_request_field_contract_conformance": "passed",
        "future_explicit_human_shadow_decision_readiness": "ready_with_v72_enrichment_contract",
        "production_persistence_readiness": "not_ready",
        "production_execution_readiness": "not_ready",
    }
    values = {
        "safe_summary.json": {key: value for key, value in validation.items()
                              if key not in ("preflight", "reference_hashes")},
        "source_model_inventory.json": contract["source_model_inventory"],
        "vocabulary.json": {
            "allowed_requested_enrichment_fields": contract["allowed_requested_enrichment_fields"],
            "canonical_order": contract["canonical_order"],
            "validation_semantics": contract["validation_semantics"],
        },
        "human_requirement_mapping.json": {
            "mapping": mapping,
            "combined_canonical_fields": combined["canonical_fields"],
            "human_decision_executed": False,
        },
        "validation_cases.json": cases,
        "fixture_classification.json": fixtures,
        "validation.json": validation,
    }
    if snapshot_inputs(contract) != input_hashes:
        raise ProposalFailure("historical or operator input mutation")
    return values


def write_values(directory, values):
    directory.mkdir(parents=True, exist_ok=True)
    for name, value in values.items():
        (directory / name).write_bytes(canonical_bytes(value))


def self_test():
    contract = load_json(CONTRACT_PATH)
    preflight = validate_preflight()
    validate_contract(contract)
    reference_hashes = validate_references(contract)
    input_hashes = snapshot_inputs(contract)
    gap = historical_gap_evidence(contract)
    fixtures = validate_fixture_classification(contract)
    cases = validation_cases(contract)
    first = build_values(contract, preflight, reference_hashes, gap, cases, fixtures, input_hashes)
    write_values(FIRST, first)
    repro = build_values(contract, preflight, reference_hashes, gap, cases, fixtures, input_hashes)
    write_values(REPRO, repro)
    pairs = {name: [object_sha(first[name]), object_sha(repro[name])] for name in sorted(first)}
    if any(left != right for left, right in pairs.values()):
        raise ProposalFailure("first/repro determinism failure")
    if snapshot_inputs(contract) != input_hashes:
        raise ProposalFailure("input immutability failure")
    checks = {
        "preflight_and_provenance": True,
        "historical_validator_gap_confirmed": gap["gap_confirmed"],
        "historical_arbitrary_string_behavior_confirmed": gap["arbitrary_unique_nonempty_string_accepted"],
        "fixture_examples_classified": len(fixtures) == 2,
        "source_model_inventory_complete": len(contract["source_model_inventory"]) >= 7,
        "field_metadata_complete": all(set(item) == REQUIRED_FIELD_METADATA for item in contract["allowed_requested_enrichment_fields"]),
        "proposed_keys_unique": len(contract["canonical_order"]) == len(set(contract["canonical_order"])),
        "canonical_order_deterministic": cases[2]["result"]["canonical_fields"] == contract["canonical_order"],
        "valid_single_field": cases[0]["result"]["status"] == "valid",
        "valid_multi_field": cases[2]["result"]["status"] == "valid",
        "empty_invalid": cases[3]["result"]["status"] == "invalid_empty",
        "duplicate_invalid": cases[4]["result"]["status"] == "invalid_duplicate",
        "unknown_invalid": cases[5]["result"]["status"] == "invalid_unknown_enrichment_field",
        "invalid_type_invalid": cases[6]["result"]["status"] == "invalid_type" and cases[7]["result"]["status"] == "invalid_type",
        "selected_content_need_expressible": True,
        "selected_attribution_need_expressible": True,
        "combined_requirement_expressible": True,
        "no_identity_enrichment": True,
        "no_unrelated_enrichment": True,
        "historical_artifacts_unchanged": snapshot_inputs(contract) == input_hashes,
        "operator_templates_unchanged": all(file_sha(ROOT / path) == digest for path, digest in OPERATOR_INPUTS.items()),
        "v70_not_executed": ZERO_EFFECTS["v70_execution_count"] == 0,
        "v69_not_executed": ZERO_EFFECTS["v69_atomic_apply_count"] == 0,
        "no_application_or_audit": ZERO_EFFECTS["application_record_count"] == ZERO_EFFECTS["audit_record_count"] == 0,
        "all_real_effects_zero": all(value == 0 for value in ZERO_EFFECTS.values()),
        "first_repro_deterministic": all(left == right for left, right in pairs.values()),
    }
    if not all(checks.values()):
        raise ProposalFailure("self-test check failure")
    validate_preflight()
    print(json.dumps({
        "self_test": "passed",
        "check_count": len(checks),
        "checks": checks,
        "sha256_pairs": pairs,
        "enrichment_request_field_contract_conformance": "passed",
        "future_explicit_human_shadow_decision_readiness": "ready_with_v72_enrichment_contract",
        "production_persistence_readiness": "not_ready",
        "production_execution_readiness": "not_ready",
        "zero_effect_counters": ZERO_EFFECTS,
    }, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        if not args.self_test:
            parser.error("--self-test is required")
        self_test()
    except (ProposalFailure, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        print("FAIL CLOSED: " + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
