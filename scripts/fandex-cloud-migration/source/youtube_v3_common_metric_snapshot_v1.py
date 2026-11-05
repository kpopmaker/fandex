from __future__ import annotations

import csv
import json
import math
import os
import urllib.error
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

VERSION = "youtube_v3_common_metric_snapshot_v1"
FORMULA_VERSION = "youtube_publish_v3_uncapped_additive_scaled"
FORMULA_SOURCE_COMMIT = "5b2bf2bb4e8d25523b409053087daa582bb5fd2f"
FORMULA_SOURCE_BLOB = "6942fc2cabaa9259f7aac7fc4e79bce3a492bc86"
CLASSIFIER_SOURCE_BLOB = "4048769abade9fab0d3e2bfde066289274554b5f"

ROOT = Path(__file__).resolve().parents[3]
POLICY = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_common_seed_selection_policy_v1.json"
MANIFEST = ROOT / "data/fandex-cloud-v10/seed/youtube_v3_common_seed_manifest_v1.json"
FROZEN_RANKING = ROOT / "data/fandex-cloud-v10/seed/fandex_youtube_ranking_v3_latest.json"

OUTPUT_JSON = ROOT / "youtube_v3_common_metric_snapshot_v1_latest.json"
OUTPUT_CSV = ROOT / "youtube_v3_common_metric_snapshot_v1_latest.csv"

YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/videos"
SCALE_FACTOR = 0.12

TYPE_MULTIPLIERS = {
    "official_mv": 1.30,
    "performance_video": 1.15,
    "dance_practice": 1.10,
    "live_clip": 1.15,
    "broadcast_clip": 1.05,
    "external_content": 0.90,
    "behind": 0.80,
    "shorts": 0.65,
    "challenge": 0.65,
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8-sig"))


def norm(value: Any) -> str:
    return "" if value is None else str(value).strip()


def to_required_int(value: Any, *, field: str, video_id: str) -> int:
    if value is None or norm(value) == "":
        raise RuntimeError(
            f"YouTube metric unavailable; refusing zero imputation: "
            f"{video_id} {field}"
        )
    try:
        return int(value)
    except (TypeError, ValueError) as exc:
        raise RuntimeError(
            f"Invalid YouTube metric: {video_id} {field}={value!r}"
        ) from exc


def classify_type(title: str) -> str:
    # Byte-for-byte semantic copy of classify_type from the frozen
    # validation lineage recorded by CLASSIFIER_SOURCE_BLOB.
    text = title.lower()

    if "#shorts" in text or "shorts" in text:
        return "shorts"

    if "dance practice" in text or "choreography" in text or "안무" in text:
        return "dance_practice"

    if (
        "official mv" in text
        or "music video" in text
        or " m/v" in text
        or "mv " in text
    ):
        return "official_mv"

    if (
        "performance" in text
        or "stage" in text
        or "musiccore" in text
        or "뮤직뱅크" in text
        or "인기가요" in text
    ):
        return "performance_video"

    if "live" in text or "라이브" in text:
        return "live_clip"

    return "external_content"


def log_points(value: int, weight: float) -> float:
    if value <= 0:
        return 0.0
    return (math.log10(value + 1) ** 2) * weight


def calculate_video_point(
    *,
    views: int,
    likes: int,
    comments: int,
    video_type: str,
) -> dict[str, float]:
    # Reproduces recovered operational v3 semantics. The historical collector
    # did not pass channelTitle into youtube_publish_v3.py, so channelMultiplier
    # was 1.0. Live channelTitle is preserved as evidence but not introduced as
    # a new scoring input in this rebaseline.
    view_point = log_points(views, 0.90)
    like_point = log_points(likes, 0.55)
    comment_point = log_points(comments, 0.35)
    base_point = view_point + like_point + comment_point
    type_multiplier = TYPE_MULTIPLIERS.get(video_type or "", 0.85)
    channel_multiplier = 1.0
    raw_video_point = base_point * type_multiplier * channel_multiplier
    final_video_point = raw_video_point * SCALE_FACTOR

    return {
        "viewPoint": round(view_point, 4),
        "likePoint": round(like_point, 4),
        "commentPoint": round(comment_point, 4),
        "basePoint": round(base_point, 4),
        "typeMultiplier": type_multiplier,
        "channelMultiplier": channel_multiplier,
        "rawVideoPoint": round(raw_video_point, 4),
        "finalVideoPoint": round(final_video_point, 4),
    }


def chunked(items: list[str], size: int):
    for index in range(0, len(items), size):
        yield items[index:index + size]


def request_batch(api_key: str, video_ids: list[str]) -> dict[str, Any]:
    params = {
        "part": "snippet,statistics",
        "id": ",".join(video_ids),
        "key": api_key,
        "maxResults": "50",
    }
    url = YOUTUBE_API_URL + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "FANDEX-youtube-common-rebaseline-v1",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"YouTube API HTTP {exc.code}: {body}"
        ) from exc
    except urllib.error.URLError as exc:
        raise RuntimeError(f"YouTube API connection failed: {exc}") from exc


def main() -> None:
    policy = read_json(POLICY)
    manifest = read_json(MANIFEST)
    frozen = read_json(FROZEN_RANKING)

    if policy["nextGate"]["code"] != "COMMON_21_ARTIST_METRIC_SNAPSHOT_REQUIRED":
        raise RuntimeError("Unexpected common YouTube rebaseline gate.")
    if policy["scoreContract"]["formulaVersion"] != FORMULA_VERSION:
        raise RuntimeError("YouTube formula version mismatch.")
    if manifest["selectedArtistCount"] != 21 or manifest["selectedVideoCount"] != 74:
        raise RuntimeError("Expected frozen common manifest 21 artists / 74 videos.")

    seed_rows = manifest["selectedVideos"]
    video_ids = [norm(row["videoId"]) for row in seed_rows]
    if len(video_ids) != 74 or len(set(video_ids)) != 74:
        raise RuntimeError("Common YouTube manifest video IDs are not unique 74/74.")

    api_key = norm(os.environ.get("YOUTUBE_API_KEY"))
    if not api_key:
        raise RuntimeError("YOUTUBE_API_KEY is required.")

    returned: dict[str, dict[str, Any]] = {}
    request_batch_count = 0
    for batch in chunked(video_ids, 50):
        request_batch_count += 1
        payload = request_batch(api_key, batch)
        for item in payload.get("items", []):
            video_id = norm(item.get("id"))
            if video_id:
                if video_id in returned:
                    raise RuntimeError("Duplicate YouTube API item: " + video_id)
                returned[video_id] = item

    missing_video_ids = sorted(set(video_ids) - set(returned))
    unexpected_video_ids = sorted(set(returned) - set(video_ids))
    if missing_video_ids or unexpected_video_ids:
        receipt = {
            "version": VERSION,
            "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "snapshotComplete": False,
            "requestedVideoCount": 74,
            "returnedVideoCount": len(returned),
            "missingVideoIds": missing_video_ids,
            "unexpectedVideoIds": unexpected_video_ids,
            "zeroImputationUsed": False,
            "productActivationAuthorized": False,
        }
        OUTPUT_JSON.write_text(
            json.dumps(receipt, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        raise RuntimeError(
            "Common YouTube snapshot incomplete; missing="
            + ",".join(missing_video_ids)
            + " unexpected="
            + ",".join(unexpected_video_ids)
        )

    metrics: list[dict[str, Any]] = []
    totals: dict[str, float] = defaultdict(float)
    counts: dict[str, int] = defaultdict(int)

    for seed in seed_rows:
        canonical_id = norm(seed["canonicalArtistId"])
        artist = norm(seed["artist"])
        video_id = norm(seed["videoId"])
        item = returned[video_id]
        snippet = item.get("snippet", {})
        statistics = item.get("statistics", {})
        title = norm(snippet.get("title"))
        live_channel_title = norm(snippet.get("channelTitle"))

        reviewed_type = norm(seed.get("reviewedVideoType"))
        video_type = reviewed_type or classify_type(title)
        if video_type not in TYPE_MULTIPLIERS:
            raise RuntimeError(
                f"Unsupported YouTube videoType in common snapshot: "
                f"{video_id} {video_type}"
            )

        views = to_required_int(
            statistics.get("viewCount"),
            field="viewCount",
            video_id=video_id,
        )
        likes = to_required_int(
            statistics.get("likeCount"),
            field="likeCount",
            video_id=video_id,
        )
        comments = to_required_int(
            statistics.get("commentCount"),
            field="commentCount",
            video_id=video_id,
        )

        point = calculate_video_point(
            views=views,
            likes=likes,
            comments=comments,
            video_type=video_type,
        )

        row = {
            "canonicalArtistId": canonical_id,
            "artist": artist,
            "videoId": video_id,
            "title": title,
            "liveChannelTitle": live_channel_title,
            "publishedAt": norm(snippet.get("publishedAt")),
            "viewCount": views,
            "likeCount": likes,
            "commentCount": comments,
            "videoType": video_type,
            "videoTypeSource": (
                "preserved_reviewed_or_historical_type"
                if reviewed_type
                else "frozen_classifier_from_live_title"
            ),
            "evidenceClass": seed["evidenceClass"],
            **point,
        }
        metrics.append(row)
        totals[canonical_id] += float(point["finalVideoPoint"])
        counts[canonical_id] += 1

    manifest_counts = manifest["videoCountByCanonicalArtistId"]
    if dict(sorted(counts.items())) != dict(sorted(manifest_counts.items())):
        raise RuntimeError("Collected per-artist video counts do not match manifest.")

    artist_name_by_id = {
        norm(row["canonicalArtistId"]): norm(row["artist"])
        for row in seed_rows
    }
    frozen_by_artist = {
        norm(row.get("artist")): float(row.get("youtubePoint"))
        for row in frozen.get("ranking", [])
    }

    ranking = []
    for canonical_id in manifest_counts:
        artist = artist_name_by_id[canonical_id]
        ranking.append({
            "canonicalArtistId": canonical_id,
            "artist": artist,
            "videoCount": counts[canonical_id],
            "youtubePointV3RebaselineSnapshot": round(totals[canonical_id], 2),
            "frozenYoutubePoint": frozen_by_artist.get(artist),
            "productEligibility": "not_evaluated",
        })

    ranking.sort(
        key=lambda row: (
            -float(row["youtubePointV3RebaselineSnapshot"]),
            row["canonicalArtistId"],
        )
    )
    for index, row in enumerate(ranking, start=1):
        row["snapshotRank"] = index

    output = {
        "version": VERSION,
        "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "github": {
            "runId": norm(os.environ.get("GITHUB_RUN_ID")),
            "runAttempt": norm(os.environ.get("GITHUB_RUN_ATTEMPT")),
            "sha": norm(os.environ.get("GITHUB_SHA")),
            "refName": norm(os.environ.get("GITHUB_REF_NAME")),
        },
        "policyVersion": policy["version"],
        "manifestVersion": manifest["version"],
        "formulaVersion": FORMULA_VERSION,
        "formulaProvenance": {
            "sourceCommit": FORMULA_SOURCE_COMMIT,
            "formulaSourceBlob": FORMULA_SOURCE_BLOB,
            "classifierSourceBlob": CLASSIFIER_SOURCE_BLOB,
            "historicalCollectorChannelTitlePropagation": False,
            "channelMultiplierForRebaseline": 1.0,
        },
        "snapshotComplete": True,
        "targetArtistCount": 21,
        "requestedVideoCount": 74,
        "returnedVideoCount": 74,
        "requestBatchCount": request_batch_count,
        "missingVideoIds": [],
        "zeroImputationUsed": False,
        "oneCommonCollectionRun": True,
        "ranking": ranking,
        "metrics": sorted(
            metrics,
            key=lambda row: (row["canonicalArtistId"], row["videoId"]),
        ),
        "nextGate": {
            "code": "COMMON_21_ARTIST_DISTRIBUTION_COMPARISON_REQUIRED",
            "detail": (
                "Compare the 21-artist common snapshot against the frozen 10 "
                "without inventing promotion thresholds."
            ),
        },
        "safety": {
            "activeYoutubeRankingModified": False,
            "productCohortModified": False,
            "productEligibilityEvaluated": False,
            "productActivationAuthorized": False,
            "databaseModified": False,
            "schedulerModified": False,
            "deploymentAuthorized": False,
        },
    }

    OUTPUT_JSON.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    fieldnames = [
        "canonicalArtistId",
        "artist",
        "videoId",
        "title",
        "liveChannelTitle",
        "publishedAt",
        "viewCount",
        "likeCount",
        "commentCount",
        "videoType",
        "videoTypeSource",
        "evidenceClass",
        "viewPoint",
        "likePoint",
        "commentPoint",
        "basePoint",
        "typeMultiplier",
        "channelMultiplier",
        "rawVideoPoint",
        "finalVideoPoint",
    ]
    with OUTPUT_CSV.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(output["metrics"])

    print(
        "PASS: common YouTube metric snapshot | "
        "artists=21 | requested=74 | returned=74 | "
        f"batches={request_batch_count} | zeroImputation=FALSE"
    )
    for row in ranking:
        print(
            f"{row['snapshotRank']:02d} | {row['canonicalArtistId']} | "
            f"videos={row['videoCount']} | "
            f"point={row['youtubePointV3RebaselineSnapshot']} | "
            f"frozen={row['frozenYoutubePoint']}"
        )
    print("nextGate=COMMON_21_ARTIST_DISTRIBUTION_COMPARISON_REQUIRED")
    print("Product activation authorized: FALSE")


if __name__ == "__main__":
    main()
