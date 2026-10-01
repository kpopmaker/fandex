from __future__ import annotations

import csv
import json
from pathlib import Path


VERSION = "youtube_build_reviewed_seed_candidate_v1"

DISCOVERY_FILE = Path(
    "fandex_youtube_seed_candidates_latest.json"
)
DECISIONS_FILE = Path(
    "data/fandex-cloud-v10/seed/"
    "youtube_v3_seed_review_decisions_v1.json"
)
OUTPUT_CSV = Path(
    "youtube_seed_videos_candidate_v1.csv"
)
OUTPUT_JSON = Path(
    "youtube_seed_videos_candidate_v1.json"
)

FIELDS = [
    "canonicalArtistId",
    "artist",
    "videoId",
    "sourceUrl",
    "videoType",
    "memo",
]


def norm(value):
    return "" if value is None else str(value).strip()


def read_json(path):
    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def write_csv(path, rows):
    with path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=FIELDS,
        )
        writer.writeheader()
        writer.writerows(rows)


def build_candidate(
    discovery,
    decisions,
):
    rows = discovery.get("candidates")
    reviews = decisions.get("reviews")

    if not isinstance(rows, list):
        raise RuntimeError(
            "YouTube discovery candidates missing."
        )
    if not isinstance(reviews, list):
        raise RuntimeError(
            "YouTube review ledger missing reviews."
        )

    by_pair = {}
    for row in rows:
        canonical_id = norm(
            row.get("canonicalArtistId")
        )
        artist = norm(
            row.get("artist")
        )
        video_id = norm(
            row.get("videoId")
        )

        if (
            not canonical_id
            or not artist
            or not video_id
        ):
            raise RuntimeError(
                "Invalid YouTube discovery identity row."
            )

        key = (
            canonical_id,
            video_id,
        )
        if key in by_pair:
            raise RuntimeError(
                "Duplicate YouTube discovery candidate: "
                f"{canonical_id}/{video_id}"
            )
        by_pair[key] = row

    seen_review_ids = set()
    approved_owner = {}
    output_rows = []
    covered_ids = []
    unresolved_ids = []

    for review in reviews:
        canonical_id = norm(
            review.get("canonicalArtistId")
        )
        artist = norm(
            review.get("artist")
        )

        if (
            not canonical_id
            or not artist
            or canonical_id in seen_review_ids
        ):
            raise RuntimeError(
                "Invalid or duplicate YouTube review identity: "
                + canonical_id
            )
        seen_review_ids.add(
            canonical_id
        )

        groups = {}
        for field in [
            "approved",
            "rejected",
            "needsReview",
        ]:
            values = [
                norm(value)
                for value in review.get(
                    field,
                    [],
                )
                if norm(value)
            ]
            if len(values) != len(set(values)):
                raise RuntimeError(
                    "Duplicate YouTube review videoId in "
                    f"{canonical_id}/{field}"
                )
            groups[field] = set(values)

        if (
            groups["approved"]
            & groups["rejected"]
            or groups["approved"]
            & groups["needsReview"]
            or groups["rejected"]
            & groups["needsReview"]
        ):
            raise RuntimeError(
                "Overlapping YouTube review states: "
                + canonical_id
            )

        for field, values in groups.items():
            for video_id in values:
                candidate = by_pair.get(
                    (
                        canonical_id,
                        video_id,
                    )
                )
                if candidate is None:
                    raise RuntimeError(
                        "Reviewed YouTube candidate not found "
                        "in discovery evidence: "
                        f"{canonical_id}/{video_id}/{field}"
                    )
                if norm(
                    candidate.get("artist")
                ) != artist:
                    raise RuntimeError(
                        "YouTube review artist mismatch: "
                        f"{canonical_id}/{video_id}"
                    )

        if groups["approved"]:
            covered_ids.append(
                canonical_id
            )
        else:
            unresolved_ids.append(
                canonical_id
            )

        for video_id in sorted(
            groups["approved"]
        ):
            previous_owner = (
                approved_owner.get(
                    video_id
                )
            )
            if (
                previous_owner
                and previous_owner
                != canonical_id
            ):
                raise RuntimeError(
                    "Approved YouTube video assigned to "
                    "multiple canonical artists: "
                    f"{video_id} / "
                    f"{previous_owner} / {canonical_id}"
                )
            approved_owner[
                video_id
            ] = canonical_id

            candidate = by_pair[
                (
                    canonical_id,
                    video_id,
                )
            ]
            source_url = norm(
                candidate.get("sourceUrl")
                or candidate.get("videoUrl")
                or candidate.get("url")
            )
            video_type = norm(
                candidate.get("videoType")
                or candidate.get("type")
            )

            if not source_url or not video_type:
                raise RuntimeError(
                    "Approved YouTube candidate missing "
                    f"source fields: {canonical_id}/{video_id}"
                )

            output_rows.append({
                "canonicalArtistId":
                    canonical_id,
                "artist":
                    artist,
                "videoId":
                    video_id,
                "sourceUrl":
                    source_url,
                "videoType":
                    video_type,
                "memo":
                    (
                        "reviewed_seed_candidate_v1;"
                        f" sourceRun={decisions.get('sourceRunId')};"
                        f" candidateScore={candidate.get('candidateScore')}"
                    ),
            })

    output_rows.sort(
        key=lambda row: (
            row["canonicalArtistId"],
            row["videoId"],
        )
    )

    return {
        "rows":
            output_rows,
        "targetArtistCount":
            len(reviews),
        "coveredArtistCount":
            len(covered_ids),
        "unresolvedArtistCount":
            len(unresolved_ids),
        "approvedVideoCount":
            len(output_rows),
        "coveredCanonicalArtistIds":
            sorted(covered_ids),
        "unresolvedCanonicalArtistIds":
            sorted(unresolved_ids),
    }


def main():
    discovery = read_json(
        DISCOVERY_FILE
    )
    decisions = read_json(
        DECISIONS_FILE
    )

    result = build_candidate(
        discovery,
        decisions,
    )

    write_csv(
        OUTPUT_CSV,
        result["rows"],
    )

    payload = {
        "version":
            VERSION,
        "sourceDiscoveryVersion":
            discovery.get("version"),
        "sourceRunId":
            decisions.get("sourceRunId"),
        "reviewDecisionVersion":
            decisions.get("version"),
        "activationState":
            "candidate_only_not_active",
        "targetArtistCount":
            result["targetArtistCount"],
        "coveredArtistCount":
            result["coveredArtistCount"],
        "unresolvedArtistCount":
            result["unresolvedArtistCount"],
        "approvedVideoCount":
            result["approvedVideoCount"],
        "coveredCanonicalArtistIds":
            result[
                "coveredCanonicalArtistIds"
            ],
        "unresolvedCanonicalArtistIds":
            result[
                "unresolvedCanonicalArtistIds"
            ],
        "activeSeedModified":
            False,
        "productModified":
            False,
        "runtimeModified":
            False,
        "output":
            str(OUTPUT_CSV),
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
        "YouTube reviewed seed candidate | "
        f"targets={payload['targetArtistCount']} | "
        f"covered={payload['coveredArtistCount']} | "
        f"unresolved={payload['unresolvedArtistCount']} | "
        f"videos={payload['approvedVideoCount']}"
    )
    print(
        "unresolved: "
        + ", ".join(
            payload[
                "unresolvedCanonicalArtistIds"
            ]
        )
    )
    print(
        "activeSeedModified: FALSE"
    )
    print(
        "productModified: FALSE"
    )


if __name__ == "__main__":
    main()
