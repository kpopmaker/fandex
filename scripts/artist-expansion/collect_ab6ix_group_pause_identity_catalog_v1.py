from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

VERSION = "ab6ix_group_pause_identity_catalog_adapter_v1"
PAUSE_URL = "https://ab6ix.jp/contents/1064085?tag=all"
PROFILE_URL = "https://www.jvcmusic.co.jp/-/Profile/A027034.html"
DEPARTURE_URL = "https://www.soompi.com/article/1405421wpp/breaking-lim-young-min-officially-leaves-ab6ix-following-dui"
DEBUT_URL = "https://music.apple.com/us/album/b-complete/1463405545"
WOONG_URL = "https://www.soompi.com/article/1848723wpp/ab6ixs-jeon-woong-renews-contract-with-brandnew-music"
WOOJIN_URL = "https://www.paramusic.co.kr/subPage/artist/member/?no=15"
DAEHWI_URL = "https://www.soompi.com/article/1860806wpp/lee-dae-hwi-signs-with-wanna-one-bandmate-kim-jae-hwans-agency"
DONGHYUN_URL = "https://www.newsen.com/news_view.php?code=100100&uid=202609100746082410"
EXPECTED_ARTISTS = ["AB6IX"]
EXPECTED_MEMBERS = ["JEON WOONG", "KIM DONG HYUN", "PARK WOO JIN", "LEE DAE HWI"]

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
    profile_html: str,
    departure_html: str,
    debut_html: str,
    woong_html: str,
    woojin_html: str,
    daehwi_html: str,
    donghyun_html: str,
) -> list[dict]:
    pause = text_blob(pause_html)
    profile = text_blob(profile_html)
    departure = text_blob(departure_html)
    debut = text_blob(debut_html)
    woong = text_blob(woong_html)
    woojin = text_blob(woojin_html)
    daehwi = text_blob(daehwi_html)
    donghyun = text_blob(donghyun_html)

    if not contains_any(pause, "BRANDNEW MUSIC", "ブランニューミュージック"):
        return []
    if not contains_any(pause, "5月25日", "May 25", "exclusive contracts"):
        return []
    if not contains_any(pause, "休止期間", "temporary hiatus", "break"):
        return []
    if not contains_any(pause, "6IX TO SEVEN"):
        return []

    profile_member_tokens = [
        ("チョン・ウン", "JEON WOONG", "Jeon Woong"),
        ("キム・ドンヒョン", "KIM DONG HYUN", "Kim Dong Hyun"),
        ("パク・ウジン", "PARK WOO JIN", "Park Woo Jin"),
        ("イ・デフィ", "LEE DAE HWI", "Lee Dae Hwi"),
    ]
    if any(not contains_any(profile, *tokens) for tokens in profile_member_tokens):
        return []
    if not contains_any(profile, "4人組", "four-member", "4-member"):
        return []

    if not contains_any(departure, "Lim Young Min", "임영민"):
        return []
    if not contains_any(departure, "departure from AB6IX", "left AB6IX", "탈퇴"):
        return []
    if not contains_any(departure, "four-member group", "four members", "4인"):
        return []

    if not contains_any(debut, "B:COMPLETE"):
        return []
    if not contains_any(debut, "May 22, 2019", "2019-05-22"):
        return []
    if not contains_any(debut, "BRANDNEW MUSIC"):
        return []

    if not contains_any(woong, "Jeon Woong", "전웅"):
        return []
    if not contains_any(woong, "renewed his contract", "renewed", "재계약"):
        return []
    if not contains_any(woong, "BRANDNEW MUSIC"):
        return []

    if not contains_any(woojin, "PARK WOO JIN", "박우진"):
        return []
    if not contains_any(woojin, "PARA", "파라"):
        return []

    if not contains_any(daehwi, "Lee Dae Hwi", "이대휘"):
        return []
    if not contains_any(daehwi, "Off The Record", "오프더레코드"):
        return []

    if not contains_any(donghyun, "김동현", "Kim Dong Hyun"):
        return []
    if not contains_any(donghyun, "아에르엔터테인먼트", "AER Entertainment"):
        return []

    return [{
        "displayArtist": "AB6IX",
        "aliases": ["에이비식스"],
        "evidence": [
            {"label": "AB6IX official Japan / BRANDNEW MUSIC temporary group-hiatus notice", "url": PAUSE_URL},
            {"label": "Victor Entertainment current four-member AB6IX profile", "url": PROFILE_URL},
            {"label": "BRANDNEW MUSIC LIM YOUNG MIN departure statement", "url": DEPARTURE_URL},
            {"label": "Apple Music B:COMPLETE debut catalog", "url": DEBUT_URL},
            {"label": "BRANDNEW MUSIC JEON WOONG individual renewal", "url": WOONG_URL},
            {"label": "PARA MUSIC PARK WOO JIN profile", "url": WOOJIN_URL},
            {"label": "Off The Record LEE DAE HWI signing", "url": DAEHWI_URL},
            {"label": "AER Entertainment KIM DONG HYUN signing", "url": DONGHYUN_URL},
        ],
    }]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {
            "id": "ab6ix-group-pause-identity-catalog",
            "type": "provider_catalog",
            "name": "AB6IX Group Pause Identity Catalog",
            "observedAt": observed_at,
            "url": PAUSE_URL,
        },
        "candidateCount": len(rows),
        "candidates": rows,
        "contract": {
            "explicitTemporaryGroupHiatusEvidenceRequired": True,
            "groupContractEndDoesNotEqualGroupTermination": True,
            "groupActivityPauseDoesNotEqualDisbandment": True,
            "pausedGroupRetainsActiveLifecycle": True,
            "exactCurrentMemberRosterRequired": True,
            "explicitFormerMemberDepartureEvidenceRequired": True,
            "individualAgencyContractsDoNotResolveGroupAgency": True,
            "individualAgencyChangesDoNotChangeCanonicalMembership": True,
            "blankAgencyRequiredWhenGroupAgencyUnresolved": True,
            "currentOfficialProfileRequired": True,
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
            "groupAgency": "",
            "groupAgencyStatus": "unresolved",
            "members": EXPECTED_MEMBERS,
            "currentMemberCount": 4,
            "priorExitedMembers": [
                {"member": "LIM YOUNG MIN", "effectiveDate": "2020-06-08", "resolution": "explicit_team_departure"},
            ],
            "groupPauseEffectiveDate": "2026-05-24",
            "groupContractEndDate": "2026-05-25",
            "groupPauseResolution": "temporary_group_hiatus_after_6ix_to_seven_without_group_termination",
            "individualAgencyState": [
                {"member": "JEON WOONG", "agency": "BRANDNEW MUSIC", "status": "verified_individual"},
                {"member": "PARK WOO JIN", "agency": "PARA MUSIC", "status": "verified_individual"},
                {"member": "LEE DAE HWI", "agency": "Off The Record Entertainment", "status": "verified_individual"},
                {"member": "KIM DONG HYUN", "agency": "AER Entertainment", "status": "verified_individual"},
            ],
            "debutDate": "2019-05-22",
            "debutRelease": "B:COMPLETE",
            "fandomName": "ABNEW",
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "ab6ix-group-pause-identity-catalog":
        raise RuntimeError("AB6IX fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("AB6IX fallback exact candidate catalog required")
    contract = snapshot.get("contract") if isinstance(snapshot, dict) else None
    if not isinstance(contract, dict) or contract.get("explicitTemporaryGroupHiatusEvidenceRequired") is not True:
        raise RuntimeError("AB6IX fallback temporary-hiatus contract required")
    if contract.get("individualAgencyContractsDoNotResolveGroupAgency") is not True:
        raise RuntimeError("AB6IX fallback group-agency contract required")
    identity = snapshot.get("currentIdentity") if isinstance(snapshot, dict) else None
    if not isinstance(identity, dict) or identity.get("members") != EXPECTED_MEMBERS:
        raise RuntimeError("AB6IX fallback exact four-member roster required")
    if identity.get("currentMemberCount") != 4:
        raise RuntimeError("AB6IX fallback current member count mismatch")
    if identity.get("lifecycleStatus") != "active" or identity.get("groupActivityPaused") is not True:
        raise RuntimeError("AB6IX fallback paused-active lifecycle mismatch")
    if identity.get("groupAgency") != "" or identity.get("groupAgencyStatus") != "unresolved":
        raise RuntimeError("AB6IX fallback group agency unresolved mismatch")
    if identity.get("groupDisbanded") is not False:
        raise RuntimeError("AB6IX fallback non-termination state required")
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
            fetch(PROFILE_URL),
            fetch(DEPARTURE_URL),
            fetch(DEBUT_URL),
            fetch(WOONG_URL),
            fetch(WOOJIN_URL),
            fetch(DAEHWI_URL),
            fetch(DONGHYUN_URL),
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
        raise RuntimeError(f"AB6IX group pause identity catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")

    Path(args.output).write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

if __name__ == "__main__":
    main()
