from __future__ import annotations

import concurrent.futures
import json
import re
import time
from collections import Counter
from datetime import datetime
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[3]
DISCOVERY = Path("music_genie_full264_identity_discovery_v1.json")
METADATA = ROOT / "music_genie_canonical_identity_metadata_v1.json"
OUTPUT = Path("music_genie_exact94_detail_verification_v1.json")

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
TRANSIENT = {429, 500, 502, 503, 504}


def compact(value: str) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", (value or "").strip().lower())


def extract_label_value(soup: BeautifulSoup, label: str) -> str | None:
    img = soup.find("img", attrs={"alt": label})
    if img is not None:
        li = img.find_parent("li")
        if li is not None:
            text = " ".join(li.stripped_strings).strip()
            if text:
                return text

    for node in soup.find_all(string=lambda s: isinstance(s, str) and label in s):
        parent = node.parent
        if parent is None:
            continue
        li = parent.find_parent("li") or parent
        text = " ".join(li.stripped_strings).strip()
        text = text.replace(label, "", 1).strip()
        if text:
            return text

    return None


def extract_detail(provider_id: str, aliases: list[str]) -> dict:
    url = f"https://www.genie.co.kr/detail/artistInfo?xxnm={provider_id}"
    error = None

    for attempt in range(1, 4):
        try:
            r = requests.get(
                url,
                headers={
                    "User-Agent": UA,
                    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                },
                timeout=20,
            )
            if r.status_code in TRANSIENT and attempt < 3:
                time.sleep(attempt)
                continue

            soup = BeautifulSoup(r.text, "html.parser")
            name_node = soup.select_one(".info-zone h2.name") or soup.select_one("h2.name")
            provider_display = (
                " ".join(name_node.stripped_strings).strip()
                if name_node is not None
                else ""
            )
            if not provider_display:
                og = soup.find("meta", attrs={"property": "og:title"})
                provider_display = str(og.get("content") or "").strip() if og else ""

            activity_type = extract_label_value(soup, "활동유형")
            debut = extract_label_value(soup, "데뷔")
            country = extract_label_value(soup, "국적")
            debut_match = re.search(r"(19|20)\d{2}", debut or "")
            provider_debut_year = int(debut_match.group(0)) if debut_match else None

            alias_keys = {compact(x) for x in aliases if compact(x)}
            display_key = compact(provider_display)
            display_alias_match = any(
                key == display_key or key in display_key or display_key in key
                for key in alias_keys
                if key
            )

            return {
                "statusCode": r.status_code,
                "responseLength": len(r.text),
                "providerArtistId": provider_id,
                "providerUrl": url,
                "providerDisplay": provider_display,
                "providerDisplayNormalized": display_key,
                "displayAliasMatch": display_alias_match,
                "activityType": activity_type,
                "debut": debut,
                "providerDebutYear": provider_debut_year,
                "country": country,
                "error": None,
            }
        except Exception as exc:
            error = f"{type(exc).__name__}:{exc}"
            if attempt < 3:
                time.sleep(attempt)

    return {
        "statusCode": None,
        "responseLength": 0,
        "providerArtistId": provider_id,
        "providerUrl": url,
        "providerDisplay": "",
        "providerDisplayNormalized": "",
        "displayAliasMatch": False,
        "activityType": None,
        "debut": None,
        "providerDebutYear": None,
        "country": None,
        "error": error,
    }


def classify(canonical: dict, detail: dict) -> dict:
    entity_type = canonical["entityType"]
    activity = detail.get("activityType") or ""

    if entity_type == "group":
        entity_match = "그룹" in activity
    elif entity_type == "solo":
        entity_match = "솔로" in activity
    else:
        entity_match = False

    canonical_debut_year = canonical.get("debutYear")
    provider_debut_year = detail.get("providerDebutYear")

    if canonical_debut_year is not None and provider_debut_year is not None:
        debut_match = canonical_debut_year == provider_debut_year
        debut_status = "match" if debut_match else "mismatch"
    else:
        debut_match = None
        debut_status = "unavailable"

    if detail.get("statusCode") != 200 or detail.get("error"):
        disposition = "detail_fetch_failed"
    elif not detail.get("displayAliasMatch"):
        disposition = "detail_display_mismatch"
    elif not entity_match:
        disposition = "entity_type_mismatch_or_unparsed"
    elif debut_match is False:
        disposition = "debut_year_mismatch"
    elif debut_match is True:
        disposition = "strong_metadata_consistent_candidate"
    else:
        disposition = "metadata_partial_candidate"

    return {
        "canonicalArtistId": canonical["canonicalArtistId"],
        "canonicalName": canonical["canonicalName"],
        "canonicalEntityType": entity_type,
        "canonicalAgency": canonical["agency"],
        "canonicalDebutYear": canonical_debut_year,
        "canonicalMembers": canonical["members"],
        "providerArtistId": detail["providerArtistId"],
        "providerUrl": detail["providerUrl"],
        "providerDisplay": detail["providerDisplay"],
        "displayAliasMatch": detail["displayAliasMatch"],
        "providerActivityType": detail["activityType"],
        "entityTypeMatch": entity_match,
        "providerDebutYear": provider_debut_year,
        "debutYearStatus": debut_status,
        "providerCountry": detail["country"],
        "statusCode": detail["statusCode"],
        "error": detail["error"],
        "disposition": disposition,
    }


def main():
    discovery = json.loads(DISCOVERY.read_text(encoding="utf-8"))
    metadata = json.loads(METADATA.read_text(encoding="utf-8-sig"))
    meta_by_id = {row["canonicalArtistId"]: row for row in metadata["artists"]}

    exact_ids = discovery["uniqueExactCandidateCanonicalArtistIds"]
    if len(exact_ids) != 94:
        raise RuntimeError(f"unexpected_exact_count:{len(exact_ids)}")

    discovery_by_id = {row["canonicalArtistId"]: row for row in discovery["results"]}
    targets = []

    for cid in exact_ids:
        row = discovery_by_id[cid]
        provider_ids = row["exactProviderArtistIds"]
        if len(provider_ids) != 1:
            raise RuntimeError(f"not_unique_exact:{cid}:{provider_ids}")
        canonical = meta_by_id[cid]
        aliases = [
            canonical["canonicalName"],
            *(canonical.get("aliases") or []),
            *(canonical.get("koreanAliases") or []),
            *(canonical.get("englishAliases") or []),
        ]
        targets.append((canonical, provider_ids[0], aliases))

    details = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        future_map = {
            pool.submit(extract_detail, provider_id, aliases): canonical["canonicalArtistId"]
            for canonical, provider_id, aliases in targets
        }
        for future in concurrent.futures.as_completed(future_map):
            details[future_map[future]] = future.result()

    results = []
    for canonical, provider_id, aliases in targets:
        results.append(classify(canonical, details[canonical["canonicalArtistId"]]))

    counts = Counter(r["disposition"] for r in results)

    def ids_for(disposition: str) -> list[str]:
        return [r["canonicalArtistId"] for r in results if r["disposition"] == disposition]

    payload = {
        "version": "music_genie_exact94_detail_verification_v1",
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "status": "exact94_provider_detail_metadata_review_non_activating",
        "sourceDiscoveryVersion": discovery["version"],
        "provider": "genie",
        "targetCount": 94,
        "dispositionCounts": dict(sorted(counts.items())),
        "strongMetadataConsistentCanonicalArtistIds": ids_for("strong_metadata_consistent_candidate"),
        "metadataPartialCanonicalArtistIds": ids_for("metadata_partial_candidate"),
        "debutYearMismatchCanonicalArtistIds": ids_for("debut_year_mismatch"),
        "entityTypeMismatchOrUnparsedCanonicalArtistIds": ids_for("entity_type_mismatch_or_unparsed"),
        "detailDisplayMismatchCanonicalArtistIds": ids_for("detail_display_mismatch"),
        "detailFetchFailedCanonicalArtistIds": ids_for("detail_fetch_failed"),
        "results": results,
        "reviewSemantics": {
            "strongMetadataConsistentCandidateIsReviewedBinding": False,
            "stableProviderArtistIdRequired": True,
            "providerDetailDisplayAliasMatchRequired": True,
            "entityTypeMatchRequiredForStrongCandidate": True,
            "debutYearMatchRequiredForStrongCandidate": True,
            "metadataPartialAutoPromotesSupport": False,
            "metadataConflictAutoPromotesSupport": False,
            "displayNameOnlyBindingAllowed": False,
        },
        "safety": {
            "compatibilityRegistryModified": False,
            "activeTargetSeedModified": False,
            "productCohortModified": False,
            "productRuntimeModified": False,
            "schedulerModified": False,
            "databaseModified": False,
            "deploymentAuthorized": False,
            "mainMergeAuthorized": False,
        },
    }

    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        "PASS: Genie exact94 detail verification | "
        f"strong={counts.get('strong_metadata_consistent_candidate',0)} | "
        f"partial={counts.get('metadata_partial_candidate',0)} | "
        f"debutMismatch={counts.get('debut_year_mismatch',0)} | "
        f"entityMismatch={counts.get('entity_type_mismatch_or_unparsed',0)} | "
        f"displayMismatch={counts.get('detail_display_mismatch',0)} | "
        f"fetchFailed={counts.get('detail_fetch_failed',0)}"
    )
    print(
        "strongMetadataConsistentCanonicalArtistIds="
        + json.dumps(payload["strongMetadataConsistentCanonicalArtistIds"], ensure_ascii=False)
    )
    print(
        "debutYearMismatchCanonicalArtistIds="
        + json.dumps(payload["debutYearMismatchCanonicalArtistIds"], ensure_ascii=False)
    )
    print(
        "entityTypeMismatchOrUnparsedCanonicalArtistIds="
        + json.dumps(payload["entityTypeMismatchOrUnparsedCanonicalArtistIds"], ensure_ascii=False)
    )


if __name__ == "__main__":
    main()
