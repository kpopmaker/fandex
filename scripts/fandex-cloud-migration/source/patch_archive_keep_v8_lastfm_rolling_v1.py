from pathlib import Path


TARGET = Path("fandex_archive_generated_files_v1.py")
BACKUP = Path(
    "fandex_archive_generated_files_v1_before_v8_lastfm_rolling_keep.py"
)


text = TARGET.read_text(
    encoding="utf-8"
)

old = '''    "lastfm_global_interest_score_preview_v1_latest.csv",
    "lastfm_master_impact_preview_v1_latest.csv",

    "fandex_naver_ranking_v3_latest.json",
'''

new = '''    "lastfm_global_interest_score_preview_v1_latest.csv",
    "lastfm_master_impact_preview_v1_latest.csv",

    "lastfm_global_interest_rolling_v1_latest.csv",
    "lastfm_global_interest_rolling_score_preview_v1_latest.csv",
    "lastfm_rolling_master_impact_preview_v1_latest.csv",

    "fandex_master_v8_ranking_latest.json",
    "FANDEX_MASTER_V8_BUILD_REPORT.txt",

    "fandex_naver_ranking_v3_latest.json",
'''


if old not in text:
    raise RuntimeError(
        "Archive KEEP_EXACT target block not found. "
        "No file was modified."
    )


BACKUP.write_text(
    text,
    encoding="utf-8"
)

TARGET.write_text(
    text.replace(
        old,
        new,
        1
    ),
    encoding="utf-8"
)

print("PATCH OK")
print(f"target: {TARGET}")
print(f"backup: {BACKUP}")
print("protected:")
print("- fandex_master_v8_ranking_latest.json")
print("- FANDEX_MASTER_V8_BUILD_REPORT.txt")
print("- lastfm_global_interest_rolling_v1_latest.csv")
print("- lastfm_global_interest_rolling_score_preview_v1_latest.csv")
print("- lastfm_rolling_master_impact_preview_v1_latest.csv")
print("websiteModified: FALSE")