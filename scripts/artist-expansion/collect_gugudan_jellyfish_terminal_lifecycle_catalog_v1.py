from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "gugudan_jellyfish_terminal_lifecycle_catalog_adapter_v1"
TERMINAL_URL = "https://www.soompi.com/article/1446032wpp/breaking-gugudan-announces-official-disbandment"
HYEYEON_URL = "https://www.soompi.com/article/1251679wpp/gugudans-hyeyeon-announces-departure-group"
DEBUT_URL = "https://music.apple.com/us/album/act-1-the-little-mermaid-ep/1527029899"
EXPECTED_ARTISTS = ["gugudan"]
EXPECTED_MEMBERS = ["HANA", "MIMI", "NAYOUNG", "HAEBIN", "KIM SEJEONG", "SOYEE", "SALLY", "MINA"]

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

def parse_live_pages(terminal_html: str, hyeyeon_html: str, debut_html: str) -> list[dict]:
    terminal = text_blob(terminal_html)
    hyeyeon = text_blob(hyeyeon_html)
    debut = text_blob(debut_html)

    if not contains_any(terminal, "Jellyfish Entertainment"):
        return []
    if not contains_any(terminal, "officially end their group activities on December 31, 2020"):
        return []
    if not contains_any(terminal, "individual activities such as music and acting"):
        return []

    if not contains_any(hyeyeon, "Hyeyeon", "혜연"):
        return []
    if not contains_any(hyeyeon, "ending her activities with gugudan", "ending her gugudan activities"):
        return []
    if not contains_any(hyeyeon, "remaining eight members", "eight-member group"):
        return []
    terminal_member_tokens = [
        ("Hana", "하나"),
        ("Mimi", "미미"),
        ("Nayoung", "나영"),
        ("Haebin", "해빈"),
        ("Kim Sejeong", "Sejeong", "세정"),
        ("Soyee", "소이"),
        ("Sally", "샐리"),
        ("Mina", "미나"),
    ]
    if any(not contains_any(hyeyeon, *tokens) for tokens in terminal_member_tokens):
        return []

    if not contains_any(debut, "Act.1 The Little Mermaid", "Act.1 The Little Mermaid - EP"):
        return []
    if not contains_any(debut, "June 28, 2016", "2016-06-28"):
        return []
    if not contains_any(debut, "JELLYFISH ENTERTAINMENT", "Jellyfish Entertainment"):
        return []

    return [{
        "displayArtist": "gugudan",
        "aliases": ["구구단", "GUGUDAN"],
        "evidence": [
            {"label": "Jellyfish official group-activity end statement", "url": TERMINAL_URL},
            {"label": "Jellyfish HYEYEON explicit departure statement", "url": HYEYEON_URL},
            {"label": "Apple Music Act.1 The Little Mermaid debut catalog", "url": DEBUT_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "gugudan-jellyfish-terminal-lifecycle-catalog",
            "type": "provider_catalog",
            "name": "gugudan Jellyfish Terminal Lifecycle Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "explicitGroupActivityEndEvidenceRequired": True,
            "exactTerminalMemberRosterRequired": True,
            "priorExplicitMemberDepartureRequired": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "groupActivityEndDoesNotInferIndividualCareerEnd": True,
            "memberIndividualActivityDoesNotReactivateGroup": True,
            "legalDisbandmentNotIndependentlyAsserted": True,
            "licensedProviderDebutCatalogAllowed": True,
            "debutDateCrossSourceConsistencyRequired": True,
            "secondaryEditorialInferenceForbidden": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalLifecycle": {
            "announcedAt": "2020-12-30",
            "effectiveDate": "2020-12-31",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "Jellyfish Entertainment",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 8,
            "groupActivitiesEnded": True,
            "legalDisbandmentAsserted": False,
            "priorExitedMembers": [
                {"member": "HYEYEON", "effectiveDate": "2018-10-25", "resolution": "explicit_end_of_gugudan_activities"},
            ],
            "debutDate": "2016-06-28",
            "debutRelease": "Act.1 The Little Mermaid",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "gugudan-jellyfish-terminal-lifecycle-catalog":
        raise RuntimeError("gugudan fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("gugudan fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("explicitGroupActivityEndEvidenceRequired") is not True:
        raise RuntimeError("gugudan fallback group activity end contract required")
    terminal = snapshot.get("terminalLifecycle") if isinstance(snapshot, dict) else None
    if not isinstance(terminal, dict) or terminal.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("gugudan fallback exact terminal roster required")
    if terminal.get("terminalMemberCount") != 8:
        raise RuntimeError("gugudan fallback terminal member count mismatch")
    if terminal.get("lifecycleStatus") != "inactive" or terminal.get("agencyStatus") != "historical":
        raise RuntimeError("gugudan fallback terminal lifecycle mismatch")
    if terminal.get("groupActivitiesEnded") is not True:
        raise RuntimeError("gugudan fallback group activity end evidence required")
    if terminal.get("legalDisbandmentAsserted") is not False:
        raise RuntimeError("gugudan fallback legal disbandment must remain unasserted")
    if terminal.get("priorExitedMembers") != [{"member": "HYEYEON", "effectiveDate": "2018-10-25", "resolution": "explicit_end_of_gugudan_activities"}]:
        raise RuntimeError("gugudan fallback prior departure mismatch")
    if terminal.get("debutDate") != "2016-06-28":
        raise RuntimeError("gugudan fallback debut date mismatch")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        rows = parse_live_pages(fetch(TERMINAL_URL), fetch(HYEYEON_URL), fetch(DEBUT_URL))
    except requests.RequestException:
        rows = []

    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"gugudan terminal lifecycle catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
