from pathlib import Path


TARGET = Path(
    "music_chart_discover_artist_candidates_v2.py"
)

BACKUP = Path(
    "music_chart_discover_artist_candidates_v2_before_targets_10.py"
)


text = TARGET.read_text(
    encoding="utf-8"
)

start_marker = "TARGET_ARTISTS = {"
end_marker = "\n\nSOURCES = ["


start = text.find(
    start_marker
)

end = text.find(
    end_marker,
    start,
)


if start == -1 or end == -1:
    raise RuntimeError(
        "TARGET_ARTISTS block not found. "
        "No file was modified."
    )


new_block = '''TARGET_ARTISTS = {
    "아이유": [
        "아이유",
        "IU",
    ],
    "에스파": [
        "에스파",
        "aespa",
    ],
    "에이티즈": [
        "에이티즈",
        "ATEEZ",
    ],
    "보이넥스트도어": [
        "보이넥스트도어",
        "BND",
    ],
    "아이브": [
        "아이브",
        "IVE",
    ],
    "르세라핌": [
        "르세라핌",
        "LE SSERAFIM",
        "LESSERAFIM",
    ],
    "뉴진스": [
        "뉴진스",
        "NewJeans",
    ],
    "세븐틴": [
        "세븐틴",
        "SEVENTEEN",
    ],
    "스트레이키즈": [
        "스트레이키즈",
        "스트레이 키즈",
        "Stray Kids",
        "SKZ",
    ],
    "투모로우바이투게더": [
        "투모로우바이투게더",
        "TOMORROW X TOGETHER",
        "TXT",
    ],
}'''


BACKUP.write_text(
    text,
    encoding="utf-8",
)

patched = (
    text[:start]
    + new_block
    + text[end:]
)

TARGET.write_text(
    patched,
    encoding="utf-8",
)


print("PATCH OK")
print(f"target: {TARGET}")
print(f"backup: {BACKUP}")
print("TARGET_ARTISTS: 6 -> 10")
print("seedModified: FALSE")
print("masterModified: FALSE")
print("websiteModified: FALSE")