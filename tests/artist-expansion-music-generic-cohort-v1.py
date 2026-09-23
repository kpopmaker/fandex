import csv
import importlib.util
import json
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def load_module(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


preview = load_module(
    "music_chart_current_presence_preview_v1",
    "scripts/fandex-cloud-migration/source/music_chart_current_presence_preview_v1.py",
)
publish = load_module(
    "music_chart_current_presence_publish_v2",
    "scripts/fandex-cloud-migration/source/music_chart_current_presence_publish_v2.py",
)


def main():
    artists = [f"artist-{i:02d}" for i in range(11)]

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)

        mg_json = tmp_path / "mg.json"
        bugs_json = tmp_path / "bugs.json"
        current_music_json = tmp_path / "current_music.json"
        preview_csv = tmp_path / "preview.csv"
        preview_report = tmp_path / "preview_report.txt"

        mg_candidates = []
        bugs_candidates = []
        for i, artist in enumerate(artists, start=1):
            mg_candidates.extend(
                [
                    {
                        "artist": artist,
                        "platform": "melon",
                        "rank": i,
                        "chartType": "daily",
                        "trackTitle": f"{artist}-melon",
                    },
                    {
                        "artist": artist,
                        "platform": "genie",
                        "rank": i + 1,
                        "chartType": "daily",
                        "trackTitle": f"{artist}-genie",
                    },
                ]
            )
            bugs_candidates.append(
                {
                    "artist": artist,
                    "platform": "bugs",
                    "rank": i + 2,
                    "chartType": "realtime",
                    "trackTitle": f"{artist}-bugs",
                }
            )

        mg_json.write_text(
            json.dumps({"candidates": mg_candidates}, ensure_ascii=False),
            encoding="utf-8",
        )
        bugs_json.write_text(
            json.dumps({"candidates": bugs_candidates}, ensure_ascii=False),
            encoding="utf-8",
        )
        current_music_json.write_text(
            json.dumps(
                {
                    "ranking": [
                        {
                            "artist": artist,
                            "fandexMusicChartFinalPoint": 0,
                        }
                        for artist in artists
                    ]
                },
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

        original_preview = {
            "MG_JSON": preview.MG_JSON,
            "BUGS_JSON": preview.BUGS_JSON,
            "CURRENT_MUSIC_JSON": preview.CURRENT_MUSIC_JSON,
            "OUTPUT_CSV": preview.OUTPUT_CSV,
            "REPORT": preview.REPORT,
        }
        preview.MG_JSON = mg_json
        preview.BUGS_JSON = bugs_json
        preview.CURRENT_MUSIC_JSON = current_music_json
        preview.OUTPUT_CSV = preview_csv
        preview.REPORT = preview_report
        try:
            preview.main()
        finally:
            for key, value in original_preview.items():
                setattr(preview, key, value)

        with preview_csv.open("r", encoding="utf-8-sig", newline="") as f:
            preview_rows = list(csv.DictReader(f))

        assert len(preview_rows) == 33
        assert {row["artist"] for row in preview_rows} == set(artists)

        history_meta = tmp_path / "history_meta.json"
        latest_json = tmp_path / "latest.json"
        history_csv = tmp_path / "history.csv"
        publish_report = tmp_path / "publish_report.txt"

        history_meta.write_text(
            json.dumps({"latestCheckDate": "2026-09-23"}),
            encoding="utf-8",
        )

        original_publish = {
            "PREVIEW_FILE": publish.PREVIEW_FILE,
            "CHECK_HISTORY_JSON": publish.CHECK_HISTORY_JSON,
            "LATEST_JSON": publish.LATEST_JSON,
            "HISTORY_FILE": publish.HISTORY_FILE,
            "REPORT_FILE": publish.REPORT_FILE,
        }
        publish.PREVIEW_FILE = preview_csv
        publish.CHECK_HISTORY_JSON = history_meta
        publish.LATEST_JSON = latest_json
        publish.HISTORY_FILE = history_csv
        publish.REPORT_FILE = publish_report
        try:
            publish.main()
        finally:
            for key, value in original_publish.items():
                setattr(publish, key, value)

        payload = json.loads(latest_json.read_text(encoding="utf-8"))
        assert len(payload["ranking"]) == 11
        assert {row["artist"] for row in payload["ranking"]} == set(artists)

    print("PASS: Music preview/publish supports 11-artist cohort")


if __name__ == "__main__":
    main()
