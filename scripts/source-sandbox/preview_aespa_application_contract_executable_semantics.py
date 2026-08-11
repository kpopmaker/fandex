"""Validate and preview proposal-only executable application semantics without simulation."""

import argparse
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = Path(__file__).resolve().parent
CONTRACT_PATH = SCRIPTS / "aespa_application_contract_executable_semantics_proposal.preview.json"
OUT_FIRST = ROOT / "tmp/source-sandbox/naver/aespa-application-contract-executable-semantics"
OUT_REPRO = ROOT / "tmp/source-sandbox/naver/aespa-application-contract-executable-semantics-repro"
SEMANTICS_NAME = "executable-semantics.json"
TRANSITIONS_NAME = "transition-table.json"
HASHES_NAME = "hash-test-vectors.json"
SCHEMA_NAME = "schema-test-vector.json"
VALIDATION_NAME = "validation.json"
SUMMARY_NAME = "safe-summary.json"
EXPECTED_BRANCH = "v66-real-source-sandbox-aespa-application-contract-executable-semantics-proposal"
EXPECTED_BASE = "526cdaf91b8e8aca979114c755b932642dbe4da0"
ALLOWLIST = {
    "scripts/source-sandbox/aespa_application_contract_executable_semantics_proposal.preview.json",
    "scripts/source-sandbox/preview_aespa_application_contract_executable_semantics.py",
    "docs/real-source-sandbox-aespa-application-contract-executable-semantics-proposal.md",
}


class Failure(RuntimeError):
    pass


def load(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def object_sha(value):
    return hashlib.sha256(canonical_bytes(value)).hexdigest()


def file_sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def canonical_array(components):
    if any(isinstance(value, (list, dict, float)) or not isinstance(value, (str, int, bool, type(None))) for value in components):
        raise Failure("unsupported canonical hash component type")
    return json.dumps(components, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def hash_components(components):
    return hashlib.sha256(canonical_array(components).encode("utf-8")).hexdigest()


def import_module(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise Failure(f"cannot import module: {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def git(*args):
    result = subprocess.run(["git", "-c", "safe.directory=C:/Users/김종민/Desktop/fandex-v54", *args], cwd=ROOT,
                            capture_output=True, text=True, encoding="utf-8", errors="replace", check=True)
    return result.stdout.strip()


def validate_contract(contract):
    expected = {
        "version": "v66", "mode": "local_sandbox_preview_only", "artist": "aespa",
        "stage": "application_contract_executable_semantics_proposal",
        "scope": "proposal_only_executable_semantics_for_future_local_simulation",
        "proposal_status": "proposal_only", "historical_authority": False, "production_authority": False,
        "semantic_authority_for_future_local_simulation": "proposed_v66_only",
        "local_sandbox_preview_only": True, "contract_definition_only": True,
        "application_execution": False, "application_simulation": False, "actual_human_review": False,
        "actual_human_submission": False, "actual_approval": False, "actual_rejection": False,
        "source_mutation": False, "review_queue_mutation": False, "decision_state_mutation": False,
        "audit_write": False, "production_mutation": False, "production_authorization": False,
        "external_write": False, "future_local_simulation_executable_spec_readiness": "ready",
        "production_application_readiness": "not_ready",
    }
    bad = [key for key, value in expected.items() if contract.get(key) != value]
    if bad:
        raise Failure("invalid v66 contract: " + ", ".join(bad))
    modules = contract.get("evidence_modules", [])
    if len(modules) != 10 or len({item.get("role") for item in modules}) != 10:
        raise Failure("evidence manifest invalid")
    for item in modules:
        path = ROOT / item.get("path", "")
        if not path.is_file() or file_sha(path) != item.get("sha256"):
            raise Failure("provenance mismatch: " + str(item.get("role")))
    v65 = load(ROOT / next(item["path"] for item in modules if item["role"] == "v65_contract"))
    if v65.get("proposal_status") != "proposal_only" or v65.get("historical_authority") is not False or v65.get("production_authority") is not False:
        raise Failure("v65 authority boundary changed")
    return v65


def historical_context(contract):
    module = next(item for item in contract["evidence_modules"] if item["role"] == "v61")
    v61 = import_module(ROOT / module["path"], "v66_v61")
    values = v61.context()
    input_contract, records, paths, before = values[3], values[5], values[6], values[7]
    vocabulary = input_contract["decision_intents"]
    if len(records) != 1000 or any(item.get("queue_status") != "pending_review" or item.get("current_decision_status") != "not_decided" for item in records):
        raise Failure("historical state mismatch")
    return vocabulary, paths, before


def validate_semantics(contract, vocabulary):
    expected = ["not_decided", "approve_candidate", "accept_exception", "reject", "defer", "request_enrichment"]
    if vocabulary != expected:
        raise Failure("historical vocabulary changed")
    mappings = contract["exact_intent_mapping"]
    queues = contract["exact_queue_mapping"]
    transitions = contract["transition_table"]
    if list(mappings) != expected or list(queues) != expected or [row["decision_intent"] for row in transitions] != expected:
        raise Failure("mapping/transition coverage mismatch")
    if len({row["decision_intent"] for row in transitions}) != len(expected):
        raise Failure("duplicate transition intent")
    for row in transitions:
        intent = row["decision_intent"]
        if row["decision_outcome_after"] != mappings[intent]["decision_outcome"] or row["queue_status_after"] != queues[intent]["queue_status_after"]:
            raise Failure("transition mapping mismatch")
        if intent != "not_decided" and row["provenance"] != "proposed_v66":
            raise Failure("proposal provenance mismatch")
    no_action = contract["no_action_semantics"]
    if any((no_action["application_record_exists"], no_action["audit_event_exists"], no_action["applied_at_required"], no_action["idempotency_identity_exists"])):
        raise Failure("not_decided accidentally actionable")
    context = contract["execution_context_schema"]["fields"]["applied_at"]
    if context["fallback"] != "none" or context["invalid_behavior"] != "fail_closed" or context["required_when"] != "decision_intent_is_not_not_decided":
        raise Failure("applied_at rule incomplete")
    algorithm = contract["canonical_hash_algorithm"]
    if algorithm["name"] != "sha256_canonical_json_array_v1" or algorithm["serialization"] != {"ensure_ascii": False, "sort_keys": True, "separators": [",", ":"], "encoding": "UTF-8", "trailing_newline": False}:
        raise Failure("canonical algorithm mismatch")
    for vector in contract["hash_test_vectors"]:
        if canonical_array(vector["components"]) != vector["canonical_serialized"] or hash_components(vector["components"]) != vector["expected_sha256"]:
            raise Failure("hash vector mismatch: " + vector["case"])
    if contract["idempotency_component_order"] != ["proposal_contract_version", "decision_input_id", "decision_preview_id", "queue_id", "gate_id", "internal_source_id", "decision_intent", "input_hash", "historical_state_hash"]:
        raise Failure("idempotency order mismatch")
    if contract["state_fingerprint"]["algorithm"] != algorithm["name"] or len(contract["state_fingerprint"]["field_order"]) != 10:
        raise Failure("state fingerprint incomplete")
    for fields in (contract["application_record_fields"], contract["audit_event_fields"]):
        if len({item["name"] for item in fields}) != len(fields) or any(not item.get("source") or not item.get("type") or not item.get("required") or not item.get("provenance") for item in fields):
            raise Failure("record field source incomplete")
    if len(contract["v65_refinements"]) != 5 or {item["gap"] for item in contract["v65_refinements"]} != set(contract["readiness_rule"]["required_resolved_gaps"]):
        raise Failure("five-gap refinement incomplete")


def schema_fixture():
    return {
        "schema_version": "copied_state_v1",
        "identity": {"decision_input_id": "synthetic-decision-input", "decision_preview_id": "synthetic-decision-preview", "queue_id": "synthetic-queue", "gate_id": "synthetic-gate", "internal_source_id": "synthetic-source", "sandbox_artist_key": "sandbox:artist:aespa", "source_type": "news"},
        "decision": {"intent": "not_decided", "outcome": None},
        "review_queue": {"status": "pending_review", "active": True, "resolved": False, "additional_review_required": True, "enrichment_required": False},
        "source": {"eligibility": "unchanged"}, "application": None,
        "fixture_labels": {"controlled_fixture_only": True, "not_real_aespa_state": True, "not_application_simulation": True},
    }


def resolve_pointer(value, pointer):
    current = value
    for token in pointer.split("/")[1:]:
        current = current[token.replace("~1", "/").replace("~0", "~")]
    return current


def validate_schema(contract, fixture):
    schema = contract["copied_state_schema"]
    if fixture["schema_version"] != schema["schema_version"] or list(fixture["identity"]) != schema["identity_fields"]:
        raise Failure("schema fixture identity mismatch")
    for pointer in schema["immutable_identity_paths"]:
        resolve_pointer(fixture, pointer)
    for name, pointer in schema["paths"].items():
        if name in ("application_status", "application_id", "applied_at", "contract_version"):
            if fixture["application"] is not None:
                resolve_pointer(fixture, pointer)
        else:
            resolve_pointer(fixture, pointer)


def validation(contract, semantics, transitions, vectors, fixture, before, unchanged):
    result = {
        "version": "v66", "status": "valid_local_application_contract_executable_semantics_proposal",
        "proposal_status": "proposal_only", "historical_authority": False, "production_authority": False,
        "supported_intent_count": len(transitions), "complete_transition_count": len(transitions),
        "resolved_executable_gap_count": len(contract["v65_refinements"]), "critical_unresolved_semantic_count": 0,
        "hash_test_vector_count": len(vectors), "hash_test_vector_pass_count": len(vectors),
        "future_local_simulation_executable_spec_readiness": "ready", "production_application_readiness": "not_ready",
        "real_template_count": 1000, "real_pending_review_count": 1000, "real_not_decided_count": 1000,
        "real_actual_submission_count": 0, "real_actual_approval_count": 0, "real_actual_rejection_count": 0,
        "real_actual_decided_count": 0, "real_application_count": 0, "real_audit_record_count": 0,
        "application_execution_count": 0, "application_simulation_count": 0, "copied_state_mutation_count": 0,
        "source_mutation_count": 0, "review_queue_mutation_count": 0, "decision_state_mutation_count": 0,
        "audit_write_count": 0, "production_mutation_count": 0, "production_effect_count": 0, "external_write_count": 0,
        "historical_input_hashes_preserved": unchanged, "historical_input_sha256": dict(sorted(before.items())),
        "canonical_executable_semantics_sha256": object_sha(semantics), "transition_table_sha256": object_sha(transitions),
        "hash_test_vectors_sha256": object_sha(vectors), "schema_test_vector_sha256": object_sha(fixture),
    }
    result["deterministic_validation_sha256"] = object_sha(result)
    return result


def build_semantics(contract):
    excluded = {"evidence_modules", "hash_test_vectors", "transition_table"}
    return {key: value for key, value in contract.items() if key not in excluded}


def write_outputs(directory, semantics, transitions, vectors, fixture, result):
    directory.mkdir(parents=True, exist_ok=True)
    for name, value in ((SEMANTICS_NAME, semantics), (TRANSITIONS_NAME, transitions), (HASHES_NAME, vectors), (SCHEMA_NAME, fixture), (VALIDATION_NAME, result)):
        (directory / name).write_bytes(canonical_bytes(value))
    keys = ("status", "proposal_status", "future_local_simulation_executable_spec_readiness", "production_application_readiness", "supported_intent_count", "resolved_executable_gap_count", "critical_unresolved_semantic_count", "application_execution_count", "application_simulation_count", "production_effect_count", "external_write_count", "canonical_executable_semantics_sha256", "transition_table_sha256", "hash_test_vectors_sha256", "schema_test_vector_sha256", "deterministic_validation_sha256")
    (directory / SUMMARY_NAME).write_text(json.dumps({key: result[key] for key in keys}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def repo_safety():
    names = (SEMANTICS_NAME, TRANSITIONS_NAME, HASHES_NAME, SCHEMA_NAME, VALIDATION_NAME, SUMMARY_NAME)
    files = [str((directory / name).relative_to(ROOT)).replace("\\", "/") for directory in (OUT_FIRST, OUT_REPRO) for name in names]
    ignored = subprocess.run(["git", "-c", "safe.directory=C:/Users/김종민/Desktop/fandex-v54", "check-ignore", *files], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)
    if ignored.returncode != 0:
        raise Failure("tmp outputs are not ignored")
    changed = {line[3:].replace("\\", "/") for line in git("status", "--porcelain", "--untracked-files=all").splitlines() if len(line) > 3}
    if not changed.issubset(ALLOWLIST):
        raise Failure("tracked-file allowlist violation: " + ", ".join(sorted(changed - ALLOWLIST)))


def run(directory):
    contract = load(CONTRACT_PATH)
    validate_contract(contract)
    vocabulary, paths, before = historical_context(contract)
    validate_semantics(contract, vocabulary)
    fixture = schema_fixture()
    validate_schema(contract, fixture)
    semantics, transitions, vectors = build_semantics(contract), contract["transition_table"], contract["hash_test_vectors"]
    unchanged = {str(path): file_sha(path) for path in paths} == before
    if not unchanged:
        raise Failure("historical artifact changed")
    result = validation(contract, semantics, transitions, vectors, fixture, before, unchanged)
    write_outputs(directory, semantics, transitions, vectors, fixture, result)
    repo_safety()
    return semantics, transitions, vectors, fixture, result


def self_test():
    if git("branch", "--show-current") != EXPECTED_BRANCH or git("rev-parse", "HEAD") != EXPECTED_BASE or git("merge-base", "HEAD", "origin/main") != EXPECTED_BASE or git("rev-parse", "origin/main") != EXPECTED_BASE:
        raise Failure("branch/base mismatch")
    first, repro = run(OUT_FIRST), run(OUT_REPRO)
    if first != repro:
        raise Failure("first/reproduction mismatch")
    semantics, transitions, vectors, fixture, result = first
    assertions = [
        semantics["proposal_status"] == "proposal_only", semantics["historical_authority"] is False,
        len(transitions) == 6, transitions[0]["application_status_after"] == "no_action",
        all(row["application_status_after"] == "applied" for row in transitions[1:]),
        semantics["execution_context_schema"]["fields"]["applied_at"]["fallback"] == "none",
        any(vector["case"] == "unicode_korean" for vector in vectors),
        len(semantics["idempotency_component_order"]) == 9, len(semantics["state_fingerprint"]["field_order"]) == 10,
        len(semantics["copied_state_schema"]["immutable_identity_paths"]) == 7,
        len(semantics["copied_state_schema"]["proposal_mutable_paths"]) == 10,
        fixture["fixture_labels"] == {"controlled_fixture_only": True, "not_real_aespa_state": True, "not_application_simulation": True},
        len(semantics["application_record_fields"]) == 20, len(semantics["audit_event_fields"]) == 14,
        semantics["atomicity_invariant"]["partial_success_allowed"] is False,
        all(semantics["downstream_isolation_invariant"][key] is False for key in ("score_mutation", "ranking_mutation", "chart_mutation", "public_data_mutation", "production_mutation")),
        result["resolved_executable_gap_count"] == 5 and result["critical_unresolved_semantic_count"] == 0,
        result["future_local_simulation_executable_spec_readiness"] == "ready",
        result["production_application_readiness"] == "not_ready",
        result["real_template_count"] == result["real_pending_review_count"] == result["real_not_decided_count"] == 1000,
        all(result[key] == 0 for key in ("application_execution_count", "application_simulation_count", "copied_state_mutation_count", "source_mutation_count", "review_queue_mutation_count", "decision_state_mutation_count", "audit_write_count", "production_mutation_count", "production_effect_count", "external_write_count")),
    ]
    if not all(assertions):
        raise Failure("self-test assertion failed")
    hashes, repro_hashes = [object_sha(item) for item in first], [object_sha(item) for item in repro]
    if hashes != repro_hashes:
        raise Failure("determinism mismatch")
    print(json.dumps({"self_test":"passed","checks":39,"semantics_first_sha256":hashes[0],"semantics_repro_sha256":repro_hashes[0],"transition_first_sha256":hashes[1],"transition_repro_sha256":repro_hashes[1],"hash_vectors_first_sha256":hashes[2],"hash_vectors_repro_sha256":repro_hashes[2],"schema_vector_first_sha256":hashes[3],"schema_vector_repro_sha256":repro_hashes[3],"validation_first_sha256":hashes[4],"validation_repro_sha256":repro_hashes[4]}, sort_keys=True))


def main():
    parser = argparse.ArgumentParser(description="Preview proposal-only executable AESPA application semantics.")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        if args.self_test:
            self_test()
        else:
            _semantics, _transitions, _vectors, _fixture, result = run(OUT_FIRST)
            print(json.dumps({"status":result["status"],"future_local_simulation_executable_spec_readiness":"ready","production_application_readiness":"not_ready","resolved_executable_gap_count":5}, sort_keys=True))
    except (Failure, OSError, KeyError, ValueError, AssertionError, subprocess.CalledProcessError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
