"""Prepare a no-selection review packet for discovered Naver artist datasets."""

import argparse
import csv
import json
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter, defaultdict
import re
import os


NEWS_FIELDS = ["query", "title", "originallink", "link", "description", "pubDate"]
BLOG_FIELDS = ["query", "title", "link", "description", "bloggername", "bloggerlink", "postdate"]
NEWS_HEADERS, BLOG_HEADERS = set(NEWS_FIELDS), set(BLOG_FIELDS)
NEWS_ATTRIBUTION = {"publisher", "publisher_name", "press", "press_name", "media", "media_name", "office", "office_name", "provider", "journalist", "reporter", "author", "author_name", "writer", "writer_name"}
BLOG_ATTRIBUTION = {"bloggername", "blogger_name", "blogname", "blog_name", "author", "author_name", "writer", "writer_name", "publisher", "publisher_name"}
PAIR_STATUSES = ["unique_best_pair", "equivalent_duplicate_pair", "unresolved_pair_tie", "missing_export", "invalid_export"]
IDENTITY_STATUSES = ["registry_identity_available", "human_identity_input_required", "ambiguous_identity_review_required", "excluded_existing_sandbox_artist"]


def normalize(value):
    return " ".join(str(value or "").strip().split()).casefold()


def canonical_bytes(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha_file(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def timestamp(name):
    found = re.findall(r"(?<!\d)(20\d{6})[_-]?(\d{6})(?!\d)", name)
    if not found:
        return None
    try:
        return datetime.strptime("".join(found[-1]), "%Y%m%d%H%M%S")
    except ValueError:
        return None


def file_id(relative):
    return hashlib.sha256(relative.encode("utf-8")).hexdigest()


def coverage(count, total):
    return round(count / total, 6) if total else 0.0


def evidence_pattern(term):
    value = normalize(term)
    if len(re.sub(r"\s+", "", value)) < 2:
        return None
    if value.isascii():
        return re.compile(r"(?<![a-z0-9])" + re.escape(value) + r"(?![a-z0-9])", re.I)
    return re.compile(re.escape(value), re.I)


def has_identity(row, terms):
    patterns = [item for item in (evidence_pattern(term) for term in terms) if item]
    values = [normalize(row.get(key)) for key in ("query", "title", "description")]
    return any(pattern.search(value) for pattern in patterns for value in values)


def fingerprint(rows, fields, sort_rows=False):
    normalized = [[normalize(row.get(field)) for field in fields] for row in rows]
    if sort_rows:
        normalized.sort()
    return hashlib.sha256(canonical_bytes(normalized)).hexdigest()


def scan_export(path, root):
    relative = path.relative_to(root).as_posix()
    name = path.name.casefold()
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        headers = list(reader.fieldnames or [])
        header_set = set(headers)
        if NEWS_HEADERS <= header_set:
            source_type, fields, attribution = "news", NEWS_FIELDS, NEWS_ATTRIBUTION
        elif BLOG_HEADERS <= header_set:
            source_type, fields, attribution = "blog", BLOG_FIELDS, BLOG_ATTRIBUTION
        elif "naver_news" in name:
            source_type, fields, attribution = "news", NEWS_FIELDS, NEWS_ATTRIBUTION
        elif "naver_blog" in name:
            source_type, fields, attribution = "blog", BLOG_FIELDS, BLOG_ATTRIBUTION
        else:
            return None
        rows, malformed = [], 0
        for row in reader:
            malformed += int(None in row)
            rows.append(row)
    complete = set(fields) <= set(headers)
    columns = sorted(set(headers) & attribution)
    attr_count = sum(any(str(row.get(column) or "").strip() for column in columns) for row in rows)
    queries = Counter(" ".join(str(row.get("query") or "").strip().split()) for row in rows if str(row.get("query") or "").strip())
    return {
        "file_id": file_id(relative), "file_sha256": sha_file(path), "source_type": source_type,
        "row_count": len(rows), "required_complete": complete, "malformed": malformed,
        "normalized_queries": sorted({normalize(query) for query in queries}), "display_queries": dict(queries),
        "timestamp": timestamp(path.name), "parent_hash": hashlib.sha256(path.parent.relative_to(root).as_posix().encode("utf-8")).hexdigest(),
        "relative_sort": relative.casefold(), "ordered_fingerprint": fingerprint(rows, fields),
        "content_set_fingerprint": fingerprint(rows, fields, True), "attribution_present": bool(columns),
        "attribution_coverage": coverage(attr_count, len(rows)), "rows": rows,
    }


def priority(news, blog):
    same = news["parent_hash"] == blog["parent_hash"]
    distance = abs((news["timestamp"] - blog["timestamp"]).total_seconds()) if news["timestamp"] and blog["timestamp"] else float("inf")
    return (0 if same else 1, distance)


def equivalent(item, selected):
    return item["row_count"] == selected["row_count"] and (item["ordered_fingerprint"] == selected["ordered_fingerprint"] or item["content_set_fingerprint"] == selected["content_set_fingerprint"])


def resolve_pair(candidate, news_items, blog_items):
    selected_news = next((item for item in news_items if item["file_id"] == candidate.get("news_file_id")), None)
    selected_blog = next((item for item in blog_items if item["file_id"] == candidate.get("blog_file_id")), None)
    if not selected_news or not selected_blog:
        return "missing_export", selected_news, selected_blog, [], []
    if not selected_news["required_complete"] or not selected_blog["required_complete"] or selected_news["malformed"] or selected_blog["malformed"]:
        return "invalid_export", selected_news, selected_blog, [], []
    selected_priority = priority(selected_news, selected_blog)
    tied_news = {n["file_id"]: n for n in news_items for b in blog_items if priority(n, b) == selected_priority}
    tied_blog = {b["file_id"]: b for n in news_items for b in blog_items if priority(n, b) == selected_priority}
    news_alternates = [item for key, item in sorted(tied_news.items()) if key != selected_news["file_id"]]
    blog_alternates = [item for key, item in sorted(tied_blog.items()) if key != selected_blog["file_id"]]
    if not news_alternates and not blog_alternates:
        status = "unique_best_pair"
    elif all(equivalent(item, selected_news) for item in news_alternates) and all(equivalent(item, selected_blog) for item in blog_alternates):
        status = "equivalent_duplicate_pair"
    else:
        status = "unresolved_pair_tie"
    return status, selected_news, selected_blog, news_alternates, blog_alternates


def identity_status(candidate):
    if "existing_sandbox_artist" in candidate.get("readiness_reason_codes", []):
        return "excluded_existing_sandbox_artist"
    if candidate.get("identity_match_status") == "ambiguous_registry_match":
        return "ambiguous_identity_review_required"
    if candidate.get("identity_match_status") == "no_registry_match":
        return "human_identity_input_required"
    return "registry_identity_available"


def packet_status(candidate, pair_status, identity, blog_attr):
    if identity == "excluded_existing_sandbox_artist": return "excluded"
    if pair_status in {"missing_export", "invalid_export"}: return "blocked"
    if pair_status == "unresolved_pair_tie": return "needs_pair_resolution"
    if identity in {"human_identity_input_required", "ambiguous_identity_review_required"}: return "needs_identity_resolution"
    if blog_attr < 1: return "needs_attribution_review"
    return "selectable_for_human_review"


def make_packet(candidate, exports, version):
    query = candidate["normalized_query"]
    news = [item for item in exports if item["source_type"] == "news" and query in item["normalized_queries"]]
    blog = [item for item in exports if item["source_type"] == "blog" and query in item["normalized_queries"]]
    pair, selected_news, selected_blog, alt_news, alt_blog = resolve_pair(candidate, news, blog)
    identity = identity_status(candidate)
    blog_attr = selected_blog["attribution_coverage"] if selected_blog else 0.0
    status = packet_status(candidate, pair, identity, blog_attr)
    reasons = set(candidate.get("readiness_reason_codes", []))
    reasons.add(pair)
    reasons.add(identity)
    if blog_attr < 1: reasons.add("blog_attribution_incomplete")
    if status == "excluded": reasons.add("existing_sandbox_artist")
    news_terms = [candidate["display_query"], candidate.get("proposed_artist_name")]
    news_identity = coverage(sum(has_identity(row, news_terms) for row in selected_news["rows"]), selected_news["row_count"]) if selected_news else 0.0
    blog_identity = coverage(sum(has_identity(row, news_terms) for row in selected_blog["rows"]), selected_blog["row_count"]) if selected_blog else 0.0
    def eq_count(items, selected): return sum(equivalent(item, selected) for item in items) if selected else 0
    item_id = hashlib.sha256("\n".join((version, candidate["candidate_id"], pair)).encode("utf-8")).hexdigest()
    return {
        "packet_item_id": item_id, "candidate_id": candidate["candidate_id"], "normalized_query": query, "display_query": candidate["display_query"],
        "original_readiness_status": candidate["readiness_status"], "packet_status": status, "packet_reason_codes": sorted(reasons),
        "pair_resolution_status": pair, "identity_resolution_status": identity, "identity_match_status": candidate["identity_match_status"],
        "registry_candidate_ids": candidate["registry_candidate_ids"], "proposed_registry_id": candidate["proposed_registry_id"], "proposed_artist_name": candidate["proposed_artist_name"], "proposed_artist_slug": candidate["proposed_artist_slug"], "proposed_sandbox_artist_key": candidate["proposed_sandbox_artist_key"],
        "selected_news_file_id": selected_news["file_id"] if selected_news else None, "selected_blog_file_id": selected_blog["file_id"] if selected_blog else None,
        "alternate_news_export_count": candidate["alternate_news_export_count"], "alternate_blog_export_count": candidate["alternate_blog_export_count"],
        "equivalent_news_export_count": eq_count(alt_news, selected_news), "equivalent_blog_export_count": eq_count(alt_blog, selected_blog),
        "differing_news_export_count": len(alt_news) - eq_count(alt_news, selected_news), "differing_blog_export_count": len(alt_blog) - eq_count(alt_blog, selected_blog),
        "news_row_count": selected_news["row_count"] if selected_news else 0, "blog_row_count": selected_blog["row_count"] if selected_blog else 0,
        "combined_row_count": (selected_news["row_count"] if selected_news else 0) + (selected_blog["row_count"] if selected_blog else 0),
        "news_identity_evidence_coverage": news_identity, "blog_identity_evidence_coverage": blog_identity,
        "news_attribution_coverage": selected_news["attribution_coverage"] if selected_news else 0.0, "blog_attribution_coverage": blog_attr,
        "exception_review_expected": bool(selected_news and not selected_news["attribution_present"]),
        "human_selection_allowed": status not in {"excluded", "blocked"}, "selection_status": "not_selected",
    }


def template_entry(packet):
    return {"packet_item_id": packet["packet_item_id"], "candidate_id": packet["candidate_id"], "display_query": packet["display_query"], "pair_resolution_status": packet["pair_resolution_status"], "identity_resolution_status": packet["identity_resolution_status"], "selection_intent": "not_selected", "reviewer_id": None, "rationale_codes": [], "reviewer_note": None, "reviewed_at": None, "selected_registry_id": None, "selected_artist_name": None, "selected_artist_slug": None, "selected_sandbox_artist_key": None, "selected_news_file_id": None, "selected_blog_file_id": None, "production_registry_unchanged_acknowledged": False}


def summary(packet, template, version):
    statuses = Counter(item["packet_status"] for item in packet); pairs = Counter(item["pair_resolution_status"] for item in packet); identities = Counter(item["identity_resolution_status"] for item in packet); reasons = Counter(reason for item in packet for reason in item["packet_reason_codes"])
    active = [item for item in packet if item["packet_status"] != "excluded"]
    allowed = ("candidate_id", "display_query", "packet_status", "pair_resolution_status", "identity_resolution_status", "identity_match_status", "news_row_count", "blog_row_count", "combined_row_count", "news_identity_evidence_coverage", "blog_identity_evidence_coverage", "news_attribution_coverage", "blog_attribution_coverage", "packet_reason_codes")
    return {"contract_version": version, "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"), "total_candidate_count": len(packet), "existing_iu_excluded_count": statuses["excluded"], "active_candidate_count": len(active), "selectable_for_human_review_count": statuses["selectable_for_human_review"], "needs_pair_resolution_count": statuses["needs_pair_resolution"], "needs_identity_resolution_count": statuses["needs_identity_resolution"], "needs_attribution_review_count": statuses["needs_attribution_review"], "blocked_count": statuses["blocked"], "unique_best_pair_count": pairs["unique_best_pair"], "equivalent_duplicate_pair_count": pairs["equivalent_duplicate_pair"], "unresolved_pair_tie_count": pairs["unresolved_pair_tie"], "missing_export_count": pairs["missing_export"], "invalid_export_count": pairs["invalid_export"], "registry_identity_available_count": identities["registry_identity_available"], "human_identity_input_required_count": identities["human_identity_input_required"], "ambiguous_identity_review_required_count": identities["ambiguous_identity_review_required"], "selection_template_entry_count": len(template), "not_selected_count": sum(item["selection_intent"] == "not_selected" for item in template), "duplicate_packet_item_id_count": len(packet)-len({item["packet_item_id"] for item in packet}), "duplicate_candidate_id_count": len(packet)-len({item["candidate_id"] for item in packet}), "packet_status_counts": dict(sorted(statuses.items())), "pair_resolution_status_counts": dict(sorted(pairs.items())), "identity_resolution_status_counts": dict(sorted(identities.items())), "packet_reason_code_counts": dict(sorted(reasons.items())), "active_candidate_review_summaries": [{key:item[key] for key in allowed} for item in active], "deterministic_packet_sha256": hashlib.sha256(canonical_bytes(packet)).hexdigest(), "deterministic_selection_template_sha256": hashlib.sha256(canonical_bytes(template)).hexdigest()}


def validate_contract(contract):
    return contract.get("contract_version") == "v1" and contract.get("scope") == "local_sandbox_preview_only" and contract.get("production_policy") is False and len(contract.get("selection_intents", [])) == len(set(contract.get("selection_intents", []))) and "not_selected" in contract.get("selection_intents", [])


def synthetic_item(source, key, ordered="a", content="a", rows=1, complete=True, malformed=0, attr=1.0):
    return {"file_id":key,"source_type":source,"row_count":rows,"required_complete":complete,"malformed":malformed,"normalized_queries":["x"],"timestamp":datetime(2026,1,1),"parent_hash":"p","relative_sort":key,"ordered_fingerprint":ordered,"content_set_fingerprint":content,"attribution_present":source=="blog","attribution_coverage":attr,"rows":[{"query":"x","title":"","description":""}]*rows}


def self_test():
    c={"candidate_id":"c","normalized_query":"x","display_query":"X","readiness_status":"review_required","readiness_reason_codes":[],"identity_match_status":"exact_registry_match","registry_candidate_ids":["x"],"proposed_registry_id":"x","proposed_artist_name":"X","proposed_artist_slug":"x","proposed_sandbox_artist_key":"sandbox:artist:x","news_file_id":"n","blog_file_id":"b","alternate_news_export_count":0,"alternate_blog_export_count":0}
    n,b=synthetic_item("news","n"),synthetic_item("blog","b")
    assert resolve_pair(c,[n],[b])[0]=="unique_best_pair"
    assert resolve_pair(c,[n,synthetic_item("news","n2")],[b])[0]=="equivalent_duplicate_pair"
    assert resolve_pair(c,[n,synthetic_item("news","n2","different","a")],[b])[0]=="equivalent_duplicate_pair"
    assert resolve_pair(c,[n,synthetic_item("news","n2","different","a")],[b])[0]=="equivalent_duplicate_pair"
    assert resolve_pair(c,[n,synthetic_item("news","n2","x","y")],[b])[0]=="unresolved_pair_tie"
    assert resolve_pair(c,[],[b])[0]=="missing_export"
    assert resolve_pair(c,[synthetic_item("news","n",complete=False)],[b])[0]=="invalid_export"
    iu=dict(c,readiness_reason_codes=["existing_sandbox_artist"]); p=make_packet(iu,[n,b],"v1"); assert p["packet_status"]=="excluded"
    no=dict(c,identity_match_status="no_registry_match",registry_candidate_ids=[],proposed_registry_id=None,proposed_artist_name=None,proposed_artist_slug=None,proposed_sandbox_artist_key=None); assert make_packet(no,[n,b],"v1")["packet_status"]=="needs_identity_resolution"
    assert make_packet(c,[n,synthetic_item("blog","b",attr=.5)],"v1")["packet_status"]=="needs_attribution_review"
    selectable=make_packet(c,[n,b],"v1"); assert selectable["selection_status"]=="not_selected"
    packets=[p,selectable]; templates=[template_entry(item) for item in packets if item["packet_status"]!="excluded"]; assert len(templates)==1
    t=templates[0]; assert t["selection_intent"]=="not_selected" and t["reviewer_id"] is None and t["rationale_codes"]==[] and not t["production_registry_unchanged_acknowledged"] and all(t[key] is None for key in ("selected_registry_id","selected_artist_name","selected_artist_slug","selected_sandbox_artist_key","selected_news_file_id","selected_blog_file_id"))
    dup=summary([selectable,selectable],[],"v1"); assert dup["duplicate_packet_item_id_count"]==1
    text=json.dumps(packets); assert "C:/" not in text and not any(key in text for key in ('"title"','"description"','"link"'))
    assert [item["packet_item_id"] for item in packets]==[item["packet_item_id"] for item in [p,selectable]]
    print("self-test passed: 18 synthetic packet cases; no files written")


def main():
    parser=argparse.ArgumentParser()
    for name in ("archive-root","repo-root","candidate-file","candidate-summary-file","contract-file","packet-output-file","summary-output-file","selection-template-file"): parser.add_argument("--"+name)
    parser.add_argument("--self-test",action="store_true");args=parser.parse_args()
    if args.self_test:self_test();return
    required=(args.archive_root,args.repo_root,args.candidate_file,args.candidate_summary_file,args.contract_file,args.packet_output_file,args.summary_output_file,args.selection_template_file)
    if not all(required):parser.error("all file arguments are required")
    root,repo=Path(args.archive_root).resolve(),Path(args.repo_root).resolve()
    candidates=json.loads(Path(args.candidate_file).read_text(encoding="utf-8")); candidate_summary=json.loads(Path(args.candidate_summary_file).read_text(encoding="utf-8"));contract=json.loads(Path(args.contract_file).read_text(encoding="utf-8"))
    if not validate_contract(contract):print("invalid selection contract");raise SystemExit(1)
    protected_paths=list(root.rglob("*.csv"))+[Path(args.candidate_file),Path(args.candidate_summary_file)]+[path for path in (repo/"tmp/source-sandbox/naver/iu").rglob("*") if path.is_file()]
    before={path:sha_file(path) for path in protected_paths}
    exports=[]
    for path in sorted(root.rglob("*.csv"),key=lambda p:p.relative_to(root).as_posix().casefold()):
        try:item=scan_export(path,root)
        except (UnicodeError,csv.Error):continue
        if item and item["required_complete"]:exports.append(item)
    packet=sorted((make_packet(candidate,exports,contract["contract_version"]) for candidate in candidates),key=lambda item:item["normalized_query"])
    template=[template_entry(item) for item in packet if item["packet_status"]!="excluded"]
    report=summary(packet,template,contract["contract_version"])
    changed=[os.path.relpath(path,repo) if path.is_relative_to(repo) else path.name for path,value in before.items() if sha_file(path)!=value]
    if changed:print("protected files changed: "+", ".join(changed));raise SystemExit(1)
    for target,value in ((args.packet_output_file,packet),(args.summary_output_file,report),(args.selection_template_file,template)):
        path=Path(target);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print(f"packet complete: candidates={len(packet)} template={len(template)} unresolved={report['unresolved_pair_tie_count']}")


if __name__=="__main__":main()
