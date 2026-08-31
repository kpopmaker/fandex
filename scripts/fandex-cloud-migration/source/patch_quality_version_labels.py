from pathlib import Path


FILES = [
    "naver_fandex_ranking_v3.py",
    "naver_fandex_export_v3_json.py",
    "naver_artist_report_v3.py",
]


REPLACEMENTS = {
    '"v3_compare_search"': '"v3_compare_search_quality"',
    "'v3_compare_search'": "'v3_compare_search_quality'",
    'row.get("scoreVersion", "v3_compare_search")': 'row.get("scoreVersion", "v3_compare_search_quality")',
    'row.get("scoreVersion", "v3_compare_search_quality_quality")': 'row.get("scoreVersion", "v3_compare_search_quality")',
    '"v3_compare_search_quality_quality"': '"v3_compare_search_quality"',
    "'v3_compare_search_quality_quality'": "'v3_compare_search_quality'",
}


def patch_file(file_name):
    path = Path(file_name)

    if not path.exists():
        print(f"- {file_name}: 파일 없음")
        return

    text = path.read_text(encoding="utf-8-sig")
    original = text

    for old, new in REPLACEMENTS.items():
        text = text.replace(old, new)

    path.write_text(text, encoding="utf-8")

    if text != original:
        print(f"- {file_name}: 패치 완료")
    else:
        print(f"- {file_name}: 변경 없음")


def main():
    print()
    print("FANDEX v3 quality version label 패치 시작")
    print()

    for file_name in FILES:
        patch_file(file_name)

    print()
    print("패치 완료")
    print()
    print("다음 실행 순서:")
    print("py naver_fandex_ranking_v3.py")
    print("py naver_fandex_export_v3_json.py")
    print("py naver_artist_report_v3.py")


if __name__ == "__main__":
    main()