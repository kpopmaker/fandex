import csv
import json
from datetime import datetime
from pathlib import Path


VERSION = "audit_master_v7_source_presence_v1"

MASTER_FILE = Path(
    "fandex_master_ranking_latest.json"
)

NAVER_FILE = Path(
    "fandex_naver_ranking_v3_latest.json"
)

YOUTUBE_FILE = Path(
    "fandex_youtube_ranking_v3_latest.json"
)

MUSIC_FILE = Path(
    "fandex_music_chart_ranking_v1_latest.json"
)

OUTPUT_CSV = Path(
    "fandex_master_v7_source_presence_audit_v1.csv"
)

OUTPUT_REPORT = Path(
    "FANDEX_MASTER_V7_SOURCE_PRESENCE_AUDIT.txt"
)


def read_json(path):
    if not path.exists():
        raise SystemExit(
            f"ERROR: 파일이 없습니다: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
    ) as f:
        return json.load(f)


def safe_float(value):
    try:
        if value in [None, ""]:
            return 0.0

        return float(
            str(value)
            .replace(",", "")
            .strip()
        )

    except (TypeError, ValueError):
        return 0.0


def extract_rows(payload):
    if isinstance(payload, list):
        return [
            row
            for row in payload
            if isinstance(row, dict)
        ]

    if not isinstance(payload, dict):
        return []

    for key in [
        "ranking",
        "rankings",
        "artists",
        "items",
        "results",
        "data",
    ]:
        value = payload.get(key)

        if isinstance(value, list):
            return [
                row
                for row in value
                if isinstance(row, dict)
            ]

    return []


def get_artist(row):
    for key in [
        "artist",
        "artistName",
        "name",
    ]:
        value = str(
            row.get(key)
            or ""
        ).strip()

        if value:
            return value

    return ""


def make_map(payload):
    result = {}

    for row in extract_rows(payload):
        artist = get_artist(row)

        if not artist:
            continue

        if artist in result:
            raise SystemExit(
                f"ERROR: artist 중복: {artist}"
            )

        result[artist] = row

    return result


def direct_score(row, source_type):
    if not row:
        return 0.0

    if source_type == "naver":
        keys = [
            "fandexNaverFinalPoint",
            "fandexNaverPoint",
            "fandexNaverScore",
            "naverFinalPoint",
            "naverPoint",
            "naverScore",
            "naverTotalPoint",
            "cumulativePoint",
            "totalPoint",
            "finalPoint",
            "score",
            "fandexFinalPoint",
        ]

        source_key = "naver"

    elif source_type == "youtube":
        keys = [
            "youtubePoint",
            "youtubeFinalPoint",
            "youtubeScore",
            "cumulativePoint",
            "totalPoint",
            "score",
        ]

        source_key = "youtube"

    elif source_type == "music":
        keys = [
            "fandexMusicChartFinalPoint",
            "musicChartFinalPoint",
            "musicChartPoint",
            "musicPoint",
            "musicScore",
            "chartPoint",
            "cumulativePoint",
            "totalPoint",
            "score",
        ]

        source_key = "musicChart"

    else:
        return 0.0

    for key in keys:
        if (
            key in row
            and row.get(key)
            not in [None, ""]
        ):
            return safe_float(
                row.get(key)
            )

    source_points = (
        row.get("sourcePoints")
        or {}
    )

    source = (
        source_points.get(source_key)
        or {}
    )

    for key in [
        "cumulativePoint",
        "point",
        "score",
        "totalPoint",
    ]:
        if (
            key in source
            and source.get(key)
            not in [None, ""]
        ):
            return safe_float(
                source.get(key)
            )

    return 0.0


def master_source_score(
    master_row,
    source_key,
):
    source_points = (
        master_row.get("sourcePoints")
        or {}
    )

    source = (
        source_points.get(source_key)
        or {}
    )

    for key in [
        "cumulativePoint",
        "point",
        "score",
        "totalPoint",
    ]:
        if (
            key in source
            and source.get(key)
            not in [None, ""]
        ):
            return safe_float(
                source.get(key)
            )

    return 0.0


def master_total(row):
    for key in [
        "fandexFinalPoint",
        "fandexPoint",
        "masterPoint",
        "totalPoint",
        "finalPoint",
        "cumulativePoint",
        "score",
    ]:
        if (
            key in row
            and row.get(key)
            not in [None, ""]
        ):
            return safe_float(
                row.get(key)
            )

    return 0.0


def bool_text(value):
    return (
        "TRUE"
        if value
        else "FALSE"
    )


def main():
    master_payload = read_json(
        MASTER_FILE
    )

    naver_payload = read_json(
        NAVER_FILE
    )

    youtube_payload = read_json(
        YOUTUBE_FILE
    )

    music_payload = read_json(
        MUSIC_FILE
    )

    master_map = make_map(
        master_payload
    )

    naver_map = make_map(
        naver_payload
    )

    youtube_map = make_map(
        youtube_payload
    )

    music_map = make_map(
        music_payload
    )

    master_rows = extract_rows(
        master_payload
    )

    artist_order = [
        get_artist(row)
        for row in master_rows
        if get_artist(row)
    ]

    if len(artist_order) != 10:
        raise SystemExit(
            "ERROR: Master artist count가 "
            f"10이 아닙니다: {len(artist_order)}"
        )

    print()
    print(
        "FANDEX Master v7 "
        "source presence audit"
    )
    print("=" * 88)
    print(f"version: {VERSION}")
    print(
        "rule: latest source에 artist가 "
        "있으면 0점도 latest 사용"
    )
    print(
        "fallback: artist 자체가 없을 때만 "
        "previous Master 사용"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 88)

    audit_rows = []

    for artist in artist_order:
        master_row = master_map[artist]

        previous_naver = (
            master_source_score(
                master_row,
                "naver",
            )
        )

        previous_youtube = (
            master_source_score(
                master_row,
                "youtube",
            )
        )

        previous_music = (
            master_source_score(
                master_row,
                "musicChart",
            )
        )

        previous_total = (
            master_total(master_row)
        )

        naver_present = (
            artist in naver_map
        )

        youtube_present = (
            artist in youtube_map
        )

        music_present = (
            artist in music_map
        )

        naver_latest = direct_score(
            naver_map.get(artist),
            "naver",
        )

        youtube_latest = direct_score(
            youtube_map.get(artist),
            "youtube",
        )

        music_latest = direct_score(
            music_map.get(artist),
            "music",
        )

        expected_naver = (
            naver_latest
            if naver_present
            else previous_naver
        )

        expected_youtube = (
            youtube_latest
            if youtube_present
            else previous_youtube
        )

        expected_music = (
            music_latest
            if music_present
            else previous_music
        )

        expected_total = round(
            expected_naver
            + expected_youtube
            + expected_music,
            2,
        )

        delta = round(
            expected_total
            - previous_total,
            2,
        )

        would_change = (
            abs(delta) >= 0.01
        )

        row = {
            "artist": artist,

            "naverPresent":
                bool_text(naver_present),

            "youtubePresent":
                bool_text(youtube_present),

            "musicPresent":
                bool_text(music_present),

            "naverLatest":
                round(naver_latest, 2),

            "youtubeLatest":
                round(youtube_latest, 2),

            "musicLatest":
                round(music_latest, 2),

            "previousNaver":
                round(previous_naver, 2),

            "previousYoutube":
                round(previous_youtube, 2),

            "previousMusic":
                round(previous_music, 2),

            "previousTotal":
                round(previous_total, 2),

            "expectedNaver":
                round(expected_naver, 2),

            "expectedYoutube":
                round(expected_youtube, 2),

            "expectedMusic":
                round(expected_music, 2),

            "expectedTotal":
                expected_total,

            "delta":
                delta,

            "wouldChange":
                bool_text(would_change),

            "naverZeroPresent":
                bool_text(
                    naver_present
                    and naver_latest == 0
                ),

            "youtubeZeroPresent":
                bool_text(
                    youtube_present
                    and youtube_latest == 0
                ),

            "musicZeroPresent":
                bool_text(
                    music_present
                    and music_latest == 0
                ),
        }

        audit_rows.append(row)

        status = (
            "CHANGE"
            if would_change
            else "SAME"
        )

        print(
            f"{artist} | "
            f"N={'Y' if naver_present else 'N'} "
            f"{expected_naver:.2f} | "
            f"Y={'Y' if youtube_present else 'N'} "
            f"{expected_youtube:.2f} | "
            f"M={'Y' if music_present else 'N'} "
            f"{expected_music:.2f} | "
            f"{previous_total:.2f}"
            f" -> {expected_total:.2f} | "
            f"{status}"
        )

    fieldnames = list(
        audit_rows[0].keys()
    )

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
            audit_rows
        )

    naver_present_count = sum(
        row["naverPresent"] == "TRUE"
        for row in audit_rows
    )

    youtube_present_count = sum(
        row["youtubePresent"] == "TRUE"
        for row in audit_rows
    )

    music_present_count = sum(
        row["musicPresent"] == "TRUE"
        for row in audit_rows
    )

    change_rows = [
        row
        for row in audit_rows
        if row["wouldChange"] == "TRUE"
    ]

    zero_present_rows = [
        row
        for row in audit_rows
        if (
            row["naverZeroPresent"]
            == "TRUE"
            or row["youtubeZeroPresent"]
            == "TRUE"
            or row["musicZeroPresent"]
            == "TRUE"
        )
    ]

    report = []

    report.append(
        "FANDEX Master v7 "
        "Source Presence Audit"
    )

    report.append("=" * 88)

    report.append(
        "createdAt: "
        + datetime.now().isoformat(
            timespec="seconds"
        )
    )

    report.append(
        f"version: {VERSION}"
    )

    report.append("")

    report.append(
        f"Naver present: "
        f"{naver_present_count}/10"
    )

    report.append(
        f"YouTube present: "
        f"{youtube_present_count}/10"
    )

    report.append(
        f"Music present: "
        f"{music_present_count}/10"
    )

    report.append(
        f"zeroPresent count: "
        f"{len(zero_present_rows)}"
    )

    report.append(
        f"wouldChange count: "
        f"{len(change_rows)}"
    )

    report.append("")

    for row in audit_rows:
        report.append(
            f"{row['artist']} | "
            f"previous={row['previousTotal']} | "
            f"expected={row['expectedTotal']} | "
            f"delta={row['delta']} | "
            f"change={row['wouldChange']} | "
            f"N={row['naverPresent']} | "
            f"Y={row['youtubePresent']} | "
            f"M={row['musicPresent']}"
        )

    report.append("")
    report.append(
        "masterModified: FALSE"
    )
    report.append(
        "websiteModified: FALSE"
    )

    OUTPUT_REPORT.write_text(
        "\n".join(report),
        encoding="utf-8",
    )

    print()
    print("=" * 88)
    print(
        f"Naver present: "
        f"{naver_present_count}/10"
    )
    print(
        f"YouTube present: "
        f"{youtube_present_count}/10"
    )
    print(
        f"Music present: "
        f"{music_present_count}/10"
    )
    print(
        f"zeroPresent count: "
        f"{len(zero_present_rows)}"
    )
    print(
        f"wouldChange count: "
        f"{len(change_rows)}"
    )
    print(
        f"CSV: {OUTPUT_CSV}"
    )
    print(
        f"report: {OUTPUT_REPORT}"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()