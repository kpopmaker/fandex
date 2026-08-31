import csv
import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


VERSION = "naver_search_trend_anchor_merge_v1"

ARTIST_LIST = Path("artist_list.txt")
REPORT = Path("FANDEX_NAVER_SEARCH_TREND_ANCHOR_MERGE_REPORT.txt")
JSON_OUT = Path("fandex_naver_search_trend_anchor_merge_latest.json")

LATEST_SUMMARY = Path("naver_search_trend_compare_v2_summary_latest.csv")
LATEST_DETAIL = Path("naver_search_trend_compare_v2_latest.csv")


def read_artist_list():
    if not ARTIST_LIST.exists():
        raise SystemExit(f"파일 없음: {ARTIST_LIST}")

    return [
        line.strip()
        for line in ARTIST_LIST.read_text(encoding="utf-8-sig").splitlines()
        if line.strip()
    ]


def write_artist_list(artists):
    ARTIST_LIST.write_text("\n".join(artists) + "\n", encoding="utf-8")


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


def safe_float(value):
    try:
        if value in [None, ""]:
            return None
        return float(str(value).replace(",", "").strip())
    except Exception:
        return None


def is_number(value):
    return safe_float(value) is not None


def find_artist_column(rows):
    if not rows:
        return None

    candidates = ["artist", "아티스트", "artistName", "name"]

    for col in candidates:
        if col in rows[0]:
            return col

    for col in rows[0].keys():
        values = [str(row.get(col, "")).strip() for row in rows[:5]]
        if any(value for value in values):
            return col

    return None


def find_point_column(rows):
    if not rows:
        return None

    preferred = [
        "searchDemandComparePoint",
        "fandexSearchDemandComparePoint",
        "searchDemandPoint",
        "fandexSearchDemandPoint",
        "point",
        "score",
    ]

    columns = list(rows[0].keys())

    for col in preferred:
        if col in columns:
            return col

    for col in columns:
        lowered = col.lower()
        if "point" in lowered or "score" in lowered:
            if any(is_number(row.get(col)) for row in rows):
                return col

    numeric_cols = []

    for col in columns:
        if col.lower() in ["rank", "ranking"]:
            continue
        if any(is_number(row.get(col)) for row in rows):
            numeric_cols.append(col)

    if numeric_cols:
        return numeric_cols[0]

    return None


def newest_file(pattern, before_files):
    files = sorted(Path(".").glob(pattern), key=lambda p: p.stat().st_mtime, reverse=True)

    for file in files:
        if str(file) not in before_files:
            return file

    return files[0] if files else None


def run_trend_group(group_name, artists):
    print()
    print(f"[{group_name}] 검색트렌드 실행")
    print("-" * 70)
    print(", ".join(artists))

    before = {str(p) for p in Path(".").glob("naver_search_trend_compare_v2*.csv")}

    write_artist_list(artists)

    result = subprocess.run(
        [sys.executable, "naver_search_trend_compare_v2.py"],
        input="\n\n",
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )

    summary_file = newest_file("naver_search_trend_compare_v2_summary_*.csv", before)
    detail_file = newest_file("naver_search_trend_compare_v2_*.csv", before)

    print(f"returncode: {result.returncode}")
    print(f"summary: {summary_file}")

    if result.stdout.strip():
        print(result.stdout[-1500:])

    if result.stderr.strip():
        print(result.stderr[-1500:])

    rows = read_csv(summary_file) if summary_file else []

    return {
        "group": group_name,
        "artists": artists,
        "returncode": result.returncode,
        "summaryFile": str(summary_file) if summary_file else "",
        "detailFile": str(detail_file) if detail_file else "",
        "rows": rows,
        "stdout": result.stdout,
        "stderr": result.stderr,
    }


def build_groups(artists):
    if not artists:
        raise SystemExit("artist_list가 비어 있습니다.")

    anchor = artists[0]

    base = artists[:5]
    remaining = artists[5:]

    groups = [("base", base)]

    idx = 1
    for i in range(0, len(remaining), 4):
        chunk = remaining[i:i + 4]
        groups.append((f"anchor_group_{idx}", [anchor] + chunk))
        idx += 1

    return anchor, groups


def adjust_group_rows(group_result, anchor, base_anchor_point, used_artists):
    rows = group_result["rows"]

    artist_col = find_artist_column(rows)
    point_col = find_point_column(rows)

    if not artist_col or not point_col:
        return [], {
            "group": group_result["group"],
            "artistColumn": artist_col,
            "pointColumn": point_col,
            "scaleFactor": None,
            "anchorRawPoint": None,
            "error": "missing artist or point column",
        }

    anchor_rows = [
        row for row in rows
        if str(row.get(artist_col, "")).strip() == anchor
    ]

    if group_result["group"] == "base":
        scale_factor = 1.0
        anchor_raw_point = base_anchor_point
    else:
        if not anchor_rows:
            scale_factor = 1.0
            anchor_raw_point = None
        else:
            anchor_raw_point = safe_float(anchor_rows[0].get(point_col))
            if anchor_raw_point and anchor_raw_point != 0:
                scale_factor = base_anchor_point / anchor_raw_point
            else:
                scale_factor = 1.0

    adjusted = []

    for row in rows:
        artist = str(row.get(artist_col, "")).strip()

        if not artist:
            continue

        # anchor는 base에서만 사용하고, 다른 그룹의 anchor는 스케일 계산용이라 제외
        if artist == anchor and group_result["group"] != "base":
            continue

        if artist in used_artists:
            continue

        new_row = dict(row)

        for col, value in list(row.items()):
            if col.lower() in ["rank", "ranking"]:
                continue

            number = safe_float(value)

            if number is not None:
                adjusted_value = round(number * scale_factor, 4)
                new_row[col] = adjusted_value
                new_row[f"raw_{col}"] = value

        new_row[artist_col] = artist
        new_row["anchorMergeGroup"] = group_result["group"]
        new_row["anchorArtist"] = anchor
        new_row["anchorBasePoint"] = round(base_anchor_point, 4)
        new_row["anchorRawPointInGroup"] = "" if anchor_raw_point is None else round(anchor_raw_point, 4)
        new_row["anchorScaleFactor"] = round(scale_factor, 8)

        adjusted.append(new_row)
        used_artists.add(artist)

    meta = {
        "group": group_result["group"],
        "artistColumn": artist_col,
        "pointColumn": point_col,
        "scaleFactor": scale_factor,
        "anchorRawPoint": anchor_raw_point,
        "summaryFile": group_result["summaryFile"],
    }

    return adjusted, meta


def main():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    print()
    print("Naver search trend anchor merge v1 시작")
    print("=" * 70)
    print(f"version: {VERSION}")
    print("주의: artist_list.txt는 실행 후 원상복구합니다.")
    print("주의: website public/data는 건드리지 않습니다.")
    print()

    original_artists = read_artist_list()
    backup = Path(f"artist_list_backup_before_search_trend_anchor_merge_{timestamp}.txt")
    shutil.copy2(ARTIST_LIST, backup)

    anchor, groups = build_groups(original_artists)

    group_results = []

    try:
        for group_name, artists in groups:
            result = run_trend_group(group_name, artists)
            group_results.append(result)

            if result["returncode"] != 0:
                raise RuntimeError(f"{group_name} 검색트렌드 실행 실패")
    finally:
        shutil.copy2(backup, ARTIST_LIST)

    base_rows = group_results[0]["rows"]
    base_artist_col = find_artist_column(base_rows)
    base_point_col = find_point_column(base_rows)

    if not base_artist_col or not base_point_col:
        raise SystemExit("base group summary에서 artist/point column을 찾지 못했습니다.")

    base_anchor_rows = [
        row for row in base_rows
        if str(row.get(base_artist_col, "")).strip() == anchor
    ]

    if not base_anchor_rows:
        raise SystemExit(f"base group에서 anchor를 찾지 못했습니다: {anchor}")

    base_anchor_point = safe_float(base_anchor_rows[0].get(base_point_col))

    if not base_anchor_point:
        raise SystemExit(f"base anchor point가 비정상입니다: {base_anchor_point}")

    merged_rows = []
    group_meta = []
    used_artists = set()

    for group_result in group_results:
        adjusted_rows, meta = adjust_group_rows(
            group_result=group_result,
            anchor=anchor,
            base_anchor_point=base_anchor_point,
            used_artists=used_artists,
        )
        merged_rows.extend(adjusted_rows)
        group_meta.append(meta)

    point_col = base_point_col
    artist_col = base_artist_col

    merged_rows.sort(
        key=lambda row: safe_float(row.get(point_col)) or 0.0,
        reverse=True,
    )

    for idx, row in enumerate(merged_rows, start=1):
        if "rank" in row:
            row["rank"] = idx
        elif "ranking" in row:
            row["ranking"] = idx
        else:
            row["rank"] = idx

    timestamp_summary = Path(f"naver_search_trend_compare_v2_summary_anchor_merged_{timestamp}.csv")
    timestamp_detail = Path(f"naver_search_trend_compare_v2_anchor_merged_{timestamp}.csv")

    fieldnames = []
    for row in merged_rows:
        for key in row.keys():
            if key not in fieldnames:
                fieldnames.append(key)

    write_csv(timestamp_summary, merged_rows, fieldnames)
    write_csv(LATEST_SUMMARY, merged_rows, fieldnames)

    # final v3가 detail latest를 찾을 수도 있어서 동일 내용을 detail latest에도 저장
    write_csv(timestamp_detail, merged_rows, fieldnames)
    write_csv(LATEST_DETAIL, merged_rows, fieldnames)

    missing = [artist for artist in original_artists if artist not in {row.get(artist_col) for row in merged_rows}]

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
        "anchor": anchor,
        "artistColumn": artist_col,
        "pointColumn": point_col,
        "baseAnchorPoint": base_anchor_point,
        "groups": [
            {
                "group": name,
                "artists": artists,
            }
            for name, artists in groups
        ],
        "groupMeta": group_meta,
        "mergedCount": len(merged_rows),
        "missing": missing,
        "latestSummary": str(LATEST_SUMMARY),
        "latestDetail": str(LATEST_DETAIL),
        "timestampSummary": str(timestamp_summary),
        "timestampDetail": str(timestamp_detail),
    }

    JSON_OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    lines = []
    lines.append("FANDEX Naver Search Trend Anchor Merge Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append(f"version: {VERSION}")
    lines.append("scope: search trend anchor merge / artist_list restored / no website export")
    lines.append("")
    lines.append("anchor")
    lines.append("-" * 70)
    lines.append(f"anchorArtist: {anchor}")
    lines.append(f"baseAnchorPoint: {base_anchor_point}")
    lines.append(f"artistColumn: {artist_col}")
    lines.append(f"pointColumn: {point_col}")
    lines.append("")
    lines.append("groups")
    lines.append("-" * 70)

    for item in group_meta:
        lines.append(
            f"{item['group']} | scaleFactor={item['scaleFactor']} | "
            f"anchorRawPoint={item['anchorRawPoint']} | file={item['summaryFile']}"
        )

    lines.append("")
    lines.append("merged ranking")
    lines.append("-" * 70)

    for row in merged_rows:
        lines.append(
            f"{row.get('rank')}위 {row.get(artist_col)} | "
            f"{point_col}={row.get(point_col)} | "
            f"group={row.get('anchorMergeGroup')} | "
            f"scale={row.get('anchorScaleFactor')}"
        )

    lines.append("")
    lines.append("missing")
    lines.append("-" * 70)

    if missing:
        for artist in missing:
            lines.append(f"- {artist}")
    else:
        lines.append("없음")

    lines.append("")
    lines.append("생성 파일")
    lines.append("-" * 70)
    lines.append(f"timestamp summary: {timestamp_summary}")
    lines.append(f"latest summary: {LATEST_SUMMARY}")
    lines.append(f"timestamp detail: {timestamp_detail}")
    lines.append(f"latest detail: {LATEST_DETAIL}")
    lines.append(f"json: {JSON_OUT}")
    lines.append("")
    lines.append("다음 단계")
    lines.append("-" * 70)
    lines.append("1. naver_fandex_final_score_v3_batch.py 실행")
    lines.append("2. naver_fandex_ranking_v3.py 실행")
    lines.append("3. naver_fandex_export_v3_json.py 실행")
    lines.append("4. readiness audit로 Naver 10명 반영 확인")

    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("=" * 70)
    print("Naver search trend anchor merge v1 완료")
    print("=" * 70)
    print(f"merged count: {len(merged_rows)}")
    print(f"missing: {missing if missing else '없음'}")
    print(f"latest summary: {LATEST_SUMMARY}")
    print(f"report: {REPORT}")
    print("artist_list.txt 복구 완료")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_NAVER_SEARCH_TREND_ANCHOR_MERGE_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()