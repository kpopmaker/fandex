import csv
import json
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path


VERSION = "musicbrainz_collect_artist_metadata_v1"

SEED_FILE = Path("musicbrainz_artist_seed_v1.csv")

LATEST_CSV = Path("musicbrainz_artist_metadata_v1_latest.csv")
LATEST_JSON = Path("fandex_musicbrainz_artist_metadata_latest.json")
LATEST_REPORT = Path("FANDEX_MUSICBRAINZ_COLLECTOR_REPORT.txt")

BASE_URL = "https://musicbrainz.org/ws/2"

USER_AGENT = "FANDEXPythonCollector/1.0 (local prototype; music metadata research)"
REQUEST_SLEEP_SECONDS = 1.2


DEFAULT_SEED_ROWS = [
    {
        "artist": "아이유",
        "query": "IU",
        "expectedCountry": "KR",
        "expectedType": "Person",
        "memo": "Korean singer-songwriter IU",
    },
    {
        "artist": "에이티즈",
        "query": "ATEEZ",
        "expectedCountry": "KR",
        "expectedType": "Group",
        "memo": "K-pop boy group ATEEZ",
    },
    {
        "artist": "보이넥스트도어",
        "query": "BOYNEXTDOOR",
        "expectedCountry": "KR",
        "expectedType": "Group",
        "memo": "K-pop boy group BOYNEXTDOOR",
    },
    {
        "artist": "에스파",
        "query": "aespa",
        "expectedCountry": "KR",
        "expectedType": "Group",
        "memo": "K-pop girl group aespa",
    },
]


def ensure_seed_file():
    if SEED_FILE.exists():
        return

    with open(SEED_FILE, "w", encoding="utf-8-sig", newline="") as f:
        fieldnames = ["artist", "query", "expectedCountry", "expectedType", "memo"]
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
        query = (row.get("query") or "").strip()

        if not artist or not query:
            continue

        cleaned.append({
            "artist": artist,
            "query": query,
            "expectedCountry": (row.get("expectedCountry") or "").strip(),
            "expectedType": (row.get("expectedType") or "").strip(),
            "memo": (row.get("memo") or "").strip(),
        })

    return cleaned


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

    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read().decode("utf-8")

    return json.loads(body), url


def score_candidate(candidate, expected_country, expected_type, query):
    score = int(candidate.get("score") or 0)

    name = (candidate.get("name") or "").lower()
    sort_name = (candidate.get("sort-name") or "").lower()
    candidate_type = candidate.get("type") or ""
    country = candidate.get("country") or ""

    query_l = query.lower()

    bonus = 0

    if name == query_l or sort_name == query_l:
        bonus += 30

    if query_l in name or query_l in sort_name:
        bonus += 15

    if expected_country and country == expected_country:
        bonus += 15

    if expected_type and candidate_type == expected_type:
        bonus += 15

    return score + bonus


def pick_best_artist(artists, expected_country, expected_type, query):
    if not artists:
        return None

    ranked = sorted(
        artists,
        key=lambda item: score_candidate(item, expected_country, expected_type, query),
        reverse=True,
    )

    return ranked[0]


def compact_aliases(candidate):
    aliases = candidate.get("aliases") or []
    names = []

    for alias in aliases[:10]:
        name = alias.get("name")
        locale = alias.get("locale")
        primary = alias.get("primary")

        if not name:
            continue

        if locale:
            names.append(f"{name}({locale})")
        elif primary:
            names.append(f"{name}(primary)")
        else:
            names.append(name)

    return " | ".join(names)


def compact_tags(candidate):
    tags = candidate.get("tags") or []
    pairs = []

    for tag in tags[:10]:
        name = tag.get("name")
        count = tag.get("count")

        if not name:
            continue

        if count is not None:
            pairs.append(f"{name}:{count}")
        else:
            pairs.append(name)

    return " | ".join(pairs)


def collect_release_groups(mbid):
    params = {
        "artist": mbid,
        "fmt": "json",
        "limit": 10,
        "offset": 0,
    }

    data, url = fetch_json("/release-group", params)

    groups = data.get("release-groups") or []

    simplified = []

    for group in groups[:10]:
        simplified.append({
            "id": group.get("id"),
            "title": group.get("title"),
            "primaryType": group.get("primary-type"),
            "firstReleaseDate": group.get("first-release-date"),
        })

    return simplified, url


def collect_one(seed):
    artist = seed["artist"]
    query = seed["query"]
    expected_country = seed["expectedCountry"]
    expected_type = seed["expectedType"]

    search_params = {
        "query": query,
        "fmt": "json",
        "limit": 10,
        "offset": 0,
    }

    search_data, search_url = fetch_json("/artist", search_params)
    candidates = search_data.get("artists") or []

    best = pick_best_artist(candidates, expected_country, expected_type, query)

    if not best:
        return {
            "artist": artist,
            "query": query,
            "status": "not_found",
            "mbid": "",
            "musicbrainzName": "",
            "type": "",
            "country": "",
            "score": "",
            "disambiguation": "",
            "begin": "",
            "ended": "",
            "aliases": "",
            "tags": "",
            "releaseGroupCountFetched": 0,
            "releaseGroupsPreview": "",
            "searchUrl": search_url,
            "releaseGroupUrl": "",
            "memo": seed["memo"],
        }, []

    mbid = best.get("id") or ""

    time.sleep(REQUEST_SLEEP_SECONDS)

    release_groups = []
    release_group_url = ""

    if mbid:
        try:
            release_groups, release_group_url = collect_release_groups(mbid)
        except Exception as exc:
            release_groups = []
            release_group_url = f"ERROR: {exc}"

    release_preview = " | ".join(
        [
            f"{item.get('title')}({item.get('primaryType')},{item.get('firstReleaseDate')})"
            for item in release_groups[:5]
        ]
    )

    lifespan = best.get("life-span") or {}

    row = {
        "artist": artist,
        "query": query,
        "status": "ok",
        "mbid": mbid,
        "musicbrainzName": best.get("name") or "",
        "type": best.get("type") or "",
        "country": best.get("country") or "",
        "score": best.get("score") or "",
        "disambiguation": best.get("disambiguation") or "",
        "begin": lifespan.get("begin") or "",
        "ended": lifespan.get("ended") or "",
        "aliases": compact_aliases(best),
        "tags": compact_tags(best),
        "releaseGroupCountFetched": len(release_groups),
        "releaseGroupsPreview": release_preview,
        "searchUrl": search_url,
        "releaseGroupUrl": release_group_url,
        "memo": seed["memo"],
    }

    return row, release_groups


def write_csv(rows, timestamp):
    timestamp_csv = Path(f"musicbrainz_artist_metadata_v1_{timestamp}.csv")

    fieldnames = [
        "artist",
        "query",
        "status",
        "mbid",
        "musicbrainzName",
        "type",
        "country",
        "score",
        "disambiguation",
        "begin",
        "ended",
        "aliases",
        "tags",
        "releaseGroupCountFetched",
        "releaseGroupsPreview",
        "searchUrl",
        "releaseGroupUrl",
        "memo",
    ]

    for path in [timestamp_csv, LATEST_CSV]:
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    return timestamp_csv


def write_json(rows, release_group_map, timestamp):
    timestamp_json = Path(f"fandex_musicbrainz_artist_metadata_v1_{timestamp}.json")

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "source": "MusicBrainz API",
        "note": "Music metadata identity layer. Not directly used as FANDEX score yet.",
        "artistCount": len(rows),
        "artists": rows,
        "releaseGroupsByArtist": release_group_map,
    }

    for path in [timestamp_json, LATEST_JSON]:
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    return timestamp_json


def write_report(rows, timestamp):
    timestamp_report = Path(f"FANDEX_MUSICBRAINZ_COLLECTOR_REPORT_{timestamp}.txt")

    lines = []

    lines.append("FANDEX MusicBrainz Collector Report")
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
            f"MBID={row['mbid']} | name={row['musicbrainzName']} | "
            f"type={row['type']} | country={row['country']} | score={row['score']}"
        )

    lines.append("")
    lines.append("활용 방향")
    lines.append("-" * 70)
    lines.append("- 아티스트 고유 식별자 관리")
    lines.append("- 동명이인/동명 그룹 혼동 방지")
    lines.append("- release group 기반 앨범/싱글 메타데이터 확장")
    lines.append("- Spotify/Last.fm/iTunes 연결 시 artist identity 기준으로 활용")
    lines.append("")
    lines.append("주의")
    lines.append("- MusicBrainz는 점수 신호라기보다 메타데이터/식별자 계층이다.")
    lines.append("- 이 스크립트는 웹사이트 public/data를 건드리지 않는다.")
    lines.append("- API 요청은 초당 1회 이하 원칙으로 sleep을 둔다.")

    text = "\n".join(lines)

    for path in [timestamp_report, LATEST_REPORT]:
        path.write_text(text, encoding="utf-8")

    return timestamp_report


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("MusicBrainz artist metadata collect v1 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("주의: 웹사이트 public/data는 건드리지 않습니다.")
    print()

    seeds = read_seed_rows()

    print(f"seed rows: {len(seeds)}")
    print(f"seed file: {SEED_FILE}")
    print()

    rows = []
    release_group_map = {}

    for index, seed in enumerate(seeds, start=1):
        print(f"[{index}/{len(seeds)}] {seed['artist']} / query={seed['query']}")

        try:
            row, release_groups = collect_one(seed)
            rows.append(row)
            release_group_map[seed["artist"]] = release_groups

            print(
                f"  -> {row['status']} / {row['musicbrainzName']} / "
                f"{row['type']} / {row['country']} / MBID={row['mbid']}"
            )

        except Exception as exc:
            print(f"  -> ERROR: {exc}")

            rows.append({
                "artist": seed["artist"],
                "query": seed["query"],
                "status": "error",
                "mbid": "",
                "musicbrainzName": "",
                "type": "",
                "country": "",
                "score": "",
                "disambiguation": "",
                "begin": "",
                "ended": "",
                "aliases": "",
                "tags": "",
                "releaseGroupCountFetched": 0,
                "releaseGroupsPreview": "",
                "searchUrl": "",
                "releaseGroupUrl": "",
                "memo": f"{seed['memo']} / error={exc}",
            })
            release_group_map[seed["artist"]] = []

        if index < len(seeds):
            time.sleep(REQUEST_SLEEP_SECONDS)

    timestamp_csv = write_csv(rows, timestamp)
    timestamp_json = write_json(rows, release_group_map, timestamp)
    timestamp_report = write_report(rows, timestamp)

    print()
    print("=" * 70)
    print("MusicBrainz artist metadata collect v1 완료")
    print("=" * 70)
    print(f"타임스탬프 CSV: {timestamp_csv}")
    print(f"최신 CSV: {LATEST_CSV}")
    print(f"타임스탬프 JSON: {timestamp_json}")
    print(f"최신 JSON: {LATEST_JSON}")
    print(f"타임스탬프 리포트: {timestamp_report}")
    print(f"최신 리포트: {LATEST_REPORT}")
    print()
    print("확인 명령:")
    print("notepad FANDEX_MUSICBRAINZ_COLLECTOR_REPORT.txt")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_MUSICBRAINZ_COLLECTOR_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()