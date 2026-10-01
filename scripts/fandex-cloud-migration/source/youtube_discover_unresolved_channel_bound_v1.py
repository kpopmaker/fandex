from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from pathlib import Path


VERSION = "youtube_discover_unresolved_channel_bound_v1"

PLAN_FILE = Path(
    "data/fandex-cloud-v10/seed/"
    "youtube_v3_unresolved_review_plan_v1.json"
)
OUTPUT_FILE = Path(
    "youtube_v3_unresolved_channel_bound_candidates_v1.json"
)

API_KEY_ENV = "YOUTUBE_API_KEY"
VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos"
CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels"
SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"


def norm(value):
    return "" if value is None else str(value).strip()


def youtube_get(url, params, api_key):
    payload = dict(params)
    payload["key"] = api_key
    request_url = (
        url
        + "?"
        + urllib.parse.urlencode(
            payload
        )
    )

    request = urllib.request.Request(
        request_url,
        headers={
            "Accept": "application/json",
            "User-Agent":
                "FANDEX-youtube-unresolved-review/1.0",
        },
    )

    with urllib.request.urlopen(
        request,
        timeout=30,
    ) as response:
        return json.loads(
            response.read().decode(
                "utf-8"
            )
        )


def get_anchor(
    video_id,
    api_key,
):
    payload = youtube_get(
        VIDEOS_URL,
        {
            "part": "snippet",
            "id": video_id,
            "maxResults": 1,
        },
        api_key,
    )

    items = payload.get(
        "items",
        [],
    )
    if len(items) != 1:
        raise RuntimeError(
            "YouTube anchor video unavailable: "
            + video_id
        )

    item = items[0]
    snippet = item.get(
        "snippet",
        {},
    )
    channel_id = norm(
        snippet.get("channelId")
    )
    channel_title = norm(
        snippet.get("channelTitle")
    )

    if not channel_id or not channel_title:
        raise RuntimeError(
            "YouTube anchor missing channel identity: "
            + video_id
        )

    return {
        "videoId": video_id,
        "title": norm(
            snippet.get("title")
        ),
        "channelId": channel_id,
        "channelTitle":
            channel_title,
        "publishedAt": norm(
            snippet.get("publishedAt")
        ),
    }


def get_channel(
    channel_id,
    api_key,
):
    payload = youtube_get(
        CHANNELS_URL,
        {
            "part": "snippet,status",
            "id": channel_id,
            "maxResults": 1,
        },
        api_key,
    )

    items = payload.get(
        "items",
        [],
    )
    if len(items) != 1:
        raise RuntimeError(
            "YouTube channel unavailable: "
            + channel_id
        )

    item = items[0]
    snippet = item.get(
        "snippet",
        {},
    )
    status = item.get(
        "status",
        {},
    )

    return {
        "channelId":
            norm(item.get("id")),
        "title":
            norm(
                snippet.get("title")
            ),
        "customUrl":
            norm(
                snippet.get(
                    "customUrl"
                )
            ),
        "description":
            norm(
                snippet.get(
                    "description"
                )
            )[:500],
        "privacyStatus":
            norm(
                status.get(
                    "privacyStatus"
                )
            ),
    }


def search_channel(
    target,
    channel_id,
    api_key,
):
    payload = youtube_get(
        SEARCH_URL,
        {
            "part": "snippet",
            "q": target["query"],
            "type": "video",
            "channelId":
                channel_id,
            "order": "relevance",
            "maxResults": 10,
            "publishedAfter":
                target[
                    "publishedAfter"
                ],
            "safeSearch": "none",
            "regionCode": "KR",
        },
        api_key,
    )

    rows = []
    seen = set()

    for item in payload.get(
        "items",
        [],
    ):
        video_id = norm(
            (
                item.get("id")
                or {}
            ).get(
                "videoId"
            )
        )
        snippet = item.get(
            "snippet",
            {},
        )

        if not video_id:
            continue
        if video_id in seen:
            continue

        seen.add(video_id)

        result_channel_id = norm(
            snippet.get(
                "channelId"
            )
        )
        if (
            result_channel_id
            != channel_id
        ):
            raise RuntimeError(
                "YouTube channel-bound search "
                "returned a different channel: "
                f"{video_id}"
            )

        rows.append({
            "canonicalArtistId":
                target[
                    "canonicalArtistId"
                ],
            "artist":
                target["artist"],
            "videoId":
                video_id,
            "title":
                norm(
                    snippet.get(
                        "title"
                    )
                ),
            "channelId":
                result_channel_id,
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
            "query":
                target["query"],
            "reviewState":
                "machine_candidate_unreviewed",
        })

    return rows


def main():
    api_key = norm(
        os.environ.get(
            API_KEY_ENV
        )
    )
    if not api_key:
        raise RuntimeError(
            "YOUTUBE_API_KEY is required."
        )

    plan = json.loads(
        PLAN_FILE.read_text(
            encoding="utf-8-sig"
        )
    )
    targets = plan.get(
        "targets"
    )

    if not isinstance(
        targets,
        list,
    ) or len(targets) != 4:
        raise RuntimeError(
            "Expected four unresolved "
            "YouTube review targets."
        )

    seen_ids = set()
    anchor_cache = {}
    channel_cache = {}
    results = []

    for target in targets:
        canonical_id = norm(
            target.get(
                "canonicalArtistId"
            )
        )
        artist = norm(
            target.get("artist")
        )
        anchor_video_id = norm(
            target.get(
                "anchorVideoId"
            )
        )

        if (
            not canonical_id
            or not artist
            or not anchor_video_id
            or canonical_id
            in seen_ids
        ):
            raise RuntimeError(
                "Invalid unresolved "
                "YouTube review target."
            )

        seen_ids.add(
            canonical_id
        )

        if (
            anchor_video_id
            not in anchor_cache
        ):
            anchor_cache[
                anchor_video_id
            ] = get_anchor(
                anchor_video_id,
                api_key,
            )

        anchor = anchor_cache[
            anchor_video_id
        ]
        channel_id = anchor[
            "channelId"
        ]

        if (
            channel_id
            not in channel_cache
        ):
            channel_cache[
                channel_id
            ] = get_channel(
                channel_id,
                api_key,
            )

        channel = channel_cache[
            channel_id
        ]
        if (
            channel["channelId"]
            != channel_id
        ):
            raise RuntimeError(
                "Resolved YouTube channel ID mismatch."
            )

        candidates = search_channel(
            target,
            channel_id,
            api_key,
        )

        results.append({
            "canonicalArtistId":
                canonical_id,
            "artist":
                artist,
            "anchor":
                anchor,
            "resolvedChannel":
                channel,
            "query":
                target[
                    "query"
                ],
            "publishedAfter":
                target[
                    "publishedAfter"
                ],
            "candidateCount":
                len(candidates),
            "candidates":
                candidates,
            "reviewState":
                "provider_bound_candidates_unreviewed",
        })

    output = {
        "version":
            VERSION,
        "planVersion":
            plan.get(
                "version"
            ),
        "activationState":
            "review_only_not_seed",
        "targetCount":
            len(results),
        "targets":
            results,
        "activeSeedModified":
            False,
        "productModified":
            False,
        "runtimeModified":
            False,
    }

    OUTPUT_FILE.write_text(
        json.dumps(
            output,
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )

    print(
        "YouTube unresolved channel-bound discovery | "
        f"targets={len(results)}"
    )

    for result in results:
        channel = result[
            "resolvedChannel"
        ]
        print(
            f"{result['canonicalArtistId']} | "
            f"{result['artist']} | "
            f"channel={channel['title']} | "
            f"customUrl={channel['customUrl']} | "
            f"candidates={result['candidateCount']}"
        )

        for row in result[
            "candidates"
        ][:5]:
            print(
                "  - "
                f"{row['videoId']} | "
                f"{row['title']} | "
                f"{row['publishedAt']}"
            )

    print(
        "activeSeedModified: FALSE"
    )
    print(
        "productModified: FALSE"
    )


if __name__ == "__main__":
    main()
