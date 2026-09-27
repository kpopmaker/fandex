from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "dkz_official_terminal_lifecycle_catalog_adapter_v1"
TERMINAL_URL = "https://enews.imbc.com/News/RetrieveNewsInfo/501748"
GROUP_RENAME_URL = "https://www.soompi.com/article/1518069wpp/dongkiz-changes-group-name-announces-wondaes-departure-and-addition-of-new-members?mobile-app=true&theme=wiki"
MEMBER_RENAME_URL = "https://enews.imbc.com/News/RetrieveNewsInfo/489705"
FANCON_URL = "https://www.ticketlink.co.kr/global/en/help/notice/64366"
DEBUT_URL = "https://www.mk.co.kr/en/hot-issues/12017857"
EXPECTED_ARTISTS = ["DKZ"]
EXPECTED_MEMBERS = ["SEHYEON", "MINGYU", "JAECHAN", "JUONE", "GISEOK"]

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
    terminal_html: str,
    group_rename_html: str,
    member_rename_html: str,
    fancon_html: str,
    debut_html: str,
) -> list[dict]:
    terminal = text_blob(terminal_html)
    group_rename = text_blob(group_rename_html)
    member_rename = text_blob(member_rename_html)
    fancon = text_blob(fancon_html)
    debut = text_blob(debut_html)

    if not contains_any(terminal, "동요엔터테인먼트", "DONGYO ENTERTAINMENT"):
        return []
    if not contains_any(terminal, "2026년 5월 31일", "May 31, 2026"):
        return []
    if not contains_any(terminal, "그룹 활동을 마무리", "group activities will conclude"):
        return []
    terminal_member_tokens = [
        ("세현", "Sehyeon"),
        ("민규", "Mingyu"),
        ("재찬", "Jaechan"),
        ("주원", "Juone"),
        ("기석", "Giseok"),
    ]
    if any(not contains_any(terminal, *tokens) for tokens in terminal_member_tokens):
        return []

    if not contains_any(group_rename, "DONGKIZ", "동키즈"):
        return []
    if "DKZ" not in group_rename:
        return []
    if not contains_any(group_rename, "one group", "one continuous group", "separate groups"):
        return []

    if not contains_any(member_rename, "종형", "Jonghyeong"):
        return []
    if not contains_any(member_rename, "주원", "Juone"):
        return []
    if "2026" not in member_rename:
        return []

    if "2026 DKZ FAN-CON" not in fancon:
        return []
    if "DONG-ARI" not in fancon:
        return []
    if not contains_any(fancon, "Dongyo Entertainment", "동요엔터테인먼트"):
        return []

    if not contains_any(debut, "April 24, 2019", "2019년 4월 24일"):
        return []

    return [{
        "displayArtist": "DKZ",
        "aliases": ["디케이지", "DONGKIZ", "동키즈"],
        "evidence": [
            {"label": "Dongyo official terminal statement preserved by iMBC", "url": TERMINAL_URL},
            {"label": "Dongyo official DONGKIZ to DKZ continuity statement preserved by Soompi", "url": GROUP_RENAME_URL},
            {"label": "Dongyo official JONGHYEONG to JUONE rename statement preserved by iMBC", "url": MEMBER_RENAME_URL},
            {"label": "Official 2026 DKZ FAN-CON ticketing and DONG-ARI membership", "url": FANCON_URL},
            {"label": "Jaechan terminal letter with debut date", "url": DEBUT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "dkz-official-terminal-lifecycle-catalog",
            "type": "provider_catalog",
            "name": "DKZ Official Terminal Lifecycle Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "officialStatementEvidenceRequired": True,
            "terminalLifecycleEvidenceRequired": True,
            "exactTerminalMemberRosterRequired": True,
            "terminalNoticeOverridesEarlierActiveEvidence": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "groupRenameContinuityRequired": True,
            "memberStageNameRenameContinuityRequired": True,
            "individualPostGroupActivitiesDoNotReactivateGroup": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "formerMemberDoesNotRemainInTerminalRoster": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "identityContinuity": {
            "formerGroupName": "DONGKIZ",
            "currentCanonicalName": "DKZ",
            "groupRenameEffectiveYear": 2022,
            "renamedMember": {
                "formerStageName": "JONGHYEONG",
                "currentStageName": "JUONE",
                "effectiveDate": "2026-01-02",
            },
        },
        "terminalLifecycle": {
            "effectiveDate": "2026-05-31",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "Dongyo Entertainment",
            "terminalMembers": EXPECTED_MEMBERS,
            "fandomName": "DONG-ARI",
            "debutDate": "2019-04-24",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "dkz-official-terminal-lifecycle-catalog":
        raise RuntimeError("DKZ fallback snapshot source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("DKZ fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("terminalLifecycleEvidenceRequired") is not True:
        raise RuntimeError("DKZ fallback terminal lifecycle contract required")
    continuity = snapshot.get("identityContinuity") if isinstance(snapshot, dict) else None
    if not isinstance(continuity, dict) or continuity.get("formerGroupName") != "DONGKIZ":
        raise RuntimeError("DKZ fallback group rename continuity required")
    renamed = continuity.get("renamedMember") if isinstance(continuity, dict) else None
    if not isinstance(renamed, dict) or renamed.get("formerStageName") != "JONGHYEONG" or renamed.get("currentStageName") != "JUONE":
        raise RuntimeError("DKZ fallback member rename continuity required")
    lifecycle = snapshot.get("terminalLifecycle") if isinstance(snapshot, dict) else None
    if not isinstance(lifecycle, dict) or lifecycle.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("DKZ fallback exact terminal roster required")
    if lifecycle.get("lifecycleStatus") != "inactive" or lifecycle.get("agencyStatus") != "historical":
        raise RuntimeError("DKZ fallback terminal lifecycle status mismatch")
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
            fetch(TERMINAL_URL),
            fetch(GROUP_RENAME_URL),
            fetch(MEMBER_RENAME_URL),
            fetch(FANCON_URL),
            fetch(DEBUT_URL),
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
        raise RuntimeError(f"DKZ terminal catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
