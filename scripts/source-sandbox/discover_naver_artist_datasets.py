"""Discover read-only Naver news/blog dataset candidates in a local archive."""

import argparse
import csv
import json
import hashlib
from pathlib import Path
from collections import Counter, defaultdict
from datetime import datetime, timezone
import re
import os


DISCOVERY_VERSION = "v1"
NEWS_HEADERS = {"query", "title", "originallink", "link", "description", "pubDate"}
BLOG_HEADERS = {"query", "title", "link", "description", "bloggername", "bloggerlink", "postdate"}
NEWS_ATTRIBUTION = {"publisher", "publisher_name", "press", "press_name", "media", "media_name", "office", "office_name", "provider", "journalist", "reporter", "author", "author_name", "writer", "writer_name"}
BLOG_ATTRIBUTION = {"bloggername", "blogger_name", "blogname", "blog_name", "author", "author_name", "writer", "writer_name", "publisher", "publisher_name"}


def normalize_text(value):
    return " ".join(str(value or "").strip().split()).casefold()


def sha256_file(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def timestamp_candidate(name):
    matches = re.findall(r"(?<!\d)(20\d{6})[_-]?(\d{6})(?!\d)", name)
    if not matches:
        return None
    try:
        return datetime.strptime("".join(matches[-1]), "%Y%m%d%H%M%S")
    except ValueError:
        return None


def safe_coverage(count, total):
    return round(count / total, 6) if total else 0.0


def header_kind(headers, filename):
    header_set = set(headers)
    if NEWS_HEADERS <= header_set:
        return "news", True
    if BLOG_HEADERS <= header_set:
        return "blog", True
    name = filename.casefold()
    if "naver_news" in name:
        return "news", False
    if "naver_blog" in name:
        return "blog", False
    return None, False


def evidence_pattern(term):
    value = normalize_text(term)
    compact = re.sub(r"\s+", "", value)
    if not value or len(compact) < 2:
        return None
    if value.isascii():
        if len(value) <= 2:
            return re.compile(r"(?<![a-z0-9])" + re.escape(value) + r"(?![a-z0-9])", re.I)
        return re.compile(r"(?<![a-z0-9])" + re.escape(value) + r"(?![a-z0-9])", re.I)
    return re.compile(re.escape(value), re.I)


def row_has_identity(row, terms):
    values = [normalize_text(row.get(key)) for key in ("query", "title", "description")]
    patterns = [pattern for pattern in (evidence_pattern(term) for term in terms) if pattern]
    return any(pattern.search(value) for pattern in patterns for value in values)


def parse_registry(path):
    text = Path(path).read_text(encoding="utf-8")
    artists = []
    for match in re.finditer(r"createArtist\(\{(.*?)\}\)", text, re.S):
        block = match.group(1)
        fields = {}
        for key in ("id", "ticker", "name"):
            found = re.search(rf"\b{key}:\s*(['\"])(.*?)\1", block, re.S)
            if found:
                fields[key] = found.group(2)
        if not all(key in fields for key in ("id", "ticker", "name")):
            continue
        aliases = []
        for key in ("aliases", "koreanAliases", "englishAliases"):
            found = re.search(rf"\b{key}:\s*\[(.*?)\]", block, re.S)
            if found:
                aliases.extend(value for _, value in re.findall(r"(['\"])(.*?)\1", found.group(1), re.S))
        artists.append({"id": fields["id"], "slug": fields["id"], "name": fields["name"], "ticker": fields["ticker"], "aliases": sorted(set(aliases), key=str.casefold)})
    return artists


def identity_match(query, registry):
    normalized = normalize_text(query)
    exact, aliases = [], []
    for artist in registry:
        exact_values = {normalize_text(artist[key]) for key in ("name", "ticker", "slug")}
        alias_values = {normalize_text(value) for value in artist.get("aliases", [])}
        if normalized in exact_values:
            exact.append(artist)
        elif normalized in alias_values:
            aliases.append(artist)
    matches = exact + aliases
    unique = {artist["id"]: artist for artist in matches}
    if len(unique) > 1:
        return "ambiguous_registry_match", list(unique.values())
    if exact:
        return "exact_registry_match", exact[:1]
    if aliases:
        return "alias_registry_match", aliases[:1]
    return "no_registry_match", []


def scan_csv(path, archive_root):
    relative = path.relative_to(archive_root).as_posix()
    file_hash = sha256_file(path)
    try:
        handle = path.open("r", encoding="utf-8-sig", newline="")
        encoding_ok = True
    except UnicodeError:
        return {"relative": relative, "file_id": hashlib.sha256(relative.encode()).hexdigest(), "file_sha256": file_hash, "source_type": None, "headers_complete": False, "read_ok": False, "invalid_reason": "csv_encoding_error"}
    try:
        with handle:
            reader = csv.DictReader(handle)
            headers = list(reader.fieldnames or [])
            source_type, complete = header_kind(headers, path.name)
            if source_type is None:
                return None
            rows, malformed = [], 0
            queries = Counter()
            for row in reader:
                if None in row:
                    malformed += 1
                rows.append(row)
                query = " ".join(str(row.get("query") or "").strip().split())
                if query:
                    queries[query] += 1
            candidates = NEWS_ATTRIBUTION if source_type == "news" else BLOG_ATTRIBUTION
            attribution_columns = sorted(set(headers) & candidates)
            attribution_count = sum(any(str(row.get(column) or "").strip() for column in attribution_columns) for row in rows)
            return {
                "relative": relative, "file_id": hashlib.sha256(relative.encode("utf-8")).hexdigest(), "file_sha256": file_hash,
                "source_type": source_type, "headers": headers, "headers_complete": complete, "read_ok": encoding_ok,
                "row_count": len(rows), "queries": dict(queries), "normalized_queries": sorted({normalize_text(query) for query in queries}),
                "malformed_count": malformed, "timestamp": timestamp_candidate(path.name), "parent": path.parent.relative_to(archive_root).as_posix(),
                "attribution_present": bool(attribution_columns), "attribution_count": attribution_count, "rows": rows,
                "invalid_reason": None if complete else f"missing_{source_type}_required_headers",
            }
    except (UnicodeError, csv.Error):
        return {"relative": relative, "file_id": hashlib.sha256(relative.encode("utf-8")).hexdigest(), "file_sha256": file_hash, "source_type": "news" if "naver_news" in path.name.casefold() else "blog", "headers_complete": False, "read_ok": False, "invalid_reason": "csv_read_error"}


def pair_score(news, blog):
    same_directory = news["parent"] == blog["parent"]
    if news["timestamp"] and blog["timestamp"]:
        distance = abs((news["timestamp"] - blog["timestamp"]).total_seconds())
    else:
        distance = float("inf")
    return (0 if same_directory else 1, distance, news["relative"].casefold(), blog["relative"].casefold())


def create_candidate(query, news_exports, blog_exports, registry):
    normalized_query = normalize_text(query)
    reasons = []
    news = blog = None
    tie = False
    if news_exports and blog_exports:
        ranked = sorted(((pair_score(n, b), n, b) for n in news_exports for b in blog_exports), key=lambda item: item[0])
        _, news, blog = ranked[0]
        best_priority = ranked[0][0][:2]
        tie = sum(item[0][:2] == best_priority for item in ranked) > 1
    elif news_exports:
        news = sorted(news_exports, key=lambda item: item["relative"].casefold())[0]
    elif blog_exports:
        blog = sorted(blog_exports, key=lambda item: item["relative"].casefold())[0]
    display_query = query
    match_status, matches = identity_match(query, registry) if normalized_query else ("no_registry_match", [])
    proposed = matches[0] if len(matches) == 1 else None
    terms = [query]
    if proposed:
        terms += [proposed["name"], proposed["ticker"]]
    news_evidence = sum(row_has_identity(row, terms) for row in news.get("rows", [])) if news else 0
    blog_evidence = sum(row_has_identity(row, terms) for row in blog.get("rows", [])) if blog else 0
    news_count = news.get("row_count", 0) if news else 0
    blog_count = blog.get("row_count", 0) if blog else 0
    news_coverage, blog_coverage = safe_coverage(news_evidence, news_count), safe_coverage(blog_evidence, blog_count)
    blog_attr = safe_coverage(blog.get("attribution_count", 0), blog_count) if blog else 0.0
    if not normalized_query: reasons.append("missing_query_identity")
    if not news: reasons.append("missing_news_export")
    if not blog: reasons.append("missing_blog_export")
    if news and blog and (news["normalized_queries"] != [normalized_query] or blog["normalized_queries"] != [normalized_query]): reasons.append("query_mismatch")
    if news and not news.get("headers_complete"): reasons.append("news_required_headers_missing")
    if blog and not blog.get("headers_complete"): reasons.append("blog_required_headers_missing")
    if news and news_count == 0: reasons.append("news_empty")
    if blog and blog_count == 0: reasons.append("blog_empty")
    if (news and news.get("malformed_count")) or (blog and blog.get("malformed_count")): reasons.append("malformed_rows")
    if match_status == "ambiguous_registry_match": reasons.append("ambiguous_registry_identity")
    if match_status == "no_registry_match": reasons.append("registry_identity_not_found")
    if news and news_coverage < 1: reasons.append("news_identity_coverage_incomplete")
    if blog and blog_coverage < 1: reasons.append("blog_identity_coverage_incomplete")
    if blog and blog_attr < 1: reasons.append("blog_attribution_incomplete")
    if tie: reasons.append("multiple_export_pair_tie")
    existing_iu = normalized_query in {"아이유", "iu"} or (proposed and proposed["id"] == "iu")
    if existing_iu: reasons.append("existing_sandbox_artist")
    blocking = {"missing_query_identity", "missing_news_export", "missing_blog_export", "query_mismatch", "news_required_headers_missing", "blog_required_headers_missing", "news_empty", "blog_empty", "malformed_rows", "ambiguous_registry_identity"}
    if any(reason in blocking for reason in reasons): readiness = "blocked"
    elif reasons: readiness = "review_required"
    else: readiness = "ready"
    news_hash = news.get("file_sha256", "missing") if news else "missing"
    blog_hash = blog.get("file_sha256", "missing") if blog else "missing"
    candidate_id = hashlib.sha256("\n".join((normalized_query, news_hash, blog_hash)).encode("utf-8")).hexdigest()
    return {
        "candidate_id": candidate_id, "normalized_query": normalized_query, "display_query": display_query,
        "readiness_status": readiness, "readiness_reason_codes": sorted(set(reasons)), "identity_match_status": match_status,
        "registry_candidate_ids": sorted(artist["id"] for artist in matches), "proposed_registry_id": proposed["id"] if proposed else None,
        "proposed_artist_name": proposed["name"] if proposed else None, "proposed_artist_slug": proposed["slug"] if proposed else None,
        "proposed_sandbox_artist_key": f"sandbox:artist:{proposed['slug']}" if proposed else None,
        "news_file_id": news.get("file_id") if news else None, "blog_file_id": blog.get("file_id") if blog else None,
        "news_row_count": news_count, "blog_row_count": blog_count, "combined_row_count": news_count + blog_count,
        "news_required_headers_complete": bool(news and news.get("headers_complete")), "blog_required_headers_complete": bool(blog and blog.get("headers_complete")),
        "news_malformed_row_count": news.get("malformed_count", 0) if news else 0, "blog_malformed_row_count": blog.get("malformed_count", 0) if blog else 0,
        "news_identity_evidence_row_count": news_evidence, "blog_identity_evidence_row_count": blog_evidence,
        "news_identity_evidence_coverage": news_coverage, "blog_identity_evidence_coverage": blog_coverage,
        "news_attribution_candidate_present": bool(news and news.get("attribution_present")), "news_attribution_coverage": safe_coverage(news.get("attribution_count", 0), news_count) if news else 0.0,
        "blog_attribution_candidate_present": bool(blog and blog.get("attribution_present")), "blog_attribution_coverage": blog_attr,
        "exception_review_expected": bool(news and not news.get("attribution_present")),
        "alternate_news_export_count": max(0, len(news_exports) - 1), "alternate_blog_export_count": max(0, len(blog_exports) - 1),
    }


def recommend(candidates):
    eligible = [item for item in candidates if item["readiness_status"] == "ready" and "existing_sandbox_artist" not in item["readiness_reason_codes"]]
    eligible.sort(key=lambda item: (-item["combined_row_count"], item["normalized_query"]))
    return eligible[0] if eligible else None


def sample(item):
    keys = ("candidate_id", "display_query", "readiness_status", "identity_match_status", "proposed_artist_name", "proposed_artist_slug", "news_row_count", "blog_row_count", "readiness_reason_codes")
    return {key: item[key] for key in keys}


def build_summary(candidates, recommendation, archive_count, csv_count, valid_news, valid_blog, invalid_reasons):
    readiness = Counter(item["readiness_status"] for item in candidates)
    identity = Counter(item["identity_match_status"] for item in candidates)
    reasons = Counter(reason for item in candidates for reason in item["readiness_reason_codes"])
    summary = {
        "discovery_version": DISCOVERY_VERSION, "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "archive_file_count": archive_count, "csv_file_count": csv_count, "valid_news_export_count": valid_news, "valid_blog_export_count": valid_blog,
        "invalid_csv_candidate_count": sum(invalid_reasons.values()), "distinct_query_count": len(candidates), "paired_candidate_count": sum(item["news_file_id"] is not None and item["blog_file_id"] is not None for item in candidates),
        "ready_candidate_count": readiness["ready"], "review_required_candidate_count": readiness["review_required"], "blocked_candidate_count": readiness["blocked"],
        "existing_iu_candidate_count": sum("existing_sandbox_artist" in item["readiness_reason_codes"] for item in candidates),
        "exact_registry_match_count": identity["exact_registry_match"], "alias_registry_match_count": identity["alias_registry_match"], "ambiguous_registry_match_count": identity["ambiguous_registry_match"], "no_registry_match_count": identity["no_registry_match"],
        "recommended_candidate_id": recommendation["candidate_id"] if recommendation else None, "recommended_query": recommendation["display_query"] if recommendation else None,
        "recommended_registry_id": recommendation["proposed_registry_id"] if recommendation else None, "recommended_artist_name": recommendation["proposed_artist_name"] if recommendation else None,
        "recommended_artist_slug": recommendation["proposed_artist_slug"] if recommendation else None, "recommended_news_row_count": recommendation["news_row_count"] if recommendation else None,
        "recommended_blog_row_count": recommendation["blog_row_count"] if recommendation else None, "recommended_combined_row_count": recommendation["combined_row_count"] if recommendation else None,
        "recommended_exception_review_expected": recommendation["exception_review_expected"] if recommendation else None,
        "readiness_reason_code_counts": dict(sorted(reasons.items())), "invalid_candidate_reason_counts": dict(sorted(invalid_reasons.items())),
        "ready_candidate_summaries": [sample(item) for item in candidates if item["readiness_status"] == "ready"][:20],
        "review_required_candidate_summaries": [sample(item) for item in candidates if item["readiness_status"] == "review_required"][:20],
        "blocked_candidate_summaries": [sample(item) for item in candidates if item["readiness_status"] == "blocked"][:20],
        "deterministic_discovery_sha256": hashlib.sha256(canonical_bytes(candidates)).hexdigest(),
    }
    return summary


def discover(archive_root, repo_root):
    all_files = sorted((path for path in archive_root.rglob("*") if path.is_file()), key=lambda path: path.relative_to(archive_root).as_posix().casefold())
    csv_files = [path for path in all_files if path.suffix.casefold() == ".csv"]
    archive_hashes = {path: sha256_file(path) for path in csv_files}
    iu_root = repo_root / "tmp/source-sandbox/naver/iu"
    iu_hashes = {path: sha256_file(path) for path in iu_root.rglob("*") if path.is_file()}
    exports, invalid_reasons = [], Counter()
    for path in csv_files:
        result = scan_csv(path, archive_root)
        if result is None:
            continue
        if result.get("invalid_reason"):
            invalid_reasons[result["invalid_reason"]] += 1
        else:
            exports.append(result)
    registry = parse_registry(repo_root / "app/data/v4/artistUniverse.ts")
    by_query = defaultdict(lambda: {"news": [], "blog": [], "display": Counter()})
    for export in exports:
        for display, count in export["queries"].items():
            normalized = normalize_text(display)
            by_query[normalized][export["source_type"]].append(export)
            by_query[normalized]["display"][display] += count
        if not export["queries"]:
            by_query[""][export["source_type"]].append(export)
    candidates = []
    for normalized_query in sorted(by_query):
        group = by_query[normalized_query]
        display = sorted(group["display"].items(), key=lambda item: (-item[1], item[0].casefold()))[0][0] if group["display"] else ""
        candidates.append(create_candidate(display, group["news"], group["blog"], registry))
    recommendation = recommend(candidates)
    if any(sha256_file(path) != value for path, value in archive_hashes.items()):
        raise RuntimeError("archive_csv_hash_changed")
    if any(sha256_file(path) != value for path, value in iu_hashes.items()):
        raise RuntimeError("iu_canonical_hash_changed")
    summary = build_summary(candidates, recommendation, len(all_files), len(csv_files), sum(item["source_type"] == "news" for item in exports), sum(item["source_type"] == "blog" for item in exports), invalid_reasons)
    return candidates, summary


def synthetic_export(source_type, query="AESPA", rows=2, headers_complete=True, malformed=0, identity_rows=None, attribution_rows=None):
    identity_rows = rows if identity_rows is None else identity_rows
    attribution_rows = rows if attribution_rows is None else attribution_rows
    data = []
    for index in range(rows):
        data.append({"query": query if index < identity_rows else "other", "title": "", "description": "", "bloggername": "writer" if index < attribution_rows else ""})
    return {"relative": f"batch/{source_type}.csv", "file_id": source_type, "file_sha256": source_type * 8, "source_type": source_type, "headers_complete": headers_complete, "row_count": rows, "queries": {query: rows}, "normalized_queries": [normalize_text(query)] if query else [], "malformed_count": malformed, "timestamp": datetime(2026,1,1), "parent": "batch", "attribution_present": source_type == "blog", "attribution_count": attribution_rows if source_type == "blog" else 0, "rows": data}


def self_test():
    registry = [{"id":"aespa","slug":"aespa","name":"aespa","ticker":"AESPA","aliases":["에스파"]},{"id":"iu","slug":"iu","name":"IU","ticker":"IU","aliases":["아이유"]}]
    n,b=synthetic_export("news"),synthetic_export("blog")
    ready=create_candidate("AESPA",[n],[b],registry); assert ready["readiness_status"]=="ready" and ready["exception_review_expected"]
    assert create_candidate("AESPA",[n],[],registry)["readiness_status"]=="blocked"
    assert create_candidate("AESPA",[],[b],registry)["readiness_status"]=="blocked"
    mismatch=synthetic_export("blog","OTHER"); assert create_candidate("AESPA",[n],[mismatch],registry)["readiness_status"]=="blocked"
    assert create_candidate("",[synthetic_export("news","")],[synthetic_export("blog","")],registry)["readiness_status"]=="blocked"
    assert create_candidate("AESPA",[synthetic_export("news",headers_complete=False)],[b],registry)["readiness_status"]=="blocked"
    assert create_candidate("AESPA",[synthetic_export("news",malformed=1)],[b],registry)["readiness_status"]=="blocked"
    ambiguous=registry+[{"id":"other","slug":"other","name":"AESPA","ticker":"OTHER","aliases":[]}]; assert create_candidate("AESPA",[n],[b],ambiguous)["readiness_status"]=="blocked"
    assert create_candidate("UNKNOWN",[synthetic_export("news","UNKNOWN")],[synthetic_export("blog","UNKNOWN")],registry)["readiness_status"]=="review_required"
    assert create_candidate("AESPA",[synthetic_export("news",identity_rows=1)],[b],registry)["readiness_status"]=="review_required"
    assert create_candidate("AESPA",[n],[synthetic_export("blog",attribution_rows=1)],registry)["readiness_status"]=="review_required"
    iu=create_candidate("아이유",[synthetic_export("news","아이유")],[synthetic_export("blog","아이유")],registry); assert recommend([iu,ready])==ready
    bigger=create_candidate("에스파",[synthetic_export("news","에스파",3)],[synthetic_export("blog","에스파",3)],registry); assert recommend([ready,bigger])==bigger
    first=[ready,bigger]; second=[create_candidate("AESPA",[n],[b],registry),create_candidate("에스파",[synthetic_export("news","에스파",3)],[synthetic_export("blog","에스파",3)],registry)]; assert [x["candidate_id"] for x in first]==[x["candidate_id"] for x in second]
    serialized=json.dumps(first,ensure_ascii=False); assert "C:/" not in serialized and "archive" not in serialized.casefold()
    print("self-test passed: 16 synthetic discovery cases; no files written")


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--archive-root"); parser.add_argument("--repo-root",default="."); parser.add_argument("--output-file"); parser.add_argument("--summary-file"); parser.add_argument("--self-test",action="store_true")
    args=parser.parse_args()
    if args.self_test: self_test(); return
    if not all((args.archive_root,args.output_file,args.summary_file)): parser.error("--archive-root, --output-file, and --summary-file are required")
    archive_root=Path(args.archive_root).resolve(); repo_root=Path(args.repo_root).resolve()
    if not archive_root.is_dir(): print("archive root does not exist"); raise SystemExit(1)
    try: candidates,summary=discover(archive_root,repo_root)
    except RuntimeError as error: print(f"discovery failed: {error}"); raise SystemExit(1)
    for path,value in ((Path(args.output_file),candidates),(Path(args.summary_file),summary)):
        path.parent.mkdir(parents=True,exist_ok=True); path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"discovery complete: candidates={len(candidates)} ready={summary['ready_candidate_count']} recommendation={summary['recommended_candidate_id']}")


if __name__=="__main__": main()
