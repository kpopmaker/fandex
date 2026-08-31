import csv
import glob
import os
import re
from collections import Counter

def count_term(text, term):
    if not text:
        return 0
    return text.lower().count(term.lower())

def relevance_score(query, title, description):
    title_count = count_term(title, query)
    desc_count = count_term(description, query)

    score = 0

    if title_count > 0:
        score += 60

    if desc_count > 0:
        score += 25

    score += min((title_count + desc_count) * 5, 15)

    if title_count == 0 and desc_count > 0:
        score = min(score, 35)

    if title_count == 0 and desc_count == 0:
        score = 0

    return min(score, 100), title_count, desc_count

def relevance_level(score):
    if score >= 70:
        return "primary"
    if score >= 35:
        return "related"
    if score > 0:
        return "weak"
    return "none"

def reason_text(query, title_count, desc_count):
    reasons = []

    if title_count > 0:
        reasons.append("title_contains_query")

    if desc_count > 0:
        reasons.append("description_contains_query")

    if not reasons:
        return "no_query_match"

    return "|".join(reasons)

def process_file(path, query):
    if path.endswith("_scored.csv") or path.endswith("_primary.csv"):
        return

    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        original_fields = reader.fieldnames or []

    if not rows:
        print(f"빈 파일이라 건너뜀: {path}")
        return

    enriched_rows = []

    for row in rows:
        title = row.get("title", "")
        description = row.get("description", "")

        score, title_count, desc_count = relevance_score(query, title, description)
        level = relevance_level(score)

        row["relevance_score"] = score
        row["relevance_level"] = level
        row["title_query_count"] = title_count
        row["description_query_count"] = desc_count
        row["relevance_reason"] = reason_text(query, title_count, desc_count)

        enriched_rows.append(row)

    extra_fields = [
        "relevance_score",
        "relevance_level",
        "title_query_count",
        "description_query_count",
        "relevance_reason",
    ]

    fieldnames = original_fields + [field for field in extra_fields if field not in original_fields]

    base, ext = os.path.splitext(path)
    scored_path = f"{base}_scored.csv"
    primary_path = f"{base}_primary.csv"

    with open(scored_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(enriched_rows)

    primary_rows = [row for row in enriched_rows if row["relevance_level"] == "primary"]

    with open(primary_path, "w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(primary_rows)

    level_counts = Counter(row["relevance_level"] for row in enriched_rows)

    print()
    print(f"처리 완료: {path}")
    print(f"전체 저장: {scored_path}")
    print(f"중심 글만 저장: {primary_path}")
    print(f"분류 결과: {dict(level_counts)}")

def main():
    query = input("중심성 점수를 계산할 검색어를 입력하세요: ").strip()

    if not query:
        print("검색어가 비어 있어서 종료합니다.")
        return

    candidates = []

    for pattern in ["naver_news_*.csv", "naver_blog_*.csv"]:
        for path in glob.glob(pattern):
            if path.endswith("_scored.csv") or path.endswith("_primary.csv"):
                continue

            try:
                with open(path, "r", encoding="utf-8-sig", newline="") as f:
                    reader = csv.DictReader(f)
                    first_row = next(reader, None)
                    file_query = first_row.get("query", "") if first_row else ""
            except Exception:
                file_query = ""

            if query in path or file_query == query:
                candidates.append(path)

    if not candidates:
        print("처리할 파일을 찾지 못했습니다.")
        print("현재 폴더에 naver_news_ 또는 naver_blog_ CSV가 있는지 확인하세요.")
        return

    print("처리 대상 파일:")
    for path in candidates:
        print("-", path)

    for path in candidates:
        process_file(path, query)

    print()
    print("완료")

if __name__ == "__main__":
    main()