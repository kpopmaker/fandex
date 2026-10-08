from __future__ import annotations

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
OUTPUT = Path("music_genie_jinu_identity_linkage_live_v1.json")
TRANSIENT = {429, 500, 502, 503, 504}
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
}
PINNED = "14946516"
WINNER_CANDIDATE = "80441171"
WINNER_SOLO_SONG_URL = "https://www.genie.co.kr/detail/songInfo?xgnm=89300603"
SEARCH_TERMS = ("JINU (김진우)", "지누", "JINU", "김진우")
MAGAZINES = {
    "historical_jinu": "https://www.genie.co.kr/magazine/subMain?ctid=27&mgz_seq=13810",
    "winner_jinu": "https://www.genie.co.kr/magazine/subMain?ctid=1&mgz_seq=7198",
}


def compact(value: str) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", str(value or "").strip().lower())


def fetch(url: str) -> dict:
    last_error = None
    for attempt in range(1, 4):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            if resp.status_code in TRANSIENT and attempt < 3:
                time.sleep(attempt)
                continue
            return {
                "statusCode": resp.status_code,
                "responseLength": len(resp.content),
                "html": resp.text,
                "error": None,
            }
        except Exception as exc:
            last_error = type(exc).__name__ + ":" + str(exc)[:240]
            if attempt < 3:
                time.sleep(attempt)
    return {"statusCode": None, "responseLength": 0, "html": "", "error": last_error}


def extract_provider_field(soup: BeautifulSoup, label: str) -> str | None:
    node = soup.find("img", attrs={"alt": label})
    if node is not None:
        li = node.find_parent("li")
        if li:
            value = " ".join(li.stripped_strings).strip()
            if value:
                return value
    return None


def parse_detail(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    node = soup.select_one(".info-zone h2.name") or soup.select_one("h2.name")
    display = " ".join(node.stripped_strings).strip() if node else ""
    plain = " ".join(soup.stripped_strings)
    debut_match = re.search(r"데뷔\s*((?:19|20)\d{2})년", plain)
    activity = extract_provider_field(soup, "활동유형")
    debut_label = extract_provider_field(soup, "데뷔")
    album_names = ("Jinujoke", "엉뚱한 상상", "JINU's HEYDAY", "JINU’s HEYDAY", "또또또")
    observed = [name for name in album_names if compact(name) in compact(plain)]
    return {
        "providerDisplay": display,
        "providerActivityType": activity,
        "providerDebutFieldRaw": debut_label,
        "debutYearInVisibleText": int(debut_match.group(1)) if debut_match else None,
        "observedReleaseOrSongMarkers": observed,
        "mentionsRollerCoaster": "롤러코스터" in plain,
        "mentionsWinner": "WINNER" in plain or "위너" in plain,
        "mentionsHitchhiker": "Hitchhiker" in plain or "히치하이커" in plain,
        "hasArtistDetailHeading": bool(display),
    }


def parse_search(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    by_id = {}
    onclick_re = re.compile(r"fnViewArtist\(['\\\"]([0-9]+)['\\\"]\)", re.I)
    href_re = re.compile(r"artistInfo\?xxnm=([0-9]+)", re.I)
    for anchor in soup.find_all("a"):
        raw = str(anchor.get("onclick") or "")
        href = str(anchor.get("href") or "")
        match = onclick_re.search(raw) or href_re.search(href)
        if match is None:
            continue
        name = " ".join(anchor.stripped_strings).strip()
        if not name:
            img = anchor.find("img")
            name = str(img.get("alt") or "").strip() if img else ""
        if not name:
            continue
        pid = match.group(1)
        # Never choose a provider ID. Preserve any exactly named candidates.
        if compact(name) in {compact("JINU"), compact("지누"), compact("JINU (김진우)"), compact("김진우")}:
            by_id[(pid, compact(name))] = {"providerArtistId": pid, "providerDisplay": name}
    return sorted(by_id.values(), key=lambda r: (r["providerArtistId"], r["providerDisplay"]))



def extract_song_artist_links(html: str) -> dict:
    """Resolve linked artist IDs from the provider's own solo-song page."""
    soup = BeautifulSoup(html, "html.parser")
    heading = soup.select_one("h2.name") or soup.select_one("h2")
    title = " ".join(heading.stripped_strings).strip() if heading else ""
    plain = " ".join(soup.stripped_strings)
    found = {}
    pat = re.compile(r"""fnViewArtist\(['"]([0-9]+)['"]\)""", re.I)
    href_pat = re.compile(r"artistInfo\?xxnm=([0-9]+)", re.I)
    for anchor in soup.find_all("a"):
        name = " ".join(anchor.stripped_strings).strip()
        if not name:
            img = anchor.find("img")
            name = str(img.get("alt") or "").strip() if img else ""
        if compact(name) != compact("JINU (김진우)"):
            continue
        onclick = str(anchor.get("onclick") or "")
        href = str(anchor.get("href") or "")
        match = pat.search(onclick) or href_pat.search(href)
        if match:
            found[(match.group(1), name)] = {
                "providerArtistId": match.group(1),
                "display": name,
                "linkType": "provider_song_to_artist",
            }
    ids = sorted({item["providerArtistId"] for item in found.values()})
    has_expected_song_context = (
        "또또또" in plain and ("JINU's HEYDAY" in plain or "JINU’s HEYDAY" in plain)
    )
    return {
        "songTitleExtracted": title,
        "hasExpectedSoloSongAndAlbum": has_expected_song_context,
        "providerArtistLinks": list(found.values()),
        "linkedProviderArtistIds": ids,
        "exactWinnerArtistLinkObserved": ids == [WINNER_CANDIDATE] and has_expected_song_context,
        "oldJinuProviderIdNotAttributed": PINNED not in ids,
    }


def main() -> None:
    queue = json.loads(QUEUE.read_text(encoding="utf-8-sig"))
    candidate = next(r for r in queue["candidates"] if r["canonicalArtistId"] == "jinu")
    assert candidate["genieProviderArtistId"] == PINNED
    assert candidate["genieDebutYear"] == 1996
    assert candidate["reviewStatus"] == "unresolved_additional_year_evidence_required"

    detail_url = f"https://www.genie.co.kr/detail/artistInfo?xxnm={PINNED}"
    response = fetch(detail_url)
    detail = parse_detail(response["html"]) if response["statusCode"] == 200 else None
    searches = []
    for term in SEARCH_TERMS:
        url = "https://www.genie.co.kr/search/searchMain?query=" + quote_plus(term)
        result = fetch(url)
        searches.append({
            "query": term,
            "url": url,
            "statusCode": result["statusCode"],
            "error": result["error"],
            "exactNameCandidates": parse_search(result["html"]) if result["statusCode"] == 200 else [],
        })

    magazines = {}
    for key, url in MAGAZINES.items():
        result = fetch(url)
        text = " ".join(BeautifulSoup(result["html"], "html.parser").stripped_strings)
        if key == "historical_jinu":
            markers = {
                "states1996DebutSong": ("엉뚱한 상상" in text and ("1996" in text or "96년도" in text)),
                "statesRollerCoasterMembership": "롤러코스터" in text,
                "statesHitchhikerIdentity": "히치하이커" in text or "Hitchhiker" in text,
            }
        else:
            markers = {
                "statesWinnerKimJinwoo": "WINNER" in text and "김진우" in text,
                "states2019SoloHeyday": "JINU" in text and "HEYDAY" in text,
            }
        magazines[key] = {"url": url, "statusCode": result["statusCode"], "error": result["error"], "markers": markers}

    all_names = {}
    for search in searches:
        for found in search["exactNameCandidates"]:
            all_names.setdefault(found["providerArtistId"], set()).add(found["providerDisplay"])

    search_id_candidates = [
        {"providerArtistId": pid, "providerDisplays": sorted(displays)}
        for pid, displays in sorted(all_names.items())
    ]
    winner_labeled_ids = [
        item["providerArtistId"] for item in search_id_candidates
        if any(compact(name) == compact("JINU (김진우)") for name in item["providerDisplays"])
    ]

    # Exact alternate names from live Genie search are *candidates*, never bindings.
    winner_labeled_details = []
    for alternate_pid in sorted(set(winner_labeled_ids)):
        result = fetch(f"https://www.genie.co.kr/detail/artistInfo?xxnm={alternate_pid}")
        alternate_detail = parse_detail(result["html"]) if result["statusCode"] == 200 else None
        winner_labeled_details.append({
            "providerArtistId": alternate_pid,
            "statusCode": result["statusCode"],
            "error": result["error"],
            "detail": alternate_detail,
        })

    # A provider song-to-artist link is stronger than a shared display name.
    song_result = fetch(WINNER_SOLO_SONG_URL)
    song_linkage = (
        extract_song_artist_links(song_result["html"]) if song_result["statusCode"] == 200 else None
    )

    historical_context = magazines["historical_jinu"]["markers"]
    winner_context = magazines["winner_jinu"]["markers"]
    direct_historical_markers = (
        bool(detail)
        and {"Jinujoke", "엉뚱한 상상"}.issubset(set(detail["observedReleaseOrSongMarkers"]))
        and detail["mentionsRollerCoaster"]
    )
    alternate_has_winner_release = any(
        item["detail"] and (
            any("HEYDAY" in title for title in item["detail"]["observedReleaseOrSongMarkers"])
            or item["detail"]["mentionsWinner"]
        )
        for item in winner_labeled_details
    )
    if direct_historical_markers and historical_context["statesRollerCoasterMembership"]:
        classification = "pinned_genie_id_historical_jinu_conflict_held"
    elif PINNED in winner_labeled_ids and detail and detail["mentionsWinner"]:
        classification = "pinned_id_winner_labeled_but_manual_review_required"
    else:
        classification = "identity_linkage_unresolved"
    payload = {
        "version": "music_genie_jinu_identity_linkage_live_v1",
        "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
        "canonicalArtistId": "jinu",
        "expectedCanonicalEntity": "JINU (김진우), WINNER member, 2019 solo artist",
        "provisionalProviderArtistId": PINNED,
        "sourceCandidateReviewStatus": "unresolved",
        "pinnedDetail": {"url": detail_url, "statusCode": response["statusCode"], "error": response["error"], "result": detail},
        "exactNameSearches": searches,
        "exactNameProviderIds": search_id_candidates,
        "winnerLabeledCandidateProviderIds": sorted(set(winner_labeled_ids)),
        "winnerLabeledCandidateDetails": winner_labeled_details,
        "winnerSoloSongArtistLinkage": {
            "url": WINNER_SOLO_SONG_URL,
            "statusCode": song_result["statusCode"],
            "error": song_result["error"],
            "result": song_linkage,
        },
        "alternateCandidateHasWinnerReleaseEvidence": alternate_has_winner_release,
        "historicalPinnedDetailMatches1996JinuEditorialIdentity": bool(direct_historical_markers and historical_context["statesRollerCoasterMembership"]),
        "genieEditorialContexts": magazines,
        "outcome": classification,
        "investigationOnly": True,
        "automaticRebindingAuthorized": False,
        "musicSupportedPromotionAuthorized": False,
        "productActivationAuthorized": False,
        "existingMusicPartitionUnchanged": {"supported": 117, "unresolved": 238, "unsupported": 0},
    }
    OUTPUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    assert not payload["automaticRebindingAuthorized"]
    assert not payload["musicSupportedPromotionAuthorized"]
    assert song_result["statusCode"] == 200, "genie_song_http_not_200"
    assert song_linkage is not None, "genie_song_artist_linkage_missing"
    assert song_linkage["exactWinnerArtistLinkObserved"] is True, "wrong_or_missing_genie_song_artist_id"
    assert song_linkage["oldJinuProviderIdNotAttributed"] is True, "historical_artist_on_winner_solo_song"
    assert classification == "pinned_genie_id_historical_jinu_conflict_held"
    print("PASS: JINU Genie live identity investigation non-activating | outcome=" + classification)
    print("PINNED_DETAIL " + json.dumps({"status": response["statusCode"], "detail": detail}, ensure_ascii=False))
    print("SEARCH_EXACT " + json.dumps(search_id_candidates, ensure_ascii=False))
    print("EDITORIAL_MARKERS " + json.dumps({k: v["markers"] for k, v in magazines.items()}, ensure_ascii=False))
    print("WINNER_LABELED_DETAILS " + json.dumps(winner_labeled_details, ensure_ascii=False))
    print("SONG_ARTIST_LINKAGE " + json.dumps({"statusCode": song_result["statusCode"], "linkage": song_linkage}, ensure_ascii=False))


if __name__ == "__main__":
    main()
