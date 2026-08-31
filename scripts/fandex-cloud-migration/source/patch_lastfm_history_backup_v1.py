import sys
from pathlib import Path


VERSION = "patch_lastfm_history_backup_v1"

TARGET = Path(
    "fandex_backup_core_files_v1.py"
)

BACKUP_COPY = Path(
    "fandex_backup_core_files_v1_before_lastfm_history_v1.py"
)

NEW_ENTRY = (
    '    "lastfm_artist_interest_history_v1.csv",'
)

ANCHOR = (
    '    "youtube_video_metrics_v1.csv",'
)


def main():
    apply_mode = "--apply" in sys.argv

    print()
    print("FANDEX patch Last.fm history backup v1")
    print("=" * 72)
    print(f"version: {VERSION}")
    print(
        "mode: "
        + ("APPLY" if apply_mode else "PREVIEW")
    )
    print(f"target: {TARGET}")
    print("=" * 72)

    if not TARGET.exists():
        raise SystemExit(
            f"ERROR: 대상 파일 없음: {TARGET}"
        )

    text = TARGET.read_text(
        encoding="utf-8-sig"
    )

    if NEW_ENTRY in text:
        print()
        print(
            "ALREADY PATCHED: "
            "Last.fm history CSV가 이미 "
            "백업 대상입니다."
        )
        print("masterModified: FALSE")
        print("websiteModified: FALSE")
        return

    if ANCHOR not in text:
        raise SystemExit(
            "ERROR: 예상 anchor를 찾지 못했습니다. "
            "자동 수정 중단."
        )

    patched = text.replace(
        ANCHOR,
        ANCHOR + "\n"
        + NEW_ENTRY,
        1,
    )

    if patched.count(NEW_ENTRY) != 1:
        raise SystemExit(
            "ERROR: 패치 결과 검증 실패"
        )

    print()
    print("추가 예정:")
    print(NEW_ENTRY)

    if not apply_mode:
        print()
        print(
            "PREVIEW ONLY - 아직 수정하지 않았습니다."
        )
        print()
        print("적용 명령:")
        print(
            "py patch_lastfm_history_backup_v1.py "
            "--apply"
        )
        print(
            "masterModified: FALSE"
        )
        print(
            "websiteModified: FALSE"
        )
        return

    BACKUP_COPY.write_text(
        text,
        encoding="utf-8",
    )

    TARGET.write_text(
        patched,
        encoding="utf-8",
    )

    verify = TARGET.read_text(
        encoding="utf-8-sig"
    )

    if NEW_ENTRY not in verify:
        raise SystemExit(
            "ERROR: 적용 후 검증 실패"
        )

    print()
    print("APPLY 완료")
    print(
        f"originalCopy: {BACKUP_COPY}"
    )
    print(
        "lastfmHistoryBackupIncluded: TRUE"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()