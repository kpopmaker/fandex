from pathlib import Path


TARGET = Path(
    "lastfm_rolling_master_impact_preview_v1.py"
)

OLD = '''    preferred = [
        "rollingScore",
        "rollingScorePreview",
        "previewScore",
        "lastfmRollingScore",
        "lastfmScore",
        "finalScore",
        "score",
    ]
'''

NEW = '''    preferred = [
        "rollingCombinedPreviewPoint",
        "rolling3PreviewPoint",
        "rolling7PreviewPoint",
        "rollingScore",
        "rollingScorePreview",
        "previewScore",
        "lastfmRollingScore",
        "lastfmScore",
        "finalScore",
        "score",
    ]
'''


def main():
    if not TARGET.exists():
        raise SystemExit(
            f"Missing file: {TARGET}"
        )

    text = TARGET.read_text(
        encoding="utf-8"
    )

    if NEW in text:
        print(
            "ALREADY PATCHED"
        )
        print(
            "masterModified: FALSE"
        )
        print(
            "websiteModified: FALSE"
        )
        return

    if OLD not in text:
        raise SystemExit(
            "Target block not found. "
            "Patch stopped without changes."
        )

    backup = Path(
        "lastfm_rolling_master_impact_preview_v1_before_score_field_fix.py"
    )

    backup.write_text(
        text,
        encoding="utf-8",
    )

    patched = text.replace(
        OLD,
        NEW,
        1,
    )

    TARGET.write_text(
        patched,
        encoding="utf-8",
    )

    print(
        "PATCH OK"
    )
    print(
        f"target: {TARGET}"
    )
    print(
        f"backup: {backup}"
    )
    print(
        "preferredScoreField: "
        "rollingCombinedPreviewPoint"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()