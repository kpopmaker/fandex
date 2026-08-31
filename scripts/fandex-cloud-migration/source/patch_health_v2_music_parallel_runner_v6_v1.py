from pathlib import Path
from datetime import datetime
import shutil


TARGET = Path(
    "fandex_python_health_check_v2.py"
)

if not TARGET.exists():
    raise RuntimeError(
        f"Missing: {TARGET}"
    )


text_original = TARGET.read_text(
    encoding="utf-8"
)

text = text_original

timestamp = datetime.now().strftime(
    "%Y%m%d_%H%M%S"
)

BACKUP = Path(
    "fandex_python_health_check_v2_"
    "before_music_parallel_runner_v6_"
    f"{timestamp}.py"
)


FUNCTION_NAME = (
    "check_music_current_presence_parallel_v2"
)


# ============================================================
# 1. Music v2 parallel 전용 Health 함수 추가
# ============================================================

if f"def {FUNCTION_NAME}(h):" not in text:

    anchor = "\ndef history_summary(h):\n"

    if anchor not in text:
        raise RuntimeError(
            "history_summary anchor not found."
        )

    new_function = r'''

def check_music_current_presence_parallel_v2(h):
    h.section(
        "Music v2 parallel current-presence 확인"
    )

    latest_file = Path(
        "fandex_music_chart_ranking_"
        "v2_current_presence_latest.json"
    )

    history_file = Path(
        "music_chart_current_presence_history_v2.csv"
    )

    preview_file = Path(
        "music_chart_current_presence_"
        "preview_v1_latest.csv"
    )

    archive_file = Path(
        "fandex_archive_generated_files_v1.py"
    )

    required_files = [
        latest_file,
        history_file,
        preview_file,
        archive_file,
        Path(
            "music_chart_discover_"
            "artist_candidates_v2.py"
        ),
        Path(
            "music_chart_discover_"
            "bugs_all_targets_v1.py"
        ),
        Path(
            "music_chart_check_history_v1.py"
        ),
        Path(
            "music_chart_current_presence_"
            "preview_v1.py"
        ),
        Path(
            "music_chart_current_presence_"
            "publish_v2.py"
        ),
    ]

    missing = [
        path
        for path in required_files
        if not path.exists()
    ]

    if missing:
        for path in missing:
            h.fail(
                f"Music v2 missing: {path}"
            )
        return

    h.ok(
        "Music v2 required files: present"
    )


    # --------------------------------------------------------
    # latest JSON
    # --------------------------------------------------------

    payload = read_json(
        latest_file
    )

    version = norm(
        payload.get(
            "version"
        )
    )

    expected_version = (
        "fandex_music_chart_v2_"
        "current_presence_parallel_v1"
    )

    if version == expected_version:
        h.ok(
            f"Music v2 version: {version}"
        )
    else:
        h.fail(
            "unexpected Music v2 version: "
            f"{version or '-'}"
        )


    score_mode = norm(
        payload.get(
            "scoreMode"
        )
    )

    expected_score_mode = (
        "best_current_entry_per_"
        "artist_x_platform_full_scale"
    )

    if score_mode == expected_score_mode:
        h.ok(
            f"Music v2 scoreMode: {score_mode}"
        )
    else:
        h.fail(
            "unexpected Music v2 scoreMode: "
            f"{score_mode or '-'}"
        )


    usage = norm(
        payload.get(
            "usage"
        )
    )

    if usage == "parallel_candidate_only":
        h.ok(
            "Music v2 usage: "
            "parallel_candidate_only"
        )
    else:
        h.fail(
            "Music v2 usage mismatch: "
            f"{usage or '-'}"
        )


    if payload.get(
        "pythonOnly"
    ) is True:
        h.ok(
            "Music v2 pythonOnly: TRUE"
        )
    else:
        h.fail(
            "Music v2 pythonOnly is not TRUE"
        )


    if payload.get(
        "touchesWebsitePublicData"
    ) is False:
        h.ok(
            "Music v2 touchesWebsitePublicData: "
            "FALSE"
        )
    else:
        h.fail(
            "Music v2 unexpectedly touches "
            "website public/data"
        )


    if payload.get(
        "masterModified"
    ) is False:
        h.ok(
            "Music v2 masterModified: FALSE"
        )
    else:
        h.fail(
            "Music v2 masterModified "
            "is not FALSE"
        )


    if payload.get(
        "websiteModified"
    ) is False:
        h.ok(
            "Music v2 websiteModified: FALSE"
        )
    else:
        h.fail(
            "Music v2 websiteModified "
            "is not FALSE"
        )


    snapshot_date = norm(
        payload.get(
            "snapshotDate"
        )
    )

    if snapshot_date:
        h.ok(
            "Music v2 snapshotDate: "
            f"{snapshot_date}"
        )
    else:
        h.fail(
            "Music v2 snapshotDate missing"
        )


    ranking = payload.get(
        "ranking",
        []
    )

    if not isinstance(
        ranking,
        list,
    ):
        h.fail(
            "Music v2 ranking is not a list"
        )
        return


    artists = []
    ranking_map = {}

    total_ranked_platforms = 0
    bad_platform_count = 0
    point_mismatch = 0

    expected_platforms = {
        "melon",
        "genie",
        "bugs",
    }


    for row in ranking:

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

        if artist:
            artists.append(
                artist
            )
            ranking_map[
                artist
            ] = row


        try:
            ranked_count = int(
                row.get(
                    "rankedPlatformCount",
                    0,
                )
                or 0
            )
        except Exception:
            ranked_count = -1


        if not (
            0 <= ranked_count <= 3
        ):
            bad_platform_count += 1

        total_ranked_platforms += max(
            ranked_count,
            0,
        )


        platform_points = row.get(
            "platformPoints",
            {}
        )

        platform_status = row.get(
            "platformStatus",
            {}
        )


        if not isinstance(
            platform_points,
            dict,
        ):
            bad_platform_count += 1
            continue

        if not isinstance(
            platform_status,
            dict,
        ):
            bad_platform_count += 1
            continue


        if set(
            platform_points.keys()
        ) != expected_platforms:
            bad_platform_count += 1


        if set(
            platform_status.keys()
        ) != expected_platforms:
            bad_platform_count += 1


        status_ranked_count = 0

        for platform in expected_platforms:

            status_row = (
                platform_status.get(
                    platform,
                    {}
                )
            )

            if isinstance(
                status_row,
                dict,
            ):
                status = norm(
                    status_row.get(
                        "status"
                    )
                ).upper()

                if status == "RANKED":
                    status_ranked_count += 1


        if (
            status_ranked_count
            != ranked_count
        ):
            bad_platform_count += 1


        point_sum = 0.0

        for value in platform_points.values():
            try:
                point_sum += float(
                    value or 0
                )
            except Exception:
                pass


        try:
            final_point = float(
                row.get(
                    "fandexMusicChartFinalPoint",
                    row.get(
                        "score",
                        0,
                    ),
                )
                or 0
            )
        except Exception:
            final_point = 0.0


        if abs(
            final_point
            - point_sum
        ) > 0.011:
            point_mismatch += 1


    unique_artists = set(
        artists
    )

    if (
        len(ranking) == 10
        and len(
            unique_artists
        ) == 10
    ):
        h.ok(
            "Music v2 artistCount: 10/10"
        )
    else:
        h.fail(
            "Music v2 artist presence mismatch: "
            f"rows={len(ranking)}, "
            f"unique={len(unique_artists)}"
        )


    ranks = []

    for row in ranking:
        try:
            ranks.append(
                int(
                    row.get(
                        "rank"
                    )
                    or 0
                )
            )
        except Exception:
            ranks.append(
                0
            )


    if ranks == list(
        range(
            1,
            11,
        )
    ):
        h.ok(
            "Music v2 rank sequence: 1-10"
        )
    else:
        h.fail(
            "Music v2 rank sequence mismatch"
        )


    if bad_platform_count == 0:
        h.ok(
            "Music v2 platform structure: "
            "10/10 valid"
        )
    else:
        h.fail(
            "Music v2 platform structure "
            f"mismatch count: {bad_platform_count}"
        )


    if point_mismatch == 0:
        h.ok(
            "Music v2 source-point sum mismatch: 0"
        )
    else:
        h.fail(
            "Music v2 source-point sum mismatch: "
            f"{point_mismatch}"
        )


    # --------------------------------------------------------
    # Preview 30 artist x platform rows
    # --------------------------------------------------------

    preview_rows = read_csv(
        preview_file
    )

    preview_keys = set()
    preview_ranked_count = 0

    for row in preview_rows:

        artist = norm(
            row.get(
                "artist"
            )
        )

        platform = norm(
            row.get(
                "platform"
            )
        ).lower()

        if artist and platform:
            preview_keys.add(
                (
                    artist,
                    platform,
                )
            )

        if norm(
            row.get(
                "status"
            )
        ).upper() == "RANKED":
            preview_ranked_count += 1


    if (
        len(preview_rows) == 30
        and len(
            preview_keys
        ) == 30
    ):
        h.ok(
            "Music v2 preview coverage: 30/30"
        )
    else:
        h.fail(
            "Music v2 preview coverage mismatch: "
            f"rows={len(preview_rows)}, "
            f"unique={len(preview_keys)}"
        )


    if (
        preview_ranked_count
        == total_ranked_platforms
    ):
        h.ok(
            "Music v2 ranked-platform count: "
            f"{total_ranked_platforms}/30"
        )
    else:
        h.fail(
            "Music v2 ranked-platform mismatch: "
            f"latest={total_ranked_platforms}, "
            f"preview={preview_ranked_count}"
        )


    # --------------------------------------------------------
    # History
    # --------------------------------------------------------

    history_rows = read_csv(
        history_file
    )

    history_keys = set()
    duplicate_count = 0
    by_date = {}


    for row in history_rows:

        row_date = norm(
            row.get(
                "snapshotDate"
            )
        )

        artist = norm(
            row.get(
                "artist"
            )
        )

        key = (
            row_date,
            artist,
        )


        if key in history_keys:
            duplicate_count += 1

        history_keys.add(
            key
        )


        if row_date:
            by_date.setdefault(
                row_date,
                []
            ).append(
                row
            )


    if duplicate_count == 0:
        h.ok(
            "Music v2 history duplicate: 0"
        )
    else:
        h.fail(
            "Music v2 history duplicate: "
            f"{duplicate_count}"
        )


    if not by_date:
        h.fail(
            "Music v2 history has no snapshots"
        )

    else:

        latest_history_date = max(
            by_date.keys()
        )

        latest_rows = by_date[
            latest_history_date
        ]

        latest_artists = {
            norm(
                row.get(
                    "artist"
                )
            )
            for row in latest_rows
            if norm(
                row.get(
                    "artist"
                )
            )
        }


        if (
            len(latest_rows) == 10
            and len(
                latest_artists
            ) == 10
        ):
            h.ok(
                "Music v2 latest history "
                "snapshot: 10/10"
            )
        else:
            h.fail(
                "Music v2 latest history "
                "snapshot incomplete: "
                f"rows={len(latest_rows)}, "
                f"artists={len(latest_artists)}"
            )


        if (
            snapshot_date
            and latest_history_date
            == snapshot_date
        ):
            h.ok(
                "Music v2 latest JSON/history "
                f"date match: {snapshot_date}"
            )
        else:
            h.fail(
                "Music v2 JSON/history "
                "date mismatch: "
                f"json={snapshot_date or '-'}, "
                f"history={latest_history_date}"
            )


        history_point_mismatch = 0

        for history_row in latest_rows:

            artist = norm(
                history_row.get(
                    "artist"
                )
            )

            latest_row = ranking_map.get(
                artist
            )

            if latest_row is None:
                history_point_mismatch += 1
                continue


            try:
                history_point = float(
                    history_row.get(
                        "musicV2Point"
                    )
                    or 0
                )
            except Exception:
                history_point = 0.0


            try:
                latest_point = float(
                    latest_row.get(
                        "fandexMusicChartFinalPoint"
                    )
                    or 0
                )
            except Exception:
                latest_point = 0.0


            if abs(
                history_point
                - latest_point
            ) > 0.011:
                history_point_mismatch += 1


        if history_point_mismatch == 0:
            h.ok(
                "Music v2 latest/history "
                "score mismatch: 0"
            )
        else:
            h.fail(
                "Music v2 latest/history "
                "score mismatch: "
                f"{history_point_mismatch}"
            )


    # --------------------------------------------------------
    # Archive KEEP protection
    # --------------------------------------------------------

    archive_text = archive_file.read_text(
        encoding="utf-8-sig"
    )

    protected_names = [
        (
            "fandex_music_chart_ranking_"
            "v2_current_presence_latest.json"
        ),
        (
            "music_chart_current_presence_"
            "history_v2.csv"
        ),
        (
            "music_chart_current_presence_"
            "preview_v1_latest.csv"
        ),
        (
            "music_chart_current_presence_"
            "master_impact_preview_v1_latest.csv"
        ),
        (
            "music_chart_artist_candidates_"
            "v2_raw_latest.json"
        ),
        (
            "music_chart_bugs_all_targets_"
            "v1_latest.json"
        ),
        (
            "music_chart_check_history_v1.csv"
        ),
    ]


    missing_protection = [
        name
        for name in protected_names
        if f'"{name}"'
        not in archive_text
    ]


    if not missing_protection:
        h.ok(
            "Music v2 archive protection: "
            "configured"
        )
    else:
        h.fail(
            "Music v2 archive protection "
            "missing: "
            + ", ".join(
                missing_protection
            )
        )

'''

    text = text.replace(
        anchor,
        new_function + anchor,
        1,
    )


# ============================================================
# 2. Runner v6 Music v2 5단계 검증 추가
# ============================================================

music_runner_tokens = [
    (
        "music_chart_discover_"
        "artist_candidates_v2.py",
        "Music v2 Melon/Genie discovery",
    ),
    (
        "music_chart_discover_"
        "bugs_all_targets_v1.py",
        "Music v2 Bugs discovery",
    ),
    (
        "music_chart_check_history_v1.py",
        "Music v2 check history",
    ),
    (
        "music_chart_current_presence_"
        "preview_v1.py",
        "Music v2 current-presence preview",
    ),
    (
        "music_chart_current_presence_"
        "publish_v2.py",
        "Music v2 parallel publish",
    ),
]


if (
    '"Music v2 parallel publish"'
    not in text
):

    anchor = '''    required_tokens = [
        (
            "lastfm_sync_cloud_history_v1_1.py --apply",
            "Cloud history sync",
        ),
'''

    if anchor not in text:
        raise RuntimeError(
            "Runner required_tokens anchor "
            "not found."
        )


    music_block = '''    required_tokens = [
        (
            "music_chart_discover_artist_candidates_v2.py",
            "Music v2 Melon/Genie discovery",
        ),
        (
            "music_chart_discover_bugs_all_targets_v1.py",
            "Music v2 Bugs discovery",
        ),
        (
            "music_chart_check_history_v1.py",
            "Music v2 check history",
        ),
        (
            "music_chart_current_presence_preview_v1.py",
            "Music v2 current-presence preview",
        ),
        (
            "music_chart_current_presence_publish_v2.py",
            "Music v2 parallel publish",
        ),
        (
            "FANDEX Daily Python-Only Runner v6",
            "Runner v6",
        ),
        (
            "lastfm_sync_cloud_history_v1_1.py --apply",
            "Cloud history sync",
        ),
'''

    text = text.replace(
        anchor,
        music_block,
        1,
    )


# ============================================================
# 3. main() 호출 추가
# ============================================================

if (
    "    check_music_current_presence_parallel_v2(h)\n"
    not in text
):

    anchor = '''    check_music_v2(h)

    history = history_summary(h)
'''

    replacement = '''    check_music_v2(h)

    check_music_current_presence_parallel_v2(h)

    history = history_summary(h)
'''

    if anchor not in text:
        raise RuntimeError(
            "main Music check anchor "
            "not found."
        )

    text = text.replace(
        anchor,
        replacement,
        1,
    )


# ============================================================
# 4. scope 문구 업데이트
# ============================================================

old_scope = '''        "scope: Python-only / "
        "Cloud Last.fm + Rolling / "
        "no website export"
'''

new_scope = '''        "scope: Python-only / "
        "Music v2 Parallel + "
        "Cloud Last.fm + Rolling / "
        "no website export"
'''

if old_scope in text:
    text = text.replace(
        old_scope,
        new_scope,
        1,
    )


# ============================================================
# 5. 백업 + 저장
# ============================================================

if text == text_original:
    print(
        "NO CHANGE: already patched"
    )

else:

    shutil.copy2(
        TARGET,
        BACKUP,
    )

    TARGET.write_text(
        text,
        encoding="utf-8",
    )

    print("PATCH OK")
    print(
        f"backup: {BACKUP}"
    )


print(
    f"target: {TARGET}"
)
print(
    "MusicV2Health: CONFIGURED"
)
print(
    "RunnerV6Health: CONFIGURED"
)
print(
    "ArchiveProtectionHealth: CONFIGURED"
)
print(
    "masterModified: FALSE"
)
print(
    "websiteModified: FALSE"
)