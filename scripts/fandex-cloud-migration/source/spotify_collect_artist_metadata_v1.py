import base64
import csv
import json
import os
import time
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path


VERSION = "spotify_collect_artist_metadata_v1"

SEED_FILE = Path("spotify_artist_seed_v1.csv")

LATEST_CSV = Path("spotify_artist_metadata_v1_latest.csv")
LATEST_JSON = Path("fandex_spotify_artist_metadata_latest.json")
LATEST_REPORT = Path("FANDEX_SPOTIFY_COLLECTOR_REPORT.txt")

TOKEN_URL = "https://accounts.spotify.com/api/token"
API_BASE_URL = "https://api.spotify.com/v1"
REQUEST_SLEEP_SECONDS = 0.5


DEFAULT_SEED_ROWS = [
    {
        "artist": "아이유",
        "query": "IU",
        "market": "KR",
        "memo": "Korean singer-songwriter IU",
    },
    {
        "artist": "에이티즈",
        "query": "ATEEZ",
        "market": "KR",
        "memo": "K-pop boy group ATEEZ",
    },
    {
        "artist": "보이넥스트도어",
        "query": "BOYNEXTDOOR",
        "market": "KR",
        "memo": "K-pop boy group BOYNEXTDOOR",
    },
    {
        "artist": "에스파",
        "query": "aespa",
        "market": "KR",
        "memo": "K-pop girl group aespa",
    },
]


def get_env_credentials():
    client_id = (os.environ.get("SPOTIFY_CLIENT_ID") or "").strip()
    client_secret = (os.environ.get("SPOTIFY_CLIENT_SECRET") or "").strip()

    bad_values = {
        "",
        "발급받은_CLIENT_ID",
        "발급받은_CLIENT_SECRET",
        "발급받은_진짜_CLIENT_ID",
        "발급받은_진짜_CLIENT_SECRET",
        "진짜_키",
        "YOUR_CLIENT_ID",
        "YOUR_CLIENT_SECRET",
        "SPOTIFY_CLIENT_ID",
        "SPOTIFY_CLIENT_SECRET",
    }

    if client_id in bad_values or client_secret in bad_values:
        raise SystemExit(
            "Spotify Client ID / Client Secret이 설정되지 않았습니다.\n\n"
            "먼저 CMD에서 아래처럼 설정하세요.\n"
            "set SPOTIFY_CLIENT_ID=발급받은_진짜_CLIENT_ID\n"
            "set SPOTIFY_CLIENT_SECRET=발급받은_진짜_CLIENT_SECRET\n\n"
            "주의: 키를 채팅에 붙여넣지 마세요."
        )

    return client_id, client_secret


def get_access_token(client_id, client_secret):
    raw = f"{client_id}:{client_secret}".encode("utf-8")
    basic = base64.b64encode(raw).decode("ascii")

    data = urllib.parse.urlencode({
        "grant_type": "client_credentials",
    }).encode("utf-8")

    request = urllib.request.Request(
        TOKEN_URL,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Basic {basic}",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": "FANDEXPythonCollector/1.0",
        },
    )

    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read().decode("utf-8")

    payload = json.loads(body)
    token = payload.get("access_token")

    if not token:
        raise RuntimeError(f"Spotify access token 발급 실패: {payload}")

    return token, payload


def ensure_seed_file():
    if SEED_FILE.exists():
        return

    fieldnames = ["artist", "query", "market", "memo"]

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
        query = (row.get("query") or "").strip()
        market = (row.get("market") or "KR").strip().upper()

        if not artist or not query:
            continue

        cleaned.append({
            "artist": artist,
            "query": query,
            "market": market,
            "memo": (row.get("memo") or "").strip(),
        })

    return cleaned


def spotify_get(path, token, params=None):
    params = params or {}
    query = urllib.parse.urlencode(params)

    if query:
        url = f"{API_BASE_URL}{path}?{query}"
    else:
        url = f"{API_BASE_URL}{path}"

    request = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
            "User-Agent": "FANDEXPythonCollector/1.0",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
        return json.loads(body), url

    except urllib.error.HTTPError as exc:
        if exc.code == 429:
            retry_after = exc.headers.get("Retry-After")
            sleep_seconds = int(retry_after or "3")
            print(f"  Spotify rate limit 감지. {sleep_seconds}초 대기 후 재시도.")
            time.sleep(sleep_seconds)

            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read().decode("utf-8")
            return json.loads(body), url

        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Spotify HTTP {exc.code}: {body}")


def normalize_text(value):
    return (value or "").strip().lower()


def compact_genres(genres):
    return " | ".join((genres or [])[:10])


def compact_images(images):
    images = images or []
    if not images:
        return ""

    first = images[0]
    return first.get("url", "")


def score_artist_candidate(candidate, seed):
    query = normalize_text(seed["query"])
    name = normalize_text(candidate.get("name"))

    score = 0

    if name == query:
        score += 100
    elif query in name or name in query:
        score += 60

    popularity = candidate.get("popularity") or 0
    score += int(popularity)

    followers = ((candidate.get("followers") or {}).get("total")) or 0

    if followers >= 1_000_000:
        score += 30
    elif followers >= 100_000:
        score += 15
    elif followers >= 10_000:
        score += 5

    return score


def pick_best_artist(items, seed):
    if not items:
        return None

    ranked = sorted(
        items,
        key=lambda item: score_artist_candidate(item, seed),
        reverse=True,
    )

    return ranked[0]


def compact_top_tracks(tracks):
    compact = []

    for item in (tracks or [])[:10]:
        artists = item.get("artists") or []
        artist_names = ", ".join([artist.get("name", "") for artist in artists[:5]])

        compact.append({
            "id": item.get("id", ""),
            "name": item.get("name", ""),
            "artists": artist_names,
            "popularity": item.get("popularity", ""),
            "durationMs": item.get("duration_ms", ""),
            "albumName": ((item.get("album") or {}).get("name")) or "",
            "albumReleaseDate": ((item.get("album") or {}).get("release_date")) or "",
            "spotifyUrl": (((item.get("external_urls") or {}).get("spotify")) or ""),
            "previewUrl": item.get("preview_url", ""),
        })

    return compact


def compact_albums(items):
    compact = []

    for item in (items or [])[:10]:
        compact.append({
            "id": item.get("id", ""),
            "name": item.get("name", ""),
            "albumType": item.get("album_type", ""),
            "releaseDate": item.get("release_date", ""),
            "totalTracks": item.get("total_tracks", ""),
            "spotifyUrl": (((item.get("external_urls") or {}).get("spotify")) or ""),
        })

    return compact


def make_tracks_preview(tracks):
    return " | ".join(
        [
            f"{item.get('name')}({item.get('popularity')})"
            for item in tracks[:5]
            if item.get("name")
        ]
    )


def make_albums_preview(albums):
    return " | ".join(
        [
            f"{item.get('name')}({item.get('albumType')},{item.get('releaseDate')})"
            for item in albums[:5]
            if item.get("name")
        ]
    )


def collect_one(seed, token):
    search_data, search_url = spotify_get(
        "/search",
        token,
        {
            "q": seed["query"],
            "type": "artist",
            "market": seed["market"],
            "limit": 10,
        },
    )

    items = (((search_data or {}).get("artists") or {}).get("items")) or []
    best = pick_best_artist(items, seed)

    if not best:
        return {
            "artist": seed["artist"],
            "query": seed["query"],
            "market": seed["market"],
            "status": "not_found",
            "spotifyArtistId": "",
            "spotifyName": "",
            "spotifyUrl": "",
            "followers": 0,
            "popularity": 0,
            "genres": "",
            "imageUrl": "",
            "topTracksPreview": "",
            "albumsPreview": "",
            "searchUrl": search_url,
            "artistUrl": "",
            "topTracksUrl": "",
            "albumsUrl": "",
            "memo": seed["memo"],
        }, {
            "searchResults": items,
            "artist": {},
            "topTracks": [],
            "albums": [],
        }

    artist_id = best.get("id") or ""

    time.sleep(REQUEST_SLEEP_SECONDS)

    artist_data, artist_url = spotify_get(
        f"/artists/{artist_id}",
        token,
        {},
    )

    time.sleep(REQUEST_SLEEP_SECONDS)

    top_tracks_data = {}
    top_tracks_url = ""

    try:
        top_tracks_data, top_tracks_url = spotify_get(
            f"/artists/{artist_id}/top-tracks",
            token,
            {"market": seed["market"]},
        )
    except Exception as exc:
        top_tracks_data = {"tracks": [], "error": str(exc)}
        top_tracks_url = f"ERROR: {exc}"

    time.sleep(REQUEST_SLEEP_SECONDS)

    albums_data, albums_url = spotify_get(
        f"/artists/{artist_id}/albums",
        token,
        {
            "include_groups": "album,single",
            "market": seed["market"],
            "limit": 10,
        },
    )

    tracks = compact_top_tracks(top_tracks_data.get("tracks") or [])
    albums = compact_albums(albums_data.get("items") or [])

    artist_obj = artist_data or best
    followers = ((artist_obj.get("followers") or {}).get("total")) or 0
    popularity = artist_obj.get("popularity") or 0

    row = {
        "artist": seed["artist"],
        "query": seed["query"],
        "market": seed["market"],
        "status": "ok",
        "spotifyArtistId": artist_id,
        "spotifyName": artist_obj.get("name", ""),
        "spotifyUrl": ((artist_obj.get("external_urls") or {}).get("spotify")) or "",
        "followers": followers,
        "popularity": popularity,
        "genres": compact_genres(artist_obj.get("genres") or []),
        "imageUrl": compact_images(artist_obj.get("images") or []),
        "topTracksPreview": make_tracks_preview(tracks),
        "albumsPreview": make_albums_preview(albums),
        "searchUrl": search_url,
        "artistUrl": artist_url,
        "topTracksUrl": top_tracks_url,
        "albumsUrl": albums_url,
        "memo": seed["memo"],
    }

    raw = {
        "searchResults": items,
        "artist": artist_obj,
        "topTracks": tracks,
        "albums": albums,
    }

    return row, raw


def write_csv(rows, timestamp):
    timestamp_csv = Path(f"spotify_artist_metadata_v1_{timestamp}.csv")

    fieldnames = [
        "artist",
        "query",
        "market",
        "status",
        "spotifyArtistId",
        "spotifyName",
        "spotifyUrl",
        "followers",
        "popularity",
        "genres",
        "imageUrl",
        "topTracksPreview",
        "albumsPreview",
        "searchUrl",
        "artistUrl",
        "topTracksUrl",
        "albumsUrl",
        "memo",
    ]

    for path in [timestamp_csv, LATEST_CSV]:
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)

    return timestamp_csv


def write_json(rows, raw_by_artist, token_payload, timestamp):
    timestamp_json = Path(f"fandex_spotify_artist_metadata_v1_{timestamp}.json")

    safe_token_info = {
        "token_type": token_payload.get("token_type"),
        "expires_in": token_payload.get("expires_in"),
    }

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "pythonOnly": True,
        "touchesWebsitePublicData": False,
        "source": "Spotify Web API",
        "note": "Global catalog and artist metadata layer. Not merged into FANDEX master score yet.",
        "tokenInfo": safe_token_info,
        "artistCount": len(rows),
        "artists": rows,
        "rawByArtist": raw_by_artist,
    }

    for path in [timestamp_json, LATEST_JSON]:
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    return timestamp_json


def write_report(rows, timestamp):
    timestamp_report = Path(f"FANDEX_SPOTIFY_COLLECTOR_REPORT_{timestamp}.txt")

    lines = []

    lines.append("FANDEX Spotify Collector Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: Python-only / no website public-data export")
    lines.append("")
    lines.append("수집 결과")
    lines.append("-" * 70)

    sorted_rows = sorted(rows, key=lambda row: int(row.get("popularity") or 0), reverse=True)

    for row in sorted_rows:
        lines.append(
            f"{row['artist']} | status={row['status']} | "
            f"Spotify={row['spotifyName']} | popularity={row['popularity']} | "
            f"followers={row['followers']} | genres={row['genres']} | "
            f"topTracks={row['topTracksPreview']}"
        )

    lines.append("")
    lines.append("활용 방향")
    lines.append("-" * 70)
    lines.append("- 글로벌 음원 플랫폼 메타데이터")
    lines.append("- artist popularity / followers 기반 글로벌 신호 후보")
    lines.append("- top tracks 기반 대표곡/최근 소비 신호 확인")
    lines.append("- albums 기반 발매 메타데이터 확인")
    lines.append("- 이후 점수 공식 고도화 단계에서 별도 source point로 반영 가능")
    lines.append("")
    lines.append("주의")
    lines.append("- Spotify 수치는 FANDEX master v6에 아직 합산하지 않는다.")
    lines.append("- 이 스크립트는 웹사이트 public/data를 건드리지 않는다.")
    lines.append("- Client ID / Secret은 환경변수로만 사용하고 파일에 저장하지 않는다.")
    lines.append("- Spotify 콘텐츠/이미지 사용 시 Spotify attribution 정책을 확인해야 한다.")

    text = "\n".join(lines)

    for path in [timestamp_report, LATEST_REPORT]:
        path.write_text(text, encoding="utf-8")

    return timestamp_report


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("Spotify artist metadata collect v1 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("주의: 웹사이트 public/data는 건드리지 않습니다.")
    print()

    client_id, client_secret = get_env_credentials()
    token, token_payload = get_access_token(client_id, client_secret)

    print("Spotify access token 발급 성공")
    print(f"token type: {token_payload.get('token_type')}")
    print(f"expires in: {token_payload.get('expires_in')}")
    print()

    seeds = read_seed_rows()

    print(f"seed rows: {len(seeds)}")
    print(f"seed file: {SEED_FILE}")
    print()

    rows = []
    raw_by_artist = {}

    for index, seed in enumerate(seeds, start=1):
        print(f"[{index}/{len(seeds)}] {seed['artist']} / query={seed['query']} / market={seed['market']}")

        try:
            row, raw = collect_one(seed, token)
            rows.append(row)
            raw_by_artist[seed["artist"]] = raw

            print(
                f"  -> {row['status']} / {row['spotifyName']} / "
                f"popularity={row['popularity']} / followers={row['followers']}"
            )

        except Exception as exc:
            print(f"  -> ERROR: {exc}")

            rows.append({
                "artist": seed["artist"],
                "query": seed["query"],
                "market": seed["market"],
                "status": "error",
                "spotifyArtistId": "",
                "spotifyName": "",
                "spotifyUrl": "",
                "followers": 0,
                "popularity": 0,
                "genres": "",
                "imageUrl": "",
                "topTracksPreview": "",
                "albumsPreview": "",
                "searchUrl": "",
                "artistUrl": "",
                "topTracksUrl": "",
                "albumsUrl": "",
                "memo": f"{seed['memo']} / error={exc}",
            })
            raw_by_artist[seed["artist"]] = {}

        if index < len(seeds):
            time.sleep(REQUEST_SLEEP_SECONDS)

    timestamp_csv = write_csv(rows, timestamp)
    timestamp_json = write_json(rows, raw_by_artist, token_payload, timestamp)
    timestamp_report = write_report(rows, timestamp)

    print()
    print("=" * 70)
    print("Spotify artist metadata collect v1 완료")
    print("=" * 70)
    print(f"타임스탬프 CSV: {timestamp_csv}")
    print(f"최신 CSV: {LATEST_CSV}")
    print(f"타임스탬프 JSON: {timestamp_json}")
    print(f"최신 JSON: {LATEST_JSON}")
    print(f"타임스탬프 리포트: {timestamp_report}")
    print(f"최신 리포트: {LATEST_REPORT}")
    print()
    print("확인 명령:")
    print("notepad FANDEX_SPOTIFY_COLLECTOR_REPORT.txt")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_SPOTIFY_COLLECTOR_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()