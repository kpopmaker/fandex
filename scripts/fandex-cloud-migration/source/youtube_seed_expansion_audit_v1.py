import csv
from collections import defaultdict
from datetime import datetime
from pathlib import Path


VERSION = "youtube_seed_expansion_audit_v1"

SEED_FILE = Path("youtube_seed_videos_v1.csv")
METRICS_FILE = Path("youtube_video_metrics_v1.csv")
REPORT_FILE = Path("FANDEX_YOUTUBE_SEED_EXPANSION_AUDIT.txt")


def read_csv(path):
    if not path.exists():
        raise SystemExit(f"파일이 없습니다: {path}")

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def to_int(value):
    try:
        return int(str(value).replace(",", "").strip())
    except Exception:
        return 0


def main():
    seed_rows = read_csv(SEED_FILE)
    metric_rows = read_csv(METRICS_FILE)

    seed_by_artist = defaultdict(list)
    seed_by_artist_type = defaultdict(lambda: defaultdict(list))

    for row in seed_rows:
        artist = row.get("artist", "").strip()
        video_type = row.get("videoType", "").strip()
        seed_by_artist[artist].append(row)
        seed_by_artist_type[artist][video_type].append(row)

    metric_by_artist = defaultdict(list)
    metric_by_artist_type = defaultdict(lambda: defaultdict(list))

    for row in metric_rows:
        artist = row.get("artist", "").strip()
        video_type = row.get("videoType", "").strip()
        metric_by_artist[artist].append(row)
        metric_by_artist_type[artist][video_type].append(row)

    lines = []

    lines.append("FANDEX YouTube Seed Expansion Audit")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("")
    lines.append("파일 확인")
    lines.append("-" * 70)
    lines.append(f"seed file: {SEED_FILE}")
    lines.append(f"seed rows: {len(seed_rows)}")
    lines.append(f"metrics file: {METRICS_FILE}")
    lines.append(f"metrics rows: {len(metric_rows)}")
    lines.append("")

    lines.append("아티스트별 seed 구성")
    lines.append("-" * 70)

    for artist in sorted(seed_by_artist.keys()):
        lines.append(f"{artist} | seed rows={len(seed_by_artist[artist])}")

        for video_type, rows in sorted(seed_by_artist_type[artist].items()):
            lines.append(f"  - {video_type}: {len(rows)}")

    lines.append("")
    lines.append("아티스트별 수집 metrics 구성")
    lines.append("-" * 70)

    for artist in sorted(metric_by_artist.keys()):
        rows = metric_by_artist[artist]

        total_views = sum(to_int(row.get("viewCount")) for row in rows)
        total_likes = sum(to_int(row.get("likeCount")) for row in rows)
        total_comments = sum(to_int(row.get("commentCount")) for row in rows)

        lines.append(
            f"{artist} | metrics rows={len(rows)} | "
            f"views={total_views} | likes={total_likes} | comments={total_comments}"
        )

        for video_type, type_rows in sorted(metric_by_artist_type[artist].items()):
            type_views = sum(to_int(row.get("viewCount")) for row in type_rows)
            lines.append(f"  - {video_type}: {len(type_rows)} videos / views={type_views}")

    lines.append("")
    lines.append("아티스트별 상위 영상")
    lines.append("-" * 70)

    for artist in sorted(metric_by_artist.keys()):
        rows = sorted(
            metric_by_artist[artist],
            key=lambda row: to_int(row.get("viewCount")),
            reverse=True,
        )

        lines.append("")
        lines.append(f"[{artist}]")

        for row in rows[:10]:
            title = row.get("title", "")
            video_type = row.get("videoType", "")
            video_id = row.get("videoId", "")
            views = to_int(row.get("viewCount"))
            likes = to_int(row.get("likeCount"))
            comments = to_int(row.get("commentCount"))

            lines.append(
                f"- {video_type} | views={views} | likes={likes} | "
                f"comments={comments} | {video_id} | {title}"
            )

    lines.append("")
    lines.append("판단 포인트")
    lines.append("-" * 70)
    lines.append("- 에스파는 LEMONADE MV/쇼츠/방송 클립 추가로 YouTube 점수가 상승한 것으로 보임.")
    lines.append("- 보이넥스트도어는 seed 확장 후 점수가 하락했으므로, VIRAL 관련성 낮은 영상이 섞였는지 확인 필요.")
    lines.append("- 다음 단계에서는 youtube_publish_v2.py의 점수 공식을 감사하고, 확장 seed에 맞게 v3로 고도화한다.")

    REPORT_FILE.write_text("\n".join(lines), encoding="utf-8")

    print("YouTube seed expansion audit 생성 완료")
    print(f"파일: {REPORT_FILE}")
    print()
    print("확인:")
    print("notepad FANDEX_YOUTUBE_SEED_EXPANSION_AUDIT.txt")


if __name__ == "__main__":
    main()