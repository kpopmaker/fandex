from __future__ import annotations

import concurrent.futures
import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import quote_plus, urljoin

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[3]
TARGETS = ROOT / "music_chart_artist_targets_355_candidate_v1.json"
COMPAT = ROOT / "data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"
OUTPUT = Path("music_provider_artist_search_probe_v1.json")

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/120.0.0.0 Safari/537.36"
)

CONTROL_IDS = ["iu", "aespa", "itzy", "kickflip"]
UNRESOLVED_SAMPLE_IDS = [
    "zerobaseone",
    "kissoflife",
    "meovv",
    "izna",
    "nctdream",
    "nct127",
    "nctwish",
    "treasure",
    "theboyz",
    "monstax",
    "exo",
    "mamamoo",
    "jin",
    "suga",
    "rm",
    "jhope",
    "baekhyun",
    "kai",
    "bibi",
    "girlsgeneration",
]


def compact(value: str) -> str:
    return re.sub(r"[^0-9a-z가-힣]+", "", (value or "").strip().lower())


def candidate_alias_keys(row: dict) -> set[str]:
    values = [row.get("artist", ""), *(row.get("aliases") or [])]
    return {compact(str(v)) for v in values if compact(str(v))}


def search_url(provider: str, query: str) -> str:
    if provider == "melon":
        return "https://search.melon.com/search/mcom_index.htm?q=" + quote_plus(query)
    if provider == "genie":
        return "https://www.genie.co.kr/search/searchMain?query=" + quote_plus(query)
    raise ValueError(provider)


def extract_candidates(provider: str, html: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    found = []
    seen = set()

    if provider == "melon":
        pattern = re.compile(r"(?:artistId=|goArtistDetail\(['\"]?)(\d+)")
        for a in soup.find_all("a"):
            href = str(a.get("href") or "")
            onclick = str(a.get("onclick") or "")
            blob = href + " " + onclick
            m = pattern.search(blob)
            if not m:
                continue
            provider_id = m.group(1)
            name = " ".join(a.stripped_strings).strip()
            if not name:
                continue
            key = (provider_id, name)
            if key in seen:
                continue
            seen.add(key)
            found.append({
                "providerArtistId": provider_id,
                "providerDisplay": name,
                "href": urljoin("https://www.melon.com/", href) if href else "",
            })

    elif provider == "genie":
        pattern = re.compile(r"(?:artistInfo\?xxnm=|artistInfo\?xxnm%3D)(\d+)")
        for a in soup.find_all("a"):
            href = str(a.get("href") or "")
            onclick = str(a.get("onclick") or "")
            blob = href + " " + onclick
            m = pattern.search(blob)
            if not m:
                continue
            provider_id = m.group(1)
            name = " ".join(a.stripped_strings).strip()
            if not name:
                continue
            key = (provider_id, name)
            if key in seen:
                continue
            seen.add(key)
            found.append({
                "providerArtistId": provider_id,
                "providerDisplay": name,
                "href": urljoin("https://www.genie.co.kr/", href) if href else "",
            })

    return found[:30]


def probe_one(provider: str, row: dict) -> dict:
    query = str(row["artist"]).strip()
    url = search_url(provider, query)
    response = requests.get(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        },
        timeout=20,
    )
    candidates = extract_candidates(provider, response.text)
    alias_keys = candidate_alias_keys(row)

    exact = [
        c for c in candidates
        if compact(c["providerDisplay"]) in alias_keys
    ]
    wrapper = [
        c for c in candidates
        if c not in exact and any(
            key and (
                key in compact(c["providerDisplay"])
                or compact(c["providerDisplay"]) in key
            )
            for key in alias_keys
        )
    ]

    return {
        "provider": provider,
        "canonicalArtistId": row["canonicalArtistId"],
        "query": query,
        "url": url,
        "statusCode": response.status_code,
        "responseLength": len(response.text),
        "candidateCount": len(candidates),
        "exactAliasCandidateCount": len(exact),
        "wrapperAliasCandidateCount": len(wrapper),
        "exactAliasCandidates": exact,
        "wrapperAliasCandidates": wrapper[:10],
        "candidateSample": candidates[:10],
    }


def main():
    targets = json.loads(TARGETS.read_text(encoding="utf-8-sig"))
    compat = json.loads(COMPAT.read_text(encoding="utf-8-sig"))
    rows = {row["canonicalArtistId"]: row for row in targets["artists"]}

    selected_ids = CONTROL_IDS + UNRESOLVED_SAMPLE_IDS
    missing = [cid for cid in selected_ids if cid not in rows]
    if missing:
        raise RuntimeError(f"missing_target_rows:{missing}")

    music = compat["sources"]["music_chart"]
    supported = set(music["supportedCanonicalArtistIds"])
    unresolved = set(music["unresolvedCanonicalArtistIds"])
    if len(supported) != 91 or len(unresolved) != 264:
        raise RuntimeError(f"unexpected_music_partition:{len(supported)}/{len(unresolved)}")
    if not set(CONTROL_IDS) <= supported:
        raise RuntimeError("control_not_supported")
    if not set(UNRESOLVED_SAMPLE_IDS) <= unresolved:
        raise RuntimeError("sample_not_unresolved")

    tasks = [
        (provider, rows[cid])
        for cid in selected_ids
        for provider in ("melon", "genie")
    ]

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(probe_one, provider, row) for provider, row in tasks]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())

    results.sort(key=lambda x: (selected_ids.index(x["canonicalArtistId"]), x["provider"]))

    control_results = [r for r in results if r["canonicalArtistId"] in CONTROL_IDS]
    sample_results = [r for r in results if r["canonicalArtistId"] in UNRESOLVED_SAMPLE_IDS]

    controls_with_candidates = sorted({
        r["canonicalArtistId"] for r in control_results
        if r["candidateCount"] > 0
    })
    unresolved_with_candidates = sorted({
        r["canonicalArtistId"] for r in sample_results
        if r["candidateCount"] > 0
    })
    unresolved_with_exact = sorted({
        r["canonicalArtistId"] for r in sample_results
        if r["exactAliasCandidateCount"] > 0
    })
    unresolved_with_wrapper = sorted({
        r["canonicalArtistId"] for r in sample_results
        if r["wrapperAliasCandidateCount"] > 0
    })

    payload = {
        "version": "music_provider_artist_search_probe_v1",
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "status": "bounded_provider_search_probe_non_activating",
        "musicCompatibilityBeforeProbe": {
            "supportedCount": len(supported),
            "unresolvedCount": len(unresolved),
            "unsupportedCount": len(music["unsupportedCanonicalArtistIds"]),
        },
        "providers": ["melon", "genie"],
        "controlCanonicalArtistIds": CONTROL_IDS,
        "unresolvedSampleCanonicalArtistIds": UNRESOLVED_SAMPLE_IDS,
        "requestCount": len(results),
        "http200Count": sum(1 for r in results if r["statusCode"] == 200),
        "controlsWithProviderCandidates": controls_with_candidates,
        "unresolvedWithProviderCandidates": unresolved_with_candidates,
        "unresolvedWithExactAliasCandidates": unresolved_with_exact,
        "unresolvedWithWrapperAliasCandidates": unresolved_with_wrapper,
        "results": results,
        "safety": {
            "providerSearchCandidateIsReviewedBinding": False,
            "candidateAutoSelected": False,
            "fuzzyAutoBinding": False,
            "compatibilityRegistryModified": False,
            "activeTargetSeedModified": False,
            "productCohortModified": False,
            "productRuntimeModified": False,
        },
    }

    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        "PASS: provider artist search probe | "
        f"requests={payload['requestCount']} | "
        f"http200={payload['http200Count']} | "
        f"controlsWithCandidates={len(controls_with_candidates)}/{len(CONTROL_IDS)} | "
        f"unresolvedWithCandidates={len(unresolved_with_candidates)}/{len(UNRESOLVED_SAMPLE_IDS)} | "
        f"unresolvedExact={len(unresolved_with_exact)} | "
        f"unresolvedWrapper={len(unresolved_with_wrapper)}"
    )
    print("controlsWithProviderCandidates=" + json.dumps(controls_with_candidates, ensure_ascii=False))
    print("unresolvedWithProviderCandidates=" + json.dumps(unresolved_with_candidates, ensure_ascii=False))
    print("unresolvedWithExactAliasCandidates=" + json.dumps(unresolved_with_exact, ensure_ascii=False))
    print("unresolvedWithWrapperAliasCandidates=" + json.dumps(unresolved_with_wrapper, ensure_ascii=False))


if __name__ == "__main__":
    main()
