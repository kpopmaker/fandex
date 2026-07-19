"""Audit attribution fields in existing local Naver CSV exports."""

import argparse
import csv
import json
import re
from collections import Counter
from pathlib import Path


COMMON_CANDIDATES = (
    "author",
    "author_name",
    "writer",
    "writer_name",
    "publisher",
    "publisher_name",
    "provider",
    "source",
)
NEWS_CANDIDATES = (
    "press",
    "press_name",
    "media",
    "media_name",
    "office",
    "office_name",
    "journalist",
    "reporter",
)
BLOG_CANDIDATES = (
    "bloggername",
    "blogger_name",
    "blogname",
    "blog_name",
    "blog_title",
    "channel_name",
)


def normalize_header(value):
    return re.sub(r"[\s_-]+", "", value.strip().lower())


def clean_value(value):
    if not isinstance(value, str):
        return None
    cleaned = " ".join(value.strip().split())
    return cleaned or None


def load_csv(path):
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader), list(reader.fieldnames or [])


def load_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def detected_candidate_columns(headers, source_type):
    allowed = COMMON_CANDIDATES + (
        NEWS_CANDIDATES if source_type == "news" else BLOG_CANDIDATES
    )
    allowed_normalized = {normalize_header(candidate) for candidate in allowed}
    return [header for header in headers if normalize_header(header) in allowed_normalized]


def audit_source(source_type, csv_path, normalized_path):
    rows, headers = load_csv(csv_path)
    normalized_items = load_json(normalized_path)
    if not isinstance(normalized_items, list):
        raise ValueError(f"{normalized_path} top level is not an array")

    candidates = detected_candidate_columns(headers, source_type)
    non_empty_counts = Counter()
    row_by_number = {row_number: row for row_number, row in enumerate(rows, start=2)}
    samples = []
    recoverable = 0
    unrecoverable = 0
    link_failures = 0
    conflicts = 0
    missing_current = 0

    for item in normalized_items:
        row_number = item.get("raw_row_number") if isinstance(item, dict) else None
        row = row_by_number.get(row_number)
        current = clean_value(item.get("author_or_publisher")) if isinstance(item, dict) else None
        if not current:
            missing_current += 1
        if row is None:
            link_failures += 1
            if not current:
                unrecoverable += 1
            detected_values = {}
            status = "link_failed"
            reason = "raw_row_number did not resolve to a CSV row"
        else:
            detected_values = {}
            for column in candidates:
                value = clean_value(row.get(column))
                if value:
                    detected_values[column] = value
                    non_empty_counts[column] += 1
            distinct_values = sorted(set(detected_values.values()), key=str.casefold)
            if len(distinct_values) > 1:
                conflicts += 1
                status = "conflict"
                reason = "candidate columns contain different non-empty values"
                if not current:
                    unrecoverable += 1
            elif current:
                status = "already_present"
                reason = "normalized attribution is already present"
            elif len(distinct_values) == 1:
                recoverable += 1
                status = "recoverable"
                reason = "one unambiguous raw attribution value is available"
            else:
                unrecoverable += 1
                status = "unrecoverable"
                reason = "no non-empty attribution candidate value is available"

        if len(samples) < 20 and (not current or status in {"conflict", "link_failed"}):
            samples.append(
                {
                    "raw_row_number": row_number,
                    "internal_source_id": item.get("internal_source_id")
                    if isinstance(item, dict)
                    else None,
                    "detected_columns": sorted(detected_values),
                    "detected_values": {
                        key: detected_values[key] for key in sorted(detected_values)
                    },
                    "current_author_or_publisher": current,
                    "recovery_status": status,
                    "reason": reason,
                }
            )

    return {
        "source_type": source_type,
        "raw_row_count": len(rows),
        "raw_headers": headers,
        "normalized_item_count": len(normalized_items),
        "normalized_missing_author_or_publisher_count": missing_current,
        "candidate_columns": candidates,
        "candidate_column_non_empty_counts": {
            column: non_empty_counts[column] for column in candidates
        },
        "recoverable_row_count": recoverable,
        "unrecoverable_row_count": unrecoverable,
        "raw_row_number_link_failure_count": link_failures,
        "candidate_value_conflict_count": conflicts,
        "samples": samples,
    }


def main():
    parser = argparse.ArgumentParser(description="Audit local Naver attribution fields.")
    parser.add_argument("--news-csv", required=True, type=Path)
    parser.add_argument("--blog-csv", required=True, type=Path)
    parser.add_argument("--news-normalized", required=True, type=Path)
    parser.add_argument("--blog-normalized", required=True, type=Path)
    parser.add_argument("--output-file", required=True, type=Path)
    args = parser.parse_args()

    news = audit_source("news", args.news_csv, args.news_normalized)
    blog = audit_source("blog", args.blog_csv, args.blog_normalized)
    report = {
        "sources": {"news": news, "blog": blog},
        "total_recoverable_row_count": news["recoverable_row_count"]
        + blog["recoverable_row_count"],
        "total_unrecoverable_row_count": news["unrecoverable_row_count"]
        + blog["unrecoverable_row_count"],
        "total_raw_row_number_link_failure_count": news[
            "raw_row_number_link_failure_count"
        ]
        + blog["raw_row_number_link_failure_count"],
        "total_candidate_value_conflict_count": news["candidate_value_conflict_count"]
        + blog["candidate_value_conflict_count"],
    }
    args.output_file.parent.mkdir(parents=True, exist_ok=True)
    args.output_file.write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
