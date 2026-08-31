import csv
import json
import shutil
from datetime import datetime
from pathlib import Path


VERSION = "naver_fandex_ranking_v3_direct_from_clusters_and_anchor_v1"

ARTIST_LIST = Path("artist_list.txt")
SEARCH_SUMMARY = Path("naver_search_trend_compare_v2_summary_latest.csv")

LATEST_CSV = Path("naver_fandex_ranking_v3_latest.csv")
LATEST_JSON = Path("fandex_naver_ranking_v3_latest.json")
REPORT = Path("FANDEX_NAVER_RANKING_V3_DIRECT_REPORT.txt")


def read_artist_list():
    return [
        line.strip()
        for line in ARTIST_LIST.read_text(encoding="utf-8-sig").splitlines()
        if line.strip()
    ]


def read_csv(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fieldnames):
    with open(path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def safe_float(value):
    try:
        if value is None or str(value).strip() == "":
            return 0.0
        return float(str(value).replace(",", "").strip())
    except Exception:
        return 0.0


def newest_cluster_file(artist, kind):
    if kind == "news":
        pattern = f"naver_news_{artist}_*_issue_cluster.csv"
        blocked = ["articles", "primary", "scored", "sentiment"]
    else:
        pattern = f"naver_blog_{artist}_*_topic_cluster.csv"
        blocked = ["articles", "primary", "scored"]

    files = []

    for path in Path(".").glob(pattern):
        name = path.name.lower()
        if any(word in name for word in blocked):
            continue
        if not path.is_file():
            continue
        files.append(path)

    files.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return files[0] if files else None


def sum_news_point(path):
    rows = read_csv(path)
    total = 0.0

    for row in rows:
        if "cappedIssuePoint" in row:
            total += safe_float(row.get("cappedIssuePoint"))
        elif "issueCap" in row:
            total += safe_float(row.get("issueCap"))
        elif "rawPointSum" in row:
            total += safe_float(row.get("rawPointSum"))

    return round(total, 2)


def sum_blog_point(path):
    rows = read_csv(path)
    total = 0.0

    for row in rows:
        if "cappedTopicPoint" in row:
            total += safe_float(row.get("cappedTopicPoint"))
        elif "keyCappedTopicPoint" in row:
            total += safe_float(row.get("keyCappedTopicPoint"))
        elif "rawPointSum" in row:
            total += safe_float(row.get("rawPointSum"))

    return round(total, 2)


def load_search_points():
    rows = read_csv(SEARCH_SUMMARY)

    result = {}

    for row in rows:
        artist = str(row.get("artist", "")).strip()
        if not artist:
            continue

        result[artist] = {
            "searchDemandComparePoint": safe_float(row.get("searchDemandComparePoint")),
            "searchCompareRank": row.get("rank") or row.get("ranking") or "",
            "trendSum": safe_float(row.get("trendSum")),
            "trendAvg": safe_float(row.get("trendAvg")),
            "trendMax": safe_float(row.get("trendMax")),
            "trendLatest": safe_float(row.get("trendLatest")),
            "trendCount": row.get("trendCount") or "",
        }

    return result


def backup_if_exists(path, backup_dir):
    if path.exists():
        shutil.copy2(path, backup_dir / path.name)


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    now_iso = datetime.now().isoformat(timespec="seconds")

    backup_dir = Path(f"naver_v3_direct_ranking_backup_before_write_{timestamp}")
    backup_dir.mkdir(exist_ok=True)

    backup_if_exists(LATEST_CSV, backup_dir)
    backup_if_exists(LATEST_JSON, backup_dir)

    artists = read_artist_list()
    search_points = load_search_points()

    final_rows = []
    missing = []

    final_fieldnames = [
        "artist",
        "fandexNaverFinalPoint",
        "newsIssueClusterPoint",
        "blogTopicClusterPoint",
        "searchDemandComparePoint",
        "searchCompareRank",
        "trendSum",
        "trendAvg",
        "trendMax",
        "trendLatest",
        "trendCount",
        "newsClusterFile",
        "blogClusterFile",
        "searchCompareFile",
        "generatedAt",
        "builderVersion",
    ]

    for artist in artists:
        news_file = newest_cluster_file(artist, "news")
        blog_file = newest_cluster_file(artist, "blog")
        search = search_points.get(artist)

        if not news_file or not blog_file or not search:
            missing.append({
                "artist": artist,
                "newsFile": str(news_file) if news_file else "",
                "blogFile": str(blog_file) if blog_file else "",
                "hasSearch": bool(search),
            })
            continue

        news_point = sum_news_point(news_file)
        blog_point = sum_blog_point(blog_file)
        search_point = round(search["searchDemandComparePoint"], 2)
        final_point = round(news_point + blog_point + search_point, 2)

        row = {
            "artist": artist,
            "fandexNaverFinalPoint": final_point,
            "newsIssueClusterPoint": news_point,
            "blogTopicClusterPoint": blog_point,
            "searchDemandComparePoint": search_point,
            "searchCompareRank": search["searchCompareRank"],
            "trendSum": search["trendSum"],
            "trendAvg": search["trendAvg"],
            "trendMax": search["trendMax"],
            "trendLatest": search["trendLatest"],
            "trendCount": search["trendCount"],
            "newsClusterFile": news_file.name,
            "blogClusterFile": blog_file.name,
            "searchCompareFile": SEARCH_SUMMARY.name,
            "generatedAt": now_iso,
            "builderVersion": VERSION,
        }

        final_rows.append(row)

        final_file = Path(f"naver_fandex_final_v3_{artist}_{timestamp}.csv")
        write_csv(final_file, [row], final_fieldnames)

    ranking_rows = sorted(
        final_rows,
        key=lambda row: safe_float(row["fandexNaverFinalPoint"]),
        reverse=True,
    )

    ranking_fieldnames = [
        "rank",
        "artist",
        "fandexNaverFinalPoint",
        "newsIssueClusterPoint",
        "blogTopicClusterPoint",
        "searchDemandComparePoint",
        "newsSharePercent",
        "blogSharePercent",
        "searchSharePercent",
        "newsClusterFile",
        "blogClusterFile",
        "searchCompareFile",
        "finalSourceFile",
        "generatedAt",
        "builderVersion",
    ]

    csv_rows = []
    json_rows = []

    for idx, row in enumerate(ranking_rows, start=1):
        total = safe_float(row["fandexNaverFinalPoint"])
        news = safe_float(row["newsIssueClusterPoint"])
        blog = safe_float(row["blogTopicClusterPoint"])
        search = safe_float(row["searchDemandComparePoint"])

        news_share = round(news / total * 100, 2) if total else 0.0
        blog_share = round(blog / total * 100, 2) if total else 0.0
        search_share = round(search / total * 100, 2) if total else 0.0

        final_source = f"naver_fandex_final_v3_{row['artist']}_{timestamp}.csv"

        csv_row = {
            "rank": idx,
            "artist": row["artist"],
            "fandexNaverFinalPoint": row["fandexNaverFinalPoint"],
            "newsIssueClusterPoint": row["newsIssueClusterPoint"],
            "blogTopicClusterPoint": row["blogTopicClusterPoint"],
            "searchDemandComparePoint": row["searchDemandComparePoint"],
            "newsSharePercent": news_share,
            "blogSharePercent": blog_share,
            "searchSharePercent": search_share,
            "newsClusterFile": row["newsClusterFile"],
            "blogClusterFile": row["blogClusterFile"],
            "searchCompareFile": row["searchCompareFile"],
            "finalSourceFile": final_source,
            "generatedAt": row["generatedAt"],
            "builderVersion": VERSION,
        }

        csv_rows.append(csv_row)

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

        json_rows.append({
            "rank": idx,
            "artist": row["artist"],
            "fandexNaverFinalPoint": row["fandexNaverFinalPoint"],
            "components": components,
            "shares": {
                "newsSharePercent": news_share,
                "blogSharePercent": blog_share,
                "searchSharePercent": search_share,
            },
            "signals": {
                "dominantSignal": dominant_key,
                "dominantSignalLabel": dominant_label,
            },
            "searchTrend": {
                "searchCompareRank": row["searchCompareRank"],
                "trendSum": row["trendSum"],
                "trendAvg": row["trendAvg"],
                "trendMax": row["trendMax"],
                "trendLatest": row["trendLatest"],
                "trendCount": row["trendCount"],
            },
            "meta": {
                "scoreVersion": "v3_compare_search_quality",
                "newsClusterFile": row["newsClusterFile"],
                "blogClusterFile": row["blogClusterFile"],
                "searchCompareFile": row["searchCompareFile"],
                "finalSourceFile": final_source,
                "generatedAt": row["generatedAt"],
                "builderVersion": VERSION,
            },
        })

    timestamp_csv = Path(f"naver_fandex_ranking_v3_{timestamp}.csv")
    write_csv(timestamp_csv, csv_rows, ranking_fieldnames)
    write_csv(LATEST_CSV, csv_rows, ranking_fieldnames)

    payload = {
        "service": "FANDEX",
        "metric": "naverCumulativeScore",
        "version": "v3_compare_search_quality",
        "sourceFile": timestamp_csv.name,
        "generatedAt": now_iso,
        "count": len(json_rows),
        "ranking": json_rows,
    }

    LATEST_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = []
    lines.append("FANDEX Naver Ranking v3 Direct Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {now_iso}")
    lines.append(f"version: {VERSION}")
    lines.append("")
    lines.append("결과")
    lines.append("-" * 70)
    lines.append(f"ranking count: {len(json_rows)}")
    lines.append(f"missing count: {len(missing)}")
    lines.append(f"backupDir: {backup_dir}")
    lines.append(f"latestCsv: {LATEST_CSV}")
    lines.append(f"latestJson: {LATEST_JSON}")
    lines.append("")
    lines.append("ranking")
    lines.append("-" * 70)

    for row in csv_rows:
        lines.append(
            f"{row['rank']}위 {row['artist']} | "
            f"Naver {row['fandexNaverFinalPoint']} | "
            f"news {row['newsIssueClusterPoint']} | "
            f"blog {row['blogTopicClusterPoint']} | "
            f"search {row['searchDemandComparePoint']}"
        )

    lines.append("")
    lines.append("missing")
    lines.append("-" * 70)

    if missing:
        for item in missing:
            lines.append(str(item))
    else:
        lines.append("없음")

    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("Naver ranking v3 direct 생성 완료")
    print("=" * 70)
    print(f"ranking count: {len(json_rows)}")
    print(f"missing count: {len(missing)}")
    print(f"latest json: {LATEST_JSON}")
    print(f"report: {REPORT}")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_NAVER_RANKING_V3_DIRECT_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()