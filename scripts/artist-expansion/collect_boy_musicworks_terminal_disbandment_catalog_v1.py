from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "boy_musicworks_terminal_disbandment_catalog_adapter_v1"
TERMINAL_URL = "https://www.soompi.com/article/1466688wpp/b-o-y-announces-disbandment-song-yu-vin-leaves-the-music-works-and-clarifies-details-in-agencys-statement"
DEBUT_PROFILE_URL = "https://www.soompi.com/article/1375500wpp/b-o-y-talks-about-their-re-debut-role-models-and-goals-for-2020"
APPLE_URL = "https://music.apple.com/kr/album/phase-one-you-ep/1493753394"
BUGS_URL = "https://music.bugs.co.kr/album/20298791"
EXPECTED_ARTISTS = ["B.O.Y"]
EXPECTED_MEMBERS = ["KIM KOOK HEON", "SONG YU VIN"]

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

def parse_live_pages(terminal_html: str, debut_profile_html: str, apple_html: str, bugs_html: str) -> list[dict]:
    terminal = text_blob(terminal_html)
    debut_profile = text_blob(debut_profile_html)
    apple = text_blob(apple_html)
    bugs = text_blob(bugs_html)

    if not contains_any(terminal, "The Music Works Entertainment", "Music Works Entertainment"):
        return []
    if not contains_any(terminal, "wrap up B.O.Y’s activities", "wrap up B.O.Y's activities", "wrap up B.O.Y"):
        return []
    if not contains_any(terminal, "disbandment of B.O.Y was decided", "disbandment of B.O.Y"):
        return []
    if not contains_any(terminal, "Song Yu Vin", "Song Yu Bin", "송유빈"):
        return []
    if not contains_any(terminal, "Kim Kook Heon", "Kook Heon", "김국헌"):
        return []

    if not contains_any(debut_profile, "B.O.Y is a duo", "new duo B.O.Y"):
        return []
    if not contains_any(debut_profile, "Kim Kook Heon", "김국헌"):
        return []
    if not contains_any(debut_profile, "Song Yu Vin", "송유빈"):
        return []
    if not contains_any(debut_profile, "January 7", "Jan 7"):
        return []
    if not contains_any(debut_profile, "Phase One : YOU", "Phase One: YOU"):
        return []

    if not contains_any(apple, "B.O.Y", "B Of You", "비오브유"):
        return []
    if not contains_any(apple, "January 7, 2020", "7 January 2020", "2020년 1월 7일"):
        return []
    if not contains_any(apple, "더뮤직웍스", "The Music Works"):
        return []

    if not contains_any(bugs, "비오브유(B.O.Y)", "B.O.Y"):
        return []
    if not contains_any(bugs, "2020.01.07", "2020-01-07"):
        return []
    if not contains_any(bugs, "더뮤직웍스", "The Music Works"):
        return []

    return [{
        "displayArtist": "B.O.Y",
        "aliases": ["비오브유", "B Of You"],
        "evidence": [
            {"label": "The Music Works group activity-wrap statement and member direct disbandment confirmation", "url": TERMINAL_URL},
            {"label": "B.O.Y two-member debut profile", "url": DEBUT_PROFILE_URL},
            {"label": "Apple Music Phase One : YOU licensed debut catalog", "url": APPLE_URL},
            {"label": "Bugs Phase One : YOU agency catalog", "url": BUGS_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "boy-musicworks-terminal-disbandment-catalog",
            "type": "provider_catalog",
            "name": "B.O.Y The Music Works Terminal Disbandment Catalog",
            "observedAt": observed_at,
            "url": TERMINAL_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "preservedOfficialStatementsAllowedForHistoricalEvents": True,
            "exactTerminalMemberRosterRequired": True,
            "agencyGroupActivityWrapUpRequired": True,
            "memberDirectDisbandmentConfirmationRequired": True,
            "individualContractTerminationDoesNotInferOtherMemberContractEnd": True,
            "historicalAgencyRequiresInactiveLifecycle": True,
            "groupDisbandmentConfirmed": True,
            "legalEntityDissolutionNotAsserted": True,
            "individualPostGroupActivityDoesNotReactivateGroup": True,
            "terminalGroupStateDoesNotInferIndividualCareerEnd": True,
            "licensedProviderDebutCatalogAllowed": True,
            "debutDateCrossSourceConsistencyRequired": True,
            "secondaryEditorialInferenceForbidden": True,
            "memberNamesDoNotCreateSoloCanonicals": True,
            "autoPromote": False,
            "identityReviewRequired": True,
            "scopeVerificationRequired": True,
        },
        "terminalManagement": {
            "announcedAt": "2021-04-30",
            "effectiveDate": "2021-04-30",
            "lifecycleStatus": "inactive",
            "agencyStatus": "historical",
            "agency": "The Music Works Entertainment",
            "terminalMembers": EXPECTED_MEMBERS,
            "terminalMemberCount": 2,
            "groupActivitiesWrappedUp": True,
            "memberDirectDisbandmentConfirmed": True,
            "songYuVinAgencyContractTerminated": True,
            "kimKookHeonContractEndNotInferred": True,
            "groupDisbandmentConfirmed": True,
            "legalEntityDissolutionAsserted": False,
            "debutDate": "2020-01-07",
            "debutRelease": "Phase One : YOU",
            "fandomName": "Meet You",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "boy-musicworks-terminal-disbandment-catalog":
        raise RuntimeError("B.O.Y fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("B.O.Y fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("agencyGroupActivityWrapUpRequired") is not True:
        raise RuntimeError("B.O.Y fallback group activity wrap-up required")
    if contract.get("memberDirectDisbandmentConfirmationRequired") is not True:
        raise RuntimeError("B.O.Y fallback direct disbandment confirmation required")
    terminal = snapshot.get("terminalManagement") if isinstance(snapshot, dict) else None
    if not isinstance(terminal, dict) or terminal.get("terminalMembers") != EXPECTED_MEMBERS:
        raise RuntimeError("B.O.Y fallback exact terminal roster required")
    if terminal.get("terminalMemberCount") != 2:
        raise RuntimeError("B.O.Y fallback terminal member count mismatch")
    if terminal.get("lifecycleStatus") != "inactive" or terminal.get("agencyStatus") != "historical":
        raise RuntimeError("B.O.Y fallback terminal state mismatch")
    if terminal.get("groupActivitiesWrappedUp") is not True or terminal.get("memberDirectDisbandmentConfirmed") is not True:
        raise RuntimeError("B.O.Y fallback disbandment evidence mismatch")
    if terminal.get("kimKookHeonContractEndNotInferred") is not True:
        raise RuntimeError("B.O.Y fallback member contract non-inference required")
    if terminal.get("legalEntityDissolutionAsserted") is not False:
        raise RuntimeError("B.O.Y fallback legal entity dissolution must remain unasserted")
    if terminal.get("debutDate") != "2020-01-07":
        raise RuntimeError("B.O.Y fallback debut date mismatch")
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
            fetch(DEBUT_PROFILE_URL),
            fetch(APPLE_URL),
            fetch(BUGS_URL),
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
        raise RuntimeError(f"B.O.Y terminal disbandment catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
