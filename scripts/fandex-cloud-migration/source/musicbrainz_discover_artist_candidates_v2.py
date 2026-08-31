import csv
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path


VERSION = "musicbrainz_discover_artist_candidates_v2"

BASE_URL = "https://musicbrainz.org/ws/2"
USER_AGENT = (
    "FANDEXPythonCollector/2.0 "
    "(local prototype; music metadata research)"
)

LATEST_CSV = Path(
    "musicbrainz_artist_candidates_v2_latest.csv"
)
LATEST_JSON = Path(
    "musicbrainz_artist_candidates_v2_raw_latest.json"
)
LATEST_REPORT = Path(
    "FANDEX_MUSICBRAINZ_ARTIST_CANDIDATES_V2_REPORT.txt"
)


TARGETS = [
    {
        "artist": "뉴진스",
        "query": "NewJeans",
        "aliases": ["NewJeans", "뉴진스"],
        "expectedCountry": "KR",
        "expectedType": "Group",
    },
    {
        "artist": "르세라핌",
        "query": "LE SSERAFIM",
        "aliases": ["LE SSERAFIM", "르세라핌"],
        "expectedCountry": "KR",
        "expectedType": "Group",
    },
    {
        "artist": "아이브",
        "query": "IVE",
        "aliases": ["IVE", "아이브"],
        "expectedCountry": "KR",
        "expectedType": "Group",
    },
    {
        "artist": "세븐틴",
        "query": "SEVENTEEN",
        "aliases": ["SEVENTEEN", "세븐틴"],
        "expectedCountry": "KR",
        "expectedType": "Group",
    },
    {
        "artist": "스트레이키즈",
        "query": "Stray Kids",
        "aliases": ["Stray Kids", "스트레이키즈"],
        "expectedCountry": "KR",
        "expectedType": "Group",
    },
    {
        "artist": "투모로우바이투게더",
        "query": "TOMORROW X TOGETHER",
        "aliases": [
            "TOMORROW X TOGETHER",
            "TXT",
            "투모로우바이투게더",
        ],
        "expectedCountry": "KR",
        "expectedType": "Group",
    },
]


FIELDNAMES = [
    "artist",
    "query",
    "candidateRank",
    "candidateScore",
    "musicbrainzScore",
    "exactNameMatch",
    "countryMatch",
    "typeMatch",
    "musicbrainzName",
    "sortName",
    "mbid",
    "type",
    "country",
    "area",
    "beginDate",
    "endDate",
    "disambiguation",
    "aliasesPreview",
]


def normalize(value):
    return "".join(
        ch.casefold()
        for ch in str(value or "")
        if ch.isalnum()
    )


def to_int(value):
    try:
        return int(float(str(value or "0")))
    except (TypeError, ValueError):
        return 0


def fetch_json(path, params):
    query = urllib.parse.urlencode(params)
    url = f"{BASE_URL}{path}?{query}"

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/json",
        },
    )

    with urllib.request.urlopen(
        request,
        timeout=30,
    ) as response:
        body = response.read().decode("utf-8")

    return json.loads(body), url


def candidate_name_values(candidate):
    values = [
        candidate.get("name", ""),
        candidate.get("sort-name", ""),
    ]

    for alias in candidate.get("aliases") or []:
        if isinstance(alias, dict):
            values.append(alias.get("name", ""))

    return [
        value
        for value in values
        if str(value or "").strip()
    ]


def name_match(candidate, target):
    approved = {
        normalize(value)
        for value in target["aliases"]
        if normalize(value)
    }

    candidates = {
        normalize(value)
        for value in candidate_name_values(candidate)
        if normalize(value)
    }

    exact = bool(
        approved.intersection(candidates)
    )

    if exact:
        return True, True

    for left in approved:
        for right in candidates:
            if (
                left
                and right
                and (
                    left in right
                    or right in left
                )
            ):
                return True, False

    return False, False


def score_candidate(candidate, target):
    base = to_int(candidate.get("score"))

    matched, exact = name_match(
        candidate,
        target,
    )

    country = str(
        candidate.get("country") or ""
    ).strip().upper()

    candidate_type = str(
        candidate.get("type") or ""
    ).strip().casefold()

    expected_country = target[
        "expectedCountry"
    ].upper()

    expected_type = target[
        "expectedType"
    ].casefold()

    country_match = (
        country == expected_country
    )

    type_match = (
        candidate_type == expected_type
    )

    bonus = 0

    if exact:
        bonus += 100
    elif matched:
        bonus += 50

    if country_match:
        bonus += 30

    if type_match:
        bonus += 20

    return (
        base + bonus,
        matched,
        exact,
        country_match,
        type_match,
    )


def aliases_preview(candidate):
    values = []

    for alias in candidate.get("aliases") or []:
        if not isinstance(alias, dict):
            continue

        name = str(
            alias.get("name") or ""
        ).strip()

        if name and name not in values:
            values.append(name)

    return " | ".join(values[:8])


def area_name(candidate):
    area = candidate.get("area") or {}

    if isinstance(area, dict):
        return str(
            area.get("name") or ""
        ).strip()

    return ""


def life_span_date(candidate, key):
    life_span = (
        candidate.get("life-span") or {}
    )

    if isinstance(life_span, dict):
        return str(
            life_span.get(key) or ""
        ).strip()

    return ""


def discover_one(target):
    params = {
        "query": target["query"],
        "fmt": "json",
        "limit": 10,
    }

    payload, url = fetch_json(
        "/artist",
        params,
    )

    candidates = (
        payload.get("artists") or []
    )

    rows = []

    for candidate in candidates:
        (
            total_score,
            matched,
            exact,
            country_match,
            type_match,
        ) = score_candidate(
            candidate,
            target,
        )

        rows.append(
            {
                "artist": target["artist"],
                "query": target["query"],
                "candidateScore": total_score,
                "musicbrainzScore": to_int(
                    candidate.get("score")
                ),
                "exactNameMatch": (
                    "TRUE" if exact else "FALSE"
                ),
                "countryMatch": (
                    "TRUE"
                    if country_match
                    else "FALSE"
                ),
                "typeMatch": (
                    "TRUE"
                    if type_match
                    else "FALSE"
                ),
                "musicbrainzName": str(
                    candidate.get("name") or ""
                ).strip(),
                "sortName": str(
                    candidate.get("sort-name")
                    or ""
                ).strip(),
                "mbid": str(
                    candidate.get("id") or ""
                ).strip(),
                "type": str(
                    candidate.get("type") or ""
                ).strip(),
                "country": str(
                    candidate.get("country") or ""
                ).strip(),
                "area": area_name(candidate),
                "beginDate": life_span_date(
                    candidate,
                    "begin",
                ),
                "endDate": life_span_date(
                    candidate,
                    "end",
                ),
                "disambiguation": str(
                    candidate.get(
                        "disambiguation"
                    )
                    or ""
                ).strip(),
                "aliasesPreview": (
                    aliases_preview(candidate)
                ),
            }
        )

    rows.sort(
        key=lambda row: (
            row["candidateScore"],
            row["musicbrainzScore"],
        ),
        reverse=True,
    )

    for rank, row in enumerate(
        rows,
        start=1,
    ):
        row["candidateRank"] = rank

    return rows, payload, url


def write_csv(path, rows):
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


def main():
    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    timestamp_csv = Path(
        f"musicbrainz_artist_candidates_v2_"
        f"{timestamp}.csv"
    )

    timestamp_json = Path(
        f"musicbrainz_artist_candidates_v2_raw_"
        f"{timestamp}.json"
    )

    timestamp_report = Path(
        "FANDEX_MUSICBRAINZ_"
        "ARTIST_CANDIDATES_V2_REPORT_"
        f"{timestamp}.txt"
    )

    all_rows = []
    raw_by_artist = {}
    search_urls = {}
    errors = []

    print()
    print(
        "FANDEX MusicBrainz 아티스트 후보 탐색 v2"
    )
    print("=" * 76)
    print(f"version: {VERSION}")
    print(f"대상 아티스트: {len(TARGETS)}")
    print("seedModified: FALSE")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 76)

    for index, target in enumerate(
        TARGETS,
        start=1,
    ):
        print(
            f"[{index}/{len(TARGETS)}] "
            f"{target['artist']} / "
            f"query={target['query']}"
        )

        try:
            rows, raw, url = discover_one(
                target
            )

            all_rows.extend(rows)
            raw_by_artist[
                target["artist"]
            ] = raw

            search_urls[
                target["artist"]
            ] = url

            exact_count = sum(
                1
                for row in rows
                if (
                    row["exactNameMatch"]
                    == "TRUE"
                )
            )

            full_match_count = sum(
                1
                for row in rows
                if (
                    row["exactNameMatch"]
                    == "TRUE"
                    and row["countryMatch"]
                    == "TRUE"
                    and row["typeMatch"]
                    == "TRUE"
                )
            )

            print(
                f"  후보 {len(rows)}개 "
                f"/ exact {exact_count}개 "
                f"/ fullMatch "
                f"{full_match_count}개"
            )

            if rows:
                first = rows[0]

                print(
                    "  1순위: "
                    f"{first['musicbrainzName']} | "
                    f"type={first['type']} | "
                    f"country={first['country']} | "
                    f"MBID={first['mbid']} | "
                    f"score="
                    f"{first['candidateScore']}"
                )
            else:
                print("  후보 없음")

        except Exception as exc:
            error_text = (
                f"{target['artist']} | "
                f"{type(exc).__name__}: {exc}"
            )

            errors.append(error_text)
            raw_by_artist[
                target["artist"]
            ] = {}

            print(f"  ERROR: {exc}")

        # MusicBrainz 요청 정책을 여유 있게 준수
        if index < len(TARGETS):
            time.sleep(1.2)

    write_csv(
        timestamp_csv,
        all_rows,
    )

    write_csv(
        LATEST_CSV,
        all_rows,
    )

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(
            timespec="seconds"
        ),
        "scope": (
            "Python-only MusicBrainz "
            "candidate discovery"
        ),
        "targetCount": len(TARGETS),
        "candidateCount": len(all_rows),
        "seedModified": False,
        "masterModified": False,
        "websiteModified": False,
        "errors": errors,
        "candidates": all_rows,
        "searchUrls": search_urls,
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

    lines = [
        (
            "FANDEX MusicBrainz "
            "Artist Candidates Report v2"
        ),
        "=" * 76,
        f"createdAt: {payload['createdAt']}",
        f"version: {VERSION}",
        "",
        "실행 범위",
        "-" * 76,
        "신규 6명 MusicBrainz 후보 탐색",
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
            if (
                row["artist"]
                == target["artist"]
            )
        ]

        exact_rows = [
            row
            for row in artist_rows
            if (
                row["exactNameMatch"]
                == "TRUE"
            )
        ]

        full_rows = [
            row
            for row in artist_rows
            if (
                row["exactNameMatch"]
                == "TRUE"
                and row["countryMatch"]
                == "TRUE"
                and row["typeMatch"]
                == "TRUE"
            )
        ]

        lines.append(
            f"{target['artist']} | "
            f"후보={len(artist_rows)} | "
            f"exact={len(exact_rows)} | "
            f"fullMatch={len(full_rows)}"
        )

        for row in artist_rows[:3]:
            lines.append(
                f"  {row['candidateRank']}순위 | "
                f"{row['musicbrainzName']} | "
                f"type={row['type']} | "
                f"country={row['country']} | "
                f"MBID={row['mbid']} | "
                f"MBscore="
                f"{row['musicbrainzScore']} | "
                f"totalScore="
                f"{row['candidateScore']} | "
                f"disambiguation="
                f"{row['disambiguation']}"
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
            (
                "후보 탐색 결과이며 seed에 "
                "자동 반영하지 않습니다."
            ),
            (
                "MusicBrainz는 FANDEX 점수 "
                "신호가 아니라 identity/"
                "metadata 계층입니다."
            ),
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
    print(
        "MusicBrainz 아티스트 후보 탐색 v2 완료"
    )
    print("=" * 76)
    print(f"후보 수: {len(all_rows)}")
    print(f"오류 수: {len(errors)}")
    print(f"CSV: {LATEST_CSV}")
    print(f"JSON: {LATEST_JSON}")
    print(f"리포트: {LATEST_REPORT}")
    print("seedModified: FALSE")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()