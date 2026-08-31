import csv
import json
from collections import defaultdict
from datetime import datetime
from pathlib import Path


VERSION = "music_chart_v2_promotion_readiness_v1"

MUSIC_V1_FILE = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

MUSIC_V2_FILE = Path(
    "fandex_music_chart_ranking_v2_current_presence_latest.json"
)

MUSIC_V2_HISTORY_FILE = Path(
    "music_chart_current_presence_history_v2.csv"
)

MASTER_V7_FILE = Path(
    "fandex_master_ranking_latest.json"
)

OUTPUT_JSON = Path(
    "music_chart_v2_promotion_readiness_latest.json"
)

OUTPUT_CSV = Path(
    "music_chart_v2_promotion_readiness_latest.csv"
)

OUTPUT_REPORT = Path(
    "MUSIC_CHART_V2_PROMOTION_READINESS_REPORT.txt"
)


MIN_SNAPSHOTS_READY = 7
MIN_LATEST_RANKED_PLATFORMS = 18

LARGE_SCORE_JUMP = 100.0
LARGE_RANK_CHANGE = 3

MAX_ZERO_ARTISTS = 3


def norm(value):
    if value is None:
        return ""
    return str(value).strip()


def num(value, default=0.0):
    try:
        if value in [None, ""]:
            return default
        return float(value)
    except Exception:
        return default


def integer(value, default=0):
    try:
        if value in [None, ""]:
            return default
        return int(float(value))
    except Exception:
        return default


def read_json(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing required file: {path}"
        )

    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def read_csv(path):
    if not path.exists():
        raise RuntimeError(
            f"Missing required file: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        return list(
            csv.DictReader(f)
        )


def ranking_rows(payload):
    rows = payload.get(
        "ranking",
        []
    )

    if not isinstance(rows, list):
        return []

    return [
        row
        for row in rows
        if isinstance(row, dict)
    ]


def artist_name(row):
    return norm(
        row.get("artist")
        or row.get("artistName")
        or row.get("name")
    )


def music_point(row):
    return num(
        row.get(
            "fandexMusicChartFinalPoint",
            row.get(
                "musicV2Point",
                row.get(
                    "score",
                    0,
                ),
            ),
        )
    )


def master_point(row):
    for key in [
        "fandexFinalPoint",
        "fandexPoint",
        "finalPoint",
        "score",
    ]:
        if key in row:
            return num(
                row.get(key)
            )

    return 0.0


def build_map(rows):
    result = {}

    for row in rows:
        artist = artist_name(row)

        if artist:
            result[artist] = row

    return result


def rank_scores(score_map):
    ordered = sorted(
        score_map.items(),
        key=lambda item: (
            -item[1],
            item[0],
        ),
    )

    result = {}

    for index, (
        artist,
        score,
    ) in enumerate(
        ordered,
        start=1,
    ):
        result[artist] = {
            "rank": index,
            "score": round(
                score,
                2,
            ),
        }

    return result


def history_date(row):
    return norm(
        row.get("snapshotDate")
        or row.get("checkDate")
        or row.get("date")
    )


def history_artist(row):
    return norm(
        row.get("artist")
        or row.get("artistName")
    )


def history_point(row):
    return num(
        row.get(
            "musicV2Point",
            row.get(
                "fandexMusicChartFinalPoint",
                row.get(
                    "score",
                    0,
                ),
            ),
        )
    )


def history_platform_count(row):
    return integer(
        row.get(
            "rankedPlatformCount",
            0,
        )
    )


def main():
    created_at = datetime.now().isoformat(
        timespec="seconds"
    )

    v1_payload = read_json(
        MUSIC_V1_FILE
    )

    v2_payload = read_json(
        MUSIC_V2_FILE
    )

    master_payload = read_json(
        MASTER_V7_FILE
    )

    history_rows = read_csv(
        MUSIC_V2_HISTORY_FILE
    )


    v1_rows = ranking_rows(
        v1_payload
    )

    v2_rows = ranking_rows(
        v2_payload
    )

    master_rows = ranking_rows(
        master_payload
    )


    v1_map = build_map(
        v1_rows
    )

    v2_map = build_map(
        v2_rows
    )

    master_map = build_map(
        master_rows
    )


    all_artists = sorted(
        set(master_map)
        | set(v1_map)
        | set(v2_map)
    )


    # ========================================================
    # History 구조
    # ========================================================

    by_date = defaultdict(list)
    history_keys = set()

    duplicate_count = 0


    for row in history_rows:
        date = history_date(
            row
        )

        artist = history_artist(
            row
        )

        if not date or not artist:
            continue

        key = (
            date,
            artist,
        )

        if key in history_keys:
            duplicate_count += 1

        history_keys.add(
            key
        )

        by_date[date].append(
            row
        )


    snapshot_dates = sorted(
        by_date.keys()
    )

    snapshot_count = len(
        snapshot_dates
    )


    complete_snapshot_count = 0

    for date in snapshot_dates:
        artists = {
            history_artist(row)
            for row in by_date[date]
            if history_artist(row)
        }

        if len(artists) == 10:
            complete_snapshot_count += 1


    latest_snapshot_date = norm(
        v2_payload.get(
            "snapshotDate"
        )
    )

    if not latest_snapshot_date:
        latest_snapshot_date = (
            snapshot_dates[-1]
            if snapshot_dates
            else ""
        )


    # ========================================================
    # 최신 Music v2 상태
    # ========================================================

    latest_ranked_platform_count = sum(
        integer(
            row.get(
                "rankedPlatformCount",
                0,
            )
        )
        for row in v2_rows
    )


    zero_artists = [
        artist
        for artist, row in v2_map.items()
        if abs(
            music_point(row)
        ) <= 1e-9
    ]


    # ========================================================
    # v1 ↔ v2 비교
    # ========================================================

    comparison_rows = []

    large_score_jump_artists = []


    current_master_scores = {
        artist: master_point(
            row
        )
        for artist, row in master_map.items()
    }


    proposed_master_scores = {}


    for artist in all_artists:
        v1_point = music_point(
            v1_map.get(
                artist,
                {}
            )
        )

        v2_point = music_point(
            v2_map.get(
                artist,
                {}
            )
        )

        current_master = current_master_scores.get(
            artist,
            0.0,
        )

        proposed_master = (
            current_master
            - v1_point
            + v2_point
        )

        proposed_master_scores[
            artist
        ] = proposed_master


        delta = (
            v2_point
            - v1_point
        )

        if abs(delta) >= LARGE_SCORE_JUMP:
            large_score_jump_artists.append(
                artist
            )


        comparison_rows.append(
            {
                "artist": artist,
                "musicV1Point": round(
                    v1_point,
                    2,
                ),
                "musicV2Point": round(
                    v2_point,
                    2,
                ),
                "musicDelta": round(
                    delta,
                    2,
                ),
                "currentMasterV7Point": round(
                    current_master,
                    2,
                ),
                "proposedMasterWithMusicV2": round(
                    proposed_master,
                    2,
                ),
                "masterDelta": round(
                    proposed_master
                    - current_master,
                    2,
                ),
            }
        )


    current_ranking = rank_scores(
        current_master_scores
    )

    proposed_ranking = rank_scores(
        proposed_master_scores
    )


    large_rank_change_artists = []


    for row in comparison_rows:
        artist = row[
            "artist"
        ]

        old_rank = (
            current_ranking.get(
                artist,
                {}
            ).get(
                "rank",
                0,
            )
        )

        new_rank = (
            proposed_ranking.get(
                artist,
                {}
            ).get(
                "rank",
                0,
            )
        )

        rank_change = (
            old_rank
            - new_rank
        )

        row[
            "currentMasterRank"
        ] = old_rank

        row[
            "proposedMasterRank"
        ] = new_rank

        row[
            "rankChange"
        ] = rank_change


        if abs(
            rank_change
        ) >= LARGE_RANK_CHANGE:
            large_rank_change_artists.append(
                artist
            )


    # ========================================================
    # History 변동성
    # ========================================================

    artist_history = defaultdict(
        list
    )


    for row in history_rows:
        date = history_date(
            row
        )

        artist = history_artist(
            row
        )

        if not date or not artist:
            continue

        artist_history[
            artist
        ].append(
            {
                "date": date,
                "point": history_point(
                    row
                ),
                "rankedPlatformCount":
                    history_platform_count(
                        row
                    ),
            }
        )


    volatility_rows = []


    for artist in all_artists:
        rows = sorted(
            artist_history.get(
                artist,
                []
            ),
            key=lambda row: row[
                "date"
            ],
        )

        points = [
            row["point"]
            for row in rows
        ]

        platform_counts = [
            row["rankedPlatformCount"]
            for row in rows
        ]


        if points:
            point_min = min(
                points
            )
            point_max = max(
                points
            )
            point_range = (
                point_max
                - point_min
            )
        else:
            point_min = 0.0
            point_max = 0.0
            point_range = 0.0


        volatility_rows.append(
            {
                "artist": artist,
                "snapshotCount":
                    len(rows),
                "pointMin": round(
                    point_min,
                    2,
                ),
                "pointMax": round(
                    point_max,
                    2,
                ),
                "pointRange": round(
                    point_range,
                    2,
                ),
                "platformCountMin":
                    min(
                        platform_counts
                    )
                    if platform_counts
                    else 0,
                "platformCountMax":
                    max(
                        platform_counts
                    )
                    if platform_counts
                    else 0,
            }
        )


    # ========================================================
    # 승격 판정
    # ========================================================

    blockers = []
    warnings = []


    if snapshot_count < MIN_SNAPSHOTS_READY:
        blockers.append(
            "insufficient_history:"
            f"{snapshot_count}/"
            f"{MIN_SNAPSHOTS_READY}"
        )


    if (
        complete_snapshot_count
        != snapshot_count
    ):
        blockers.append(
            "incomplete_history_snapshots:"
            f"{complete_snapshot_count}/"
            f"{snapshot_count}"
        )


    if duplicate_count > 0:
        blockers.append(
            "history_duplicates:"
            f"{duplicate_count}"
        )


    if len(v2_map) != 10:
        blockers.append(
            "latest_artist_count:"
            f"{len(v2_map)}/10"
        )


    if (
        latest_ranked_platform_count
        < MIN_LATEST_RANKED_PLATFORMS
    ):
        blockers.append(
            "latest_platform_coverage:"
            f"{latest_ranked_platform_count}/30"
        )


    if (
        len(zero_artists)
        > MAX_ZERO_ARTISTS
    ):
        warnings.append(
            "zero_artist_count:"
            f"{len(zero_artists)}"
        )


    if large_score_jump_artists:
        warnings.append(
            "large_music_score_jump:"
            + ",".join(
                large_score_jump_artists
            )
        )


    if large_rank_change_artists:
        warnings.append(
            "large_master_rank_change:"
            + ",".join(
                large_rank_change_artists
            )
        )


    if blockers:
        status = "HOLD"

    elif warnings:
        status = "REVIEW"

    else:
        status = "READY"


    # ========================================================
    # JSON
    # ========================================================

    output_payload = {
        "version": VERSION,
        "createdAt": created_at,

        "purpose":
            "evaluate Music v2 readiness "
            "for future production promotion",

        "decision": status,

        "policy": {
            "minSnapshotsReady":
                MIN_SNAPSHOTS_READY,

            "minLatestRankedPlatforms":
                MIN_LATEST_RANKED_PLATFORMS,

            "maxZeroArtists":
                MAX_ZERO_ARTISTS,

            "largeScoreJumpThreshold":
                LARGE_SCORE_JUMP,

            "largeRankChangeThreshold":
                LARGE_RANK_CHANGE,
        },

        "history": {
            "snapshotCount":
                snapshot_count,

            "snapshotDates":
                snapshot_dates,

            "completeSnapshotCount":
                complete_snapshot_count,

            "duplicateCount":
                duplicate_count,

            "latestSnapshotDate":
                latest_snapshot_date,
        },

        "latestMusicV2": {
            "artistCount":
                len(v2_map),

            "rankedPlatformCount":
                latest_ranked_platform_count,

            "zeroArtistCount":
                len(zero_artists),

            "zeroArtists":
                zero_artists,
        },

        "riskSignals": {
            "blockers":
                blockers,

            "warnings":
                warnings,

            "largeScoreJumpArtists":
                large_score_jump_artists,

            "largeRankChangeArtists":
                large_rank_change_artists,
        },

        "comparison":
            comparison_rows,

        "volatility":
            volatility_rows,

        "productionV7Modified":
            False,

        "musicV1Modified":
            False,

        "musicV2Modified":
            False,

        "websiteModified":
            False,
    }


    OUTPUT_JSON.write_text(
        json.dumps(
            output_payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


    # ========================================================
    # CSV
    # ========================================================

    fieldnames = [
        "artist",
        "musicV1Point",
        "musicV2Point",
        "musicDelta",
        "currentMasterRank",
        "proposedMasterRank",
        "rankChange",
        "currentMasterV7Point",
        "proposedMasterWithMusicV2",
        "masterDelta",
    ]


    with OUTPUT_CSV.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:

        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
        )

        writer.writeheader()

        writer.writerows(
            comparison_rows
        )


    # ========================================================
    # Report
    # ========================================================

    lines = []

    lines.append(
        "FANDEX Music v2 Promotion Readiness v1"
    )

    lines.append(
        "=" * 84
    )

    lines.append(
        f"version: {VERSION}"
    )

    lines.append(
        f"createdAt: {created_at}"
    )

    lines.append(
        f"decision: {status}"
    )

    lines.append(
        "productionV7Modified: FALSE"
    )

    lines.append(
        "musicV1Modified: FALSE"
    )

    lines.append(
        "musicV2Modified: FALSE"
    )

    lines.append(
        "websiteModified: FALSE"
    )

    lines.append(
        "=" * 84
    )

    lines.append("")
    lines.append(
        "Readiness summary"
    )

    lines.append(
        "-" * 84
    )

    lines.append(
        "Music v2 history: "
        f"{snapshot_count}/"
        f"{MIN_SNAPSHOTS_READY} "
        "required snapshots"
    )

    lines.append(
        "complete snapshots: "
        f"{complete_snapshot_count}/"
        f"{snapshot_count}"
    )

    lines.append(
        "latest Music v2 artists: "
        f"{len(v2_map)}/10"
    )

    lines.append(
        "latest platform coverage: "
        f"{latest_ranked_platform_count}/30"
    )

    lines.append(
        "latest zero artists: "
        f"{len(zero_artists)}"
    )

    if zero_artists:
        lines.append(
            "zero artist names: "
            + ", ".join(
                zero_artists
            )
        )

    lines.append(
        "history duplicate count: "
        f"{duplicate_count}"
    )


    lines.append("")
    lines.append(
        "Blockers"
    )

    lines.append(
        "-" * 84
    )

    if blockers:
        for item in blockers:
            lines.append(
                f"- {item}"
            )
    else:
        lines.append(
            "NONE"
        )


    lines.append("")
    lines.append(
        "Warnings"
    )

    lines.append(
        "-" * 84
    )

    if warnings:
        for item in warnings:
            lines.append(
                f"- {item}"
            )
    else:
        lines.append(
            "NONE"
        )


    lines.append("")
    lines.append(
        "Music v1 -> Music v2 impact"
    )

    lines.append(
        "-" * 84
    )


    comparison_sorted = sorted(
        comparison_rows,
        key=lambda row: (
            row[
                "proposedMasterRank"
            ]
        ),
    )


    for row in comparison_sorted:
        lines.append(
            f"{row['artist']} | "
            f"Music "
            f"{row['musicV1Point']:.2f}"
            f" -> "
            f"{row['musicV2Point']:.2f}"
            f" | Δ "
            f"{row['musicDelta']:+.2f}"
            f" | Master rank "
            f"{row['currentMasterRank']}"
            f" -> "
            f"{row['proposedMasterRank']}"
            f" | rankChange "
            f"{row['rankChange']:+d}"
        )


    lines.append("")
    lines.append(
        "=" * 84
    )

    if status == "HOLD":
        lines.append(
            "HOLD: "
            "production 승격 금지. "
            "Music v2 병렬 수집을 계속합니다."
        )

    elif status == "REVIEW":
        lines.append(
            "REVIEW: "
            "필수 데이터 기간은 충족했지만 "
            "점수/순위 영향 검토가 필요합니다."
        )

    else:
        lines.append(
            "READY: "
            "자동 기준상 production 승격 검토 가능."
        )

    lines.append(
        "=" * 84
    )


    OUTPUT_REPORT.write_text(
        "\n".join(
            lines
        )
        + "\n",
        encoding="utf-8",
    )


    # ========================================================
    # Console
    # ========================================================

    print()
    print(
        "FANDEX Music v2 "
        "Promotion Readiness v1"
    )

    print(
        "=" * 84
    )

    print(
        f"decision: {status}"
    )

    print(
        "historySnapshots: "
        f"{snapshot_count}/"
        f"{MIN_SNAPSHOTS_READY}"
    )

    print(
        "completeSnapshots: "
        f"{complete_snapshot_count}/"
        f"{snapshot_count}"
    )

    print(
        "latestArtistCount: "
        f"{len(v2_map)}/10"
    )

    print(
        "latestRankedPlatforms: "
        f"{latest_ranked_platform_count}/30"
    )

    print(
        "zeroArtistCount: "
        f"{len(zero_artists)}"
    )

    print(
        "largeScoreJumpCount: "
        f"{len(large_score_jump_artists)}"
    )

    print(
        "largeRankChangeCount: "
        f"{len(large_rank_change_artists)}"
    )

    print()


    if blockers:
        print(
            "BLOCKERS"
        )

        for item in blockers:
            print(
                f"- {item}"
            )

        print()


    if warnings:
        print(
            "WARNINGS"
        )

        for item in warnings:
            print(
                f"- {item}"
            )

        print()


    print(
        f"json: {OUTPUT_JSON}"
    )

    print(
        f"csv: {OUTPUT_CSV}"
    )

    print(
        f"report: {OUTPUT_REPORT}"
    )

    print(
        "productionV7Modified: FALSE"
    )

    print(
        "musicV1Modified: FALSE"
    )

    print(
        "musicV2Modified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )

    print(
        "=" * 84
    )


if __name__ == "__main__":
    main()