from pathlib import Path


TARGET = Path(
    "music_chart_check_history_v1.py"
)

BACKUP = Path(
    "music_chart_check_history_v1_before_all_targets_v1.py"
)


text = TARGET.read_text(
    encoding="utf-8"
)


# ------------------------------------------------------------
# 1. Bugs evidence를 HIGH-only -> ALL 10 targets로 변경
# ------------------------------------------------------------

old = '''BUGS_JSON = Path(
    "music_chart_bugs_high_priority_candidates_v1_latest.json"
)
'''

new = '''BUGS_JSON = Path(
    "music_chart_bugs_all_targets_v1_latest.json"
)
'''

if old not in text:
    raise RuntimeError(
        "BUGS_JSON block not found"
    )

text = text.replace(
    old,
    new,
    1,
)


# ------------------------------------------------------------
# 2. Discovery artist 목록을 깨끗한 10명으로 고정
# ------------------------------------------------------------

start_marker = "def get_discovery_artists("
end_marker = "\ndef melon_genie_rows("

start = text.find(
    start_marker
)

end = text.find(
    end_marker,
    start,
)

if start == -1 or end == -1:
    raise RuntimeError(
        "get_discovery_artists block not found"
    )


new_function = '''def get_discovery_artists(
    payload: dict[str, Any],
) -> list[str]:
    return [
        "아이유",
        "에스파",
        "에이티즈",
        "보이넥스트도어",
        "아이브",
        "르세라핌",
        "뉴진스",
        "세븐틴",
        "스트레이키즈",
        "투모로우바이투게더",
    ]

'''


text = (
    text[:start]
    + new_function
    + text[end + 1:]
)


# ------------------------------------------------------------
# 3. Bugs sourceVersion도 all-targets로 변경
# ------------------------------------------------------------

old_version = (
    '"music_chart_discover_bugs_high_priority_v1",'
)

new_version = (
    '"music_chart_discover_bugs_all_targets_v1",'
)

if old_version not in text:
    raise RuntimeError(
        "Bugs sourceVersion block not found"
    )

text = text.replace(
    old_version,
    new_version,
    1,
)


BACKUP.write_text(
    TARGET.read_text(
        encoding="utf-8"
    ),
    encoding="utf-8",
)

TARGET.write_text(
    text,
    encoding="utf-8",
)


print("PATCH OK")
print(f"target: {TARGET}")
print(f"backup: {BACKUP}")
print("Melon/Genie targets: 10")
print("Bugs targets: 10")
print("seedModified: FALSE")
print("masterModified: FALSE")
print("websiteModified: FALSE")