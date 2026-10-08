from __future__ import annotations

import concurrent.futures
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[3]
QUEUE = ROOT / "data/fandex-cloud-v10/seed/music_genie_partial39_evidence_triage_v1.json"
METADATA = ROOT / "music_genie_canonical_identity_metadata_v1.json"
OUTPUT = Path("music_genie_partial39_six_year_match_live_v1.json")
TARGETS = ("leehi", "jypark", "sf9", "b1a4", "jeongsewoon", "xlov")
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
}
TRANSIENT = {429, 500, 502, 503, 504}


def compact(value: str) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", str(value or "").strip().lower())


def get(url: str) -> requests.Response:
    error = None
    for attempt in range(1, 4):
        try:
            response = requests.get(url, timeout=20, headers=HEADERS)
            if response.status_code in TRANSIENT and attempt < 3:
                time.sleep(attempt)
                continue
            return response
        except requests.RequestException as exc:
            error = exc
            if attempt < 3:
                time.sleep(attempt)
    raise RuntimeError(f"genie_request_failed:{url}:{type(error).__name__}:{error}")


def label_value(soup: BeautifulSoup, label: str) -> str | None:
    image = soup.find("img", attrs={"alt": label})
    if image:
        li = image.find_parent("li")
        if li:
            value = " ".join(li.stripped_strings).strip()
            if value:
                return value
    for node in soup.find_all(string=lambda s: isinstance(s, str) and label in s):
        parent = node.parent
        if parent is None:
            continue
        li = parent.find_parent("li") or parent
        value = " ".join(li.stripped_strings).strip().replace(label, "", 1).strip()
        if value:
            return value
    return None


def provider_detail(provider_id: str) -> dict:
    url = f"https://www.genie.co.kr/detail/artistInfo?xxnm={provider_id}"
    resp = get(url)
    soup = BeautifulSoup(resp.text, "html.parser")
    node = soup.select_one(".info-zone h2.name") or soup.select_one("h2.name")
    display = " ".join(node.stripped_strings).strip() if node else ""
    activity = label_value(soup, "활동유형")
    year_raw = label_value(soup, "데뷔")
    match = re.search(r"(?:19|20)\d{2}", year_raw or "")
    return {
        "statusCode": resp.status_code, "url": url, "providerDisplay": display,
        "activityTypeRaw": activity, "debutFieldRaw": year_raw,
        "providerDebutYear": int(match.group()) if match else None,
    }


def provider_search(query: str, accepted_keys: set[str]) -> dict:
    url = "https://www.genie.co.kr/search/searchMain?query=" + quote_plus(query)
    resp = get(url)
    soup = BeautifulSoup(resp.text, "html.parser")
    onclick = re.compile(r"""fnViewArtist\(['"]([0-9]+)['"]\)""", re.I)
    href = re.compile(r"artistInfo\?xxnm=([0-9]+)", re.I)
    names = {}
    for a in soup.find_all("a"):
        match = onclick.search(str(a.get("onclick") or "")) or href.search(str(a.get("href") or ""))
        if match is None:
            continue
        display = " ".join(a.stripped_strings).strip()
        if not display:
            img = a.find("img")
            display = str(img.get("alt") or "").strip() if img else ""
        if compact(display) in accepted_keys:
            names[match.group(1)] = display
    return {"query": query, "statusCode": resp.status_code, "exactAliasProviderIds": sorted(names), "exactAliasDisplays": names}


def validate(row: dict, metadata: dict, independent: dict) -> dict:
    cid = row["canonicalArtistId"]
    expected = row["genieProviderArtistId"]
    aliases = [
        metadata["canonicalName"],
        *(metadata.get("aliases") or []),
        *(metadata.get("koreanAliases") or []),
        *(metadata.get("englishAliases") or []),
    ]
    normalized = {compact(a) for a in aliases if compact(a)}
    assert normalized, f"no_canonical_alias:{cid}"
    queries = []
    seen = set()
    for alias in aliases:
        key = compact(alias)
        if key not in seen and len(key) >= 2:
            seen.add(key)
            queries.append(str(alias))

    search_checks = []
    exact_ids = set()
    for alias in queries:
        check = provider_search(alias, normalized)
        search_checks.append(check)
        exact_ids.update(check["exactAliasProviderIds"])
        if expected in exact_ids or any(pid != expected for pid in exact_ids):
            break

    detail = provider_detail(expected)
    type_match = (
        "그룹" in (detail["activityTypeRaw"] or "")
        if metadata["entityType"] == "group"
        else ("솔로" in (detail["activityTypeRaw"] or ""))
    )
    year = independent["externallyCorroboratedDebutYear"]
    issues = []
    if exact_ids != {expected}:
        issues.append("search_alias_identity_not_uniquely_pinned")
    if detail["statusCode"] != 200:
        issues.append("detail_http_not_200")
    if compact(detail["providerDisplay"]) not in normalized:
        issues.append("detail_alias_not_exact")
    if not type_match:
        issues.append("entity_type_conflict")
    if detail["providerDebutYear"] != year:
        issues.append("provider_vs_external_debut_year_conflict")
    if detail["providerDebutYear"] != row["genieDebutYear"]:
        issues.append("provider_vs_historical_detail_year_conflict")
    if row["canonicalDebutYear"] is not None:
        issues.append("canonical_year_was_mutated")
    return {
        "canonicalArtistId": cid, "expectedProviderArtistId": expected,
        "canonicalName": metadata["canonicalName"],
        "canonicalEntityType": metadata["entityType"],
        "canonicalDebutYear": row["canonicalDebutYear"],
        "sourceEvidenceUrl": independent["url"], "sourceEvidencePublisher": independent["evidencePublisher"],
        "externalYear": year, "originalGenieYear": row["genieDebutYear"],
        "searchChecks": search_checks, "observedExactAliasProviderIds": sorted(exact_ids),
        "detail": detail, "entityTypeMatch": type_match,
        "identityAndYearEvidenceConsistent": not issues,
        "reviewStatus": "research_live_validated_not_human_reviewed",
        "issues": issues,
    }


def main() -> None:
    queue = json.loads(QUEUE.read_text(encoding="utf-8-sig"))
    metadata = json.loads(METADATA.read_text(encoding="utf-8-sig"))
    meta_by_id = {row["canonicalArtistId"]: row for row in metadata["artists"]}
    partial = {row["canonicalArtistId"]: row for row in queue["candidates"]}
    external = {row["canonicalArtistId"]: row for row in queue["independentDebutYearCorroborationV2"]["records"]}
    assert len(TARGETS) == len(set(TARGETS)) == 6
    assert all(cid in partial and cid in meta_by_id and cid in external for cid in TARGETS)
    assert all(
        partial[cid]["evidenceGap"] == "canonical_debut_year_unavailable"
        and external[cid]["genieDetailDebutYear"] == external[cid]["externallyCorroboratedDebutYear"]
        and partial[cid]["canonicalDebutYear"] is None
        for cid in TARGETS
    )
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = {
            executor.submit(validate, partial[cid], meta_by_id[cid], external[cid]): cid
            for cid in TARGETS
        }
        for future in concurrent.futures.as_completed(futures):
            cid = futures[future]
            try:
                results.append(future.result())
            except Exception as exc:
                results.append({
                    "canonicalArtistId": cid, "expectedProviderArtistId": partial[cid]["genieProviderArtistId"],
                    "identityAndYearEvidenceConsistent": False,
                    "reviewStatus": "research_probe_error_unresolved",
                    "issues": [type(exc).__name__ + ":" + str(exc)[:500]],
                })
    results.sort(key=lambda r: TARGETS.index(r["canonicalArtistId"]))
    valid = [r["canonicalArtistId"] for r in results if r["identityAndYearEvidenceConsistent"]]
    invalid = [r["canonicalArtistId"] for r in results if not r["identityAndYearEvidenceConsistent"]]
    payload = {
        "version": "music_genie_partial39_six_year_match_live_v1",
        "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
        "provider": "genie", "canonicalUniverseCount": 355,
        "sampleSize": len(TARGETS), "identityAndYearMatchedCount": len(valid),
        "notYetMatchedCount": len(invalid), "matchedCanonicalArtistIds": valid,
        "unmatchedCanonicalArtistIds": invalid, "results": results,
        "candidateReviewOnly": True, "reviewedBindingApproved": False,
        "canonicalMetadataYearChanged": False, "musicSupportedPromoted": False,
        "musicPartitionUnchanged": {"supported": 117, "unresolved": 238, "unsupported": 0},
        "nextGate": "PARTIAL39_SIX_EXTERNAL_YEAR_MATCHES_HUMAN_IDENTITY_REVIEW_REQUIRED",
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("GENIE_SIX_RESULT " + json.dumps({
        "matched": valid, "unmatched": invalid,
        "issues": {r["canonicalArtistId"]: r["issues"] for r in results if r["issues"]},
    }, ensure_ascii=False))
    if invalid:
        raise RuntimeError("genie_six_year_match_live_failed:" + ",".join(invalid))
    print("PASS: Genie partial39 external-year six live identity | 6/6 | source remains 117/238/0")


if __name__ == "__main__":
    main()
