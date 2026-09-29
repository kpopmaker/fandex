from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "nature_nch_terminal_lifecycle_catalog_adapter_v1"
TERMINAL_URL = "https://www.soompi.com/article/1657637wpp/nature-officially-announces-disbandment-after-6-years"
TERMINAL_KO_URL = "https://enews.imbc.com/News/ViewAmp/416092"
PROFILE_URL = "https://www.mk.co.kr/news/musics/10526878"
DEBUT_URL = "https://music.apple.com/us/album/girls-and-flowers-ep/1624356825"
EXPECTED_ARTISTS = ["NATURE"]
EXPECTED_MEMBERS = ["SOHEE", "AURORA", "SAEBOM", "LU", "CHAEBIN", "HARU", "LOHA", "UCHAE", "SUNSHINE"]

def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()

def fetch(url: str) -> str:
    response = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0 (compatible; FANDEX validation research)"})
    response.raise_for_status()
    return response.text

def text_blob(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    return normalize_spaces(" ".join(soup.stripped_strings) + " " + html)

def contains_any(text: str, *tokens: str) -> bool:
    value = text.lower()
    return any(token.lower() in value for token in tokens)

def parse_live_pages(terminal_html: str, terminal_ko_html: str, profile_html: str, debut_html: str) -> list[dict]:
    terminal = text_blob(terminal_html)
    terminal_ko = text_blob(terminal_ko_html)
    profile = text_blob(profile_html)
    debut = text_blob(debut_html)

    if not contains_any(terminal, "ending all official activities as a group", "group’s activities would come to an end", "group's activities would come to an end"):
        return []
    if not contains_any(terminal, "members would go their separate ways", "members will go their separate ways"):
        return []
    if not contains_any(terminal, "Sohee will remain with our agency", "Sohee will remain"):
        return []

    if not contains_any(terminal_ko, "공식적인 그룹 활동을 종료", "그룹 활동을 종료"):
        return []
    if not contains_any(terminal_ko, "각자의 길", "각자"):
        return []

    profile_member_tokens = [
        ("소희", "SOHEE"), ("오로라", "AURORA"), ("새봄", "SAEBOM"),
        ("루", "LU"), ("채빈", "CHAEBIN"), ("하루", "HARU"),
        ("로하", "LOHA"), ("유채", "UCHAE"), ("선샤인", "SUNSHINE"),
    ]
    if any(not contains_any(profile, *tokens) for tokens in profile_member_tokens):
        return []
    if not contains_any(profile, "9인조", "nine-member", "9-member"):
        return []

    if not contains_any(debut, "NATURE"):
        return []
    if not contains_any(debut, "Girls and Flowers"):
        return []
    if not contains_any(debut, "August 3, 2018", "2018-08-03"):
        return []
    if not contains_any(debut, "n.CH Entertainment"):
        return []

    return [{
        "displayArtist": "NATURE",
        "aliases": ["네이처"],
        "evidence": [
            {"label": "n.CH terminal group-activity statement", "url": TERMINAL_URL},
            {"label": "n.CH terminal statement Korean preservation", "url": TERMINAL_KO_URL},
            {"label": "n.CH-supplied nine-member profile", "url": PROFILE_URL},
            {"label": "Apple Music Girls and Flowers debut catalog", "url": DEBUT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "nature-nch-terminal-lifecycle-catalog",
            "type": "provider_catalog",
            "name": "NATURE n.CH Terminal Lifecycle Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "exactTerminalMemberRosterRequired": True,
            "explicitGroupActivityEndRequired": True,
            "membersSeparatePathsEvidenceRequired": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "temporaryNonparticipationDoesNotEqualDeparture": True,
            "healthHiatusDoesNotTerminateMembership": True,
            "overseasScheduleAbsenceDoesNotTerminateMembership": True,
            "explicitDepartureRequiredForMemberRemoval": True,
            "postGroupIndividualAgencyRetentionDoesNotReactivateGroup": True,
            "terminalGroupStateDoesNotInferIndividualCareerEnd": True,
            "licensedProviderDebutCatalogAllowed": True,
            "debutDateCrossSourceConsistencyRequired": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalLifecycle": {
            "announcedAt": "2024-04-27",
            "effectiveDate": "2024-04-27",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "n.CH Entertainment",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 9,
            "officialGroupActivitiesEnded": True,
            "membersProceedSeparately": True,
            "soheeIndividualAgencyRetention": True,
            "priorExitedMembers": [
                {"member": "GAGA", "resolution": "preterminal_explicit_former_member_excluded_from_terminal_roster"},
            ],
            "debutDate": "2018-08-03",
            "debutRelease": "Girls and Flowers",
            "fandomName": "LEAF",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "nature-nch-terminal-lifecycle-catalog":
        raise RuntimeError("NATURE fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("NATURE fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("explicitGroupActivityEndRequired") is not True:
        raise RuntimeError("NATURE fallback terminal group-activity contract required")
    terminal = snapshot.get("terminalLifecycle") if isinstance(snapshot, dict) else None
    if not isinstance(terminal, dict) or terminal.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("NATURE fallback exact terminal roster required")
    if terminal.get("terminalMemberCount") != 9:
        raise RuntimeError("NATURE fallback terminal member count mismatch")
    if terminal.get("lifecycleStatus") != "inactive" or terminal.get("agencyStatus") != "historical":
        raise RuntimeError("NATURE fallback terminal state mismatch")
    if terminal.get("officialGroupActivitiesEnded") is not True or terminal.get("membersProceedSeparately") is not True:
        raise RuntimeError("NATURE fallback terminal evidence mismatch")
    if terminal.get("debutDate") != "2018-08-03":
        raise RuntimeError("NATURE fallback debut date mismatch")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    try:
        rows = parse_live_pages(fetch(TERMINAL_URL), fetch(TERMINAL_KO_URL), fetch(PROFILE_URL), fetch(DEBUT_URL))
    except requests.RequestException:
        rows = []
    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"NATURE terminal lifecycle catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")
    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
