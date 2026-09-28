from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "tfn_mld_terminal_rename_catalog_adapter_v1"
TERMINAL_URL = "https://www.soompi.com/article/1645748wpp/mld-boy-group-tfn-disbands-after-3-years"
RENAME_URL = "https://www.sonymusic.co.jp/artist/T1419/info/546092"
PROFILE_URL = "https://www.t1419japan.com/"
DEBUT_URL = "https://music.apple.com/us/album/before-sunrise-pt-1-single/1547593325"
EXPECTED_ARTISTS = ["TFN"]
EXPECTED_MEMBERS = ["NOA", "SIAN", "KEVIN", "GUNWOO", "LEO", "ON", "ZERO", "KAIRI", "KIO"]

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

def parse_live_pages(terminal_html: str, rename_html: str, profile_html: str, debut_html: str) -> list[dict]:
    terminal = text_blob(terminal_html)
    rename = text_blob(rename_html)
    profile = text_blob(profile_html)
    debut = text_blob(debut_html)

    if not contains_any(terminal, "MLD Entertainment", "MLD"):
        return []
    if not contains_any(terminal, "exclusive contracts and group activities have ended", "exclusive contracts", "group activities have ended"):
        return []
    if not contains_any(terminal, "February 29", "Feb 29", "2024"):
        return []

    if not contains_any(rename, "2022.10.17", "2022年10月17日", "October 17, 2022"):
        return []
    if not contains_any(rename, "T1419"):
        return []
    if not contains_any(rename, "TFN"):
        return []
    if not contains_any(rename, "グループ名", "group name"):
        return []

    profile_member_tokens = [
        ("NOA", "ノア", "노아"),
        ("SIAN", "シアン", "시안"),
        ("KEVIN", "ケビン", "케빈"),
        ("GUNWOO", "ゴヌ", "건우"),
        ("LEO", "レオ", "레오"),
        ("ON", "オン", "온"),
        ("ZERO", "ゼロ", "제로"),
        ("KAIRI", "カイリ", "카이리"),
        ("KIO", "キオ", "키오"),
    ]
    if any(not contains_any(profile, *tokens) for tokens in profile_member_tokens):
        return []
    if not contains_any(profile, "9名", "9-member", "9 members"):
        return []
    if not contains_any(profile, "MLD ENTERTAINMENT"):
        return []

    if not contains_any(debut, "BEFORE SUNRISE", "BEFORE SUNRISE, Pt. 1"):
        return []
    if not contains_any(debut, "January 11, 2021", "2021-01-11"):
        return []
    if not contains_any(debut, "MLD entertainment", "MLD Entertainment"):
        return []

    return [{
        "displayArtist": "TFN",
        "aliases": ["T1419", "티에프앤", "티일사일구"],
        "evidence": [
            {"label": "MLD terminal contract and group-activity statement", "url": TERMINAL_URL},
            {"label": "Sony Music official T1419 to TFN rename notice", "url": RENAME_URL},
            {"label": "TFN Japan official nine-member profile", "url": PROFILE_URL},
            {"label": "Apple Music BEFORE SUNRISE Pt. 1 debut catalog", "url": DEBUT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "tfn-mld-terminal-rename-catalog",
            "type": "provider_catalog",
            "name": "TFN MLD Terminal Rename Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "renameContinuityRequired": True,
            "renameDoesNotCreateNewCanonical": True,
            "exactTerminalMemberRosterRequired": True,
            "exclusiveContractEndEvidenceRequired": True,
            "groupActivityEndEvidenceRequired": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "managementClosureDoesNotAssertLegalEntityDissolution": True,
            "terminalGroupStateDoesNotInferIndividualCareerEnd": True,
            "laterIndividualActivityDoesNotReactivateGroup": True,
            "licensedProviderDebutCatalogAllowed": True,
            "debutDateCrossSourceConsistencyRequired": True,
            "officialProfileRosterAllowedForTerminalIdentity": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "renameContinuity": {
            "from": "T1419",
            "to": "TFN",
            "effectiveDate": "2022-10-17",
            "resolution": "same_group_identity_official_name_change",
        },
        "terminalLifecycle": {
            "announcedAt": "2024-02-29",
            "effectiveDate": "2024-02-29",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "MLD Entertainment",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 9,
            "exclusiveContractsEnded": True,
            "groupActivitiesEnded": True,
            "legalEntityDissolutionAsserted": False,
            "debutDate": "2021-01-11",
            "debutRelease": "BEFORE SUNRISE Part. 1",
            "fandomName": "EDELWEISS",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "tfn-mld-terminal-rename-catalog":
        raise RuntimeError("TFN fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("TFN fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("renameContinuityRequired") is not True:
        raise RuntimeError("TFN fallback rename continuity required")
    if contract.get("groupActivityEndEvidenceRequired") is not True:
        raise RuntimeError("TFN fallback group activity end evidence required")
    rename = snapshot.get("renameContinuity")
    if rename != {"from": "T1419", "to": "TFN", "effectiveDate": "2022-10-17", "resolution": "same_group_identity_official_name_change"}:
        raise RuntimeError("TFN fallback rename continuity mismatch")
    terminal = snapshot.get("terminalLifecycle") if isinstance(snapshot, dict) else None
    if not isinstance(terminal, dict) or terminal.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("TFN fallback exact terminal roster required")
    if terminal.get("terminalMemberCount") != 9:
        raise RuntimeError("TFN fallback terminal member count mismatch")
    if terminal.get("lifecycleStatus") != "inactive" or terminal.get("agencyStatus") != "historical":
        raise RuntimeError("TFN fallback terminal state mismatch")
    if terminal.get("exclusiveContractsEnded") is not True or terminal.get("groupActivitiesEnded") is not True:
        raise RuntimeError("TFN fallback terminal evidence mismatch")
    if terminal.get("legalEntityDissolutionAsserted") is not False:
        raise RuntimeError("TFN fallback legal entity dissolution must remain unasserted")
    if terminal.get("debutDate") != "2021-01-11":
        raise RuntimeError("TFN fallback debut date mismatch")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(TERMINAL_URL), fetch(RENAME_URL), fetch(PROFILE_URL), fetch(DEBUT_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"TFN terminal rename catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
