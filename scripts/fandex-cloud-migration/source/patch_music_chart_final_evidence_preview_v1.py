from pathlib import Path


TARGET = Path(
    "music_chart_final_evidence_impact_preview_v1.py"
)

OLD = '''        new_music = (
            projected_music.get(
                artist,
                old_music,
            )
        )
'''

NEW = '''        if artist in TARGET_ARTISTS:
            new_music = (
                projected_music.get(
                    artist,
                    0.0,
                )
            )
        else:
            new_music = (
                projected_music.get(
                    artist,
                    old_music,
                )
            )
'''


def main():
    if not TARGET.exists():
        raise SystemExit(
            f"Missing file: {TARGET}"
        )

    text = TARGET.read_text(
        encoding="utf-8"
    )

    count = text.count(OLD)

    if count == 0:
        if NEW in text:
            print("ALREADY PATCHED")
            print("seedModified: FALSE")
            print("masterModified: FALSE")
            print("websiteModified: FALSE")
            return

        raise SystemExit(
            "Target block not found. "
            "No changes made."
        )

    backup = Path(
        "music_chart_final_evidence_impact_preview_v1_before_zero_fix.py"
    )

    backup.write_text(
        text,
        encoding="utf-8",
    )

    patched = text.replace(
        OLD,
        NEW,
    )

    TARGET.write_text(
        patched,
        encoding="utf-8",
    )

    print("PATCH OK")
    print(
        f"replacedBlocks: {count}"
    )
    print(
        "targetZeroPolicy: "
        "missing projected row = 0.0"
    )
    print(
        f"backup: {backup}"
    )
    print("seedModified: FALSE")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()