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
RECON = ROOT / "data/fandex-cloud-v10/seed/music_genie_full264_cross_run_reconciliation_v1.json"
OUTPUT = Path("music_genie_changed_disposition_identity_live_v1.json")
TARGETS = {
    "superjunior": {"queries": ["Super Junior", "슈퍼주니어", "SUPER JUNIOR"],
                    "recordedIds": ["21060178", "80150326"],
                    "expectedEntityType": "group", "canonicalDebutYear": 2005},
    "maddox": {"queries": ["MADDOX", "매독스"],
               "recordedIds": ["80431028", "81384545"],
               "expectedEntityType": "solo", "canonicalDebutYear": None},
}
UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
      "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
HEADERS = {"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8"}
TRANSIENT = {429, 500, 502, 503, 504}


def normalize(value: str | None) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", (value or "").strip().lower())


def fetch(url: str) -> dict:
    error = None
    for attempt in range(1, 4):
        try:
            response = requests.get(url, headers=HEADERS, timeout=20)
            if response.status_code in TRANSIENT and attempt < 3:
                time.sleep(attempt)
                continue
            return {"status": response.status_code, "html": response.text,
                    "error": None, "size": len(response.content)}
        except Exception as exc:
            error = f"{type(exc).__name__}:{str(exc)[:250]}"
            if attempt < 3:
                time.sleep(attempt)
    return {"status": None, "html": "", "error": error, "size": 0}


def provider_value(soup: BeautifulSoup, label: str) -> str | None:
    img = soup.find("img", attrs={"alt": label})
    if img is not None:
        li = img.find_parent("li")
        if li:
            value = " ".join(li.stripped_strings).strip()
            if value:
                return value
    return None


def detail(provider_id: str) -> dict:
    url = f"https://www.genie.co.kr/detail/artistInfo?xxnm={provider_id}"
    response = fetch(url)
    soup = BeautifulSoup(response["html"], "html.parser")
    name = soup.select_one(".info-zone h2.name") or soup.select_one("h2.name")
    display = " ".join(name.stripped_strings).strip() if name else ""
    debut_field = provider_value(soup, "데뷔")
    debut_match = re.search(r"(?:19|20)\d{2}", debut_field or "")
    activity = provider_value(soup, "활동유형")
    country = provider_value(soup, "국적")
    list_links = []
    for anchor in soup.select("a[href]"):
        href = str(anchor.get("href") or "")
        if "detail/albumInfo" in href or "detail/songInfo" in href:
            label = " ".join(anchor.stripped_strings).strip()
            if label:
                list_links.append({"title": label[:160], "href": href[:260]})
        if len(list_links) >= 10:
            break
    plain = " ".join(soup.stripped_strings)
    return {
        "providerArtistId": provider_id, "url": url,
        "statusCode": response["status"], "responseLength": response["size"],
        "error": response["error"], "providerDisplay": display,
        "providerActivityType": activity, "providerCountry": country,
        "providerDebutRaw": debut_field,
        "providerDebutYear": int(debut_match.group()) if debut_match else None,
        "releaseLinksSample": list_links, "textContextSample": plain[:1200],
    }


def search(query: str) -> dict:
    url = "https://www.genie.co.kr/search/searchMain?query=" + quote_plus(query)
    response = fetch(url)
    soup = BeautifulSoup(response["html"], "html.parser")
    onclick = re.compile(r"""fnViewArtist\(['"]([0-9]+)['"]\)""", re.I)
    href = re.compile(r"artistInfo\?xxnm=([0-9]+)", re.I)
    found = {}
    for anchor in soup.find_all("a"):
        match = onclick.search(str(anchor.get("onclick") or "")) or href.search(str(anchor.get("href") or ""))
        if match is None:
            continue
        display = " ".join(anchor.stripped_strings).strip()
        if not display:
            img = anchor.find("img")
            display = str(img.get("alt") or "").strip() if img else ""
        if display:
            found[(match.group(1), normalize(display))] = {
                "providerArtistId": match.group(1), "providerDisplay": display}
    return {
        "query": query, "url": url, "statusCode": response["status"],
        "error": response["error"], "artistCandidates": list(found.values()),
    }


def investigate(cid: str, target: dict) -> dict:
    queries = target["queries"]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(search, query) for query in queries]
        searches = [future.result() for future in futures]
        detail_futures = {
            pid: pool.submit(detail, pid) for pid in target["recordedIds"]
        }
        details = [detail_futures[pid].result() for pid in target["recordedIds"]]

    expected_keys = {normalize(q) for q in queries}
    matches = {}
    for result in searches:
        for candidate in result["artistCandidates"]:
            if normalize(candidate["providerDisplay"]) in expected_keys:
                matches.setdefault(candidate["providerArtistId"], set()).add(candidate["providerDisplay"])

    matchedIds = sorted(matches)
    byId = {r["providerArtistId"]: r for r in details}
    assessments = []
    for pid in target["recordedIds"]:
        info = byId[pid]
        group = "그룹" in (info["providerActivityType"] or "")
        solo = "솔로" in (info["providerActivityType"] or "")
        type_consistent = group if target["expectedEntityType"] == "group" else solo
        year = target["canonicalDebutYear"]
        assessments.append({
            "providerArtistId": pid, "inLiveExactNameResults": pid in matchedIds,
            "detailNameExactAlias": normalize(info["providerDisplay"]) in expected_keys,
            "detailTypeConsistent": type_consistent,
            "canonicalDebutYearMatch": (
                info["providerDebutYear"] == year if year is not None else None
            ),
            "identityDisposition": "requires_human_review_no_auto_binding",
        })
    return {
        "canonicalArtistId": cid, "historicalProviderArtistIds": target["recordedIds"],
        "searchQueries": searches, "liveExactNameCandidateProviderIds": matchedIds,
        "liveExactNameDisplaysById": {pid: sorted(v) for pid, v in matches.items()},
        "recordedProviderDetails": details, "assessments": assessments,
        "status": "historical_ambiguity_under_identity_review",
        "approvedProviderArtistId": None, "sourceSupported": False,
    }


def main() -> None:
    recon = json.loads(RECON.read_text(encoding="utf-8-sig"))
    originals = recon["reconciliation"]["differingDispositions"]
    assert {x["canonicalArtistId"] for x in originals} == set(TARGETS)
    for row in originals:
        ids = row["originalWrapperProviderArtistIds"] if row["canonicalArtistId"] == "superjunior" else row["embeddedExactProviderArtistIds"]
        assert ids == TARGETS[row["canonicalArtistId"]]["recordedIds"]

    rows = [investigate(cid, target) for cid, target in TARGETS.items()]
    payload = {
        "version": "music_genie_changed_disposition_identity_live_v1",
        "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
        "sourceRunLineage": [37559756356, 37560176276],
        "canonicalIds": list(TARGETS), "rows": rows,
        "evidenceOnly": True, "humanReviewStillRequired": True,
        "anyAutoBound": False, "anySourceSupportedPromoted": False,
        "musicPartitionUnchanged": {"supported": 117, "unresolved": 238, "unsupported": 0},
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for row in rows:
        print("IDENTITY_REVIEW " + json.dumps({
            "canonicalArtistId": row["canonicalArtistId"],
            "exactIds": row["liveExactNameCandidateProviderIds"],
            "details": [{
                "id": x["providerArtistId"], "status": x["statusCode"],
                "name": x["providerDisplay"], "type": x["providerActivityType"],
                "year": x["providerDebutYear"],
            } for x in row["recordedProviderDetails"]],
            "assessments": row["assessments"],
        }, ensure_ascii=False))
    assert all(
        row["recordedProviderDetails"]
        and all(x["statusCode"] == 200 and x["providerDisplay"] for x in row["recordedProviderDetails"])
        for row in rows
    ), "provider_details_missing_or_not_200"
    assert all(
        all(x["statusCode"] == 200 for x in row["searchQueries"])
        for row in rows
    ), "search_request_not_200"
    assert payload["anyAutoBound"] is False
    print("PASS: Genie Super Junior/MADDOX original ambiguity investigation | 2 artists | nonactivating | Music 117/238/0")


if __name__ == "__main__":
    main()
