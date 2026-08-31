import csv
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path

import requests


VERSION = "itunes_collect_track_metadata_v2_approved_id_lookup"
LOOKUP_URL = "https://itunes.apple.com/lookup"

SEED_FILE = Path("itunes_track_seed_v2.csv")

LATEST_CSV = Path("itunes_track_metadata_v2_latest.csv")
LATEST_JSON = Path("fandex_itunes_track_metadata_v2_latest.json")
LATEST_REPORT = Path("FANDEX_ITUNES_COLLECTOR_V2_REPORT.txt")


FIELDNAMES = [
    "artist",
    "seedTrackTitle",
    "country",
    "approvedArtistId",
    "approvedTrackId",
    "approvedITunesArtistName",
    "approvedITunesTrackName",
    "validationStatus",
    "validationWarnings",
    "trackIdMatch",
    "artistIdMatch",
    "artistNameMatch",
    "trackNameMatch",
    "itunesArtistName",
    "itunesTrackName",
    "collectionName",
    "releaseDate",
    "primaryGenreName",
    "artistId",
    "collectionId",
    "trackId",
    "trackNumber",
    "trackCount",
    "discNumber",
    "discCount",
    "trackTimeMillis",
    "countryStore",
    "currency",
    "trackPrice",
    "collectionPrice",
    "isStreamable",
    "explicitness",
    "previewUrl",
    "artistViewUrl",
    "collectionViewUrl",
    "trackViewUrl",
    "approvalSource",
    "memo",
    "collectedAt",
]


def normalize_text(value):
    text = str(value or "").casefold()
    text = re.sub(r"[^0-9a-z가-힣]+", "", text)
    return text


def loosely_matches(left, right):
    left_normalized = normalize_text(left)
    right_normalized = normalize_text(right)

    if not left_normalized or not right_normalized:
        return False

    if left_normalized == right_normalized:
        return True

    return (
        left_normalized in right_normalized
        or right_normalized in left_normalized
    )


def read_seed_rows():
    if not SEED_FILE.exists():
        raise SystemExit(
            f"ERROR: seed 파일이 없습니다: {SEED_FILE}"
        )

    with SEED_FILE.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        rows = list(csv.DictReader(file))

    if len(rows) != 10:
        raise SystemExit(
            f"ERROR: seed 행 수가 10개가 아닙니다: {len(rows)}"
        )

    required_fields = [
        "artist",
        "approvedArtistId",
        "approvedTrackId",
    ]

    errors = []

    for index, row in enumerate(rows, start=1):
        for field in required_fields:
            if not str(row.get(field) or "").strip():
                errors.append(
                    f"{index}행 {field} 값 누락"
                )

    if errors:
        raise SystemExit(
            "ERROR: seed 검증 실패\n"
            + "\n".join(errors)
        )

    return rows


def empty_result_row(seed, status, warning):
    return {
        "artist": seed.get("artist", ""),
        "seedTrackTitle": seed.get("trackTitle", ""),
        "country": seed.get("country", "KR"),
        "approvedArtistId": seed.get(
            "approvedArtistId",
            "",
        ),
        "approvedTrackId": seed.get(
            "approvedTrackId",
            "",
        ),
        "approvedITunesArtistName": seed.get(
            "approvedITunesArtistName",
            "",
        ),
        "approvedITunesTrackName": seed.get(
            "approvedITunesTrackName",
            "",
        ),
        "validationStatus": status,
        "validationWarnings": warning,
        "trackIdMatch": "FALSE",
        "artistIdMatch": "FALSE",
        "artistNameMatch": "FALSE",
        "trackNameMatch": "FALSE",
        "approvalSource": seed.get(
            "approvalSource",
            "",
        ),
        "memo": seed.get("memo", ""),
        "collectedAt": datetime.now().isoformat(
            timespec="seconds"
        ),
    }


def collect_one(seed):
    approved_track_id = str(
        seed.get("approvedTrackId") or ""
    ).strip()

    approved_artist_id = str(
        seed.get("approvedArtistId") or ""
    ).strip()

    params = {
        "id": approved_track_id,
        "country": str(
            seed.get("country") or "KR"
        ).strip(),
        "entity": "song",
    }

    response = requests.get(
        LOOKUP_URL,
        params=params,
        timeout=30,
        headers={
            "User-Agent": (
                "FANDEX-iTunes-Approved-ID-Lookup/2.0"
            )
        },
    )

    response.raise_for_status()
    payload = response.json()
    results = payload.get("results", [])

    matched = None

    for item in results:
        returned_track_id = str(
            item.get("trackId") or ""
        ).strip()

        if returned_track_id == approved_track_id:
            matched = item
            break

    if matched is None:
        return (
            empty_result_row(
                seed,
                "error",
                "approved_track_id_not_found",
            ),
            payload,
        )

    returned_track_id = str(
        matched.get("trackId") or ""
    ).strip()

    returned_artist_id = str(
        matched.get("artistId") or ""
    ).strip()

    returned_artist_name = str(
        matched.get("artistName") or ""
    ).strip()

    returned_track_name = str(
        matched.get("trackName") or ""
    ).strip()

    approved_artist_name = str(
        seed.get("approvedITunesArtistName") or ""
    ).strip()

    approved_track_name = str(
        seed.get("approvedITunesTrackName")
        or seed.get("trackTitle")
        or ""
    ).strip()

    track_id_match = (
        returned_track_id == approved_track_id
    )

    artist_id_match = (
        returned_artist_id == approved_artist_id
    )

    artist_name_match = loosely_matches(
        returned_artist_name,
        approved_artist_name,
    )

    track_name_match = loosely_matches(
        returned_track_name,
        approved_track_name,
    )

    warnings = []

    if not artist_name_match:
        warnings.append("artist_name_difference")

    if not track_name_match:
        warnings.append("track_name_difference")

    if not track_id_match:
        warnings.append("track_id_mismatch")

    if not artist_id_match:
        warnings.append("artist_id_mismatch")

    validation_status = (
        "ok"
        if track_id_match and artist_id_match
        else "error"
    )

    row = {
        "artist": seed.get("artist", ""),
        "seedTrackTitle": seed.get(
            "trackTitle",
            "",
        ),
        "country": seed.get("country", "KR"),
        "approvedArtistId": approved_artist_id,
        "approvedTrackId": approved_track_id,
        "approvedITunesArtistName": (
            approved_artist_name
        ),
        "approvedITunesTrackName": (
            approved_track_name
        ),
        "validationStatus": validation_status,
        "validationWarnings": (
            ";".join(warnings)
        ),
        "trackIdMatch": (
            "TRUE" if track_id_match else "FALSE"
        ),
        "artistIdMatch": (
            "TRUE" if artist_id_match else "FALSE"
        ),
        "artistNameMatch": (
            "TRUE" if artist_name_match else "FALSE"
        ),
        "trackNameMatch": (
            "TRUE" if track_name_match else "FALSE"
        ),
        "itunesArtistName": returned_artist_name,
        "itunesTrackName": returned_track_name,
        "collectionName": matched.get(
            "collectionName",
            "",
        ),
        "releaseDate": matched.get(
            "releaseDate",
            "",
        ),
        "primaryGenreName": matched.get(
            "primaryGenreName",
            "",
        ),
        "artistId": returned_artist_id,
        "collectionId": matched.get(
            "collectionId",
            "",
        ),
        "trackId": returned_track_id,
        "trackNumber": matched.get(
            "trackNumber",
            "",
        ),
        "trackCount": matched.get(
            "trackCount",
            "",
        ),
        "discNumber": matched.get(
            "discNumber",
            "",
        ),
        "discCount": matched.get(
            "discCount",
            "",
        ),
        "trackTimeMillis": matched.get(
            "trackTimeMillis",
            "",
        ),
        "countryStore": matched.get(
            "country",
            "",
        ),
        "currency": matched.get(
            "currency",
            "",
        ),
        "trackPrice": matched.get(
            "trackPrice",
            "",
        ),
        "collectionPrice": matched.get(
            "collectionPrice",
            "",
        ),
        "isStreamable": matched.get(
            "isStreamable",
            "",
        ),
        "explicitness": matched.get(
            "trackExplicitness",
            "",
        ),
        "previewUrl": matched.get(
            "previewUrl",
            "",
        ),
        "artistViewUrl": matched.get(
            "artistViewUrl",
            "",
        ),
        "collectionViewUrl": matched.get(
            "collectionViewUrl",
            "",
        ),
        "trackViewUrl": matched.get(
            "trackViewUrl",
            "",
        ),
        "approvalSource": seed.get(
            "approvalSource",
            "",
        ),
        "memo": seed.get("memo", ""),
        "collectedAt": datetime.now().isoformat(
            timespec="seconds"
        ),
    }

    return row, payload


def write_csv(path, rows):
    try:
        with path.open(
            "w",
            encoding="utf-8-sig",
            newline="",
        ) as file:
            writer = csv.DictWriter(
                file,
                fieldnames=FIELDNAMES,
                extrasaction="ignore",
            )
            writer.writeheader()
            writer.writerows(rows)

    except PermissionError:
        raise SystemExit(
            f"ERROR: {path} 파일이 열려 있습니다.\n"
            "Excel, 메모장, VS Code에서 닫고 다시 실행하세요."
        )


def main():
    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    timestamp_csv = Path(
        f"itunes_track_metadata_v2_{timestamp}.csv"
    )

    timestamp_json = Path(
        f"fandex_itunes_track_metadata_v2_"
        f"{timestamp}.json"
    )

    timestamp_report = Path(
        f"FANDEX_ITUNES_COLLECTOR_V2_REPORT_"
        f"{timestamp}.txt"
    )

    seeds = read_seed_rows()

    rows = []
    raw_results = {}
    runtime_errors = []

    print()
    print("FANDEX iTunes metadata collector v2")
    print("=" * 76)
    print(f"version: {VERSION}")
    print(f"seed rows: {len(seeds)}")
    print(f"seed file: {SEED_FILE}")
    print("lookup mode: approved trackId direct lookup")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 76)

    for index, seed in enumerate(seeds, start=1):
        artist = seed.get("artist", "")
        track_id = seed.get(
            "approvedTrackId",
            "",
        )

        print(
            f"[{index}/{len(seeds)}] "
            f"{artist} / trackId={track_id}"
        )

        try:
            row, raw_payload = collect_one(seed)
            rows.append(row)
            raw_results[artist] = raw_payload

            print(
                f"  -> {row['validationStatus']} / "
                f"{row.get('itunesArtistName', '')} / "
                f"{row.get('itunesTrackName', '')} / "
                f"trackIdMatch={row['trackIdMatch']} / "
                f"artistIdMatch={row['artistIdMatch']}"
            )

            if row.get("validationWarnings"):
                print(
                    "  warning: "
                    f"{row['validationWarnings']}"
                )

        except Exception as exc:
            error_text = (
                f"{artist} | "
                f"{type(exc).__name__}: {exc}"
            )

            runtime_errors.append(error_text)
            raw_results[artist] = {}

            rows.append(
                empty_result_row(
                    seed,
                    "error",
                    error_text,
                )
            )

            print(f"  ERROR: {exc}")

        if index < len(seeds):
            time.sleep(0.3)

    write_csv(timestamp_csv, rows)
    write_csv(LATEST_CSV, rows)

    status_error_count = sum(
        1
        for row in rows
        if row.get("validationStatus") != "ok"
    )

    warning_count = sum(
        1
        for row in rows
        if row.get("validationWarnings")
    )

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(
            timespec="seconds"
        ),
        "scope": (
            "Python-only iTunes metadata layer"
        ),
        "scoreUsage": (
            "metadata_only_not_fandex_score"
        ),
        "seedFile": str(SEED_FILE),
        "rowCount": len(rows),
        "okCount": len(rows) - status_error_count,
        "errorCount": status_error_count,
        "warningCount": warning_count,
        "runtimeErrors": runtime_errors,
        "masterModified": False,
        "websiteModified": False,
        "items": rows,
        "rawResultsByArtist": raw_results,
    }

    json_text = json.dumps(
        payload,
        ensure_ascii=False,
        indent=2,
    )

    timestamp_json.write_text(
        json_text,
        encoding="utf-8",
    )

    LATEST_JSON.write_text(
        json_text,
        encoding="utf-8",
    )

    lines = [
        "FANDEX iTunes Collector v2 Report",
        "=" * 76,
        f"createdAt: {payload['createdAt']}",
        f"version: {VERSION}",
        "mode: approved trackId direct lookup",
        "scoreUsage: metadata_only_not_fandex_score",
        "",
        "검증 결과",
        "-" * 76,
        f"seedCount: {len(seeds)}",
        f"resultCount: {len(rows)}",
        f"okCount: {payload['okCount']}",
        f"errorCount: {payload['errorCount']}",
        f"warningCount: {payload['warningCount']}",
        "",
        "아티스트별 결과",
        "-" * 76,
    ]

    for row in rows:
        lines.append(
            f"{row['artist']} | "
            f"status={row['validationStatus']} | "
            f"iTunes={row.get('itunesArtistName', '')}"
            f" - {row.get('itunesTrackName', '')} | "
            f"trackIdMatch={row['trackIdMatch']} | "
            f"artistIdMatch={row['artistIdMatch']} | "
            f"artistNameMatch={row['artistNameMatch']} | "
            f"trackNameMatch={row['trackNameMatch']} | "
            f"release={row.get('releaseDate', '')}"
        )

        if row.get("validationWarnings"):
            lines.append(
                "  warning: "
                f"{row['validationWarnings']}"
            )

    if runtime_errors:
        lines.extend(
            [
                "",
                "실행 오류",
                "-" * 76,
                *runtime_errors,
            ]
        )

    lines.extend(
        [
            "",
            "출력",
            "-" * 76,
            f"CSV: {LATEST_CSV}",
            f"JSON: {LATEST_JSON}",
            "",
            "수정 여부",
            "-" * 76,
            "seedModified: FALSE",
            "masterModified: FALSE",
            "websiteModified: FALSE",
            "",
            "주의",
            "-" * 76,
            "iTunes 데이터는 카탈로그 메타데이터입니다.",
            "현재 FANDEX Master 점수에는 더하지 않습니다.",
        ]
    )

    report_text = "\n".join(lines)

    timestamp_report.write_text(
        report_text,
        encoding="utf-8",
    )

    LATEST_REPORT.write_text(
        report_text,
        encoding="utf-8",
    )

    print()
    print("=" * 76)
    print("iTunes metadata collector v2 완료")
    print("=" * 76)
    print(f"결과 수: {len(rows)}")
    print(f"정상: {payload['okCount']}")
    print(f"오류: {payload['errorCount']}")
    print(f"경고: {payload['warningCount']}")
    print(f"CSV: {LATEST_CSV}")
    print(f"JSON: {LATEST_JSON}")
    print(f"리포트: {LATEST_REPORT}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")

    return 1 if status_error_count else 0


if __name__ == "__main__":
    sys.exit(main())