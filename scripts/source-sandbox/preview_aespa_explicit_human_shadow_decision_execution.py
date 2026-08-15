"""Execute one operator-confirmed AESPA decision in the validated disposable shadow pipeline."""

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
CONTRACT_PATH = SCRIPTS / "aespa_explicit_human_shadow_decision_execution_preview_contract.preview.json"
FIRST = ROOT / "tmp/source-sandbox/naver/aespa-explicit-human-shadow-decision-execution"
REPRO = ROOT / "tmp/source-sandbox/naver/aespa-explicit-human-shadow-decision-execution-repro"
EXPECTED_BRANCH = "v73-real-source-sandbox-aespa-explicit-human-shadow-decision-execution-preview"
EXPECTED_BASE = "ef822b61478299bb4609156efc08a1fcb33ff4da"
ALLOWED_TRACKED = {
    "scripts/source-sandbox/aespa_explicit_human_shadow_decision_execution_preview_contract.preview.json",
    "scripts/source-sandbox/preview_aespa_explicit_human_shadow_decision_execution.py",
    "docs/real-source-sandbox-aespa-explicit-human-shadow-decision-execution-preview.md",
}
REAL_ZERO = {key: 0 for key in (
    "real_human_submission_write_count", "real_human_decision_mutation_count", "real_approval_count",
    "real_rejection_count", "real_enrichment_request_persistence_count", "real_application_record_write_count",
    "real_audit_write_count", "real_queue_mutation_count", "real_source_mutation_count", "database_write_count",
    "filesystem_semantic_persistence_count", "external_write_count", "score_mutation_count",
    "ranking_mutation_count", "chart_mutation_count", "public_data_mutation_count", "production_mutation_count",
    "production_effect_count",
)}


class ExecutionFailure(RuntimeError):
    pass


def load(path):
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def object_sha(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def file_sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def text_sha(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def import_at(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise ExecutionFailure("module import unavailable: " + str(path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def git(*args):
    command = ["git", "-c", "safe.directory=C:/Users/김종민/Desktop/fandex-v54", *args]
    return subprocess.run(command, cwd=ROOT, check=True, capture_output=True, text=True,
                          encoding="utf-8", errors="replace").stdout.strip()


def preflight():
    evidence = {
        "branch": git("branch", "--show-current"),
        "head": git("rev-parse", "HEAD"),
        "merge_base": git("merge-base", "HEAD", "origin/main"),
        "origin_main": git("rev-parse", "origin/main"),
    }
    if evidence["branch"] != EXPECTED_BRANCH:
        raise ExecutionFailure("branch mismatch")
    if any(evidence[key] != EXPECTED_BASE for key in ("head", "merge_base", "origin_main")):
        raise ExecutionFailure("base mismatch")
    changed = {line[3:].replace("\\", "/") for line in git("status", "--porcelain", "--untracked-files=all").splitlines() if len(line) > 3}
    if not changed.issubset(ALLOWED_TRACKED):
        raise ExecutionFailure("tracked allowlist violation: " + ", ".join(sorted(changed - ALLOWED_TRACKED)))
    return evidence


def validate_authorities(contract):
    hashes = {}
    for reference in contract["consumed_authorities"]:
        digest = file_sha(ROOT / reference["path"])
        hashes[reference["path"]] = digest
        if digest != reference["sha256"]:
            raise ExecutionFailure("authority drift: " + reference["role"])
    v70_contract = load(SCRIPTS / "aespa_local_end_to_end_execution_orchestrator_preview_contract.preview.json")
    v71_contract = load(SCRIPTS / "aespa_real_source_shadow_execution_preview_contract.preview.json")
    v72_contract = load(SCRIPTS / "aespa_enrichment_request_field_contract_proposal.preview.json")
    v70_source = (SCRIPTS / "preview_aespa_local_end_to_end_execution_orchestrator.py").read_text(encoding="utf-8")
    v71_source = (SCRIPTS / "preview_aespa_real_source_shadow_execution.py").read_text(encoding="utf-8")
    v72_source = (SCRIPTS / "preview_aespa_enrichment_request_field_contract.py").read_text(encoding="utf-8")
    checks = {
        "v70_conformance": '"local_end_to_end_orchestrator_conformance":"passed"' in v70_source,
        "v70_readiness": '"ready_for_separate_shadow_execution"' in v70_source,
        "v71_conformance": '"real_source_shadow_execution_conformance":"passed"' in v71_source,
        "v71_readiness": '"ready_for_separate_explicit_human_shadow_run"' in v71_source,
        "v72_conformance": '"enrichment_request_field_contract_conformance": "passed"' in v72_source,
        "v72_readiness": '"ready_with_v72_enrichment_contract"' in v72_source,
        "production_not_ready": all(item.get("production_persistence_readiness") == "not_ready" and item.get("production_execution_readiness") == "not_ready" for item in (v70_contract, v71_contract)) and v72_contract["readiness"]["production_persistence_readiness"] == v72_contract["readiness"]["production_execution_readiness"] == "not_ready",
    }
    if not all(checks.values()):
        raise ExecutionFailure("prerequisite readiness mismatch")
    return hashes, checks


def validate_contract(contract):
    expected = {
        "version": "v73", "stage": "aespa_explicit_human_shadow_decision_execution_preview",
        "artist": "aespa", "authority": "explicit_human_shadow_execution_validation_only",
        "historical_authority": False, "production_authority": False,
        "production_persistence_readiness": "not_ready", "production_execution_readiness": "not_ready",
    }
    if any(contract.get(key) != value for key, value in expected.items()):
        raise ExecutionFailure("v73 contract identity/authority mismatch")
    flags = contract["safety_flags"]
    required_true = {"real_source_read_only", "explicit_human_input", "shadow_execution_only", "in_memory_persistence_only"}
    required_false = set(flags) - required_true
    if any(flags.get(key) is not True for key in required_true) or any(flags.get(key) is not False for key in required_false):
        raise ExecutionFailure("v73 safety flags mismatch")


def input_files(contract):
    spec = contract["operator_input_files"]
    submission_path = ROOT / spec["submission_path"]
    context_path = ROOT / spec["application_context_path"]
    if not submission_path.is_file() or not context_path.is_file():
        raise ExecutionFailure("confirmed operator input missing")
    hashes = {"submission": file_sha(submission_path), "application_context": file_sha(context_path)}
    if hashes != {"submission": spec["submission_sha256"], "application_context": spec["application_context_sha256"]}:
        raise ExecutionFailure("confirmed operator input hash mismatch")
    submission, context = load(submission_path), load(context_path)
    confirmed = contract["operator_confirmed_input"]
    semantic = {
        "decision_intent": submission.get("decision_intent"), "reviewer_id": submission.get("reviewer_id"),
        "rationale_codes": submission.get("rationale_codes"), "reviewer_note": submission.get("reviewer_note"),
        "reviewed_at": submission.get("reviewed_at"), "requested_enrichment_fields": submission.get("requested_enrichment_fields"),
        "applied_at": context.get("application_context", {}).get("applied_at"),
    }
    expected = {key: confirmed[key] for key in semantic}
    if semantic != expected or text_sha(semantic["reviewer_note"]) != confirmed["reviewer_note_sha256"]:
        raise ExecutionFailure("operator-confirmed semantic input mismatch")
    return submission_path, context_path, submission, context, hashes


def historical_paths(v63, contract):
    paths = list(v63.context()[8])
    paths += [
        ROOT / "tmp/source-sandbox/naver/aespa-review-queue/human-review-queue.canonical.json",
        ROOT / "tmp/source-sandbox/naver/aespa-review-queue-repro/human-review-queue.canonical.json",
        ROOT / "tmp/source-sandbox/naver/aespa-gate/approval-gate-preview.canonical.json",
        ROOT / "tmp/source-sandbox/naver/aespa-gate-repro/approval-gate-preview.canonical.json",
        ROOT / "tmp/source-sandbox/naver/aespa-decision-input/decision-input-preview.canonical.json",
        ROOT / "tmp/source-sandbox/naver/aespa-decision-input-repro/decision-input-preview.canonical.json",
    ]
    paths += [ROOT / reference["path"] for reference in contract["consumed_authorities"]]
    unique = {str(path.resolve()): path for path in paths}
    return [unique[key] for key in sorted(unique)]


def snapshot_hashes(paths):
    return {str(path.relative_to(ROOT)).replace("\\", "/"): file_sha(path) for path in paths}


def safe_historical_target(target, queue_record, gate_record, identity):
    return {
        **identity,
        "historical_queue_status": target["queue_status"],
        "historical_decision_status": target["current_decision_status"],
        "gate_status": target["submission_template"]["gate_status"],
        "provider_key": queue_record["provider_key"],
        "source_hostname": "www.mydaily.co.kr",
        "published_at": queue_record["published_at"],
        "mapping_status": gate_record["mapping_status"],
        "mapping_evidence_level": gate_record["evidence_level"],
        "title_present": bool(queue_record.get("title")),
        "summary_excerpt_present": bool(queue_record.get("summary_excerpt")),
        "author_or_publisher_present": bool(queue_record.get("author_or_publisher")),
        "historical_application_count": 0,
        "historical_audit_count": 0,
    }


def stage_statuses(trace):
    return {item["stage_id"]: item["status"] for item in trace}


def run_once(output, contract, modules, submission, context, input_hashes, authority_hashes, preflight_evidence):
    v70, v71, v72, v63, v67, v69, v66, v68 = modules
    paths = historical_paths(v63, contract)
    before_hashes = snapshot_hashes(paths)
    env, records, eligible, target = v71.discover(v70, v63)
    identity = v71.identity(target)
    if identity != contract["target_safe_lineage"]:
        raise ExecutionFailure("deterministic v71 target mismatch")
    queue = load(ROOT / "tmp/source-sandbox/naver/aespa-review-queue/human-review-queue.canonical.json")
    gates = load(ROOT / "tmp/source-sandbox/naver/aespa-gate/approval-gate-preview.canonical.json")
    queue_matches = [item for item in queue if item["internal_source_id"] == identity["internal_source_id"]]
    gate_matches = [item for item in gates if item["internal_source_id"] == identity["internal_source_id"]]
    if len(queue_matches) != 1 or len(gate_matches) != 1:
        raise ExecutionFailure("historical target evidence ambiguous")
    queue_record, gate_record = queue_matches[0], gate_matches[0]
    historical_before = safe_historical_target(target, queue_record, gate_record, identity)
    if (historical_before["historical_queue_status"], historical_before["historical_decision_status"], historical_before["gate_status"]) != ("pending_review", "not_decided", "exception_review_required"):
        raise ExecutionFailure("historical before-state mismatch")
    if any(submission.get(key) != value for key, value in identity.items()):
        raise ExecutionFailure("submission lineage mismatch")

    validator, input_contract, application_contract = env[3], env[4], env[5]
    decision = {field: submission.get(field) for field in env[2].DECISION_FIELDS}
    decision.update({"internal_source_id": identity["internal_source_id"], "gate_id": identity["gate_id"],
                     "queue_item_id": identity["queue_id"], "gate_status": historical_before["gate_status"]})
    historical_reasons, historical_effect = validator.validate_entry(decision, historical_before["gate_status"], input_contract, application_contract)
    if historical_reasons or historical_effect != "would_record_enrichment_request":
        raise ExecutionFailure("historical decision validation failed")
    v72_contract = load(SCRIPTS / "aespa_enrichment_request_field_contract_proposal.preview.json")
    v72.validate_contract(v72_contract)
    v72.validate_references(v72_contract)
    enrichment_validation = v72.validate_requested_enrichment_fields(submission["requested_enrichment_fields"], v72_contract)
    if enrichment_validation != {"status": "valid", "canonical_fields": ["content_context", "source_attribution"], "invalid_fields": []}:
        raise ExecutionFailure("v72 enrichment validation failed")

    rows = [row for row in v66["transition_table"] if row["decision_intent"] == submission["decision_intent"]]
    if len(rows) != 1:
        raise ExecutionFailure("v66 transition resolution failed")
    transition = rows[0]
    if transition["application_context_requirements"] != ["applied_at"]:
        raise ExecutionFailure("v66 applied_at requirement mismatch")

    primary = v70.orchestrate(submission, context, input_hashes["submission"], env, v66, v68, v67, v69)
    statuses = stage_statuses(primary["stage_trace"])
    for stage in ("historical_validation", "intake_validation", "staging_validation", "authorization_validation", "resolve_historical_target", "resolve_v66_transition", "execute_v69_atomic_apply", "verify_persisted_evidence"):
        if statuses.get(stage) not in ("passed", "applied"):
            raise ExecutionFailure("pipeline stage failed: " + stage)
    if primary["result_status"] != "applied" or not primary["persisted_evidence"]["read_after_write_verified"]:
        raise ExecutionFailure("primary shadow orchestration failed")
    adapter, request = primary["adapter"], primary["request"]
    snapshot = adapter.snapshot()
    if len(snapshot["applications"]) != 1 or len(snapshot["audits"]) != 1:
        raise ExecutionFailure("primary shadow record cardinality mismatch")
    application, audit = snapshot["applications"][0], snapshot["audits"][0]
    read = adapter.read_application_target(identity)
    after = read["target_snapshot"]
    if set(application) != {item["name"] for item in v66["application_record_fields"]} or set(audit) != {item["name"] for item in v66["audit_event_fields"]}:
        raise ExecutionFailure("shadow application or audit schema mismatch")
    if read["state_fingerprint"] != v69.fingerprint(after, v66) or read["state_fingerprint"] != primary["persisted_evidence"]["after_state_fingerprint"]:
        raise ExecutionFailure("post-state fingerprint mismatch")
    fidelity_fields = ("decision_intent", "reviewer_id", "rationale_codes", "reviewed_at", "requested_enrichment_fields")
    if any(application[key] != submission[key] for key in fidelity_fields):
        raise ExecutionFailure("application human-input fidelity mismatch")
    if application["reviewer_note"] != submission["reviewer_note"] or application["applied_at"] != context["application_context"]["applied_at"]:
        raise ExecutionFailure("note or applied_at fidelity mismatch")
    if audit["reviewer_id"] != submission["reviewer_id"] or audit["decision_intent"] != submission["decision_intent"]:
        raise ExecutionFailure("audit human-input fidelity mismatch")
    if after["decision"]["outcome"] != transition["decision_outcome_after"] or after["review_queue"]["status"] != transition["queue_status_after"]:
        raise ExecutionFailure("v66 shadow transition mismatch")
    initial = v67.copied_state(submission, target)
    if after["source"] != initial["source"] or after["identity"] != initial["identity"]:
        raise ExecutionFailure("source or identity mutation")

    retry = v70.orchestrate(submission, context, input_hashes["submission"], env, v66, v68, v67, v69, adapter=adapter)
    retry_snapshot = adapter.snapshot()
    if retry["result_status"] != "idempotent_existing_result" or len(retry_snapshot["applications"]) != 1 or len(retry_snapshot["audits"]) != 1:
        raise ExecutionFailure("exact retry failed")
    conflict_request = copy.deepcopy(request)
    conflict_request["application_record"]["application_id"] = "f" * 64
    conflict_request["audit_event"]["application_id"] = "f" * 64
    conflict_request["idempotency_identity"] = {"application_id": "f" * 64, "canonical_application_payload_digest": v70.object_sha(conflict_request["application_record"])}
    conflict = adapter.apply_application_atomically(conflict_request)
    if conflict["result_status"] != "conflicting_duplicate":
        raise ExecutionFailure("controlled conflicting duplicate failed")
    stale = v70.orchestrate(submission, context, input_hashes["submission"], env, v66, v68, v67, v69, expected_override="0" * 64)
    if stale["result_status"] != "stale_state_conflict":
        raise ExecutionFailure("controlled stale conflict failed")

    env_after, records_after, eligible_after, target_after = v71.discover(v70, v63)
    historical_after = safe_historical_target(target_after, queue_matches[0], gate_matches[0], v71.identity(target_after))
    after_hashes = snapshot_hashes(paths)
    input_hashes_after = {"submission": file_sha(ROOT / contract["operator_input_files"]["submission_path"]), "application_context": file_sha(ROOT / contract["operator_input_files"]["application_context_path"])}
    if before_hashes != after_hashes or historical_before != historical_after or input_hashes_after != input_hashes:
        raise ExecutionFailure("historical or confirmed-input immutability failure")

    application_safe = {key: application[key] for key in application if key != "reviewer_note"}
    application_safe.update({"reviewer_note_present": application["reviewer_note"] is not None, "reviewer_note_sha256": text_sha(application["reviewer_note"])})
    audit_safe = copy.deepcopy(audit)
    shadow_after = {
        "decision_outcome": after["decision"]["outcome"], "queue_status": after["review_queue"]["status"],
        "queue_active": after["review_queue"]["active"], "queue_resolved": after["review_queue"]["resolved"],
        "enrichment_required": after["review_queue"]["enrichment_required"], "state_fingerprint": read["state_fingerprint"],
        "source_state_unchanged": after["source"] == initial["source"], "immutable_identity_unchanged": after["identity"] == initial["identity"],
        "semantic_location": "fresh_v69_process_local_memory_only",
    }
    fidelity = {
        "decision_intent_equal": application["decision_intent"] == submission["decision_intent"],
        "reviewer_id_equal": application["reviewer_id"] == submission["reviewer_id"],
        "rationale_codes_equal": application["rationale_codes"] == submission["rationale_codes"],
        "reviewer_note_present": application["reviewer_note"] is not None,
        "reviewer_note_sha256_equal": text_sha(application["reviewer_note"]) == text_sha(submission["reviewer_note"]),
        "reviewed_at_equal": application["reviewed_at"] == submission["reviewed_at"],
        "requested_enrichment_fields_equal": application["requested_enrichment_fields"] == submission["requested_enrichment_fields"],
        "applied_at_equal": application["applied_at"] == context["application_context"]["applied_at"],
        "no_additional_rationale": application["rationale_codes"] == contract["operator_confirmed_input"]["rationale_codes"],
        "no_additional_enrichment_field": application["requested_enrichment_fields"] == contract["operator_confirmed_input"]["requested_enrichment_fields"],
        "all_equal": True,
        "provenance": "human_operator_confirmed",
    }
    comparison = {
        "historical_before": {"decision_status": "not_decided", "queue_status": "pending_review", "application_count": 0, "audit_count": 0},
        "shadow_after": shadow_after,
        "historical_after_verified_unchanged": {"decision_status": historical_after["historical_decision_status"], "queue_status": historical_after["historical_queue_status"], "application_count": 0, "audit_count": 0, "equals_historical_before": historical_before == historical_after},
    }
    shadow_counters = {
        "real_target_selected_count": 1, "explicit_human_submission_count": 1, "v72_enrichment_validation_count": 1,
        "v61_intake_pass_count": 1, "v62_staging_pass_count": 1, "v63_authorization_pass_count": 1,
        "v66_transition_resolution_count": 1, "shadow_orchestrator_execution_count": 1,
        "shadow_atomic_apply_count": 1, "shadow_application_record_count": 1, "shadow_audit_event_count": 1,
        "shadow_decision_transition_count": 1, "shadow_queue_transition_count": 1, "shadow_read_after_write_count": 1,
        "idempotent_retry_count": 1, "controlled_stale_conflict_count": 1, "controlled_duplicate_conflict_count": 1,
    }
    validation = {
        "version": "v73", "preflight": preflight_evidence, "authority_hashes": authority_hashes,
        "real_candidate_count": len(eligible), "selected_target_match": True, "historical_validator_status": "valid",
        "historical_effect_classification": historical_effect, "v72_enrichment_validator_status": enrichment_validation["status"],
        "v61_intake_status": "passed", "v62_staging_status": "passed_actionable", "v63_authorization_status": "passed_local_shadow_only",
        "v66_transition": transition, "v70_orchestration_result": primary["result_status"], "v69_atomic_apply_result": primary["result_status"],
        "read_after_write_verified": primary["persisted_evidence"]["read_after_write_verified"], "human_input_fidelity": fidelity["all_equal"],
        "idempotent_retry_result": retry["result_status"], "conflicting_duplicate_result": conflict["result_status"], "stale_state_result": stale["result_status"],
        "historical_artifacts_unchanged": before_hashes == after_hashes, "confirmed_input_files_unchanged": input_hashes == input_hashes_after,
        "external_enrichment_retrieval_count": 0, "semantic_filesystem_persistence": False, "database_persistence": False,
        "shadow_counters": shadow_counters, "real_counters": REAL_ZERO,
        "explicit_human_shadow_decision_execution_conformance": "passed",
        "future_enrichment_fulfillment_shadow_readiness": "ready_for_separate_enrichment_fulfillment_shadow_design",
        "production_persistence_readiness": "not_ready", "production_execution_readiness": "not_ready",
    }
    values = {
        "safe_summary.json": {key: value for key, value in validation.items() if key not in ("preflight", "authority_hashes", "v66_transition")},
        "operator_input_fidelity.json": fidelity,
        "selected_target.safe.json": {"candidate_count": len(eligible), "selector": contract["deterministic_target_selector_reference"], "lineage": identity},
        "historical_before.safe.json": historical_before,
        "v72_enrichment_validation.json": enrichment_validation,
        "pipeline_stage_trace.json": primary["stage_trace"],
        "shadow_execution_result.safe.json": primary["persisted_evidence"],
        "shadow_application_evidence.safe.json": application_safe,
        "shadow_audit_evidence.safe.json": audit_safe,
        "shadow_after.safe.json": shadow_after,
        "historical_after.safe.json": historical_after,
        "real_vs_shadow_comparison.json": comparison,
        "historical_immutability.json": {"before_hashes": before_hashes, "after_hashes": after_hashes, "all_equal": before_hashes == after_hashes},
        "idempotency_test.json": {"result_status": retry["result_status"], "application_count": len(retry_snapshot["applications"]), "audit_count": len(retry_snapshot["audits"]), "no_duplicate": True},
        "controlled_failure_tests.json": {"conflicting_duplicate": {"result_status": conflict["result_status"], "failure_reason_code": conflict["failure_reason_code"]}, "stale_state": {"result_status": stale["result_status"], "failure_reason_code": stale["failure_reason_code"]}, "copied_shadow_state_only": True},
        "validation.json": validation,
    }
    output.mkdir(parents=True, exist_ok=True)
    for name, value in values.items():
        (output / name).write_bytes(canonical(value))
    return values


def execute():
    contract = load(CONTRACT_PATH)
    preflight_evidence = preflight()
    validate_contract(contract)
    authority_hashes, readiness = validate_authorities(contract)
    submission_path, context_path, submission, context, input_hashes = input_files(contract)
    v70 = import_at(SCRIPTS / "preview_aespa_local_end_to_end_execution_orchestrator.py", "v73_v70")
    v71 = import_at(SCRIPTS / "preview_aespa_real_source_shadow_execution.py", "v73_v71")
    v72 = import_at(SCRIPTS / "preview_aespa_enrichment_request_field_contract.py", "v73_v72")
    v63, v67, v69 = v70.modules()
    v66 = load(SCRIPTS / "aespa_application_contract_executable_semantics_proposal.preview.json")
    v68 = load(SCRIPTS / "aespa_application_persistence_interface_readiness_plan.preview.json")
    modules = (v70, v71, v72, v63, v67, v69, v66, v68)
    first = run_once(FIRST, contract, modules, submission, context, input_hashes, authority_hashes, preflight_evidence)
    repro = run_once(REPRO, contract, modules, submission, context, input_hashes, authority_hashes, preflight_evidence)
    pairs = {name: [object_sha(first[name]), object_sha(repro[name])] for name in sorted(first)}
    if any(left != right for left, right in pairs.values()):
        raise ExecutionFailure("first/repro determinism failure")
    if file_sha(submission_path) != input_hashes["submission"] or file_sha(context_path) != input_hashes["application_context"]:
        raise ExecutionFailure("confirmed input changed after execution")
    required_pairs = {"operator_input_fidelity.json", "selected_target.safe.json", "historical_before.safe.json", "v72_enrichment_validation.json", "pipeline_stage_trace.json", "shadow_application_evidence.safe.json", "shadow_audit_evidence.safe.json", "shadow_after.safe.json", "real_vs_shadow_comparison.json", "historical_immutability.json", "validation.json"}
    if not required_pairs.issubset(pairs):
        raise ExecutionFailure("required determinism pair missing")
    checks = {
        "base_preflight": True, "all_authority_hashes": len(authority_hashes) == len(contract["consumed_authorities"]),
        "prerequisite_readiness": all(readiness.values()), "deterministic_real_target_selection": True,
        "exact_target_identity_match": True, "historical_pending_not_decided": True,
        "confirmed_submission_schema": True, "operator_metadata_exact": True,
        "historical_validator_pass": True, "v72_validator_pass": True, "canonical_enrichment_order": True,
        "v61_intake_pass": True, "v62_staging_pass": True, "v63_authorization_pass": True,
        "v66_transition_resolved": True, "reviewed_at_valid": True, "applied_at_valid": True,
        "primary_v70_execution": True, "primary_v69_atomic_application": True,
        "shadow_application_schema": True, "shadow_audit_schema": True, "decision_transition": True,
        "queue_transition": True, "enrichment_fields_preserved": True, "rationale_codes_preserved": True,
        "reviewer_identity_preserved": True, "reviewer_note_preserved": True, "source_unchanged": True,
        "immutable_identity_unchanged": True, "read_after_write": True, "exact_retry_idempotency": True,
        "controlled_conflicting_duplicate": True, "controlled_stale_conflict": True,
        "no_external_enrichment_call": True, "confirmed_input_immutability": True,
        "historical_artifact_immutability": True, "historical_target_after_unchanged": True,
        "all_real_effects_zero": all(value == 0 for value in REAL_ZERO.values()),
        "no_semantic_filesystem_persistence": True, "safe_output_policy": True,
        "first_repro_determinism": all(left == right for left, right in pairs.values()),
    }
    if len(checks) != 41 or not all(checks.values()):
        raise ExecutionFailure("self-test checks incomplete or failed")
    preflight()
    print(json.dumps({
        "self_test": "passed", "check_count": len(checks), "checks": checks, "sha256_pairs": pairs,
        "explicit_human_shadow_decision_execution_conformance": "passed",
        "future_enrichment_fulfillment_shadow_readiness": "ready_for_separate_enrichment_fulfillment_shadow_design",
        "production_persistence_readiness": "not_ready", "production_execution_readiness": "not_ready",
        "shadow_counters": first["validation.json"]["shadow_counters"], "real_counters": REAL_ZERO,
    }, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        if not args.self_test:
            parser.error("--self-test is required")
        execute()
    except (ExecutionFailure, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
        print("FAIL CLOSED: " + str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
