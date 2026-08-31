from __future__ import annotations

import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fandex_v10_post_promotion_audit_v1"

EXPECTED_MASTER_VERSION = (
    "fandex_master_v10_music_v2_lastfm_rolling_v1"
)

EXPECTED_SCORE_MODE = (
    "uncapped_cumulative_source_points_"
    "with_youtube_v3_"
    "music_chart_v2_x0_25_"
    "lastfm_rolling_x0_25"
)

MANIFEST = Path(
    "fandex_v10_promotion_manifest_latest.json"
)

MASTER = Path(
    "fandex_master_ranking_latest.json"
)

REPORTS = Path(
    "fandex_master_artist_reports_latest.json"
)

RUNNER = Path(
    "run_fandex_daily_python_only.bat"
)

HEALTH = Path(
    "fandex_python_health_check_v3_latest.txt"
)

STATUS = Path(
    "fandex_python_status_report_latest.txt"
)

ROLLBACK = Path(
    "rollback_fandex_v10_promotion_v1.py"
)

SUMMARY = Path(
    "fandex_daily_summary_v3.py"
)

ARCHIVE = Path(
    "fandex_archive_generated_files_v1.py"
)

OUTPUT_JSON = Path(
    "fandex_v10_post_promotion_audit_latest.json"
)

OUTPUT_REPORT = Path(
    "FANDEX_V10_POST_PROMOTION_AUDIT_REPORT.txt"
)


def read_json(path):
    return json.loads(
        path.read_text(
            encoding="utf-8-sig"
        )
    )


def read_text(path):
    return path.read_text(
        encoding="utf-8-sig",
        errors="replace",
    )


def main():
    print()
    print("=" * 92)
    print("FANDEX v10 Post-Promotion Audit v1")
    print("=" * 92)
    print(f"version: {VERSION}")
    print("mode: READ-ONLY CLOSEOUT")
    print("productionModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 92)

    checks = []
    failures = []

    def check(name, ok, detail=""):
        row = {
            "check": name,
            "pass": bool(ok),
            "detail": detail,
        }

        checks.append(row)

        if ok:
            print(
                f"PASS  {name}"
                + (
                    f" | {detail}"
                    if detail
                    else ""
                )
            )
        else:
            print(
                f"FAIL  {name}"
                + (
                    f" | {detail}"
                    if detail
                    else ""
                )
            )

            failures.append(name)

    print()
    print("FILES")
    print("-" * 92)

    required = [
        MANIFEST,
        MASTER,
        REPORTS,
        RUNNER,
        HEALTH,
        STATUS,
        ROLLBACK,
        SUMMARY,
        ARCHIVE,
        Path("fandex_master_score_v10.py"),
        Path("fandex_python_health_check_v3.py"),
        Path("fandex_python_status_report_v2.py"),
        Path("fandex_daily_python_only_v3.py"),
    ]

    for path in required:
        check(
            f"file:{path.name}",
            path.exists(),
        )

    if failures:
        finish(
            checks,
            failures,
        )
        return

    print()
    print("PROMOTION MANIFEST")
    print("-" * 92)

    manifest = read_json(
        MANIFEST
    )

    check(
        "manifest status",
        manifest.get("status") == "PROMOTED",
        str(
            manifest.get("status")
        ),
    )

    backup_dir = Path(
        str(
            manifest.get(
                "backupDir",
                "",
            )
        )
    )

    check(
        "promotion backup directory",
        backup_dir.exists()
        and backup_dir.is_dir(),
        str(backup_dir),
    )

    if backup_dir.exists():
        backup_required = [
            "run_fandex_daily_python_only.bat",
            "fandex_master_ranking_latest.json",
            "fandex_master_artist_reports_latest.json",
        ]

        for name in backup_required:
            path = backup_dir / name

            check(
                f"backup:{name}",
                path.exists(),
            )

    check(
        "old production recorded",
        manifest.get(
            "oldProductionVersion"
        )
        == (
            "fandex_master_v7_"
            "youtube_v3_uncapped_cumulative"
        ),
        str(
            manifest.get(
                "oldProductionVersion"
            )
        ),
    )

    check(
        "target production recorded",
        manifest.get(
            "targetProductionVersion"
        )
        == EXPECTED_MASTER_VERSION,
        str(
            manifest.get(
                "targetProductionVersion"
            )
        ),
    )

    print()
    print("PRODUCTION MASTER")
    print("-" * 92)

    master = read_json(
        MASTER
    )

    check(
        "Master version",
        master.get("version")
        == EXPECTED_MASTER_VERSION,
        str(
            master.get("version")
        ),
    )

    check(
        "Master scoreMode",
        master.get("scoreMode")
        == EXPECTED_SCORE_MODE,
        str(
            master.get("scoreMode")
        ),
    )

    ranking = master.get(
        "ranking",
        [],
    )

    artists = {
        str(
            row.get("artist") or ""
        ).strip()
        for row in ranking
        if isinstance(
            row,
            dict,
        )
        and str(
            row.get("artist") or ""
        ).strip()
    }

    check(
        "Master artists",
        len(ranking) == 10
        and len(artists) == 10,
        (
            f"rows={len(ranking)}, "
            f"artists={len(artists)}"
        ),
    )

    check(
        "production flag",
        master.get("production") is True,
    )

    check(
        "pythonOnly flag",
        master.get("pythonOnly") is True,
    )

    check(
        "website flag",
        master.get(
            "touchesWebsitePublicData"
        )
        is False,
    )

    print()
    print("HEALTH")
    print("-" * 92)

    health_text = read_text(
        HEALTH
    )

    check(
        "Health v3 PASS",
        (
            "OK: FANDEX production v10 healthy"
            in health_text
            and
            "failCount: 0"
            in health_text
            and
            "warnCount: 0"
            in health_text
        ),
    )

    print()
    print("RUNNER")
    print("-" * 92)

    runner_text = read_text(
        RUNNER
    )

    required_runner_tokens = [
        "FANDEX Daily Python-Only Runner v8",
        "fandex_daily_python_only_v3.py",
        "music_chart_current_presence_publish_v2.py",
        "lastfm_sync_cloud_history_v1_1.py --apply",
        "fandex_master_score_v10.py",
        "fandex_python_status_report_v2.py",
        "fandex_python_health_check_v3.py",
        "fandex_daily_summary_v3.py",
    ]

    for token in required_runner_tokens:
        check(
            f"runner:{token}",
            token in runner_text,
        )

    forbidden_runner_tokens = [
        "fandex_master_score_v7.py",
        "fandex_master_v8_build_v1.py",
        "fandex_master_v9_daily_parallel_v1.py",
        "fandex_export_to_site_v1.py",
        "fandex_publish_all_v5.py",
    ]

    found_forbidden = [
        token
        for token
        in forbidden_runner_tokens
        if token in runner_text
    ]

    check(
        "legacy/website Runner commands absent",
        not found_forbidden,
        (
            ", ".join(
                found_forbidden
            )
            if found_forbidden
            else "NONE"
        ),
    )

    print()
    print("STATUS / ARCHIVE / ROLLBACK")
    print("-" * 92)

    status_text = read_text(
        STATUS
    )

    check(
        "Status Report v10",
        EXPECTED_MASTER_VERSION
        in status_text,
    )

    archive_text = read_text(
        ARCHIVE
    )

    protected = [
        '"fandex_master_ranking_latest.json"',
        '"fandex_master_artist_reports_latest.json"',
    ]

    check(
        "production archive protection",
        all(
            token in archive_text
            for token in protected
        ),
    )

    rollback_text = read_text(
        ROLLBACK
    )

    check(
        "rollback uses promotion manifest",
        (
            "fandex_v10_promotion_manifest_latest.json"
            in rollback_text
        ),
    )

    print()
    print("DAILY SUMMARY READ-ONLY CHECK")
    print("-" * 92)

    result = subprocess.run(
        [
            sys.executable,
            str(SUMMARY),
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )

    print(
        result.stdout
    )

    check(
        "Daily Summary return code",
        result.returncode == 0,
        f"returncode={result.returncode}",
    )

    check(
        "Daily Summary SUCCESS",
        "DAILY RUN SUCCESS"
        in result.stdout,
    )

    finish(
        checks,
        failures,
    )


def finish(
    checks,
    failures,
):
    decision = (
        "PASS"
        if not failures
        else "REVIEW"
    )

    payload = {
        "version": VERSION,
        "createdAt": (
            datetime.now()
            .isoformat(
                timespec="seconds"
            )
        ),
        "decision": decision,
        "checkCount": len(checks),
        "failureCount": len(failures),
        "failures": failures,
        "checks": checks,
        "productionModified": False,
        "websiteModified": False,
    }

    OUTPUT_JSON.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    lines = [
        "FANDEX v10 Post-Promotion Audit v1",
        "=" * 92,
        f"decision: {decision}",
        f"checkCount: {len(checks)}",
        f"failureCount: {len(failures)}",
        "",
    ]

    for row in checks:
        lines.append(
            (
                f"{'PASS' if row['pass'] else 'FAIL'} "
                f"| {row['check']}"
                + (
                    f" | {row['detail']}"
                    if row.get(
                        "detail"
                    )
                    else ""
                )
            )
        )

    lines.extend([
        "",
        "productionModified: FALSE",
        "websiteModified: FALSE",
    ])

    OUTPUT_REPORT.write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8",
    )

    print()
    print("=" * 92)
    print("POST-PROMOTION CLOSEOUT")
    print("=" * 92)
    print(f"decision: {decision}")
    print(
        f"checks: "
        f"{len(checks) - len(failures)}"
        f"/{len(checks)} PASS"
    )
    print(
        f"failures: "
        f"{failures if failures else 'NONE'}"
    )
    print("productionModified: FALSE")
    print("websiteModified: FALSE")

    if decision == "PASS":
        print()
        print(
            "RESULT: v10 PRODUCTION "
            "PROMOTION CLOSEOUT COMPLETE"
        )

        print(
            "NEXT OPERATION: "
            "run the normal daily Runner "
            "once on the next operating day."
        )

    print("=" * 92)

    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()