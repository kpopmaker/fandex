from __future__ import annotations

import concurrent.futures
import json
import re
import time
from collections import Counter
from datetime import datetime
from pathlib import Path
from urllib.parse import quote_plus

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[3]
TARGETS = ROOT / "music_chart_artist_targets_355_candidate_v1.json"
COMPAT = ROOT / "data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"
OUTPUT = Path("music_genie_full264_identity_discovery_v1.json")

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)
TRANSIENT = {429, 500, 502, 503, 504}


def compact(value: str) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", (value or "").strip().lower())


def alias_keys(row: dict) -> set[str]:
    values = [row.get("artist", ""), *(row.get("aliases") or [])]
    return {compact(str(v)) for v in values if compact(str(v))}


def search_url(query: str) -> str:
    return "https://www.genie.co.kr/search/searchMain?query=" + quote_plus(query)


def extract_artist_candidates(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    onclick_pattern = re.compile(r"fnViewArtist\(['\"](\d+)['\"]\)", re.I)
    href_pattern = re.compile(r"artistInfo\?xxnm=(\d+)", re.I)

    by_key = {}
    for a in soup.find_all("a"):
        href = str(a.get("href") or "")
        onclick = str(a.get("onclick") or "")
        m = onclick_pattern.search(onclick) or href_pattern.search(href)
        if not m:
            continue

        provider_id = m.group(1)
        name = " ".join(a.stripped_strings).strip()
        if not name:
            img = a.find("img")
            name = str(img.get("alt") or "").strip() if img else ""
        if not name:
            continue

        key = (provider_id, compact(name))
        current = by_key.get(key)
        candidate = {
            "providerArtistId": provider_id,
            "providerDisplay": name,
            "providerDisplayNormalized": compact(name),
            "href": f"https://www.genie.co.kr/detail/artistInfo?xxnm={provider_id}",
        }
        if current is None or len(name) < len(current["providerDisplay"]):
            by_key[key] = candidate

    return list(by_key.values())


def fetch_search(row: dict) -> dict:
    cid = row["canonicalArtistId"]
    query = str(row["artist"]).strip()
    url = search_url(query)
    last_error = None

    for attempt in range(1, 4):
        try:
            response = requests.get(
                url,
                headers={
                    "User-Agent": USER_AGENT,
                    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
                },
                timeout=20,
            )
            if response.status_code in TRANSIENT and attempt < 3:
                time.sleep(attempt)
                continue

            candidates = extract_artist_candidates(response.text)
            keys = alias_keys(row)

            exact = [
                c for c in candidates
                if c["providerDisplayNormalized"] in keys
            ]
            wrapper = [
                c for c in candidates
                if c not in exact
                and any(
                    key and (
                        key in c["providerDisplayNormalized"]
                        or c["providerDisplayNormalized"] in key
                    )
                    for key in keys
                )
            ]

            exact_ids = sorted({c["providerArtistId"] for c in exact})
            wrapper_ids = sorted({c["providerArtistId"] for c in wrapper})

            if len(exact_ids) == 1:
                disposition = "unique_exact_candidate"
            elif len(exact_ids) > 1:
                disposition = "ambiguous_exact_candidates"
            elif len(wrapper_ids) == 1:
                disposition = "unique_wrapper_candidate_review_required"
            elif len(wrapper_ids) > 1:
                disposition = "ambiguous_wrapper_candidates"
            elif candidates:
                disposition = "provider_candidates_without_alias_match"
            else:
                disposition = "no_provider_candidate"

            return {
                "canonicalArtistId": cid,
                "query": query,
                "url": url,
                "statusCode": response.status_code,
                "responseLength": len(response.text),
                "candidateCount": len(candidates),
                "exactAliasCandidateCount": len(exact),
                "exactProviderArtistIds": exact_ids,
                "exactAliasCandidates": exact,
                "wrapperAliasCandidateCount": len(wrapper),
                "wrapperProviderArtistIds": wrapper_ids,
                "wrapperAliasCandidates": wrapper,
                "disposition": disposition,
                "error": None,
            }
        except Exception as exc:
            last_error = f"{type(exc).__name__}:{exc}"
            if attempt < 3:
                time.sleep(attempt)

    return {
        "canonicalArtistId": cid,
        "query": query,
        "url": url,
        "statusCode": None,
        "responseLength": 0,
        "candidateCount": 0,
        "exactAliasCandidateCount": 0,
        "exactProviderArtistIds": [],
        "exactAliasCandidates": [],
        "wrapperAliasCandidateCount": 0,
        "wrapperProviderArtistIds": [],
        "wrapperAliasCandidates": [],
        "disposition": "request_failed",
        "error": last_error,
    }


def main():
    targets = json.loads(TARGETS.read_text(encoding="utf-8-sig"))
    compat = json.loads(COMPAT.read_text(encoding="utf-8-sig"))

    rows_by_id = {row["canonicalArtistId"]: row for row in targets["artists"]}
    music = compat["sources"]["music_chart"]
    supported = set(music["supportedCanonicalArtistIds"])
    unresolved_ids = list(music["unresolvedCanonicalArtistIds"])
    unsupported = set(music["unsupportedCanonicalArtistIds"])

    if len(rows_by_id) != 355:
        raise RuntimeError(f"target_universe_count:{len(rows_by_id)}")
    if len(supported) != 91 or len(unresolved_ids) != 264 or len(unsupported) != 0:
        raise RuntimeError(
            f"unexpected_music_partition:{len(supported)}/{len(unresolved_ids)}/{len(unsupported)}"
        )

    rows = [rows_by_id[cid] for cid in unresolved_ids]

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures = {pool.submit(fetch_search, row): row["canonicalArtistId"] for row in rows}
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())

    index = {cid: i for i, cid in enumerate(unresolved_ids)}
    results.sort(key=lambda x: index[x["canonicalArtistId"]])

    counts = Counter(r["disposition"] for r in results)
    status_counts = Counter(str(r["statusCode"]) for r in results)

    def ids_for(disposition: str) -> list[str]:
        return [r["canonicalArtistId"] for r in results if r["disposition"] == disposition]

    payload = {
        "version": "music_genie_full264_identity_discovery_v1",
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "status": "full264_genie_identity_candidates_non_activating",
        "provider": "genie",
        "endpoint": "https://www.genie.co.kr/search/searchMain?query={query}",
        "canonicalUniverseCount": 355,
        "musicCompatibilityBeforeDiscovery": {
            "supportedCount": len(supported),
            "unresolvedCount": len(unresolved_ids),
            "unsupportedCount": len(unsupported),
        },
        "targetUnresolvedCount": len(unresolved_ids),
        "requestCount": len(results),
        "statusCodeCounts": dict(sorted(status_counts.items())),
        "dispositionCounts": dict(sorted(counts.items())),
        "uniqueExactCandidateCanonicalArtistIds": ids_for("unique_exact_candidate"),
        "ambiguousExactCanonicalArtistIds": ids_for("ambiguous_exact_candidates"),
        "uniqueWrapperCandidateCanonicalArtistIds": ids_for("unique_wrapper_candidate_review_required"),
        "ambiguousWrapperCanonicalArtistIds": ids_for("ambiguous_wrapper_candidates"),
        "providerCandidatesWithoutAliasMatchCanonicalArtistIds": ids_for("provider_candidates_without_alias_match"),
        "noProviderCandidateCanonicalArtistIds": ids_for("no_provider_candidate"),
        "requestFailedCanonicalArtistIds": ids_for("request_failed"),
        "results": results,
        "reviewSemantics": {
            "uniqueExactCandidateIsReviewedBinding": False,
            "uniqueWrapperCandidateIsReviewedBinding": False,
            "ambiguousCandidateAutoSelectionAllowed": False,
            "fuzzyIdentityAllowed": False,
            "providerSearchPresenceEqualsChartPresence": False,
            "providerSearchPresenceEqualsScoreReady": False,
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
        "PASS: Genie full264 identity discovery | "
        f"requests={payload['requestCount']} | "
        f"statusCodes={json.dumps(payload['statusCodeCounts'])} | "
        f"uniqueExact={counts.get('unique_exact_candidate',0)} | "
        f"ambiguousExact={counts.get('ambiguous_exact_candidates',0)} | "
        f"uniqueWrapper={counts.get('unique_wrapper_candidate_review_required',0)} | "
        f"ambiguousWrapper={counts.get('ambiguous_wrapper_candidates',0)} | "
        f"noAlias={counts.get('provider_candidates_without_alias_match',0)} | "
        f"noProvider={counts.get('no_provider_candidate',0)} | "
        f"failed={counts.get('request_failed',0)}"
    )
    print(
        "uniqueExactCandidateCanonicalArtistIds="
        + json.dumps(payload["uniqueExactCandidateCanonicalArtistIds"], ensure_ascii=False)
    )
    print(
        "ambiguousExactCanonicalArtistIds="
        + json.dumps(payload["ambiguousExactCanonicalArtistIds"], ensure_ascii=False)
    )
    print(
        "requestFailedCanonicalArtistIds="
        + json.dumps(payload["requestFailedCanonicalArtistIds"], ensure_ascii=False)
    )


if __name__ == "__main__":
    main()
