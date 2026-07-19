"""Validate normalized source sandbox data without changing source items."""

import argparse
import json
import re
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


REQUIRED_FIELDS = {
    "internal_source_id",
    "provider_key",
    "source_type",
    "artist_name",
    "artist_slug",
    "external_source_id",
    "source_url",
    "title",
    "summary",
    "published_at",
    "author_or_publisher",
    "collected_at",
    "raw_row_number",
    "content_hash",
}

SAMPLE_FIELDS = (
    "internal_source_id",
    "source_type",
    "source_url",
    "title",
    "published_at",
    "author_or_publisher",
    "raw_row_number",
)


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def canonicalize_url(value):
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        parts = urlsplit(value.strip())
        if parts.scheme.lower() not in {"http", "https"} or not parts.netloc:
            return None
        hostname = (parts.hostname or "").lower()
        port = f":{parts.port}" if parts.port else ""
        path = parts.path or "/"
        if path != "/":
            path = path.rstrip("/")
        query = urlencode(sorted(parse_qsl(parts.query, keep_blank_values=True)), doseq=True)
        return urlunsplit((parts.scheme.lower(), f"{hostname}{port}", path, query, ""))
    except ValueError:
        return None


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


def matching_alias(value, alias_patterns):
    if not isinstance(value, str):
        return None
    for alias, pattern in alias_patterns:
        if pattern.search(value):
            return alias
    return None


def sample_for(item, reason):
    sample = {field: item.get(field) if isinstance(item, dict) else None for field in SAMPLE_FIELDS}
    sample["reason"] = reason
    return sample


def empty_source_stats():
    return {
        "total_items": 0,
        "structural_error_count": 0,
        "missing_title_count": 0,
        "missing_summary_count": 0,
        "missing_url_count": 0,
        "missing_published_at_count": 0,
        "confirmed_count": 0,
        "weak_count": 0,
        "needs_review_count": 0,
    }


def validate_items(items, expected_type, args, alias_patterns, state):
    stats = state["source_type_stats"][expected_type]
    if not isinstance(items, list):
        state["structural_errors"].append(
            sample_for({}, f"{expected_type} JSON top level is not an array")
        )
        stats["structural_error_count"] += 1
        return

    for position, item in enumerate(items, start=1):
        stats["total_items"] += 1
        if not isinstance(item, dict):
            reason = f"array item {position} is not an object"
            state["structural_errors"].append(sample_for({}, reason))
            stats["structural_error_count"] += 1
            continue

        def add_error(reason):
            state["structural_errors"].append(sample_for(item, reason))
            stats["structural_error_count"] += 1

        missing_fields = sorted(REQUIRED_FIELDS - set(item))
        if missing_fields:
            add_error(f"missing required fields: {', '.join(missing_fields)}")
        if item.get("provider_key") != "naver":
            add_error("provider_key is not naver")
        if item.get("source_type") != expected_type:
            add_error(f"source_type does not match {expected_type} file")
        if item.get("artist_name") != args.artist_name:
            add_error("artist_name does not match validation target")
        if item.get("artist_slug") != args.artist_slug:
            add_error("artist_slug does not match validation target")
        internal_source_id = item.get("internal_source_id")
        if not isinstance(internal_source_id, str) or not internal_source_id.strip():
            add_error("internal_source_id is empty")
        else:
            state["internal_ids"].append(internal_source_id)
            state["items_by_internal_id"].setdefault(internal_source_id, item)
        raw_row_number = item.get("raw_row_number")
        if isinstance(raw_row_number, bool) or not isinstance(raw_row_number, int) or raw_row_number <= 0:
            add_error("raw_row_number is not a positive integer")
        content_hash = item.get("content_hash")
        if not isinstance(content_hash, str) or not content_hash.strip():
            add_error("content_hash is empty")
        else:
            state["content_hashes"].append(content_hash)
            state["items_by_content_hash"].setdefault(content_hash, item)

        title = item.get("title")
        summary = item.get("summary")
        source_url = item.get("source_url")
        published_at = item.get("published_at")
        if not isinstance(title, str) or not title.strip():
            stats["missing_title_count"] += 1
        if not isinstance(summary, str) or not summary.strip():
            stats["missing_summary_count"] += 1
        if source_url is None or not isinstance(source_url, str) or not source_url.strip():
            stats["missing_url_count"] += 1
        else:
            canonical_url = canonicalize_url(source_url)
            if canonical_url is None:
                add_error("source_url is not a valid HTTP(S) URL")
            else:
                state["canonical_urls"].append(canonical_url)
                state["items_by_canonical_url"].setdefault(canonical_url, item)
        if published_at is None or not isinstance(published_at, str) or not published_at.strip():
            stats["missing_published_at_count"] += 1

        confirmed_alias = matching_alias(title, alias_patterns) or matching_alias(summary, alias_patterns)
        if confirmed_alias:
            stats["confirmed_count"] += 1
        else:
            weak_alias = matching_alias(item.get("author_or_publisher"), alias_patterns)
            if weak_alias:
                stats["weak_count"] += 1
            else:
                stats["needs_review_count"] += 1
                if len(state["needs_review_samples"]) < 20:
                    state["needs_review_samples"].append(
                        sample_for(item, "no artist alias in title, summary, or author_or_publisher")
                    )


def add_duplicate_errors(values, item_lookup, label, state):
    duplicates = {value: count for value, count in Counter(values).items() if count > 1}
    duplicate_count = sum(count - 1 for count in duplicates.values())
    for value, count in duplicates.items():
        if len(state["structural_errors"]) >= 20:
            break
        state["structural_errors"].append(
            sample_for(item_lookup[value], f"duplicate {label}: {count} occurrences")
        )
    return duplicate_count


def rate(count, total):
    return round(count / total, 6) if total else 0.0


def main():
    parser = argparse.ArgumentParser(description="Validate normalized source sandbox JSON.")
    parser.add_argument("--artist-name", required=True)
    parser.add_argument("--artist-slug", required=True)
    parser.add_argument("--artist-alias", action="append", required=True)
    parser.add_argument("--news-file", required=True, type=Path)
    parser.add_argument("--blog-file", required=True, type=Path)
    parser.add_argument("--import-summary-file", required=True, type=Path)
    parser.add_argument("--output-file", required=True, type=Path)
    args = parser.parse_args()

    news_items = load_json(args.news_file)
    blog_items = load_json(args.blog_file)
    import_summary = load_json(args.import_summary_file)
    alias_patterns = compile_alias_patterns(args.artist_alias)
    state = {
        "source_type_stats": {"news": empty_source_stats(), "blog": empty_source_stats()},
        "structural_errors": [],
        "needs_review_samples": [],
        "internal_ids": [],
        "canonical_urls": [],
        "content_hashes": [],
        "items_by_internal_id": {},
        "items_by_canonical_url": {},
        "items_by_content_hash": {},
    }

    validate_items(news_items, "news", args, alias_patterns, state)
    validate_items(blog_items, "blog", args, alias_patterns, state)

    duplicate_internal_id_count = add_duplicate_errors(
        state["internal_ids"], state["items_by_internal_id"], "internal_source_id", state
    )
    duplicate_canonical_url_count = add_duplicate_errors(
        state["canonical_urls"], state["items_by_canonical_url"], "canonical URL", state
    )
    duplicate_content_hash_count = add_duplicate_errors(
        state["content_hashes"], state["items_by_content_hash"], "content_hash", state
    )

    news_count = len(news_items) if isinstance(news_items, list) else 0
    blog_count = len(blog_items) if isinstance(blog_items, list) else 0
    import_summary_count_match = (
        isinstance(import_summary, dict)
        and import_summary.get("news_result_count") == news_count
        and import_summary.get("blog_result_count") == blog_count
    )
    if not import_summary_count_match:
        state["structural_errors"].append(
            sample_for({}, "import summary result counts do not match normalized arrays")
        )

    source_stats = state["source_type_stats"]
    total_items = news_count + blog_count
    confirmed_count = sum(stats["confirmed_count"] for stats in source_stats.values())
    weak_count = sum(stats["weak_count"] for stats in source_stats.values())
    needs_review_count = sum(stats["needs_review_count"] for stats in source_stats.values())
    base_structural_error_count = sum(
        stats["structural_error_count"] for stats in source_stats.values()
    )
    structural_error_count = (
        base_structural_error_count
        + duplicate_internal_id_count
        + duplicate_canonical_url_count
        + duplicate_content_hash_count
        + (0 if import_summary_count_match else 1)
    )

    report = {
        "artist_name": args.artist_name,
        "artist_slug": args.artist_slug,
        "aliases": args.artist_alias,
        "validated_at": datetime.now(timezone.utc).isoformat(),
        "total_items": total_items,
        "news_items": news_count,
        "blog_items": blog_count,
        "structural_error_count": structural_error_count,
        "missing_title_count": sum(stats["missing_title_count"] for stats in source_stats.values()),
        "missing_summary_count": sum(stats["missing_summary_count"] for stats in source_stats.values()),
        "missing_url_count": sum(stats["missing_url_count"] for stats in source_stats.values()),
        "missing_published_at_count": sum(
            stats["missing_published_at_count"] for stats in source_stats.values()
        ),
        "duplicate_internal_id_count": duplicate_internal_id_count,
        "duplicate_canonical_url_count": duplicate_canonical_url_count,
        "duplicate_content_hash_count": duplicate_content_hash_count,
        "confirmed_count": confirmed_count,
        "weak_count": weak_count,
        "needs_review_count": needs_review_count,
        "confirmed_rate": rate(confirmed_count, total_items),
        "weak_rate": rate(weak_count, total_items),
        "needs_review_rate": rate(needs_review_count, total_items),
        "import_summary_count_match": import_summary_count_match,
        "source_type_stats": source_stats,
        "needs_review_samples": state["needs_review_samples"][:20],
        "structural_error_samples": state["structural_errors"][:20],
    }
    args.output_file.parent.mkdir(parents=True, exist_ok=True)
    args.output_file.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if structural_error_count:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
