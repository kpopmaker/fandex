import csv
import os
import shutil
from datetime import datetime


AUDIT_FILE = "naver_data_quality_audit_v3_latest.csv"


HARD_BLOCK_REASON_CODES = [
    "artist_not_found",
    "weak_relevance_none",
    "noise_group_weak_related",
    "noise_group_product_commerce",
]


def read_csv(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fieldnames):
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def to_float(value):
    try:
        return float(value)
    except:
        return 0.0


def split_reason_codes(value):
    return [
        item.strip()
        for item in str(value or "").split(",")
        if item.strip()
    ]


def has_code(codes, code):
    return code in codes


def should_exclude(row):
    source_type = row.get("sourceType", "")
    audit_level = row.get("auditLevel", "")
    codes = split_reason_codes(row.get("reasonCodes", ""))

    for code in HARD_BLOCK_REASON_CODES:
        if has_code(codes, code):
            return True, code

    if source_type == "blog" and has_code(codes, "commercial_blog"):
        return True, "blog_commercial"

    if source_type == "news":
        if has_code(codes, "title_missing_artist") and has_code(codes, "news_not_artist_centered"):
            return True, "news_title_missing_and_not_centered"

    if audit_level == "high":
        if has_code(codes, "artist_not_found"):
            return True, "high_artist_not_found"

        if source_type == "blog" and has_code(codes, "high_risk_keyword") and has_code(codes, "commercial_blog"):
            return True, "high_risk_commercial_blog"

    return False, ""


def should_review(row):
    codes = split_reason_codes(row.get("reasonCodes", ""))

    review_codes = [
        "noise_group_general",
        "relationship_mention",
        "noise_group_relationship_mention",
        "comparison_or_rank_mention",
        "weak_content_keyword",
        "high_risk_keyword",
    ]

    for code in review_codes:
        if has_code(codes, code):
            return True, code

    return False, ""


def make_key(row):
    return "|".join([
        row.get("artist", ""),
        row.get("sourceType", ""),
        row.get("sourceFile", ""),
        row.get("title", ""),
    ])


def build_blocklist(rows):
    output = []
    seen = set()

    for row in rows:
        exclude, exclude_reason = should_exclude(row)
        review, review_reason = should_review(row)

        if not exclude and not review:
            continue

        key = make_key(row)

        if key in seen:
            continue

        seen.add(key)

        if exclude:
            action = "exclude"
            action_reason = exclude_reason
        else:
            action = "review"
            action_reason = review_reason

        output.append({
            "artist": row.get("artist", ""),
            "sourceType": row.get("sourceType", ""),
            "blockAction": action,
            "blockReason": action_reason,
            "auditLevel": row.get("auditLevel", ""),
            "riskScore": row.get("riskScore", ""),
            "reasonCodes": row.get("reasonCodes", ""),
            "title": row.get("title", ""),
            "description": row.get("description", ""),
            "link": row.get("link", ""),
            "relevanceLevel": row.get("relevanceLevel", ""),
            "groupKey": row.get("groupKey", ""),
            "itemKey": row.get("itemKey", ""),
            "originalPoint": row.get("originalPoint", ""),
            "sourceFile": row.get("sourceFile", ""),
        })

    output.sort(
        key=lambda row: (
            1 if row["blockAction"] == "exclude" else 0,
            row["artist"],
            row["sourceType"],
            to_float(row["riskScore"]),
            to_float(row["originalPoint"]),
        ),
        reverse=True
    )

    return output


def build_summary(rows):
    stats = {}

    for row in rows:
        key = (
            row.get("artist", ""),
            row.get("sourceType", ""),
            row.get("blockAction", ""),
        )

        if key not in stats:
            stats[key] = {
                "artist": row.get("artist", ""),
                "sourceType": row.get("sourceType", ""),
                "blockAction": row.get("blockAction", ""),
                "count": 0,
                "originalPointSum": 0.0,
                "topReasons": {},
            }

        item = stats[key]
        item["count"] += 1
        item["originalPointSum"] += to_float(row.get("originalPoint", 0))

        reason = row.get("blockReason", "")
        if reason:
            item["topReasons"][reason] = item["topReasons"].get(reason, 0) + 1

    output = []

    for key, item in stats.items():
        reason_pairs = sorted(
            item["topReasons"].items(),
            key=lambda x: x[1],
            reverse=True
        )

        top_reasons = " / ".join([
            f"{reason}:{count}"
            for reason, count in reason_pairs[:5]
        ])

        output.append({
            "artist": item["artist"],
            "sourceType": item["sourceType"],
            "blockAction": item["blockAction"],
            "count": item["count"],
            "originalPointSum": round(item["originalPointSum"], 2),
            "topReasons": top_reasons,
        })

    output.sort(
        key=lambda row: (
            row["blockAction"],
            row["artist"],
            row["sourceType"],
        )
    )

    return output


def main():
    if not os.path.exists(AUDIT_FILE):
        print(f"{AUDIT_FILE} 파일이 없습니다.")
        print("먼저 py naver_data_quality_audit_v3.py 를 실행하세요.")
        return

    rows = read_csv(AUDIT_FILE)

    if not rows:
        print("감사 데이터가 없습니다.")
        return

    block_rows = build_blocklist(rows)
    summary_rows = build_summary(block_rows)

    now = datetime.now().strftime("%Y%m%d_%H%M%S")

    block_file = f"naver_quality_blocklist_v3_{now}.csv"
    block_latest = "naver_quality_blocklist_v3_latest.csv"

    summary_file = f"naver_quality_blocklist_v3_summary_{now}.csv"
    summary_latest = "naver_quality_blocklist_v3_summary_latest.csv"

    block_fieldnames = [
        "artist",
        "sourceType",
        "blockAction",
        "blockReason",
        "auditLevel",
        "riskScore",
        "reasonCodes",
        "title",
        "description",
        "link",
        "relevanceLevel",
        "groupKey",
        "itemKey",
        "originalPoint",
        "sourceFile",
    ]

    summary_fieldnames = [
        "artist",
        "sourceType",
        "blockAction",
        "count",
        "originalPointSum",
        "topReasons",
    ]

    write_csv(block_file, block_rows, block_fieldnames)
    shutil.copyfile(block_file, block_latest)

    write_csv(summary_file, summary_rows, summary_fieldnames)
    shutil.copyfile(summary_file, summary_latest)

    exclude_count = sum(1 for row in block_rows if row["blockAction"] == "exclude")
    review_count = sum(1 for row in block_rows if row["blockAction"] == "review")

    print()
    print("품질 blocklist v3 생성 완료")
    print(f"제외 대상: {exclude_count}개")
    print(f"검토 대상: {review_count}개")
    print()
    print(f"blocklist 파일: {block_file}")
    print(f"blocklist 최신: {block_latest}")
    print(f"요약 파일: {summary_file}")
    print(f"요약 최신: {summary_latest}")
    print()
    print("요약 미리보기")

    for row in summary_rows:
        print(
            f"- {row['artist']} / {row['sourceType']} / {row['blockAction']}: "
            f"{row['count']}개 / point {row['originalPointSum']} / {row['topReasons']}"
        )


if __name__ == "__main__":
    main()