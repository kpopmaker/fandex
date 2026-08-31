from __future__ import annotations

import csv
import importlib.util
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from bs4 import BeautifulSoup


VERSION = "music_chart_discover_artist_candidates_v2"
COLLECTOR_FILE = Path("music_chart_collect_melon_genie_fallback_v1.py")

TARGET_ARTISTS = {
    "아이유": [
        "아이유",
        "IU",
    ],
    "에스파": [
        "에스파",
        "aespa",
    ],
    "에이티즈": [
        "에이티즈",
        "ATEEZ",
    ],
    "보이넥스트도어": [
        "보이넥스트도어",
        "BOYNEXTDOOR",
        "BOY NEXT DOOR",
        "BND",
    ],
    "아이브": [
        "아이브",
        "IVE",
    ],
    "르세라핌": [
        "르세라핌",
        "LE SSERAFIM",
        "LESSERAFIM",
    ],
    "뉴진스": [
        "뉴진스",
        "NewJeans",
    ],
    "세븐틴": [
        "세븐틴",
        "SEVENTEEN",
    ],
    "스트레이키즈": [
        "스트레이키즈",
        "스트레이 키즈",
        "Stray Kids",
        "SKZ",
    ],
    "투모로우바이투게더": [
        "투모로우바이투게더",
        "TOMORROW X TOGETHER",
        "TXT",
    ],
}

SOURCES = [
    {
        "sourceKey": "melon_top100",
        "platform": "melon",
        "url": "https://www.melon.com/chart/index.htm",
        "chartName": "TOP100",
        "chartType": "daily",
        "page": 1,
    },
    {
        "sourceKey": "genie_daily_page_1",
        "platform": "genie",
        "url": (
            "https://www.genie.co.kr/chart/top200"
            "?ditc=D&ymd=&hh=23&rtm=N&pg=1"
        ),
        "chartName": "Top 200 Daily",
        "chartType": "daily",
        "page": 1,
    },
    {
        "sourceKey": "genie_daily_page_2",
        "platform": "genie",
        "url": (
            "https://www.genie.co.kr/chart/top200"
            "?ditc=D&ymd=&hh=23&rtm=N&pg=2"
        ),
        "chartName": "Top 200 Daily",
        "chartType": "daily",
        "page": 2,
    },
    {
        "sourceKey": "genie_daily_page_3",
        "platform": "genie",
        "url": (
            "https://www.genie.co.kr/chart/top200"
            "?ditc=D&ymd=&hh=23&rtm=N&pg=3"
        ),
        "chartName": "Top 200 Daily",
        "chartType": "daily",
        "page": 3,
    },
    {
        "sourceKey": "genie_daily_page_4",
        "platform": "genie",
        "url": (
            "https://www.genie.co.kr/chart/top200"
            "?ditc=D&ymd=&hh=23&rtm=N&pg=4"
        ),
        "chartName": "Top 200 Daily",
        "chartType": "daily",
        "page": 4,
    },
]


def compact_text(value: Any) -> str:
    text = str(value or "").strip().casefold()
    return re.sub(r"[^0-9a-z가-힣]+", "", text)


def load_collector():
    if not COLLECTOR_FILE.exists():
        raise FileNotFoundError(
            f"기존 수집기 파일이 없습니다: {COLLECTOR_FILE}"
        )

    spec = importlib.util.spec_from_file_location(
        "music_chart_collector_v1",
        COLLECTOR_FILE,
    )

    if spec is None or spec.loader is None:
        raise RuntimeError("기존 수집기를 불러올 수 없습니다.")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def find_target_artist(chart_artist: str) -> tuple[str, str] | None:
    normalized_chart_artist = compact_text(chart_artist)

    if not normalized_chart_artist:
        return None

    for target_artist, aliases in TARGET_ARTISTS.items():
        for alias in aliases:
            normalized_alias = compact_text(alias)

            if normalized_alias and normalized_alias in normalized_chart_artist:
                return target_artist, alias

    return None


def extract_first_rank(number_tag) -> int | None:
    """
    Genie .number 영역의 첫 숫자만 읽는다.

    예:
    '36 상승 3' → 36
    '53 하락 1' → 53
    """
    if number_tag is None:
        return None

    pieces = list(number_tag.stripped_strings)

    for piece in pieces:
        match = re.match(r"^\s*(\d{1,3})(?:\D|$)", piece)

        if match:
            return int(match.group(1))

    text = number_tag.get_text(" ", strip=True)
    match = re.match(r"^\s*(\d{1,3})(?:\D|$)", text)

    if match:
        return int(match.group(1))

    return None


def parse_genie_strict(
    html: str,
    source: dict[str, Any],
) -> list[dict[str, Any]]:
    soup = BeautifulSoup(html, "html.parser")
    rows = soup.select("tr.list")

    page = int(source["page"])
    expected_start = ((page - 1) * 50) + 1
    expected_end = expected_start + 49

    items: list[dict[str, Any]] = []

    for row_index, row in enumerate(rows, start=0):
        fallback_rank = expected_start + row_index

        number_tag = row.select_one(".number")
        parsed_rank = extract_first_rank(number_tag)

        if (
            parsed_rank is not None
            and expected_start <= parsed_rank <= expected_end
        ):
            rank = parsed_rank
            rank_source = "number_tag"
        else:
            rank = fallback_rank
            rank_source = "page_row_position"

        title_tag = row.select_one(".title.ellipsis")

        if title_tag is None:
            title_tag = row.select_one("a.title")

        title = ""

        if title_tag is not None:
            title = title_tag.get_text(" ", strip=True)
            title = re.sub(r"^\d+\s*", "", title)
            title = title.replace("TITLE", "").strip()

        artist_tag = row.select_one(".artist.ellipsis")
        artist = ""

        if artist_tag is not None:
            artist = artist_tag.get_text(" ", strip=True)

        album_tag = row.select_one(".albumtitle.ellipsis")
        album = ""

        if album_tag is not None:
            album = album_tag.get_text(" ", strip=True)

        if not title or not artist:
            continue

        items.append(
            {
                "platform": "genie",
                "sourceKey": source["sourceKey"],
                "sourceUrl": source["url"],
                "chartName": source["chartName"],
                "chartType": source["chartType"],
                "page": page,
                "rank": rank,
                "rankSource": rank_source,
                "trackTitle": title,
                "artistName": artist,
                "album": album,
            }
        )

    return items


def collect_source(
    collector,
    source: dict[str, Any],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    platform = source["platform"]
    url = source["url"]

    fetched = collector.fetch_url(url, platform)

    fetch_log = {
        "sourceKey": source["sourceKey"],
        "platform": platform,
        "url": url,
        "statusCode": fetched.get("statusCode"),
        "rawPath": fetched.get("rawPath", ""),
        "htmlLength": len(fetched.get("html", "")),
    }

    if fetched.get("statusCode") != 200:
        return [], fetch_log

    if platform == "melon":
        items = collector.parse_melon(
            fetched["html"],
            url,
        )

        for item in items:
            item["sourceKey"] = source["sourceKey"]
            item["chartName"] = source["chartName"]
            item["chartType"] = source["chartType"]
            item["page"] = source["page"]
            item["rankSource"] = "melon_number_tag"

    elif platform == "genie":
        items = parse_genie_strict(
            fetched["html"],
            source,
        )

    else:
        items = []

    return items, fetch_log


def dedupe_chart_items(
    rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    selected: dict[
        tuple[str, str, str],
        dict[str, Any],
    ] = {}

    for row in rows:
        key = (
            str(row.get("sourceKey") or ""),
            compact_text(row.get("trackTitle")),
            compact_text(row.get("artistName")),
        )

        previous = selected.get(key)

        if previous is None:
            selected[key] = row
            continue

        try:
            previous_rank = int(previous.get("rank") or 999999)
        except (TypeError, ValueError):
            previous_rank = 999999

        try:
            current_rank = int(row.get("rank") or 999999)
        except (TypeError, ValueError):
            current_rank = 999999

        if current_rank < previous_rank:
            selected[key] = row

    return list(selected.values())


def build_candidates(
    chart_items: list[dict[str, Any]],
    chart_date: str,
) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []

    for item in chart_items:
        chart_artist = str(
            item.get("artistName") or ""
        ).strip()

        matched = find_target_artist(chart_artist)

        if matched is None:
            continue

        target_artist, matched_alias = matched

        candidates.append(
            {
                "approve": "",
                "artist": target_artist,
                "platform": item.get("platform", ""),
                "chartName": item.get("chartName", ""),
                "trackTitle": item.get("trackTitle", ""),
                "rank": item.get("rank", ""),
                "chartDate": chart_date,
                "chartType": item.get("chartType", ""),
                "metricType": "",
                "metricValue": "",
                "memo": (
                    f"candidate_discovered_by={VERSION}; "
                    f"sourceKey={item.get('sourceKey', '')}; "
                    f"matchedArtist={chart_artist}; "
                    f"matchedAlias={matched_alias}; "
                    f"rankSource={item.get('rankSource', '')}; "
                    f"sourceUrl={item.get('sourceUrl', '')}"
                ),
                "sourceKey": item.get("sourceKey", ""),
                "matchedArtist": chart_artist,
                "matchedAlias": matched_alias,
                "rankSource": item.get("rankSource", ""),
                "sourceUrl": item.get("sourceUrl", ""),
            }
        )

    platform_order = {
        "melon": 0,
        "genie": 1,
    }

    candidates.sort(
        key=lambda row: (
            row.get("artist", ""),
            platform_order.get(row.get("platform", ""), 9),
            int(row.get("rank") or 999999),
            row.get("trackTitle", ""),
        )
    )

    return candidates


def write_csv(
    path: Path,
    rows: list[dict[str, Any]],
) -> None:
    fieldnames = [
        "approve",
        "artist",
        "platform",
        "chartName",
        "trackTitle",
        "rank",
        "chartDate",
        "chartType",
        "metricType",
        "metricValue",
        "memo",
        "sourceKey",
        "matchedArtist",
        "matchedAlias",
        "rankSource",
        "sourceUrl",
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


def write_report(
    path: Path,
    candidates: list[dict[str, Any]],
    source_counts: dict[str, int],
    created_at: str,
) -> None:
    artist_counts = {
        artist: 0
        for artist in TARGET_ARTISTS
    }

    for row in candidates:
        artist = str(row.get("artist") or "")
        artist_counts[artist] = artist_counts.get(artist, 0) + 1

    lines = [
        "Music chart 신규 아티스트 후보 탐색 v2",
        "=" * 76,
        f"version: {VERSION}",
        f"createdAt: {created_at}",
        "seedModified: FALSE",
        "websiteModified: FALSE",
        "",
        "수집 소스",
        "-" * 76,
    ]

    for source in SOURCES:
        source_key = source["sourceKey"]
        lines.append(
            f"{source_key}: parsedItems="
            f"{source_counts.get(source_key, 0)}"
        )

    lines.extend(
        [
            "",
            "신규 6명 후보 현황",
            "-" * 76,
        ]
    )

    for artist in TARGET_ARTISTS:
        count = artist_counts.get(artist, 0)

        if count:
            lines.append(f"OK   {artist}: 후보 {count}개")
        else:
            lines.append(f"MISS {artist}: 현재 후보 없음")

    lines.extend(
        [
            "",
            "정리된 후보",
            "-" * 76,
        ]
    )

    if not candidates:
        lines.append("후보가 없습니다.")
    else:
        for row in candidates:
            lines.append(
                f"{row['artist']} | "
                f"{row['platform']} | "
                f"{row['chartName']} | "
                f"{row['rank']}위 | "
                f"{row['trackTitle']} | "
                f"rankSource={row['rankSource']}"
            )

    lines.extend(
        [
            "",
            "안전 확인",
            "-" * 76,
            "OK 기존 fallback v1 수집기는 수정하지 않았습니다.",
            "OK music_chart_seed_v1.csv는 수정하지 않았습니다.",
            "OK website public/data는 수정하지 않았습니다.",
        ]
    )

    path.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )


def main() -> int:
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    chart_date = datetime.now().strftime("%Y-%m-%d")
    created_at = datetime.now().isoformat(timespec="seconds")

    print()
    print("Music chart 신규 아티스트 후보 탐색 v2 시작")
    print("=" * 76)
    print("기존 수집기와 seed 원본은 수정하지 않습니다.")
    print()

    try:
        collector = load_collector()
    except Exception as exc:
        print("기존 수집기를 불러오지 못했습니다.")
        print(f"원인: {exc}")
        return 1

    all_items: list[dict[str, Any]] = []
    fetch_logs: list[dict[str, Any]] = []
    source_counts: dict[str, int] = {}

    for source in SOURCES:
        print(f"[{source['sourceKey']}] 수집 시작")

        try:
            items, fetch_log = collect_source(
                collector,
                source,
            )
        except Exception as exc:
            items = []
            fetch_log = {
                "sourceKey": source["sourceKey"],
                "platform": source["platform"],
                "url": source["url"],
                "statusCode": "ERROR",
                "error": str(exc),
            }

        source_counts[source["sourceKey"]] = len(items)
        all_items.extend(items)
        fetch_logs.append(fetch_log)

        print(f"- parsed items: {len(items)}")

    deduped_items = dedupe_chart_items(all_items)
    candidates = build_candidates(
        deduped_items,
        chart_date,
    )

    timestamp_csv = Path(
        f"music_chart_artist_candidates_v2_{timestamp}.csv"
    )
    latest_csv = Path(
        "music_chart_artist_candidates_v2_latest.csv"
    )

    timestamp_json = Path(
        f"music_chart_artist_candidates_v2_raw_{timestamp}.json"
    )
    latest_json = Path(
        "music_chart_artist_candidates_v2_raw_latest.json"
    )

    timestamp_report = Path(
        f"MUSIC_CHART_ARTIST_CANDIDATES_V2_REPORT_{timestamp}.txt"
    )
    latest_report = Path(
        "MUSIC_CHART_ARTIST_CANDIDATES_V2_REPORT_latest.txt"
    )

    write_csv(timestamp_csv, candidates)
    write_csv(latest_csv, candidates)

    raw_payload = {
        "version": VERSION,
        "createdAt": created_at,
        "seedModified": False,
        "websiteModified": False,
        "sourceCounts": source_counts,
        "candidateCount": len(candidates),
        "candidates": candidates,
        "fetchLogs": fetch_logs,
    }

    raw_text = json.dumps(
        raw_payload,
        ensure_ascii=False,
        indent=2,
        default=str,
    )

    timestamp_json.write_text(raw_text, encoding="utf-8")
    latest_json.write_text(raw_text, encoding="utf-8")

    write_report(
        timestamp_report,
        candidates,
        source_counts,
        created_at,
    )
    write_report(
        latest_report,
        candidates,
        source_counts,
        created_at,
    )

    print()
    print("정리된 후보")
    print("-" * 76)

    if not candidates:
        print("발견된 후보가 없습니다.")
    else:
        for row in candidates:
            print(
                f"{row['artist']} / "
                f"{row['platform']} / "
                f"{row['chartName']} / "
                f"{row['rank']}위 / "
                f"{row['trackTitle']}"
            )

    print()
    print("=" * 76)
    print("Music chart 신규 아티스트 후보 탐색 v2 완료")
    print("=" * 76)
    print(f"후보 수: {len(candidates)}")
    print(f"최신 후보 CSV: {latest_csv}")
    print(f"최신 보고서: {latest_report}")
    print("seedModified: FALSE")
    print("websiteModified: FALSE")

    return 0


if __name__ == "__main__":
    sys.exit(main())