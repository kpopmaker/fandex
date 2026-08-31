import csv
import json
from datetime import datetime, date
from pathlib import Path


VERSION = "music_chart_seed_freshness_audit_v1"

SEED_FILE = Path("music_chart_seed_v1.csv")
MUSIC_RANKING_FILE = Path("fandex_music_chart_ranking_v1_latest.json")

LATEST_TXT = Path("FANDEX_MUSIC_CHART_SEED_FRESHNESS_AUDIT.txt")
LATEST_CSV = Path("music_chart_seed_freshness_audit_latest.csv")
LATEST_JSON = Path("music_chart_seed_freshness_audit_latest.json")


def read_csv(path):
    if not path.exists():
        raise SystemExit(f"파일이 없습니다: {path}")

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def read_json(path):
    if not path.exists():
        return {}

    with open(path, "r", encoding="utf-8-sig") as f:
        return json.load(f)


def parse_date(value):
    value = str(value or "").strip()

    if not value:
        return None

    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except Exception:
        return None


def safe_int(value):
    try:
        value = str(value or "").strip()
        if not value:
            return None
        return int(float(value))
    except Exception:
        return None


def classify_rank(value):
    rank = safe_int(value)

    if rank is None:
        return "missing_or_not_charted"

    if rank <= 10:
        return "top_10"
    if rank <= 30:
        return "top_30"
    if rank <= 50:
        return "top_50"
    if rank <= 100:
        return "top_100"

    return "over_100"


def classify_freshness(chart_date, today):
    parsed = parse_date(chart_date)

    if parsed is None:
        return {
            "daysOld": "",
            "freshness": "no_date",
            "riskLevel": "HIGH",
        }

    days_old = (today - parsed).days

    if days_old < 0:
        return {
            "daysOld": days_old,
            "freshness": "future_date_check_needed",
            "riskLevel": "MEDIUM",
        }

    if days_old <= 1:
        return {
            "daysOld": days_old,
            "freshness": "fresh",
            "riskLevel": "LOW",
        }

    if days_old <= 3:
        return {
            "daysOld": days_old,
            "freshness": "recent",
            "riskLevel": "LOW",
        }

    if days_old <= 7:
        return {
            "daysOld": days_old,
            "freshness": "stale",
            "riskLevel": "MEDIUM",
        }

    return {
        "daysOld": days_old,
        "freshness": "old",
        "riskLevel": "HIGH",
    }


def classify_source_type(memo):
    memo_text = str(memo or "").lower()

    if "auto_collected" in memo_text:
        return "auto_collected"
    if "web_checked" in memo_text:
        return "manual_web_checked"
    if "not_found" in memo_text or "previousrankcleared" in memo_text:
        return "auto_not_found"

    return "unknown"


def extract_music_ranking_summary(payload):
    ranking = payload.get("ranking", []) if isinstance(payload, dict) else []

    result = []

    for item in ranking:
        if not isinstance(item, dict):
            continue

        result.append({
            "rank": item.get("rank", ""),
            "artist": item.get("artist", ""),
            "musicPoint": item.get("fandexMusicChartFinalPoint", item.get("score", "")),
            "coreSignal": item.get("coreSignal", ""),
            "entryCount": item.get("entryCount", ""),
            "platformPoints": item.get("platformPoints", {}),
            "bestEntry": item.get("bestEntry", {}),
        })

    return result


def main():
    now = datetime.now()
    today = now.date()
    timestamp = now.strftime("%Y%m%d_%H%M%S")

    print()
    print("Music chart seed freshness audit v1 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("주의: music_chart_seed_v1.csv 원본은 수정하지 않습니다.")
    print()

    seed_rows = read_csv(SEED_FILE)
    music_payload = read_json(MUSIC_RANKING_FILE)
    music_summary = extract_music_ranking_summary(music_payload)

    audit_rows = []

    for row in seed_rows:
        freshness = classify_freshness(row.get("chartDate"), today)
        rank_class = classify_rank(row.get("rank"))
        source_type = classify_source_type(row.get("memo"))

        risk = freshness["riskLevel"]

        if rank_class == "missing_or_not_charted":
            risk = "MEDIUM" if freshness["freshness"] in ["fresh", "recent"] else "HIGH"

        if source_type == "manual_web_checked" and freshness["freshness"] in ["old", "stale"]:
            risk = "HIGH"

        audit_rows.append({
            "artist": row.get("artist", ""),
            "platform": row.get("platform", ""),
            "chartName": row.get("chartName", ""),
            "trackTitle": row.get("trackTitle", ""),
            "rank": row.get("rank", ""),
            "rankClass": rank_class,
            "chartDate": row.get("chartDate", ""),
            "daysOld": freshness["daysOld"],
            "freshness": freshness["freshness"],
            "sourceType": source_type,
            "riskLevel": risk,
            "memo": row.get("memo", ""),
        })

    risk_order = {
        "HIGH": 0,
        "MEDIUM": 1,
        "LOW": 2,
    }

    audit_rows.sort(
        key=lambda item: (
            risk_order.get(item["riskLevel"], 9),
            str(item["artist"]),
            str(item["platform"]),
        )
    )

    timestamp_csv = Path(f"music_chart_seed_freshness_audit_{timestamp}.csv")
    timestamp_json = Path(f"music_chart_seed_freshness_audit_{timestamp}.json")
    timestamp_txt = Path(f"FANDEX_MUSIC_CHART_SEED_FRESHNESS_AUDIT_{timestamp}.txt")

    fieldnames = [
        "artist",
        "platform",
        "chartName",
        "trackTitle",
        "rank",
        "rankClass",
        "chartDate",
        "daysOld",
        "freshness",
        "sourceType",
        "riskLevel",
        "memo",
    ]

    for path in [timestamp_csv, LATEST_CSV]:
        with open(path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(audit_rows)

    payload = {
        "version": VERSION,
        "createdAt": now.isoformat(timespec="seconds"),
        "seedFile": str(SEED_FILE),
        "musicRankingFile": str(MUSIC_RANKING_FILE),
        "today": today.isoformat(),
        "seedAudit": audit_rows,
        "musicRankingSummary": music_summary,
        "notes": [
            "This audit does not modify music_chart_seed_v1.csv.",
            "HIGH risk usually means old manual seed or missing rank with old date.",
            "Fresh MISS rows can be acceptable because they confirm current non-entry.",
        ],
    }

    for path in [timestamp_json, LATEST_JSON]:
        path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

    high_rows = [row for row in audit_rows if row["riskLevel"] == "HIGH"]
    medium_rows = [row for row in audit_rows if row["riskLevel"] == "MEDIUM"]
    low_rows = [row for row in audit_rows if row["riskLevel"] == "LOW"]

    lines = []
    lines.append("FANDEX Music Chart Seed Freshness Audit")
    lines.append("=" * 70)
    lines.append(f"createdAt: {now.isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: audit only / seedModified: FALSE")
    lines.append("")
    lines.append("요약")
    lines.append("-" * 70)
    lines.append(f"seed rows: {len(seed_rows)}")
    lines.append(f"HIGH risk: {len(high_rows)}")
    lines.append(f"MEDIUM risk: {len(medium_rows)}")
    lines.append(f"LOW risk: {len(low_rows)}")
    lines.append("")
    lines.append("현재 Music chart ranking")
    lines.append("-" * 70)

    for item in music_summary:
        lines.append(
            f"{item['rank']}위 {item['artist']} | "
            f"Music {item['musicPoint']} | "
            f"coreSignal={item['coreSignal']} | "
            f"entryCount={item['entryCount']} | "
            f"platformPoints={item['platformPoints']}"
        )

    lines.append("")
    lines.append("HIGH risk rows")
    lines.append("-" * 70)

    if high_rows:
        for row in high_rows:
            lines.append(
                f"HIGH {row['artist']} | {row['platform']} | {row['trackTitle']} | "
                f"rank={row['rank'] or '미진입/없음'} | "
                f"date={row['chartDate'] or '없음'} | "
                f"daysOld={row['daysOld']} | "
                f"freshness={row['freshness']} | "
                f"sourceType={row['sourceType']}"
            )
    else:
        lines.append("없음")

    lines.append("")
    lines.append("MEDIUM risk rows")
    lines.append("-" * 70)

    if medium_rows:
        for row in medium_rows:
            lines.append(
                f"MEDIUM {row['artist']} | {row['platform']} | {row['trackTitle']} | "
                f"rank={row['rank'] or '미진입/없음'} | "
                f"date={row['chartDate'] or '없음'} | "
                f"daysOld={row['daysOld']} | "
                f"freshness={row['freshness']} | "
                f"sourceType={row['sourceType']}"
            )
    else:
        lines.append("없음")

    lines.append("")
    lines.append("LOW risk rows")
    lines.append("-" * 70)

    if low_rows:
        for row in low_rows:
            lines.append(
                f"LOW {row['artist']} | {row['platform']} | {row['trackTitle']} | "
                f"rank={row['rank'] or '미진입/없음'} | "
                f"date={row['chartDate'] or '없음'} | "
                f"daysOld={row['daysOld']} | "
                f"freshness={row['freshness']} | "
                f"sourceType={row['sourceType']}"
            )
    else:
        lines.append("없음")

    lines.append("")
    lines.append("판단 기준")
    lines.append("-" * 70)
    lines.append("LOW: 0~3일 이내 최신 seed")
    lines.append("MEDIUM: 4~7일 경과 또는 최신 MISS 확인 row")
    lines.append("HIGH: 8일 이상 오래된 seed, 오래된 수동 확인 row, 오래된 미진입 row")
    lines.append("")
    lines.append("다음 액션")
    lines.append("-" * 70)
    lines.append("1. HIGH row는 collector로 재확인하거나 수동 업데이트 필요")
    lines.append("2. LOW row는 현재 점수 근거로 사용 가능")
    lines.append("3. fresh MISS row는 현재 미진입 확인으로 유지 가능")
    lines.append("4. 오래된 manual_web_checked row가 점수에 크게 기여하면 순위 왜곡 가능성 있음")

    for path in [timestamp_txt, LATEST_TXT]:
        path.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("Music chart seed freshness audit 결과")
    print("-" * 70)
    print(f"HIGH risk: {len(high_rows)}")
    print(f"MEDIUM risk: {len(medium_rows)}")
    print(f"LOW risk: {len(low_rows)}")
    print()

    if high_rows:
        print("HIGH risk rows")
        print("-" * 70)
        for row in high_rows:
            print(
                f"HIGH {row['artist']} / {row['platform']} / {row['trackTitle']} "
                f"/ rank={row['rank'] or '미진입/없음'} "
                f"/ date={row['chartDate'] or '없음'} "
                f"/ daysOld={row['daysOld']} "
                f"/ sourceType={row['sourceType']}"
            )

    print()
    print("=" * 70)
    print("Music chart seed freshness audit v1 완료")
    print("=" * 70)
    print(f"리포트: {LATEST_TXT}")
    print(f"CSV: {LATEST_CSV}")
    print(f"JSON: {LATEST_JSON}")
    print()
    print("확인:")
    print("notepad FANDEX_MUSIC_CHART_SEED_FRESHNESS_AUDIT.txt")


if __name__ == "__main__":
    main()