import csv
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path


VERSION = "itunes_collect_track_metadata_v1"

SEED_FILE = Path("itunes_track_seed_v1.csv")

LATEST_CSV = Path("itunes_track_metadata_v1_latest.csv")
LATEST_JSON = Path("fandex_itunes_track_metadata_latest.json")
LATEST_REPORT = Path("FANDEX_ITUNES_COLLECTOR_REPORT.txt")

BASE_URL = "https://itunes.apple.com/search"
REQUEST_SLEEP_SECONDS = 0.7

DEFAULT_SEED_ROWS = [
    {
        "artist": "아이유",
        "trackTitle": "Love wins all",
        "query": "IU Love wins all",
        "country": "KR",
        "memo": "IU Love wins all",
    },
    {
        "artist": "에이티즈",
        "trackTitle": "BAD",
        "query": "ATEEZ BAD",
        "country": "KR",
        "memo": "ATEEZ BAD",
    },
    {
        "artist": "보이넥스트도어",
        "trackTitle": "VIRAL",
        "query": "BOYNEXTDOOR VIRAL",
        "country": "KR",
        "memo": "BOYNEXTDOOR VIRAL",
    },
    {
        "artist": "에스파",
        "trackTitle": "LEMONADE",
        "query": "aespa LEMONADE",
        "country": "KR",
        "memo": "aespa LEMONADE",
    },
]


def ensure_seed_file():
    if SEED_FILE.exists():
        return

    fieldnames = ["artist", "trackTitle", "query", "country", "memo"]

    with open(SEED_FILE, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(DEFAULT_SEED_ROWS)

    print(f"seed 파일 생성: {SEED_FILE}")


def read_seed_rows():
    ensure_seed_file()

    with open(SEED_FILE, "r", encoding="utf-8-sig", newline="") as f:
        rows = list(csv.DictReader(f))

    cleaned = []

    for row in rows:
        artist = (row.get("artist") or "").strip()
        track_title = (row.get("trackTitle") or "").strip()
        query = (row.get("query") or "").strip()
        country = (row.get("country") or "KR").strip()

        if not artist or not query:
            continue

        cleaned.append({
            "artist": artist,
            "trackTitle": track_title,
            "query": query,
            "country": country,
            "memo": (row.get("memo") or "").strip(),
        })

    return cleaned


def fetch_json(params):
    query = urllib.parse.urlencode(params)
    url = f"{BASE_URL}?{query}"

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "FANDEXPythonCollector/1.0",
            "Accept": "application/json",
        },
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read().decode("utf-8")

    return json.loads(body), url


def normalize_text(value):
    return (value or "").strip().lower()


def score_candidate(item, seed):
    score = 0

    expected_artist = normalize_text(seed["artist"])
    expected_track = normalize_text(seed["trackTitle"])
    query = normalize_text(seed["query"])

    artist_name = normalize_text(item.get("artistName"))
    track_name = normalize_text(item.get("trackName"))
    collection_name = normalize_text(item.get("collectionName"))

    if expected_track and track_name == expected_track:
        score += 80
    elif expected_track and expected_track in track_name:
        score += 50

    if "iu" in query and artist_name == "iu":
        score += 60
    if "ateez" in query and "ateez" in artist_name:
        score += 60
    if "boynextdoor" in query and "boynextdoor" in artist_name.replace(" ", ""):
        score += 60
    if "aespa" in query and "aespa" in artist_name:
        score += 60

    if expected_track and expected_track in collection_name:
        score += 10

    if item.get("kind") == "song":
        score += 10

    return score


def pick_best_result(results, seed):
    if not results:
        return None

    ranked = sorted(
        results,
        key=lambda item: score_candidate(item, seed),
        reverse=True,
    )

    return ranked[0]


def collect_one(seed):
    params = {
        "term": seed["query"],
        "country": seed["country"],
        "media": "music",
        "entity": "musicTrack",
        "limit": 10,
    }

    data, url = fetch_json(params)

    results = data.get("results") or []
    best = pick_best_result(results, seed)

    if not best:
        return {
            "artist": seed["artist"],
            "trackTitle": seed["trackTitle"],
            "query": seed["query"],
            "country": seed["country"],
            "status": "not_found",
            "resultCount": data.get("resultCount", 0),
            "trackId": "",
            "artistId": "",
            "collectionId": "",
            "itunesArtistName": "",
            "itunesTrackName": "",
            "collectionName": "",
            "primaryGenreName": "",
            "releaseDate": "",
            "trackTimeMillis": "",
            "currency": "",
            "trackPrice": "",
            "collectionPrice": "",
            "trackViewUrl": "",
            "previewUrl": "",
            "score": "",
            "requestUrl": url,
            "memo": seed["memo"],
        }, results

    row = {
        "artist": seed["artist"],
        "trackTitle": seed["trackTitle"],
        "query": seed["query"],
        "country": seed["country"],
        "status": "ok",
        "resultCount": data.get("resultCount", 0),
        "trackId": best.get("trackId", ""),
        "artistId": best.get("artistId", ""),
        "collectionId": best.get("collectionId", ""),
        "itunesArtistName": best.get("artistName", ""),
        "itunesTrackName": best.get("trackName", ""),
        "collectionName": best.get("collectionName", ""),
        "primaryGenreName": best.get("primaryGenreName", ""),
        "releaseDate": best.get("releaseDate", ""),
        "trackTimeMillis": best.get("trackTimeMillis", ""),
        "currency": best.get("currency", ""),
        "trackPrice": best.get("trackPrice", ""),
        "collectionPrice": best.get("collectionPrice", ""),
        "trackViewUrl": best.get("trackViewUrl", ""),
        "previewUrl": best.get("previewUrl", ""),
        "score": score_candidate(best, seed),
        "requestUrl": url,
        "memo": seed["memo"],
    }

    return row, results


def write_csv(rows, timestamp):
    timestamp_csv = Path(f"itunes_track_metadata_v1_{timestamp}.csv")

    fieldnames = [
        "artist",
        "trackTitle",
        "query",
        "country",
        "status",
        "resultCount",
        "trackId",
        "artistId",
        "collectionId",
        "itunesArtistName",
        "itunesTrackName",
        "collectionName",
        "primaryGenreName",
        "releaseDate",
        "trackTimeMillis",
        "currency",
        "trackPrice",
        "collectionPrice",
        "trackViewUrl",
        "previewUrl",
        "score",
        "requestUrl",
        "memo",
    ]

    for path in [timestamp_csv, LATEST_CSV]:
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    return timestamp_csv


def write_json(rows, raw_results_by_artist, timestamp):
    timestamp_json = Path(f"fandex_itunes_track_metadata_v1_{timestamp}.json")

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "source": "iTunes Search API",
        "note": "Store/catalog metadata layer. Not directly used as FANDEX score yet.",
        "trackCount": len(rows),
        "tracks": rows,
        "rawResultsByArtist": raw_results_by_artist,
    }

    for path in [timestamp_json, LATEST_JSON]:
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    return timestamp_json


def write_report(rows, timestamp):
    timestamp_report = Path(f"FANDEX_ITUNES_COLLECTOR_REPORT_{timestamp}.txt")

    lines = []

    lines.append("FANDEX iTunes Collector Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: Python-only / no website public-data export")
    lines.append("")
    lines.append("수집 결과")
    lines.append("-" * 70)

    for row in rows:
        lines.append(
            f"{row['artist']} | status={row['status']} | "
            f"iTunes={row['itunesArtistName']} - {row['itunesTrackName']} | "
            f"album={row['collectionName']} | genre={row['primaryGenreName']} | "
            f"release={row['releaseDate']} | score={row['score']}"
        )

    lines.append("")
    lines.append("활용 방향")
    lines.append("-" * 70)
    lines.append("- 곡/앨범 카탈로그 존재 여부 확인")
    lines.append("- 국가별 스토어 검색 가능 여부 확인")
    lines.append("- trackId / artistId / collectionId 확보")
    lines.append("- MusicBrainz, Spotify, Last.fm과 매칭할 보조 메타데이터로 활용")
    lines.append("")
    lines.append("주의")
    lines.append("- iTunes Search API 결과는 차트 순위가 아니다.")
    lines.append("- 점수화보다는 메타데이터/스토어 존재 확인에 적합하다.")
    lines.append("- 이 스크립트는 웹사이트 public/data를 건드리지 않는다.")

    text = "\n".join(lines)

    for path in [timestamp_report, LATEST_REPORT]:
        path.write_text(text, encoding="utf-8")

    return timestamp_report


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("iTunes track metadata collect v1 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("주의: 웹사이트 public/data는 건드리지 않습니다.")
    print()

    seeds = read_seed_rows()

    print(f"seed rows: {len(seeds)}")
    print(f"seed file: {SEED_FILE}")
    print()

    rows = []
    raw_results_by_artist = {}

    for index, seed in enumerate(seeds, start=1):
        print(f"[{index}/{len(seeds)}] {seed['artist']} / query={seed['query']} / country={seed['country']}")

        try:
            row, results = collect_one(seed)
            rows.append(row)
            raw_results_by_artist[seed["artist"]] = results[:10]

            print(
                f"  -> {row['status']} / {row['itunesArtistName']} - "
                f"{row['itunesTrackName']} / score={row['score']}"
            )

        except Exception as exc:
            print(f"  -> ERROR: {exc}")

            rows.append({
                "artist": seed["artist"],
                "trackTitle": seed["trackTitle"],
                "query": seed["query"],
                "country": seed["country"],
                "status": "error",
                "resultCount": "",
                "trackId": "",
                "artistId": "",
                "collectionId": "",
                "itunesArtistName": "",
                "itunesTrackName": "",
                "collectionName": "",
                "primaryGenreName": "",
                "releaseDate": "",
                "trackTimeMillis": "",
                "currency": "",
                "trackPrice": "",
                "collectionPrice": "",
                "trackViewUrl": "",
                "previewUrl": "",
                "score": "",
                "requestUrl": "",
                "memo": f"{seed['memo']} / error={exc}",
            })
            raw_results_by_artist[seed["artist"]] = []

        if index < len(seeds):
            time.sleep(REQUEST_SLEEP_SECONDS)

    timestamp_csv = write_csv(rows, timestamp)
    timestamp_json = write_json(rows, raw_results_by_artist, timestamp)
    timestamp_report = write_report(rows, timestamp)

    print()
    print("=" * 70)
    print("iTunes track metadata collect v1 완료")
    print("=" * 70)
    print(f"타임스탬프 CSV: {timestamp_csv}")
    print(f"최신 CSV: {LATEST_CSV}")
    print(f"타임스탬프 JSON: {timestamp_json}")
    print(f"최신 JSON: {LATEST_JSON}")
    print(f"타임스탬프 리포트: {timestamp_report}")
    print(f"최신 리포트: {LATEST_REPORT}")
    print()
    print("확인 명령:")
    print("notepad FANDEX_ITUNES_COLLECTOR_REPORT.txt")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_ITUNES_COLLECTOR_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()