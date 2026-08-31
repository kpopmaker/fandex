import csv
import shutil
import sys
from datetime import datetime
from pathlib import Path


VERSION = "youtube_apply_approved_seed_candidates_artist_list_v2"

CANDIDATES_CSV = Path("youtube_seed_candidates_v1_latest.csv")
SEED_CSV = Path("youtube_seed_videos_v1.csv")
REPORT = Path("FANDEX_YOUTUBE_APPROVED_SEED_APPLY_ARTIST_LIST_V2_REPORT.txt")
APPROVED_CSV = Path("youtube_seed_approved_candidates_artist_list_v2.csv")


APPROVED_VIDEO_IDS = {
    # 아이브
    "TNDF5Qr6ayo",  # IVE BLACKHOLE DANCE PRACTICE
    "mx8VPWBWKmY",  # Golden Disc dance practice
    "uVpGElT--E8",  # BANG BANG performance video
    "9qkpcLK422o",  # BANG BANG MV
    "1Lmy7qwmSMc",  # BLACKHOLE MV

    # 르세라핌
    "V1Lr-_AxeR8",  # BOOMPALA official MV
    "a2grcJdfXmY",  # CELEBRATION official MV
    "1v2KMsfBDjc",  # CELEBRATION dance practice
    "Gnn4GRSzRXI",  # BOOMPALA performance film
    "3YC4-RYEhBs",  # CELEBRATION performance film
    "ox9Bw-lmn6s",  # BOOMPALA stage cam

    # 뉴진스
    "NNbaTJX_9go",  # 2026 Summer of NewJeans
    "Fq-A3aLqmms",  # HANNI
    "9MaO43ekbHs",  # MINJI
    "Jx_58YiWxP0",  # HYEIN

    # 세븐틴
    "N9X1o0q4aIc",  # DK x Seungkwan Blue cinema ver.
    "dZNPbNkKAss",  # DK x Seungkwan Blue epilogue ver.
    "5A7qyhj-HjE",  # SEVENTEEN Tiny Light official MV
    "zsdueA_zcl8",  # V8 singasong choreography
    "b7gHOIJiGgI",  # HOSHI SNAPBACK choreography
    "G0G3pLRyraY",  # Back it up live

    # 스트레이키즈
    "Q7IFjVUUb_E",  # RUN IT M/V
    "l8sSQAa1kNM",  # Hyunjin LOVER Video
    "F0UIsSnotlA",  # HAN back to life
    "kQjidaLtpvk",  # official shorts
    "hQUVIT8m-c0",  # THIS & THAT trailer
    "jDREKfYqgkw",  # FARMING unveil track

    # 투모로우바이투게더
    "jOnLqqDRfY4",  # Stick With You official MV
    "vlmXpQOE75c",  # SSS official MV
    "mNLiZ25srkI",  # Stick With You dance practice fix ver.
    "uKFlZmn4eQk",  # I'll See You There Tomorrow part switch
    "b5j01yC0LeY",  # Stick With You moving ver.
    "TBS3VbzEQis",  # comeback showcase stage
    "EUERJYKCzWU",  # Dream Week medley live
}


def read_csv(path):
    if not path.exists():
        return []

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def extract_video_id(row):
    for key in ["videoId", "video_id", "id"]:
        value = str(row.get(key, "")).strip()
        if value:
            return value

    url = str(row.get("url") or row.get("videoUrl") or "").strip()

    if "v=" in url:
        return url.split("v=", 1)[1].split("&", 1)[0]

    if "/" in url:
        return url.rstrip("/").split("/")[-1]

    return ""


def infer_channel_type(channel):
    channel_lower = channel.lower()

    official_hints = [
        "hybe labels",
        "jyp entertainment",
        "starship",
        "ive",
        "le sserafim",
        "newjeans",
        "seventeen",
        "stray kids",
        "tomorrow x together",
        "txt",
    ]

    broadcast_hints = [
        "kbs",
        "mbc",
        "sbs",
        "mnet",
        "music bank",
        "musiccore",
        "inkigayo",
    ]

    if any(hint in channel_lower for hint in official_hints):
        return "official"

    if any(hint in channel_lower for hint in broadcast_hints):
        return "broadcast"

    return "external"


def build_seed_row(candidate, seed_fieldnames):
    video_id = extract_video_id(candidate)
    channel = candidate.get("channelTitle", "")
    video_type = candidate.get("videoType") or candidate.get("type") or "external_content"

    standard = {
        "artist": candidate.get("artist", ""),
        "videoId": video_id,
        "video_id": video_id,
        "id": video_id,
        "url": candidate.get("url") or candidate.get("videoUrl") or f"https://www.youtube.com/watch?v={video_id}",
        "videoUrl": candidate.get("videoUrl") or candidate.get("url") or f"https://www.youtube.com/watch?v={video_id}",
        "title": candidate.get("title", ""),
        "channelTitle": channel,
        "channel": channel,
        "channelName": channel,
        "publishedAt": candidate.get("publishedAt", ""),
        "videoType": video_type,
        "type": video_type,
        "sourceType": infer_channel_type(channel),
        "channelType": infer_channel_type(channel),
        "viewCount": candidate.get("viewCount") or candidate.get("views") or "",
        "views": candidate.get("views") or candidate.get("viewCount") or "",
        "likeCount": candidate.get("likeCount") or candidate.get("likes") or "",
        "likes": candidate.get("likes") or candidate.get("likeCount") or "",
        "commentCount": candidate.get("commentCount") or candidate.get("comments") or "",
        "comments": candidate.get("comments") or candidate.get("commentCount") or "",
        "memo": f"approved_from_artist_list_v2; score={candidate.get('score')}; views={candidate.get('views') or candidate.get('viewCount')}",
        "approvedAt": datetime.now().isoformat(timespec="seconds"),
        "approvedVersion": VERSION,
    }

    row = {}

    for field in seed_fieldnames:
        row[field] = standard.get(field, candidate.get(field, ""))

    return row


def main():
    apply_mode = "--apply" in sys.argv
    mode_label = "APPLY" if apply_mode else "DRY-RUN"

    print()
    print("YouTube approved seed candidates artist-list v2")
    print("=" * 70)
    print(f"version: {VERSION}")
    print(f"mode: {mode_label}")
    print()

    if not CANDIDATES_CSV.exists():
        raise SystemExit(f"후보 파일 없음: {CANDIDATES_CSV}")

    if not SEED_CSV.exists():
        raise SystemExit(f"seed 파일 없음: {SEED_CSV}")

    candidates = read_csv(CANDIDATES_CSV)
    seed_rows = read_csv(SEED_CSV)

    with open(SEED_CSV, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        seed_fieldnames = reader.fieldnames or []

    if not seed_fieldnames:
        seed_fieldnames = [
            "artist",
            "videoId",
            "url",
            "title",
            "channelTitle",
            "videoType",
            "sourceType",
            "memo",
        ]

    existing_video_ids = {extract_video_id(row) for row in seed_rows if extract_video_id(row)}

    candidate_by_id = {}

    for row in candidates:
        video_id = extract_video_id(row)
        if video_id:
            candidate_by_id[video_id] = row

    approved_rows = []
    missing_ids = []
    duplicate_ids = []

    for video_id in sorted(APPROVED_VIDEO_IDS):
        candidate = candidate_by_id.get(video_id)

        if not candidate:
            missing_ids.append(video_id)
            continue

        if video_id in existing_video_ids:
            duplicate_ids.append(video_id)
            continue

        approved_rows.append(candidate)

    approved_seed_rows = [
        build_seed_row(candidate, seed_fieldnames)
        for candidate in approved_rows
    ]

    preview_fieldnames = [
        "artist",
        "videoId",
        "title",
        "channelTitle",
        "type",
        "score",
        "views",
        "url",
    ]

    preview_rows = []

    for row in approved_rows:
        preview_rows.append({
            "artist": row.get("artist", ""),
            "videoId": extract_video_id(row),
            "title": row.get("title", ""),
            "channelTitle": row.get("channelTitle", ""),
            "type": row.get("type") or row.get("videoType") or "",
            "score": row.get("score") or row.get("candidateScore") or "",
            "views": row.get("views") or row.get("viewCount") or "",
            "url": row.get("url") or row.get("videoUrl") or "",
        })

    write_csv(APPROVED_CSV, preview_rows, preview_fieldnames)

    if apply_mode:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup = Path(f"youtube_seed_videos_v1_backup_before_artist_list_v2_apply_{timestamp}.csv")
        shutil.copy2(SEED_CSV, backup)

        new_seed_rows = seed_rows + approved_seed_rows
        write_csv(SEED_CSV, new_seed_rows, seed_fieldnames)
    else:
        backup = ""

    lines = []
    lines.append("FANDEX YouTube Approved Seed Apply Artist List v2 Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append(f"mode: {mode_label}")
    lines.append("")
    lines.append("요약")
    lines.append("-" * 70)
    lines.append(f"approved id count: {len(APPROVED_VIDEO_IDS)}")
    lines.append(f"candidate matched count: {len(approved_rows)}")
    lines.append(f"duplicate skip count: {len(duplicate_ids)}")
    lines.append(f"missing id count: {len(missing_ids)}")
    lines.append(f"seed rows before: {len(seed_rows)}")
    lines.append(f"seed rows to add: {len(approved_seed_rows)}")
    lines.append(f"seed rows after preview: {len(seed_rows) + len(approved_seed_rows)}")
    lines.append(f"approved preview csv: {APPROVED_CSV}")
    if backup:
        lines.append(f"backup: {backup}")
    lines.append("")
    lines.append("추가 예정/완료 목록")
    lines.append("-" * 70)

    for row in preview_rows:
        lines.append(
            f"{row['artist']} | {row['videoId']} | {row['type']} | "
            f"score={row['score']} | views={row['views']} | {row['channelTitle']} | {row['title']}"
        )

    lines.append("")
    lines.append("missing ids")
    lines.append("-" * 70)

    if missing_ids:
        for video_id in missing_ids:
            lines.append(f"- {video_id}")
    else:
        lines.append("없음")

    lines.append("")
    lines.append("duplicate skipped ids")
    lines.append("-" * 70)

    if duplicate_ids:
        for video_id in duplicate_ids:
            lines.append(f"- {video_id}")
    else:
        lines.append("없음")

    lines.append("")
    lines.append("다음 단계")
    lines.append("-" * 70)

    if apply_mode:
        lines.append("1. py youtube_collect_video_metrics_v1.py")
        lines.append("2. py youtube_publish_v3.py")
        lines.append("3. readiness audit 확인")
    else:
        lines.append("dry-run 결과 확인 후 문제 없으면:")
        lines.append("py youtube_apply_approved_seed_candidates_artist_list_v2.py --apply")

    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("=" * 70)
    print("YouTube approved seed candidates 처리 완료")
    print("=" * 70)
    print(f"mode: {mode_label}")
    print(f"candidate matched count: {len(approved_rows)}")
    print(f"seed rows to add: {len(approved_seed_rows)}")
    print(f"missing id count: {len(missing_ids)}")
    print(f"duplicate skip count: {len(duplicate_ids)}")
    print(f"report: {REPORT}")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_YOUTUBE_APPROVED_SEED_APPLY_ARTIST_LIST_V2_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()