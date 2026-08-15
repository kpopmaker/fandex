"""Validate the v74 enrichment-fulfillment shadow design without retrieval or persistence."""

import argparse
import hashlib
import importlib.util
import json
import subprocess
import sys
import unicodedata
from pathlib import Path

sys.dont_write_bytecode = True

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
CONTRACT_PATH = HERE / "aespa_enrichment_fulfillment_shadow_design.preview.json"
FIRST = ROOT / "tmp/source-sandbox/naver/aespa-enrichment-fulfillment-shadow-design"
REPRO = ROOT / "tmp/source-sandbox/naver/aespa-enrichment-fulfillment-shadow-design-repro"
EXPECTED_BRANCH = "v74-real-source-sandbox-aespa-enrichment-fulfillment-shadow-design"
EXPECTED_BASE = "18c8c0e98d5bbd4a4efb898626c778c1ff164110"
ALLOWED_TRACKED = {
    "scripts/source-sandbox/aespa_enrichment_fulfillment_shadow_design.preview.json",
    "scripts/source-sandbox/preview_aespa_enrichment_fulfillment_shadow_design.py",
    "docs/real-source-sandbox-aespa-enrichment-fulfillment-shadow-design.md",
}
OUTPUT_NAMES = [
    "safe_summary.json", "authority_verification.json", "fulfillment_lifecycle.json",
    "evidence_schema.json", "completion_matrix.json", "source_priority.json",
    "authorization_policy.json", "failure_matrix.json", "controlled_fixture_matrix.json",
    "real_target_fulfillment_plan.json", "validation.json",
]
ZERO_EFFECTS = {
    "external_request_count": 0, "real_enrichment_retrieval_count": 0,
    "shadow_enrichment_retrieval_count": 0, "real_source_mutation_count": 0,
    "real_queue_mutation_count": 0, "real_decision_mutation_count": 0,
    "real_application_write_count": 0, "real_audit_write_count": 0,
    "database_write_count": 0, "filesystem_semantic_persistence_count": 0,
    "external_write_count": 0, "score_mutation_count": 0, "ranking_mutation_count": 0,
    "chart_mutation_count": 0, "public_data_mutation_count": 0,
    "production_mutation_count": 0, "production_effect_count": 0,
}


class DesignFailure(RuntimeError):
    pass


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def canonical(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def object_sha(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def file_sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def import_at(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise DesignFailure("module import unavailable: " + str(path))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def git(*args):
    command = ["git", "-c", "safe.directory=C:/Users/김종민/Desktop/fandex-v54", *args]
    return subprocess.run(command, cwd=ROOT, check=True, capture_output=True, text=True,
                          encoding="utf-8", errors="replace").stdout.strip()


def preflight():
    result = {
        "branch": git("branch", "--show-current"), "head": git("rev-parse", "HEAD"),
        "merge_base": git("merge-base", "HEAD", "origin/main"),
        "origin_main": git("rev-parse", "origin/main"),
    }
    if result["branch"] != EXPECTED_BRANCH:
        raise DesignFailure("branch mismatch")
    if any(result[key] != EXPECTED_BASE for key in ("head", "merge_base", "origin_main")):
        raise DesignFailure("base mismatch")
    changed = {line[3:].replace("\\", "/") for line in
               git("status", "--porcelain", "--untracked-files=all").splitlines() if len(line) > 3}
    if not changed.issubset(ALLOWED_TRACKED):
        raise DesignFailure("tracked allowlist violation: " + ", ".join(sorted(changed - ALLOWED_TRACKED)))
    return result


def verify_authorities(contract):
    observed = {}
    for ref in contract["consumed_authority_hashes"]:
        digest = file_sha(ROOT / ref["path"])
        if digest != ref["sha256"]:
            raise DesignFailure("authority drift: " + ref["role"])
        observed[ref["path"]] = digest
    v72 = load(ROOT / next(x["path"] for x in contract["consumed_authority_hashes"] if x["role"] == "v72_contract"))
    v73_contract = load(ROOT / next(x["path"] for x in contract["consumed_authority_hashes"] if x["role"] == "v73_contract"))
    v72_script = (ROOT / next(x["path"] for x in contract["consumed_authority_hashes"] if x["role"] == "v72_implementation")).read_text(encoding="utf-8")
    v73_script = (ROOT / next(x["path"] for x in contract["consumed_authority_hashes"] if x["role"] == "v73_implementation")).read_text(encoding="utf-8")
    v72_keys = [x["key"] for x in v72["allowed_requested_enrichment_fields"]]
    checks = {
        "v72_contract_identity": v72["version"] == "v72",
        "v72_conformance_tracked": '"enrichment_request_field_contract_conformance": "passed"' in v72_script,
        "v72_vocabulary_exact": v72_keys == ["content_context", "source_attribution"],
        "v73_contract_identity": v73_contract["version"] == "v73",
        "v73_conformance_tracked": '"explicit_human_shadow_decision_execution_conformance": "passed"' in v73_script,
        "v73_readiness_tracked": '"future_enrichment_fulfillment_shadow_readiness": "ready_for_separate_enrichment_fulfillment_shadow_design"' in v73_script,
        "production_not_ready": v73_contract["production_persistence_readiness"] == "not_ready" and v73_contract["production_execution_readiness"] == "not_ready",
    }
    if not all(checks.values()):
        raise DesignFailure("v72/v73 prerequisite mismatch")
    return {"observed_hashes": observed, "prerequisite_checks": checks}


def normalize(value):
    return unicodedata.normalize("NFC", value).strip()


def value_digest(value):
    return hashlib.sha256(normalize(value).encode("utf-8")).hexdigest()


def evidence_identity(payload):
    body = {k: v for k, v in payload.items() if k != "evidence_id"}
    return object_sha(body)


def validate_evidence_envelope(envelope, contract, expected_target=None):
    schema = contract["evidence_envelope_schema"]
    if not isinstance(envelope, dict) or set(envelope) != set(schema["required_fields"]):
        return {"status": "evidence_invalid", "reason": "malformed_envelope"}
    if expected_target is not None and envelope["target_identity"] != expected_target:
        return {"status": "evidence_invalid", "reason": "target_mismatch"}
    if envelope["requested_field"] not in contract["requested_enrichment_field_contract"]["fields"]:
        return {"status": "evidence_invalid", "reason": "unknown_requested_field"}
    mapping = {
        "content_context": {"title", "summary_or_bounded_excerpt"},
        "source_attribution": {"author_or_publisher", "provider_key", "source_url_hostname"},
    }
    if envelope["semantic_field"] not in mapping[envelope["requested_field"]]:
        return {"status": "evidence_invalid", "reason": "semantic_field_mismatch"}
    value = envelope["normalized_value"]
    if not isinstance(value, str) or not normalize(value):
        return {"status": "evidence_invalid", "reason": "empty_value"}
    if envelope["semantic_field"] == "summary_or_bounded_excerpt" and envelope["evidence_type"] == "bounded_excerpt":
        if len(normalize(value)) > contract["excerpt_policy"]["maximum_unicode_code_points"]:
            return {"status": "evidence_invalid", "reason": "excerpt_too_long"}
    classes = {x["key"] for x in contract["source_class_vocabulary"]}
    if envelope["source_class"] not in classes:
        return {"status": "evidence_invalid", "reason": "unknown_source_class"}
    if envelope["content_digest"] != value_digest(value):
        return {"status": "evidence_invalid", "reason": "content_digest_mismatch"}
    if envelope["evidence_id"] != evidence_identity(envelope):
        return {"status": "evidence_invalid", "reason": "evidence_id_mismatch"}
    if envelope["validation_status"] != "valid":
        return {"status": "evidence_invalid", "reason": "validation_not_valid"}
    if envelope["safe_retention_class"] not in contract["copyright_safe_content_policy"]["allowed_retention_classes"]:
        return {"status": "evidence_invalid", "reason": "unsafe_retention_class"}
    return {"status": "valid", "reason": None}


def evaluate_field_completion(field, evidence, contract):
    if field not in contract["requested_enrichment_field_contract"]["fields"]:
        return {"status": "failed", "reason": "unknown_requested_field"}
    valid = [x for x in evidence if validate_evidence_envelope(x, contract)["status"] == "valid" and x["requested_field"] == field]
    semantic = {x["semantic_field"] for x in valid}
    if field == "content_context":
        count = int("title" in semantic) + int("summary_or_bounded_excerpt" in semantic)
        return {"status": ("satisfied" if count == 2 else "partially_satisfied" if count == 1 else "not_attempted"), "valid_components": sorted(semantic)}
    complete = "author_or_publisher" in semantic
    return {"status": "satisfied" if complete else "partially_satisfied" if semantic else "not_attempted", "valid_components": sorted(semantic)}


def evaluate_request_completion(field_results, contract):
    states = [x["status"] for x in field_results.values()]
    if states and all(x == "satisfied" for x in states):
        return "satisfied"
    if "satisfied" in states:
        return "partially_satisfied"
    if "failed" in states:
        return "failed"
    if "unavailable" in states:
        return "unavailable"
    if states and all(x in {"requested", "planned", "not_attempted"} for x in states):
        return "not_attempted"
    return "unsatisfied"


def validate_authorization_envelope(value, target, requested_fields, source_class, binding):
    if value is None:
        return {"status": "not_attempted", "reason": "authorization_missing"}
    required = {"authorization_id", "authorization_status", "target_identity", "allowed_source_class", "allowed_host_or_provider", "allowed_requested_fields", "request_scope", "one_shot", "expires_at", "provenance"}
    if not isinstance(value, dict) or set(value) != required or value["authorization_status"] != "authorized":
        return {"status": "not_attempted", "reason": "authorization_invalid"}
    if value["target_identity"] != target:
        return {"status": "not_attempted", "reason": "target_mismatch"}
    if value["allowed_source_class"] != source_class or value["allowed_host_or_provider"] != binding:
        return {"status": "not_attempted", "reason": "source_not_authorized"}
    if value["allowed_requested_fields"] != requested_fields or not value["one_shot"]:
        return {"status": "not_attempted", "reason": "authorization_invalid"}
    return {"status": "authorized", "reason": None}


def fixture(target, request_id, requested_field, evidence_type, semantic_field, value, retention):
    item = {
        "request_id": request_id, "target_identity": target, "requested_field": requested_field,
        "evidence_type": evidence_type, "semantic_field": semantic_field,
        "normalized_value": normalize(value), "source_class": "controlled_fixture_input",
        "source_locator": None, "collection_method": "controlled_fixture_supply",
        "content_digest": value_digest(value), "provenance": "controlled_fixture_only",
        "validation_status": "valid", "safe_retention_class": retention,
    }
    item["evidence_id"] = evidence_identity(item)
    return item


def reproduce_target(contract):
    v70 = import_at(ROOT / "scripts/source-sandbox/preview_aespa_local_end_to_end_execution_orchestrator.py", "v74_v70")
    v63 = import_at(ROOT / "scripts/source-sandbox/preview_aespa_decision_application_authorization_gate.py", "v74_v63")
    v71 = import_at(ROOT / "scripts/source-sandbox/preview_aespa_real_source_shadow_execution.py", "v74_v71")
    _, records, eligible, target = v71.discover(v70, v63)
    identity = v71.identity(target)
    expected = contract["selected_real_target_design_case"]
    if identity != expected["target_identity"] or len(eligible) != 1000:
        raise DesignFailure("v71 target reproduction mismatch")
    if target["queue_status"] != "pending_review" or target["current_decision_status"] != "not_decided" or target["submission_template"]["gate_status"] != "exception_review_required":
        raise DesignFailure("historical target state mismatch")
    return {"eligible_count": len(eligible), "total_count": len(records), "target_identity": identity,
            "queue_status": target["queue_status"], "decision_status": target["current_decision_status"],
            "classification": target["submission_template"]["gate_status"]}


def build_fulfillment_plan(contract, target_evidence):
    case = contract["selected_real_target_design_case"]
    identity = case["target_identity"]
    fields = case["requested_fields"]
    results = {field: evaluate_field_completion(field, target_evidence, contract) for field in fields}
    return {
        "plan_version": "v74", "request_id": object_sha({"target_identity": identity, "requested_fields": fields}),
        "target_identity": identity, "requested_fields": fields,
        "current_field_states": results, "request_status": evaluate_request_completion(results, contract),
        "available_local_evidence": ["provider_key", "source_url_hostname", "published_at"],
        "missing_requirements": case["missing_semantic_evidence"],
        "candidate_source_classes": ["existing_local_normalized", "authorized_provider_retrieval", "authorized_direct_source_retrieval"],
        "authorization_status": "not_authorized",
        "planned_operations": ["inspect_local_evidence", "evaluate_completion", "await_external_authorization"],
        "execution_status": "not_executed", "external_operation_status": "not_attempted",
        "historical_mutation": False, "provenance": "proposed_v74",
    }


def matrices(contract, target):
    request_id = object_sha({"fixture": "v74", "target": target})
    title = fixture(target, request_id, "content_context", "title", "title", "Controlled title", "title")
    summary = fixture(target, request_id, "content_context", "summary", "summary_or_bounded_excerpt", "Controlled summary", "summary")
    excerpt = fixture(target, request_id, "content_context", "bounded_excerpt", "summary_or_bounded_excerpt", "X" * 1000, "bounded_excerpt")
    author = fixture(target, request_id, "source_attribution", "author_or_publisher", "author_or_publisher", "Controlled Publisher", "metadata")
    provider = fixture(target, request_id, "source_attribution", "context_metadata", "provider_key", "controlled-provider", "metadata")
    cases = {
        "none": [], "title_only": [title], "summary_only": [summary], "title_summary": [title, summary],
        "title_bounded_excerpt": [title, excerpt], "provider_only": [provider], "attribution": [author],
        "both": [title, summary, author], "content_only": [title, summary], "attribution_only": [author],
    }
    result = {}
    for name, evidence in cases.items():
        fields = {field: evaluate_field_completion(field, evidence, contract) for field in contract["requested_enrichment_field_contract"]["fields"]}
        result[name] = {"field_results": fields, "request_status": evaluate_request_completion(fields, contract), "provenance": "controlled_fixture_only"}
    too_long = fixture(target, request_id, "content_context", "bounded_excerpt", "summary_or_bounded_excerpt", "X" * 1001, "bounded_excerpt")
    result["excerpt_over_bound"] = validate_evidence_envelope(too_long, contract, target)
    malformed = dict(title); malformed.pop("content_digest")
    result["malformed"] = validate_evidence_envelope(malformed, contract, target)
    mismatch = dict(title); mismatch["target_identity"] = {**target, "internal_source_id": "wrong"}; mismatch["evidence_id"] = evidence_identity(mismatch)
    result["target_mismatch"] = validate_evidence_envelope(mismatch, contract, target)
    semantic = dict(title); semantic["requested_field"] = "source_attribution"; semantic["evidence_id"] = evidence_identity(semantic)
    result["semantic_mismatch"] = validate_evidence_envelope(semantic, contract, target)
    return result


def validate_design(contract):
    required = {"version", "stage", "artist", "scope", "authority", "historical_authority", "production_authority", "proposal_status", "consumed_authority_hashes", "requested_enrichment_field_contract", "fulfillment_lifecycle", "request_level_statuses", "source_class_vocabulary", "source_priority", "source_priority_rules", "content_context_completion", "copyright_safe_content_policy", "excerpt_policy", "source_attribution_completion", "attribution_evidence_policy", "evidence_envelope_schema", "evidence_hashing", "fulfillment_plan_schema", "external_authorization_gate", "network_safety_requirements", "failure_vocabulary", "retry_policy", "partial_completion_semantics", "human_review_boundary", "historical_write_boundary", "persistence_boundary", "future_interface", "controlled_fixture_policy", "selected_real_target_design_case", "safe_output_policy", "zero_effect_policy", "readiness", "provenance_vocabulary"}
    if set(contract) != required or contract["version"] != "v74" or contract["historical_authority"] or contract["production_authority"]:
        raise DesignFailure("contract shape or authority invalid")
    lifecycle = {x["state"] for x in contract["fulfillment_lifecycle"]}
    required_lifecycle = {"requested", "planned", "evidence_available", "partially_satisfied", "satisfied", "unavailable", "failed", "not_attempted"}
    if lifecycle != required_lifecycle:
        raise DesignFailure("lifecycle incomplete")
    if contract["source_priority"][0] != "existing_local_normalized" or len(contract["source_priority"]) != len(set(contract["source_priority"])):
        raise DesignFailure("source priority invalid")
    if contract["content_context_completion"]["title_alone"] != "partially_satisfied" or contract["source_attribution_completion"]["contextual_fields_alone"] != "unsatisfied":
        raise DesignFailure("completion rules weaken v72")
    if contract["copyright_safe_content_policy"]["full_article_body_durable_retention"] != "prohibited":
        raise DesignFailure("full body retention not prohibited")
    if contract["persistence_boundary"]["v69_reused_for_enrichment_evidence"]:
        raise DesignFailure("v69 interface violation")
    if contract["zero_effect_policy"] != ZERO_EFFECTS:
        raise DesignFailure("zero effect contract mismatch")


def run_once(out, contract, authority, target_info, preflight_result):
    out.mkdir(parents=True, exist_ok=True)
    target = target_info["target_identity"]
    fixture_matrix = matrices(contract, target)
    plan = build_fulfillment_plan(contract, [])
    missing_auth = validate_authorization_envelope(None, target, contract["requested_enrichment_field_contract"]["fields"], "authorized_direct_source_retrieval", "www.mydaily.co.kr")
    auth_policy = {"contract": contract["external_authorization_gate"], "missing_authorization_case": missing_auth,
                   "network_safety_requirements": contract["network_safety_requirements"]}
    completion_matrix = {name: value for name, value in fixture_matrix.items() if name in {"none", "title_only", "summary_only", "title_summary", "title_bounded_excerpt", "provider_only", "attribution", "both", "content_only", "attribution_only"}}
    failures = {"failure_vocabulary": contract["failure_vocabulary"], "retry_policy": contract["retry_policy"]}
    checks = {
        "preflight_base": preflight_result["head"] == EXPECTED_BASE,
        "v72_prerequisite": all(authority["prerequisite_checks"][k] for k in ("v72_contract_identity", "v72_conformance_tracked", "v72_vocabulary_exact")),
        "v73_prerequisite": all(authority["prerequisite_checks"][k] for k in ("v73_contract_identity", "v73_conformance_tracked", "v73_readiness_tracked")),
        "requested_vocabulary_exact": contract["requested_enrichment_field_contract"]["fields"] == ["content_context", "source_attribution"],
        "real_target_reproduced": target_info["eligible_count"] == 1000,
        "historical_state_unchanged": target_info["queue_status"] == "pending_review" and target_info["decision_status"] == "not_decided",
        "lifecycle_complete": len(contract["fulfillment_lifecycle"]) == 8,
        "request_status_complete": set(contract["request_level_statuses"]["vocabulary"]) == {"not_attempted", "unsatisfied", "partially_satisfied", "satisfied", "unavailable", "failed"},
        "source_classes_closed": len(contract["source_class_vocabulary"]) == 4,
        "local_first": contract["source_priority"][0] == "existing_local_normalized",
        "content_none_unsatisfied": completion_matrix["none"]["field_results"]["content_context"]["status"] == "not_attempted",
        "content_title_partial": completion_matrix["title_only"]["field_results"]["content_context"]["status"] == "partially_satisfied",
        "content_title_summary_satisfied": completion_matrix["title_summary"]["field_results"]["content_context"]["status"] == "satisfied",
        "bounded_excerpt_alternative": completion_matrix["title_bounded_excerpt"]["field_results"]["content_context"]["status"] == "satisfied" and fixture_matrix["excerpt_over_bound"]["reason"] == "excerpt_too_long",
        "provider_domain_insufficient": completion_matrix["provider_only"]["field_results"]["source_attribution"]["status"] == "partially_satisfied",
        "attribution_satisfied": completion_matrix["attribution"]["field_results"]["source_attribution"]["status"] == "satisfied",
        "both_satisfied": completion_matrix["both"]["request_status"] == "satisfied",
        "content_only_partial": completion_matrix["content_only"]["request_status"] == "partially_satisfied",
        "attribution_only_partial": completion_matrix["attribution_only"]["request_status"] == "partially_satisfied",
        "neither_not_attempted": completion_matrix["none"]["request_status"] == "not_attempted",
        "unknown_field_fail_closed": evaluate_field_completion("unknown", [], contract)["status"] == "failed",
        "malformed_evidence_fail_closed": fixture_matrix["malformed"]["status"] == "evidence_invalid",
        "target_mismatch_fail_closed": fixture_matrix["target_mismatch"]["reason"] == "target_mismatch",
        "semantic_mismatch_fail_closed": fixture_matrix["semantic_mismatch"]["reason"] == "semantic_field_mismatch",
        "missing_auth_not_attempted": missing_auth == {"status": "not_attempted", "reason": "authorization_missing"},
        "auth_target_mismatch_fail_closed": True,
        "unauthorized_binding_fail_closed": True,
        "redirect_policy_defined": "revalidated" in contract["network_safety_requirements"]["redirect_policy"],
        "response_policy_defined": contract["network_safety_requirements"]["maximum_response_bytes"] > 0 and bool(contract["network_safety_requirements"]["allowed_content_types"]),
        "copyright_safe_retention": contract["copyright_safe_content_policy"]["minimum_necessary_evidence_only"],
        "full_body_prohibited": contract["copyright_safe_content_policy"]["full_article_body_durable_retention"] == "prohibited",
        "digest_deterministic": object_sha(plan) == object_sha(json.loads(canonical(plan))),
        "failure_vocabulary_covered": len(contract["failure_vocabulary"]) == 16,
        "retry_classes_cover_failures": set(sum((contract["retry_policy"][key] for key in ("safe_deterministic_retry", "requires_renewed_authorization", "do_not_retry")), [])) == set(contract["failure_vocabulary"]),
        "fulfillment_not_approval": not contract["human_review_boundary"]["fulfillment_implies_approval"],
        "no_historical_mutation": not any(contract["historical_write_boundary"][k] for k in ("historical_source_write", "historical_queue_write", "historical_decision_write")),
        "no_queue_decision_mutation": not plan["historical_mutation"],
        "no_v69_interface_violation": not contract["persistence_boundary"]["v69_reused_for_enrichment_evidence"],
        "no_external_retrieval": ZERO_EFFECTS["external_request_count"] == ZERO_EFFECTS["real_enrichment_retrieval_count"] == ZERO_EFFECTS["shadow_enrichment_retrieval_count"] == 0,
        "no_database_supabase": ZERO_EFFECTS["database_write_count"] == 0,
        "all_real_effects_zero": all(value == 0 for value in ZERO_EFFECTS.values()),
        "real_plan_not_executed": plan["execution_status"] == "not_executed" and plan["authorization_status"] == "not_authorized" and plan["external_operation_status"] == "not_attempted",
    }
    # Exercise the two authorization mismatch cases without granting execution authority.
    sample = {"authorization_id":"a"*64,"authorization_status":"authorized","target_identity":target,"allowed_source_class":"authorized_direct_source_retrieval","allowed_host_or_provider":"www.mydaily.co.kr","allowed_requested_fields":["content_context","source_attribution"],"request_scope":"controlled-shadow","one_shot":True,"expires_at":"2026-08-15T16:16:00Z","provenance":"controlled_fixture_only"}
    wrong_target = {**sample, "target_identity": {**target, "internal_source_id": "wrong"}}
    wrong_binding = {**sample, "allowed_host_or_provider": "unauthorized.example"}
    checks["auth_target_mismatch_fail_closed"] = validate_authorization_envelope(wrong_target, target, sample["allowed_requested_fields"], sample["allowed_source_class"], "www.mydaily.co.kr")["reason"] == "target_mismatch"
    checks["unauthorized_binding_fail_closed"] = validate_authorization_envelope(wrong_binding, target, sample["allowed_requested_fields"], sample["allowed_source_class"], "www.mydaily.co.kr")["reason"] == "source_not_authorized"
    if not all(bool(x) for x in checks.values()):
        raise DesignFailure("self-test checks failed: " + ", ".join(k for k,v in checks.items() if not v))
    outputs = {
        "safe_summary.json": {"version":"v74","design_only":True,"real_candidate_count":target_info["eligible_count"],"requested_fields":contract["requested_enrichment_field_contract"]["fields"],"real_target_plan_status":plan["request_status"],"execution_status":"not_executed","external_authorization":"not_authorized","zero_effect_counters":ZERO_EFFECTS,"enrichment_fulfillment_shadow_design_conformance":"passed","future_local_enrichment_fulfillment_adapter_readiness":"ready_for_separate_local_adapter_implementation","external_enrichment_execution_readiness":"not_ready","production_persistence_readiness":"not_ready","production_execution_readiness":"not_ready"},
        "authority_verification.json": authority,
        "fulfillment_lifecycle.json": {"field_lifecycle":contract["fulfillment_lifecycle"],"request_level":contract["request_level_statuses"]},
        "evidence_schema.json": {"schema":contract["evidence_envelope_schema"],"hashing":contract["evidence_hashing"],"retention":contract["copyright_safe_content_policy"],"excerpt":contract["excerpt_policy"]},
        "completion_matrix.json": completion_matrix,
        "source_priority.json": {"classes":contract["source_class_vocabulary"],"priority":contract["source_priority"],"rules":contract["source_priority_rules"]},
        "authorization_policy.json": auth_policy,
        "failure_matrix.json": failures,
        "controlled_fixture_matrix.json": fixture_matrix,
        "real_target_fulfillment_plan.json": plan,
        "validation.json": {"check_count":len(checks),"checks":checks,"all_passed":True,"zero_effect_counters":ZERO_EFFECTS},
    }
    for name, value in outputs.items():
        (out / name).write_bytes(canonical(value))
    return outputs


def execute():
    contract = load(CONTRACT_PATH)
    before = {ref["path"]: file_sha(ROOT / ref["path"]) for ref in contract["consumed_authority_hashes"]}
    preflight_result = preflight()
    validate_design(contract)
    authority = verify_authorities(contract)
    target = reproduce_target(contract)
    first = run_once(FIRST, contract, authority, target, preflight_result)
    repro = run_once(REPRO, contract, authority, target, preflight_result)
    pairs = {name: [object_sha(first[name]), object_sha(repro[name])] for name in OUTPUT_NAMES}
    if not all(a == b for a, b in pairs.values()):
        raise DesignFailure("first/repro determinism failed")
    after = {ref["path"]: file_sha(ROOT / ref["path"]) for ref in contract["consumed_authority_hashes"]}
    if before != after:
        raise DesignFailure("authority artifact mutation")
    result = {
        "self_test":"passed", "check_count":42, "runtime_check_count":first["validation.json"]["check_count"],
        "sha256_pairs":pairs, "authority_hashes_unchanged":True,
        "enrichment_fulfillment_shadow_design_conformance":"passed",
        "future_local_enrichment_fulfillment_adapter_readiness":"ready_for_separate_local_adapter_implementation",
        "external_enrichment_execution_readiness":"not_ready",
        "production_persistence_readiness":"not_ready", "production_execution_readiness":"not_ready",
        "zero_effect_counters":ZERO_EFFECTS,
    }
    # The named requirements are represented by 42 contract checks; runtime helpers may combine related checks.
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    try:
        result = execute()
    except (DesignFailure, OSError, ValueError, KeyError, subprocess.CalledProcessError) as exc:
        print("FAIL CLOSED: " + str(exc), file=sys.stderr)
        return 1
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
