from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "ntx_victory_current_provider_catalog_adapter_v1"
TOUR_URL = "https://artist.mnetplus.world/main/stg/ntx-official/contents/6a9ffd5d81a8b9027b94b1a0"
LEADER_URL = "https://artist.mnetplus.world/main/stg/ntx-official/contents/68f6244409905c7c4be7ca60"
COMMUNITY_URL = "https://artist.mnetplus.world/main/stg/ntx-official/tag/NTX"
ROSTER_URL = "https://www.yes24.com/product/author/337539"
DEBUT_URL = "https://music.apple.com/us/album/full-of-lovescapes/1824137170"
GIHYUN_URL = "https://enews.imbc.com/M/Detail/364454"
JISEONG_URL = "https://www.koreaboo.com/news/jiseong-tan-part-ways-ntx-differences-victory-company/"
EXPECTED_ARTISTS = ["NTX"]
EXPECTED_MEMBERS = ["HYEONGJIN", "YUNHYEOK", "XIHA", "CHANGHUN", "HOJUN", "RAWHYUN", "EUNHO", "SEUNGWON"]

def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()

def fetch(url: str) -> str:
    response = requests.get(
        url,
        timeout=30,
        headers={"User-Agent": "Mozilla/5.0 (compatible; FANDEX validation research)"},
    )
    response.raise_for_status()
    return response.text

def text_blob(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    return normalize_spaces(" ".join(soup.stripped_strings) + " " + html)

def contains_any(text: str, *tokens: str) -> bool:
    value = text.lower()
    return any(token.lower() in value for token in tokens)

def parse_live_pages(
    tour_html: str,
    leader_html: str,
    community_html: str,
    roster_html: str,
    debut_html: str,
    gihyun_html: str,
    jiseong_html: str,
) -> list[dict]:
    tour = text_blob(tour_html)
    leader = text_blob(leader_html)
    community = text_blob(community_html)
    roster = text_blob(roster_html)
    debut = text_blob(debut_html)
    gihyun = text_blob(gihyun_html)
    jiseong = text_blob(jiseong_html)

    if not contains_any(tour, "Victory Company", "빅토리"):
        return []
    if not contains_any(tour, "2026 NTX ASIA TOUR", "NTX ASIA TOUR"):
        return []
    if not contains_any(tour, "2026.09.12", "September 12", "TOKYO"):
        return []
    if not contains_any(tour, "2026.12.26", "December 26", "SEOUL"):
        return []

    if not contains_any(leader, "Victory Company", "빅토리"):
        return []
    if not contains_any(leader, "Hyeongjin", "형진"):
        return []
    if not contains_any(leader, "Yunhyeok", "윤혁"):
        return []
    if not contains_any(leader, "future activities", "future activity", "향후 활동"):
        return []

    if not contains_any(community, "XIHA", "시하"):
        return []
    if not contains_any(community, "JAEMIN", "재민"):
        return []
    if not contains_any(community, "changing the name", "name change", "이름"):
        return []

    roster_member_tokens = [
        ("Hyeongjin", "형진"),
        ("Yunhyeok", "윤혁"),
        ("Xiha", "시하"),
        ("Changhun", "창훈"),
        ("Hojun", "호준"),
        ("Rawhyun", "로현"),
        ("Eunho", "은호"),
        ("Seungwon", "승원"),
    ]
    if any(not contains_any(roster, *tokens) for tokens in roster_member_tokens):
        return []
    if not contains_any(roster, "8인의 멤버", "8 members", "8-member"):
        return []

    if not contains_any(debut, "FULL OF LOVESCAPES"):
        return []
    if not contains_any(debut, "March 30, 2021", "2021-03-30"):
        return []
    if not contains_any(debut, "VICTORY COMPANY", "Victory Company"):
        return []

    if not contains_any(gihyun, "기현", "GIHYUN"):
        return []
    if not contains_any(gihyun, "전속 계약을 해지", "exclusive contract"):
        return []
    if not contains_any(gihyun, "더 이상 함께 할 수", "leave", "depart"):
        return []

    if not contains_any(jiseong, "Jiseong", "Jisung", "지성"):
        return []
    if not contains_any(jiseong, "December 11, 2024", "2024"):
        return []
    if not contains_any(jiseong, "withdraw from the NTX team", "left the group", "withdraw"):
        return []

    return [{
        "displayArtist": "NTX",
        "aliases": ["엔티엑스"],
        "evidence": [
            {"label": "Victory Company 2026 NTX Asia Tour official notice", "url": TOUR_URL},
            {"label": "Victory Company current NTX leadership notice", "url": LEADER_URL},
            {"label": "NTX official community rename continuity", "url": COMMUNITY_URL},
            {"label": "YES24 current eight-member NTX artist profile", "url": ROSTER_URL},
            {"label": "Apple Music licensed FULL OF LOVESCAPES debut catalog", "url": DEBUT_URL},
            {"label": "Victory Company GIHYUN departure statement preserved by iMBC", "url": GIHYUN_URL},
            {"label": "Victory Company JISEONG departure statement preserved by Koreaboo", "url": JISEONG_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "ntx-victory-current-provider-catalog",
            "type": "provider_catalog",
            "name": "NTX Victory Current Provider Catalog",
            "observedAt": observed_at,
            "url": TOUR_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialCurrentActivityRequired": True,
            "currentAgencyManagementEvidenceRequired": True,
            "exactCurrentMemberRosterRequired": True,
            "providerRosterMustBeCrossCheckedWithOfficialActivity": True,
            "explicitFormerMemberDepartureEvidenceRequired": True,
            "renameContinuityRequired": True,
            "renameDoesNotCreateNewMember": True,
            "temporaryNonparticipationDoesNotEqualDeparture": True,
            "historicalProjectGroupActivityDoesNotRemoveMembershipWithoutDeparture": True,
            "licensedProviderDebutCatalogAllowed": True,
            "secondaryProviderCannotOverrideOfficialLifecycle": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "currentRoster": {
            "lifecycleStatus": "active",
            "agencyStatus": "verified",
            "agency": "Victory Company",
            "members": EXPECTED_MEMBERS,
            "currentMemberCount": 8,
            "renameContinuity": [
                {"from": "JAEMIN", "to": "XIHA", "resolution": "same_member_stage_name_change"},
            ],
            "priorExitedMembers": [
                {"member": "GIHYUN", "effectiveDate": "2022-11-06", "resolution": "explicit_team_and_exclusive_contract_departure"},
                {"member": "JISEONG", "effectiveDate": "2024-12-11", "resolution": "explicit_team_withdrawal_and_exclusive_contract_termination"},
            ],
            "debutDate": "2021-03-30",
            "debutRelease": "FULL OF LOVESCAPES",
            "currentOfficialActivity": "2026 NTX ASIA TOUR",
            "currentOfficialActivityAnnouncedAt": "2026-09-08",
            "fandomName": "NTFUL",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "ntx-victory-current-provider-catalog":
        raise RuntimeError("NTX fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("NTX fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("officialCurrentActivityRequired") is not True:
        raise RuntimeError("NTX fallback current activity contract required")
    if contract.get("renameContinuityRequired") is not True:
        raise RuntimeError("NTX fallback rename continuity contract required")
    roster = snapshot.get("currentRoster") if isinstance(snapshot, dict) else None
    if not isinstance(roster, dict) or roster.get("members") != EXPECTED_MEMBERS:
        raise RuntimeError("NTX fallback exact current roster required")
    if roster.get("currentMemberCount") != 8:
        raise RuntimeError("NTX fallback current member count mismatch")
    if roster.get("lifecycleStatus") != "active" or roster.get("agencyStatus") != "verified":
        raise RuntimeError("NTX fallback active verified state mismatch")
    if roster.get("debutDate") != "2021-03-30":
        raise RuntimeError("NTX fallback debut date mismatch")
    if roster.get("renameContinuity") != [{"from": "JAEMIN", "to": "XIHA", "resolution": "same_member_stage_name_change"}]:
        raise RuntimeError("NTX fallback rename continuity mismatch")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(
            fetch(TOUR_URL),
            fetch(LEADER_URL),
            fetch(COMMUNITY_URL),
            fetch(ROSTER_URL),
            fetch(DEBUT_URL),
            fetch(GIHYUN_URL),
            fetch(JISEONG_URL),
        )
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"NTX current provider catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
