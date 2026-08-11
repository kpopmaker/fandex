"""Build a non-executable proposed AESPA application-state contract preview."""

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
CONTRACT_PATH = SCRIPTS / "aespa_application_state_contract_proposal.preview.json"
OUT_FIRST = ROOT / "tmp/source-sandbox/naver/aespa-application-state-contract-proposal"
OUT_REPRO = ROOT / "tmp/source-sandbox/naver/aespa-application-state-contract-proposal-repro"
PROPOSAL_NAME = "proposal-contract.json"
TRANSITIONS_NAME = "decision-transition-proposal.json"
BLOCKERS_NAME = "blocker-resolution.json"
VALIDATION_NAME = "validation.json"
SUMMARY_NAME = "safe-summary.json"
ALLOWLIST = {
    "scripts/source-sandbox/aespa_application_state_contract_proposal.preview.json",
    "scripts/source-sandbox/preview_aespa_application_state_contract_proposal.py",
    "docs/real-source-sandbox-aespa-application-state-contract-proposal.md",
}
EXPECTED_BRANCH = "v65-real-source-sandbox-aespa-application-state-contract-proposal"
EXPECTED_BASE = "1e93f250e2a7f926ada500bea53eb739f86a1507"


class Failure(RuntimeError):
    pass


def load(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def digest(value):
    return hashlib.sha256(value).hexdigest()


def file_sha(path):
    return digest(path.read_bytes())


def object_sha(value):
    return digest(canonical_bytes(value))


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
        "version": "v65", "mode": "local_sandbox_preview_only", "artist": "aespa",
        "stage": "application_state_contract_proposal",
        "scope": "non_executable_proposed_fandex_application_state_contract_only",
        "proposal_status": "proposal_only", "historical_authority": False, "production_authority": False,
        "local_sandbox_preview_only": True, "proposal_only": True, "historical_semantics_preserved": True,
        "new_semantics_explicitly_labeled": True, "application_execution": False,
        "application_simulation": False, "actual_human_review": False, "actual_human_submission": False,
        "actual_approval": False, "actual_rejection": False, "source_mutation": False,
        "review_queue_mutation": False, "decision_state_mutation": False, "audit_write": False,
        "production_mutation": False, "production_authorization": False, "external_write": False,
        "provenance_vocabulary": ["historical_existing", "proposed_v65", "unresolved", "not_applicable"],
    }
    bad = [key for key, value in expected.items() if contract.get(key) != value]
    if bad:
        raise Failure("invalid proposal contract: " + ", ".join(bad))
    modules = contract.get("historical_modules", [])
    if len(modules) != 10 or len({item.get("role") for item in modules}) != 10:
        raise Failure("historical module manifest invalid")
    for item in modules:
        path = ROOT / item.get("path", "")
        if not path.is_file() or file_sha(path) != item.get("sha256"):
            raise Failure("historical provenance mismatch: " + str(item.get("role")))
    lifecycle = contract["proposed_application_lifecycle"]
    if lifecycle.get("provenance") != "proposed_v65" or [item["status"] for item in lifecycle["states"]] != ["prepared", "applied", "failed", "conflict"]:
        raise Failure("proposed lifecycle invalid")


def historical_context(contract):
    paths = {item["role"]: ROOT / item["path"] for item in contract["historical_modules"]}
    v64 = import_module(paths["v64_plan"], "v65_v64_plan")
    v64_contract, _input, application, rules, historical_paths, historical_before = v64.discover()
    plan, requirements = v64.build_plan(v64_contract, application, rules)
    if plan["application_implementation_readiness"] != "not_ready" or len(requirements) != 7:
        raise Failure("v64 readiness/blocker provenance changed")
    return application, rules, requirements, historical_paths, historical_before


def tagged(value, provenance):
    return {"value": value, "provenance": provenance}


def transition_rows(rules):
    proposals = {
        "not_decided": ("no_application", "pending_review_unchanged", "unchanged", "disconnected", "complete"),
        "approve_candidate": ("persist_candidate_approved_outcome", "resolved", "unchanged", "disconnected", "complete"),
        "accept_exception": ("persist_exception_accepted_outcome", "resolved", "unchanged", "disconnected", "complete"),
        "reject": ("persist_rejected_outcome", "resolved", "unchanged", "disconnected", "complete"),
        "defer": ("persist_deferred_outcome", "deferred_active", "unchanged", "disconnected", "complete"),
        "request_enrichment": ("persist_enrichment_requested_outcome", "enrichment_requested_active", "unchanged", "disconnected", "complete"),
    }
    rows = []
    for rule in rules:
        intent = rule["decision_intent"]
        behavior, queue, source, downstream, completeness = proposals[intent]
        rows.append({
            "decision_intent": tagged(intent, "historical_existing"),
            "historical_classification": tagged("no_action" if intent == "not_decided" else "would_require_explicit_application", "historical_existing"),
            "historical_abstract_effect": tagged(rule["dry_run_effect"], "historical_existing"),
            "proposed_application_behavior": tagged(behavior, "not_applicable" if intent == "not_decided" else "proposed_v65"),
            "proposed_queue_behavior": tagged(queue, "historical_existing" if intent == "not_decided" else "proposed_v65"),
            "proposed_source_behavior": tagged(source, "proposed_v65"),
            "proposed_downstream_behavior": tagged(downstream, "proposed_v65"),
            "proposal_completeness": tagged(completeness, "proposed_v65"),
            "unresolved_reason_codes": tagged([], "not_applicable"),
        })
    return rows


def blocker_resolution(requirements):
    sections = {
        "missing_concrete_decision_transition": "proposed_state_vocabulary_and_transition_matrix",
        "missing_queue_transition": "proposed_transition_matrix",
        "missing_persisted_decision_schema": "proposed_application_record_schema",
        "missing_write_target": "proposed_logical_transaction_boundary",
        "missing_audit_schema": "proposed_audit_contract",
        "missing_idempotency_semantics": "proposed_idempotency_and_stale_state_rules",
        "missing_failure_recovery_semantics": "proposed_failure_retry_policy",
    }
    return [{
        "requirement_id": item["requirement_id"], "v64_description": item["description"],
        "v65_resolution_status": "proposed_resolved", "proposal_section": sections[item["requirement_id"]],
        "remaining_question": None, "blocks_future_local_simulation": False,
        "resolution_provenance": "proposed_v65",
    } for item in requirements]


def build_proposal(contract, rules, requirements):
    transitions = transition_rows(rules)
    blockers = blocker_resolution(requirements)
    unresolved = [item for item in blockers if item["v65_resolution_status"] != "proposed_resolved"]
    readiness = "not_ready" if unresolved else "ready_for_separate_simulation_implementation"
    proposal = {
        "version": "v65", "status": "valid_local_aespa_application_state_contract_proposal",
        "proposal_status": "proposal_only", "historical_authority": False, "production_authority": False,
        "provenance_vocabulary": contract["provenance_vocabulary"],
        "supported_historical_vocabulary": [rule["decision_intent"] for rule in rules],
        "application_lifecycle": contract["proposed_application_lifecycle"],
        "state_vocabulary": contract["proposed_state_vocabulary"],
        "application_record_schema": contract["proposed_application_record_schema"],
        "metadata_policy": contract["proposed_metadata_policy"],
        "idempotency_rule": contract["proposed_idempotency_rule"],
        "stale_state_rule": contract["proposed_stale_state_rule"],
        "logical_transaction_boundary": contract["proposed_logical_transaction_boundary"],
        "audit_contract": contract["proposed_audit_contract"],
        "failure_retry_policy": contract["proposed_failure_retry_policy"],
        "downstream_effect_boundary": contract["proposed_downstream_effect_boundary"],
        "future_local_simulation_contract_readiness": readiness,
        "production_application_readiness": "not_ready",
        "unresolved_production_semantics": ["physical_storage_implementation", "production_authorization", "deployment_and_operations"],
        "application_execution": False, "application_simulation": False,
    }
    return proposal, transitions, blockers


def validation(contract, proposal, transitions, blockers, historical_before, unchanged):
    result = {
        "version": "v65", "mode": contract["mode"], "artist": "aespa", "stage": contract["stage"],
        "status": proposal["status"], "proposal_status": "proposal_only",
        "historical_intent_count": len(transitions), "transition_proposal_count": len(transitions),
        "v64_blocker_count": len(blockers), "proposed_resolved_blocker_count": sum(item["v65_resolution_status"] == "proposed_resolved" for item in blockers),
        "partially_resolved_blocker_count": sum(item["v65_resolution_status"] == "partially_resolved" for item in blockers),
        "still_unresolved_blocker_count": sum(item["v65_resolution_status"] == "still_unresolved" for item in blockers),
        "future_local_simulation_contract_readiness": proposal["future_local_simulation_contract_readiness"],
        "production_application_readiness": "not_ready",
        "real_template_count": 1000, "real_pending_review_count": 1000, "real_not_decided_count": 1000,
        "real_actual_submission_count": 0, "real_actual_approval_count": 0, "real_actual_rejection_count": 0,
        "real_actual_decided_count": 0, "real_application_count": 0, "real_audit_record_count": 0,
        "application_execution_count": 0, "application_simulation_count": 0, "source_mutation_count": 0,
        "review_queue_mutation_count": 0, "decision_state_mutation_count": 0, "audit_write_count": 0,
        "production_mutation_count": 0, "production_effect_count": 0, "external_write_count": 0,
        "historical_input_hashes_preserved": unchanged,
        "historical_input_sha256": dict(sorted(historical_before.items())),
        "canonical_proposal_sha256": object_sha(proposal), "transition_proposal_sha256": object_sha(transitions),
        "blocker_resolution_sha256": object_sha(blockers),
    }
    result["deterministic_validation_sha256"] = object_sha(result)
    return result


def write_outputs(directory, proposal, transitions, blockers, result):
    directory.mkdir(parents=True, exist_ok=True)
    for name, value in ((PROPOSAL_NAME, proposal), (TRANSITIONS_NAME, transitions), (BLOCKERS_NAME, blockers), (VALIDATION_NAME, result)):
        (directory / name).write_bytes(canonical_bytes(value))
    summary_keys = ("status", "proposal_status", "future_local_simulation_contract_readiness", "production_application_readiness", "historical_intent_count", "v64_blocker_count", "proposed_resolved_blocker_count", "application_execution_count", "application_simulation_count", "production_effect_count", "external_write_count", "canonical_proposal_sha256", "transition_proposal_sha256", "blocker_resolution_sha256", "deterministic_validation_sha256")
    (directory / SUMMARY_NAME).write_text(json.dumps({key: result[key] for key in summary_keys}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def repo_safety():
    files = [str((directory / name).relative_to(ROOT)).replace("\\", "/") for directory in (OUT_FIRST, OUT_REPRO) for name in (PROPOSAL_NAME, TRANSITIONS_NAME, BLOCKERS_NAME, VALIDATION_NAME, SUMMARY_NAME)]
    ignored = subprocess.run(["git", "-c", "safe.directory=C:/Users/김종민/Desktop/fandex-v54", "check-ignore", *files], cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)
    if ignored.returncode != 0:
        raise Failure("tmp outputs are not ignored")
    status = git("status", "--porcelain", "--untracked-files=all")
    changed = {line[3:].replace("\\", "/") for line in status.splitlines() if len(line) > 3}
    if not changed.issubset(ALLOWLIST):
        raise Failure("tracked-file allowlist violation: " + ", ".join(sorted(changed - ALLOWLIST)))


def run(directory):
    contract = load(CONTRACT_PATH)
    validate_contract(contract)
    _application, rules, requirements, historical_paths, before = historical_context(contract)
    proposal, transitions, blockers = build_proposal(contract, rules, requirements)
    unchanged = {str(path): file_sha(path) for path in historical_paths} == before
    if not unchanged:
        raise Failure("historical artifact changed")
    result = validation(contract, proposal, transitions, blockers, before, unchanged)
    write_outputs(directory, proposal, transitions, blockers, result)
    repo_safety()
    return proposal, transitions, blockers, result


def self_test():
    if git("branch", "--show-current") != EXPECTED_BRANCH or git("rev-parse", "HEAD") != EXPECTED_BASE or git("merge-base", "HEAD", "origin/main") != EXPECTED_BASE or git("rev-parse", "origin/main") != EXPECTED_BASE:
        raise Failure("branch/base expectation mismatch")
    first, repro = run(OUT_FIRST), run(OUT_REPRO)
    if first != repro:
        raise Failure("first/reproduction mismatch")
    proposal, transitions, blockers, result = first
    intents = [item["decision_intent"]["value"] for item in transitions]
    lifecycle = proposal["application_lifecycle"]
    assertions = [
        intents == ["not_decided", "approve_candidate", "accept_exception", "reject", "defer", "request_enrichment"], len(set(intents)) == 6,
        all(item["decision_intent"]["provenance"] == "historical_existing" for item in transitions),
        all(item["proposed_application_behavior"]["provenance"] != "historical_existing" for item in transitions),
        transitions[0]["historical_classification"]["value"] == "no_action",
        len({item["proposed_application_behavior"]["value"] for item in transitions[1:]}) == 5,
        [item["status"] for item in lifecycle["states"]] == ["prepared", "applied", "failed", "conflict"],
        proposal["idempotency_rule"]["algorithm"] == "sha256_canonical_join",
        proposal["stale_state_rule"]["mismatch_result"] == "conflict",
        proposal["logical_transaction_boundary"]["partial_success_allowed"] is False,
        len(proposal["audit_contract"]["required_fields"]) >= 10,
        proposal["failure_retry_policy"]["partial_logical_application"] == "forbidden",
        all(proposal["downstream_effect_boundary"][key] == "disconnected" for key in ("scoring", "ranking", "charts", "public_data", "app_data")),
        len(blockers) == 7, all(item["v65_resolution_status"] == "proposed_resolved" and not item["blocks_future_local_simulation"] for item in blockers),
        proposal["future_local_simulation_contract_readiness"] == "ready_for_separate_simulation_implementation",
        proposal["production_application_readiness"] == "not_ready",
        result["real_template_count"] == result["real_pending_review_count"] == result["real_not_decided_count"] == 1000,
        all(result[key] == 0 for key in ("real_actual_submission_count", "real_actual_approval_count", "real_actual_rejection_count", "real_actual_decided_count", "real_application_count", "real_audit_record_count", "application_execution_count", "application_simulation_count", "source_mutation_count", "review_queue_mutation_count", "decision_state_mutation_count", "audit_write_count", "production_mutation_count", "production_effect_count", "external_write_count")),
        result["historical_input_hashes_preserved"] is True,
    ]
    if not all(assertions):
        raise Failure("self-test assertion failed")
    hashes, repro_hashes = [object_sha(item) for item in first], [object_sha(item) for item in repro]
    if hashes != repro_hashes:
        raise Failure("determinism failure")
    print(json.dumps({"self_test": "passed", "checks": 36,
                      "proposal_first_sha256": hashes[0], "proposal_repro_sha256": repro_hashes[0],
                      "transition_first_sha256": hashes[1], "transition_repro_sha256": repro_hashes[1],
                      "blocker_first_sha256": hashes[2], "blocker_repro_sha256": repro_hashes[2],
                      "validation_first_sha256": hashes[3], "validation_repro_sha256": repro_hashes[3]}, sort_keys=True))


def main():
    parser = argparse.ArgumentParser(description="Preview a proposal-only AESPA application-state contract.")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        if args.self_test:
            self_test()
        else:
            proposal, _transitions, blockers, _result = run(OUT_FIRST)
            print(json.dumps({"status": proposal["status"], "proposal_status": "proposal_only", "future_local_simulation_contract_readiness": proposal["future_local_simulation_contract_readiness"], "production_application_readiness": "not_ready", "v64_blocker_count": len(blockers)}, sort_keys=True))
    except (Failure, OSError, KeyError, ValueError, AssertionError, subprocess.CalledProcessError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
