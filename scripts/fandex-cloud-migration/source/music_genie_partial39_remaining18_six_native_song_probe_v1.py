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
DECISIONS = ROOT / "data/fandex-cloud-v10/seed/music_genie_partial39_decision_readiness_review_packet_v1.json"
OUTPUT = Path("music_genie_partial39_remaining18_six_native_song_probe_v1.json")
ROOT_URL = "https://www.genie.co.kr/detail/"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
}
TRANSIENT = {429, 500, 502, 503, 504}
ARTIST_ONCLICK = re.compile(r"""fnViewArtist\(['"](\d+)['"]\)""", re.I)
ARTIST_HREF = re.compile(r"artistInfo\?xxnm=(\d+)", re.I)
YEAR = re.compile(r"(?:19|20)\d{2}")

# Provider-native song URLs observed independently during the 18-artist triage.
# These are *identity probe inputs*, not approved bindings or debut-year proof.
# An exact display name alone never qualifies a provider artist ID.
PROBES = (
    {"canonicalArtistId": "ahnyeeun", "pinnedId": "80507988",
     "display": "안예은", "songId": "87001968", "songTitle": "상사화",
     "providerYearRecordedInExact94": 2016, "activityClass": "여성/솔로"},
    {"canonicalArtistId": "hahyunsang", "pinnedId": "80620455",
     "display": "하현상", "songId": "95286227", "songTitle": "등대",
     "providerYearRecordedInExact94": 2018, "activityClass": "남성/솔로"},
    {"canonicalArtistId": "lucidfall", "pinnedId": "14940057",
     "display": "루시드폴", "songId": "16188214", "songTitle": "보이나요",
     "providerYearRecordedInExact94": 2001, "activityClass": "남성/솔로"},
    {"canonicalArtistId": "leesangsoon", "pinnedId": "80291913",
     "display": "이상순", "songId": "93455972", "songTitle": "너와 너의",
     "providerYearRecordedInExact94": 2011, "activityClass": "남성/솔로"},
    {"canonicalArtistId": "leeseokhoon", "pinnedId": "43241763",
     "display": "이석훈", "songId": "80710177", "songTitle": "그대를 사랑하는 10가지 이유",
     "providerYearRecordedInExact94": 2006, "activityClass": "남성/솔로"},
    {"canonicalArtistId": "taeyang", "pinnedId": "54232309",
     "display": "태양", "songId": "82614801", "songTitle": "눈, 코, 입",
     "providerYearRecordedInExact94": 2007, "activityClass": "남성/솔로"},
)


def normalize(value: str | None) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", (value or "").lower().strip())


def fetch(url: str) -> dict:
    failure = None
    for attempt in range(1, 4):
        try:
            response = requests.get(url, headers=HEADERS, timeout=20)
            if response.status_code in TRANSIENT and attempt < 3:
                time.sleep(attempt)
                continue
            return {"statusCode": response.status_code, "html": response.text,
                    "error": None}
        except requests.RequestException as exc:
            failure = type(exc).__name__ + ":" + str(exc)[:200]
            if attempt < 3:
                time.sleep(attempt)
    return {"statusCode": None, "html": "", "error": failure}


def native_artist_links(soup: BeautifulSoup, expected_display: str) -> list[dict]:
    evidence = {}
    for anchor in soup.find_all("a"):
        display = " ".join(anchor.stripped_strings).strip()
        if not display:
            image = anchor.find("img")
            display = str(image.get("alt") or "").strip() if image else ""
        if normalize(display) != normalize(expected_display):
            continue
        onclick = str(anchor.get("onclick") or "")
        href = str(anchor.get("href") or "")
        match = ARTIST_ONCLICK.search(onclick) or ARTIST_HREF.search(href)
        if match:
            evidence[(match.group(1), display)] = {
                "providerArtistId": match.group(1), "providerDisplay": display,
                "link": href if href else onclick[:180],
            }
    return [evidence[key] for key in sorted(evidence)]


def metadata_field(soup: BeautifulSoup, label: str) -> str | None:
    icon = soup.find("img", attrs={"alt": label})
    node = icon.find_parent("li") if icon is not None else None
    return " ".join(node.stripped_strings).strip() if node is not None else None


def probe(probe: dict) -> dict:
    song_url = ROOT_URL + "songInfo?xgnm=" + probe["songId"]
    artist_url = ROOT_URL + "artistInfo?xxnm=" + probe["pinnedId"]
    song = fetch(song_url)
    profile = fetch(artist_url)
    song_soup = BeautifulSoup(song["html"], "html.parser")
    profile_soup = BeautifulSoup(profile["html"], "html.parser")
    heading = song_soup.select_one("h2.name") or song_soup.select_one("h2")
    title = " ".join(heading.stripped_strings).strip() if heading else ""
    links = native_artist_links(song_soup, probe["display"])
    matching_display_ids = sorted({item["providerArtistId"] for item in links})
    profile_heading = (
        profile_soup.select_one(".info-zone h2.name")
        or profile_soup.select_one("h2.name")
    )
    profile_display = (
        " ".join(profile_heading.stripped_strings).strip() if profile_heading else ""
    )
    activity_raw = metadata_field(profile_soup, "활동유형")
    debut_raw = metadata_field(profile_soup, "데뷔")
    year = YEAR.search(debut_raw or "")
    profile_year = int(year.group()) if year else None

    checks = {
        "songHttp200": song["statusCode"] == 200,
        "artistDetailHttp200": profile["statusCode"] == 200,
        "songTitleMatches": normalize(probe["songTitle"]) in normalize(title),
        "onlyExpectedNativeArtistId": matching_display_ids == [probe["pinnedId"]],
        "profileDisplayMatches": normalize(profile_display) == normalize(probe["display"]),
        "profileActivityMatches": bool(
            activity_raw and probe["activityClass"] in activity_raw
        ),
        "profileYearAgreesWithOriginalExact94": (
            profile_year == probe["providerYearRecordedInExact94"]
        ),
    }
    reasons = [key for key, value in checks.items() if not value]
    return {
        "canonicalArtistId": probe["canonicalArtistId"],
        "originalPinnedProviderArtistId": probe["pinnedId"],
        "expectedArtistDisplay": probe["display"],
        "nativeSongUrl": song_url,
        "expectedNativeSongTitle": probe["songTitle"],
        "songHttpStatus": song["statusCode"],
        "songRequestError": song["error"],
        "observedSongTitle": title,
        "exactNameNativeArtistLinks": links,
        "exactNameNativeArtistIds": matching_display_ids,
        "originalArtistDetailUrl": artist_url,
        "artistDetailHttpStatus": profile["statusCode"],
        "artistDetailRequestError": profile["error"],
        "observedArtistDisplay": profile_display,
        "observedActivityTypeRaw": activity_raw,
        "observedProviderDebutFieldRaw": debut_raw,
        "observedProviderDebutYear": profile_year,
        "originalExact94ProviderDebutYear": probe["providerYearRecordedInExact94"],
        "checks": checks,
        "identityEvidenceQualifiedForHumanReview": not reasons,
        "unresolvedReasons": reasons,
        "humanReviewedBindingApproved": False,
        "canonicalDebutYearBackfilled": False,
        "sourceSupportedPromoted": False,
        "productActivated": False,
    }


def main() -> None:
    queue = json.loads(QUEUE.read_text(encoding="utf-8-sig"))
    decisions = json.loads(DECISIONS.read_text(encoding="utf-8-sig"))
    originals = {row["canonicalArtistId"]: row for row in queue["candidates"]}
    review_rows = {
        row["canonicalArtistId"]: row for row in decisions["candidates"]
    }
    assert len(PROBES) == len({p["canonicalArtistId"] for p in PROBES}) == 6
    for item in PROBES:
        artist_id = item["canonicalArtistId"]
        original = originals[artist_id]
        review = review_rows[artist_id]
        assert review["evidenceReviewLane"] in (
            "remaining_gap_or_semantics_research",
            "remaining18_native_song_identity_qualified",
        )
        if review["evidenceReviewLane"] == "remaining18_native_song_identity_qualified":
            # The research probe is rerunnable after the reviewer queue has moved
            # forward; only the same pinned native identity may be rechecked.
            later = review["laterProviderIdentityEvidence"]
            assert later["qualifiedCandidateProviderArtistId"] == item["pinnedId"]
            assert later["providerDebutYearFromLaterQualifiedCandidate"] == item["providerYearRecordedInExact94"]
            assert later["nativeReleaseEvidenceUrl"] == (
                ROOT_URL + "songInfo?xgnm=" + item["songId"]
            )
            assert later["nativeSongOrAlbumArtistLinkVerified"] is True
            assert review["reviewedBindingApproved"] is False
            assert review["supportedPromotionApproved"] is False
        assert original["genieProviderArtistId"] == item["pinnedId"]
        assert original["genieDebutYear"] == item["providerYearRecordedInExact94"]
        assert original["canonicalDebutYear"] is None
        assert original["reviewStatus"] == "unresolved_additional_year_evidence_required"

    result_map = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(probe, item): item["canonicalArtistId"] for item in PROBES}
        for future in concurrent.futures.as_completed(futures):
            artist_id = futures[future]
            try:
                result_map[artist_id] = future.result()
            except Exception as exc:
                # A failed investigation must never masquerade as successful evidence.
                result_map[artist_id] = {
                    "canonicalArtistId": artist_id,
                    "identityEvidenceQualifiedForHumanReview": False,
                    "unresolvedReasons": ["probe_exception:" + type(exc).__name__ + ":" + str(exc)[:180]],
                    "humanReviewedBindingApproved": False,
                    "sourceSupportedPromoted": False, "productActivated": False,
                }

    records = [result_map[item["canonicalArtistId"]] for item in PROBES]
    qualified = [
        item["canonicalArtistId"] for item in records
        if item["identityEvidenceQualifiedForHumanReview"]
    ]
    held = [
        item["canonicalArtistId"] for item in records
        if not item["identityEvidenceQualifiedForHumanReview"]
    ]
    payload = {
        "version": "music_genie_partial39_remaining18_six_native_song_probe_v1",
        "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
        "sourceQueue": "music_genie_partial39_evidence_triage_v1.json",
        "sourceDecisionQueue": "music_genie_partial39_decision_readiness_review_packet_v1.json",
        "canonicalUniverseCount": 355,
        "probeCount": 6,
        "qualifiedForHumanIdentityReviewCount": len(qualified),
        "qualifiedCanonicalArtistIds": qualified,
        "heldCanonicalArtistIds": held,
        "records": records,
        "researchOnly": True,
        "nativeLinkDoesNotEstablishCanonicalDebutYear": True,
        "reviewerIdentityAndYearScopeAuthorizationRequired": True,
        "reviewedBindingApproved": False,
        "sourceCompatibilityModified": False,
        "canonicalDebutYearBackfilled": False,
        "sourceSupportedPromoted": False,
        "productActivated": False,
        "schedulerDatabaseDeploymentOrMainMergeAuthorized": False,
        "proposedStackedMusicPartitionUnchanged": {
            "supported": 117, "unresolved": 238, "unsupported": 0
        },
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    assert len(records) == 6
    assert all(not row["humanReviewedBindingApproved"] for row in records)
    assert all(not row["sourceSupportedPromoted"] for row in records)
    print("REMAINING18_SIX_NATIVE_LINK " + json.dumps({
        "qualified": qualified,
        "held": held,
        "records": [{
            "canonicalArtistId": r["canonicalArtistId"],
            "nativeSongUrl": r.get("nativeSongUrl"),
            "observedProviderArtistIds": r.get("exactNameNativeArtistIds"),
            "observedProviderDebutYear": r.get("observedProviderDebutYear"),
            "unresolvedReasons": r["unresolvedReasons"],
        } for r in records],
    }, ensure_ascii=False))
    print("PASS: Genie remaining18 six-song read-only probe | "
          f"{len(qualified)}/6 identity evidence qualified, {len(held)}/6 held"
          " | no binding approval | Music 117/238/0")


if __name__ == "__main__":
    main()
