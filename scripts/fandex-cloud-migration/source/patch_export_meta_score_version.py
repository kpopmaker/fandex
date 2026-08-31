from pathlib import Path


TARGET_FILES = [
    "naver_fandex_export_v3_json.py",
    "naver_artist_report_v3.py",
]


def patch_file(file_name):
    path = Path(file_name)

    if not path.exists():
        print(f"{file_name}: 파일 없음")
        return

    text = path.read_text(encoding="utf-8-sig")
    original = text

    text = text.replace(
        'row.get("scoreVersion", "v3_compare_search_quality")',
        '"v3_compare_search_quality"'
    )

    text = text.replace(
        'row.get("scoreVersion", "v3_compare_search")',
        '"v3_compare_search_quality"'
    )

    text = text.replace(
        'ranking_item.get("meta", {}).get("scoreVersion", "v3_compare_search_quality")',
        '"v3_compare_search_quality"'
    )

    text = text.replace(
        'ranking_item.get("meta", {}).get("scoreVersion", "v3_compare_search")',
        '"v3_compare_search_quality"'
    )

    text = text.replace(
        '"scoreVersion": row.get("scoreVersion", "v3_compare_search_quality")',
        '"scoreVersion": "v3_compare_search_quality"'
    )

    text = text.replace(
        '"scoreVersion": row.get("scoreVersion", "v3_compare_search")',
        '"scoreVersion": "v3_compare_search_quality"'
    )

    text = text.replace(
        '"scoreVersion": "v3_compare_search",',
        '"scoreVersion": "v3_compare_search_quality",'
    )

    text = text.replace(
        "'scoreVersion': 'v3_compare_search',",
        "'scoreVersion': 'v3_compare_search_quality',"
    )

    path.write_text(text, encoding="utf-8")

    if text == original:
        print(f"{file_name}: 변경 없음")
    else:
        print(f"{file_name}: 패치 완료")


def main():
    print("meta scoreVersion quality 라벨 패치 시작")

    for file_name in TARGET_FILES:
        patch_file(file_name)

    print("패치 완료")


if __name__ == "__main__":
    main()