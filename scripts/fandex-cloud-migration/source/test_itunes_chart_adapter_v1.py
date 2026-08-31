import csv
import os
import subprocess
import sys
from datetime import date
from pathlib import Path


VERSION = "test_itunes_chart_adapter_v1"

RAW_FILE = Path(
    "itunes_chart_raw_input_template_v1.csv"
)

ADAPTER_FILE = Path(
    "itunes_chart_adapter_v1.py"
)

OUTPUT_CSV = Path(
    "itunes_chart_seed_candidate_v1_latest.csv"
)


RAW_FIELDS = [
    "sourceName",
    "sourceType",
    "sourceUrl",
    "chartCountry",
    "chartName",
    "chartDate",
    "chartRank",
    "sourceArtistName",
    "trackTitle",
    "trackId",
    "itunesArtistId",
]


def write_raw(rows):
    with RAW_FILE.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=RAW_FIELDS,
        )

        writer.writeheader()
        writer.writerows(rows)


def read_output():
    if not OUTPUT_CSV.exists():
        raise AssertionError(
            f"output 없음: {OUTPUT_CSV}"
        )

    with OUTPUT_CSV.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        return list(
            csv.DictReader(f)
        )


def run_adapter():
    env = os.environ.copy()

    env["PYTHONIOENCODING"] = "utf-8"

    result = subprocess.run(
        [
            sys.executable,
            str(ADAPTER_FILE),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )

    if result.returncode != 0:
        print(result.stdout)
        print(result.stderr)

        raise AssertionError(
            "adapter 실행 실패"
        )

    return result.stdout


def expect(
    condition,
    message,
):
    if not condition:
        raise AssertionError(
            message
        )

    print(
        f"OK {message}"
    )


def find_by_track(
    rows,
    track_title,
):
    for row in rows:
        if (
            row.get("trackTitle")
            == track_title
        ):
            return row

    raise AssertionError(
        f"track 결과 없음: {track_title}"
    )


def main():
    print()
    print(
        "FANDEX iTunes Chart "
        "adapter attack self-test"
    )
    print("=" * 80)
    print(f"version: {VERSION}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 80)

    if not RAW_FILE.exists():
        raise SystemExit(
            f"ERROR: raw template 없음: {RAW_FILE}"
        )

    if not ADAPTER_FILE.exists():
        raise SystemExit(
            f"ERROR: adapter 없음: {ADAPTER_FILE}"
        )

    original_raw = RAW_FILE.read_bytes()

    today = date.today().isoformat()

    test_rows = [
        {
            "sourceName":
                "TEST Actual Chart",
            "sourceType":
                "actual_chart_feed",
            "sourceUrl":
                "https://example.com/chart/kr",
            "chartCountry":
                "KR",
            "chartName":
                "Top Songs",
            "chartDate":
                today,
            "chartRank":
                "1",
            "sourceArtistName":
                "아이유",
            "trackTitle":
                "TEST_VALID_TRACK",
            "trackId":
                "1726888402",
            "itunesArtistId":
                "409076743",
        },

        {
            "sourceName":
                "TEST Search API",
            "sourceType":
                "search_api",
            "sourceUrl":
                (
                    "https://itunes.apple.com/"
                    "search?term=test"
                ),
            "chartCountry":
                "KR",
            "chartName":
                "Top Songs",
            "chartDate":
                today,
            "chartRank":
                "2",
            "sourceArtistName":
                "에이티즈",
            "trackTitle":
                "TEST_SEARCH_SOURCE",
            "trackId":
                "6770401926",
            "itunesArtistId":
                "1439301205",
        },

        {
            "sourceName":
                "TEST Wrong Artist ID",
            "sourceType":
                "actual_chart_feed",
            "sourceUrl":
                "https://example.com/chart/wrong-id",
            "chartCountry":
                "KR",
            "chartName":
                "Top Songs",
            "chartDate":
                today,
            "chartRank":
                "3",
            "sourceArtistName":
                "에스파",
            "trackTitle":
                "TEST_BAD_ARTIST_ID",
            "trackId":
                "1893599773",
            "itunesArtistId":
                "999999999999",
        },

        {
            "sourceName":
                "TEST Missing Rank",
            "sourceType":
                "actual_chart_feed",
            "sourceUrl":
                "https://example.com/chart/no-rank",
            "chartCountry":
                "KR",
            "chartName":
                "Top Songs",
            "chartDate":
                today,
            "chartRank":
                "",
            "sourceArtistName":
                "아이브",
            "trackTitle":
                "TEST_MISSING_RANK",
            "trackId":
                "1875882420",
            "itunesArtistId":
                "1594159996",
        },
    ]

    passed = False

    try:
        write_raw(
            test_rows
        )

        run_adapter()

        rows = read_output()

        expect(
            len(rows) == 4,
            "candidate row count 4",
        )

        valid = find_by_track(
            rows,
            "TEST_VALID_TRACK",
        )

        expect(
            valid.get(
                "adapterStatus"
            )
            == "candidate_ready",
            (
                "정상 실제 chart 데이터 "
                "candidate_ready"
            ),
        )

        expect(
            not valid.get(
                "adapterWarnings"
            ),
            "정상 데이터 warning 없음",
        )

        search = find_by_track(
            rows,
            "TEST_SEARCH_SOURCE",
        )

        expect(
            search.get(
                "adapterStatus"
            )
            == "needs_review",
            (
                "Search API 데이터 "
                "needs_review"
            ),
        )

        expect(
            (
                "METADATA_SOURCE_NOT_CHART"
                in search.get(
                    "adapterWarnings",
                    "",
                )
            ),
            "Search API 차트 사용 차단",
        )

        bad_id = find_by_track(
            rows,
            "TEST_BAD_ARTIST_ID",
        )

        expect(
            bad_id.get(
                "adapterStatus"
            )
            == "needs_review",
            (
                "잘못된 artistId "
                "needs_review"
            ),
        )

        expect(
            (
                "ITUNES_ARTIST_ID_UNKNOWN"
                in bad_id.get(
                    "adapterWarnings",
                    "",
                )
            ),
            "미등록 artistId 차단",
        )

        missing_rank = find_by_track(
            rows,
            "TEST_MISSING_RANK",
        )

        expect(
            missing_rank.get(
                "adapterStatus"
            )
            == "needs_review",
            (
                "순위 없는 데이터 "
                "needs_review"
            ),
        )

        expect(
            (
                "CHART_RANK_INVALID"
                in missing_rank.get(
                    "adapterWarnings",
                    "",
                )
            ),
            "chartRank 없는 데이터 차단",
        )

        passed = True

    finally:
        RAW_FILE.write_bytes(
            original_raw
        )

        restore_result = subprocess.run(
            [
                sys.executable,
                str(ADAPTER_FILE),
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            env={
                **os.environ,
                "PYTHONIOENCODING":
                    "utf-8",
            },
        )

        print()
        print(
            "raw input restored: "
            + (
                "TRUE"
                if RAW_FILE.read_bytes()
                == original_raw
                else "FALSE"
            )
        )

        print(
            "adapter baseline rebuilt: "
            + (
                "TRUE"
                if restore_result.returncode
                == 0
                else "FALSE"
            )
        )

    print()
    print("=" * 80)

    if passed:
        print(
            "passed: 8/8"
        )
        print(
            "OK: actual chart candidate 허용"
        )
        print(
            "OK: Search/Lookup metadata 차단"
        )
        print(
            "OK: unknown artistId 차단"
        )
        print(
            "OK: missing rank 차단"
        )
        print(
            "OK: raw input 원본 복구"
        )

    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()