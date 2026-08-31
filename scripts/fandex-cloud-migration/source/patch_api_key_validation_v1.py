from pathlib import Path


TARGET_FILES = [
    Path("fandex_publish_python_only_v1.py"),
    Path("fandex_publish_all_v5.py"),
]

EXTRA_BAD_VALUES = [
    '"실제_API_KEY",',
    '"새_실제_API_KEY",',
    '"새로_발급받은_API_KEY",',
    '"YOUR_API_KEY",',
]


def patch_bad_values(text):
    marker = 'BAD_API_KEY_VALUES = {'
    if marker not in text:
        return text, False

    changed = False

    insert_after = marker
    start = text.index(marker)
    end = text.index("}", start)

    block = text[start:end]

    for value in EXTRA_BAD_VALUES:
        if value not in block:
            block += f"\n    {value}"
            changed = True

    new_text = text[:start] + block + text[end:]
    return new_text, changed


def patch_format_check(text):
    old = '''    if " " in api_key:
        raise ValueError("YOUTUBE_API_KEY 안에 공백이 들어가 있습니다.")
'''

    new = '''    if " " in api_key:
        raise ValueError("YOUTUBE_API_KEY 안에 공백이 들어가 있습니다.")

    if not api_key.startswith("AIza"):
        raise ValueError(
            "YOUTUBE_API_KEY 형식이 이상합니다. "
            "실제 YouTube API 키는 보통 AIza로 시작합니다. "
            "예시 문구를 그대로 넣지 말고 Google Cloud에서 발급받은 실제 키를 넣으세요."
        )

    if len(api_key) < 30:
        raise ValueError("YOUTUBE_API_KEY 길이가 너무 짧습니다. 실제 키를 다시 확인하세요.")
'''

    if old not in text:
        return text, False

    return text.replace(old, new), True


def main():
    patched = []

    for path in TARGET_FILES:
        if not path.exists():
            print(f"스킵: {path} 없음")
            continue

        text = path.read_text(encoding="utf-8-sig")
        original = text

        text, changed_bad = patch_bad_values(text)
        text, changed_format = patch_format_check(text)

        if text != original:
            path.write_text(text, encoding="utf-8")
            patched.append(path.name)
            print(f"패치 완료: {path}")
        else:
            print(f"변경 없음: {path}")

    print()
    print("API key validation patch 완료")
    print("패치 파일:", ", ".join(patched) if patched else "없음")


if __name__ == "__main__":
    main()