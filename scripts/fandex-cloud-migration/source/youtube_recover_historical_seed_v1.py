from __future__ import annotations

import csv
import json
import os
import sys
import urllib.parse
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[3]
SOURCE_DIR = Path(__file__).resolve().parent
if str(SOURCE_DIR) not in sys.path:
    sys.path.insert(0, str(SOURCE_DIR))

import youtube_discover_seed_candidates_artist_list_v2 as discovery


VERSION = "youtube_recover_historical_seed_v1"

MANIFEST_FILE = (
    REPO_ROOT
    / "data/fandex-cloud-v10/seed/"
    "youtube_historical_approved_seed_manifest_v1.json"
)
OUTPUT_CSV = (
    REPO_ROOT
    / "youtube_seed_videos_recovered_baseline_candidate_v1.csv"
)
OUTPUT_JSON = (
    REPO_ROOT
    / "youtube_seed_videos_recovered_baseline_candidate_v1.json"
)

API_KEY_ENV = "YOUTUBE_API_KEY"


def norm(value: Any) -> str:
    return "" if value is None else str(value).strip()


def read_manifest() -> dict[str, Any]:
    payload = json.loads(
        MANIFEST_FILE.read_text(
            encoding="utf-8-sig"
        )
    )

    if (
        norm(payload.get("version"))
        != "youtube_historical_seed_manifest_v1"
    ):
        raise RuntimeError(
            "Unexpected historical YouTube manifest version."
        )

    artists = payload.get("artists")
    if not isinstance(artists, list) or not artists:
        raise RuntimeError(
            "Historical YouTube manifest has no artists."
        )

    seen_ids = set()
    seen_artists = set()
    seen_videos = set()
    total = 0

    for artist_row in artists:
        canonical_id = norm(
            artist_row.get("canonicalArtistId")
        )
        artist = norm(
            artist_row.get("artist")
        )
        videos = artist_row.get("videos")

        if not canonical_id or not artist:
            raise RuntimeError(
                "Historical YouTube manifest row missing identity."
            )
        if canonical_id in seen_ids:
            raise RuntimeError(
                "Duplicate historical canonicalArtistId: "
                + canonical_id
            )
        if artist in seen_artists:
            raise RuntimeError(
                "Duplicate historical artist: "
                + artist
            )
        if not isinstance(videos, list) or not videos:
            raise RuntimeError(
                "Historical YouTube manifest artist has no videos: "
                + canonical_id
            )

        seen_ids.add(canonical_id)
        seen_artists.add(artist)

        for video in videos:
            video_id = norm(
                video.get("videoId")
            )
            if not video_id:
                raise RuntimeError(
                    "Historical YouTube videoId missing: "
                    + canonical_id
                )
            if video_id in seen_videos:
                raise RuntimeError(
                    "Historical YouTube videoId reused across manifest: "
                    + video_id
                )
            seen_videos.add(video_id)
            total += 1

    if len(seen_ids) != 10:
        raise RuntimeError(
            f"Expected 10 historical YouTube artists, got {len(seen_ids)}."
        )
    if total != 47:
        raise RuntimeError(
            f"Expected 47 historical approved videos, got {total}."
        )

    return payload


def youtube_get_videos(
    video_ids: list[str],
    api_key: str,
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []

    for index in range(
        0,
        len(video_ids),
        50,
    ):
        chunk = video_ids[
            index:index + 50
        ]
        params = urllib.parse.urlencode({
            "part":
                "snippet,statistics,contentDetails",
            "id":
                ",".join(chunk),
            "maxResults":
                50,
            "key":
                api_key,
        })
        url = (
            "https://www.googleapis.com/youtube/v3/videos?"
            + params
        )
        with urllib.request.urlopen(
            url,
            timeout=30,
        ) as response:
            payload = json.loads(
                response.read().decode(
                    "utf-8"
                )
            )
        items.extend(
            payload.get("items", [])
        )

    return items


def write_csv(
    path: Path,
    rows: list[dict[str, Any]],
) -> None:
    fieldnames = [
        "canonicalArtistId",
        "artist",
        "videoId",
        "sourceUrl",
        "historicalVideoType",
        "recoveredVideoType",
        "videoTypeSource",
        "historicalMemo",
        "title",
        "channelId",
        "channelTitle",
        "publishedAt",
        "viewCount",
        "likeCount",
        "commentCount",
        "recoveryStatus",
    ]

    with path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
        )
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    print(
        "FANDEX YouTube historical seed recovery v1"
    )
    print("=" * 72)
    print("mode: candidate-only / no active seed mutation")

    api_key = norm(
        os.environ.get(API_KEY_ENV)
    )
    if not api_key:
        raise RuntimeError(
            "YOUTUBE_API_KEY is required."
        )

    manifest = read_manifest()

    manifest_entries = []
    for artist_row in manifest["artists"]:
        for video in artist_row["videos"]:
            manifest_entries.append({
                "canonicalArtistId":
                    artist_row[
                        "canonicalArtistId"
                    ],
                "artist":
                    artist_row["artist"],
                **video,
            })

    ids = [
        row["videoId"]
        for row in manifest_entries
    ]
    live_items = youtube_get_videos(
        ids,
        api_key,
    )
    live_by_id = {
        norm(item.get("id")): item
        for item in live_items
        if norm(item.get("id"))
    }

    recovered = []
    missing = []
    explicit_type_count = 0
    inherited_type_count = 0
    current_type_counts = Counter()

    for row in manifest_entries:
        video_id = row["videoId"]
        item = live_by_id.get(video_id)

        if item is None:
            missing.append({
                "canonicalArtistId":
                    row["canonicalArtistId"],
                "artist":
                    row["artist"],
                "videoId":
                    video_id,
            })
            recovered.append({
                "canonicalArtistId":
                    row["canonicalArtistId"],
                "artist":
                    row["artist"],
                "videoId":
                    video_id,
                "sourceUrl":
                    "https://www.youtube.com/watch?v="
                    + video_id,
                "historicalVideoType":
                    norm(
                        row.get(
                            "historicalVideoType"
                        )
                    ),
                "recoveredVideoType":
                    "",
                "videoTypeSource":
                    "unavailable",
                "historicalMemo":
                    norm(
                        row.get(
                            "historicalMemo"
                        )
                    ),
                "title":
                    "",
                "channelId":
                    "",
                "channelTitle":
                    "",
                "publishedAt":
                    "",
                "viewCount":
                    "",
                "likeCount":
                    "",
                "commentCount":
                    "",
                "recoveryStatus":
                    "missing_live_video",
            })
            continue

        snippet = item.get(
            "snippet",
            {},
        )
        stats = item.get(
            "statistics",
            {},
        )

        title = norm(
            snippet.get("title")
        )
        historical_type = norm(
            row.get(
                "historicalVideoType"
            )
        )

        if historical_type:
            recovered_type = historical_type
            type_source = (
                "historical_explicit_apply_override"
            )
            explicit_type_count += 1
        else:
            recovered_type = (
                discovery.classify_type(
                    title
                )
            )
            type_source = (
                "live_reclassification_using_"
                "historical_discovery_contract"
            )
            inherited_type_count += 1

        current_type_counts[
            recovered_type
        ] += 1

        recovered.append({
            "canonicalArtistId":
                row["canonicalArtistId"],
            "artist":
                row["artist"],
            "videoId":
                video_id,
            "sourceUrl":
                "https://www.youtube.com/watch?v="
                + video_id,
            "historicalVideoType":
                historical_type,
            "recoveredVideoType":
                recovered_type,
            "videoTypeSource":
                type_source,
            "historicalMemo":
                norm(
                    row.get(
                        "historicalMemo"
                    )
                ),
            "title":
                title,
            "channelId":
                norm(
                    snippet.get(
                        "channelId"
                    )
                ),
            "channelTitle":
                norm(
                    snippet.get(
                        "channelTitle"
                    )
                ),
            "publishedAt":
                norm(
                    snippet.get(
                        "publishedAt"
                    )
                ),
            "viewCount":
                norm(
                    stats.get(
                        "viewCount"
                    )
                ),
            "likeCount":
                norm(
                    stats.get(
                        "likeCount"
                    )
                ),
            "commentCount":
                norm(
                    stats.get(
                        "commentCount"
                    )
                ),
            "recoveryStatus":
                "ok",
        })

    write_csv(
        OUTPUT_CSV,
        recovered,
    )

    payload = {
        "version":
            VERSION,
        "createdAt":
            datetime.now(
                timezone.utc
            ).isoformat(
                timespec="seconds"
            ),
        "mode":
            "candidate_only_no_active_seed_mutation",
        "manifestVersion":
            manifest["version"],
        "artistCount":
            len(manifest["artists"]),
        "approvedVideoIdCount":
            len(manifest_entries),
        "liveResolvedCount":
            len(manifest_entries)
            - len(missing),
        "liveMissingCount":
            len(missing),
        "explicitHistoricalTypeCount":
            explicit_type_count,
        "liveReclassifiedTypeCount":
            inherited_type_count,
        "recoveredTypeCounts":
            dict(
                sorted(
                    current_type_counts.items()
                )
            ),
        "missingVideos":
            missing,
        "activeSeedModified":
            False,
        "productScoreModified":
            False,
        "databaseModified":
            False,
        "runtimeModified":
            False,
        "rows":
            recovered,
    }

    OUTPUT_JSON.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    print(
        "historical artists: "
        f"{payload['artistCount']}"
    )
    print(
        "approved video IDs: "
        f"{payload['approvedVideoIdCount']}"
    )
    print(
        "live resolved: "
        f"{payload['liveResolvedCount']}"
    )
    print(
        "live missing: "
        f"{payload['liveMissingCount']}"
    )
    print(
        "explicit historical types: "
        f"{payload['explicitHistoricalTypeCount']}"
    )
    print(
        "live reclassified types: "
        f"{payload['liveReclassifiedTypeCount']}"
    )
    print(
        "recovered type counts: "
        + json.dumps(
            payload["recoveredTypeCounts"],
            ensure_ascii=False,
            sort_keys=True,
        )
    )

    if missing:
        raise RuntimeError(
            "Historical YouTube approved videos unavailable: "
            + ", ".join(
                row["videoId"]
                for row in missing
            )
        )

    print(
        "PASS: historical YouTube approved seed IDs "
        "are live-resolvable"
    )


if __name__ == "__main__":
    main()
