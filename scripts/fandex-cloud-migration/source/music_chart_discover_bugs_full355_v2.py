from __future__ import annotations

import json
from collections import Counter
from datetime import datetime
from pathlib import Path

import music_chart_collect_bugs_v1 as bugs
import music_chart_discover_artist_candidates_v2 as discover
import music_chart_discover_bugs_all_targets_v1 as legacy_bugs


VERSION = "music_chart_discover_bugs_full355_v2"
ROOT = Path(__file__).resolve().parents[3]
COMPAT_PATH = ROOT / "data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"
OUTPUT_JSON = Path("music_chart_bugs_full355_v2_latest.json")


def main():
    compat = json.loads(COMPAT_PATH.read_text(encoding="utf-8-sig"))
    music = compat["sources"]["music_chart"]
    unresolved = set(music["unresolvedCanonicalArtistIds"])
    supported = set(music["supportedCanonicalArtistIds"])
    unsupported = set(music["unsupportedCanonicalArtistIds"])

    if len(discover.TARGET_ARTISTS) != 355:
        raise RuntimeError(f"expected_355_targets:{len(discover.TARGET_ARTISTS)}")
    if len(supported) != 89 or len(unresolved) != 266 or len(unsupported) != 0:
        raise RuntimeError(
            f"unexpected_music_partition:{len(supported)}/{len(unresolved)}/{len(unsupported)}"
        )

    page = bugs.fetch_bugs_chart()
    chart_rows = bugs.parse_bugs_chart(page)
    if not chart_rows:
        raise RuntimeError("bugs_chart_parser_returned_0_rows")

    candidates = []
    ambiguities = []
    unsafe_matches = []
    seen = set()

    for chart_row in chart_rows:
        chart_artist = str(chart_row.get("artist") or "").strip()
        track_title = str(chart_row.get("trackTitle") or "").strip()
        if not chart_artist or not track_title:
            continue

        resolution = discover.resolve_target_artist(chart_artist)

        if resolution["status"] == "ambiguous":
            ambiguities.append({
                "chartArtist": chart_artist,
                "trackTitle": track_title,
                "rank": chart_row.get("rank"),
                "matches": resolution["matches"],
            })
            continue

        if resolution["status"] != "resolved":
            continue

        matched_alias = str(resolution["matchedAlias"])
        if not legacy_bugs.alias_matches_safely(chart_artist, matched_alias):
            unsafe_matches.append({
                "chartArtist": chart_artist,
                "trackTitle": track_title,
                "rank": chart_row.get("rank"),
                "canonicalArtistId": resolution["canonicalArtistId"],
                "matchedAlias": matched_alias,
            })
            continue

        cid = str(resolution["canonicalArtistId"])
        key = (cid, str(track_title).casefold(), int(chart_row["rank"]))
        if key in seen:
            continue
        seen.add(key)

        candidates.append({
            "canonicalArtistId": cid,
            "artist": resolution["artist"],
            "matchedAlias": matched_alias,
            "matchedArtist": chart_artist,
            "trackTitle": track_title,
            "rank": int(chart_row["rank"]),
            "platform": "bugs",
            "chartName": "Bugs Realtime",
            "sourceUrl": bugs.BUGS_CHART_URL,
            "compatibilityBeforeDiscovery": (
                "supported" if cid in supported
                else "unresolved" if cid in unresolved
                else "unsupported" if cid in unsupported
                else "not_in_registry"
            ),
        })

    candidate_ids = {row["canonicalArtistId"] for row in candidates}
    unresolved_hits = sorted(candidate_ids & unresolved)
    supported_hits = sorted(candidate_ids & supported)

    counts = Counter(row["canonicalArtistId"] for row in candidates)

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "source": "bugs",
        "sourceUrl": bugs.BUGS_CHART_URL,
        "targetArtistCount": len(discover.TARGET_ARTISTS),
        "compatibilityBeforeDiscovery": {
            "supportedCount": len(supported),
            "unresolvedCount": len(unresolved),
            "unsupportedCount": len(unsupported),
        },
        "parsedChartRowCount": len(chart_rows),
        "candidateRowCount": len(candidates),
        "candidateCanonicalArtistCount": len(candidate_ids),
        "supportedHitArtistCount": len(supported_hits),
        "unresolvedHitArtistCount": len(unresolved_hits),
        "identityAmbiguityCount": len(ambiguities),
        "unsafeAliasMatchCount": len(unsafe_matches),
        "supportedHitCanonicalArtistIds": supported_hits,
        "unresolvedHitCanonicalArtistIds": unresolved_hits,
        "candidateCountsByCanonicalArtistId": dict(sorted(counts.items())),
        "candidates": candidates,
        "identityAmbiguities": ambiguities,
        "unsafeAliasMatches": unsafe_matches,
        "seedModified": False,
        "compatibilityRegistryModified": False,
        "productCohortModified": False,
        "productRuntimeModified": False,
    }

    OUTPUT_JSON.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        "PASS: Bugs full355 discovery | "
        f"parsed={payload['parsedChartRowCount']} | "
        f"candidateRows={payload['candidateRowCount']} | "
        f"candidateArtists={payload['candidateCanonicalArtistCount']} | "
        f"supportedHits={payload['supportedHitArtistCount']} | "
        f"unresolvedHits={payload['unresolvedHitArtistCount']} | "
        f"ambiguities={payload['identityAmbiguityCount']} | "
        f"unsafe={payload['unsafeAliasMatchCount']}"
    )
    print("unresolvedHitCanonicalArtistIds=" + json.dumps(unresolved_hits, ensure_ascii=False))
    print("identityAmbiguities=" + json.dumps(ambiguities, ensure_ascii=False))
    print("unsafeAliasMatches=" + json.dumps(unsafe_matches, ensure_ascii=False))


if __name__ == "__main__":
    main()
