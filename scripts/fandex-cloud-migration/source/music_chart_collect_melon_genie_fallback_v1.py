import csv
import json
import re
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


VERSION = "music_chart_collect_melon_genie_fallback_v1"

SEED_FILE = Path("music_chart_seed_v1.csv")

RESULT_LATEST_CSV = Path("music_chart_collect_melon_genie_fallback_v1_results_latest.csv")
PREVIEW_LATEST_CSV = Path("music_chart_seed_v1_melon_genie_fallback_preview_latest.csv")
REPORT_LATEST_TXT = Path("FANDEX_MELON_GENIE_FALLBACK_COLLECTOR_REPORT.txt")
RAW_DIR = Path("raw_music_chart_pages")


HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "Referer": "https://www.google.com/",
}


PLATFORM_URLS = {
    "melon": [
        "https://www.melon.com/chart/index.htm",
        "https://www.melon.com/chart/day/index.htm",
    ],
    "genie": [
        "https://www.genie.co.kr/chart/top200",
        "https://www.genie.co.kr/chart/top200?ditc=D&ymd=&hh=23&rtm=N&pg=1",
        "https://www.genie.co.kr/chart/top200?ditc=D&ymd=&hh=23&rtm=N&pg=2",
    ],
}


def normalize_text(value):
    if value is None:
        return ""

    text = str(value)
    text = text.replace("\ufeff", "")
    text = re.sub(r"\s+", " ", text)
    text = text.strip().lower()

    remove_tokens = [
        "(여자)아이들",
    ]

    for token in remove_tokens:
        text = text.replace(token.lower(), token.lower())

    return text


def compact_text(value):
    text = normalize_text(value)
    text = re.sub(r"[\s\-\_\.\,\!\?\(\)\[\]\'\"“”‘’/\\:;·]", "", text)
    return text


def contains_match(seed_track, seed_artist, chart_track, chart_artist):
    seed_track_c = compact_text(seed_track)
    seed_artist_c = compact_text(seed_artist)
    chart_track_c = compact_text(chart_track)
    chart_artist_c = compact_text(chart_artist)

    if not seed_track_c:
        return False

    track_ok = seed_track_c in chart_track_c or chart_track_c in seed_track_c

    if not seed_artist_c:
        return track_ok

    artist_ok = seed_artist_c in chart_artist_c or chart_artist_c in seed_artist_c

    # 곡명은 맞는데 아티스트 표기가 ATEEZ(에이티즈)처럼 섞이는 경우를 허용
    loose_artist_ok = seed_artist_c in compact_text(chart_artist + " " + chart_track)

    return track_ok and (artist_ok or loose_artist_ok)


def safe_int(value):
    try:
        if value in [None, ""]:
            return ""
        value = re.sub(r"[^0-9]", "", str(value))
        if not value:
            return ""
        return int(value)
    except Exception:
        return ""


def read_seed_rows():
    if not SEED_FILE.exists():
        raise SystemExit(f"seed 파일이 없습니다: {SEED_FILE}")

    with open(SEED_FILE, "r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    return rows


def fetch_url(url, platform):
    RAW_DIR.mkdir(exist_ok=True)

    response = requests.get(url, headers=HEADERS, timeout=20)
    status_code = response.status_code
    text = response.text or ""

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    raw_path = RAW_DIR / f"{platform}_{timestamp}_{len(text)}.html"
    raw_path.write_text(text, encoding="utf-8", errors="ignore")

    return {
        "url": url,
        "statusCode": status_code,
        "html": text,
        "rawPath": str(raw_path),
    }


def parse_melon(html, source_url):
    soup = BeautifulSoup(html, "html.parser")
    items = []

    rows = soup.select("tr")

    for row in rows:
        row_text = row.get_text(" ", strip=True)

        if not row_text:
            continue

        rank = ""

        rank_tag = row.select_one(".rank, span.rank")
        if rank_tag:
            rank = safe_int(rank_tag.get_text(" ", strip=True))

        if not rank:
            number_tag = row.select_one(".rank_wrap, .no")
            if number_tag:
                rank = safe_int(number_tag.get_text(" ", strip=True))

        title = ""

        title_tag = row.select_one("div.ellipsis.rank01 a")
        if title_tag:
            title = title_tag.get_text(" ", strip=True)

        artist = ""

        artist_tag = row.select_one("div.ellipsis.rank02 a")
        if artist_tag:
            artist = artist_tag.get_text(" ", strip=True)

        album = ""

        album_tag = row.select_one("div.ellipsis.rank03 a")
        if album_tag:
            album = album_tag.get_text(" ", strip=True)

        if title and artist:
            items.append({
                "platform": "melon",
                "sourceUrl": source_url,
                "rank": rank,
                "trackTitle": title,
                "artistName": artist,
                "album": album,
            })

    # selector가 막혔을 때 최소한의 fallback: 곡명/아티스트 텍스트 후보만 남김
    if not items:
        for idx, row in enumerate(rows, start=1):
            row_text = row.get_text(" ", strip=True)
            if len(row_text) < 5:
                continue

            items.append({
                "platform": "melon",
                "sourceUrl": source_url,
                "rank": idx,
                "trackTitle": row_text,
                "artistName": "",
                "album": "",
            })

    return items


def parse_genie(html, source_url):
    soup = BeautifulSoup(html, "html.parser")
    items = []

    rows = soup.select("tr.list")

    if not rows:
        rows = soup.select("tr")

    for idx, row in enumerate(rows, start=1):
        row_text = row.get_text(" ", strip=True)

        if not row_text:
            continue

        rank = ""

        number_tag = row.select_one(".number")
        if number_tag:
            rank = safe_int(number_tag.get_text(" ", strip=True))

        if not rank:
            rank = idx

        title = ""

        title_tag = row.select_one(".title.ellipsis")
        if title_tag:
            title = title_tag.get_text(" ", strip=True)
            title = re.sub(r"^\d+\s*", "", title)
            title = title.replace("TITLE", "").strip()

        if not title:
            title_tag = row.select_one("a.title")
            if title_tag:
                title = title_tag.get_text(" ", strip=True)

        artist = ""

        artist_tag = row.select_one(".artist.ellipsis")
        if artist_tag:
            artist = artist_tag.get_text(" ", strip=True)

        album = ""

        album_tag = row.select_one(".albumtitle.ellipsis")
        if album_tag:
            album = album_tag.get_text(" ", strip=True)

        if title and artist:
            items.append({
                "platform": "genie",
                "sourceUrl": source_url,
                "rank": rank,
                "trackTitle": title,
                "artistName": artist,
                "album": album,
            })

    return items


def collect_platform(platform):
    urls = PLATFORM_URLS.get(platform, [])
    all_items = []
    fetch_logs = []

    for url in urls:
        try:
            fetched = fetch_url(url, platform)
            fetch_logs.append({
                "platform": platform,
                "url": url,
                "statusCode": fetched["statusCode"],
                "rawPath": fetched["rawPath"],
                "htmlLength": len(fetched["html"]),
            })

            if fetched["statusCode"] != 200:
                continue

            if platform == "melon":
                items = parse_melon(fetched["html"], url)
            elif platform == "genie":
                items = parse_genie(fetched["html"], url)
            else:
                items = []

            all_items.extend(items)

            time.sleep(1)

        except Exception as e:
            fetch_logs.append({
                "platform": platform,
                "url": url,
                "statusCode": "ERROR",
                "rawPath": "",
                "htmlLength": 0,
                "error": str(e),
            })

    # 중복 제거: platform + rank + title + artist 기준
    deduped = []
    seen = set()

    for item in all_items:
        key = (
            item.get("platform", ""),
            str(item.get("rank", "")),
            compact_text(item.get("trackTitle", "")),
            compact_text(item.get("artistName", "")),
        )

        if key in seen:
            continue

        seen.add(key)
        deduped.append(item)

    return deduped, fetch_logs


def build_results(seed_rows, chart_items):
    now_date = datetime.now().strftime("%Y-%m-%d")
    results = []

    target_rows = [
        row for row in seed_rows
        if normalize_text(row.get("platform")) in ["melon", "genie"]
    ]

    for seed in target_rows:
        platform = normalize_text(seed.get("platform"))
        seed_artist = seed.get("artist", "")
        seed_track = seed.get("trackTitle", "")
        seed_chart = seed.get("chartName", "")

        candidates = [
            item for item in chart_items
            if item.get("platform") == platform
        ]

        matched = None

        for item in candidates:
            if contains_match(
                seed_track=seed_track,
                seed_artist=seed_artist,
                chart_track=item.get("trackTitle", ""),
                chart_artist=item.get("artistName", ""),
            ):
                matched = item
                break

        if matched:
            results.append({
                "status": "OK",
                "artist": seed_artist,
                "platform": platform,
                "chartName": seed_chart,
                "trackTitle": seed_track,
                "rank": matched.get("rank", ""),
                "chartDate": now_date,
                "matchedTrack": matched.get("trackTitle", ""),
                "matchedArtist": matched.get("artistName", ""),
                "matchedAlbum": matched.get("album", ""),
                "sourceUrl": matched.get("sourceUrl", ""),
                "memo": f"auto_collected_{platform}_fallback_v1",
            })
        else:
            results.append({
                "status": "MISS",
                "artist": seed_artist,
                "platform": platform,
                "chartName": seed_chart,
                "trackTitle": seed_track,
                "rank": "",
                "chartDate": now_date,
                "matchedTrack": "",
                "matchedArtist": "",
                "matchedAlbum": "",
                "sourceUrl": "",
                "memo": f"auto_collected_{platform}_fallback_v1_not_found",
            })

    return results


def build_preview_seed(seed_rows, results):
    result_map = {}

    for result in results:
        key = (
            normalize_text(result.get("artist")),
            normalize_text(result.get("platform")),
            normalize_text(result.get("chartName")),
            normalize_text(result.get("trackTitle")),
        )
        result_map[key] = result

    preview = []

    for row in seed_rows:
        new_row = dict(row)

        key = (
            normalize_text(row.get("artist")),
            normalize_text(row.get("platform")),
            normalize_text(row.get("chartName")),
            normalize_text(row.get("trackTitle")),
        )

        result = result_map.get(key)

        if result:
            new_row["rank"] = result.get("rank", "")
            new_row["chartDate"] = result.get("chartDate", "")
            new_row["memo"] = (
                f"{result.get('memo')}; "
                f"matchedTrack={result.get('matchedTrack')}; "
                f"matchedArtist={result.get('matchedArtist')}; "
                f"sourceUrl={result.get('sourceUrl')}"
            )

        preview.append(new_row)

    return preview


def write_csv(path, rows, fieldnames=None):
    if fieldnames is None:
        fields = []

        for row in rows:
            for key in row.keys():
                if key not in fields:
                    fields.append(key)

        fieldnames = fields

    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("Melon/Genie fallback collector v1 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("주의: music_chart_seed_v1.csv 원본은 수정하지 않습니다.")
    print()

    seed_rows = read_seed_rows()

    platforms = ["melon", "genie"]
    all_chart_items = []
    all_fetch_logs = []

    for platform in platforms:
        print(f"[{platform}] 수집 시작")
        items, logs = collect_platform(platform)
        all_chart_items.extend(items)
        all_fetch_logs.extend(logs)
        print(f"- parsed items: {len(items)}")

    results = build_results(seed_rows, all_chart_items)
    preview = build_preview_seed(seed_rows, results)

    result_timestamp_csv = Path(f"music_chart_collect_melon_genie_fallback_v1_results_{timestamp}.csv")
    preview_timestamp_csv = Path(f"music_chart_seed_v1_melon_genie_fallback_preview_{timestamp}.csv")
    chart_items_timestamp_json = Path(f"music_chart_melon_genie_chart_items_{timestamp}.json")
    fetch_log_timestamp_json = Path(f"music_chart_melon_genie_fetch_log_{timestamp}.json")
    report_timestamp_txt = Path(f"FANDEX_MELON_GENIE_FALLBACK_COLLECTOR_REPORT_{timestamp}.txt")

    result_fields = [
        "status",
        "artist",
        "platform",
        "chartName",
        "trackTitle",
        "rank",
        "chartDate",
        "matchedTrack",
        "matchedArtist",
        "matchedAlbum",
        "sourceUrl",
        "memo",
    ]

    write_csv(result_timestamp_csv, results, result_fields)
    write_csv(RESULT_LATEST_CSV, results, result_fields)

    preview_fields = list(seed_rows[0].keys()) if seed_rows else []
    write_csv(preview_timestamp_csv, preview, preview_fields)
    write_csv(PREVIEW_LATEST_CSV, preview, preview_fields)

    chart_items_payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "items": all_chart_items,
    }

    fetch_log_payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "logs": all_fetch_logs,
    }

    chart_items_timestamp_json.write_text(
        json.dumps(chart_items_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    fetch_log_timestamp_json.write_text(
        json.dumps(fetch_log_payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    ok_count = sum(1 for row in results if row.get("status") == "OK")
    miss_count = sum(1 for row in results if row.get("status") == "MISS")

    lines = []
    lines.append("FANDEX Melon/Genie Fallback Collector Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: collect/preview only")
    lines.append("seedModified: FALSE")
    lines.append("")
    lines.append("수집 결과")
    lines.append("-" * 70)
    lines.append(f"chart items parsed: {len(all_chart_items)}")
    lines.append(f"target rows: {len(results)}")
    lines.append(f"OK: {ok_count}")
    lines.append(f"MISS: {miss_count}")
    lines.append("")
    lines.append("대상별 결과")
    lines.append("-" * 70)

    for row in results:
        if row["status"] == "OK":
            lines.append(
                f"OK {row['artist']} / {row['platform']} / {row['trackTitle']} "
                f"→ {row['rank']}위 "
                f"({row['matchedTrack']} / {row['matchedArtist']})"
            )
        else:
            lines.append(
                f"MISS {row['artist']} / {row['platform']} / {row['trackTitle']}"
            )

    lines.append("")
    lines.append("fetch logs")
    lines.append("-" * 70)

    for log in all_fetch_logs:
        lines.append(
            f"{log.get('platform')} | {log.get('statusCode')} | "
            f"htmlLength={log.get('htmlLength')} | {log.get('url')}"
        )

    lines.append("")
    lines.append("생성 파일")
    lines.append("-" * 70)
    lines.append(f"result CSV: {result_timestamp_csv}")
    lines.append(f"latest result CSV: {RESULT_LATEST_CSV}")
    lines.append(f"preview CSV: {preview_timestamp_csv}")
    lines.append(f"latest preview CSV: {PREVIEW_LATEST_CSV}")
    lines.append(f"chart items JSON: {chart_items_timestamp_json}")
    lines.append(f"fetch log JSON: {fetch_log_timestamp_json}")
    lines.append("")
    lines.append("주의")
    lines.append("- music_chart_seed_v1.csv 원본은 아직 변경하지 않았다.")
    lines.append("- preview 파일을 확인한 뒤 별도 apply 스크립트로 반영한다.")
    lines.append("- Melon/Genie 페이지가 차단되면 htmlLength가 작거나 parsed items가 0으로 나올 수 있다.")

    for path in [report_timestamp_txt, REPORT_LATEST_TXT]:
        path.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("Melon/Genie fallback collector 결과")
    print("-" * 70)

    for row in results:
        if row["status"] == "OK":
            print(
                f"OK {row['artist']} / {row['platform']} / {row['trackTitle']} "
                f"→ {row['rank']}위 ({row['matchedTrack']} / {row['matchedArtist']})"
            )
        else:
            print(
                f"MISS {row['artist']} / {row['platform']} / {row['trackTitle']}"
            )

    print()
    print("=" * 70)
    print("Melon/Genie fallback collector v1 완료")
    print("=" * 70)
    print(f"결과 CSV: {RESULT_LATEST_CSV}")
    print(f"preview CSV: {PREVIEW_LATEST_CSV}")
    print(f"리포트: {REPORT_LATEST_TXT}")
    print()
    print("확인:")
    print("notepad FANDEX_MELON_GENIE_FALLBACK_COLLECTOR_REPORT.txt")
    print("notepad music_chart_collect_melon_genie_fallback_v1_results_latest.csv")
    print()
    print("주의: music_chart_seed_v1.csv 원본은 아직 변경하지 않았습니다.")


if __name__ == "__main__":
    main()