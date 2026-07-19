"""Normalize existing local Naver news and blog exports for sandbox review."""

import argparse
import csv
import hashlib
import html
import json
from datetime import datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit


class _TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []

    def handle_data(self, data):
        self.parts.append(data)


def clean_text(value):
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    parser = _TextExtractor()
    parser.feed(html.unescape(text))
    parser.close()
    cleaned = " ".join("".join(parser.parts).split())
    return cleaned or None


def canonicalize_url(value):
    text = clean_text(value)
    if not text:
        return None
    if "://" not in text:
        text = f"https://{text}"
    try:
        parts = urlsplit(text)
        if not parts.netloc:
            return None
        scheme = parts.scheme.lower() or "https"
        hostname = (parts.hostname or "").lower()
        port = f":{parts.port}" if parts.port else ""
        netloc = f"{hostname}{port}"
        path = parts.path or "/"
        if path != "/":
            path = path.rstrip("/")
        query = urlencode(sorted(parse_qsl(parts.query, keep_blank_values=True)), doseq=True)
        return urlunsplit((scheme, netloc, path, query, ""))
    except ValueError:
        return None


def stable_hash(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def first_value(row, names):
    for name in names:
        value = clean_text(row.get(name))
        if value:
            return value
    return None


def normalize_date(value, source_type):
    text = clean_text(value)
    if not text:
        return None
    formats = (
        ("%a, %d %b %Y %H:%M:%S %z",) if source_type == "news" else ("%Y%m%d",)
    )
    for date_format in formats:
        try:
            parsed = datetime.strptime(text, date_format)
            return parsed.isoformat()
        except ValueError:
            continue
    return text


def load_rows(path):
    suffix = path.suffix.lower()
    if suffix == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            return list(csv.DictReader(handle))
    if suffix == ".json":
        with path.open("r", encoding="utf-8-sig") as handle:
            payload = json.load(handle)
        if isinstance(payload, list):
            return payload
        if isinstance(payload, dict):
            for key in ("items", "results", "data"):
                if isinstance(payload.get(key), list):
                    return payload[key]
        raise ValueError(f"JSON export must contain a row list: {path}")
    raise ValueError(f"Unsupported export format: {path}")


def normalize_row(row, row_number, source_type, artist_name, artist_slug):
    if not isinstance(row, dict):
        raise ValueError("Export row is not an object")

    title = first_value(row, ("title", "name"))
    summary = first_value(row, ("description", "summary"))
    published_at = normalize_date(
        first_value(row, ("pubDate", "postdate", "published_at", "publishedAt")),
        source_type,
    )
    if source_type == "news":
        source_url = canonicalize_url(first_value(row, ("originallink", "link", "url")))
        author_or_publisher = first_value(row, ("publisher", "author"))
    else:
        source_url = canonicalize_url(first_value(row, ("link", "url")))
        author_or_publisher = first_value(row, ("bloggername", "author", "publisher"))

    supplied_external_id = first_value(
        row, ("external_source_id", "external_id", "document_id", "id")
    )
    if supplied_external_id:
        external_source_id = supplied_external_id
    elif source_url:
        external_source_id = f"url_{stable_hash(source_url)[:32]}"
    else:
        fallback_identity = "\n".join(
            (title or "", published_at or "", author_or_publisher or "")
        )
        external_source_id = f"fallback_{stable_hash(fallback_identity)[:32]}"

    internal_identity = f"naver\n{source_type}\n{external_source_id}"
    content_identity = "\n".join(
        (
            source_url or "",
            title or "",
            summary or "",
            published_at or "",
            author_or_publisher or "",
        )
    )
    deduplication_key = source_url or "fallback:" + "\n".join(
        (title or "", published_at or "", author_or_publisher or "")
    )

    item = {
        "internal_source_id": f"src_{stable_hash(internal_identity)[:32]}",
        "provider_key": "naver",
        "source_type": source_type,
        "artist_name": artist_name,
        "artist_slug": artist_slug,
        "external_source_id": external_source_id,
        "source_url": source_url,
        "title": title,
        "summary": summary,
        "published_at": published_at,
        "author_or_publisher": author_or_publisher,
        "collected_at": None,
        "raw_row_number": row_number,
        "content_hash": stable_hash(content_identity),
    }
    return item, deduplication_key


def normalize_export(path, source_type, artist_name, artist_slug):
    rows = load_rows(path)
    items = []
    seen = set()
    metrics = {
        "input_rows": len(rows),
        "converted_rows": 0,
        "duplicates_removed": 0,
        "missing_url_rows": 0,
        "missing_date_rows": 0,
        "error_rows": 0,
    }

    for row_number, row in enumerate(rows, start=2):
        try:
            item, deduplication_key = normalize_row(
                row, row_number, source_type, artist_name, artist_slug
            )
            if not item["source_url"]:
                metrics["missing_url_rows"] += 1
            if not item["published_at"]:
                metrics["missing_date_rows"] += 1
            if deduplication_key in seen:
                metrics["duplicates_removed"] += 1
                continue
            seen.add(deduplication_key)
            items.append(item)
            metrics["converted_rows"] += 1
        except (TypeError, ValueError, KeyError):
            metrics["error_rows"] += 1

    return items, metrics


def write_json(path, payload):
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main():
    parser = argparse.ArgumentParser(
        description="Normalize existing Naver exports into local sandbox JSON."
    )
    parser.add_argument("--artist-name", required=True)
    parser.add_argument("--artist-slug", required=True)
    parser.add_argument("--news-file", required=True, type=Path)
    parser.add_argument("--blog-file", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    news_items, news_metrics = normalize_export(
        args.news_file, "news", args.artist_name, args.artist_slug
    )
    blog_items, blog_metrics = normalize_export(
        args.blog_file, "blog", args.artist_name, args.artist_slug
    )

    args.output_dir.mkdir(parents=True, exist_ok=True)
    write_json(args.output_dir / "news.normalized.json", news_items)
    write_json(args.output_dir / "blog.normalized.json", blog_items)

    summary = {
        "artist_name": args.artist_name,
        "artist_slug": args.artist_slug,
        "provider_key": "naver",
        "input_rows": {
            "news": news_metrics["input_rows"],
            "blog": blog_metrics["input_rows"],
            "total": news_metrics["input_rows"] + blog_metrics["input_rows"],
        },
        "converted_rows": {
            "news": news_metrics["converted_rows"],
            "blog": blog_metrics["converted_rows"],
            "total": news_metrics["converted_rows"] + blog_metrics["converted_rows"],
        },
        "duplicates_removed": news_metrics["duplicates_removed"]
        + blog_metrics["duplicates_removed"],
        "missing_url_rows": news_metrics["missing_url_rows"]
        + blog_metrics["missing_url_rows"],
        "missing_date_rows": news_metrics["missing_date_rows"]
        + blog_metrics["missing_date_rows"],
        "news_result_count": len(news_items),
        "blog_result_count": len(blog_items),
        "error_rows": news_metrics["error_rows"] + blog_metrics["error_rows"],
        "source_metrics": {"news": news_metrics, "blog": blog_metrics},
    }
    write_json(args.output_dir / "import-summary.json", summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
