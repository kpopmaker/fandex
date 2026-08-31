from pathlib import Path


TARGET = Path(
    "music_chart_discover_artist_candidates_v2.py"
)

BACKUP = Path(
    "music_chart_discover_artist_candidates_v2_before_bnd_alias_v1.py"
)

text = TARGET.read_text(
    encoding="utf-8"
)

old = '''    "보이넥스트도어": [
        "보이넥스트도어",
        "BND",
    ],
'''

new = '''    "보이넥스트도어": [
        "보이넥스트도어",
        "BOYNEXTDOOR",
        "BOY NEXT DOOR",
        "BND",
    ],
'''

if old not in text:
    raise RuntimeError(
        "BND alias block not found. "
        "No file was modified."
    )

BACKUP.write_text(
    text,
    encoding="utf-8",
)

TARGET.write_text(
    text.replace(
        old,
        new,
        1,
    ),
    encoding="utf-8",
)

print("PATCH OK")
print(f"target: {TARGET}")
print(f"backup: {BACKUP}")
print("BND aliases expanded")
print("seedModified: FALSE")
print("masterModified: FALSE")
print("websiteModified: FALSE")