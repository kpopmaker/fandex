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
OUTPUT = Path("music_genie_girlset_catalog_discovery_live_v1.json")
ARTIST_ID = "83019445"
DISPLAY = "GIRLSET"
RELEASES = [
    {"title": "Commas", "releaseDate": "2025-08-29"},
    {"title": "Little Miss", "releaseDate": "2025-11-14"},
    {"title": "Tweak", "releaseDate": "2026-03-06"},
    {"title": "CHAT", "releaseDate": "2026-07-17"},
]
QUERIES = [
    "GIRLSET", "GIRLSET Commas", "Commas", "GIRLSET Little Miss",
    "Little Miss", "GIRLSET Tweak", "GIRLSET CHAT",
]
ROOT_URL = "https://www.genie.co.kr"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
}
TRANSIENT = {429, 500, 502, 503, 504}
ARTIST_ONCLICK = re.compile(r"""fnViewArtist\(['"](\d+)['"]\)""", re.I)
ARTIST_HREF = re.compile(r"artistInfo\?xxnm=(\d+)", re.I)
SONG_ONCLICK = re.compile(r"""fnViewSong\(['"](\d+)['"]\)""", re.I)
SONG_HREF = re.compile(r"songInfo\?xgnm=(\d+)", re.I)
ALBUM_ONCLICK = re.compile(r"""fnViewAlbum\(['"](\d+)['"]\)""", re.I)
ALBUM_HREF = re.compile(r"albumInfo\?axnm=(\d+)", re.I)
SONG_DATA = re.compile(r"""(?:songid|songId|song_id|xgnm)["'\s=:]+["']?(\d{7,10})""", re.I)


def normalize(s: str | None) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", (s or "").lower().strip())


def fetch(url: str) -> dict:
    failure = None
    for attempt in range(1, 4):
        try:
            r = requests.get(url, headers=HEADERS, timeout=20)
            if r.status_code in TRANSIENT and attempt < 3:
                time.sleep(attempt)
                continue
            return {"url": url, "httpStatus": r.status_code, "html": r.text, "error": None}
        except requests.RequestException as exc:
            failure = f"{type(exc).__name__}:{str(exc)[:200]}"
            if attempt < 3:
                time.sleep(attempt)
    return {"url": url, "httpStatus": None, "html": "", "error": failure}


def artist_links(soup: BeautifulSoup) -> list[dict]:
    values = {}
    for a in soup.select("a"):
        label = " ".join(a.stripped_strings).strip()
        if not label:
            image = a.find("img")
            label = str(image.get("alt") or "").strip() if image else ""
        match = ARTIST_ONCLICK.search(str(a.get("onclick") or "")) or ARTIST_HREF.search(str(a.get("href") or ""))
        if match and normalize(label) == normalize(DISPLAY):
            values[match.group(1)] = {"artistId": match.group(1), "display": label}
    return [values[k] for k in sorted(values)]


def discover(url: str, method: str, query: str | None = None) -> dict:
    r = fetch(url)
    soup = BeautifulSoup(r["html"], "html.parser")
    text = " ".join(soup.stripped_strings)
    discoveries = {}
    for a in soup.select("a"):
        onclick = str(a.get("onclick") or "")
        href = str(a.get("href") or "")
        song = SONG_ONCLICK.search(onclick) or SONG_HREF.search(href)
        album = ALBUM_ONCLICK.search(onclick) or ALBUM_HREF.search(href)
        kind = "song" if song else "album" if album else None
        match = song or album
        if not match:
            continue
        label = " ".join(a.stripped_strings).strip()
        cell = a.find_parent("tr") or a.find_parent("li")
        row = " ".join(cell.stripped_strings).strip()[:250] if cell else label
        nearby = normalize(row + " " + label)
        title_matches = [x["title"] for x in RELEASES if normalize(x["title"]) in nearby]
        # Profiles/catalog pages may identify releases without a title in a link;
        # record the IDs but verify only from the native detail page.
        if method not in ("artist_info", "artist_song_list", "artist_album_list") and not title_matches:
            continue
        key = (kind, match.group(1))
        discoveries[key] = {
            "kind": kind, "providerId": match.group(1),
            "linkLabel": label[:130], "rowContext": row,
            "matchedReleaseTitles": title_matches,
            "discoveredBy": method,
        }
    # No generated candidate IDs from free-text or guessed ranges.
    return {
        "method": method, "query": query, "url": url,
        "httpStatus": r["httpStatus"], "error": r["error"],
        "pageContainsGirlsetDisplay": normalize(DISPLAY) in normalize(text),
        "pageReleaseTitles": [x["title"] for x in RELEASES if normalize(x["title"]) in normalize(text)],
        "nativeArtistLinks": artist_links(soup),
        "candidateReleases": list(discoveries.values())[:40],
        "pageSample": text[:220],
    }


def verify_release(item: dict) -> dict:
    kind, pid = item["kind"], item["providerId"]
    path = f"/detail/songInfo?xgnm={pid}" if kind == "song" else f"/detail/albumInfo?axnm={pid}"
    url = ROOT_URL + path
    response = fetch(url)
    soup = BeautifulSoup(response["html"], "html.parser")
    text = " ".join(soup.stripped_strings)
    linked = artist_links(soup)
    native_ids = sorted({x["artistId"] for x in linked})
    release_name_matches = [x["title"] for x in RELEASES if normalize(x["title"]) in normalize(text[:1600])]
    return {
        **item, "url": url, "httpStatus": response["httpStatus"],
        "error": response["error"], "nativeArtistLinks": linked,
        "nativeArtistIds": native_ids, "releaseNameMatches": release_name_matches,
        "onlyHistoricalGirlsetIdLinked": native_ids == [ARTIST_ID] and bool(release_name_matches),
        "differentIdOrHomonymObserved": bool(native_ids) and native_ids != [ARTIST_ID],
        "verifiedNativeAttribution": native_ids == [ARTIST_ID] and bool(release_name_matches) and response["httpStatus"] == 200,
    }


def main() -> None:
    queue = json.loads(QUEUE.read_text(encoding="utf-8-sig"))
    source = next(x for x in queue["candidates"] if x["canonicalArtistId"] == "girlset")
    assert source["genieProviderArtistId"] == ARTIST_ID
    assert source["canonicalDebutYear"] is source["genieDebutYear"] is None
    assert source["reviewStatus"] == "unresolved_additional_year_evidence_required"

    sites = [
        ("artist_info", ROOT_URL + f"/detail/artistInfo?xxnm={ARTIST_ID}", None),
        ("artist_song_list", ROOT_URL + f"/detail/artistSong?xxnm={ARTIST_ID}", None),
        ("artist_album_list", ROOT_URL + f"/detail/artistAlbum?xxnm={ARTIST_ID}", None),
    ]
    sites += [
        ("search_main", ROOT_URL + "/search/searchMain?query=" + quote_plus(q), q)
        for q in QUERIES
    ]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        futures = {(method, url): pool.submit(discover, url, method, query) for method, url, query in sites}
        discovered_pages = [futures[(method, url)].result() for method, url, _ in sites]

    candidates = {}
    for page in discovered_pages:
        for item in page["candidateReleases"]:
            key = (item["kind"], item["providerId"])
            old = candidates.get(key)
            if old is None or (not old["matchedReleaseTitles"] and item["matchedReleaseTitles"]):
                candidates[key] = item
    ordered = sorted(
        candidates.values(),
        key=lambda x: (
            0 if x["matchedReleaseTitles"] else 1,
            0 if x["discoveredBy"] == "artist_info" else 1,
            x["kind"], x["providerId"],
        ),
    )[:16]
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
        verified = list(pool.map(verify_release, ordered))

    confirmed = [x for x in verified if x["verifiedNativeAttribution"]]
    contradictions = [x for x in verified if x["differentIdOrHomonymObserved"]]
    payload = {
        "version": "music_genie_girlset_catalog_discovery_live_v1",
        "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
        "canonicalArtistId": "girlset", "source": "music_chart", "provider": "genie",
        "historicalProviderArtistId": ARTIST_ID,
        "originalGenieDebutYear": None, "originalCanonicalDebutYear": None,
        "independentReleaseContext": {
            "jypDiscographyUrl": "https://girlset.jype.com/discography",
            "bugsArtistUrl": "https://music.bugs.co.kr/artist/80409542",
            "appleMusicArtistUrl": "https://music.apple.com/us/artist/girlset/1833111616",
            "referencesAreNotNativeGenieAttribution": True,
            "expectedReleases": RELEASES,
        },
        "discoveryPages": discovered_pages,
        "discoveredUniqueNativeCandidateCount": len(candidates),
        "directlyVerifiedProviderReleaseCount": len(verified),
        "directProviderReleaseVerifications": verified,
        "confirmedNativeAttributionIds": [x["kind"] + ":" + x["providerId"] for x in confirmed],
        "confirmedNativeAttributionCount": len(confirmed),
        "confirmedContradictingArtistIds": [x["kind"] + ":" + x["providerId"] for x in contradictions],
        "searchLimitDoesNotProveCatalogAbsence": True,
        "humanReviewerRequired": True, "approvedProviderBinding": False,
        "canonicalDebutYearBackfilled": False, "musicSupportedPromoted": False,
        "sourcePartitionUnchanged": {"supported": 117, "unresolved": 238, "unsupported": 0},
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("GIRLSET_CATALOG_RESULT " + json.dumps({
        "pages": [{"method": x["method"], "query": x["query"],
                   "status": x["httpStatus"], "found": len(x["candidateReleases"])}
                  for x in discovered_pages],
        "candidates": len(candidates), "verified": len(verified),
        "confirmedNative": payload["confirmedNativeAttributionIds"],
        "contradictingNative": payload["confirmedContradictingArtistIds"],
    }, ensure_ascii=False))
    assert len(discovered_pages) == len(sites) == 10
    assert discovered_pages[0]["httpStatus"] == 200, "pinned_GIRLSET_artist_profile_not_200"
    assert payload["approvedProviderBinding"] is False
    assert payload["musicSupportedPromoted"] is False
    if contradictions:
        raise RuntimeError("girlset_provider_identity_conflict_requires_review")
    print("PASS: Genie GIRLSET catalog discovery read-only | no binding | music 117/238/0")


if __name__ == "__main__":
    main()
