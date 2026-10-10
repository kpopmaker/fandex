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
OUTPUT = Path("music_genie_missing14_remaining7_identity_live_v1.json")
TARGETS = (
    {"id": "brothersu", "original": "79983812", "display": "브라더수 (Brothersu)", "type": "남성/솔로",
     "song": "80643017", "kind": "song", "title": "It Was You", "era": "early singles and Paper album; canonical year absent"},
    {"id": "mino", "original": "80073343", "display": "MINO (송민호)", "type": "남성/솔로",
     "song": "88391129", "kind": "song", "title": "아낙네",
     "era": "WINNER 2014 group versus 2018 MINO first solo album; preserve both"},
    {"id": "kard", "original": "81305280", "display": "카드 (KARD)", "type": "혼성/그룹",
     "song": "87304018", "kind": "song", "title": "Oh NaNa (Hidden. 허영지)",
     "era": "2016 pre-debut Oh NaNa versus 2017 formal debut Hola Hola"},
    {"id": "up10tion", "original": "81290806", "display": "업텐션 (UP10TION)", "type": "남성/그룹",
     "song": "80749357", "kind": "album", "title": "BRAVO!",
     "era": "UP10TION group 2015; historical mixed-group candidate not qualified"},
    {"id": "x1", "original": "81522270", "display": "X1 (엑스원)", "type": "남성/그룹",
     "song": "89330963", "kind": "song", "title": "움직여 (MOVE) (Prod. by ZICO) (X1 Ver.)",
     "era": "2019 X1 debut; original candidate mixed-group metadata"},
    {"id": "boystory", "original": "80899341", "type": "남성/그룹",
     "queries": ["BOY STORY", "보이스토리", "BOYSTORY"],
     "era": "JYP Chinese group predebut promotions vs 2018 official debut"},
    {"id": "girlset", "original": "83019445", "type": "여성/그룹",
     "queries": ["GIRLSET", "걸셋"],
     "era": "2025 GIRLSET rebrand from VCHA (2024) must preserve entity epoch"},
)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
}
TRANSIENT = {429, 500, 502, 503, 504}
ARTIST_ONCLICK = re.compile(r"""fnViewArtist\(['"]([0-9]+)['"]\)""", re.I)
ARTIST_HREF = re.compile(r"artistInfo\?xxnm=([0-9]+)", re.I)


def norm(value: str | None) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", (value or "").lower().strip())


def fetch(url: str) -> dict:
    error = None
    for attempt in range(1, 4):
        try:
            response = requests.get(url, headers=HEADERS, timeout=20)
            if response.status_code in TRANSIENT and attempt < 3:
                time.sleep(attempt)
                continue
            return {"statusCode": response.status_code, "error": None, "html": response.text}
        except requests.RequestException as exc:
            error = f"{type(exc).__name__}:{str(exc)[:200]}"
            if attempt < 3:
                time.sleep(attempt)
    return {"statusCode": None, "error": error, "html": ""}


def artist_links(soup: BeautifulSoup, aliases: set[str]) -> list[dict]:
    found = {}
    for anchor in soup.find_all("a"):
        match = (ARTIST_ONCLICK.search(str(anchor.get("onclick") or ""))
                 or ARTIST_HREF.search(str(anchor.get("href") or "")))
        if match is None:
            continue
        name = " ".join(anchor.stripped_strings).strip()
        if not name:
            image = anchor.find("img")
            name = str(image.get("alt") or "").strip() if image else ""
        if norm(name) not in aliases:
            continue
        found[(match.group(1), name)] = {
            "providerArtistId": match.group(1),
            "providerDisplay": name,
            "linkMethod": "provider_native",
        }
    return [found[key] for key in sorted(found)]


def detail(pid: str) -> dict:
    url = f"https://www.genie.co.kr/detail/artistInfo?xxnm={pid}"
    response = fetch(url)
    soup = BeautifulSoup(response["html"], "html.parser")
    h2 = soup.select_one(".info-zone h2.name") or soup.select_one("h2.name")
    name = " ".join(h2.stripped_strings).strip() if h2 else ""
    def field(label: str) -> str | None:
        icon = soup.find("img", attrs={"alt": label})
        li = icon.find_parent("li") if icon else None
        return " ".join(li.stripped_strings).strip() if li else None
    debut = field("데뷔")
    year = re.search(r"(?:19|20)\d{2}", debut or "")
    return {
        "providerArtistId": pid, "url": url,
        "statusCode": response["statusCode"], "error": response["error"],
        "name": name, "type": field("활동유형"),
        "debutRaw": debut, "debutYear": int(year.group()) if year else None,
    }


def investigate(target: dict) -> dict:
    canonical_id = target["id"]
    original = detail(target["original"])
    evidence = []
    if "song" in target:
        kind = target["kind"]
        route = "songInfo?xgnm" if kind == "song" else "albumInfo?axnm"
        url = f"https://www.genie.co.kr/detail/{route}={target['song']}"
        response = fetch(url)
        soup = BeautifulSoup(response["html"], "html.parser")
        links = artist_links(soup, {norm(target["display"])})
        evidence.append({
            "method": f"native_{kind}_artist_link", "url": url,
            "releaseTitle": target["title"], "releaseId": target["song"],
            "statusCode": response["statusCode"], "error": response["error"],
            "exactArtistLinks": links,
        })
    else:
        for query in target["queries"]:
            url = "https://www.genie.co.kr/search/searchMain?query=" + quote_plus(query)
            response = fetch(url)
            soup = BeautifulSoup(response["html"], "html.parser")
            links = artist_links(soup, {norm(q) for q in target["queries"]})
            evidence.append({
                "method": "exact_alias_search", "query": query,
                "url": url, "statusCode": response["statusCode"],
                "error": response["error"], "exactArtistLinks": links,
            })
    candidate_ids = sorted({
        x["providerArtistId"] for e in evidence for x in e["exactArtistLinks"]
    })
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        detail_futures = {pid: pool.submit(detail, pid) for pid in candidate_ids[:10]}
        checked_details = [detail_futures[pid].result() for pid in candidate_ids[:10]]
    matches = [
        d for d in checked_details if d["statusCode"] == 200
        and d["name"] and target["type"].split("/")[1] in (d["type"] or "")
    ]
    method = "native_release" if "song" in target else "alias_search_only"
    return {
        "canonicalArtistId": canonical_id,
        "originalProviderArtistId": target["original"],
        "historicalOriginalProviderDetail": original,
        "evidenceMethod": method, "genieObservations": evidence,
        "exactAliasOrNativeLinkProviderIds": candidate_ids,
        "candidateProviderDetails": checked_details,
        "providerDetailsWithMatchingEntityType": [d["providerArtistId"] for d in matches],
        "uniqueEvidenceNativeId": candidate_ids[0] if method == "native_release" and len(candidate_ids) == 1 else None,
        "providerIdentityEvidenceOnly": True,
        "yearScope": target["era"],
        "reviewStatus": "unresolved_research_no_approval",
        "newBindingApplied": False, "canonicalYearBackfilled": False,
        "sourceSupportedPromoted": False,
    }


def main() -> None:
    q = json.loads(QUEUE.read_text(encoding="utf-8-sig"))
    records = {x["canonicalArtistId"]: x for x in q["candidates"]}
    assert len(TARGETS) == 7
    assert len({x["id"] for x in TARGETS}) == 7
    for t in TARGETS:
        candidate = records[t["id"]]
        assert candidate["genieProviderArtistId"] == t["original"]
        assert candidate["genieDebutYear"] is None
        assert candidate["reviewStatus"] == "unresolved_additional_year_evidence_required"
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(investigate, target): target["id"] for target in TARGETS}
        results = {}
        for future in concurrent.futures.as_completed(futures):
            cid = futures[future]
            try:
                results[cid] = future.result()
            except Exception as exc:
                results[cid] = {
                    "canonicalArtistId": cid,
                    "evidenceMethod": "probe_exception", "probeError": str(exc)[:300],
                    "uniqueEvidenceNativeId": None, "newBindingApplied": False,
                    "canonicalYearBackfilled": False, "sourceSupportedPromoted": False,
                    "reviewStatus": "unresolved_research_no_approval",
                }
    rows = [results[t["id"]] for t in TARGETS]
    natively_linked = [
        r["canonicalArtistId"] for r in rows if r.get("uniqueEvidenceNativeId")
    ]
    payload = {
        "version": "music_genie_missing14_remaining7_identity_live_v1",
        "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
        "provider": "genie", "canonicalUniverseCount": 355,
        "checkedCount": 7, "nativeReleaseUniqueArtistLinkCount": len(natively_linked),
        "nativeReleaseLinkedCanonicalIds": natively_linked,
        "rows": rows, "reviewApproved": False,
        "sourceTargetsModified": False, "runtimeChanged": False,
        "musicPartitionUnchanged": {"supported": 117, "unresolved": 238, "unsupported": 0},
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for row in rows:
        print("REMAINING7_IDENTITY " + json.dumps({
            "canonical": row["canonicalArtistId"],
            "method": row["evidenceMethod"],
            "candidateIds": row.get("exactAliasOrNativeLinkProviderIds", []),
            "details": [
                {"id": d["providerArtistId"], "name": d["name"],
                 "type": d["type"], "year": d["debutYear"]}
                for d in row.get("candidateProviderDetails", [])
            ], "evidenceIssues": row.get("probeError"),
        }, ensure_ascii=False))
    assert len(rows) == 7
    assert all(r["newBindingApplied"] is False and r["sourceSupportedPromoted"] is False for r in rows)
    print("PASS: Genie missing14 remaining7 provider identity research | 7 retained Unresolved | nonactivating")


if __name__ == "__main__":
    main()
