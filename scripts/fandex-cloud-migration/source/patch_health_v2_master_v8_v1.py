from pathlib import Path


TARGET = Path(
    "fandex_python_health_check_v2.py"
)

BACKUP = Path(
    "fandex_python_health_check_v2_before_master_v8_health.py"
)


text = TARGET.read_text(
    encoding="utf-8"
)


# ============================================================
# 1. v7 / v8 constants
# ============================================================

old = '''ROLLING_SCORE_CSV = Path(
    "lastfm_global_interest_rolling_score_preview_v1_latest.csv"
)

CLOUD_SYNC_SCRIPT = Path(
'''

new = '''ROLLING_SCORE_CSV = Path(
    "lastfm_global_interest_rolling_score_preview_v1_latest.csv"
)

V7_MASTER_FILE = Path(
    "fandex_master_ranking_latest.json"
)

V8_MASTER_FILE = Path(
    "fandex_master_v8_ranking_latest.json"
)

V8_BUILDER_SCRIPT = Path(
    "fandex_master_v8_build_v1.py"
)

CLOUD_SYNC_SCRIPT = Path(
'''

if old not in text:
    raise RuntimeError(
        "PATCH BLOCK 1 not found"
    )

text = text.replace(
    old,
    new,
    1,
)


# ============================================================
# 2. safe_float
# ============================================================

old = '''def safe_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def check_required_files(h):
'''

new = '''def safe_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default


def safe_float(value, default=0.0):
    try:
        if value in [
            None,
            "",
        ]:
            return default

        return float(
            str(value)
            .replace(",", "")
            .strip()
        )

    except Exception:
        return default


def check_required_files(h):
'''

if old not in text:
    raise RuntimeError(
        "PATCH BLOCK 2 not found"
    )

text = text.replace(
    old,
    new,
    1,
)


# ============================================================
# 3. Required files
# ============================================================

old = '''        ROLLING_SCORE_JSON,
        ROLLING_SCORE_CSV,
    ]
'''

new = '''        ROLLING_SCORE_JSON,
        ROLLING_SCORE_CSV,
        V7_MASTER_FILE,
        V8_MASTER_FILE,
        V8_BUILDER_SCRIPT,
    ]
'''

if old not in text:
    raise RuntimeError(
        "PATCH BLOCK 3 not found"
    )

text = text.replace(
    old,
    new,
    1,
)


# ============================================================
# 4. Runner required tokens
# ============================================================

old = '''        (
            "lastfm_global_interest_rolling_score_preview_v1.py",
            "rolling score preview",
        ),
    ]
'''

new = '''        (
            "lastfm_global_interest_rolling_score_preview_v1.py",
            "rolling score preview",
        ),
        (
            "fandex_master_v8_build_v1.py",
            "parallel Master v8 build",
        ),
        (
            "lastfm_rolling_master_impact_preview_v1.py",
            "rolling Master impact preview",
        ),
    ]
'''

if old not in text:
    raise RuntimeError(
        "PATCH BLOCK 4 not found"
    )

text = text.replace(
    old,
    new,
    1,
)


# ============================================================
# 5. Old 1-day impact must not be in Daily runner
# ============================================================

old = '''    forbidden_daily_tokens = [
        "lastfm_run_auto_v1.py",
        "lastfm_run_secure_v2.py",
        "lastfm_interest_history_v1.py",
    ]
'''

new = '''    forbidden_daily_tokens = [
        "lastfm_run_auto_v1.py",
        "lastfm_run_secure_v2.py",
        "lastfm_interest_history_v1.py",
        "py lastfm_master_impact_preview_v1.py",
    ]
'''

if old not in text:
    raise RuntimeError(
        "PATCH BLOCK 5 not found"
    )

text = text.replace(
    old,
    new,
    1,
)


# ============================================================
# 6. Master v8 health function
# ============================================================

marker = "\ndef run_v1(h):\n"

if marker not in text:
    raise RuntimeError(
        "PATCH BLOCK 6 marker not found"
    )


function_code = r'''

def check_master_v8(
    h,
    history,
):
    h.section(
        "FANDEX Master v8 parallel candidate 확인"
    )

    if not V7_MASTER_FILE.exists():
        h.fail(
            f"missing: {V7_MASTER_FILE}"
        )
        return

    if not V8_MASTER_FILE.exists():
        h.fail(
            f"missing: {V8_MASTER_FILE}"
        )
        return

    if not ROLLING_SCORE_CSV.exists():
        h.fail(
            f"missing: {ROLLING_SCORE_CSV}"
        )
        return

    if not ROLLING_SCORE_JSON.exists():
        h.fail(
            f"missing: {ROLLING_SCORE_JSON}"
        )
        return


    v7 = read_json(
        V7_MASTER_FILE
    )

    v8 = read_json(
        V8_MASTER_FILE
    )

    rolling_score_payload = read_json(
        ROLLING_SCORE_JSON
    )

    rolling_rows = read_csv(
        ROLLING_SCORE_CSV
    )


    # --------------------------------------------------------
    # Production v7 validation
    # --------------------------------------------------------

    v7_version = norm(
        v7.get(
            "version"
        )
    )

    expected_v7_version = (
        "fandex_master_v7_youtube_v3_"
        "uncapped_cumulative"
    )

    if v7_version == expected_v7_version:
        h.ok(
            f"production v7 version: "
            f"{v7_version}"
        )
    else:
        h.fail(
            "production v7 version mismatch: "
            f"{v7_version}"
        )


    v7_rows = v7.get(
        "ranking",
        [],
    )

    if not isinstance(
        v7_rows,
        list,
    ):
        h.fail(
            "production v7 ranking "
            "is not a list"
        )
        return


    if len(v7_rows) == 10:
        h.ok(
            "production v7 artistCount: 10"
        )
    else:
        h.fail(
            "production v7 artistCount: "
            f"{len(v7_rows)}"
        )


    v7_lastfm_count = 0

    for row in v7_rows:

        if not isinstance(
            row,
            dict,
        ):
            continue

        source_points = row.get(
            "sourcePoints",
            {},
        )

        if (
            isinstance(
                source_points,
                dict,
            )
            and "lastfm" in source_points
        ):
            v7_lastfm_count += 1


    if v7_lastfm_count == 0:
        h.ok(
            "production v7 Last.fm source absent: "
            "10/10"
        )
    else:
        h.fail(
            "production v7 unexpectedly contains "
            f"Last.fm source: {v7_lastfm_count}"
        )


    if (
        v7.get(
            "touchesWebsitePublicData"
        )
        is False
    ):
        h.ok(
            "production v7 "
            "touchesWebsitePublicData: FALSE"
        )
    else:
        h.fail(
            "production v7 "
            "touchesWebsitePublicData "
            "is not FALSE"
        )


    # --------------------------------------------------------
    # v8 top-level validation
    # --------------------------------------------------------

    v8_version = norm(
        v8.get(
            "version"
        )
    )

    expected_v8_version = (
        "fandex_master_v8_lastfm_rolling_v1"
    )

    if v8_version == expected_v8_version:
        h.ok(
            f"v8 version: {v8_version}"
        )
    else:
        h.fail(
            "v8 version mismatch: "
            f"{v8_version}"
        )


    expected_score_mode = (
        "uncapped_cumulative_source_points_"
        "with_youtube_v3_music_chart_v1_"
        "lastfm_rolling_x0_25"
    )

    actual_score_mode = norm(
        v8.get(
            "scoreMode"
        )
    )

    if (
        actual_score_mode
        == expected_score_mode
    ):
        h.ok(
            f"v8 scoreMode: "
            f"{actual_score_mode}"
        )
    else:
        h.fail(
            "v8 scoreMode mismatch: "
            f"{actual_score_mode}"
        )


    if (
        v8.get(
            "pythonOnly"
        )
        is True
    ):
        h.ok(
            "v8 pythonOnly: TRUE"
        )
    else:
        h.fail(
            "v8 pythonOnly is not TRUE"
        )


    if (
        v8.get(
            "touchesWebsitePublicData"
        )
        is False
    ):
        h.ok(
            "v8 touchesWebsitePublicData: FALSE"
        )
    else:
        h.fail(
            "v8 touchesWebsitePublicData "
            "is not FALSE"
        )


    v8_rows = v8.get(
        "ranking",
        [],
    )

    if not isinstance(
        v8_rows,
        list,
    ):
        h.fail(
            "v8 ranking is not a list"
        )
        return


    v8_artists = [
        norm(
            row.get(
                "artist"
            )
        )
        for row in v8_rows
        if isinstance(
            row,
            dict,
        )
    ]

    unique_v8_artists = {
        artist
        for artist in v8_artists
        if artist
    }


    if (
        len(v8_rows) == 10
        and len(
            unique_v8_artists
        ) == 10
    ):
        h.ok(
            "v8 artistCount: 10/10"
        )
    else:
        h.fail(
            "v8 artist presence mismatch: "
            f"rows={len(v8_rows)}, "
            f"unique={len(unique_v8_artists)}"
        )


    # --------------------------------------------------------
    # v7/v8 artist identity
    # --------------------------------------------------------

    v7_map = {}

    for row in v7_rows:

        if not isinstance(
            row,
            dict,
        ):
            continue

        artist = norm(
            row.get(
                "artist"
            )
        )

        if not artist:
            continue

        v7_map[
            artist
        ] = safe_float(
            row.get(
                "fandexFinalPoint",
                row.get(
                    "score",
                    0.0,
                ),
            )
        )


    if set(
        v7_map.keys()
    ) == unique_v8_artists:
        h.ok(
            "v7/v8 artist set: MATCH 10/10"
        )
    else:
        h.fail(
            "v7/v8 artist set mismatch"
        )


    # --------------------------------------------------------
    # Rolling score source map
    # --------------------------------------------------------

    if not rolling_rows:
        h.fail(
            "rolling score CSV is empty"
        )
        return


    rolling_fields = set(
        rolling_rows[0].keys()
    )

    rolling_score_field = ""

    for candidate in [
        "rollingCombinedPreviewPoint",
        "rollingCombinedPoint",
        "rollingScore",
        "score",
    ]:
        if candidate in rolling_fields:
            rolling_score_field = candidate
            break


    if not rolling_score_field:
        h.fail(
            "rolling score field not found"
        )
        return


    h.ok(
        "rolling score field: "
        f"{rolling_score_field}"
    )


    rolling_map = {}

    for row in rolling_rows:

        artist = norm(
            row.get(
                "artist"
            )
        )

        if not artist:
            continue

        rolling_map[
            artist
        ] = safe_float(
            row.get(
                rolling_score_field
            )
        )


    if set(
        rolling_map.keys()
    ) == unique_v8_artists:
        h.ok(
            "v8/rolling artist set: "
            "MATCH 10/10"
        )
    else:
        h.fail(
            "v8/rolling artist set mismatch"
        )


    expected_mode = norm(
        rolling_score_payload.get(
            "activeMode"
        )
    )


    if not expected_mode:
        h.fail(
            "rolling score activeMode missing"
        )
        return


    # --------------------------------------------------------
    # Row-level v8 validation
    # --------------------------------------------------------

    lastfm_presence = 0
    scale_mismatch = []
    mode_mismatch = []
    contribution_mismatch = []
    source_total_mismatch = []
    final_score_mismatch = []
    base_score_mismatch = []
    delta_mismatch = []
    score_field_mismatch = []


    for row in v8_rows:

        if not isinstance(
            row,
            dict,
        ):
            continue


        artist = norm(
            row.get(
                "artist"
            )
        )

        source_points = row.get(
            "sourcePoints",
            {},
        )


        if not isinstance(
            source_points,
            dict,
        ):
            h.fail(
                f"{artist}: "
                "sourcePoints is not a dict"
            )
            continue


        lastfm = source_points.get(
            "lastfm"
        )


        if not isinstance(
            lastfm,
            dict,
        ):
            continue


        lastfm_presence += 1


        # scale
        scale = safe_float(
            lastfm.get(
                "scale"
            ),
            -1.0,
        )

        if abs(
            scale - 0.25
        ) > 1e-9:
            scale_mismatch.append(
                artist
            )


        # active mode
        mode = norm(
            lastfm.get(
                "activeMode"
            )
        )

        if mode != expected_mode:
            mode_mismatch.append(
                artist
            )


        # exact contribution from RAW rolling score
        raw_rolling = rolling_map.get(
            artist
        )

        if raw_rolling is None:
            contribution_mismatch.append(
                artist
            )
            continue


        expected_contribution = round(
            raw_rolling * 0.25,
            2,
        )

        actual_contribution = safe_float(
            lastfm.get(
                "cumulativePoint"
            )
        )


        if abs(
            actual_contribution
            - expected_contribution
        ) > 0.001:
            contribution_mismatch.append(
                artist
            )


        # source total
        source_sum = round(
            sum(
                safe_float(
                    source_points
                    .get(
                        key,
                        {},
                    )
                    .get(
                        "cumulativePoint",
                        0.0,
                    )
                )
                for key in [
                    "naver",
                    "youtube",
                    "musicChart",
                    "lastfm",
                ]
            ),
            2,
        )


        source_total_check = safe_float(
            row.get(
                "sourceTotalCheck"
            )
        )


        if abs(
            source_sum
            - source_total_check
        ) > 0.001:
            source_total_mismatch.append(
                artist
            )


        # final score
        final_point = safe_float(
            row.get(
                "fandexFinalPoint"
            )
        )

        if abs(
            final_point
            - source_total_check
        ) > 0.001:
            final_score_mismatch.append(
                artist
            )


        score = safe_float(
            row.get(
                "score"
            )
        )

        if abs(
            score
            - final_point
        ) > 0.001:
            score_field_mismatch.append(
                artist
            )


        # base v7 score
        expected_base = v7_map.get(
            artist
        )

        previous_master = safe_float(
            row.get(
                "previousMasterPoint"
            )
        )


        if (
            expected_base is None
            or abs(
                previous_master
                - expected_base
            ) > 0.001
        ):
            base_score_mismatch.append(
                artist
            )


        # delta from v7
        delta = safe_float(
            row.get(
                "deltaFromPreviousMaster"
            )
        )

        if abs(
            delta
            - expected_contribution
        ) > 0.001:
            delta_mismatch.append(
                artist
            )


        # final = v7 + Last.fm
        if (
            expected_base is not None
            and abs(
                final_point
                - round(
                    expected_base
                    + expected_contribution,
                    2,
                )
            ) > 0.001
        ):
            final_score_mismatch.append(
                artist
            )


    # --------------------------------------------------------
    # Aggregate results
    # --------------------------------------------------------

    if lastfm_presence == 10:
        h.ok(
            "v8 Last.fm source presence: 10/10"
        )
    else:
        h.fail(
            "v8 Last.fm source presence: "
            f"{lastfm_presence}/10"
        )


    if not scale_mismatch:
        h.ok(
            "v8 Last.fm scale: 0.25 (10/10)"
        )
    else:
        h.fail(
            "v8 Last.fm scale mismatch: "
            + ", ".join(
                sorted(
                    set(
                        scale_mismatch
                    )
                )
            )
        )


    if not mode_mismatch:
        h.ok(
            "v8 Last.fm activeMode: "
            f"{expected_mode} (10/10)"
        )
    else:
        h.fail(
            "v8 Last.fm activeMode mismatch: "
            + ", ".join(
                sorted(
                    set(
                        mode_mismatch
                    )
                )
            )
        )


    if not contribution_mismatch:
        h.ok(
            "v8 Last.fm raw rolling ×0.25 "
            "mismatch: 0"
        )
    else:
        h.fail(
            "v8 Last.fm contribution mismatch: "
            + ", ".join(
                sorted(
                    set(
                        contribution_mismatch
                    )
                )
            )
        )


    if not source_total_mismatch:
        h.ok(
            "v8 sourceTotalCheck mismatch: 0"
        )
    else:
        h.fail(
            "v8 sourceTotalCheck mismatch: "
            + ", ".join(
                sorted(
                    set(
                        source_total_mismatch
                    )
                )
            )
        )


    if not final_score_mismatch:
        h.ok(
            "v8 final score mismatch: 0"
        )
    else:
        h.fail(
            "v8 final score mismatch: "
            + ", ".join(
                sorted(
                    set(
                        final_score_mismatch
                    )
                )
            )
        )


    if not score_field_mismatch:
        h.ok(
            "v8 fandexFinalPoint/score "
            "mismatch: 0"
        )
    else:
        h.fail(
            "v8 score field mismatch: "
            + ", ".join(
                sorted(
                    set(
                        score_field_mismatch
                    )
                )
            )
        )


    if not base_score_mismatch:
        h.ok(
            "v8 previousMasterPoint "
            "matches current v7: 10/10"
        )
    else:
        h.fail(
            "v8 previousMasterPoint mismatch: "
            + ", ".join(
                sorted(
                    set(
                        base_score_mismatch
                    )
                )
            )
        )


    if not delta_mismatch:
        h.ok(
            "v8 deltaFromPreviousMaster "
            "matches Last.fm: 10/10"
        )
    else:
        h.fail(
            "v8 deltaFromPreviousMaster mismatch: "
            + ", ".join(
                sorted(
                    set(
                        delta_mismatch
                    )
                )
            )
        )


    # --------------------------------------------------------
    # Rank validation
    # --------------------------------------------------------

    ranks = [
        safe_int(
            row.get(
                "rank"
            ),
            -1,
        )
        for row in v8_rows
        if isinstance(
            row,
            dict,
        )
    ]


    if sorted(
        ranks
    ) == list(
        range(
            1,
            11,
        )
    ):
        h.ok(
            "v8 rank sequence: 1-10"
        )
    else:
        h.fail(
            f"v8 rank sequence invalid: {ranks}"
        )


    scores = [
        safe_float(
            row.get(
                "fandexFinalPoint"
            )
        )
        for row in v8_rows
        if isinstance(
            row,
            dict,
        )
    ]


    descending = all(
        scores[index]
        >= scores[index + 1]
        for index in range(
            len(scores) - 1
        )
    )


    if descending:
        h.ok(
            "v8 ranking score order: DESC"
        )
    else:
        h.fail(
            "v8 ranking score order "
            "is not DESC"
        )


    if (
        history is not None
        and history.get(
            "snapshotDateCount",
            0,
        ) >= 7
    ):
        if (
            expected_mode
            == "rolling3_50_rolling7_50"
        ):
            h.ok(
                "v8 7-day activation state: READY"
            )
        else:
            h.fail(
                "v8 7-day activation mismatch: "
                f"{expected_mode}"
            )
'''


text = text.replace(
    marker,
    function_code + marker,
    1,
)


# ============================================================
# 7. Call v8 health before final result
# ============================================================

old = '''    check_rolling_score(
        h,
        history,
    )


    h.section(
        "Health Check v2 final result"
    )
'''

new = '''    check_rolling_score(
        h,
        history,
    )

    check_master_v8(
        h,
        history,
    )


    h.section(
        "Health Check v2 final result"
    )
'''

if old not in text:
    raise RuntimeError(
        "PATCH BLOCK 7 not found"
    )

text = text.replace(
    old,
    new,
    1,
)


# ============================================================
# Backup + write
# ============================================================

BACKUP.write_text(
    TARGET.read_text(
        encoding="utf-8"
    ),
    encoding="utf-8",
)

TARGET.write_text(
    text,
    encoding="utf-8",
)


print("PATCH OK")
print(f"target: {TARGET}")
print(f"backup: {BACKUP}")
print("Master v8 health: configured")
print("v7 production isolation: configured")
print("Last.fm x0.25 validation: configured")
print("sourceTotalCheck validation: configured")
print("Runner v5 validation: configured")
print("websiteModified: FALSE")