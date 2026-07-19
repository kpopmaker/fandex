"""Build deterministic local-only mappings from normalized sources to a sandbox artist."""

import argparse
import hashlib
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def stable_hash(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def compile_alias_patterns(aliases):
    patterns = []
    for alias in aliases:
        cleaned = alias.strip()
        if not cleaned:
            continue
        escaped = re.escape(cleaned)
        if re.fullmatch(r"[A-Za-z0-9 ]+", cleaned):
            pattern = re.compile(rf"(?<![A-Za-z0-9]){escaped}(?![A-Za-z0-9])", re.IGNORECASE)
        else:
            pattern = re.compile(escaped, re.IGNORECASE)
        patterns.append((cleaned, pattern))
    return patterns


def matching_aliases(value, patterns):
    if not isinstance(value, str):
        return set()
    return {alias for alias, pattern in patterns if pattern.search(value)}


def duplicate_count(values):
    return sum(count - 1 for count in Counter(values).values() if count > 1)


def validate_preconditions(news_items, blog_items, validation_report, args):
    errors = []
    if not isinstance(news_items, list):
        errors.append("news JSON top level is not an array")
    if not isinstance(blog_items, list):
        errors.append("blog JSON top level is not an array")
    if not isinstance(validation_report, dict):
        errors.append("validation report top level is not an object")
    if errors:
        return errors

    all_items = [("news", item) for item in news_items] + [
        ("blog", item) for item in blog_items
    ]
    if validation_report.get("structural_error_count") != 0:
        errors.append("validation report structural_error_count is not zero")
    if validation_report.get("total_items") != len(all_items):
        errors.append("validation report total_items does not match input arrays")
    if validation_report.get("news_items") != len(news_items):
        errors.append("validation report news_items does not match news array")
    if validation_report.get("blog_items") != len(blog_items):
        errors.append("validation report blog_items does not match blog array")

    internal_ids = []
    for position, (expected_type, item) in enumerate(all_items, start=1):
        prefix = f"item {position} ({expected_type})"
        if not isinstance(item, dict):
            errors.append(f"{prefix}: item is not an object")
            continue
        if item.get("artist_name") != args.artist_name:
            errors.append(f"{prefix}: artist_name mismatch")
        if item.get("artist_slug") != args.artist_slug:
            errors.append(f"{prefix}: artist_slug mismatch")
        if item.get("provider_key") != "naver":
            errors.append(f"{prefix}: provider_key is not naver")
        if item.get("source_type") != expected_type:
            errors.append(f"{prefix}: source_type mismatch")
        internal_source_id = item.get("internal_source_id")
        if not isinstance(internal_source_id, str) or not internal_source_id.strip():
            errors.append(f"{prefix}: internal_source_id is empty")
        else:
            internal_ids.append(internal_source_id)
        content_hash = item.get("content_hash")
        if not isinstance(content_hash, str) or not content_hash.strip():
            errors.append(f"{prefix}: content_hash is empty")

    if duplicate_count(internal_ids):
        errors.append("internal_source_id is not unique across all inputs")
    return errors


def build_mapping(item, args, patterns):
    title_aliases = matching_aliases(item.get("title"), patterns)
    summary_aliases = matching_aliases(item.get("summary"), patterns)
    primary_aliases = title_aliases | summary_aliases
    if primary_aliases:
        evidence_level = "confirmed"
        mapping_status = "mapped"
        matched_aliases = primary_aliases
        evidence_fields = set()
        if title_aliases:
            evidence_fields.add("title")
        if summary_aliases:
            evidence_fields.add("summary")
    else:
        author_aliases = matching_aliases(item.get("author_or_publisher"), patterns)
        evidence_level = "weak" if author_aliases else "missing"
        mapping_status = "review_required"
        matched_aliases = author_aliases
        evidence_fields = {"author_or_publisher"} if author_aliases else set()

    mapping_identity = f"{args.sandbox_artist_key}\n{item['internal_source_id']}"
    return {
        "mapping_id": f"mapping_{stable_hash(mapping_identity)}",
        "internal_source_id": item["internal_source_id"],
        "sandbox_artist_key": args.sandbox_artist_key,
        "artist_name": args.artist_name,
        "artist_slug": args.artist_slug,
        "provider_key": item["provider_key"],
        "source_type": item["source_type"],
        "mapping_status": mapping_status,
        "evidence_level": evidence_level,
        "matched_aliases": sorted(matched_aliases, key=str.casefold),
        "evidence_fields": sorted(evidence_fields),
        "source_url": item.get("source_url"),
        "published_at": item.get("published_at"),
        "author_or_publisher": item.get("author_or_publisher"),
        "content_hash": item["content_hash"],
        "raw_row_number": item.get("raw_row_number"),
    }


def review_sample(mapping):
    return {
        "internal_source_id": mapping["internal_source_id"],
        "source_type": mapping["source_type"],
        "source_url": mapping["source_url"],
        "published_at": mapping["published_at"],
        "author_or_publisher": mapping["author_or_publisher"],
        "raw_row_number": mapping["raw_row_number"],
        "reason": f"{mapping['evidence_level']} alias evidence requires review",
    }


def serialize_json(payload):
    return (json.dumps(payload, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def main():
    parser = argparse.ArgumentParser(
        description="Build deterministic local sandbox artist/source mappings."
    )
    parser.add_argument("--sandbox-artist-key", required=True)
    parser.add_argument("--artist-name", required=True)
    parser.add_argument("--artist-slug", required=True)
    parser.add_argument("--artist-alias", action="append", required=True)
    parser.add_argument("--news-file", required=True, type=Path)
    parser.add_argument("--blog-file", required=True, type=Path)
    parser.add_argument("--validation-report-file", required=True, type=Path)
    parser.add_argument("--output-file", required=True, type=Path)
    parser.add_argument("--summary-file", required=True, type=Path)
    args = parser.parse_args()

    news_items = load_json(args.news_file)
    blog_items = load_json(args.blog_file)
    validation_report = load_json(args.validation_report_file)
    errors = validate_preconditions(news_items, blog_items, validation_report, args)
    if errors:
        print(json.dumps({"mapping_created": False, "errors": errors}, ensure_ascii=False, indent=2))
        raise SystemExit(1)

    aliases = sorted({alias.strip() for alias in args.artist_alias if alias.strip()}, key=str.casefold)
    patterns = compile_alias_patterns(aliases)
    mappings = [build_mapping(item, args, patterns) for item in news_items + blog_items]
    mappings.sort(key=lambda mapping: (mapping["source_type"], mapping["internal_source_id"]))

    mapping_ids = [mapping["mapping_id"] for mapping in mappings]
    internal_ids = [mapping["internal_source_id"] for mapping in mappings]
    duplicate_mapping_id_count = duplicate_count(mapping_ids)
    duplicate_internal_source_id_count = duplicate_count(internal_ids)
    if duplicate_mapping_id_count or duplicate_internal_source_id_count:
        print(
            json.dumps(
                {
                    "mapping_created": False,
                    "duplicate_mapping_id_count": duplicate_mapping_id_count,
                    "duplicate_internal_source_id_count": duplicate_internal_source_id_count,
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        raise SystemExit(1)

    mapping_bytes = serialize_json(mappings)
    mapping_sha256 = hashlib.sha256(mapping_bytes).hexdigest()
    mapped_count = sum(mapping["mapping_status"] == "mapped" for mapping in mappings)
    review_required = [
        mapping for mapping in mappings if mapping["mapping_status"] == "review_required"
    ]
    summary = {
        "sandbox_artist_key": args.sandbox_artist_key,
        "artist_name": args.artist_name,
        "artist_slug": args.artist_slug,
        "aliases": aliases,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_input_items": len(news_items) + len(blog_items),
        "total_mapping_records": len(mappings),
        "mapped_count": mapped_count,
        "review_required_count": len(review_required),
        "confirmed_evidence_count": sum(
            mapping["evidence_level"] == "confirmed" for mapping in mappings
        ),
        "weak_evidence_count": sum(mapping["evidence_level"] == "weak" for mapping in mappings),
        "missing_evidence_count": sum(
            mapping["evidence_level"] == "missing" for mapping in mappings
        ),
        "news_mapping_count": sum(mapping["source_type"] == "news" for mapping in mappings),
        "blog_mapping_count": sum(mapping["source_type"] == "blog" for mapping in mappings),
        "duplicate_mapping_id_count": duplicate_mapping_id_count,
        "duplicate_internal_source_id_count": duplicate_internal_source_id_count,
        "validation_report_count_match": validation_report.get("total_items") == len(mappings),
        "deterministic_output_sha256": mapping_sha256,
        "review_required_samples": [review_sample(mapping) for mapping in review_required[:20]],
    }

    args.output_file.parent.mkdir(parents=True, exist_ok=True)
    args.summary_file.parent.mkdir(parents=True, exist_ok=True)
    args.output_file.write_bytes(mapping_bytes)
    args.summary_file.write_bytes(serialize_json(summary))
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
