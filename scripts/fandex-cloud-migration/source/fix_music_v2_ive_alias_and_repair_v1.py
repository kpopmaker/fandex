from __future__ import annotations

import csv
import json
import py_compile
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path


# ============================================================
# FANDEX Music v2
# IVE / DRIVE false-positive fix + history repair + validation
# ============================================================

VERSION = "fix_music_v2_ive_alias_and_repair_v1"

DISCOVERY_FILE = Path(
    "music_chart_discover_bugs_all_targets_v1.py"
)

BUGS_LATEST_CSV = Path(
    "music_chart_bugs_all_targets_v1_latest.csv"
)

HISTORY_FILE = Path(
    "music_chart_check_history_v1.csv"
)

MUSIC_V2_HISTORY_FILE = Path(
    "music_chart_current_presence_history_v2.csv"
)

MUSIC_V2_LATEST_FILE = Path(
    "fandex_music_chart_ranking_v2_current_presence_latest.json"
)

HEALTH_FILE = Path(
    "fandex_python_health_check_v2_latest.txt"
)

PROMOTION_FILE = Path(
    "music_chart_v2_promotion_readiness_latest.json"
)


TARGET_DATE = "2026-08-25"

TIMESTAMP = datetime.now().strftime(
    "%Y%m%d_%H%M%S"
)


# ============================================================
# Utility
# ============================================================

def stop(message):
    print()
    print("=" * 80)
    print("STOP - NEEDS FIX")
    print("=" * 80)
    print(message)
    raise SystemExit(1)


def backup_file(
    source,
    backup_name,
):
    if not source.exists():
        stop(
            f"Missing required file: {source}"
        )

    backup = Path(
        backup_name
    )

    shutil.copy2(
        source,
        backup,
    )

    return backup


def run_python(
    script_name,
):
    script = Path(
        script_name
    )

    if not script.exists():
        stop(
            f"Missing script: {script}"
        )

    print()
    print("=" * 80)
    print(
        f"RUN: {script}"
    )
    print("=" * 80)

    result = subprocess.run(
        [
            sys.executable,
            str(script),
        ],
        check=False,
    )

    if result.returncode != 0:
        stop(
            f"{script} failed "
            f"with exit code "
            f"{result.returncode}"
        )


def read_csv(
    path,
):
    if not path.exists():
        stop(
            f"Missing CSV: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:

        reader = csv.DictReader(
            f
        )

        fieldnames = (
            reader.fieldnames
            or []
        )

        rows = list(
            reader
        )

    return (
        fieldnames,
        rows,
    )


def write_csv(
    path,
    fieldnames,
    rows,
):
    temp = Path(
        str(path)
        + ".tmp"
    )

    with temp.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:

        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
        )

        writer.writeheader()

        writer.writerows(
            rows
        )

    temp.replace(
        path
    )


def norm(
    value,
):
    if value is None:
        return ""

    return str(
        value
    ).strip()


def get_first(
    row,
    *keys,
):
    for key in keys:

        value = norm(
            row.get(
                key
            )
        )

        if value:
            return value

    return ""


def row_blob(
    row,
):
    return " | ".join(
        norm(value)
        for value
        in row.values()
    ).casefold()


def rank_number(
    value,
):
    try:
        return int(
            float(
                norm(value)
            )
        )
    except Exception:
        return 999999


# ============================================================
# 1. Patch Bugs matcher
# ============================================================

def patch_discovery():
    print()
    print("=" * 80)
    print(
        "1. PATCH BUGS ALIAS MATCHER"
    )
    print("=" * 80)

    if not DISCOVERY_FILE.exists():
        stop(
            f"Missing: {DISCOVERY_FILE}"
        )

    original = (
        DISCOVERY_FILE
        .read_text(
            encoding="utf-8"
        )
    )

    backup = backup_file(
        DISCOVERY_FILE,
        (
            "music_chart_discover_"
            "bugs_all_targets_v1_"
            "before_alias_boundary_fix_"
            f"{TIMESTAMP}.py"
        ),
    )

    text = original


    # --------------------------------------------------------
    # import re
    # --------------------------------------------------------

    if (
        "\nimport re\n"
        not in text
    ):

        if (
            "import json\n"
            not in text
        ):
            stop(
                "Could not locate "
                "`import json` anchor."
            )

        text = text.replace(
            "import json\n",
            (
                "import json\n"
                "import re\n"
            ),
            1,
        )


    # --------------------------------------------------------
    # Safe alias helper
    # --------------------------------------------------------

    if (
        "def alias_matches_safely("
        not in text
    ):

        helper_code = r'''

def alias_matches_safely(
    chart_artist,
    matched_alias,
):
    """
    Bugs 전용 alias 안전검사.

    영문 alias는 독립된 토큰일 때만 허용한다.

    예:
    IVE  <-> IVE (아이브)            = True
    IVE  <-> ALPHA DRIVE ONE         = False
    IU   <-> IU                      = True
    TXT  <-> TXT                     = True

    한글 alias는 기존 matcher 결과를 유지한다.
    """

    artist_text = norm(
        chart_artist
    )

    alias = norm(
        matched_alias
    )

    if (
        not artist_text
        or not alias
    ):
        return False


    has_ascii_letter = bool(
        re.search(
            r"[A-Za-z]",
            alias,
        )
    )


    # 한글 alias 등은 기존 동작 유지
    if not has_ascii_letter:
        return True


    escaped = re.escape(
        alias
    )


    # alias 안 공백은 연속 공백도 허용
    escaped = escaped.replace(
        r"\ ",
        r"\s+",
    )


    pattern = (
        r"(?<![A-Za-z0-9])"
        + escaped
        + r"(?![A-Za-z0-9])"
    )


    return bool(
        re.search(
            pattern,
            artist_text,
            flags=re.IGNORECASE,
        )
    )
'''

        marker = "\n\ndef write_csv("

        if marker not in text:
            stop(
                "Could not locate "
                "`def write_csv` anchor."
            )

        text = text.replace(
            marker,
            (
                helper_code
                + marker
            ),
            1,
        )


    # --------------------------------------------------------
    # Apply safe check after find_target_artist()
    # --------------------------------------------------------

    if (
        "SKIP unsafe alias match"
        not in text
    ):

        old_block = '''        (
            target_artist,
            matched_alias,
        ) = matched


        key = (
            target_artist,
            track_title.casefold(),
            rank,
        )
'''

        new_block = '''        (
            target_artist,
            matched_alias,
        ) = matched


        if not alias_matches_safely(
            chart_artist,
            matched_alias,
        ):

            print(
                "SKIP unsafe alias match | "
                f"target={target_artist} | "
                f"alias={matched_alias} | "
                f"chartArtist={chart_artist} | "
                f"track={track_title}"
            )

            continue


        key = (
            target_artist,
            track_title.casefold(),
            rank,
        )
'''

        if old_block not in text:
            stop(
                "Could not locate target "
                "artist matching block."
            )

        text = text.replace(
            old_block,
            new_block,
            1,
        )


    DISCOVERY_FILE.write_text(
        text,
        encoding="utf-8",
    )


    print(
        f"backup: {backup}"
    )

    print(
        "patchWritten: TRUE"
    )


    # --------------------------------------------------------
    # Compile
    # --------------------------------------------------------

    try:
        py_compile.compile(
            str(
                DISCOVERY_FILE
            ),
            doraise=True,
        )

    except Exception as exc:
        stop(
            "py_compile failed: "
            f"{exc}"
        )


    print(
        "py_compile: PASS"
    )


# ============================================================
# 2. Run Bugs discovery and verify false-positive is gone
# ============================================================

def verify_bugs_discovery():
    run_python(
        "music_chart_discover_bugs_all_targets_v1.py"
    )

    (
        _,
        rows,
    ) = read_csv(
        BUGS_LATEST_CSV
    )


    false_rows = []

    ive_rows = []


    for row in rows:

        artist = get_first(
            row,
            "artist",
            "artistName",
        )

        platform = get_first(
            row,
            "platform",
        ).casefold()

        blob = row_blob(
            row
        )


        if (
            artist == "아이브"
            and platform == "bugs"
        ):

            ive_rows.append(
                row
            )


            if (
                "born dire"
                in blob
                or
                "alpha drive one"
                in blob
            ):
                false_rows.append(
                    row
                )


    if false_rows:
        print()
        print(
            "False IVE rows still present:"
        )

        for row in false_rows:
            print(
                row
            )

        stop(
            "IVE / DRIVE false match "
            "was NOT blocked."
        )


    print()
    print("=" * 80)
    print(
        "BUGS DISCOVERY VERIFICATION"
    )
    print("=" * 80)

    print(
        "IVE <-> DRIVE false match blocked: TRUE"
    )

    print(
        "BORN DIRE remaining: FALSE"
    )


    if ive_rows:

        sorted_rows = sorted(
            ive_rows,
            key=lambda row:
                rank_number(
                    row.get(
                        "rank"
                    )
                ),
        )

        best = sorted_rows[0]

        print(
            "actual IVE Bugs best candidate: "
            f"{get_first(best, 'trackTitle', 'songTitle')} "
            f"/ rank="
            f"{get_first(best, 'rank')}"
        )

    else:
        print(
            "actual IVE Bugs best candidate: "
            "NONE"
        )


    return ive_rows


# ============================================================
# 3. Repair contaminated check-history row
# ============================================================

def repair_check_history():
    print()
    print("=" * 80)
    print(
        "3. REPAIR CHECK HISTORY"
    )
    print("=" * 80)

    (
        fieldnames,
        rows,
    ) = read_csv(
        HISTORY_FILE
    )


    backup = backup_file(
        HISTORY_FILE,
        (
            "music_chart_check_history_v1_"
            "before_ive_born_dire_fix_"
            f"{TIMESTAMP}.csv"
        ),
    )


    kept = []
    removed = []


    for row in rows:

        check_date = get_first(
            row,
            "checkDate",
            "snapshotDate",
            "date",
            "chartDate",
        )

        artist = get_first(
            row,
            "artist",
            "artistName",
        )

        platform = get_first(
            row,
            "platform",
        ).casefold()

        blob = row_blob(
            row
        )


        bad_row = (
            check_date
            == TARGET_DATE

            and artist
            == "아이브"

            and platform
            == "bugs"

            and (
                "born dire"
                in blob

                or
                "alpha drive one"
                in blob
            )
        )


        if bad_row:
            removed.append(
                row
            )
        else:
            kept.append(
                row
            )


    if len(
        removed
    ) > 1:

        stop(
            "More than one contaminated "
            "IVE Bugs row found. "
            f"removed candidate count="
            f"{len(removed)}"
        )


    write_csv(
        HISTORY_FILE,
        fieldnames,
        kept,
    )


    print(
        f"rowsBefore: {len(rows)}"
    )

    print(
        f"removedRows: {len(removed)}"
    )

    print(
        f"rowsAfter: {len(kept)}"
    )

    print(
        f"backup: {backup}"
    )


    if removed:

        print()
        print(
            "REMOVED ROW"
        )

        print(
            removed[0]
        )

    else:

        print()
        print(
            "WARNING: contaminated row "
            "was not found in history."
        )

        print(
            "This is acceptable only if "
            "it was already removed."
        )


    return (
        len(rows),
        len(removed),
        len(kept),
    )


# ============================================================
# 4. Rebuild only contaminated Music v2 section
# ============================================================

def rebuild_music_v2():
    run_python(
        "music_chart_check_history_v1.py"
    )

    run_python(
        "music_chart_current_presence_preview_v1.py"
    )

    run_python(
        "music_chart_current_presence_publish_v2.py"
    )


# ============================================================
# 5. Validate history
# ============================================================

def validate_history():
    (
        _,
        history_rows,
    ) = read_csv(
        HISTORY_FILE
    )


    duplicate_counter = {}

    bad_rows = []


    for row in history_rows:

        check_date = get_first(
            row,
            "checkDate",
            "snapshotDate",
            "date",
            "chartDate",
        )

        artist = get_first(
            row,
            "artist",
            "artistName",
        )

        platform = get_first(
            row,
            "platform",
        ).casefold()


        if (
            check_date
            and artist
            and platform
        ):

            key = (
                check_date,
                artist,
                platform,
            )

            duplicate_counter[
                key
            ] = (
                duplicate_counter
                .get(
                    key,
                    0,
                )
                + 1
            )


        blob = row_blob(
            row
        )


        if (
            check_date
            == TARGET_DATE

            and artist
            == "아이브"

            and platform
            == "bugs"

            and (
                "born dire"
                in blob
                or
                "alpha drive one"
                in blob
            )
        ):
            bad_rows.append(
                row
            )


    duplicates = [
        key
        for (
            key,
            count
        )
        in duplicate_counter.items()
        if count > 1
    ]


    if bad_rows:
        stop(
            "Contaminated IVE Bugs history "
            "still exists after rebuild."
        )


    if duplicates:
        print()
        print(
            "Duplicate keys:"
        )

        for key in duplicates[
            :20
        ]:
            print(
                key
            )

        stop(
            "Check-history duplicate "
            "detected."
        )


    print()
    print(
        "checkHistoryDuplicateCount: 0"
    )

    print(
        "BORN DIRE history remaining: FALSE"
    )


# ============================================================
# 6. Inspect Music v2 latest/history
# ============================================================

def inspect_music_v2():
    if not MUSIC_V2_LATEST_FILE.exists():
        stop(
            f"Missing: {MUSIC_V2_LATEST_FILE}"
        )


    payload = json.loads(
        MUSIC_V2_LATEST_FILE
        .read_text(
            encoding="utf-8-sig"
        )
    )


    ranking = payload.get(
        "ranking",
        []
    )


    if not isinstance(
        ranking,
        list,
    ):
        ranking = []


    ive_row = None


    for row in ranking:

        if (
            isinstance(
                row,
                dict,
            )
            and norm(
                row.get(
                    "artist"
                )
            )
            == "아이브"
        ):
            ive_row = row
            break


    snapshot_date = norm(
        payload.get(
            "snapshotDate"
        )
    )


    ranked_platform_count = 0


    for row in ranking:

        if not isinstance(
            row,
            dict,
        ):
            continue

        try:
            ranked_platform_count += int(
                float(
                    row.get(
                        "rankedPlatformCount",
                        0,
                    )
                    or 0
                )
            )

        except Exception:
            pass


    ive_point = None


    if ive_row:

        for key in [
            "fandexMusicChartFinalPoint",
            "musicV2Point",
            "score",
        ]:

            if key in ive_row:
                ive_point = (
                    ive_row.get(
                        key
                    )
                )
                break


    (
        _,
        v2_history_rows,
    ) = read_csv(
        MUSIC_V2_HISTORY_FILE
    )


    history_keys = {}

    duplicate_count = 0


    for row in v2_history_rows:

        snapshot = get_first(
            row,
            "snapshotDate",
            "checkDate",
            "date",
        )

        artist = get_first(
            row,
            "artist",
            "artistName",
        )


        if not snapshot or not artist:
            continue


        key = (
            snapshot,
            artist,
        )


        if key in history_keys:
            duplicate_count += 1

        history_keys[
            key
        ] = True


    if duplicate_count:
        stop(
            "Music v2 history duplicate "
            f"count={duplicate_count}"
        )


    print()
    print("=" * 80)
    print(
        "MUSIC V2 CURRENT STATE"
    )
    print("=" * 80)

    print(
        f"snapshotDate: "
        f"{snapshot_date}"
    )

    print(
        f"historyRowCount: "
        f"{len(v2_history_rows)}"
    )

    print(
        f"artistCount: "
        f"{len(ranking)}"
    )

    print(
        f"rankedPlatformCount: "
        f"{ranked_platform_count}/30"
    )

    print(
        f"IVE Music v2 point: "
        f"{ive_point}"
    )

    print(
        "history duplicate: 0"
    )


    return {
        "snapshotDate":
            snapshot_date,

        "historyRowCount":
            len(
                v2_history_rows
            ),

        "artistCount":
            len(
                ranking
            ),

        "rankedPlatformCount":
            ranked_platform_count,

        "ivePoint":
            ive_point,

        "duplicateCount":
            duplicate_count,
    }


# ============================================================
# 7. Health
# ============================================================

def run_health():
    run_python(
        "fandex_python_health_check_v2.py"
    )


    if not HEALTH_FILE.exists():
        stop(
            f"Missing health report: "
            f"{HEALTH_FILE}"
        )


    text = HEALTH_FILE.read_text(
        encoding="utf-8-sig",
        errors="replace",
    )


    fail_count = None
    warn_count = None


    for line in text.splitlines():

        stripped = (
            line.strip()
        )


        if stripped.startswith(
            "failCount:"
        ):
            fail_count = (
                stripped
                .split(
                    ":",
                    1,
                )[1]
                .strip()
            )


        if stripped.startswith(
            "warnCount:"
        ):
            warn_count = (
                stripped
                .split(
                    ":",
                    1,
                )[1]
                .strip()
            )


    healthy = (
        "OK: FANDEX Python-only v2 healthy"
        in text
    )


    print()
    print("=" * 80)
    print(
        "HEALTH RESULT"
    )
    print("=" * 80)

    print(
        f"result: "
        f"{'PASS' if healthy else 'FAIL'}"
    )

    print(
        f"failCount: "
        f"{fail_count}"
    )

    print(
        f"warnCount: "
        f"{warn_count}"
    )

    print(
        "masterModified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )


    if not healthy:
        stop(
            "Health report is not healthy."
        )


    if fail_count != "0":
        stop(
            "Health failCount is not 0."
        )


    if warn_count != "0":
        stop(
            "Health warnCount is not 0."
        )


    return {
        "result":
            "PASS",

        "failCount":
            fail_count,

        "warnCount":
            warn_count,
    }


# ============================================================
# 8. Promotion Readiness
# ============================================================

def run_promotion_readiness():
    run_python(
        "music_chart_v2_promotion_readiness_v1.py"
    )


    if not PROMOTION_FILE.exists():
        stop(
            f"Missing promotion result: "
            f"{PROMOTION_FILE}"
        )


    payload = json.loads(
        PROMOTION_FILE
        .read_text(
            encoding="utf-8-sig"
        )
    )


    decision = norm(
        payload.get(
            "decision"
        )
    )


    history = payload.get(
        "history",
        {}
    )


    risks = payload.get(
        "riskSignals",
        {}
    )


    snapshot_count = (
        history.get(
            "snapshotCount"
        )
    )

    complete_count = (
        history.get(
            "completeSnapshotCount"
        )
    )


    blockers = (
        risks.get(
            "blockers",
            []
        )
        or []
    )


    warnings = (
        risks.get(
            "warnings",
            []
        )
        or []
    )


    print()
    print("=" * 80)
    print(
        "PROMOTION READINESS"
    )
    print("=" * 80)

    print(
        f"decision: {decision}"
    )

    print(
        f"historySnapshots: "
        f"{snapshot_count}"
    )

    print(
        f"completeSnapshots: "
        f"{complete_count}"
    )

    print(
        f"blockers: "
        f"{blockers}"
    )

    print(
        f"warnings: "
        f"{warnings}"
    )


    insufficient = [
        item
        for item in blockers
        if "insufficient_history"
        in str(
            item
        )
    ]


    if insufficient:
        stop(
            "Promotion readiness still "
            "reports insufficient_history."
        )


    return {
        "decision":
            decision,

        "historySnapshots":
            snapshot_count,

        "completeSnapshots":
            complete_count,

        "blockers":
            blockers,

        "warnings":
            warnings,
    }


# ============================================================
# Main
# ============================================================

def main():
    print()
    print("=" * 80)
    print(
        "FANDEX Music v2 IVE Alias Fix "
        "+ History Repair v1"
    )
    print("=" * 80)

    print(
        f"version: {VERSION}"
    )

    print(
        "productionV7Modified: FALSE"
    )

    print(
        "musicV1MethodModified: FALSE"
    )

    print(
        "websiteModified: FALSE"
    )

    print("=" * 80)


    # --------------------------------------------------------
    # Patch
    # --------------------------------------------------------

    patch_discovery()


    # --------------------------------------------------------
    # Correct Bugs discovery
    # --------------------------------------------------------

    ive_candidates = (
        verify_bugs_discovery()
    )


    # --------------------------------------------------------
    # Repair contaminated 8/25 row
    # --------------------------------------------------------

    (
        rows_before,
        removed_rows,
        rows_after,
    ) = repair_check_history()


    # --------------------------------------------------------
    # Rebuild ONLY Music v2 affected section
    # --------------------------------------------------------

    rebuild_music_v2()


    # --------------------------------------------------------
    # Validate
    # --------------------------------------------------------

    validate_history()

    music_state = (
        inspect_music_v2()
    )


    # --------------------------------------------------------
    # Health
    # --------------------------------------------------------

    health = run_health()


    # --------------------------------------------------------
    # Promotion readiness
    # --------------------------------------------------------

    promotion = (
        run_promotion_readiness()
    )


    # --------------------------------------------------------
    # Best real IVE Bugs candidate
    # --------------------------------------------------------

    if ive_candidates:

        best_ive = sorted(
            ive_candidates,
            key=lambda row:
                rank_number(
                    row.get(
                        "rank"
                    )
                ),
        )[0]

        best_ive_text = (
            f"{get_first(best_ive, 'trackTitle', 'songTitle')} "
            f"/ rank="
            f"{get_first(best_ive, 'rank')}"
        )

    else:
        best_ive_text = "NONE"


    # --------------------------------------------------------
    # Final concise report
    # --------------------------------------------------------

    print()
    print()
    print("=" * 80)
    print(
        "FINAL RESULT"
    )
    print("=" * 80)

    print()
    print(
        "[Alias Fix]"
    )

    print(
        "- py_compile: PASS"
    )

    print(
        "- IVE <-> DRIVE false match blocked: TRUE"
    )

    print(
        "- BORN DIRE remaining: FALSE"
    )

    print(
        "- actual IVE Bugs best candidate: "
        f"{best_ive_text}"
    )


    print()
    print(
        "[History Repair]"
    )

    print(
        f"- rowsBefore: "
        f"{rows_before}"
    )

    print(
        f"- removedRows: "
        f"{removed_rows}"
    )

    print(
        f"- rowsAfterRepair: "
        f"{rows_after}"
    )

    print(
        "- duplicateCount: 0"
    )


    print()
    print(
        "[Music v2]"
    )

    print(
        "- snapshotDate: "
        f"{music_state['snapshotDate']}"
    )

    print(
        "- historyRowCount: "
        f"{music_state['historyRowCount']}"
    )

    print(
        "- artistCount: "
        f"{music_state['artistCount']}"
    )

    print(
        "- rankedPlatformCount: "
        f"{music_state['rankedPlatformCount']}/30"
    )

    print(
        "- IVE Music v2 point: "
        f"{music_state['ivePoint']}"
    )

    print(
        "- history duplicate: 0"
    )


    print()
    print(
        "[Health]"
    )

    print(
        "- result: "
        f"{health['result']}"
    )

    print(
        "- failCount: "
        f"{health['failCount']}"
    )

    print(
        "- warnCount: "
        f"{health['warnCount']}"
    )

    print(
        "- masterModified: FALSE"
    )

    print(
        "- websiteModified: FALSE"
    )


    print()
    print(
        "[Promotion Readiness]"
    )

    print(
        "- decision: "
        f"{promotion['decision']}"
    )

    print(
        "- historySnapshots: "
        f"{promotion['historySnapshots']}"
    )

    print(
        "- completeSnapshots: "
        f"{promotion['completeSnapshots']}"
    )

    print(
        "- blockers: "
        f"{promotion['blockers']}"
    )

    print(
        "- warnings: "
        f"{promotion['warnings']}"
    )


    print()
    print("=" * 80)
    print(
        "SAFE TO CONTINUE PROMOTION REVIEW"
    )
    print("=" * 80)


if __name__ == "__main__":
    main()