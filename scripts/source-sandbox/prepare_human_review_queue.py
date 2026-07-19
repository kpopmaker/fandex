"""Prepare a deterministic local-only human review queue and empty template."""

import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


CONTRACT_FILENAME = "human_review_decision_contract.preview.json"
GATE_STATUSES = {
    "approval_candidate",
    "exception_review_required",
    "manual_review_required",
    "blocked",
}
ACTIVE_GATE_STATUSES = {
    "exception_review_required",
    "manual_review_required",
    "blocked",
}
CATEGORY_BY_GATE = {
    "exception_review_required": "exception_review",
    "manual_review_required": "manual_review",
    "blocked": "blocked_review",
}
CATEGORY_ORDER = {"exception_review": 0, "manual_review": 1, "blocked_review": 2}
SOURCE_TYPE_ORDER = {"news": 0, "blog": 1}
REQUIRED_CONTRACT_KEYS = {
    "contract_version",
    "scope",
    "production_policy",
    "description",
    "decision_intents",
    "gate_status_rules",
    "required_fields",
    "optional_fields",
    "rationale_codes",
}


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def present(value):
    return isinstance(value, str) and bool(value.strip())


def stable_hash(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def duplicate_count(values):
    return sum(count - 1 for count in Counter(values).values() if count > 1)


def duplicates(values):
    return sorted(value for value, count in Counter(values).items() if count > 1)


def validate_contract(contract):
    errors = []
    if not isinstance(contract, dict):
        return ["contract top level is not an object"], {}
    missing = sorted(REQUIRED_CONTRACT_KEYS - set(contract))
    if missing:
        errors.append(f"contract is missing keys: {', '.join(missing)}")
    if not present(contract.get("contract_version")):
        errors.append("contract_version is missing")
    if contract.get("scope") != "local_sandbox_preview_only":
        errors.append("contract scope is not local_sandbox_preview_only")
    if contract.get("production_policy") is not False:
        errors.append("contract production_policy is not false")

    decision_intents = contract.get("decision_intents")
    if not isinstance(decision_intents, list) or not all(
        present(value) for value in decision_intents
    ):
        errors.append("decision_intents is not a string array")
        decision_intents = []
    elif duplicates(decision_intents):
        errors.append("decision_intents contains duplicates")
    if "not_decided" not in decision_intents:
        errors.append("decision_intents does not contain not_decided")

    rule_map = {}
    rules = contract.get("gate_status_rules")
    if not isinstance(rules, list):
        errors.append("gate_status_rules is not an array")
        rules = []
    for index, rule in enumerate(rules, start=1):
        if not isinstance(rule, dict):
            errors.append(f"gate status rule {index} is not an object")
            continue
        status = rule.get("gate_status")
        allowed = rule.get("allowed_decision_intents")
        if status in rule_map:
            errors.append(f"duplicate gate status rule: {status}")
        else:
            rule_map[status] = rule
        if status not in GATE_STATUSES:
            errors.append(f"unsupported gate status rule: {status}")
        if not isinstance(allowed, list) or not all(value in decision_intents for value in allowed):
            errors.append(f"gate status rule {status} has invalid decision intents")
    for status in sorted(GATE_STATUSES - set(rule_map)):
        errors.append(f"missing gate status rule: {status}")

    for field_name in ("required_fields", "optional_fields", "rationale_codes"):
        values = contract.get(field_name)
        if not isinstance(values, list) or not all(present(value) for value in values):
            errors.append(f"{field_name} is not a string array")
        elif duplicates(values):
            errors.append(f"{field_name} contains duplicates")
    return errors, rule_map


def validate_decision(entry, gate_status, contract, rule_map):
    errors = []
    if not isinstance(entry, dict):
        return ["decision entry is not an object"]
    for field in contract["required_fields"]:
        if field not in entry or entry[field] is None:
            errors.append(f"required decision field is missing: {field}")
    intent = entry.get("decision_intent")
    if intent not in contract["decision_intents"]:
        errors.append("decision_intent is not defined by the contract")
        return errors
    rule = rule_map.get(gate_status)
    if rule is None or intent not in rule["allowed_decision_intents"]:
        errors.append(f"decision_intent {intent} is not allowed for {gate_status}")
    rationale_codes = entry.get("rationale_codes")
    if not isinstance(rationale_codes, list):
        errors.append("rationale_codes is not an array")
        rationale_codes = []
    invalid_codes = sorted(set(rationale_codes) - set(contract["rationale_codes"]))
    if invalid_codes:
        errors.append(f"undefined rationale codes: {', '.join(invalid_codes)}")
    if intent != "not_decided":
        if not present(entry.get("reviewer_id")):
            errors.append("reviewer_id is required for a decision")
        if not rationale_codes:
            errors.append("at least one rationale code is required for a decision")
    conditional = contract.get("conditional_requirements", [])
    for condition in conditional:
        if condition.get("when_decision_intent_is") == intent:
            required_any = set(condition.get("requires_any_rationale_codes", []))
            if required_any and not required_any.intersection(rationale_codes):
                errors.append(f"{intent} requires a matching conditional rationale code")
    return errors


def validate_inputs(normalized, mappings, quality, gates, gate_summary, args, rule_map):
    errors = []
    payloads = (
        ("normalized", normalized),
        ("mappings", mappings),
        ("quality preview", quality),
        ("gate preview", gates),
    )
    for label, values in payloads:
        if not isinstance(values, list):
            errors.append(f"{label} top level is not an array")
    if errors:
        return errors
    if not isinstance(gate_summary, dict):
        return ["gate summary top level is not an object"]

    id_sets = []
    identity_fields = (
        ("normalized", normalized, None),
        ("mapping", mappings, "mapping_id"),
        ("quality preview", quality, "preview_id"),
        ("gate preview", gates, "gate_id"),
    )
    for label, records, unique_field in identity_fields:
        source_ids = []
        unique_values = []
        for index, record in enumerate(records, start=1):
            if not isinstance(record, dict):
                errors.append(f"{label} record {index} is not an object")
                continue
            source_id = record.get("internal_source_id")
            if not present(source_id):
                errors.append(f"{label} record {index} internal_source_id is missing")
            else:
                source_ids.append(source_id)
            if unique_field:
                value = record.get(unique_field)
                if not present(value):
                    errors.append(f"{label} record {index} {unique_field} is missing")
                else:
                    unique_values.append(value)
            if record.get("provider_key") != "naver":
                errors.append(f"{label} record {index} provider_key is unsupported")
            if record.get("source_type") not in {"news", "blog"}:
                errors.append(f"{label} record {index} source_type is unsupported")
            if record.get("artist_name") != args.artist_name:
                errors.append(f"{label} record {index} artist_name mismatch")
            if record.get("artist_slug") != args.artist_slug:
                errors.append(f"{label} record {index} artist_slug mismatch")
            if label != "normalized" and record.get("sandbox_artist_key") != args.sandbox_artist_key:
                errors.append(f"{label} record {index} sandbox_artist_key mismatch")
        if duplicate_count(source_ids):
            errors.append(f"{label} internal_source_id values are not unique")
        if unique_field and duplicate_count(unique_values):
            errors.append(f"{label} {unique_field} values are not unique")
        id_sets.append(set(source_ids))
    if not all(id_set == id_sets[0] for id_set in id_sets[1:]):
        errors.append("normalized, mapping, quality, and gate ID sets do not match")
    if any(record.get("decision_status") != "not_decided" for record in gates):
        errors.append("gate preview contains a decided record")
    if any(record.get("gate_status") not in rule_map for record in gates):
        errors.append("gate preview contains a status without a contract rule")
    if gate_summary.get("total_gate_records") != len(gates):
        errors.append("gate summary count does not match gate preview")
    return errors


def clean_excerpt(value):
    if not isinstance(value, str):
        return None
    cleaned = " ".join(value.split())
    return cleaned[:200] if cleaned else None


def queue_sort_key(record):
    published = record.get("published_at")
    return (
        CATEGORY_ORDER[record["review_category"]],
        SOURCE_TYPE_ORDER[record["source_type"]],
        0 if present(published) else 1,
        published or "",
        record["internal_source_id"],
    )


def build_queue(normalized, mappings, quality, gates, contract):
    item_by_id = {item["internal_source_id"]: item for item in normalized}
    mapping_by_id = {item["internal_source_id"]: item for item in mappings}
    preview_by_id = {item["internal_source_id"]: item for item in quality}
    queue = []
    for gate in gates:
        if gate["gate_status"] not in ACTIVE_GATE_STATUSES:
            continue
        source_id = gate["internal_source_id"]
        item = item_by_id[source_id]
        mapping = mapping_by_id[source_id]
        preview = preview_by_id[source_id]
        queue_id = stable_hash(f"{contract['contract_version']}\n{gate['gate_id']}")
        queue.append(
            {
                "queue_item_id": f"queue_{queue_id}",
                "internal_source_id": source_id,
                "gate_id": gate["gate_id"],
                "mapping_id": mapping["mapping_id"],
                "preview_id": preview["preview_id"],
                "sandbox_artist_key": gate["sandbox_artist_key"],
                "artist_name": gate["artist_name"],
                "artist_slug": gate["artist_slug"],
                "provider_key": gate["provider_key"],
                "source_type": gate["source_type"],
                "gate_status": gate["gate_status"],
                "gate_reason_codes": sorted(set(gate.get("gate_reason_codes") or [])),
                "decision_status": "not_decided",
                "queue_status": "pending_review",
                "review_category": CATEGORY_BY_GATE[gate["gate_status"]],
                "source_url": item.get("source_url"),
                "title": item.get("title"),
                "summary_excerpt": clean_excerpt(item.get("summary")),
                "published_at": item.get("published_at"),
                "author_or_publisher": item.get("author_or_publisher"),
                "content_hash": item.get("content_hash"),
                "raw_row_number": item.get("raw_row_number"),
            }
        )
    queue.sort(key=queue_sort_key)
    return queue


def decision_template(queue):
    return [
        {
            "internal_source_id": item["internal_source_id"],
            "gate_id": item["gate_id"],
            "queue_item_id": item["queue_item_id"],
            "gate_status": item["gate_status"],
            "decision_intent": "not_decided",
            "reviewer_id": None,
            "rationale_codes": [],
            "reviewer_note": None,
            "reviewed_at": None,
            "requested_enrichment_fields": [],
        }
        for item in queue
    ]


def serialize_json(payload):
    return (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def sample(item):
    fields = (
        "queue_item_id",
        "internal_source_id",
        "source_type",
        "gate_status",
        "review_category",
        "source_url",
        "published_at",
        "author_or_publisher",
        "gate_reason_codes",
        "decision_status",
        "raw_row_number",
    )
    return {field: item.get(field) for field in fields}


def run_self_test():
    contract = load_json(Path(__file__).with_name(CONTRACT_FILENAME))
    errors, rule_map = validate_contract(contract)
    assert not errors, errors
    gates = [
        {"gate_status": "approval_candidate", "gate_id": "g1"},
        {"gate_status": "exception_review_required", "gate_id": "g2"},
        {"gate_status": "manual_review_required", "gate_id": "g3"},
        {"gate_status": "blocked", "gate_id": "g4"},
    ]
    active = [gate for gate in gates if gate["gate_status"] in ACTIVE_GATE_STATUSES]
    assert [CATEGORY_BY_GATE[gate["gate_status"]] for gate in active] == [
        "exception_review",
        "manual_review",
        "blocked_review",
    ]
    base = {
        "internal_source_id": "source-1",
        "gate_id": "gate-1",
        "decision_intent": "not_decided",
        "reviewer_id": None,
        "rationale_codes": [],
    }
    assert not validate_decision(base, "exception_review_required", contract, rule_map)
    accept = {**base, "decision_intent": "accept_exception", "reviewer_id": "reviewer", "rationale_codes": ["provider_attribution_unavailable_verified"]}
    assert not validate_decision(accept, "exception_review_required", contract, rule_map)
    assert validate_decision(accept, "approval_candidate", contract, rule_map)
    approve = {**base, "decision_intent": "approve_candidate", "reviewer_id": "reviewer", "rationale_codes": ["metadata_verified"]}
    assert not validate_decision(approve, "approval_candidate", contract, rule_map)
    assert validate_decision(approve, "exception_review_required", contract, rule_map)
    assert validate_decision({**base, "decision_intent": "unknown"}, "blocked", contract, rule_map)
    assert validate_decision({**approve, "reviewer_id": None}, "approval_candidate", contract, rule_map)
    assert validate_decision({**approve, "rationale_codes": []}, "approval_candidate", contract, rule_map)
    print(json.dumps({"self_test": "passed", "tests": 10}, indent=2))


def main():
    parser = argparse.ArgumentParser(description="Prepare a local human review queue.")
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--sandbox-artist-key")
    parser.add_argument("--artist-name")
    parser.add_argument("--artist-slug")
    parser.add_argument("--contract-file", type=Path)
    parser.add_argument("--news-file", type=Path)
    parser.add_argument("--blog-file", type=Path)
    parser.add_argument("--mapping-file", type=Path)
    parser.add_argument("--quality-preview-file", type=Path)
    parser.add_argument("--gate-preview-file", type=Path)
    parser.add_argument("--gate-summary-file", type=Path)
    parser.add_argument("--queue-output-file", type=Path)
    parser.add_argument("--queue-summary-file", type=Path)
    parser.add_argument("--decision-template-file", type=Path)
    args = parser.parse_args()
    if args.self_test:
        run_self_test()
        return

    required_args = (
        "sandbox_artist_key", "artist_name", "artist_slug", "contract_file",
        "news_file", "blog_file", "mapping_file", "quality_preview_file",
        "gate_preview_file", "gate_summary_file", "queue_output_file",
        "queue_summary_file", "decision_template_file",
    )
    missing_args = [name for name in required_args if getattr(args, name) is None]
    if missing_args:
        parser.error(f"missing required arguments: {', '.join(missing_args)}")

    contract = load_json(args.contract_file)
    contract_errors, rule_map = validate_contract(contract)
    news = load_json(args.news_file)
    blog = load_json(args.blog_file)
    normalized = news + blog if isinstance(news, list) and isinstance(blog, list) else []
    mappings = load_json(args.mapping_file)
    quality = load_json(args.quality_preview_file)
    gates = load_json(args.gate_preview_file)
    gate_summary = load_json(args.gate_summary_file)
    errors = contract_errors + validate_inputs(
        normalized, mappings, quality, gates, gate_summary, args, rule_map
    )
    if errors:
        print(json.dumps({"queue_created": False, "errors": errors}, ensure_ascii=False, indent=2))
        raise SystemExit(1)

    queue = build_queue(normalized, mappings, quality, gates, contract)
    template = decision_template(queue)
    queue_ids = [item["queue_item_id"] for item in queue]
    source_ids = [item["internal_source_id"] for item in queue]
    if duplicate_count(queue_ids) or duplicate_count(source_ids):
        print(json.dumps({"queue_created": False, "errors": ["queue IDs are not unique"]}, indent=2))
        raise SystemExit(1)
    queue_bytes = serialize_json(queue)
    template_bytes = serialize_json(template)
    reason_counts = Counter(code for item in queue for code in item["gate_reason_codes"])
    category_counts = Counter(item["review_category"] for item in queue)
    source_counts = Counter(item["source_type"] for item in queue)
    summary = {
        "contract_version": contract["contract_version"],
        "sandbox_artist_key": args.sandbox_artist_key,
        "artist_name": args.artist_name,
        "artist_slug": args.artist_slug,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_gate_records": len(gates),
        "active_queue_count": len(queue),
        "approval_candidate_excluded_count": sum(item["gate_status"] == "approval_candidate" for item in gates),
        "exception_review_queue_count": category_counts["exception_review"],
        "manual_review_queue_count": category_counts["manual_review"],
        "blocked_review_queue_count": category_counts["blocked_review"],
        "pending_review_count": sum(item["queue_status"] == "pending_review" for item in queue),
        "not_decided_count": sum(item["decision_status"] == "not_decided" for item in queue),
        "news_queue_count": source_counts["news"],
        "blog_queue_count": source_counts["blog"],
        "duplicate_queue_item_id_count": duplicate_count(queue_ids),
        "duplicate_internal_source_id_count": duplicate_count(source_ids),
        "normalized_input_count_match": len(normalized) == len(gates),
        "mapping_input_count_match": len(mappings) == len(gates),
        "quality_input_count_match": len(quality) == len(gates),
        "gate_input_count_match": gate_summary.get("total_gate_records") == len(gates),
        "review_category_counts": {key: category_counts[key] for key in sorted(CATEGORY_ORDER)},
        "gate_reason_code_counts": {key: reason_counts[key] for key in sorted(reason_counts)},
        "source_type_queue_counts": {key: source_counts[key] for key in sorted(SOURCE_TYPE_ORDER)},
        "decision_template_entry_count": len(template),
        "undecided_template_entry_count": sum(item["decision_intent"] == "not_decided" for item in template),
        "queue_samples": [sample(item) for item in queue[:20]],
        "deterministic_queue_sha256": hashlib.sha256(queue_bytes).hexdigest(),
        "deterministic_template_sha256": hashlib.sha256(template_bytes).hexdigest(),
    }
    args.queue_output_file.parent.mkdir(parents=True, exist_ok=True)
    args.queue_summary_file.parent.mkdir(parents=True, exist_ok=True)
    args.decision_template_file.parent.mkdir(parents=True, exist_ok=True)
    args.queue_output_file.write_bytes(queue_bytes)
    args.queue_summary_file.write_bytes(serialize_json(summary))
    args.decision_template_file.write_bytes(template_bytes)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
