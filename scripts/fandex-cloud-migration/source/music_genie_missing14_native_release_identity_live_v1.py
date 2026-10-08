from __future__ import annotations

import concurrent.futures
import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[3]
QUEUE = ROOT / "data/fandex-cloud-v10/seed/music_genie_partial39_evidence_triage_v1.json"
OUTPUT = Path("music_genie_missing14_native_release_identity_live_v1.json")
PROBES = (
    {"canonicalArtistId": "nexz", "originalProviderId": "81122242",
     "kind": "album", "releaseId": "87546464", "releaseName": "Mmchk",
     "artistDisplay": "NEXZ (넥스지)", "expectedNativeId": "82295319", "providerYear": 2023,
     "canonicalYear": 2024, "debutScope": "2023 predebut vs 2024 formal debut unresolved"},
    {"canonicalArtistId": "afterschool", "originalProviderId": "82301148",
     "kind": "song", "releaseId": "76758548", "releaseName": "Diva",
     "artistDisplay": "애프터스쿨 (After School)", "expectedNativeId": "73393086", "providerYear": 2009,
     "canonicalYear": 2009, "debutScope": "2009 original group debut"},
    {"canonicalArtistId": "pow", "originalProviderId": "14942969",
     "kind": "song", "releaseId": "103478669", "releaseName": "Favorite",
     "artistDisplay": "POW (파우)", "expectedNativeId": "82162931", "providerYear": 2023,
     "canonicalYear": 2023, "debutScope": "2023 pre-release/official debut distinction reviewer gate"},
    {"canonicalArtistId": "ejel", "originalProviderId": "81567146",
     "kind": "song", "releaseId": "108199234", "releaseName": "Now or Never",
     "artistDisplay": "이젤 (EJel)", "expectedNativeId": "81021446", "providerYear": 2021,
     "canonicalYear": None, "debutScope": "canonical debut year unavailable"},
    {"canonicalArtistId": "chen", "originalProviderId": "81098158",
     "kind": "song", "releaseId": "88728543",
     "releaseName": "사월이 지나면 우리 헤어져요 (Beautiful goodbye)",
     "artistDisplay": "첸 (CHEN)", "expectedNativeId": None, "providerYear": None,
     "canonicalYear": None, "debutScope": "EXO group 2012, solo album 2019; unresolved"},
    {"canonicalArtistId": "mirae", "originalProviderId": "81608365",
     "kind": "song", "releaseId": "92651112", "releaseName": "1 Thing",
     "artistDisplay": "미래소년 (MIRAE)", "expectedNativeId": None, "providerYear": None,
     "canonicalYear": 2021, "debutScope": "group formal debut 2021; unresolved"},
    {"canonicalArtistId": "tiot", "originalProviderId": "81972382",
     "kind": "album", "releaseId": "85026862", "releaseName": "Kick-START",
     "artistDisplay": "TIOT (티아이오티)", "expectedNativeId": None, "providerYear": None,
     "canonicalYear": 2024, "debutScope": "predebut 2023 / formal debut 2024; unresolved"},
)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
}
TRANSIENT = {429, 500, 502, 503, 504}


def normalize(value: str) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", (value or "").strip().lower())


def fetch(url: str) -> dict:
    error = None
    for attempt in range(1, 4):
        try:
            response = requests.get(url, timeout=20, headers=HEADERS)
            if response.status_code in TRANSIENT and attempt < 3:
                time.sleep(attempt)
                continue
            return {"statusCode": response.status_code, "html": response.text, "error": None}
        except requests.RequestException as exc:
            error = type(exc).__name__ + ": " + str(exc)[:250]
            if attempt < 3:
                time.sleep(attempt)
    return {"statusCode": None, "html": "", "error": error}


ARTIST_ONCLICK = re.compile(r"""fnViewArtist\(['"]([0-9]+)['"]\)""", re.I)
ARTIST_HREF = re.compile(r"artistInfo\?xxnm=([0-9]+)", re.I)


def extract_links(soup: BeautifulSoup, target_name: str) -> list[dict]:
    links = {}
    for anchor in soup.find_all("a"):
        name = " ".join(anchor.stripped_strings).strip()
        if not name:
            img = anchor.find("img")
            name = str(img.get("alt") or "").strip() if img else ""
        if normalize(name) != normalize(target_name):
            continue
        match = (
            ARTIST_ONCLICK.search(str(anchor.get("onclick") or ""))
            or ARTIST_HREF.search(str(anchor.get("href") or ""))
        )
        if match:
            links[(match.group(1), name)] = {
                "providerArtistId": match.group(1),
                "providerDisplay": name,
                "linkKind": "provider_native_release_to_artist",
            }
    return [links[key] for key in sorted(links)]


def investigate(probe: dict) -> dict:
    cid, kind, rid = probe["canonicalArtistId"], probe["kind"], probe["releaseId"]
    route = "albumInfo?axnm" if kind == "album" else "songInfo?xgnm"
    url = f"https://www.genie.co.kr/detail/{route}={rid}"
    response = fetch(url)
    soup = BeautifulSoup(response["html"], "html.parser")
    links = extract_links(soup, probe["artistDisplay"])
    ids = sorted({link["providerArtistId"] for link in links})
    text = " ".join(soup.stripped_strings)
    expected = probe["expectedNativeId"]
    is_unique = len(ids) == 1
    error = None
    if response["statusCode"] != 200:
        error = "provider_http_not_200"
    elif not ids:
        error = "no_exact_native_artist_link"
    elif not is_unique:
        error = "multiple_native_artist_ids_for_exact_display"
    elif ids[0] == probe["originalProviderId"]:
        error = "native_link_equals_original_wrong_type_candidate"
    elif expected is not None and ids != [expected]:
        error = "native_artist_id_conflicts_with_independent_profile"
    return {
        "canonicalArtistId": cid,
        "originalProviderArtistId": probe["originalProviderId"],
        "releaseKind": kind, "releaseId": rid,
        "providerReleaseUrl": url,
        "expectedReleaseName": probe["releaseName"],
        "expectedArtistDisplay": probe["artistDisplay"],
        "responseStatusCode": response["statusCode"],
        "providerRequestError": response["error"],
        "releaseNameVisible": normalize(probe["releaseName"]) in normalize(text),
        "nativeExactArtistLinks": links,
        "nativeExactProviderArtistIds": ids,
        "previouslyQualifiedAlternativeId": expected,
        "nativeSingleArtistIdentityConfirmed": is_unique and not error,
        "identityLinkageIssue": error,
        "canonicalDebutYear": probe["canonicalYear"],
        "recordedIndependentProviderYear": probe["providerYear"],
        "yearScope": probe["debutScope"],
        "humanBindingReviewPending": True,
        "originalCandidateNeverAutoReplaced": True,
        "musicSourceSupportedPromotionAuthorized": False,
    }


def main() -> None:
    queue = json.loads(QUEUE.read_text(encoding="utf-8-sig"))
    partial = {x["canonicalArtistId"]: x for x in queue["candidates"]}
    assert len(PROBES) == len(set(x["canonicalArtistId"] for x in PROBES)) == 7
    for probe in PROBES:
        row = partial[probe["canonicalArtistId"]]
        assert row["genieProviderArtistId"] == probe["originalProviderId"]
        assert row["genieDebutYear"] is None
        assert row["canonicalDebutYear"] == probe["canonicalYear"]
        assert row["evidenceGap"] in {
            "genie_debut_year_unavailable", "both_debut_years_unavailable"
        }
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(investigate, probe): probe["canonicalArtistId"] for probe in PROBES}
        mapping = {}
        for future in concurrent.futures.as_completed(futures):
            cid = futures[future]
            try:
                mapping[cid] = future.result()
            except Exception as exc:
                mapping[cid] = {
                    "canonicalArtistId": cid,
                    "nativeExactProviderArtistIds": [],
                    "identityLinkageIssue": "probe_exception:" + type(exc).__name__ + ":" + str(exc)[:200],
                    "nativeSingleArtistIdentityConfirmed": False,
                    "humanBindingReviewPending": True,
                    "musicSourceSupportedPromotionAuthorized": False,
                }
    records = [mapping[probe["canonicalArtistId"]] for probe in PROBES]
    confirmed = [x["canonicalArtistId"] for x in records if x["nativeSingleArtistIdentityConfirmed"]]
    held = [x["canonicalArtistId"] for x in records if not x["nativeSingleArtistIdentityConfirmed"]]
    payload = {
        "version": "music_genie_missing14_native_release_identity_live_v1",
        "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
        "canonicalUniverseCount": 355, "provider": "genie",
        "checkCount": len(records), "confirmedNativeLinkCount": len(confirmed),
        "confirmedCanonicalArtistIds": confirmed, "heldCanonicalArtistIds": held,
        "records": records, "providerIdentityCandidateOnly": True,
        "reviewedBindingApproved": False, "canonicalYearBackfilled": False,
        "artistRegistryChanged": False, "musicSupportedPromoted": False,
        "productActivated": False,
        "sourcePartitionUnchanged": {"supported": 117, "unresolved": 238, "unsupported": 0},
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("MISSING14_NATIVE_LINK " + json.dumps({
        "confirmed": confirmed, "held": held,
        "rows": [{
            "id": x["canonicalArtistId"],
            "status": x.get("responseStatusCode"),
            "songOrAlbum": x.get("releaseId"),
            "nativeIds": x["nativeExactProviderArtistIds"],
            "issue": x["identityLinkageIssue"],
        } for x in records],
    }, ensure_ascii=False))
    assert len(records) == 7
    assert all(x.get("responseStatusCode") == 200 for x in records), "genie_native_release_http_failed"
    assert all(x["musicSourceSupportedPromotionAuthorized"] is False for x in records)
    print("PASS: Genie missing14 native release identity investigation | 7 candidates | no auto-binding | Music 117/238/0")


if __name__ == "__main__":
    main()
