"""Build a deterministic local-only source approval gate preview."""

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


SUPPORTED_PROVIDER = "naver"
SUPPORTED_SOURCE_TYPES = {"news", "blog"}
MAPPING_STATUSES = {"mapped", "review_required"}
QUALITY_STATUSES = {"ready", "review_required", "blocked"}
ELIGIBILITY_STATUSES = {"eligible_candidate", "review_required", "blocked"}
GATE_STATUSES = {
    "approval_candidate",
    "exception_review_required",
    "manual_review_required",
    "blocked",
}
REQUIRED_RULE_FIELDS = {
    "rule_id",
    "provider_key",
    "source_type",
    "attribution_requirement",
    "missing_attribution_handling",
    "provider_limitation_evidence_required",
    "allowed_gate_status_when_complete",
}


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def present(value):
    return isinstance(value, str) and bool(value.strip())


def stable_hash(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def duplicate_count(values):
    return sum(count - 1 for count in Counter(values).values() if count > 1)


def validate_contract(contract):
    errors = []
    if not isinstance(contract, dict):
        return ["contract top level is not an object"], {}
    version = contract.get("contract_version")
    if not present(version) or not re.fullmatch(r"[A-Za-z0-9._-]+", version):
        errors.append("contract_version is missing or invalid")
    if contract.get("scope") != "local_sandbox_preview_only":
        errors.append("contract scope is not local_sandbox_preview_only")
    if contract.get("production_policy") is not False:
        errors.append("contract production_policy is not false")
    rules = contract.get("rules")
    if not isinstance(rules, list):
        return errors + ["contract rules is not an array"], {}
    rule_map = {}
    for index, rule in enumerate(rules, start=1):
        if not isinstance(rule, dict):
            errors.append(f"contract rule {index} is not an object")
            continue
        missing = sorted(REQUIRED_RULE_FIELDS - set(rule))
        if missing:
            errors.append(f"contract rule {index} is missing: {', '.join(missing)}")
            continue
        key = (rule.get("provider_key"), rule.get("source_type"))
        if key in rule_map:
            errors.append(f"duplicate contract rule for {key[0]}/{key[1]}")
        else:
            rule_map[key] = rule
        if rule.get("attribution_requirement") != "required":
            errors.append(f"contract rule {index} attribution requirement is unsupported")
        if rule.get("missing_attribution_handling") not in {
            "exception_review_required",
            "manual_review_required",
        }:
            errors.append(f"contract rule {index} missing handling is unsupported")
        if not isinstance(rule.get("provider_limitation_evidence_required"), bool):
            errors.append(f"contract rule {index} limitation flag is not boolean")
        if rule.get("allowed_gate_status_when_complete") != "approval_candidate":
            errors.append(f"contract rule {index} complete status is unsupported")
        if not present(rule.get("rule_id")):
            errors.append(f"contract rule {index} rule_id is missing")
    return errors, rule_map


def validate_inputs(payloads, args, rule_map):
    news, blog, validation, mappings, mapping_summary, quality, quality_summary, audit = payloads
    errors = []
    type_checks = (
        ("news", news, list),
        ("blog", blog, list),
        ("validation report", validation, dict),
        ("mappings", mappings, list),
        ("mapping summary", mapping_summary, dict),
        ("quality preview", quality, list),
        ("quality summary", quality_summary, dict),
        ("attribution audit", audit, dict),
    )
    for label, value, expected in type_checks:
        if not isinstance(value, expected):
            errors.append(f"{label} JSON has an invalid top-level type")
    if errors:
        return errors

    normalized = news + blog
    normalized_ids = []
    for index, item in enumerate(normalized, start=1):
        prefix = f"normalized item {index}"
        if not isinstance(item, dict):
            errors.append(f"{prefix} is not an object")
            continue
        source_id = item.get("internal_source_id")
        if not present(source_id):
            errors.append(f"{prefix} internal_source_id is missing")
        else:
            normalized_ids.append(source_id)
        if item.get("provider_key") != SUPPORTED_PROVIDER:
            errors.append(f"{prefix} provider_key is unsupported")
        if item.get("source_type") not in SUPPORTED_SOURCE_TYPES:
            errors.append(f"{prefix} source_type is unsupported")
        if item.get("artist_name") != args.artist_name:
            errors.append(f"{prefix} artist_name mismatch")
        if item.get("artist_slug") != args.artist_slug:
            errors.append(f"{prefix} artist_slug mismatch")
        if not present(item.get("content_hash")):
            errors.append(f"{prefix} content_hash is missing")
    if duplicate_count(normalized_ids):
        errors.append("normalized internal_source_id values are not unique")

    mapping_source_ids = []
    mapping_ids = []
    for index, mapping in enumerate(mappings, start=1):
        prefix = f"mapping record {index}"
        if not isinstance(mapping, dict):
            errors.append(f"{prefix} is not an object")
            continue
        source_id = mapping.get("internal_source_id")
        mapping_id = mapping.get("mapping_id")
        if not present(source_id):
            errors.append(f"{prefix} internal_source_id is missing")
        else:
            mapping_source_ids.append(source_id)
        if not present(mapping_id):
            errors.append(f"{prefix} mapping_id is missing")
        else:
            mapping_ids.append(mapping_id)
        if mapping.get("mapping_status") not in MAPPING_STATUSES:
            errors.append(f"{prefix} mapping_status is unsupported")
        if mapping.get("sandbox_artist_key") != args.sandbox_artist_key:
            errors.append(f"{prefix} sandbox_artist_key mismatch")
    if duplicate_count(mapping_source_ids):
        errors.append("mapping internal_source_id values are not unique")
    if duplicate_count(mapping_ids):
        errors.append("mapping_id values are not unique")

    quality_source_ids = []
    preview_ids = []
    for index, preview in enumerate(quality, start=1):
        prefix = f"quality preview record {index}"
        if not isinstance(preview, dict):
            errors.append(f"{prefix} is not an object")
            continue
        source_id = preview.get("internal_source_id")
        preview_id = preview.get("preview_id")
        if not present(source_id):
            errors.append(f"{prefix} internal_source_id is missing")
        else:
            quality_source_ids.append(source_id)
        if not present(preview_id):
            errors.append(f"{prefix} preview_id is missing")
        else:
            preview_ids.append(preview_id)
        if preview.get("quality_status") not in QUALITY_STATUSES:
            errors.append(f"{prefix} quality_status is unsupported")
        if preview.get("eligibility_status") not in ELIGIBILITY_STATUSES:
            errors.append(f"{prefix} eligibility_status is unsupported")
        if preview.get("sandbox_artist_key") != args.sandbox_artist_key:
            errors.append(f"{prefix} sandbox_artist_key mismatch")
    if duplicate_count(quality_source_ids):
        errors.append("quality preview internal_source_id values are not unique")
    if duplicate_count(preview_ids):
        errors.append("preview_id values are not unique")

    if not (
        len(normalized_ids) == len(mapping_source_ids) == len(quality_source_ids)
        and set(normalized_ids) == set(mapping_source_ids) == set(quality_source_ids)
    ):
        errors.append("normalized, mapping, and quality preview linkage is not one-to-one")
    if validation.get("structural_error_count") != 0:
        errors.append("validation structural_error_count is not zero")
    if validation.get("total_items") != len(normalized):
        errors.append("validation count does not match normalized input")
    if mapping_summary.get("total_mapping_records") != len(mappings):
        errors.append("mapping summary count does not match mapping input")
    if quality_summary.get("total_preview_records") != len(quality):
        errors.append("quality summary count does not match quality preview input")
    sources = audit.get("sources")
    if not isinstance(sources, dict) or not {"news", "blog"}.issubset(sources):
        errors.append("attribution audit does not contain news and blog sources")
    return errors


def provider_limitation_verified(source_type, audit):
    source = audit.get("sources", {}).get(source_type, {})
    return (
        source.get("candidate_columns") == []
        and source.get("recoverable_row_count") == 0
        and source.get("raw_row_number_link_failure_count") == 0
        and source.get("candidate_value_conflict_count") == 0
    )


def classify_gate(item, mapping, preview, rule, audit):
    reasons = set()
    attribution_present = present(item.get("author_or_publisher"))
    limitation_verified = provider_limitation_verified(item.get("source_type"), audit)
    if attribution_present:
        attribution_status = "present"
    elif limitation_verified:
        attribution_status = "missing_provider_limitation_verified"
    else:
        attribution_status = "missing_unverified"

    blocked = False
    if item.get("provider_key") != SUPPORTED_PROVIDER:
        reasons.add("unsupported_provider")
        blocked = True
    if item.get("source_type") not in SUPPORTED_SOURCE_TYPES:
        reasons.add("unsupported_source_type")
        blocked = True
    if rule is None:
        reasons.add("missing_contract_rule")
        blocked = True
    if (
        item.get("internal_source_id") != mapping.get("internal_source_id")
        or item.get("internal_source_id") != preview.get("internal_source_id")
        or mapping.get("mapping_id") != preview.get("mapping_id")
        or item.get("content_hash") != preview.get("content_hash")
    ):
        reasons.update(("identity_mismatch", "source_linkage_failure"))
        blocked = True
    if not present(item.get("content_hash")):
        reasons.add("missing_content_hash")
        blocked = True
    if preview.get("quality_status") == "blocked":
        reasons.add("quality_blocked")
        blocked = True
    if preview.get("eligibility_status") == "blocked":
        reasons.add("eligibility_blocked")
        blocked = True
    if mapping.get("evidence_level") == "missing":
        reasons.add("missing_artist_evidence")
        blocked = True
    if blocked:
        return "blocked", attribution_status, sorted(reasons)

    complete_candidate = (
        preview.get("quality_status") == "ready"
        and preview.get("eligibility_status") == "eligible_candidate"
        and mapping.get("mapping_status") == "mapped"
        and mapping.get("evidence_level") == "confirmed"
        and attribution_present
        and rule.get("allowed_gate_status_when_complete") == "approval_candidate"
    )
    if complete_candidate:
        reasons.update(
            (
                "contract_rule_satisfied",
                "eligibility_candidate",
                "mapped_confirmed_source",
                "quality_ready",
                "required_metadata_complete",
            )
        )
        return "approval_candidate", attribution_status, sorted(reasons)

    quality_reasons = set(preview.get("quality_reason_codes") or [])
    exception_candidate = (
        preview.get("quality_status") == "review_required"
        and preview.get("eligibility_status") == "review_required"
        and mapping.get("mapping_status") == "mapped"
        and mapping.get("evidence_level") == "confirmed"
        and quality_reasons == {"missing_author_or_publisher"}
        and rule.get("missing_attribution_handling") == "exception_review_required"
        and rule.get("provider_limitation_evidence_required") is True
        and limitation_verified
    )
    if exception_candidate:
        reasons.update(
            (
                "attribution_recovery_unavailable",
                "eligibility_review_required",
                "exception_review_required_by_contract",
                "missing_author_or_publisher",
                "provider_attribution_unavailable",
                "provider_limitation_verified",
                "quality_review_required",
            )
        )
        return "exception_review_required", attribution_status, sorted(reasons)

    if preview.get("quality_status") == "review_required":
        reasons.add("additional_metadata_review_reason")
    if preview.get("eligibility_status") == "review_required":
        reasons.add("eligibility_review_required")
    if mapping.get("mapping_status") == "review_required":
        reasons.add("mapping_review_required")
    if mapping.get("evidence_level") == "weak":
        reasons.add("weak_artist_evidence")
    if not attribution_present and not limitation_verified:
        reasons.add("provider_limitation_not_verified")
    if rule.get("missing_attribution_handling") == "manual_review_required":
        reasons.add("manual_review_required_by_contract")
    return "manual_review_required", attribution_status, sorted(reasons)


def build_record(item, mapping, preview, rule, audit, contract, args):
    gate_status, attribution_status, reasons = classify_gate(
        item, mapping, preview, rule, audit
    )
    identity = (
        f"{contract['contract_version']}\n{args.sandbox_artist_key}\n"
        f"{item['internal_source_id']}\n{item['content_hash']}"
    )
    return {
        "gate_id": f"gate_{stable_hash(identity)}",
        "internal_source_id": item["internal_source_id"],
        "mapping_id": mapping["mapping_id"],
        "preview_id": preview["preview_id"],
        "sandbox_artist_key": args.sandbox_artist_key,
        "artist_name": args.artist_name,
        "artist_slug": args.artist_slug,
        "provider_key": item["provider_key"],
        "source_type": item["source_type"],
        "contract_rule_id": rule.get("rule_id") if rule else None,
        "quality_status": preview["quality_status"],
        "eligibility_status": preview["eligibility_status"],
        "mapping_status": mapping["mapping_status"],
        "evidence_level": mapping.get("evidence_level"),
        "attribution_status": attribution_status,
        "gate_status": gate_status,
        "gate_reason_codes": reasons,
        "decision_status": "not_decided",
        "source_url": item.get("source_url"),
        "published_at": item.get("published_at"),
        "author_or_publisher": item.get("author_or_publisher"),
        "content_hash": item["content_hash"],
        "raw_row_number": item.get("raw_row_number"),
    }


def sample(record):
    fields = (
        "internal_source_id",
        "source_type",
        "source_url",
        "published_at",
        "author_or_publisher",
        "contract_rule_id",
        "quality_status",
        "eligibility_status",
        "gate_status",
        "gate_reason_codes",
        "decision_status",
        "raw_row_number",
    )
    return {field: record.get(field) for field in fields}


def serialize_json(payload):
    return (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def main():
    parser = argparse.ArgumentParser(description="Build a local approval gate preview.")
    parser.add_argument("--sandbox-artist-key", required=True)
    parser.add_argument("--artist-name", required=True)
    parser.add_argument("--artist-slug", required=True)
    parser.add_argument("--contract-file", required=True, type=Path)
    parser.add_argument("--news-file", required=True, type=Path)
    parser.add_argument("--blog-file", required=True, type=Path)
    parser.add_argument("--validation-report-file", required=True, type=Path)
    parser.add_argument("--mapping-file", required=True, type=Path)
    parser.add_argument("--mapping-summary-file", required=True, type=Path)
    parser.add_argument("--quality-preview-file", required=True, type=Path)
    parser.add_argument("--quality-summary-file", required=True, type=Path)
    parser.add_argument("--attribution-audit-file", required=True, type=Path)
    parser.add_argument("--output-file", required=True, type=Path)
    parser.add_argument("--summary-file", required=True, type=Path)
    args = parser.parse_args()

    contract = load_json(args.contract_file)
    contract_errors, rule_map = validate_contract(contract)
    payloads = (
        load_json(args.news_file),
        load_json(args.blog_file),
        load_json(args.validation_report_file),
        load_json(args.mapping_file),
        load_json(args.mapping_summary_file),
        load_json(args.quality_preview_file),
        load_json(args.quality_summary_file),
        load_json(args.attribution_audit_file),
    )
    errors = contract_errors + validate_inputs(payloads, args, rule_map)
    if errors:
        print(json.dumps({"preview_created": False, "errors": errors}, ensure_ascii=False, indent=2))
        raise SystemExit(1)

    news, blog, validation, mappings, mapping_summary, quality, quality_summary, audit = payloads
    normalized = news + blog
    mapping_by_id = {record["internal_source_id"]: record for record in mappings}
    preview_by_id = {record["internal_source_id"]: record for record in quality}
    records = []
    for item in normalized:
        key = (item["provider_key"], item["source_type"])
        records.append(
            build_record(
                item,
                mapping_by_id[item["internal_source_id"]],
                preview_by_id[item["internal_source_id"]],
                rule_map.get(key),
                audit,
                contract,
                args,
            )
        )
    records.sort(key=lambda record: (record["source_type"], record["internal_source_id"]))

    gate_ids = [record["gate_id"] for record in records]
    internal_ids = [record["internal_source_id"] for record in records]
    duplicate_gate_id_count = duplicate_count(gate_ids)
    duplicate_internal_source_id_count = duplicate_count(internal_ids)
    if duplicate_gate_id_count or duplicate_internal_source_id_count:
        print(json.dumps({"preview_created": False, "duplicate_gate_id_count": duplicate_gate_id_count, "duplicate_internal_source_id_count": duplicate_internal_source_id_count}, indent=2))
        raise SystemExit(1)

    output_bytes = serialize_json(records)
    output_sha = hashlib.sha256(output_bytes).hexdigest()
    rule_counts = Counter(record["contract_rule_id"] for record in records)
    reason_counts = Counter(code for record in records for code in record["gate_reason_codes"])
    source_type_stats = {}
    for source_type in sorted(SUPPORTED_SOURCE_TYPES):
        typed = [record for record in records if record["source_type"] == source_type]
        source_type_stats[source_type] = {
            status: sum(record["gate_status"] == status for record in typed)
            for status in sorted(GATE_STATUSES)
        }
    by_status = {
        status: [record for record in records if record["gate_status"] == status]
        for status in GATE_STATUSES
    }
    summary = {
        "contract_version": contract["contract_version"],
        "sandbox_artist_key": args.sandbox_artist_key,
        "artist_name": args.artist_name,
        "artist_slug": args.artist_slug,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_input_items": len(normalized),
        "total_gate_records": len(records),
        "approval_candidate_count": len(by_status["approval_candidate"]),
        "exception_review_required_count": len(by_status["exception_review_required"]),
        "manual_review_required_count": len(by_status["manual_review_required"]),
        "blocked_count": len(by_status["blocked"]),
        "not_decided_count": sum(record["decision_status"] == "not_decided" for record in records),
        "news_gate_count": sum(record["source_type"] == "news" for record in records),
        "blog_gate_count": sum(record["source_type"] == "blog" for record in records),
        "attribution_present_count": sum(record["attribution_status"] == "present" for record in records),
        "attribution_provider_limitation_count": sum(record["attribution_status"] == "missing_provider_limitation_verified" for record in records),
        "attribution_missing_unverified_count": sum(record["attribution_status"] == "missing_unverified" for record in records),
        "duplicate_gate_id_count": duplicate_gate_id_count,
        "duplicate_internal_source_id_count": duplicate_internal_source_id_count,
        "normalized_input_count_match": len(normalized) == len(records),
        "mapping_input_count_match": len(mappings) == len(records),
        "quality_preview_input_count_match": len(quality) == len(records),
        "contract_rule_usage_counts": {key: rule_counts[key] for key in sorted(rule_counts) if key is not None},
        "gate_reason_code_counts": {key: reason_counts[key] for key in sorted(reason_counts)},
        "source_type_gate_status_counts": source_type_stats,
        "exception_review_required_samples": [sample(record) for record in by_status["exception_review_required"][:20]],
        "manual_review_required_samples": [sample(record) for record in by_status["manual_review_required"][:20]],
        "blocked_samples": [sample(record) for record in by_status["blocked"][:20]],
        "deterministic_output_sha256": output_sha,
    }
    args.output_file.parent.mkdir(parents=True, exist_ok=True)
    args.summary_file.parent.mkdir(parents=True, exist_ok=True)
    args.output_file.write_bytes(output_bytes)
    args.summary_file.write_bytes(serialize_json(summary))
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
