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
OUTPUT = Path("music_genie_missing14_last2_native_release_probe_v1.json")
ARTISTS = {
    "boystory": {
        "historicalId": "80899341",
        "display": "BOY STORY",
        "activity": "남성/그룹",
        "albumId": "85406781",
        "albumTitle": "UP",
        "albumDate": "2024-07-12",
        "albumSource": "https://www.genie.co.kr/detail/albumInfo?axnm=85406781",
        "officialSource": "https://www.jype.com/ko/Artist",
        "canonicalDebutYear": 2018,
        "queries": ["BOY STORY Pump !t Up", "BOY STORY UP"],
    },
    "girlset": {
        "historicalId": "83019445",
        "display": "GIRLSET",
        "activity": "여성/그룹",
        "albumId": None,
        "officialSongTitles": ["Commas", "Little Miss"],
        "officialSource": "https://girlset.jype.com/discography",
        "canonicalDebutYear": None,
        "queries": ["GIRLSET Commas", "GIRLSET Little Miss", "GIRLSET"],
    },
}
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
SONG_ID_ATTR = re.compile(r"""(?:songid|songId|xgnm|song_id)=?['"]?(\d{7,10})""", re.I)


def norm(s: str | None) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", str(s or "").lower().strip())


def get(url: str) -> dict:
    error = None
    for attempt in range(1, 4):
        try:
            response = requests.get(url, headers=HEADERS, timeout=20)
            if response.status_code in TRANSIENT and attempt < 3:
                time.sleep(attempt)
                continue
            return {"status": response.status_code, "html": response.text, "error": None}
        except requests.RequestException as exc:
            error = f"{type(exc).__name__}:{str(exc)[:240]}"
            if attempt < 3:
                time.sleep(attempt)
    return {"status": None, "html": "", "error": error}


def artist_links(soup: BeautifulSoup, display: str) -> list[dict]:
    found = {}
    for a in soup.select("a"):
        label = " ".join(a.stripped_strings).strip()
        if not label:
            image = a.find("img")
            label = str(image.get("alt") or "").strip() if image else ""
        if norm(label) != norm(display):
            continue
        match = (ARTIST_ONCLICK.search(str(a.get("onclick") or ""))
                 or ARTIST_HREF.search(str(a.get("href") or "")))
        if match:
            found[match.group(1)] = {"providerArtistId": match.group(1), "label": label}
    return [found[key] for key in sorted(found)]


def find_song_ids(soup: BeautifulSoup, titles: list[str], limit: int = 16) -> list[dict]:
    results = {}
    for a in soup.select("a"):
        onclick = str(a.get("onclick") or "")
        href = str(a.get("href") or "")
        m = SONG_ONCLICK.search(onclick) or SONG_HREF.search(href)
        if m is None:
            continue
        label = " ".join(a.stripped_strings).strip()
        cell = a.find_parent("tr") or a.find_parent("li")
        context = " ".join(cell.stripped_strings).strip()[:300] if cell else label
        # The song must occur in a row that references the target title/artist.
        if not any(norm(t) in norm(context) for t in titles):
            continue
        results[m.group(1)] = {
            "songId": m.group(1),
            "anchorLabel": label[:100],
            "rowContext": context,
        }
        if len(results) >= limit:
            break
    return list(results.values())


def check_song(song: dict, expected_display: str) -> dict:
    url = f"https://www.genie.co.kr/detail/songInfo?xgnm={song['songId']}"
    response = get(url)
    soup = BeautifulSoup(response["html"], "html.parser")
    ids = artist_links(soup, expected_display)
    result = dict(song)
    result.update({
        "url": url, "statusCode": response["status"], "error": response["error"],
        "nativeExactArtistLinks": ids,
        "nativeProviderArtistIds": [x["providerArtistId"] for x in ids],
        "providerSongDisplaysExpectedArtist": norm(expected_display) in norm(" ".join(soup.stripped_strings)[:3000]),
    })
    return result


def inspect(key: str, info: dict) -> dict:
    pid = info["historicalId"]
    artist_url = f"https://www.genie.co.kr/detail/artistInfo?xxnm={pid}"
    profile = get(artist_url)
    soup = BeautifulSoup(profile["html"], "html.parser")
    h2 = soup.select_one(".info-zone h2.name") or soup.select_one("h2.name")
    current_name = " ".join(h2.stripped_strings).strip() if h2 else ""
    icon = soup.find("img", attrs={"alt": "데뷔"})
    parent = icon.find_parent("li") if icon else None
    current_debut = " ".join(parent.stripped_strings).strip() if parent else None
    album_evidence = None
    if info.get("albumId"):
        album_url = f"https://www.genie.co.kr/detail/albumInfo?axnm={info['albumId']}"
        album_resp = get(album_url)
        album_soup = BeautifulSoup(album_resp["html"], "html.parser")
        album_links = artist_links(album_soup, info["display"])
        album_evidence = {
            "albumId": info["albumId"],
            "sourceUrl": album_url,
            "statusCode": album_resp["status"],
            "recordedTitle": info["albumTitle"],
            "recordedReleaseDate": info["albumDate"],
            "nativeExactArtistLinks": album_links,
            "nativeProviderArtistIds": [x["providerArtistId"] for x in album_links],
            "onlyOriginalIdIsLinked": [x["providerArtistId"] for x in album_links] == [pid],
        }

    # Search only enriches candidate song IDs: it never authorizes a provider binding.
    searches = []
    discovered = {}
    title_keys = [info["display"], *info.get("officialSongTitles", [])]
    for query in info["queries"]:
        url = "https://www.genie.co.kr/search/searchMain?query=" + quote_plus(query)
        response = get(url)
        search_soup = BeautifulSoup(response["html"], "html.parser")
        candidates = find_song_ids(search_soup, title_keys, limit=8)
        searches.append({"query": query, "url": url, "statusCode": response["status"],
                         "candidateSongIds": [x["songId"] for x in candidates]})
        for item in candidates:
            discovered[item["songId"]] = item
    # Search may hide song links; inspect the pinned artist's native popular-song list too.
    profile_song_candidates = find_song_ids(soup, [info["display"]], limit=14)
    for item in profile_song_candidates:
        discovered[item["songId"]] = item

    candidates = list(discovered.values())[:12]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        song_results = list(executor.map(lambda c: check_song(c, info["display"]), candidates))
    verified = [s for s in song_results if s["nativeProviderArtistIds"] == [pid] and s["statusCode"] == 200]
    return {
        "canonicalArtistId": key, "expectedHistoricalId": pid,
        "profile": {
            "url": artist_url, "statusCode": profile["status"],
            "providerDisplay": current_name, "providerDebutRaw": current_debut,
        },
        "albumEvidence": album_evidence, "discoverySearch": searches,
        "profileSongCandidateIds": [r["songId"] for r in profile_song_candidates],
        "nativeSongChecks": song_results,
        "providerNativeConfirmedSongIds": [x["songId"] for x in verified],
        "providerNativeAlbumConfirmed": bool(album_evidence and album_evidence["onlyOriginalIdIsLinked"]),
        "nativeReleaseLinked": bool(verified or (album_evidence and album_evidence["onlyOriginalIdIsLinked"])),
        "officialIdentitySource": info["officialSource"],
        "canonicalDebutYear": info["canonicalDebutYear"],
        "yearScopeReviewPending": True,
        "humanBindingApproved": False, "sourcePromoted": False,
    }


def main() -> None:
    queue = json.loads(QUEUE.read_text(encoding="utf-8-sig"))
    originals = {x["canonicalArtistId"]: x for x in queue["candidates"]}
    assert len(ARTISTS) == 2
    for canonical, expected in ARTISTS.items():
        row = originals[canonical]
        assert row["genieProviderArtistId"] == expected["historicalId"]
        assert row["genieDebutYear"] is None
        assert row["canonicalDebutYear"] == expected["canonicalDebutYear"]
        assert row["reviewStatus"] == "unresolved_additional_year_evidence_required"
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        tasks = {key: pool.submit(inspect, key, info) for key, info in ARTISTS.items()}
        records = []
        for key, future in tasks.items():
            try:
                records.append(future.result())
            except Exception as exc:
                records.append({
                    "canonicalArtistId": key, "expectedHistoricalId": ARTISTS[key]["historicalId"],
                    "nativeReleaseLinked": False,
                    "error": f"{type(exc).__name__}:{str(exc)[:300]}",
                    "humanBindingApproved": False, "sourcePromoted": False,
                })
    payload = {
        "version": "music_genie_missing14_last2_native_release_probe_v1",
        "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
        "source": "music_chart", "provider": "genie",
        "recordCount": 2, "records": records,
        "nativeLinkedCanonicalIds": [
            x["canonicalArtistId"] for x in records if x["nativeReleaseLinked"]
        ],
        "stillAliasOnlyCanonicalIds": [
            x["canonicalArtistId"] for x in records if not x["nativeReleaseLinked"]
        ],
        "officialJypDiscographyDirectlyFetchedByCollector": False,
        "officialJypDiscographySourcesRecorded": True,
        "identityEvidenceOnly": True, "bindingApproved": False,
        "sourceCompatibilityChanged": False, "productActivated": False,
        "currentMusicPartition": {"supported": 117, "unresolved": 238, "unsupported": 0},
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("GENIE_LAST2_RESULT " + json.dumps({
        "nativeLinked": payload["nativeLinkedCanonicalIds"],
        "aliasOnly": payload["stillAliasOnlyCanonicalIds"],
        "profiles": {
            x["canonicalArtistId"]: {
                "status": x.get("profile", {}).get("statusCode"),
                "name": x.get("profile", {}).get("providerDisplay"),
                "album": x.get("albumEvidence"),
                "songs": x.get("providerNativeConfirmedSongIds"),
                "candidates": [y["songId"] for y in x.get("nativeSongChecks", [])],
                "error": x.get("error"),
            } for x in records
        },
    }, ensure_ascii=False))
    assert len(records) == 2
    boystory = next(x for x in records if x["canonicalArtistId"] == "boystory")
    assert boystory["providerNativeAlbumConfirmed"] is True, "boystory_album_native_artist_id_unexpected"
    assert boystory["albumEvidence"]["nativeProviderArtistIds"] == ["80899341"]
    assert all(x.get("profile", {}).get("statusCode") == 200 for x in records), "provider_identity_profile_not_200"
    assert all(x["humanBindingApproved"] is False and x["sourcePromoted"] is False for x in records)
    print("PASS: Genie missing14 last2 release-link research | 2 | no binding")


if __name__ == "__main__":
    main()
