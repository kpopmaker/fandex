import csv
import json
from datetime import datetime
from pathlib import Path


VERSION = "fandex_artist_expansion_readiness_v1"

REPORT = Path("FANDEX_ARTIST_EXPANSION_READINESS_REPORT.txt")
JSON_OUT = Path("fandex_artist_expansion_readiness_latest.json")
CSV_OUT = Path("fandex_artist_expansion_readiness_latest.csv")


FILES = {
    "artist_list": Path("artist_list.txt"),
    "master_ranking": Path("fandex_master_ranking_latest.json"),
    "naver_ranking": Path("fandex_naver_ranking_v3_latest.json"),
    "youtube_seed": Path("youtube_seed_videos_v1.csv"),
    "youtube_ranking": Path("fandex_youtube_ranking_v3_latest.json"),
    "music_seed": Path("music_chart_seed_v1.csv"),
    "music_ranking": Path("fandex_music_chart_ranking_v1_latest.json"),
    "itunes_seed": Path("itunes_track_seed_v1.csv"),
    "lastfm_seed": Path("lastfm_artist_seed_v1.csv"),
    "musicbrainz_seed": Path("musicbrainz_artist_seed_v1.csv"),
}


def read_json(path):
    if not path.exists():
        return None

    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def read_csv(path):
    if not path.exists():
        return []

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def normalize_artist(value):
    return str(value or "").strip()


def add_artist(bucket, source, artist):
    artist = normalize_artist(artist)
    if not artist:
        return

    if artist not in bucket:
        bucket[artist] = {
            "artist": artist,
            "sources": set(),
            "sourceCount": 0,
        }

    bucket[artist]["sources"].add(source)


def extract_ranking_artists(payload):
    if not isinstance(payload, dict):
        return []

    ranking = payload.get("ranking", [])
    if not isinstance(ranking, list):
        return []

    result = []
    for row in ranking:
        if isinstance(row, dict) and row.get("artist"):
            result.append(row.get("artist"))

    return result


def main():
    now = datetime.now().isoformat(timespec="seconds")

    artists = {}
    file_status = []

    for name, path in FILES.items():
        file_status.append({
            "name": name,
            "path": str(path),
            "exists": path.exists(),
            "size": path.stat().st_size if path.exists() else 0,
        })

    # artist_list.txt
    if FILES["artist_list"].exists():
        for line in FILES["artist_list"].read_text(encoding="utf-8-sig").splitlines():
            add_artist(artists, "artist_list.txt", line)

    # ranking JSONs
    for key in ["master_ranking", "naver_ranking", "youtube_ranking", "music_ranking"]:
        payload = read_json(FILES[key])
        for artist in extract_ranking_artists(payload):
            add_artist(artists, str(FILES[key]), artist)

    # csv seeds
    csv_artist_columns = {
        "youtube_seed": "artist",
        "music_seed": "artist",
        "itunes_seed": "artist",
        "lastfm_seed": "artist",
        "musicbrainz_seed": "artist",
    }

    for key, col in csv_artist_columns.items():
        rows = read_csv(FILES[key])
        for row in rows:
            add_artist(artists, str(FILES[key]), row.get(col))

    rows = []

    for artist, info in artists.items():
        source_list = sorted(info["sources"])
        rows.append({
            "artist": artist,
            "sourceCount": len(source_list),
            "sources": " | ".join(source_list),
            "hasArtistList": "artist_list.txt" in source_list,
            "hasMaster": "fandex_master_ranking_latest.json" in source_list,
            "hasNaver": "fandex_naver_ranking_v3_latest.json" in source_list,
            "hasYoutubeSeed": "youtube_seed_videos_v1.csv" in source_list,
            "hasYoutubeRanking": "fandex_youtube_ranking_v3_latest.json" in source_list,
            "hasMusicSeed": "music_chart_seed_v1.csv" in source_list,
            "hasMusicRanking": "fandex_music_chart_ranking_v1_latest.json" in source_list,
            "hasItunesSeed": "itunes_track_seed_v1.csv" in source_list,
            "hasLastfmSeed": "lastfm_artist_seed_v1.csv" in source_list,
            "hasMusicbrainzSeed": "musicbrainz_artist_seed_v1.csv" in source_list,
        })

    rows.sort(key=lambda x: (-x["sourceCount"], x["artist"]))

    fieldnames = [
        "artist",
        "sourceCount",
        "sources",
        "hasArtistList",
        "hasMaster",
        "hasNaver",
        "hasYoutubeSeed",
        "hasYoutubeRanking",
        "hasMusicSeed",
        "hasMusicRanking",
        "hasItunesSeed",
        "hasLastfmSeed",
        "hasMusicbrainzSeed",
    ]

    with open(CSV_OUT, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)

    payload = {
        "version": VERSION,
        "createdAt": now,
        "scope": "artist expansion readiness audit only",
        "websitePublicDataTouched": False,
        "fileStatus": file_status,
        "artistCount": len(rows),
        "artists": rows,
        "nextStep": [
            "Choose target artists for 10-artist expansion.",
            "Update artist_list.txt first.",
            "Then expand Naver, YouTube seed, music seed, and metadata seeds in that order.",
        ],
    }

    JSON_OUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    lines = []
    lines.append("FANDEX Artist Expansion Readiness Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {now}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: audit only / no file mutation / no website public-data export")
    lines.append("")
    lines.append("파일 상태")
    lines.append("-" * 70)

    for item in file_status:
        status = "OK" if item["exists"] else "MISSING"
        lines.append(f"{status} {item['path']} / size={item['size']}")

    lines.append("")
    lines.append("현재 감지된 artist")
    lines.append("-" * 70)

    for row in rows:
        lines.append(
            f"{row['artist']} | sourceCount={row['sourceCount']} | {row['sources']}"
        )

    lines.append("")
    lines.append("확장 판단")
    lines.append("-" * 70)
    lines.append(f"현재 감지 artist 수: {len(rows)}")
    lines.append("목표: 10명")
    lines.append(f"추가 필요 수: {max(0, 10 - len(rows))}")
    lines.append("")
    lines.append("권장 확장 순서")
    lines.append("-" * 70)
    lines.append("1. artist_list.txt에 신규 아티스트 추가")
    lines.append("2. Naver v3 수집/점수화 대상 확장")
    lines.append("3. YouTube seed 후보 discovery")
    lines.append("4. music_chart_seed_v1.csv에 차트 seed 추가")
    lines.append("5. iTunes / Last.fm / MusicBrainz seed 확장")
    lines.append("6. daily v2 실행")
    lines.append("7. health check")
    lines.append("8. 백업")

    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("FANDEX artist expansion readiness audit 완료")
    print("=" * 70)
    print(f"감지 artist 수: {len(rows)}")
    print(f"추가 필요 수: {max(0, 10 - len(rows))}")
    print(f"report: {REPORT}")
    print(f"csv: {CSV_OUT}")
    print(f"json: {JSON_OUT}")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_ARTIST_EXPANSION_READINESS_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()