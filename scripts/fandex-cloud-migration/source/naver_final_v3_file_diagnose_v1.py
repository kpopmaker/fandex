import csv
from pathlib import Path
from datetime import datetime


REPORT = Path("FANDEX_NAVER_FINAL_V3_FILE_DIAGNOSE_REPORT.txt")


PATTERNS = [
    "*final*v3*.csv",
    "*v3*final*.csv",
    "naver_fandex_final*.csv",
    "naver_*final*.csv",
    "*아이유*.csv",
    "*에스파*.csv",
    "*아이브*.csv",
    "*뉴진스*.csv",
]


def read_head(path, limit=3):
    try:
        with open(path, "r", encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            rows = []
            for i, row in enumerate(reader):
                if i >= limit:
                    break
                rows.append(row)
            return reader.fieldnames or [], rows
    except Exception as e:
        return [f"READ_ERROR: {e}"], []


def main():
    seen = {}
    for pattern in PATTERNS:
        for path in Path(".").glob(pattern):
            if path.is_file():
                seen[str(path)] = path

    files = sorted(seen.values(), key=lambda p: p.stat().st_mtime, reverse=True)

    lines = []
    lines.append("FANDEX Naver Final v3 File Diagnose Report")
    lines.append("=" * 70)
    lines.append(f"createdAt: {datetime.now().isoformat(timespec='seconds')}")
    lines.append("")
    lines.append(f"matched files: {len(files)}")
    lines.append("")

    for path in files[:80]:
        headers, rows = read_head(path)

        lines.append("-" * 70)
        lines.append(f"name: {path.name}")
        lines.append(f"modified: {datetime.fromtimestamp(path.stat().st_mtime).isoformat(timespec='seconds')}")
        lines.append(f"size: {path.stat().st_size}")
        lines.append(f"headers: {headers}")
        lines.append(f"sampleRows: {len(rows)}")

        for idx, row in enumerate(rows, start=1):
            preview = {}
            for key in list(row.keys())[:12]:
                preview[key] = row.get(key)
            lines.append(f"row{idx}: {preview}")

    REPORT.write_text("\n".join(lines), encoding="utf-8")

    print()
    print("Final v3 file diagnose 완료")
    print("=" * 70)
    print(f"matched files: {len(files)}")
    print(f"report: {REPORT}")
    print()
    print("확인:")
    print("powershell -NoProfile -Command \"Get-Content .\\FANDEX_NAVER_FINAL_V3_FILE_DIAGNOSE_REPORT.txt -Encoding UTF8\"")


if __name__ == "__main__":
    main()