from pathlib import Path


TARGET = Path(
    "fandex_archive_generated_files_v1.py"
)

BACKUP = Path(
    "fandex_archive_generated_files_v1_"
    "before_music_v2_impact_keep.py"
)


text = TARGET.read_text(
    encoding="utf-8"
)


keep_name = (
    "music_chart_current_presence_"
    "master_impact_preview_v1_latest.csv"
)


if f'"{keep_name}"' in text:
    print("ALREADY CONFIGURED")

else:

    anchor = (
        '    "music_chart_current_presence_'
        'preview_v1_latest.csv",\n'
    )

    if anchor not in text:
        raise RuntimeError(
            "Archive Music v2 preview "
            "anchor not found."
        )

    BACKUP.write_text(
        text,
        encoding="utf-8",
    )

    text = text.replace(
        anchor,
        anchor
        + f'    "{keep_name}",\n',
        1,
    )

    TARGET.write_text(
        text,
        encoding="utf-8",
    )

    print("PATCH OK")


print(f"target: {TARGET}")
print(f"keep: {keep_name}")
print("masterModified: FALSE")
print("websiteModified: FALSE")