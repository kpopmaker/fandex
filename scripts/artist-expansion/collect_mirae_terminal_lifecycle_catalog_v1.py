from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "mirae_official_terminal_lifecycle_catalog_adapter_v1"
TERMINAL_URL = "https://www.soompi.com/article/1673593wpp/mirae-kondigt-officieel-ontbinding-aan"
DEBUT_URL = "https://www.soompi.com/article/1455795wpp/dsp-medias-new-boy-group-mirae-announces-debut-date-and-more?mobile-app=true&theme=false%29"
ALBUM_URL = "https://shop.weverse.io/ko/shop/KRW/artists/54/sales/9909"
EXPECTED_ARTISTS = ["MIRAE"]
EXPECTED_MEMBERS = ["LEE JUN HYUK", "LIEN", "YOO DOHYUN", "KHAEL", "SON DONG PYO", "PARK SI YOUNG", "JANG YU BIN"]

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

def parse_live_pages(terminal_html: str, debut_html: str, album_html: str) -> list[dict]:
    terminal = text_blob(terminal_html)
    debut = text_blob(debut_html)
    album = text_blob(album_html)

    if not contains_any(terminal, "DSP Media", "DSP미디어"):
        return []
    if not contains_any(terminal, "conclude their group activities", "group activities will be coming to an end", "그룹 활동을 종료"):
        return []

    terminal_member_tokens = [
        ("Lee Jun Hyuk", "이준혁"),
        ("Lien", "리안"),
        ("Yoo Dohyun", "유도현"),
        ("Khael", "카엘"),
        ("Son Dong Pyo", "손동표"),
        ("Park Si Young", "박시영"),
        ("Jang Yu Bin", "장유빈"),
    ]
    if any(not contains_any(terminal, *tokens) for tokens in terminal_member_tokens):
        return []
    if not contains_any(terminal, "Son Dong Pyo will continue", "손동표는", "individual activities"):
        return []

    if not contains_any(debut, "March 17", "3월 17일"):
        return []
    if "2021" not in debut:
        return []
    if not contains_any(debut, "KILLA"):
        return []

    if not contains_any(album, "MIRAE", "미래소년"):
        return []
    if not contains_any(album, "KILLA"):
        return []
    if not contains_any(album, "DSP MEDIA", "DSP Media"):
        return []
    if not contains_any(album, "1st Mini Album", "1st mini album", "미니"):
        return []

    return [{
        "displayArtist": "MIRAE",
        "aliases": ["미래소년"],
        "evidence": [
            {"label": "DSP MIRAE terminal statement preserved by Soompi", "url": TERMINAL_URL},
            {"label": "DSP MIRAE debut announcement preserved by Soompi", "url": DEBUT_URL},
            {"label": "MIRAE official Weverse Shop KILLA album", "url": ALBUM_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "mirae-official-terminal-lifecycle-catalog",
            "type": "provider_catalog",
            "name": "MIRAE Official Terminal Lifecycle Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "exactTerminalMemberRosterRequired": True,
            "explicitGroupActivityTerminationRequired": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "individualMemberContinuationDoesNotReactivateGroup": True,
            "terminalGroupStateDoesNotImplyAllIndividualContractsEnded": True,
            "officialDebutDateEvidenceRequired": True,
            "officialDebutAlbumIdentityRequired": True,
            "secondaryEditorialInferenceForbidden": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalLifecycle": {
            "effectiveDate": "2024-07-09",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "DSP Media",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 7,
            "individualContinuationAtTerminal": [
                {"member": "SON DONG PYO", "resolution": "continued_individual_activities_under_dsp_after_group_activity_end"},
            ],
            "debutDate": "2021-03-17",
            "debutRelease": "KILLA",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "mirae-official-terminal-lifecycle-catalog":
        raise RuntimeError("MIRAE fallback snapshot source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("MIRAE fallback exact provider catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("explicitGroupActivityTerminationRequired") is not True:
        raise RuntimeError("MIRAE fallback terminal activity contract required")
    if contract.get("individualMemberContinuationDoesNotReactivateGroup") is not True:
        raise RuntimeError("MIRAE fallback individual-continuation contract required")
    lifecycle = snapshot.get("terminalLifecycle") if isinstance(snapshot, dict) else None
    if not isinstance(lifecycle, dict) or lifecycle.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("MIRAE fallback exact terminal roster required")
    if lifecycle.get("lifecycleStatus") != "inactive" or lifecycle.get("agencyStatus") != "historical":
        raise RuntimeError("MIRAE fallback terminal status mismatch")
    if lifecycle.get("terminalMemberCount") != 7 or lifecycle.get("debutDate") != "2021-03-17":
        raise RuntimeError("MIRAE fallback count or debut mismatch")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(TERMINAL_URL), fetch(DEBUT_URL), fetch(ALBUM_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"MIRAE terminal lifecycle catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
