"""Build a deterministic local-only source quality and eligibility preview."""

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit


SUPPORTED_PROVIDER = "naver"
SUPPORTED_SOURCE_TYPES = {"news", "blog"}


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def stable_hash(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def duplicate_count(values):
    return sum(count - 1 for count in Counter(values).values() if count > 1)


def present(value):
    return isinstance(value, str) and bool(value.strip())


def valid_url(value):
    if not present(value):
        return False
    try:
        parts = urlsplit(value.strip())
        return parts.scheme.lower() in {"http", "https"} and bool(parts.netloc)
    except ValueError:
        return False


def valid_published_at(value):
    if not present(value):
        return False
    try:
        datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
        return True
    except ValueError:
        return False


def validate_inputs(news_items, blog_items, validation_report, mappings, mapping_summary, args):
    errors = []
    named_payloads = (
        ("news", news_items, list),
        ("blog", blog_items, list),
        ("validation report", validation_report, dict),
        ("mappings", mappings, list),
        ("mapping summary", mapping_summary, dict),
    )
    for label, payload, expected_type in named_payloads:
        if not isinstance(payload, expected_type):
            errors.append(f"{label} JSON has an invalid top-level type")
    if errors:
        return errors

    normalized_items = news_items + blog_items
    normalized_ids = []
    for position, item in enumerate(normalized_items, start=1):
        prefix = f"normalized item {position}"
        if not isinstance(item, dict):
            errors.append(f"{prefix}: item is not an object")
            continue
        internal_source_id = item.get("internal_source_id")
        if not present(internal_source_id):
            errors.append(f"{prefix}: internal_source_id is missing")
        else:
            normalized_ids.append(internal_source_id)
        if item.get("provider_key") != SUPPORTED_PROVIDER:
            errors.append(f"{prefix}: unsupported provider_key")
        if item.get("source_type") not in SUPPORTED_SOURCE_TYPES:
            errors.append(f"{prefix}: unsupported source_type")
        if item.get("artist_name") != args.artist_name:
            errors.append(f"{prefix}: artist_name mismatch")
        if item.get("artist_slug") != args.artist_slug:
            errors.append(f"{prefix}: artist_slug mismatch")
        if not present(item.get("content_hash")):
            errors.append(f"{prefix}: content_hash is missing")
    if duplicate_count(normalized_ids):
        errors.append("normalized internal_source_id values are not unique")

    mapped_ids = []
    mapping_ids = []
    for position, mapping in enumerate(mappings, start=1):
        prefix = f"mapping record {position}"
        if not isinstance(mapping, dict):
            errors.append(f"{prefix}: record is not an object")
            continue
        internal_source_id = mapping.get("internal_source_id")
        if not present(internal_source_id):
            errors.append(f"{prefix}: internal_source_id is missing")
        else:
            mapped_ids.append(internal_source_id)
        mapping_id = mapping.get("mapping_id")
        if not present(mapping_id):
            errors.append(f"{prefix}: mapping_id is missing")
        else:
            mapping_ids.append(mapping_id)
        if mapping.get("mapping_status") not in {"mapped", "review_required"}:
            errors.append(f"{prefix}: unsupported mapping_status")
        if mapping.get("provider_key") != SUPPORTED_PROVIDER:
            errors.append(f"{prefix}: unsupported provider_key")
        if mapping.get("source_type") not in SUPPORTED_SOURCE_TYPES:
            errors.append(f"{prefix}: unsupported source_type")
        if mapping.get("artist_name") != args.artist_name:
            errors.append(f"{prefix}: artist_name mismatch")
        if mapping.get("artist_slug") != args.artist_slug:
            errors.append(f"{prefix}: artist_slug mismatch")
        if mapping.get("sandbox_artist_key") != args.sandbox_artist_key:
            errors.append(f"{prefix}: sandbox_artist_key mismatch")
        if not present(mapping.get("content_hash")):
            errors.append(f"{prefix}: content_hash is missing")
    if duplicate_count(mapped_ids):
        errors.append("mapping internal_source_id values are not unique")
    if duplicate_count(mapping_ids):
        errors.append("mapping_id values are not unique")
    if set(normalized_ids) != set(mapped_ids) or len(normalized_ids) != len(mapped_ids):
        errors.append("normalized items and mappings are not one-to-one")

    actual_count = len(normalized_items)
    if validation_report.get("structural_error_count") != 0:
        errors.append("validation report structural_error_count is not zero")
    if validation_report.get("total_items") != actual_count:
        errors.append("validation report count does not match normalized inputs")
    if validation_report.get("news_items") != len(news_items):
        errors.append("validation report news count does not match")
    if validation_report.get("blog_items") != len(blog_items):
        errors.append("validation report blog count does not match")
    if mapping_summary.get("total_mapping_records") != len(mappings):
        errors.append("mapping summary count does not match mapping input")
    if mapping_summary.get("duplicate_mapping_id_count") != 0:
        errors.append("mapping summary reports duplicate mapping IDs")
    if mapping_summary.get("duplicate_internal_source_id_count") != 0:
        errors.append("mapping summary reports duplicate internal source IDs")
    return errors


def quality_preview(item, mapping):
    reasons = set()
    blocked = False
    if item.get("provider_key") != SUPPORTED_PROVIDER:
        reasons.add("unsupported_provider")
        blocked = True
    if item.get("source_type") not in SUPPORTED_SOURCE_TYPES:
        reasons.add("unsupported_source_type")
        blocked = True
    if (
        item.get("internal_source_id") != mapping.get("internal_source_id")
        or item.get("artist_name") != mapping.get("artist_name")
        or item.get("artist_slug") != mapping.get("artist_slug")
    ):
        reasons.add("identity_mismatch")
        blocked = True
    if not present(item.get("content_hash")):
        reasons.add("missing_content_hash")
        blocked = True
    if mapping.get("mapping_status") == "review_required":
        reasons.add("mapping_review_required")
    if not present(item.get("title")):
        reasons.add("missing_title")
    if not present(item.get("summary")):
        reasons.add("missing_summary")
    if not present(item.get("source_url")):
        reasons.add("missing_source_url")
    elif not valid_url(item.get("source_url")):
        reasons.add("invalid_source_url")
    if not present(item.get("published_at")):
        reasons.add("missing_published_at")
    elif not valid_published_at(item.get("published_at")):
        reasons.add("invalid_published_at")
    if not present(item.get("author_or_publisher")):
        reasons.add("missing_author_or_publisher")

    if blocked:
        status = "blocked"
    elif reasons:
        status = "review_required"
    else:
        status = "ready"
        reasons.add("complete_core_metadata")
    return status, sorted(reasons)


def eligibility_preview(item, mapping, quality_status):
    reasons = set()
    blocked = False
    if item.get("provider_key") != SUPPORTED_PROVIDER:
        reasons.add("unsupported_provider")
        blocked = True
    if item.get("source_type") not in SUPPORTED_SOURCE_TYPES:
        reasons.add("unsupported_source_type")
        blocked = True
    if quality_status == "blocked":
        reasons.add("quality_blocked")
        blocked = True
    if mapping.get("evidence_level") == "missing":
        reasons.add("missing_artist_evidence")
        blocked = True

    if blocked:
        return "blocked", sorted(reasons)
    if quality_status == "review_required":
        reasons.add("quality_review_required")
    if mapping.get("evidence_level") == "weak":
        reasons.add("weak_artist_evidence")
    if mapping.get("mapping_status") == "review_required":
        reasons.add("mapping_review_required")
    if reasons:
        return "review_required", sorted(reasons)

    reasons.update(("mapped_confirmed_source", "quality_ready"))
    return "eligible_candidate", sorted(reasons)


def build_record(item, mapping, args):
    quality_status, quality_reasons = quality_preview(item, mapping)
    eligibility_status, eligibility_reasons = eligibility_preview(
        item, mapping, quality_status
    )
    identity = (
        f"{args.sandbox_artist_key}\n{item['internal_source_id']}\n{item['content_hash']}"
    )
    return {
        "preview_id": f"preview_{stable_hash(identity)}",
        "internal_source_id": item["internal_source_id"],
        "mapping_id": mapping["mapping_id"],
        "sandbox_artist_key": args.sandbox_artist_key,
        "artist_name": args.artist_name,
        "artist_slug": args.artist_slug,
        "provider_key": item["provider_key"],
        "source_type": item["source_type"],
        "quality_status": quality_status,
        "quality_reason_codes": quality_reasons,
        "eligibility_status": eligibility_status,
        "eligibility_reason_codes": eligibility_reasons,
        "mapping_status": mapping["mapping_status"],
        "evidence_level": mapping.get("evidence_level"),
        "source_url": item.get("source_url"),
        "published_at": item.get("published_at"),
        "author_or_publisher": item.get("author_or_publisher"),
        "content_hash": item["content_hash"],
        "raw_row_number": item.get("raw_row_number"),
    }


def reason_counts(records, field):
    counts = Counter(code for record in records for code in record[field])
    return {code: counts[code] for code in sorted(counts)}


def sample(record):
    return {
        "internal_source_id": record["internal_source_id"],
        "source_type": record["source_type"],
        "source_url": record["source_url"],
        "published_at": record["published_at"],
        "author_or_publisher": record["author_or_publisher"],
        "quality_status": record["quality_status"],
        "eligibility_status": record["eligibility_status"],
        "reason_codes": sorted(
            set(record["quality_reason_codes"] + record["eligibility_reason_codes"])
        ),
        "raw_row_number": record["raw_row_number"],
    }


def serialize_json(payload):
    return (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def main():
    parser = argparse.ArgumentParser(
        description="Build a local source quality and eligibility preview."
    )
    parser.add_argument("--sandbox-artist-key", required=True)
    parser.add_argument("--artist-name", required=True)
    parser.add_argument("--artist-slug", required=True)
    parser.add_argument("--news-file", required=True, type=Path)
    parser.add_argument("--blog-file", required=True, type=Path)
    parser.add_argument("--validation-report-file", required=True, type=Path)
    parser.add_argument("--mapping-file", required=True, type=Path)
    parser.add_argument("--mapping-summary-file", required=True, type=Path)
    parser.add_argument("--output-file", required=True, type=Path)
    parser.add_argument("--summary-file", required=True, type=Path)
    args = parser.parse_args()

    news_items = load_json(args.news_file)
    blog_items = load_json(args.blog_file)
    validation_report = load_json(args.validation_report_file)
    mappings = load_json(args.mapping_file)
    mapping_summary = load_json(args.mapping_summary_file)
    errors = validate_inputs(
        news_items, blog_items, validation_report, mappings, mapping_summary, args
    )
    if errors:
        print(json.dumps({"preview_created": False, "errors": errors}, ensure_ascii=False, indent=2))
        raise SystemExit(1)

    normalized_items = news_items + blog_items
    mapping_by_source = {mapping["internal_source_id"]: mapping for mapping in mappings}
    records = [
        build_record(item, mapping_by_source[item["internal_source_id"]], args)
        for item in normalized_items
    ]
    records.sort(key=lambda record: (record["source_type"], record["internal_source_id"]))
    preview_ids = [record["preview_id"] for record in records]
    internal_ids = [record["internal_source_id"] for record in records]
    duplicate_preview_id_count = duplicate_count(preview_ids)
    duplicate_internal_source_id_count = duplicate_count(internal_ids)
    if duplicate_preview_id_count or duplicate_internal_source_id_count:
        print(
            json.dumps(
                {
                    "preview_created": False,
                    "duplicate_preview_id_count": duplicate_preview_id_count,
                    "duplicate_internal_source_id_count": duplicate_internal_source_id_count,
                },
                indent=2,
            )
        )
        raise SystemExit(1)

    preview_bytes = serialize_json(records)
    preview_sha256 = hashlib.sha256(preview_bytes).hexdigest()
    review_records = [
        record
        for record in records
        if record["quality_status"] == "review_required"
        or record["eligibility_status"] == "review_required"
    ]
    blocked_records = [
        record
        for record in records
        if record["quality_status"] == "blocked"
        or record["eligibility_status"] == "blocked"
    ]
    summary = {
        "sandbox_artist_key": args.sandbox_artist_key,
        "artist_name": args.artist_name,
        "artist_slug": args.artist_slug,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_input_items": len(normalized_items),
        "total_preview_records": len(records),
        "quality_ready_count": sum(record["quality_status"] == "ready" for record in records),
        "quality_review_required_count": sum(
            record["quality_status"] == "review_required" for record in records
        ),
        "quality_blocked_count": sum(
            record["quality_status"] == "blocked" for record in records
        ),
        "eligibility_candidate_count": sum(
            record["eligibility_status"] == "eligible_candidate" for record in records
        ),
        "eligibility_review_required_count": sum(
            record["eligibility_status"] == "review_required" for record in records
        ),
        "eligibility_blocked_count": sum(
            record["eligibility_status"] == "blocked" for record in records
        ),
        "news_preview_count": sum(record["source_type"] == "news" for record in records),
        "blog_preview_count": sum(record["source_type"] == "blog" for record in records),
        "duplicate_preview_id_count": duplicate_preview_id_count,
        "duplicate_internal_source_id_count": duplicate_internal_source_id_count,
        "mapping_input_count_match": len(mappings) == len(records),
        "validation_input_count_match": validation_report.get("total_items") == len(records),
        "quality_reason_code_counts": reason_counts(records, "quality_reason_codes"),
        "eligibility_reason_code_counts": reason_counts(
            records, "eligibility_reason_codes"
        ),
        "review_required_samples": [sample(record) for record in review_records[:20]],
        "blocked_samples": [sample(record) for record in blocked_records[:20]],
        "deterministic_output_sha256": preview_sha256,
    }

    args.output_file.parent.mkdir(parents=True, exist_ok=True)
    args.summary_file.parent.mkdir(parents=True, exist_ok=True)
    args.output_file.write_bytes(preview_bytes)
    args.summary_file.write_bytes(serialize_json(summary))
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
