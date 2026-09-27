from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "ninei_official_pause_identity_catalog_adapter_v1"
PAUSE_URL = "https://www.soompi.com/article/1805366wpp/nine-i-to-pause-group-activities-focus-on-individual-careers-for-time-being"
SEOWON_URL = "https://enews.imbc.com/News/ViewAmp/464803"
JOOHYOUNG_URL = "https://www.starnewskorea.com/music/2025/03/11/2025031119491388539"
WINNIE_URL = "https://www.soompi.com/article/1640059wpp/former-boys-planet-contestant-winnie-to-leave-nine-i-due-to-injury"
DEBUT_URL = "https://enews.imbc.com/News/RetrieveNewsInfo/342516"
CATALOG_URL = "https://music.apple.com/us/album/new-world-ep/1743962739"
EXPECTED_ARTISTS = ["NINE.i"]
EXPECTED_MEMBERS = ["JEWON", "EDEN", "MINJUN", "VAHN", "VARI", "TAEHUN", "JIHO"]

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
    pause_html: str,
    seowon_html: str,
    joohyoung_html: str,
    winnie_html: str,
    debut_html: str,
    catalog_html: str,
) -> list[dict]:
    pause = text_blob(pause_html)
    seowon = text_blob(seowon_html)
    joohyoung = text_blob(joohyoung_html)
    winnie = text_blob(winnie_html)
    debut = text_blob(debut_html)
    catalog = text_blob(catalog_html)

    if not contains_any(pause, "NINE.i", "나인아이"):
        return []
    if not contains_any(pause, "individual activities rather than group activities", "individual activities", "개인 활동"):
        return []
    if not contains_any(pause, "does not mean that the group is disbanding", "not disbanding", "해체"):
        return []

    if not contains_any(seowon, "서원", "Seowon"):
        return []
    if not contains_any(seowon, "7인 체제", "seven-member", "seven members"):
        return []
    if not contains_any(seowon, "현재 소속사 없이", "without an agency", "no agency"):
        return []

    if not contains_any(joohyoung, "주형", "JOOHYOUNG"):
        return []
    if not contains_any(joohyoung, "팀 탈퇴", "leave the group", "leave the team", "탈퇴 의사"):
        return []
    if not contains_any(joohyoung, "8인", "eight-member", "eight members"):
        return []

    if not contains_any(winnie, "Winnie", "위니"):
        return []
    if not contains_any(winnie, "leaving NINE.i", "activities as NINE.i", "활동을 종료"):
        return []
    if not contains_any(winnie, "9-member", "nine members", "9-member group"):
        return []

    debut_member_tokens = [
        ("제원", "JEWON"),
        ("이든", "EDEN"),
        ("민준", "MINJUN"),
        ("반", "VAHN"),
        ("베리", "VARI"),
        ("서원", "SEOWON"),
        ("태훈", "TAEHUN"),
        ("주형", "JOOHYOUNG"),
        ("지호", "JIHO"),
        ("위니", "WINNIE"),
    ]
    if any(not contains_any(debut, *tokens) for tokens in debut_member_tokens):
        return []
    if not contains_any(debut, "2022-03-30", "2022-03-30", "3월 30일"):
        return []
    if not contains_any(debut, "NEW WORLD", "뉴 월드"):
        return []

    if not contains_any(catalog, "NINE.i"):
        return []
    if not contains_any(catalog, "March 30, 2022", "2022-03-30"):
        return []
    if not contains_any(catalog, "NEW WORLD"):
        return []

    return [{
        "displayArtist": "NINE.i",
        "aliases": ["나인아이", "NINEI"],
        "evidence": [
            {"label": "NINE.i non-disbanding group-activity pause statement", "url": PAUSE_URL},
            {"label": "NINE.i seven-member continuation / agency-unresolved evidence", "url": SEOWON_URL},
            {"label": "NINE.i JOOHYOUNG departure statement", "url": JOOHYOUNG_URL},
            {"label": "FirstOne WINNIE departure statement", "url": WINNIE_URL},
            {"label": "FirstOne NINE.i debut statement", "url": DEBUT_URL},
            {"label": "Apple Music NEW WORLD provider catalog", "url": CATALOG_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "ninei-official-pause-identity-catalog",
            "type": "provider_catalog",
            "name": "NINE.i Official Pause Identity Catalog",
            "observedAt": observed_at,
            "url": PAUSE_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialGroupDirectionEvidenceRequired": True,
            "explicitNonDisbandingStatementRequired": True,
            "groupActivityPauseDoesNotEqualTermination": True,
            "pausedGroupRetainsActiveLifecycle": True,
            "exactCurrentMemberRosterRequired": True,
            "explicitFormerMemberDepartureEvidenceRequired": True,
            "currentAgencyAbsenceMustRemainUnresolved": True,
            "blankAgencyRequiredWhenAgencyStatusUnresolved": True,
            "individualActivitiesDoNotTerminateGroupIdentity": True,
            "licensedProviderDebutCatalogAllowed": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "currentIdentity": {
            "lifecycleStatus": "active",
            "groupActivityPaused": True,
            "groupDisbanded": False,
            "agency": "",
            "agencyStatus": "unresolved",
            "members": EXPECTED_MEMBERS,
            "currentMemberCount": 7,
            "priorExitedMembers": [
                {"member": "WINNIE", "effectiveDate": "2024-01-28", "resolution": "explicit_team_departure_after_injury_hiatus"},
                {"member": "JOOHYOUNG", "effectiveDate": "2025-03-11", "resolution": "explicit_team_departure_for_new_challenge"},
                {"member": "SEOWON", "effectiveDate": "2025-06-13", "resolution": "explicit_team_departure_for_personal_reasons"},
            ],
            "groupPauseEffectiveDate": "2025-12-12",
            "groupPauseResolution": "individual_activity_focus_without_disbandment",
            "debutDate": "2022-03-30",
            "debutRelease": "NEW WORLD",
            "fandomName": "i.ENIN",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "ninei-official-pause-identity-catalog":
        raise RuntimeError("NINE.i fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("NINE.i fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("explicitNonDisbandingStatementRequired") is not True:
        raise RuntimeError("NINE.i fallback non-disbanding contract required")
    identity = snapshot.get("currentIdentity") if isinstance(snapshot, dict) else None
    if not isinstance(identity, dict) or identity.get("members") != EXPECTED_MEMBERS:
        raise RuntimeError("NINE.i fallback exact seven-member roster required")
    if identity.get("currentMemberCount") != 7:
        raise RuntimeError("NINE.i fallback member count mismatch")
    if identity.get("lifecycleStatus") != "active" or identity.get("groupActivityPaused") is not True:
        raise RuntimeError("NINE.i fallback paused-active lifecycle mismatch")
    if identity.get("agency") != "" or identity.get("agencyStatus") != "unresolved":
        raise RuntimeError("NINE.i fallback agency unresolved contract mismatch")
    if identity.get("groupDisbanded") is not False:
        raise RuntimeError("NINE.i fallback explicit non-disbandment required")
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
            fetch(PAUSE_URL),
            fetch(SEOWON_URL),
            fetch(JOOHYOUNG_URL),
            fetch(WINNIE_URL),
            fetch(DEBUT_URL),
            fetch(CATALOG_URL),
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
        raise RuntimeError(f"NINE.i pause identity catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
