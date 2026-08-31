from pathlib import Path


DAILY = Path("fandex_daily_python_only_v2.py")
HEALTH = Path("fandex_python_health_check_v2.py")

DAILY_BACKUP = Path(
    "fandex_daily_python_only_v2_before_schema_presence_v3.py"
)

HEALTH_BACKUP = Path(
    "fandex_python_health_check_v2_before_schema_presence_v3.py"
)


daily_original = DAILY.read_text(encoding="utf-8")
health_original = HEALTH.read_text(encoding="utf-8")

daily = daily_original
health = health_original


old_daily_call = (
    '    run_step(step, "Music chart explicit zero presence 공식 반영", '
    '"music_chart_zero_presence_from_history_v2.py", ["--apply"], '
    'log_rows=log_rows)\n'
)

new_daily_call = (
    '    run_step(step, "Music chart schema presence v3 공식 반영", '
    '"music_chart_schema_presence_v3.py", ["--apply"], '
    'log_rows=log_rows)\n'
)


if old_daily_call in daily:

    daily = daily.replace(
        old_daily_call,
        new_daily_call,
        1,
    )

elif new_daily_call in daily:

    print("Daily call already patched")

else:

    raise RuntimeError(
        "Daily target call not found."
    )


old_version = (
    'VERSION = '
    '"fandex_daily_python_only_v2_'
    'stale_decay_zero_presence_'
    'no_site_export"'
)

new_version = (
    'VERSION = '
    '"fandex_daily_python_only_v2_'
    'stale_decay_schema_presence_'
    'no_site_export"'
)


if old_version in daily:

    daily = daily.replace(
        old_version,
        new_version,
        1,
    )


health_start = health.find(
    "    zero_version = norm(\n"
)

health_end = health.find(
    "    reports_file = Path(\n",
    health_start,
)


if health_start == -1:

    if (
        "schemaPresenceVersion"
        in health
        and "schemaZeroArtists"
        in health
    ):
        print("Health block already patched")

    else:
        raise RuntimeError(
            "Health old zero-presence block not found."
        )

else:

    if health_end == -1:
        raise RuntimeError(
            "Health block end not found."
        )

    new_health_block = '''    schema_version = norm(
        payload.get(
            "schemaPresenceVersion"
        )
    )

    if (
        schema_version
        == "music_chart_schema_presence_v3"
    ):
        h.ok(
            "schemaPresenceVersion: "
            f"{schema_version}"
        )

    else:
        h.fail(
            "unexpected schemaPresenceVersion: "
            f"{schema_version or '-'}"
        )

    schema_zero = payload.get(
        "schemaZeroArtists",
        [],
    )

    if not isinstance(
        schema_zero,
        list,
    ):
        h.fail(
            "schemaZeroArtists "
            "is not a list"
        )

    elif len(schema_zero) != zero_count:
        h.fail(
            "schemaZeroArtists count mismatch: "
            f"metadata={len(schema_zero)}, "
            f"actualZero={zero_count}"
        )

    else:
        h.ok(
            "schemaZeroArtists: "
            f"{len(schema_zero)}"
        )

    h.ok(
        "Music zeroPresent count: "
        f"{zero_count}"
    )

    schema_script = Path(
        "music_chart_schema_presence_v3.py"
    )

    if schema_script.exists():
        h.ok(
            "schema presence v3 script exists"
        )

    else:
        h.fail(
            "missing: "
            f"{schema_script}"
        )

    legacy_zero_script = Path(
        "music_chart_zero_presence_from_history_v2.py"
    )

    if legacy_zero_script.exists():
        h.ok(
            "legacy zero presence v2 script preserved"
        )

    else:
        h.fail(
            "missing legacy script: "
            f"{legacy_zero_script}"
        )

'''

    health = (
        health[:health_start]
        + new_health_block
        + health[health_end:]
    )


if not DAILY_BACKUP.exists():
    DAILY_BACKUP.write_text(
        daily_original,
        encoding="utf-8",
    )

if not HEALTH_BACKUP.exists():
    HEALTH_BACKUP.write_text(
        health_original,
        encoding="utf-8",
    )


DAILY.write_text(
    daily,
    encoding="utf-8",
)

HEALTH.write_text(
    health,
    encoding="utf-8",
)


print()
print("PATCH OK")
print(f"daily: {DAILY}")
print(f"dailyBackup: {DAILY_BACKUP}")
print(f"health: {HEALTH}")
print(f"healthBackup: {HEALTH_BACKUP}")
print("Daily zero-presence v2 -> schema-presence v3")
print("Health -> schema-presence v3 validation")
print("Legacy zero-presence v2 preserved")
print("Music v2 parallel untouched")
print("masterModified: FALSE")
print("websiteModified: FALSE")