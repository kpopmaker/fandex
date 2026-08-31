import csv
import shutil
from datetime import datetime
from pathlib import Path


VERSION = "youtube_apply_approved_seed_candidates_v1"

SEED_FILE = Path("youtube_seed_videos_v1.csv")
CANDIDATES_FILE = Path("youtube_seed_candidates_v1_latest.csv")
APPROVED_FILE = Path("youtube_seed_approved_candidates_v1.csv")


# discovery 결과에서 바로 넣어도 괜찮은 후보만 승인
APPROVED_VIDEO_IDS = {
    # aespa - LEMONADE
    "83C3TZ4Zm_o": {
        "videoType": "official_mv",
        "memo": "approved_discovery_v1; aespa LEMONADE official MV",
    },
    "eq7jZgVR6IM": {
        "videoType": "shorts",
        "memo": "approved_discovery_v1; aespa LEMONADE official shorts",
    },
    "3K15XOwICnc": {
        "videoType": "shorts",
        "memo": "approved_discovery_v1; aespa LEMONADE official shorts",
    },
    "r2eoeCk171I": {
        "videoType": "broadcast_clip",
        "memo": "approved_discovery_v1; aespa LEMONADE MusicCore broadcast clip",
    },
    "0aEgFTk7B9o": {
        "videoType": "broadcast_clip",
        "memo": "approved_discovery_v1; aespa LEMONADE MusicBank broadcast clip",
    },
    "XxvANTF-19g": {
        "videoType": "broadcast_clip",
        "memo": "approved_discovery_v1; aespa LEMONADE Inkigayo broadcast clip",
    },

    # IU - Love wins all
    "ax1csKKQnns": {
        "videoType": "live_clip",
        "memo": "approved_discovery_v1; IU Love wins all official live clip",
    },
    "IBWfp7odPmE": {
        "videoType": "shorts",
        "memo": "approved_discovery_v1; IU Love wins all official shorts",
    },

    # ATEEZ - BAD
    "ke0UrNoe7-k": {
        "videoType": "dance_practice",
        "memo": "approved_discovery_v1; ATEEZ BAD dance practice FIX ver",
    },
    "vcbIP2YvDOo": {
        "videoType": "dance_practice",
        "memo": "approved_discovery_v1; ATEEZ BAD choreography demo SAN ver",
    },
    "R9hv2cLYK-w": {
        "videoType": "broadcast_clip",
        "memo": "approved_discovery_v1; ATEEZ BAD Inkigayo broadcast clip",
    },

    # BOYNEXTDOOR - VIRAL
    "53KJej_aLuQ": {
        "videoType": "shorts",
        "memo": "approved_discovery_v1; BOYNEXTDOOR VIRAL challenge shorts",
    },
    "YAhZMuKJsIw": {
        "videoType": "shorts",
        "memo": "approved_discovery_v1; BOYNEXTDOOR VIRAL challenge shorts",
    },
}


def read_csv(path):
    if not path.exists():
        raise SystemExit(f"파일이 없습니다: {path}")

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def existing_seed_ids(seed_rows):
    ids = set()

    for row in seed_rows:
        video_id = (row.get("videoId") or "").strip()
        source_url = (row.get("sourceUrl") or "").strip()

        if video_id:
            ids.add(video_id)

        if "v=" in source_url:
            ids.add(source_url.split("v=")[-1].split("&")[0].strip())

    return ids


def build_approved_rows(candidate_rows, existing_ids):
    approved = []

    for row in candidate_rows:
        video_id = (row.get("videoId") or "").strip()

        if video_id not in APPROVED_VIDEO_IDS:
            continue

        if video_id in existing_ids:
            continue

        config = APPROVED_VIDEO_IDS[video_id]

        approved.append({
            "artist": row.get("artist", ""),
            "videoId": video_id,
            "sourceUrl": row.get("sourceUrl", f"https://www.youtube.com/watch?v={video_id}"),
            "videoType": config["videoType"],
            "memo": config["memo"],
            "title": row.get("title", ""),
            "channelTitle": row.get("channelTitle", ""),
            "viewCount": row.get("viewCount", ""),
            "candidateScore": row.get("candidateScore", ""),
        })

    approved.sort(key=lambda r: (r["artist"], r["videoType"], r["videoId"]))

    return approved


def main():
    apply_mode = "--apply" in __import__("sys").argv
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("YouTube approved seed candidates apply v1")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("mode:", "APPLY" if apply_mode else "DRY-RUN")
    print("주의: apply 전에는 youtube_seed_videos_v1.csv를 백업합니다.")
    print()

    seed_rows = read_csv(SEED_FILE)
    candidate_rows = read_csv(CANDIDATES_FILE)
    existing_ids = existing_seed_ids(seed_rows)

    approved_rows = build_approved_rows(candidate_rows, existing_ids)

    approved_fieldnames = [
        "artist",
        "videoId",
        "sourceUrl",
        "videoType",
        "memo",
        "title",
        "channelTitle",
        "viewCount",
        "candidateScore",
    ]

    write_csv(APPROVED_FILE, approved_rows, approved_fieldnames)

    print(f"기존 seed rows: {len(seed_rows)}")
    print(f"candidate rows: {len(candidate_rows)}")
    print(f"승인 후보 rows: {len(approved_rows)}")
    print(f"승인 후보 파일: {APPROVED_FILE}")
    print()

    print("승인 후보:")
    print("-" * 70)
    for row in approved_rows:
        print(
            f"- {row['artist']} | {row['videoType']} | "
            f"{row['videoId']} | {row['channelTitle']} | {row['title']}"
        )

    if not apply_mode:
        print()
        print("아직 seed 원본은 수정하지 않았습니다.")
        print("승인 후보 확인:")
        print("notepad youtube_seed_approved_candidates_v1.csv")
        print()
        print("실제 반영:")
        print("py youtube_apply_approved_seed_candidates_v1.py --apply")
        return

    if not approved_rows:
        print()
        print("반영할 신규 승인 후보가 없습니다.")
        return

    backup_file = Path(f"youtube_seed_videos_v1_backup_before_approved_apply_{timestamp}.csv")
    shutil.copy2(SEED_FILE, backup_file)

    output_fieldnames = ["artist", "videoId", "sourceUrl", "videoType", "memo"]

    normalized_seed_rows = []

    for row in seed_rows:
        normalized_seed_rows.append({
            "artist": row.get("artist", ""),
            "videoId": row.get("videoId", ""),
            "sourceUrl": row.get("sourceUrl", ""),
            "videoType": row.get("videoType", ""),
            "memo": row.get("memo", ""),
        })

    append_rows = []

    for row in approved_rows:
        append_rows.append({
            "artist": row["artist"],
            "videoId": row["videoId"],
            "sourceUrl": row["sourceUrl"],
            "videoType": row["videoType"],
            "memo": row["memo"],
        })

    final_rows = normalized_seed_rows + append_rows

    write_csv(SEED_FILE, final_rows, output_fieldnames)

    print()
    print("=" * 70)
    print("YouTube seed 승인 후보 반영 완료")
    print("=" * 70)
    print(f"백업 파일: {backup_file}")
    print(f"추가 rows: {len(append_rows)}")
    print(f"최종 seed rows: {len(final_rows)}")
    print()
    print("다음 실행:")
    print("set YOUTUBE_API_KEY=진짜_YouTube_API_KEY")
    print("py youtube_collect_video_metrics_v1.py")
    print("py youtube_publish_v2.py")
    print("py fandex_daily_python_only_v1.py --skip-bugs")


if __name__ == "__main__":
    main()