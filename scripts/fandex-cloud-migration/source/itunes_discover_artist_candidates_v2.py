import csv
import json
import re
import sys
import time
from datetime import datetime
from pathlib import Path

import requests


VERSION = "itunes_discover_artist_candidates_v2"
SEARCH_URL = "https://itunes.apple.com/search"

LATEST_CSV = Path("itunes_artist_candidates_v2_latest.csv")
LATEST_JSON = Path("itunes_artist_candidates_v2_raw_latest.json")
LATEST_REPORT = Path("FANDEX_ITUNES_ARTIST_CANDIDATES_V2_REPORT.txt")


TARGETS = [
    {
        "artist": "뉴진스",
        "query": "NewJeans",
        "aliases": ["NewJeans", "뉴진스"],
    },
    {
        "artist": "르세라핌",
        "query": "LE SSERAFIM",
        "aliases": ["LE SSERAFIM", "르세라핌"],
    },
    {
        "artist": "아이브",
        "query": "IVE",
        "aliases": ["IVE", "아이브"],
    },
    {
        "artist": "세븐틴",
        "query": "SEVENTEEN",
        "aliases": ["SEVENTEEN", "세븐틴"],
    },
    {
        "artist": "스트레이키즈",
        "query": "Stray Kids",
        "aliases": ["Stray Kids", "스트레이키즈"],
    },
    {
        "artist": "투모로우바이투게더",
        "query": "TOMORROW X TOGETHER",
        "aliases": [
            "TOMORROW X TOGETHER",
            "TXT",
            "투모로우바이투게더",
        ],
    },
]


def normalize_text(value):
    text = str(value or "").casefold()
    text = re.sub(r"[^0-9a-z가-힣]+", "", text)
    return text


def artist_match_score(itunes_artist, aliases):
    normalized_artist = normalize_text(itunes_artist)
    normalized_aliases = {
        normalize_text(alias)
        for alias in aliases
        if normalize_text(alias)
    }

    if normalized_artist in normalized_aliases:
        return 100, True, "exact_alias_match"

    for alias in normalized_aliases:
        if alias and (
            alias in normalized_artist
            or normalized_artist in alias
        ):
            return 60, False, "partial_alias_match"

    return 0, False, "not_matched"


def fetch_candidates(target):
    params = {
        "term": target["query"],
        "country": "KR",
        "media": "music",
        "entity": "musicTrack",
        "limit": 50,
    }

    response = requests.get(
        SEARCH_URL,
        params=params,
        timeout=30,
        headers={
            "User-Agent": "FANDEX-iTunes-Candidate-Discovery/2.0"
        },
    )
    response.raise_for_status()

    payload = response.json()
    results = payload.get("results", [])

    rows = []

    for item in results:
        itunes_artist = item.get("artistName", "")
        score, exact_match, reason = artist_match_score(
            itunes_artist,
            target["aliases"],
        )

        if score <= 0:
            continue

        rows.append(
            {
                "artist": target["artist"],
                "query": target["query"],
                "country": "KR",
                "candidateScore": score,
                "exactArtistMatch": "TRUE" if exact_match else "FALSE",
                "matchReason": reason,
                "itunesArtistName": itunes_artist,
                "itunesTrackName": item.get("trackName", ""),
                "collectionName": item.get("collectionName", ""),
                "releaseDate": item.get("releaseDate", ""),
                "primaryGenreName": item.get("primaryGenreName", ""),
                "artistId": item.get("artistId", ""),
                "collectionId": item.get("collectionId", ""),
                "trackId": item.get("trackId", ""),
                "trackViewUrl": item.get("trackViewUrl", ""),
                "collectionViewUrl": item.get(
                    "collectionViewUrl",
                    "",
                ),
            }
        )

    # 같은 trackId 중복 제거
    deduped = []
    seen = set()

    for row in rows:
        key = str(row.get("trackId") or "").strip()

        if not key:
            key = (
                normalize_text(row["itunesArtistName"]),
                normalize_text(row["itunesTrackName"]),
                normalize_text(row["collectionName"]),
            )

        if key in seen:
            continue

        seen.add(key)
        deduped.append(row)

    # 정확한 아티스트 매칭 우선, 그다음 최신 발매순
    deduped.sort(
        key=lambda row: (
            row["exactArtistMatch"] == "TRUE",
            row["candidateScore"],
            row["releaseDate"],
        ),
        reverse=True,
    )

    # 아티스트별 최대 10개만 유지
    selected = deduped[:10]

    for index, row in enumerate(selected, start=1):
        row["candidateRank"] = index

    return selected, results


def write_csv(rows, path):
    fieldnames = [
        "artist",
        "query",
        "country",
        "candidateRank",
        "candidateScore",
        "exactArtistMatch",
        "matchReason",
        "itunesArtistName",
        "itunesTrackName",
        "collectionName",
        "releaseDate",
        "primaryGenreName",
        "artistId",
        "collectionId",
        "trackId",
        "trackViewUrl",
        "collectionViewUrl",
    ]

    with path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=fieldnames,
            extrasaction="ignore",
        )
        writer.writeheader()
        writer.writerows(rows)


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    timestamp_csv = Path(
        f"itunes_artist_candidates_v2_{timestamp}.csv"
    )
    timestamp_json = Path(
        f"itunes_artist_candidates_v2_raw_{timestamp}.json"
    )
    timestamp_report = Path(
        f"FANDEX_ITUNES_ARTIST_CANDIDATES_V2_REPORT_{timestamp}.txt"
    )

    all_rows = []
    raw_results = {}
    errors = []

    print()
    print("FANDEX iTunes 아티스트 후보 탐색 v2")
    print("=" * 76)
    print(f"version: {VERSION}")
    print(f"대상 아티스트: {len(TARGETS)}")
    print("seedModified: FALSE")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 76)

    for index, target in enumerate(TARGETS, start=1):
        print(
            f"[{index}/{len(TARGETS)}] "
            f"{target['artist']} / query={target['query']}"
        )

        try:
            rows, raw = fetch_candidates(target)
            all_rows.extend(rows)
            raw_results[target["artist"]] = raw

            exact_count = sum(
                1
                for row in rows
                if row["exactArtistMatch"] == "TRUE"
            )

            print(
                f"  후보 {len(rows)}개 "
                f"/ exact {exact_count}개"
            )

            if rows:
                first = rows[0]
                print(
                    "  1순위: "
                    f"{first['itunesArtistName']} / "
                    f"{first['itunesTrackName']} / "
                    f"{first['releaseDate']}"
                )
            else:
                print("  후보 없음")

        except Exception as exc:
            error_text = (
                f"{target['artist']} | "
                f"{type(exc).__name__}: {exc}"
            )
            errors.append(error_text)
            raw_results[target["artist"]] = []
            print(f"  ERROR: {exc}")

        if index < len(TARGETS):
            time.sleep(0.5)

    write_csv(all_rows, timestamp_csv)
    write_csv(all_rows, LATEST_CSV)

    json_payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(
            timespec="seconds"
        ),
        "scope": "Python-only / candidate discovery",
        "targetCount": len(TARGETS),
        "candidateCount": len(all_rows),
        "seedModified": False,
        "masterModified": False,
        "websiteModified": False,
        "errors": errors,
        "candidates": all_rows,
        "rawResultsByArtist": raw_results,
    }

    json_text = json.dumps(
        json_payload,
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
        "FANDEX iTunes Artist Candidates Report v2",
        "=" * 76,
        f"createdAt: {json_payload['createdAt']}",
        f"version: {VERSION}",
        "",
        "실행 범위",
        "-" * 76,
        "iTunes Search API에서 누락된 6명 후보를 탐색",
        "seedModified: FALSE",
        "masterModified: FALSE",
        "websiteModified: FALSE",
        "",
        "아티스트별 결과",
        "-" * 76,
    ]

    for target in TARGETS:
        artist_rows = [
            row
            for row in all_rows
            if row["artist"] == target["artist"]
        ]

        exact_rows = [
            row
            for row in artist_rows
            if row["exactArtistMatch"] == "TRUE"
        ]

        lines.append(
            f"{target['artist']} | "
            f"후보={len(artist_rows)} | "
            f"exact={len(exact_rows)}"
        )

        for row in artist_rows[:3]:
            lines.append(
                f"  {row['candidateRank']}순위 | "
                f"{row['itunesArtistName']} | "
                f"{row['itunesTrackName']} | "
                f"{row['collectionName']} | "
                f"{row['releaseDate']} | "
                f"artistId={row['artistId']} | "
                f"trackId={row['trackId']}"
            )

    if errors:
        lines.extend(
            [
                "",
                "오류",
                "-" * 76,
                *errors,
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
            "주의",
            "-" * 76,
            "이 결과는 후보 탐색용이며 seed에 자동 반영하지 않습니다.",
            "iTunes 검색 결과는 차트 순위나 FANDEX 점수가 아닙니다.",
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
    print("iTunes 아티스트 후보 탐색 v2 완료")
    print("=" * 76)
    print(f"후보 수: {len(all_rows)}")
    print(f"오류 수: {len(errors)}")
    print(f"CSV: {LATEST_CSV}")
    print(f"JSON: {LATEST_JSON}")
    print(f"리포트: {LATEST_REPORT}")
    print("seedModified: FALSE")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")

    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())