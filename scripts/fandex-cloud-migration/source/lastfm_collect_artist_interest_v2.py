import csv
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

import requests


VERSION = "lastfm_collect_artist_interest_v2_verified_10_artists"
API_URL = "https://ws.audioscrobbler.com/2.0/"

SEED_FILE = Path("lastfm_artist_seed_v2.csv")

LATEST_CSV = Path("lastfm_artist_interest_v2_latest.csv")
LATEST_JSON = Path(
    "fandex_lastfm_artist_interest_v2_latest.json"
)
LATEST_REPORT = Path(
    "FANDEX_LASTFM_COLLECTOR_V2_REPORT.txt"
)


FIELDNAMES = [
    "artist",
    "query",
    "approvedLastfmName",
    "aliases",
    "validationStatus",
    "validationWarnings",
    "lastfmNameMatch",
    "lastfmNameExactMatch",
    "lastfmName",
    "lastfmUrl",
    "listeners",
    "playcount",
    "playcountPerListener",
    "streamable",
    "mbid",
    "topTrackCount",
    "topTrack1",
    "topTrack1Listeners",
    "topTrack1Playcount",
    "topTracksPreview",
    "topTagsPreview",
    "memo",
    "collectedAt",
]


def normalize_text(value):
    text = str(value or "").casefold()
    text = re.sub(r"[^0-9a-z가-힣]+", "", text)
    return text


def to_int(value):
    try:
        return int(float(str(value or "0").replace(",", "")))
    except (TypeError, ValueError):
        return 0


def safe_ratio(numerator, denominator):
    if denominator <= 0:
        return 0.0

    return round(numerator / denominator, 4)


def get_api_key():
    api_key = (
        os.environ.get("LASTFM_API_KEY") or ""
    ).strip()

    invalid_values = {
        "",
        "실제_API_KEY",
        "YOUR_API_KEY",
        "LASTFM_API_KEY",
        "발급받은_진짜_API_KEY",
    }

    if api_key in invalid_values:
        raise SystemExit(
            "ERROR: LASTFM_API_KEY 환경변수가 "
            "설정되지 않았습니다.\n"
            "API 키는 현재 CMD 환경변수에만 설정하고 "
            "채팅에는 붙여넣지 마세요."
        )

    return api_key


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
            f"ERROR: seed 행 수가 10개가 아닙니다: "
            f"{len(rows)}"
        )

    required_fields = [
        "artist",
        "query",
        "approvedLastfmName",
        "aliases",
    ]

    problems = []

    for index, row in enumerate(rows, start=1):
        for field in required_fields:
            if not str(row.get(field) or "").strip():
                problems.append(
                    f"{index}행 {field} 누락"
                )

    if problems:
        raise SystemExit(
            "ERROR: seed 검증 실패\n"
            + "\n".join(problems)
        )

    return rows


def fetch_lastfm(method, api_key, params):
    request_params = {
        "method": method,
        "api_key": api_key,
        "format": "json",
        **params,
    }

    response = requests.get(
        API_URL,
        params=request_params,
        timeout=30,
        headers={
            "User-Agent": (
                "FANDEX-LastFM-Collector-v2/1.0"
            )
        },
    )

    response.raise_for_status()

    try:
        payload = response.json()
    except ValueError as exc:
        raise RuntimeError(
            "Last.fm 응답을 JSON으로 읽지 못했습니다."
        ) from exc

    if "error" in payload:
        raise RuntimeError(
            "Last.fm API error "
            f"{payload.get('error')}: "
            f"{payload.get('message')}"
        )

    return payload


def get_aliases(seed):
    values = [
        seed.get("approvedLastfmName", ""),
        seed.get("query", ""),
    ]

    values.extend(
        str(seed.get("aliases") or "").split("|")
    )

    return [
        value.strip()
        for value in values
        if value.strip()
    ]


def check_name_match(returned_name, seed):
    returned_normalized = normalize_text(
        returned_name
    )

    aliases = get_aliases(seed)
    normalized_aliases = {
        normalize_text(alias)
        for alias in aliases
        if normalize_text(alias)
    }

    exact_match = (
        returned_normalized in normalized_aliases
    )

    if exact_match:
        return True, True

    for alias in normalized_aliases:
        if (
            alias
            and returned_normalized
            and (
                alias in returned_normalized
                or returned_normalized in alias
            )
        ):
            return True, False

    return False, False


def parse_top_tracks(payload):
    container = payload.get("toptracks") or {}
    tracks = container.get("track") or []

    if isinstance(tracks, dict):
        tracks = [tracks]

    parsed = []

    for item in tracks[:10]:
        parsed.append(
            {
                "name": str(
                    item.get("name") or ""
                ).strip(),
                "listeners": to_int(
                    item.get("listeners")
                ),
                "playcount": to_int(
                    item.get("playcount")
                ),
                "url": str(
                    item.get("url") or ""
                ).strip(),
            }
        )

    return parsed


def parse_top_tags(payload):
    container = payload.get("toptags") or {}
    tags = container.get("tag") or []

    if isinstance(tags, dict):
        tags = [tags]

    parsed = []

    for item in tags[:10]:
        parsed.append(
            {
                "name": str(
                    item.get("name") or ""
                ).strip(),
                "count": to_int(
                    item.get("count")
                ),
                "url": str(
                    item.get("url") or ""
                ).strip(),
            }
        )

    return parsed


def empty_result_row(seed, warning):
    return {
        "artist": seed.get("artist", ""),
        "query": seed.get("query", ""),
        "approvedLastfmName": seed.get(
            "approvedLastfmName",
            "",
        ),
        "aliases": seed.get("aliases", ""),
        "validationStatus": "error",
        "validationWarnings": warning,
        "lastfmNameMatch": "FALSE",
        "lastfmNameExactMatch": "FALSE",
        "lastfmName": "",
        "lastfmUrl": "",
        "listeners": 0,
        "playcount": 0,
        "playcountPerListener": 0,
        "streamable": "",
        "mbid": "",
        "topTrackCount": 0,
        "topTrack1": "",
        "topTrack1Listeners": 0,
        "topTrack1Playcount": 0,
        "topTracksPreview": "",
        "topTagsPreview": "",
        "memo": seed.get("memo", ""),
        "collectedAt": datetime.now().isoformat(
            timespec="seconds"
        ),
    }


def collect_one(seed, api_key):
    query = str(seed.get("query") or "").strip()

    info_payload = fetch_lastfm(
        "artist.getInfo",
        api_key,
        {
            "artist": query,
            "autocorrect": 1,
        },
    )

    tracks_payload = fetch_lastfm(
        "artist.getTopTracks",
        api_key,
        {
            "artist": query,
            "autocorrect": 1,
            "limit": 10,
        },
    )

    tags_payload = fetch_lastfm(
        "artist.getTopTags",
        api_key,
        {
            "artist": query,
            "autocorrect": 1,
        },
    )

    artist_info = (
        info_payload.get("artist") or {}
    )

    stats = artist_info.get("stats") or {}

    returned_name = str(
        artist_info.get("name") or ""
    ).strip()

    listeners = to_int(
        stats.get("listeners")
    )

    playcount = to_int(
        stats.get("playcount")
    )

    name_match, exact_match = check_name_match(
        returned_name,
        seed,
    )

    top_tracks = parse_top_tracks(
        tracks_payload
    )

    top_tags = parse_top_tags(
        tags_payload
    )

    warnings = []

    if not name_match:
        warnings.append(
            "lastfm_name_not_approved"
        )
    elif not exact_match:
        warnings.append(
            "lastfm_name_partial_alias_match"
        )

    if listeners <= 0:
        warnings.append(
            "listeners_zero_or_missing"
        )

    if playcount <= 0:
        warnings.append(
            "playcount_zero_or_missing"
        )

    validation_status = (
        "ok"
        if name_match
        else "error"
    )

    top_track1 = (
        top_tracks[0]
        if top_tracks
        else {}
    )

    top_tracks_preview = " | ".join(
        (
            f"{item['name']}"
            f"({item['listeners']} listeners, "
            f"{item['playcount']} plays)"
        )
        for item in top_tracks[:5]
    )

    top_tags_preview = " | ".join(
        (
            f"{item['name']}:{item['count']}"
        )
        for item in top_tags[:5]
    )

    row = {
        "artist": seed.get("artist", ""),
        "query": query,
        "approvedLastfmName": seed.get(
            "approvedLastfmName",
            "",
        ),
        "aliases": seed.get("aliases", ""),
        "validationStatus": validation_status,
        "validationWarnings": ";".join(
            warnings
        ),
        "lastfmNameMatch": (
            "TRUE" if name_match else "FALSE"
        ),
        "lastfmNameExactMatch": (
            "TRUE" if exact_match else "FALSE"
        ),
        "lastfmName": returned_name,
        "lastfmUrl": artist_info.get(
            "url",
            "",
        ),
        "listeners": listeners,
        "playcount": playcount,
        "playcountPerListener": safe_ratio(
            playcount,
            listeners,
        ),
        "streamable": artist_info.get(
            "streamable",
            "",
        ),
        "mbid": artist_info.get(
            "mbid",
            "",
        ),
        "topTrackCount": len(top_tracks),
        "topTrack1": top_track1.get(
            "name",
            "",
        ),
        "topTrack1Listeners": top_track1.get(
            "listeners",
            0,
        ),
        "topTrack1Playcount": top_track1.get(
            "playcount",
            0,
        ),
        "topTracksPreview": top_tracks_preview,
        "topTagsPreview": top_tags_preview,
        "memo": seed.get("memo", ""),
        "collectedAt": datetime.now().isoformat(
            timespec="seconds"
        ),
    }

    raw = {
        "artistInfo": info_payload,
        "topTracks": tracks_payload,
        "topTags": tags_payload,
    }

    return row, raw


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
            f"ERROR: {path} 파일이 다른 프로그램에서 "
            "열려 있습니다.\n"
            "Excel, 메모장, VS Code에서 닫고 "
            "다시 실행하세요."
        )


def main():
    api_key = get_api_key()
    seeds = read_seed_rows()

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    timestamp_csv = Path(
        f"lastfm_artist_interest_v2_"
        f"{timestamp}.csv"
    )

    timestamp_json = Path(
        f"fandex_lastfm_artist_interest_v2_"
        f"{timestamp}.json"
    )

    timestamp_report = Path(
        f"FANDEX_LASTFM_COLLECTOR_V2_REPORT_"
        f"{timestamp}.txt"
    )

    rows = []
    raw_by_artist = {}
    runtime_errors = []

    print()
    print("FANDEX Last.fm collector v2")
    print("=" * 76)
    print(f"version: {VERSION}")
    print(f"seed rows: {len(seeds)}")
    print(f"seed file: {SEED_FILE}")
    print("scoreUsage: metadata_only_not_fandex_score")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 76)

    for index, seed in enumerate(
        seeds,
        start=1,
    ):
        artist = seed.get("artist", "")
        query = seed.get("query", "")

        print(
            f"[{index}/{len(seeds)}] "
            f"{artist} / query={query}"
        )

        try:
            row, raw = collect_one(
                seed,
                api_key,
            )

            rows.append(row)
            raw_by_artist[artist] = raw

            print(
                f"  -> {row['validationStatus']} / "
                f"Last.fm={row['lastfmName']} / "
                f"listeners={row['listeners']} / "
                f"playcount={row['playcount']} / "
                f"nameMatch={row['lastfmNameMatch']}"
            )

            if row["validationWarnings"]:
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
            raw_by_artist[artist] = {}

            rows.append(
                empty_result_row(
                    seed,
                    error_text,
                )
            )

            print(f"  ERROR: {exc}")

        if index < len(seeds):
            time.sleep(0.4)

    write_csv(
        timestamp_csv,
        rows,
    )

    write_csv(
        LATEST_CSV,
        rows,
    )

    error_count = sum(
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
        "source": "Last.fm API",
        "scope": (
            "Python-only Last.fm metadata layer"
        ),
        "scoreUsage": (
            "metadata_only_not_fandex_score"
        ),
        "seedFile": str(SEED_FILE),
        "artistCount": len(rows),
        "okCount": len(rows) - error_count,
        "errorCount": error_count,
        "warningCount": warning_count,
        "runtimeErrors": runtime_errors,
        "masterModified": False,
        "websiteModified": False,
        "artists": rows,
        "rawByArtist": raw_by_artist,
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

    report_lines = [
        "FANDEX Last.fm Collector v2 Report",
        "=" * 76,
        f"createdAt: {payload['createdAt']}",
        f"version: {VERSION}",
        "scope: Python-only",
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

    sorted_rows = sorted(
        rows,
        key=lambda row: to_int(
            row.get("listeners")
        ),
        reverse=True,
    )

    for row in sorted_rows:
        report_lines.append(
            f"{row['artist']} | "
            f"status={row['validationStatus']} | "
            f"Last.fm={row['lastfmName']} | "
            f"nameMatch={row['lastfmNameMatch']} | "
            f"listeners={row['listeners']} | "
            f"playcount={row['playcount']} | "
            f"playsPerListener="
            f"{row['playcountPerListener']} | "
            f"topTrack={row['topTrack1']}"
        )

        if row["validationWarnings"]:
            report_lines.append(
                "  warning: "
                f"{row['validationWarnings']}"
            )

    if runtime_errors:
        report_lines.extend(
            [
                "",
                "실행 오류",
                "-" * 76,
                *runtime_errors,
            ]
        )

    report_lines.extend(
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
            "Last.fm 수치는 글로벌 관심도 메타데이터입니다.",
            "현재 FANDEX Master 점수에는 합산하지 않습니다.",
            "API 키는 결과 파일에 저장하지 않습니다.",
        ]
    )

    report_text = "\n".join(
        report_lines
    )

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
    print("Last.fm collector v2 완료")
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

    return 1 if error_count else 0


if __name__ == "__main__":
    sys.exit(main())