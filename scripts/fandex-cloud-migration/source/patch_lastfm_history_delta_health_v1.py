import py_compile
import sys
from pathlib import Path


VERSION = "patch_lastfm_history_delta_health_v1"

TARGET = Path(
    "fandex_python_health_check_v1.py"
)

BACKUP_COPY = Path(
    "fandex_python_health_check_v1_before_lastfm_history_delta_v1.py"
)


FUNCTION_ANCHOR = (
    "def check_musicbrainz(lines):"
)

CALL_ANCHOR = (
    "    results.append(check_lastfm(lines))"
)

NEW_CALL = (
    "    results.append("
    "check_lastfm_history_delta(lines))"
)


NEW_FUNCTION = r'''
def check_lastfm_history_delta(lines):
    import csv
    from pathlib import Path

    history_path = Path(
        "lastfm_artist_interest_history_v1.csv"
    )

    delta_path = Path(
        "lastfm_global_interest_delta_v1_latest.csv"
    )

    backup_script = Path(
        "fandex_backup_core_files_v1.py"
    )

    lines.append("")
    lines.append(
        "Last.fm Global Interest history/delta"
    )
    lines.append("-" * 72)

    overall_ok = True

    # ------------------------------------------------------------
    # 1. History CSV
    # ------------------------------------------------------------

    if not history_path.exists():
        lines.append(
            "FAIL: Last.fm history CSV 없음"
        )

        lines.append(
            f"  file: {history_path}"
        )

        overall_ok = False

        history_rows = []
        artist_count = 0
        snapshot_dates = []

    else:
        try:
            with history_path.open(
                "r",
                encoding="utf-8-sig",
                newline="",
            ) as f:
                history_rows = list(
                    csv.DictReader(f)
                )

        except Exception as exc:
            lines.append(
                "FAIL: Last.fm history CSV "
                f"읽기 실패: {exc}"
            )

            overall_ok = False
            history_rows = []

        artists = {
            str(
                row.get("artist")
                or ""
            ).strip()
            for row in history_rows
            if str(
                row.get("artist")
                or ""
            ).strip()
        }

        snapshot_dates = sorted({
            str(
                row.get("snapshotDate")
                or ""
            ).strip()
            for row in history_rows
            if str(
                row.get("snapshotDate")
                or ""
            ).strip()
        })

        artist_count = len(artists)
        snapshot_date_count = len(
            snapshot_dates
        )

        if artist_count == 10:
            lines.append(
                "OK: Last.fm history "
                "artistCount=10"
            )
        else:
            lines.append(
                "FAIL: Last.fm history "
                f"artistCount={artist_count} "
                "(expected 10)"
            )

            overall_ok = False

        if snapshot_date_count >= 1:
            lines.append(
                "OK: Last.fm history "
                "snapshotDateCount="
                f"{snapshot_date_count}"
            )

            lines.append(
                "  dates: "
                + ", ".join(snapshot_dates)
            )

        else:
            lines.append(
                "FAIL: Last.fm history "
                "snapshotDateCount=0"
            )

            overall_ok = False

    # ------------------------------------------------------------
    # 2. Delta CSV
    # ------------------------------------------------------------

    if not delta_path.exists():
        lines.append(
            "FAIL: Last.fm delta CSV 없음"
        )

        lines.append(
            f"  file: {delta_path}"
        )

        overall_ok = False

    else:
        try:
            with delta_path.open(
                "r",
                encoding="utf-8-sig",
                newline="",
            ) as f:
                delta_rows = list(
                    csv.DictReader(f)
                )

        except Exception as exc:
            lines.append(
                "FAIL: Last.fm delta CSV "
                f"읽기 실패: {exc}"
            )

            delta_rows = []
            overall_ok = False

        status_counts = {}

        for row in delta_rows:
            status = str(
                row.get("status")
                or ""
            ).strip()

            status_counts[status] = (
                status_counts.get(
                    status,
                    0,
                )
                + 1
            )

        delta_ready_count = (
            status_counts.get(
                "delta_ready",
                0,
            )
        )

        insufficient_count = (
            status_counts.get(
                "insufficient_history",
                0,
            )
        )

        needs_review_count = (
            status_counts.get(
                "needs_review",
                0,
            )
        )

        snapshot_date_count = len(
            snapshot_dates
        )

        if len(delta_rows) == 10:
            lines.append(
                "OK: Last.fm delta "
                "rowCount=10"
            )

        else:
            lines.append(
                "FAIL: Last.fm delta "
                f"rowCount={len(delta_rows)} "
                "(expected 10)"
            )

            overall_ok = False

        if needs_review_count == 0:
            lines.append(
                "OK: Last.fm delta "
                "needsReviewCount=0"
            )

        else:
            lines.append(
                "FAIL: Last.fm delta "
                "needsReviewCount="
                f"{needs_review_count}"
            )

            overall_ok = False

        if snapshot_date_count == 1:
            if (
                insufficient_count == 10
                and delta_ready_count == 0
            ):
                lines.append(
                    "OK: Last.fm delta "
                    "WAITING "
                    "(snapshot 1일치, "
                    "insufficient_history=10)"
                )

            else:
                lines.append(
                    "FAIL: snapshot 1일치인데 "
                    "delta 상태가 예상과 다름"
                )

                lines.append(
                    "  deltaReadyCount="
                    f"{delta_ready_count}"
                )

                lines.append(
                    "  insufficientHistoryCount="
                    f"{insufficient_count}"
                )

                overall_ok = False

        elif snapshot_date_count >= 2:
            if (
                delta_ready_count == 10
                and insufficient_count == 0
            ):
                lines.append(
                    "OK: Last.fm delta "
                    "10명 delta_ready"
                )

            else:
                lines.append(
                    "FAIL: snapshot 2일 이상인데 "
                    "deltaReadyCount가 10이 아님"
                )

                lines.append(
                    "  deltaReadyCount="
                    f"{delta_ready_count}"
                )

                lines.append(
                    "  insufficientHistoryCount="
                    f"{insufficient_count}"
                )

                overall_ok = False

    # ------------------------------------------------------------
    # 3. Backup protection
    # ------------------------------------------------------------

    backup_entry = (
        '"lastfm_artist_interest_history_v1.csv"'
    )

    if not backup_script.exists():
        lines.append(
            "FAIL: backup script 없음"
        )

        overall_ok = False

    else:
        try:
            backup_text = (
                backup_script.read_text(
                    encoding="utf-8-sig",
                    errors="replace",
                )
            )

        except Exception as exc:
            lines.append(
                "FAIL: backup script "
                f"읽기 실패: {exc}"
            )

            overall_ok = False

        else:
            if backup_entry in backup_text:
                lines.append(
                    "OK: Last.fm history CSV "
                    "backup protection"
                )

            else:
                lines.append(
                    "FAIL: Last.fm history CSV가 "
                    "backup 대상에 없음"
                )

                overall_ok = False

    # ------------------------------------------------------------
    # Final
    # ------------------------------------------------------------

    if overall_ok:
        lines.append(
            "OK: Last.fm history/delta "
            "운영 상태 정상"
        )

    else:
        lines.append(
            "WARN: Last.fm history/delta "
            "확인 필요"
        )

    return overall_ok


'''


def main():
    apply_mode = (
        "--apply" in sys.argv
    )

    print()
    print(
        "FANDEX patch Last.fm "
        "history/delta health v1"
    )
    print("=" * 80)
    print(f"version: {VERSION}")
    print(
        "mode: "
        + (
            "APPLY"
            if apply_mode
            else "PREVIEW"
        )
    )
    print(f"target: {TARGET}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 80)

    if not TARGET.exists():
        raise SystemExit(
            f"ERROR: 대상 파일 없음: {TARGET}"
        )

    original = TARGET.read_text(
        encoding="utf-8-sig"
    )

    function_exists = (
        "def check_lastfm_history_delta(lines):"
        in original
    )

    call_exists = (
        NEW_CALL in original
    )

    if function_exists and call_exists:
        print()
        print(
            "ALREADY PATCHED: "
            "function/call 모두 존재"
        )

        return

    patched = original

    if not function_exists:
        if FUNCTION_ANCHOR not in patched:
            raise SystemExit(
                "ERROR: check_musicbrainz anchor "
                "찾지 못함"
            )

        patched = patched.replace(
            FUNCTION_ANCHOR,
            NEW_FUNCTION
            + FUNCTION_ANCHOR,
            1,
        )

    if not call_exists:
        if CALL_ANCHOR not in patched:
            raise SystemExit(
                "ERROR: check_lastfm call anchor "
                "찾지 못함"
            )

        patched = patched.replace(
            CALL_ANCHOR,
            CALL_ANCHOR
            + "\n\n"
            + NEW_CALL,
            1,
        )

    if (
        patched.count(
            "def check_lastfm_history_delta(lines):"
        )
        != 1
    ):
        raise SystemExit(
            "ERROR: function 삽입 검증 실패"
        )

    if patched.count(NEW_CALL) != 1:
        raise SystemExit(
            "ERROR: call 삽입 검증 실패"
        )

    print()
    print(
        "function insert: READY"
    )
    print(
        "main call insert: READY"
    )

    if not apply_mode:
        print()
        print(
            "PREVIEW ONLY - "
            "아직 수정하지 않았습니다."
        )

        print()
        print("적용 명령:")
        print(
            "py patch_lastfm_history_delta_health_v1.py "
            "--apply"
        )

        return

    BACKUP_COPY.write_text(
        original,
        encoding="utf-8",
    )

    TARGET.write_text(
        patched,
        encoding="utf-8",
    )

    try:
        py_compile.compile(
            str(TARGET),
            doraise=True,
        )

    except Exception as exc:
        TARGET.write_text(
            original,
            encoding="utf-8",
        )

        raise SystemExit(
            "ERROR: syntax compile 실패. "
            "원본 자동 복구 완료.\n"
            f"{exc}"
        )

    verify = TARGET.read_text(
        encoding="utf-8-sig"
    )

    if (
        "def check_lastfm_history_delta(lines):"
        not in verify
        or NEW_CALL not in verify
    ):
        TARGET.write_text(
            original,
            encoding="utf-8",
        )

        raise SystemExit(
            "ERROR: 적용 검증 실패. "
            "원본 자동 복구 완료."
        )

    print()
    print("APPLY 완료")
    print(
        f"originalCopy: {BACKUP_COPY}"
    )
    print(
        "syntaxCompile: OK"
    )
    print(
        "healthFunctionInstalled: TRUE"
    )
    print(
        "healthCallInstalled: TRUE"
    )
    print(
        "masterModified: FALSE"
    )
    print(
        "websiteModified: FALSE"
    )


if __name__ == "__main__":
    main()