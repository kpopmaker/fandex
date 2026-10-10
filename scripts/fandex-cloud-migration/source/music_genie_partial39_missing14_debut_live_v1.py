from __future__ import annotations

import concurrent.futures
import json
import re
import time
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[3]
QUEUE_PATH = ROOT / "data/fandex-cloud-v10/seed/music_genie_partial39_evidence_triage_v1.json"
OUTPUT = Path("music_genie_partial39_missing14_debut_live_v1.json")
PROVIDER_YEAR_MISSING = (
    "nexz", "boystory", "afterschool", "pow", "tiot", "mirae", "x1",
)
BOTH_YEARS_MISSING = (
    "brothersu", "mino", "girlset", "ejel", "up10tion", "kard", "chen",
)
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8",
}
TRANSIENT = {429, 500, 502, 503, 504}
# Native Genie artist-detail URLs identified independently; none is an approved binding.
ALTERNATE_PROFILES = {
    "nexz": {"id": "82295319", "display": "NEXZ (넥스지)", "type": "남성/그룹", "year": 2023},
    "afterschool": {"id": "73393086", "display": "애프터스쿨 (After School)", "type": "여성/그룹", "year": 2009},
    "pow": {"id": "82162931", "display": "POW (파우)", "type": "남성/그룹", "year": 2023},
    "ejel": {"id": "81021446", "display": "이젤 (EJel)", "type": "여성/솔로", "year": 2021},
}


def fetch(url: str) -> dict:
    error = None
    for attempt in range(1, 4):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=20)
            if resp.status_code in TRANSIENT and attempt < 3:
                time.sleep(attempt)
                continue
            return {"statusCode": resp.status_code, "html": resp.text, "error": None}
        except requests.RequestException as exc:
            error = f"{type(exc).__name__}:{str(exc)[:250]}"
            if attempt < 3:
                time.sleep(attempt)
    return {"statusCode": None, "html": "", "error": error}


def detail_field(soup: BeautifulSoup, label: str) -> str | None:
    icon = soup.find("img", attrs={"alt": label})
    if icon:
        li = icon.find_parent("li")
        if li:
            value = " ".join(li.stripped_strings).strip()
            if value:
                return value
    return None


def check(row: dict) -> dict:
    cid, pid = row["canonicalArtistId"], row["genieProviderArtistId"]
    url = f"https://www.genie.co.kr/detail/artistInfo?xxnm={pid}"
    response = fetch(url)
    soup = BeautifulSoup(response["html"], "html.parser")
    node = soup.select_one(".info-zone h2.name") or soup.select_one("h2.name")
    display = " ".join(node.stripped_strings).strip() if node else ""
    year_raw = detail_field(soup, "데뷔")
    activity_raw = detail_field(soup, "활동유형")
    match = re.search(r"(?:19|20)\d{2}", year_raw or "")
    current_year = int(match.group()) if match else None
    if response["statusCode"] != 200 or not display:
        observed = "provider_detail_unavailable"
    elif current_year is None:
        observed = "still_missing_on_provider_detail"
    elif row["canonicalDebutYear"] is None:
        observed = "provider_year_visible_canonical_year_still_missing"
    elif row["canonicalDebutYear"] == current_year:
        observed = "provider_year_visible_matches_existing_canonical_year"
    else:
        observed = "provider_year_visible_conflicts_with_canonical_year"
    return {
        "canonicalArtistId": cid,
        "originalProviderArtistId": pid,
        "originalEvidenceGap": row["evidenceGap"],
        "originalCanonicalDebutYear": row["canonicalDebutYear"],
        "originalGenieDebutYear": row["genieDebutYear"],
        "providerDetailUrl": url,
        "providerStatusCode": response["statusCode"],
        "providerError": response["error"],
        "currentProviderDisplay": display,
        "currentProviderActivityTypeRaw": activity_raw,
        "currentProviderDebutFieldRaw": year_raw,
        "currentProviderDebutYear": current_year,
        "observation": observed,
        "originalEvidenceRowMutated": False,
        "newProviderBindingApproved": False,
        "canonicalYearBackfillAuthorized": False,
        "sourceSupportedPromotionAuthorized": False,
    }


def main() -> None:
    queue = json.loads(QUEUE_PATH.read_text(encoding="utf-8-sig"))
    rows_by_id = {row["canonicalArtistId"]: row for row in queue["candidates"]}
    groups = (
        ("genie_debut_year_unavailable", PROVIDER_YEAR_MISSING),
        ("both_debut_years_unavailable", BOTH_YEARS_MISSING),
    )
    assert len(PROVIDER_YEAR_MISSING) == 7
    assert len(BOTH_YEARS_MISSING) == 7
    assert set(PROVIDER_YEAR_MISSING).isdisjoint(BOTH_YEARS_MISSING)
    for category, ids in groups:
        for cid in ids:
            row = rows_by_id[cid]
            assert row["evidenceGap"] == category
            assert row["genieDebutYear"] is None
            assert row["reviewStatus"] == "unresolved_additional_year_evidence_required"
            assert row["detailDisplayAliasMatch"] is True
            assert row["detailEntityTypeMatch"] is True
            if category == "genie_debut_year_unavailable":
                assert row["canonicalDebutYear"] is not None
            else:
                assert row["canonicalDebutYear"] is None

    ordered_ids = PROVIDER_YEAR_MISSING + BOTH_YEARS_MISSING
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(check, rows_by_id[cid]): cid for cid in ordered_ids}
        data = {}
        for future in concurrent.futures.as_completed(futures):
            cid = futures[future]
            try:
                data[cid] = future.result()
            except Exception as exc:
                row = rows_by_id[cid]
                data[cid] = {
                    "canonicalArtistId": cid,
                    "originalProviderArtistId": row["genieProviderArtistId"],
                    "originalEvidenceGap": row["evidenceGap"],
                    "originalCanonicalDebutYear": row["canonicalDebutYear"],
                    "originalGenieDebutYear": None,
                    "observation": "provider_request_or_parser_error",
                    "providerError": f"{type(exc).__name__}:{str(exc)[:300]}",
                    "newProviderBindingApproved": False,
                    "sourceSupportedPromotionAuthorized": False,
                }
    records = [data[cid] for cid in ordered_ids]
    counts = dict(Counter(r["observation"] for r in records))
    eligible = [
        r["canonicalArtistId"] for r in records
        if r["observation"] == "provider_year_visible_matches_existing_canonical_year"
    ]
    # Separate profile links can contradict the original exact-alias search winner.
    # These are independent review alternatives, not provider ID replacements.
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        alt_futures = {
            pool.submit(check, {
                "canonicalArtistId": cid,
                "genieProviderArtistId": candidate["id"],
                "evidenceGap": rows_by_id[cid]["evidenceGap"],
                "canonicalDebutYear": rows_by_id[cid]["canonicalDebutYear"],
                "genieDebutYear": None,
            }): cid
            for cid, candidate in ALTERNATE_PROFILES.items()
        }
        alternates = {}
        for future in concurrent.futures.as_completed(alt_futures):
            cid = alt_futures[future]
            alternates[cid] = future.result()
    alternative_rows = []
    for cid, target in ALTERNATE_PROFILES.items():
        row = alternates[cid]
        normalized = lambda value: re.sub(r"[^0-9a-z가-힣]+", "", (value or "").lower())
        match = (
            row["providerStatusCode"] == 200
            and normalized(row["currentProviderDisplay"]) == normalized(target["display"])
            and row["currentProviderActivityTypeRaw"] == target["type"]
            and row["currentProviderDebutYear"] == target["year"]
        )
        alternative_rows.append({
            "canonicalArtistId": cid,
            "originalProviderArtistId": rows_by_id[cid]["genieProviderArtistId"],
            "alternateProfileArtistId": target["id"],
            "expectedAlternateDisplay": target["display"],
            "expectedAlternateType": target["type"],
            "expectedAlternateYear": target["year"],
            "providerDetail": row,
            "liveProfileMetadataMatches": match,
            "newProviderArtistIdNotApproved": True,
            "providerDebutYearIsNotAutomaticallyFormalGroupDebut": cid == "nexz",
            "humanIdentityAndEraReviewRequired": True,
        })
    payload = {
        "version": "music_genie_partial39_missing14_debut_live_v1",
        "checkedAtUtc": datetime.now(timezone.utc).isoformat(),
        "source": "music_chart", "provider": "genie",
        "originalEvidenceSource": "music_genie_partial39_evidence_triage_v1",
        "expectedGenieYearMissing": 7, "expectedBothYearsMissing": 7,
        "checkedCount": len(records),
        "observationCounts": counts,
        "yearMatchingProviderVisibilityCandidates": eligible,
        "records": records,
        "alternateProfileEvidence": alternative_rows,
        "alternateProfilesValidatedCount": sum(x["liveProfileMetadataMatches"] for x in alternative_rows),
        "humanIdentityAndYearScopeReviewRequired": True,
        "originalExact94SnapshotMustStayImmutable": True,
        "currentSourcePartition": {"supported": 117, "unresolved": 238, "unsupported": 0},
        "newProviderBindingApproved": False,
        "canonicalDebutYearBackfilled": False,
        "musicSupportedPromoted": False,
        "productChanged": False,
        "nextGate": "GENIE_MISSING14_CURRENT_PROVIDER_DEBUT_FIELD_SEMANTICS_REVIEW",
    }
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("MISSING14_RESULT " + json.dumps({
        "counts": counts, "recoverableYearMatches": eligible,
        "rows": [{
            "canonicalArtistId": r["canonicalArtistId"],
            "providerArtistId": r["originalProviderArtistId"],
            "originalYear": r["originalGenieDebutYear"],
            "currentYear": r.get("currentProviderDebutYear"),
            "canonicalYear": r["originalCanonicalDebutYear"],
            "observation": r["observation"],
        } for r in records],
    }, ensure_ascii=False))
    print("MISSING14_ALTERNATE_PROFILES " + json.dumps({
        "rows": [{
            "id": x["canonicalArtistId"],
            "old": x["originalProviderArtistId"],
            "alt": x["alternateProfileArtistId"],
            "display": x["providerDetail"]["currentProviderDisplay"],
            "activity": x["providerDetail"]["currentProviderActivityTypeRaw"],
            "year": x["providerDetail"]["currentProviderDebutYear"],
            "matched": x["liveProfileMetadataMatches"],
        } for x in alternative_rows],
    }, ensure_ascii=False))
    assert len(alternative_rows) == 4
    assert all(x["liveProfileMetadataMatches"] for x in alternative_rows), "alternate_profile_metadata_mismatch"
    assert all(x["newProviderArtistIdNotApproved"] for x in alternative_rows)
    assert payload["checkedCount"] == 14
    assert len(eligible) <= 7
    assert all(r["newProviderBindingApproved"] is False for r in records)
    assert all(r["sourceSupportedPromotionAuthorized"] is False for r in records)
    assert all(r.get("providerStatusCode") == 200 for r in records), "provider_http_failed_reported_in_artifact"
    print("PASS: Genie partial39 historical missing14 provider field read-only investigation | 14 | Music 117/238/0")


if __name__ == "__main__":
    main()
