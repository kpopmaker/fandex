import csv
import importlib.util
import json
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_module(name, relative):
    spec = importlib.util.spec_from_file_location(
        name,
        ROOT / relative,
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


master = load_module(
    "youtube_lineage_master",
    "scripts/fandex-cloud-migration/source/"
    "fandex_master_score_v10.py",
)


LINEAGE = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "youtube_v3_lineage_status_v1.json"
)
NAVER = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "fandex_naver_ranking_v3_latest.json"
)
YOUTUBE = (
    ROOT
    / "data/fandex-cloud-v10/seed/"
    "fandex_youtube_ranking_v3_latest.json"
)


def read_json(path):
    return json.loads(
        path.read_text(encoding="utf-8-sig")
    )


def write_json(path, payload):
    path.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


def main():
    lineage = read_json(LINEAGE)
    naver = read_json(NAVER)
    youtube = read_json(YOUTUBE)

    frozen_names = {
        row["artist"]
        for row in lineage[
            "activeProductState"
        ]["canonicalArtists"]
    }
    naver_names = {
        row["artist"]
        for row in naver["ranking"]
    }
    youtube_names = {
        row["artist"]
        for row in youtube["ranking"]
    }

    assert len(frozen_names) == 10
    assert naver_names == frozen_names
    assert youtube_names == frozen_names

    expansion = lineage[
        "productExpansion"
    ]
    assert expansion["eligibility"] == (
        "blocked_incomplete_legacy_scale_lineage"
    )
    assert (
        expansion[
            "expandedOrChangedYoutubeCohortAllowed"
        ]
        is False
    )
    assert (
        lineage["recoveredPipeline"][
            "originalRawSeedFileRecovered"
        ]
        is False
    )
    assert (
        lineage["recoveredPipeline"][
            "originalRawMetricsRecovered"
        ]
        is False
    )
    assert set(
        lineage["legacyLineage"][
            "knownIncompleteBaselineCanonicalArtistIds"
        ]
    ) == {
        "iu",
        "aespa",
        "ateez",
        "boynextdoor",
    }
    assert (
        lineage["legacyLineage"][
            "comparabilityThresholdDefined"
        ]
        is False
    )

    reviewed = lineage[
        "newReviewedSeedEvidence"
    ]
    assert reviewed["approvedVideoCount"] == 27
    assert reviewed["approvedArtistCount"] == 11
    assert reviewed[
        "unresolvedCanonicalArtistIds"
    ] == []
    assert set(
        reviewed[
            "approvedCanonicalArtistIds"
        ]
    ) == {
        "bts",
        "blackpink",
        "twice",
        "enhypen",
        "jungkook",
        "jimin",
        "v",
        "jennie",
        "lisa",
        "rose",
        "riize",
    }
    assert reviewed["vEvidence"][
        "videoId"
    ] == "sY19m7EZTw4"
    assert reviewed["vEvidence"][
        "channelTitle"
    ] == "BANGTANTV"

    full_shadow = lineage[
        "fullReviewedCohortShadow"
    ]
    assert full_shadow["targetArtistCount"] == 21
    assert full_shadow["reviewedSeedVideoCount"] == 74
    assert full_shadow["historicalRecoveredArtistCount"] == 10
    assert full_shadow["currentReviewedArtistCount"] == 11
    assert full_shadow["historicalLineageComplete"] is False
    assert (
        full_shadow[
            "commonSeedSelectionPolicyEstablished"
        ]
        is False
    )
    assert full_shadow["rebaselineAuthorized"] is False
    assert (
        lineage["productExpansion"][
            "nextDecisionBoundary"
        ]["type"]
        == "youtube_full_cohort_rebaseline_policy"
    )

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)

        expanded_naver = json.loads(
            json.dumps(naver)
        )
        expanded_youtube = json.loads(
            json.dumps(youtube)
        )

        expanded_naver["ranking"].append({
            "artist": "방탄소년단",
            "cumulativePoint": 1.0,
        })
        expanded_youtube["ranking"].append({
            "artist": "방탄소년단",
            "youtubePoint": 1.0,
        })

        naver_path = tmp_path / "naver.json"
        youtube_path = tmp_path / "youtube.json"
        music_path = tmp_path / "music.json"
        lastfm_csv = tmp_path / "lastfm.csv"
        master_path = tmp_path / "master.json"
        reports_path = tmp_path / "reports.json"
        audit_path = tmp_path / "audit.csv"
        report_path = tmp_path / "report.txt"
        backup_path = tmp_path / "backup"

        write_json(
            naver_path,
            expanded_naver,
        )
        write_json(
            youtube_path,
            expanded_youtube,
        )
        write_json(
            music_path,
            {
                "ranking": [{
                    "artist": "아이유",
                    "fandexMusicChartFinalPoint": 1.0,
                }]
            },
        )

        with lastfm_csv.open(
            "w",
            encoding="utf-8",
            newline="",
        ) as file:
            writer = csv.DictWriter(
                file,
                fieldnames=[
                    "artist",
                    "rollingCombinedPreviewPoint",
                    "activeMode",
                    "status",
                ],
            )
            writer.writeheader()
            writer.writerow({
                "artist": "아이유",
                "rollingCombinedPreviewPoint": "1.0",
                "activeMode":
                    "rolling3_50_rolling7_50",
                "status": "ok",
            })

        originals = {
            "NAVER": master.NAVER,
            "YOUTUBE": master.YOUTUBE,
            "MUSIC": master.MUSIC,
            "LASTFM_CSV": master.LASTFM_CSV,
            "MASTER": master.MASTER,
            "REPORTS": master.REPORTS,
            "AUDIT": master.AUDIT,
            "REPORT": master.REPORT,
            "PREVIOUS_BACKUP":
                master.PREVIOUS_BACKUP,
            "YOUTUBE_LINEAGE_STATUS":
                master.YOUTUBE_LINEAGE_STATUS,
        }

        master.NAVER = naver_path
        master.YOUTUBE = youtube_path
        master.MUSIC = music_path
        master.LASTFM_CSV = lastfm_csv
        master.MASTER = master_path
        master.REPORTS = reports_path
        master.AUDIT = audit_path
        master.REPORT = report_path
        master.PREVIOUS_BACKUP = backup_path
        master.YOUTUBE_LINEAGE_STATUS = (
            LINEAGE
        )

        try:
            master.main()
            raise AssertionError(
                "expected YouTube lineage expansion block"
            )
        except RuntimeError as exc:
            message = str(exc)
            assert (
                "YouTube Product cohort expansion blocked "
                "by lineage status"
                in message
            )
            assert (
                "blocked_incomplete_legacy_scale_lineage"
                in message
            )
            assert "방탄소년단" in message
        finally:
            for key, value in originals.items():
                setattr(
                    master,
                    key,
                    value,
                )

    print(
        "PASS: frozen YouTube Product 10 lineage is locked, "
        "and an otherwise NAVER/YouTube-parity expansion is "
        "fail-closed until comparable YouTube lineage is approved"
    )


if __name__ == "__main__":
    main()
