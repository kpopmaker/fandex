import csv
import html
import re
import urllib.request
from datetime import datetime
from pathlib import Path


INPUT_SEED = Path("music_chart_seed_v1.csv")
TARGETS_FILE = Path("music_chart_targets_v1.csv")

BUGS_CHART_URL = "https://music.bugs.co.kr/chart"


def read_csv(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def clean(value):
    return (value or "").strip()


def normalize(value):
    value = clean(value).lower()
    value = re.sub(r"\s+", "", value)
    value = re.sub(r"[\[\]\(\)\{\}'\"“”‘’·.,!?:;_\-]", "", value)
    return value


def strip_tags(value):
    value = re.sub(r"<script.*?</script>", "", value, flags=re.I | re.S)
    value = re.sub(r"<style.*?</style>", "", value, flags=re.I | re.S)
    value = re.sub(r"<[^>]+>", " ", value)
    value = html.unescape(value)
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def fetch_bugs_chart():
    request = urllib.request.Request(
        BUGS_CHART_URL,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            ),
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        },
    )

    with urllib.request.urlopen(request, timeout=20) as response:
        raw = response.read()

    return raw.decode("utf-8", errors="replace")


def parse_bugs_chart(page_html):
    rows = re.findall(r"<tr[^>]*trackid=[^>]*>.*?</tr>", page_html, flags=re.I | re.S)
    chart_rows = []

    for row_html in rows:
        rank_match = re.search(
            r'<div[^>]+class="ranking"[^>]*>.*?<strong>(\d+)</strong>',
            row_html,
            flags=re.I | re.S,
        )

        title_block_match = re.search(
            r'<p[^>]+class="title"[^>]*>(.*?)</p>',
            row_html,
            flags=re.I | re.S,
        )

        artist_block_match = re.search(
            r'<p[^>]+class="artist"[^>]*>(.*?)</p>',
            row_html,
            flags=re.I | re.S,
        )

        if not title_block_match or not artist_block_match:
            continue

        rank = clean(rank_match.group(1)) if rank_match else ""
        title = strip_tags(title_block_match.group(1))
        artist = strip_tags(artist_block_match.group(1))

        if not rank or not title:
            continue

        chart_rows.append({
            "rank": int(rank),
            "trackTitle": title,
            "artist": artist,
            "platform": "bugs",
            "chartName": "Bugs Realtime",
        })

    return sorted(chart_rows, key=lambda x: x["rank"])


def build_targets_from_seed(seed_rows):
    targets = []

    for row in seed_rows:
        platform = normalize(row.get("platform"))

        if platform != "bugs":
            continue

        artist = clean(row.get("artist"))
        chart_name = clean(row.get("chartName")) or "Bugs Realtime"
        track_title = clean(row.get("trackTitle"))

        if not artist or not track_title:
            continue

        targets.append({
            "artist": artist,
            "platform": "bugs",
            "chartName": chart_name,
            "trackTitle": track_title,
            "trackAlias": track_title,
            "artistAlias": artist,
            "source": "music_chart_seed_v1.csv",
        })

    return targets


def find_match(target, chart_rows):
    target_track = normalize(target.get("trackAlias") or target.get("trackTitle"))
    target_artist = normalize(target.get("artistAlias") or target.get("artist"))

    for chart_row in chart_rows:
        chart_track = normalize(chart_row.get("trackTitle"))
        chart_artist = normalize(chart_row.get("artist"))

        track_ok = target_track and (
            target_track in chart_track or chart_track in target_track
        )

        artist_ok = True
        if target_artist:
            artist_ok = target_artist in chart_artist or chart_artist in target_artist

        if track_ok and artist_ok:
            return chart_row

    return None


def update_seed_preview(seed_rows, matched_results, now, today):
    updated_rows = []

    for row in seed_rows:
        new_row = dict(row)

        platform = normalize(row.get("platform"))
        artist = clean(row.get("artist"))
        track_title = clean(row.get("trackTitle"))

        key = (artist, platform, track_title)

        if key in matched_results:
            match = matched_results[key]
            new_row["rank"] = str(match["rank"])
            new_row["chartDate"] = today
            new_row["chartType"] = clean(row.get("chartType")) or "realtime"
            new_row["memo"] = (
                f"auto_collected_bugs_v1; collectedAt={now}; "
                f"chartTitle={match['trackTitle']}; chartArtist={match['artist']}"
            )

        updated_rows.append(new_row)

    return updated_rows


def main():
    if not INPUT_SEED.exists():
        raise SystemExit("music_chart_seed_v1.csv 파일이 없습니다.")

    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    today = datetime.now().strftime("%Y-%m-%d")

    seed_rows = read_csv(INPUT_SEED)
    targets = build_targets_from_seed(seed_rows)

    if not targets:
        raise SystemExit("music_chart_seed_v1.csv 안에 bugs 대상 곡이 없습니다.")

    print()
    print("Bugs chart collect v1 시작")
    print("=" * 60)
    print(f"대상 곡 수: {len(targets)}")
    print(f"수집 URL: {BUGS_CHART_URL}")

    page = fetch_bugs_chart()
    chart_rows = parse_bugs_chart(page)

    if not chart_rows:
        raise SystemExit("벅스 차트 행을 파싱하지 못했습니다.")

    print(f"벅스 차트 파싱 곡 수: {len(chart_rows)}")

    result_rows = []
    matched_results = {}

    for target in targets:
        match = find_match(target, chart_rows)

        if match:
            status = "matched"
            rank = match["rank"]
            chart_title = match["trackTitle"]
            chart_artist = match["artist"]

            key = (
                clean(target["artist"]),
                normalize(target["platform"]),
                clean(target["trackTitle"]),
            )
            matched_results[key] = match
        else:
            status = "not_found"
            rank = ""
            chart_title = ""
            chart_artist = ""

        result_rows.append({
            "status": status,
            "artist": target["artist"],
            "platform": target["platform"],
            "chartName": target["chartName"],
            "targetTrackTitle": target["trackTitle"],
            "matchedRank": rank,
            "matchedTrackTitle": chart_title,
            "matchedArtist": chart_artist,
            "collectedAt": datetime.now().isoformat(timespec="seconds"),
            "sourceUrl": BUGS_CHART_URL,
        })

    result_file = Path(f"music_chart_collect_bugs_v1_results_{now}.csv")
    preview_file = Path(f"music_chart_seed_v1_bugs_preview_{now}.csv")

    result_fields = [
        "status",
        "artist",
        "platform",
        "chartName",
        "targetTrackTitle",
        "matchedRank",
        "matchedTrackTitle",
        "matchedArtist",
        "collectedAt",
        "sourceUrl",
    ]

    write_csv(result_file, result_rows, result_fields)

    if seed_rows:
        seed_fields = list(seed_rows[0].keys())
        preview_rows = update_seed_preview(seed_rows, matched_results, now, today)
        write_csv(preview_file, preview_rows, seed_fields)

    print()
    print("Bugs chart collect v1 결과")
    print("-" * 60)

    for row in result_rows:
        if row["status"] == "matched":
            print(
                f"OK {row['artist']} / {row['targetTrackTitle']} "
                f"→ {row['matchedRank']}위 "
                f"({row['matchedTrackTitle']} / {row['matchedArtist']})"
            )
        else:
            print(f"MISS {row['artist']} / {row['targetTrackTitle']}")

    print()
    print("=" * 60)
    print("Bugs chart collect v1 완료")
    print("=" * 60)
    print(f"결과 CSV: {result_file}")
    print(f"seed preview CSV: {preview_file}")
    print()
    print("주의: music_chart_seed_v1.csv 원본은 아직 변경하지 않았습니다.")
    print("preview 파일 확인 후 다음 단계에서 원본 seed에 반영합니다.")


if __name__ == "__main__":
    main()