from __future__ import annotations
import argparse, json, re
from datetime import datetime, timezone
from pathlib import Path
import requests
from bs4 import BeautifulSoup

VERSION = "btob_company_current_managed_music_identity_catalog_v1"
COMPANY_URL = "https://btobcompany.kr/company"
BTOB_DISCO_URL = "https://btobcompany.kr/btob-discography"
NOTICE_URL = "https://btobcompany.kr/notice"
BEHIND_URL = "https://btobcompany.kr/btob-behind"
PENIEL_MV_URL = "https://btobcompany.kr/peniel-musicvideo"
EXPECTED_ARTISTS = ["BTOB", "SEO EUNKWANG", "LEE MINHYUK (HUTA)", "IM HYUNSIK", "PENIEL"]
MANAGED_KOREAN_NAMES = ["서은광", "이민혁", "임현식", "프니엘"]

def normalize_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", str(value or "")).strip()

def fetch(url: str) -> str:
    response = requests.get(url, timeout=30, headers={"User-Agent": "Mozilla/5.0 (compatible; FANDEX validation research)"})
    response.raise_for_status()
    return response.text

def text_blob(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    return normalize_spaces(" ".join(soup.stripped_strings) + " " + html)

def has(text: str, token: str) -> bool:
    return token.casefold() in text.casefold()

def has_any(text: str, tokens: list[str]) -> bool:
    return any(has(text, token) for token in tokens)

def parse_live_pages(company_html: str, discography_html: str, notice_html: str, behind_html: str, peniel_mv_html: str) -> list[dict]:
    company, discography, notice, behind, peniel_mv = map(text_blob, [company_html, discography_html, notice_html, behind_html, peniel_mv_html])
    if not has(company, "BTOB COMPANY") or not all(has(company, token) for token in MANAGED_KOREAN_NAMES):
        return []
    if not has_any(company, ["개인 활동", "individual activities"]):
        return []
    if not has_any(company, ["BTOB group activities", "비투비"]):
        return []
    if not all(has(discography, token) for token in ["우리 다시", "2026. 03. 21"]):
        return []
    if not has_any(notice, ["서은광 (SEO EUNKWANG)", "SEO EUNKWANG"]):
        return []
    if not has_any(notice, ["OUR YOUTH", "REC : Feel Alive", "𝑅𝐸𝐶 : 𝐹𝑒𝑒𝑙 𝐴𝑙𝑖𝑣𝑒"]):
        return []
    if not has_any(notice, ["이민혁 (HUTA)", "LEE MINHYUK (HUTA)"]) or not has(notice, "TEMPERATURE"):
        return []
    if not has(behind, "임현식") or not has(behind, "2026 FIRST MUSIC STATION"):
        return []
    if not has_any(peniel_mv, ["프니엘 (PENIEL)", "PENIEL"]) or not has(peniel_mv, "IDKI"):
        return []
    return [
        {"displayArtist":"BTOB","aliases":["비투비"],"evidence":[{"label":"BTOB Company official company page","url":COMPANY_URL},{"label":"BTOB Company official 2026 group discography","url":BTOB_DISCO_URL}]},
        {"displayArtist":"SEO EUNKWANG","aliases":["서은광","Seo Eunkwang","Eunkwang"],"evidence":[{"label":"BTOB Company current managed-member statement","url":COMPANY_URL},{"label":"BTOB Company 2026 Seo Eunkwang notices","url":NOTICE_URL}]},
        {"displayArtist":"LEE MINHYUK (HUTA)","aliases":["이민혁","HUTA","Lee Minhyuk","Lee Min-hyuk"],"evidence":[{"label":"BTOB Company current managed-member statement","url":COMPANY_URL},{"label":"BTOB Company 2026 HUTA TEMPERATURE notices","url":NOTICE_URL}]},
        {"displayArtist":"IM HYUNSIK","aliases":["임현식","Im Hyunsik","Lim Hyunsik"],"evidence":[{"label":"BTOB Company current managed-member statement","url":COMPANY_URL},{"label":"BTOB Company 2026 Im Hyunsik activity","url":BEHIND_URL}]},
        {"displayArtist":"PENIEL","aliases":["프니엘"],"evidence":[{"label":"BTOB Company current managed-member statement","url":COMPANY_URL},{"label":"BTOB Company official Peniel IDKI music-video catalog","url":PENIEL_MV_URL}]},
    ]

def build_snapshot(rows: list[dict], observed_at: str) -> dict:
    return {
        "version": VERSION,
        "source": {"id":"btob-company-official-current-managed-music-identities","type":"agency_roster","name":"BTOB Company Official Current Managed Music Identities","observedAt":observed_at,"url":COMPANY_URL},
        "candidateCount": len(rows),
        "candidates": rows,
        "managedSoloSet": ["SEO EUNKWANG","LEE MINHYUK (HUTA)","IM HYUNSIK","PENIEL"],
        "currentManagedIdentities": {
            "BTOB":{"agency":"BTOB Company","agencyStatus":"verified","lifecycleStatus":"active","entityType":"group"},
            "SEO EUNKWANG":{"agency":"BTOB Company","agencyStatus":"verified","lifecycleStatus":"active","entityType":"solo"},
            "LEE MINHYUK (HUTA)":{"agency":"BTOB Company","agencyStatus":"verified","lifecycleStatus":"active","entityType":"solo"},
            "IM HYUNSIK":{"agency":"BTOB Company","agencyStatus":"verified","lifecycleStatus":"active","entityType":"solo"},
            "PENIEL":{"agency":"BTOB Company","agencyStatus":"verified","lifecycleStatus":"active","entityType":"solo"},
        },
        "contract": {
            "officialFirstPartySourceOnly":True,
            "currentCompanyManagedSoloSetRequired":True,
            "dedicatedSoloMusicEvidenceRequired":True,
            "current2026GroupActivityRequired":True,
            "current2026IndividualActivityEvidenceRequired":True,
            "managedSoloSetDoesNotDefineFullBtobGroupRoster":True,
            "externalMemberAgencyDoesNotEndBtobMembership":True,
            "memberIdentityDoesNotCollapseGroupIdentity":True,
            "groupMembershipAloneDoesNotCreateSoloCanonical":True,
            "existingCanonicalMustSuppressDuplicateDiscovery":True,
            "noBtobMemberRosterMutationFromCompanyManagedSet":True,
            "autoPromote":False,
            "identityReviewRequired":True,
            "scopeVerificationRequired":True,
        },
    }

def load_verified_fallback(path: Path) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8-sig"))
    source = snapshot.get("source") if isinstance(snapshot, dict) else None
    if not isinstance(source, dict) or source.get("id") != "btob-company-official-current-managed-music-identities" or source.get("type") != "agency_roster":
        raise RuntimeError("BTOB Company fallback source mismatch")
    candidates = snapshot.get("candidates")
    names = [row.get("displayArtist") for row in candidates if isinstance(row, dict)] if isinstance(candidates, list) else []
    if names != EXPECTED_ARTISTS:
        raise RuntimeError("BTOB Company fallback exact identity set required")
    if snapshot.get("managedSoloSet") != ["SEO EUNKWANG","LEE MINHYUK (HUTA)","IM HYUNSIK","PENIEL"]:
        raise RuntimeError("BTOB Company fallback managed solo set mismatch")
    current = snapshot.get("currentManagedIdentities")
    if not isinstance(current, dict):
        raise RuntimeError("BTOB Company fallback current identity map required")
    for artist in EXPECTED_ARTISTS:
        entry = current.get(artist, {})
        if entry.get("agency") != "BTOB Company" or entry.get("lifecycleStatus") != "active":
            raise RuntimeError(f"BTOB Company fallback current identity mismatch for {artist}")
    snapshot["collectionStatus"] = "verified_official_snapshot_fallback"
    snapshot["liveFetchParsed"] = False
    return snapshot

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--fallback-snapshot")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    try:
        rows = parse_live_pages(fetch(COMPANY_URL), fetch(BTOB_DISCO_URL), fetch(NOTICE_URL), fetch(BEHIND_URL), fetch(PENIEL_MV_URL))
    except requests.RequestException:
        rows = []
    if [row.get("displayArtist") for row in rows] == EXPECTED_ARTISTS:
        snapshot = build_snapshot(rows, datetime.now(timezone.utc).isoformat())
        snapshot["collectionStatus"] = "live_parse"
        snapshot["liveFetchParsed"] = True
    elif args.fallback_snapshot:
        snapshot = load_verified_fallback(Path(args.fallback_snapshot))
    else:
        raise RuntimeError(f"BTOB Company identity catalog expected {EXPECTED_ARTISTS}, got {len(rows)} candidates")
    Path(args.output).write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

if __name__ == "__main__":
    main()
