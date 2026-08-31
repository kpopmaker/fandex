import csv
import json
import re
from datetime import datetime
from pathlib import Path


VERSION = "naver_fandex_ranking_v3_robust_from_final_files_v1"

ARTIST_LIST = Path("artist_list.txt")
REPORT = Path("FANDEX_NAVER_RANKING_V3_ROBUST_REPORT.txt")

LATEST_CSV = Path("naver_fandex_ranking_v3_latest.csv")
LATEST_JSON = Path("fandex_naver_ranking_v3_latest.json")


def read_artist_list():
    return [
        line.strip()
        for line in ARTIST_LIST.read_text(encoding="utf-8-sig").splitlines()
        if line.strip()
    ]


def read_csv(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def safe_float(value):
    try:
        if value is None or str(value).strip() == "":
            return None
        return float(str(value).replace(",", "").strip())
    except Exception:
        return None


def find_artist_from_file(path, artists):
    name = path.name
    for artist in artists:
        if artist in name:
            return artist
    return None


def normalize_row(row, artist, source_file):
    point_keys = [
        "fandexNaverFinalPoint",
        "naverFinalPoint",
        "finalPoint",
        "finalScore",
        "totalPoint",
        "totalScore",
    ]

    news_keys = ["newsIssueClusterPoint", "newsPoint", "newsClusterPoint"]
    blog_keys = ["blogTopicClusterPoint", "blogPoint", "blogClusterPoint"]
    search_keys = ["searchDemandComparePoint", "searchPoint", "searchTrendPoint"]

    def pick(keys):
        for key in keys:
            if key in row and safe_float(row.get(key)) is not None:
                return safe_float(row.get(key))
        return None

    final_point = pick(point_keys)
    news_point = pick(news_keys)
    blog_point = pick(blog_keys)
    search_point = pick(search_keys)

    if final_point is None:
        parts = [v for v in [news_point, blog_point, search_point] if v is not None]
        if parts:
            final_point = sum(parts)

    if final_point is None:
        numeric_candidates = []
        for key, value in row.items():
            lower = key.lower()
            if "rank" in lower:
                continue
            if "share" in lower or "percent" in lower:
                continue
            number = safe_float(value)
            if number is not None:
                numeric_candidates.append((key, number))
        if numeric_candidates:
            # final/point/score 느낌이 있는 컬럼 우선
            preferred = [
                item for item in numeric_candidates
                if "final" in item[0].lower() or "point" in item[0].lower() or "score" in item[0].lower()
            ]
            final_point = preferred[0][1] if preferred else numeric_candidates[0][1]

    return {
        "artist": artist or row.get("artist") or row.get("아티스트") or "",
        "fandexNaverFinalPoint": round(final_point or 0.0, 2),
        "newsIssueClusterPoint": round(news_point or 0.0, 2),
        "blogTopicClusterPoint": round(blog_point or 0.0, 2),
        "searchDemandComparePoint": round(search_point or 0.0, 2),
        "sourceFile": source_file.name,
        "generatedAt": row.get("generatedAt") or row.get("createdAt") or "",
        "_raw": row,
    }


def main():
    artists = read_artist_list()
    artist_set = set(artists)

    candidates = []
    for path in Path(".").glob("*final*v3*.csv"):
        name = path.name

        if "ranking" in name.lower():
            continue
        if "audit" in name.lower():
            continue
        if "summary" in name.lower():
            continue

        artist = find_artist_from_file(path, artists)

        try:
            rows = read_csv(path)
        except Exception:
            continue

        if not rows:
            continue

        for row in rows:
            row_artist = str(row.get("artist") or row.get("아티스트") or artist or "").strip()
            if not row_artist:
                row_artist = artist or ""

            if row_artist not in artist_set:
                continue

            normalized = normalize_row(row, row_artist, path)

            if normalized["fandexNaverFinalPoint"] <= 0:
                continue

            candidates.append({
                "artist": row_artist,
                "path": path,
                "mtime": path.stat().st_mtime,
                "row": normalized,
            })

    latest_by_artist = {}

    for item in candidates:
        artist = item["artist"]
        prev = latest_by_artist.get(artist)

        if prev is None or item["mtime"] > prev["mtime"]:
            latest_by_artist[artist] = item

    missing = [artist for artist in artists if artist not in latest_by_artist]

    ranking_rows = []
    for artist, item in latest_by_artist.items():
        row = dict(item["row"])
        row.pop("_raw", None)
        ranking_rows.append(row)

    ranking_rows.sort(key=lambda r: safe_float(r.get("fandexNaverFinalPoint")) or 0.0, reverse=True)

    total_count = len(ranking_rows)

    for idx, row in enumerate(ranking_rows, start=1):
        row["rank"] = idx

        total = safe_float(row.get("fandexNaverFinalPoint")) or 0.0
        news = safe_float(row.get("newsIssueClusterPoint")) or 0.0
        blog = safe_float(row.get("blogTopicClusterPoint")) or 0.0
        search = safe_float(row.get("searchDemandComparePoint")) or 0.0

        row["newsSharePercent"] = round(news / total * 100, 2) if total else 0.0
        row["blogSharePercent"] = round(blog / total * 100, 2) if total else 0.0
        row["searchSharePercent"] = round(search / total * 100, 2) if total else 0.0

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    timestamp_csv = Path(f"naver_fandex_ranking_v3_{timestamp}.csv")

    fieldnames = [
        "rank",
        "artist",
        "fandexNaverFinalPoint",
        "newsIssueClusterPoint",
        "blogTopicClusterPoint",
        "searchDemandComparePoint",
        "newsSharePercent",
        "blogSharePercent",
        "searchSharePercent",
        "sourceFile",
        "generatedAt",
    ]

    with open(timestamp_csv, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in ranking_rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})

    with open(LATEST_CSV, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in ranking_rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})

    json_ranking = []

    for row in ranking_rows:
        artist = row["artist"]
        components = {
            "newsIssueClusterPoint": row["newsIssueClusterPoint"],
            "blogTopicClusterPoint": row["blogTopicClusterPoint"],
            "searchDemandComparePoint": row["searchDemandComparePoint"],
        }

        dominant_key = max(components, key=components.get)
        dominant_label = {
            "newsIssueClusterPoint": "뉴스 이슈성",
            "blogTopicClusterPoint": "블로그 화제성",
            "searchDemandComparePoint": "검색 수요",
        }.get(dominant_key, dominant_key)

        json_ranking.append({
            "rank": row["rank"],
            "artist": artist,
            "fandexNaverFinalPoint": row["fandexNaverFinalPoint"],
            "components": components,
            "shares": {
                "newsSharePercent": row["newsSharePercent"],
                "blogSharePercent": row["blogSharePercent"],
                "searchSharePercent": row["searchSharePercent"],
            },
            "signals": {
                "dominantSignal": dominant_key,
                "dominantSignalLabel": dominant_label,
            },
            "meta": {
                "scoreVersion": "v3_compare_search_quality",
                "finalSourceFile": row["sourceFile"],
                "generatedAt": row["generatedAt"],
                "rankingBuilder": VERSION,
            },
        })

    payload = {
        "service": "FANDEX",
        "metric": "naverCumulativeScore",
        "version": "v3_compare_search_quality",
        "sourceFile": str(timestamp_csv),
        "generatedAt": datetime.now().isoformat(timespec="seconds"),
        "count": total_count,
        "ranking": json_ranking,
    }

    LATEST_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = []
    lines.append("FANDEX Naver Ranking v3 Robust Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("")
    lines.append("결과")
    lines.append("-" * 70)
    lines.append(f"candidate final rows: {len(candidates)}")
    lines.append(f"ranking count: {total_count}")
    lines.append(f"missing count: {len(missing)}")
    lines.append(f"timestamp csv: {timestamp_csv}")
    lines.append(f"latest csv: {LATEST_CSV}")
    lines.append(f"latest json: {LATEST_JSON}")
    lines.append("")
    lines.append("ranking")
    lines.append("-" * 70)

    for row in ranking_rows:
        lines.append(
            f"{row['rank']}위 {row['artist']} | "
            f"Naver {row['fandexNaverFinalPoint']} | "
            f"news {row['newsIssueClusterPoint']} | "
            f"blog {row['blogTopicClusterPoint']} | "
            f"search {row['searchDemandComparePoint']} | "
            f"source {row['sourceFile']}"
        )

    lines.append("")
    lines.append("missing")
    lines.append("-" * 70)
    if missing:
        for artist in missing:
            lines.append(f"- {artist}")
    else:
        lines.append("없음")

    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("Naver ranking v3 robust 생성 완료")
    print("=" * 70)
    print(f"ranking count: {total_count}")
    print(f"missing: {missing if missing else '없음'}")
    print(f"latest json: {LATEST_JSON}")
    print(f"report: {REPORT}")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_NAVER_RANKING_V3_ROBUST_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()