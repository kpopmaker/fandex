from __future__ import annotations

import csv
import importlib.util
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Any


VERSION = "music_chart_discover_artist_candidates_v1"

COLLECTOR_FILE = Path("music_chart_collect_melon_genie_fallback_v1.py")

TARGET_ARTISTS = {
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


def compact_text(value: Any) -> str:
    """공백과 기호를 제거해 비교하기 쉬운 문자열로 변환한다."""
    text = str(value or "").strip().casefold()
    return re.sub(r"[^0-9a-z가-힣]+", "", text)


def load_collector_module():
    if not COLLECTOR_FILE.exists():
        raise FileNotFoundError(
            f"기존 수집기 파일이 없습니다: {COLLECTOR_FILE}"
        )

    spec = importlib.util.spec_from_file_location(
        "music_chart_existing_collector",
        COLLECTOR_FILE,
    )

    if spec is None or spec.loader is None:
        raise RuntimeError("기존 수집기 모듈을 불러올 수 없습니다.")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    if not hasattr(module, "collect_platform"):
        raise AttributeError(
            "기존 수집기에 collect_platform 함수가 없습니다."
        )

    return module


def find_matching_artist(
    chart_artist: str,
) -> tuple[str, str] | None:
    """
    차트의 아티스트명에서 신규 6명의 별칭을 찾는다.

    곡 제목은 검색하지 않고 아티스트명만 사용해
    동명이곡과 불필요한 오탐을 줄인다.
    """
    compact_artist = compact_text(chart_artist)

    if not compact_artist:
        return None

    for target_artist, aliases in TARGET_ARTISTS.items():
        for alias in aliases:
            compact_alias = compact_text(alias)

            if not compact_alias:
                continue

            if compact_alias in compact_artist:
                return target_artist, alias

    return None


def get_default_chart_name(platform: str) -> str:
    if platform == "melon":
        return "TOP100"

    if platform == "genie":
        return "Top 200"

    return ""


def get_default_chart_type(platform: str) -> str:
    if platform == "melon":
        return "daily"

    if platform == "genie":
        return "realtime"

    return ""


def build_candidates(
    chart_items: list[dict[str, Any]],
    chart_date: str,
) -> list[dict[str, Any]]:
    candidates: list[dict[str, Any]] = []
    seen: set[tuple[str, str, str, str, str]] = set()

    for item in chart_items:
        chart_artist = str(
            item.get("artistName")
            or item.get("artist")
            or ""
        ).strip()

        match = find_matching_artist(chart_artist)

        if match is None:
            continue

        target_artist, matched_alias = match

        platform = str(item.get("platform") or "").strip().lower()
        track_title = str(
            item.get("trackTitle")
            or item.get("title")
            or ""
        ).strip()

        rank = item.get("rank", "")
        chart_name = str(
            item.get("chartName")
            or get_default_chart_name(platform)
        ).strip()

        source_url = str(
            item.get("sourceUrl")
            or item.get("url")
            or ""
        ).strip()

        if not track_title:
            continue

        dedupe_key = (
            compact_text(target_artist),
            compact_text(platform),
            compact_text(track_title),
            compact_text(chart_artist),
            str(rank),
        )

        if dedupe_key in seen:
            continue

        seen.add(dedupe_key)

        memo_parts = [
            f"candidate_discovered_by={VERSION}",
            f"matchedArtist={chart_artist}",
            f"matchedAlias={matched_alias}",
        ]

        if source_url:
            memo_parts.append(f"sourceUrl={source_url}")

        candidates.append(
            {
                "approve": "",
                "artist": target_artist,
                "platform": platform,
                "chartName": chart_name,
                "trackTitle": track_title,
                "rank": rank,
                "chartDate": chart_date,
                "chartType": get_default_chart_type(platform),
                "metricType": "",
                "metricValue": "",
                "memo": "; ".join(memo_parts),
                "matchedArtist": chart_artist,
                "matchedAlias": matched_alias,
                "sourceUrl": source_url,
            }
        )

    def sort_key(row: dict[str, Any]):
        platform_order = {
            "melon": 0,
            "genie": 1,
        }

        try:
            rank_value = int(row.get("rank") or 999999)
        except (TypeError, ValueError):
            rank_value = 999999

        return (
            row.get("artist", ""),
            platform_order.get(row.get("platform", ""), 9),
            rank_value,
            row.get("trackTitle", ""),
        )

    candidates.sort(key=sort_key)
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
        "matchedArtist",
        "matchedAlias",
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
    platform_counts: dict[str, int],
    fetch_logs: list[Any],
    timestamp: str,
) -> None:
    candidate_counts = {
        artist: 0
        for artist in TARGET_ARTISTS
    }

    platform_candidate_counts: dict[str, int] = {}

    for row in candidates:
        artist = str(row.get("artist") or "")
        platform = str(row.get("platform") or "")

        candidate_counts[artist] = (
            candidate_counts.get(artist, 0) + 1
        )

        platform_candidate_counts[platform] = (
            platform_candidate_counts.get(platform, 0) + 1
        )

    lines = [
        "Music chart 신규 아티스트 후보 탐색 v1",
        "=" * 72,
        f"version: {VERSION}",
        f"createdAt: {timestamp}",
        "scope: Melon/Genie 후보 탐색",
        "seedModified: FALSE",
        "",
        "차트 수집 결과",
        "-" * 72,
    ]

    for platform in ["melon", "genie"]:
        lines.append(
            f"{platform}: "
            f"parsedItems={platform_counts.get(platform, 0)}, "
            f"matchedCandidates={platform_candidate_counts.get(platform, 0)}"
        )

    lines.extend(
        [
            "",
            "신규 6명 탐색 결과",
            "-" * 72,
        ]
    )

    for artist in TARGET_ARTISTS:
        count = candidate_counts.get(artist, 0)

        if count:
            lines.append(f"OK   {artist}: 후보 {count}개")
        else:
            lines.append(f"MISS {artist}: 현재 후보 없음")

    lines.extend(
        [
            "",
            "발견 후보",
            "-" * 72,
        ]
    )

    if not candidates:
        lines.append("발견된 후보가 없습니다.")
    else:
        for row in candidates:
            lines.append(
                f"{row['artist']} | "
                f"{row['platform']} | "
                f"{row['rank']}위 | "
                f"{row['trackTitle']} | "
                f"차트 표기: {row['matchedArtist']}"
            )

    lines.extend(
        [
            "",
            "안전 확인",
            "-" * 72,
            "OK music_chart_seed_v1.csv 원본은 수정하지 않았습니다.",
            "OK website public/data는 수정하지 않았습니다.",
            "OK 후보 CSV만 생성했습니다.",
            "",
            f"fetchLogCount: {len(fetch_logs)}",
        ]
    )

    path.write_text(
        "\n".join(lines),
        encoding="utf-8",
    )


def main() -> int:
    timestamp_file = datetime.now().strftime("%Y%m%d_%H%M%S")
    chart_date = datetime.now().strftime("%Y-%m-%d")
    created_at = datetime.now().isoformat(timespec="seconds")

    print()
    print("Music chart 신규 아티스트 후보 탐색 v1 시작")
    print("=" * 72)
    print("주의: music_chart_seed_v1.csv는 수정하지 않습니다.")
    print()

    try:
        collector = load_collector_module()
    except Exception as exc:
        print("기존 수집기를 불러오지 못했습니다.")
        print(f"원인: {exc}")
        return 1

    all_chart_items: list[dict[str, Any]] = []
    all_fetch_logs: list[Any] = []
    platform_counts: dict[str, int] = {}

    for platform in ["melon", "genie"]:
        print(f"[{platform}] 차트 수집 시작")

        try:
            items, logs = collector.collect_platform(platform)
        except Exception as exc:
            print(f"- 수집 실패: {exc}")
            items = []
            logs = [
                {
                    "platform": platform,
                    "status": "error",
                    "error": str(exc),
                }
            ]

        items = list(items or [])
        logs = list(logs or [])

        for item in items:
            if not item.get("platform"):
                item["platform"] = platform

        platform_counts[platform] = len(items)
        all_chart_items.extend(items)
        all_fetch_logs.extend(logs)

        print(f"- parsed items: {len(items)}")

    candidates = build_candidates(
        all_chart_items,
        chart_date,
    )

    timestamp_csv = Path(
        f"music_chart_artist_candidates_v1_{timestamp_file}.csv"
    )
    latest_csv = Path(
        "music_chart_artist_candidates_v1_latest.csv"
    )

    timestamp_json = Path(
        f"music_chart_artist_candidates_v1_raw_{timestamp_file}.json"
    )
    latest_json = Path(
        "music_chart_artist_candidates_v1_raw_latest.json"
    )

    timestamp_report = Path(
        f"MUSIC_CHART_ARTIST_CANDIDATES_V1_REPORT_{timestamp_file}.txt"
    )
    latest_report = Path(
        "MUSIC_CHART_ARTIST_CANDIDATES_V1_REPORT_latest.txt"
    )

    write_csv(timestamp_csv, candidates)
    write_csv(latest_csv, candidates)

    raw_payload = {
        "version": VERSION,
        "createdAt": created_at,
        "seedModified": False,
        "platformCounts": platform_counts,
        "candidateCount": len(candidates),
        "candidates": candidates,
        "fetchLogs": all_fetch_logs,
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
        platform_counts,
        all_fetch_logs,
        created_at,
    )

    write_report(
        latest_report,
        candidates,
        platform_counts,
        all_fetch_logs,
        created_at,
    )

    print()
    print("후보 탐색 결과")
    print("-" * 72)

    if not candidates:
        print("발견된 후보가 없습니다.")
    else:
        for row in candidates:
            print(
                f"{row['artist']} / "
                f"{row['platform']} / "
                f"{row['rank']}위 / "
                f"{row['trackTitle']} / "
                f"{row['matchedArtist']}"
            )

    print()
    print("=" * 72)
    print("Music chart 신규 아티스트 후보 탐색 완료")
    print("=" * 72)
    print(f"후보 수: {len(candidates)}")
    print(f"최신 후보 CSV: {latest_csv}")
    print(f"최신 보고서: {latest_report}")
    print("seedModified: FALSE")

    return 0


if __name__ == "__main__":
    sys.exit(main())