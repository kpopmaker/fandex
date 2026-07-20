"""Validate local human-review decisions and build a no-write dry-run preview."""

import argparse
import json
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
import re


def canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def digest(*parts):
    return hashlib.sha256("\n".join(str(part) for part in parts).encode("utf-8")).hexdigest()


def duplicates(values):
    counts = Counter(values)
    return sorted(value for value, count in counts.items() if count > 1)


def is_nonempty_string(value):
    return isinstance(value, str) and bool(value.strip())


ISO_8601 = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$")


def is_iso_8601(value):
    if not isinstance(value, str) or not ISO_8601.fullmatch(value):
        return False
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return True
    except ValueError:
        return False


def load_json(path):
    with Path(path).open(encoding="utf-8") as handle:
        return json.load(handle)


def contract_errors(input_contract, application_contract):
    errors = []
    required_input = ["contract_version", "decision_intents", "gate_status_rules", "rationale_codes", "required_fields", "optional_fields"]
    for field in required_input:
        if field not in input_contract:
            errors.append(f"input_contract_missing_{field}")
    if input_contract.get("scope") != "local_sandbox_preview_only":
        errors.append("input_contract_invalid_scope")
    if input_contract.get("production_policy") is not False:
        errors.append("input_contract_production_policy_must_be_false")
    intents = input_contract.get("decision_intents", [])
    if "not_decided" not in intents:
        errors.append("input_contract_missing_not_decided")
    for field in ("decision_intents", "rationale_codes", "required_fields", "optional_fields"):
        values = input_contract.get(field, [])
        if not isinstance(values, list) or duplicates(values):
            errors.append(f"input_contract_duplicate_or_invalid_{field}")
    gate_rules = input_contract.get("gate_status_rules", [])
    expected_statuses = {"approval_candidate", "exception_review_required", "manual_review_required", "blocked"}
    statuses = [rule.get("gate_status") for rule in gate_rules if isinstance(rule, dict)]
    if set(statuses) != expected_statuses or duplicates(statuses):
        errors.append("input_contract_invalid_gate_status_rules")

    for field in ("contract_version", "input_contract_version", "effects", "intent_rules"):
        if field not in application_contract:
            errors.append(f"application_contract_missing_{field}")
    if application_contract.get("input_contract_version") != input_contract.get("contract_version"):
        errors.append("application_contract_input_version_mismatch")
    if application_contract.get("scope") != "local_sandbox_preview_only":
        errors.append("application_contract_invalid_scope")
    if application_contract.get("production_policy") is not False:
        errors.append("application_contract_production_policy_must_be_false")
    if application_contract.get("dry_run_only") is not True:
        errors.append("application_contract_dry_run_only_must_be_true")
    effects = application_contract.get("effects", [])
    if not isinstance(effects, list) or duplicates(effects):
        errors.append("application_contract_duplicate_or_invalid_effects")
    if any(effect != "no_change" and not str(effect).startswith("would_") for effect in effects):
        errors.append("application_contract_effect_not_preview_only")
    app_rules = application_contract.get("intent_rules", [])
    app_intents = [rule.get("decision_intent") for rule in app_rules if isinstance(rule, dict)]
    if duplicates(app_intents):
        errors.append("application_contract_duplicate_intent_rules")
    if set(app_intents) != set(intents):
        errors.append("application_contract_intent_set_mismatch")
    input_gate_map = {rule.get("gate_status"): set(rule.get("allowed_decision_intents", [])) for rule in gate_rules if isinstance(rule, dict)}
    rationale_set = set(input_contract.get("rationale_codes", []))
    for rule in app_rules:
        if not isinstance(rule, dict):
            errors.append("application_contract_invalid_intent_rule")
            continue
        intent = rule.get("decision_intent")
        if rule.get("dry_run_effect") not in effects:
            errors.append(f"application_contract_unknown_effect:{intent}")
        allowed_statuses = rule.get("allowed_gate_statuses", [])
        if not isinstance(allowed_statuses, list) or duplicates(allowed_statuses):
            errors.append(f"application_contract_invalid_gate_statuses:{intent}")
        expected = {status for status, allowed in input_gate_map.items() if intent in allowed}
        if set(allowed_statuses) != expected:
            errors.append(f"application_contract_gate_status_conflict:{intent}")
        allowed_rationales = rule.get("allowed_rationale_codes", [])
        if not isinstance(allowed_rationales, list) or duplicates(allowed_rationales) or not set(allowed_rationales).issubset(rationale_set):
            errors.append(f"application_contract_invalid_rationale_codes:{intent}")
    return sorted(set(errors))


def linkage_errors(queue, decisions, gates, queue_summary):
    errors = []
    for label, records in (("queue", queue), ("decision", decisions)):
        if not isinstance(records, list):
            return [f"{label}_must_be_array"]
        for field in ("queue_item_id", "internal_source_id", "gate_id"):
            values = [item.get(field) for item in records]
            if any(not is_nonempty_string(value) for value in values):
                errors.append(f"{label}_missing_{field}")
            if duplicates(values):
                errors.append(f"{label}_duplicate_{field}")
    if not isinstance(gates, list):
        errors.append("gate_must_be_array")
        return errors
    gate_ids = [item.get("gate_id") for item in gates]
    if duplicates(gate_ids):
        errors.append("gate_duplicate_gate_id")
    queue_by_id = {item.get("queue_item_id"): item for item in queue}
    decision_by_id = {item.get("queue_item_id"): item for item in decisions}
    if set(queue_by_id) != set(decision_by_id):
        errors.append("queue_decision_set_mismatch")
    for queue_id in sorted(set(queue_by_id) & set(decision_by_id)):
        q_item, d_item = queue_by_id[queue_id], decision_by_id[queue_id]
        for field in ("internal_source_id", "gate_id", "queue_item_id"):
            if q_item.get(field) != d_item.get(field):
                errors.append(f"decision_{field}_mismatch:{queue_id}")
    gate_by_id = {item.get("gate_id"): item for item in gates}
    for item in queue:
        gate = gate_by_id.get(item.get("gate_id"))
        if gate is None:
            errors.append(f"queue_gate_missing:{item.get('queue_item_id')}")
        elif gate.get("gate_status") != item.get("gate_status"):
            errors.append(f"queue_gate_status_mismatch:{item.get('queue_item_id')}")
    if queue_summary.get("active_queue_count") != len(queue):
        errors.append("queue_summary_active_count_mismatch")
    if queue_summary.get("decision_template_entry_count") != len(decisions):
        errors.append("queue_summary_decision_count_mismatch")
    if queue_summary.get("total_gate_records") != len(gates):
        errors.append("queue_summary_gate_count_mismatch")
    return sorted(set(errors))


def validate_entry(decision, gate_status, input_contract, application_contract):
    reasons = []
    intents = set(input_contract["decision_intents"])
    input_gate_map = {rule["gate_status"]: set(rule["allowed_decision_intents"]) for rule in input_contract["gate_status_rules"]}
    app_rule_map = {rule["decision_intent"]: rule for rule in application_contract["intent_rules"]}
    intent = decision.get("decision_intent")
    if intent not in intents:
        reasons.append("unknown_decision_intent")
    if intent not in input_gate_map.get(gate_status, set()):
        reasons.append("decision_intent_not_allowed_for_gate_status")
    rule = app_rule_map.get(intent)
    if rule is None:
        reasons.append("missing_application_intent_rule")
    rationales = decision.get("rationale_codes")
    if not isinstance(rationales, list):
        reasons.append("rationale_codes_not_array")
        rationales = []
    else:
        if duplicates(rationales):
            reasons.append("duplicate_rationale_code")
        if any(code not in input_contract["rationale_codes"] for code in rationales):
            reasons.append("unknown_rationale_code")
    enrichment = decision.get("requested_enrichment_fields")
    if not isinstance(enrichment, list):
        reasons.append("requested_enrichment_fields_not_array")
        enrichment = []
    elif duplicates(enrichment):
        reasons.append("duplicate_requested_enrichment_field")
    note = decision.get("reviewer_note")
    if note is not None and not isinstance(note, str):
        reasons.append("reviewer_note_invalid_type")
    reviewed_at = decision.get("reviewed_at")
    if reviewed_at is not None and not is_iso_8601(reviewed_at):
        reasons.append("reviewed_at_invalid_iso_8601")
    reviewer = decision.get("reviewer_id")
    if intent == "not_decided":
        if reviewer is not None:
            reasons.append("not_decided_reviewer_must_be_null")
        if rationales:
            reasons.append("not_decided_rationale_codes_must_be_empty")
        if note is not None:
            reasons.append("not_decided_reviewer_note_must_be_null")
        if reviewed_at is not None:
            reasons.append("not_decided_reviewed_at_must_be_null")
        if enrichment:
            reasons.append("not_decided_enrichment_fields_must_be_empty")
    elif intent in intents:
        if not is_nonempty_string(reviewer):
            reasons.append("reviewer_required")
        if not rationales:
            reasons.append("rationale_required")
        if rule and not set(rationales).intersection(rule.get("allowed_rationale_codes", [])):
            reasons.append("intent_specific_rationale_required")
        if intent == "request_enrichment":
            if not enrichment:
                reasons.append("enrichment_fields_required")
        elif enrichment:
            reasons.append("enrichment_fields_not_allowed")
    effect = rule.get("dry_run_effect") if rule else "no_change"
    return sorted(set(reasons)), effect


def build_outputs(input_contract, application_contract, queue, decisions, gates, queue_summary):
    queue_by_id = {item["queue_item_id"]: item for item in queue}
    decision_by_id = {item["queue_item_id"]: item for item in decisions}
    validation = []
    for queue_id in sorted(queue_by_id):
        q_item = queue_by_id[queue_id]
        decision = decision_by_id[queue_id]
        input_hash = hashlib.sha256(canonical_bytes(decision)).hexdigest()
        reasons, effect = validate_entry(decision, q_item["gate_status"], input_contract, application_contract)
        validation_id = digest(application_contract["contract_version"], queue_id, input_hash)
        validation.append({
            "validation_id": validation_id, "queue_item_id": queue_id,
            "internal_source_id": q_item["internal_source_id"], "gate_id": q_item["gate_id"],
            "gate_status": q_item["gate_status"], "decision_intent": decision.get("decision_intent"),
            "validation_status": "invalid" if reasons else "valid", "validation_reason_codes": reasons,
            "dry_run_effect": effect, "reviewer_present": is_nonempty_string(decision.get("reviewer_id")),
            "rationale_code_count": len(decision.get("rationale_codes")) if isinstance(decision.get("rationale_codes"), list) else 0,
            "requested_enrichment_field_count": len(decision.get("requested_enrichment_fields")) if isinstance(decision.get("requested_enrichment_fields"), list) else 0,
            "decision_input_hash": input_hash,
        })
    dry_run = []
    for item in validation:
        if item["validation_status"] != "valid":
            continue
        dry_run.append({
            "dry_run_id": digest(application_contract["contract_version"], item["validation_id"], item["dry_run_effect"]),
            "validation_id": item["validation_id"], "queue_item_id": item["queue_item_id"],
            "internal_source_id": item["internal_source_id"], "gate_id": item["gate_id"],
            "gate_status": item["gate_status"], "decision_intent": item["decision_intent"],
            "dry_run_effect": item["dry_run_effect"],
            "actionability_status": "no_action" if item["decision_intent"] == "not_decided" else "would_require_explicit_application",
            "production_write_status": "not_written", "approval_snapshot_status": "not_created",
            "audit_event_status": "not_created", "score_application_status": "not_applied",
            "decision_input_hash": item["decision_input_hash"],
        })
    queue_ids, decision_ids = set(queue_by_id), set(decision_by_id)
    intent_counts = Counter(item.get("decision_intent") for item in decisions)
    effect_counts = Counter(item["dry_run_effect"] for item in dry_run)
    reason_counts = Counter(reason for item in validation for reason in item["validation_reason_codes"])
    gate_intents = {}
    for item in validation:
        gate_intents.setdefault(item["gate_status"], Counter())[item["decision_intent"]] += 1
    invalid_samples = [{key: item[key] for key in ("queue_item_id", "internal_source_id", "gate_status", "decision_intent", "validation_reason_codes")} for item in validation if item["validation_status"] == "invalid"][:20]
    summary = {
        "input_contract_version": input_contract["contract_version"], "application_contract_version": application_contract["contract_version"],
        "scope": application_contract["scope"], "production_policy": False, "dry_run_only": True,
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "total_queue_items": len(queue), "total_decision_entries": len(decisions),
        "valid_decision_count": sum(item["validation_status"] == "valid" for item in validation),
        "invalid_decision_count": sum(item["validation_status"] == "invalid" for item in validation),
        "not_decided_count": intent_counts["not_decided"], "actionable_decision_count": len(decisions) - intent_counts["not_decided"],
        "no_change_count": effect_counts["no_change"],
        "would_record_approval_decision_count": effect_counts["would_record_approval_decision"],
        "would_record_exception_acceptance_count": effect_counts["would_record_exception_acceptance"],
        "would_record_rejection_count": effect_counts["would_record_rejection"],
        "would_record_deferral_count": effect_counts["would_record_deferral"],
        "would_record_enrichment_request_count": effect_counts["would_record_enrichment_request"],
        "production_write_count": 0, "approval_snapshot_created_count": 0, "audit_event_created_count": 0, "score_application_count": 0,
        "missing_decision_entry_count": len(queue_ids - decision_ids), "extra_decision_entry_count": len(decision_ids - queue_ids),
        "duplicate_queue_item_id_count": len(duplicates(item.get("queue_item_id") for item in queue)),
        "duplicate_decision_entry_id_count": len(duplicates(item.get("queue_item_id") for item in decisions)),
        "duplicate_validation_id_count": len(duplicates(item["validation_id"] for item in validation)),
        "duplicate_dry_run_id_count": len(duplicates(item["dry_run_id"] for item in dry_run)),
        "gate_status_decision_intent_counts": {status: dict(sorted(counts.items())) for status, counts in sorted(gate_intents.items())},
        "validation_reason_code_counts": dict(sorted(reason_counts.items())), "dry_run_effect_counts": dict(sorted(effect_counts.items())),
        "invalid_samples": invalid_samples,
        "deterministic_validation_sha256": hashlib.sha256(canonical_bytes(validation)).hexdigest(),
        "deterministic_dry_run_sha256": hashlib.sha256(canonical_bytes(dry_run)).hexdigest(),
    }
    return validation, dry_run, summary


def write_json(path, value):
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def self_test():
    input_contract = load_json(Path(__file__).with_name("human_review_decision_contract.preview.json"))
    app_contract = load_json(Path(__file__).with_name("human_review_decision_application_contract.preview.json"))
    assert not contract_errors(input_contract, app_contract)
    base = {"internal_source_id": "source-1", "gate_id": "gate-1", "queue_item_id": "queue-1", "gate_status": "exception_review_required", "decision_intent": "not_decided", "reviewer_id": None, "rationale_codes": [], "reviewer_note": None, "reviewed_at": None, "requested_enrichment_fields": []}
    def check(changes, gate, valid, effect=None):
        item = dict(base); item.update(changes)
        before = canonical_bytes(item)
        reasons, actual_effect = validate_entry(item, gate, input_contract, app_contract)
        assert (not reasons) is valid, (changes, reasons)
        if effect: assert actual_effect == effect
        assert canonical_bytes(item) == before
    check({}, "exception_review_required", True, "no_change")
    check({"reviewer_id": "reviewer"}, "exception_review_required", False)
    check({"rationale_codes": ["insufficient_evidence"]}, "exception_review_required", False)
    check({"decision_intent": "approve_candidate", "reviewer_id": "r", "rationale_codes": ["metadata_verified"]}, "approval_candidate", True, "would_record_approval_decision")
    check({"decision_intent": "accept_exception", "reviewer_id": "r", "rationale_codes": ["provider_attribution_unavailable_verified"]}, "exception_review_required", True, "would_record_exception_acceptance")
    check({"decision_intent": "approve_candidate", "reviewer_id": "r", "rationale_codes": ["metadata_verified"]}, "exception_review_required", False)
    check({"decision_intent": "accept_exception", "reviewer_id": "r", "rationale_codes": ["provider_attribution_unavailable_verified"]}, "approval_candidate", False)
    check({"decision_intent": "reject", "reviewer_id": "r", "rationale_codes": ["unreliable_source"]}, "blocked", True, "would_record_rejection")
    check({"decision_intent": "reject", "rationale_codes": ["unreliable_source"]}, "blocked", False)
    check({"decision_intent": "reject", "reviewer_id": "r"}, "blocked", False)
    check({"decision_intent": "defer", "reviewer_id": "r", "rationale_codes": ["defer_for_later_review"]}, "manual_review_required", True, "would_record_deferral")
    check({"decision_intent": "request_enrichment", "reviewer_id": "r", "rationale_codes": ["enrichment_required"], "requested_enrichment_fields": ["author"]}, "blocked", True, "would_record_enrichment_request")
    check({"decision_intent": "request_enrichment", "reviewer_id": "r", "rationale_codes": ["enrichment_required"]}, "blocked", False)
    check({"decision_intent": "invented", "reviewer_id": "r", "rationale_codes": ["source_relevant"]}, "blocked", False)
    check({"decision_intent": "reject", "reviewer_id": "r", "rationale_codes": ["invented"]}, "blocked", False)
    check({"decision_intent": "reject", "reviewer_id": "r", "rationale_codes": ["unreliable_source", "unreliable_source"]}, "blocked", False)
    queue = [{"queue_item_id": "queue-1", "internal_source_id": "source-1", "gate_id": "gate-1", "gate_status": "exception_review_required"}]
    gates = [{"gate_id": "gate-1", "gate_status": "exception_review_required"}]
    summary = {"active_queue_count": 1, "decision_template_entry_count": 1, "total_gate_records": 1}
    assert not linkage_errors(queue, [base], gates, summary)
    broken = dict(base); broken["gate_id"] = "wrong"
    assert linkage_errors(queue, [broken], gates, summary)
    actionable_effects = [rule["dry_run_effect"] for rule in app_contract["intent_rules"] if rule["decision_intent"] != "not_decided"]
    assert all(effect.startswith("would_") for effect in actionable_effects)
    print("self-test passed: 18 synthetic validation cases; no files written")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-contract-file")
    parser.add_argument("--application-contract-file")
    parser.add_argument("--queue-file")
    parser.add_argument("--queue-summary-file")
    parser.add_argument("--decision-file")
    parser.add_argument("--gate-file")
    parser.add_argument("--validation-output-file")
    parser.add_argument("--dry-run-output-file")
    parser.add_argument("--summary-output-file")
    parser.add_argument("--require-all-not-decided", action="store_true")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    required = ["input_contract_file", "application_contract_file", "queue_file", "queue_summary_file", "decision_file", "gate_file", "validation_output_file", "dry_run_output_file", "summary_output_file"]
    missing = [name.replace("_", "-") for name in required if not getattr(args, name)]
    if missing:
        parser.error("missing required arguments: " + ", ".join(missing))
    try:
        input_contract = load_json(args.input_contract_file)
        application_contract = load_json(args.application_contract_file)
        queue = load_json(args.queue_file)
        queue_summary = load_json(args.queue_summary_file)
        decisions = load_json(args.decision_file)
        gates = load_json(args.gate_file)
    except (OSError, json.JSONDecodeError) as error:
        print(f"input error: {error}")
        raise SystemExit(1)
    errors = contract_errors(input_contract, application_contract)
    if errors:
        print("contract validation failed: " + ", ".join(errors))
        raise SystemExit(1)
    if args.require_all_not_decided:
        non_blank_count = sum(item.get("decision_intent") != "not_decided" for item in decisions)
        if non_blank_count:
            print(f"protected decision input detected: non-not-decided count={non_blank_count}")
            raise SystemExit(1)
    errors = linkage_errors(queue, decisions, gates, queue_summary)
    if errors:
        print("linkage validation failed: " + ", ".join(errors))
        raise SystemExit(1)
    validation, dry_run, summary = build_outputs(input_contract, application_contract, queue, decisions, gates, queue_summary)
    write_json(args.validation_output_file, validation)
    write_json(args.dry_run_output_file, dry_run)
    write_json(args.summary_output_file, summary)
    print(f"validation complete: valid={summary['valid_decision_count']} invalid={summary['invalid_decision_count']} no_change={summary['no_change_count']}")


if __name__ == "__main__":
    main()
