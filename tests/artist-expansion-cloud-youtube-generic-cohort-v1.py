import csv
import importlib.util
import io
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


master = load_module(
    "fandex_master_score_v10",
    "scripts/fandex-cloud-migration/source/fandex_master_score_v10.py",
)
runner = load_module(
    "fandex_cloud_runner_v1",
    "scripts/fandex-cloud-v10/fandex_cloud_runner_v1.py",
)


class FakeResponse:
    def __init__(self, text):
        self._text = text

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return self._text.encode("utf-8")


def make_json(path, rows):
    path.write_text(
        json.dumps({"ranking": rows}, ensure_ascii=False),
        encoding="utf-8",
    )


def main():
    artists = [f"artist-{i:02d}" for i in range(11)]

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)

        naver = tmp_path / "naver.json"
        youtube = tmp_path / "youtube.json"
        music = tmp_path / "music.json"
        lastfm_csv = tmp_path / "lastfm.csv"
        lastfm_json = tmp_path / "lastfm.json"
        master_out = tmp_path / "master.json"
        reports_out = tmp_path / "reports.json"
        audit_out = tmp_path / "audit.csv"
        report_out = tmp_path / "report.txt"
        backup_dir = tmp_path / "backup"

        make_json(
            naver,
            [{"artist": artist, "fandexNaverFinalPoint": i + 1} for i, artist in enumerate(artists)],
        )
        make_json(
            youtube,
            [{"artist": artist, "youtubePoint": (i + 1) * 2} for i, artist in enumerate(artists)],
        )
        make_json(
            music,
            [{"artist": artist, "musicChartFinalPoint": (i + 1) * 3} for i, artist in enumerate(artists)],
        )

        with lastfm_csv.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=["artist", "rollingCombinedPreviewPoint"])
            writer.writeheader()
            for i, artist in enumerate(artists):
                writer.writerow(
                    {
                        "artist": artist,
                        "rollingCombinedPreviewPoint": (i + 1) * 4,
                    }
                )

        lastfm_json.write_text(
            json.dumps({"activeMode": "rolling3_50_rolling7_50"}),
            encoding="utf-8",
        )

        original = {
            "NAVER": master.NAVER,
            "YOUTUBE": master.YOUTUBE,
            "MUSIC": master.MUSIC,
            "LASTFM_CSV": master.LASTFM_CSV,
            "LASTFM_JSON": master.LASTFM_JSON,
            "MASTER": master.MASTER,
            "REPORTS": master.REPORTS,
            "AUDIT": master.AUDIT,
            "REPORT": master.REPORT,
            "PREVIOUS_BACKUP": master.PREVIOUS_BACKUP,
        }

        master.NAVER = naver
        master.YOUTUBE = youtube
        master.MUSIC = music
        master.LASTFM_CSV = lastfm_csv
        master.LASTFM_JSON = lastfm_json
        master.MASTER = master_out
        master.REPORTS = reports_out
        master.AUDIT = audit_out
        master.REPORT = report_out
        master.PREVIOUS_BACKUP = backup_dir
        try:
            master.main()
        finally:
            for key, value in original.items():
                setattr(master, key, value)

        payload = json.loads(master_out.read_text(encoding="utf-8"))
        assert len(payload["ranking"]) == 11
        assert {row["artist"] for row in payload["ranking"]} == set(artists)

        rows = []
        for snapshot_date, multiplier in [
            ("2026-09-22", 1),
            ("2026-09-23", 2),
        ]:
            for i, artist in enumerate(artists):
                rows.append(
                    {
                        "snapshotDate": snapshot_date,
                        "artist": artist,
                        "lastfmName": artist,
                        "listeners": str(1000 + multiplier * (i + 1)),
                        "playcount": str(10000 + multiplier * (i + 1) * 10),
                        "collectedAt": "2026-09-23T00:00:00+00:00",
                    }
                )

        buf = io.StringIO()
        writer = csv.DictWriter(
            buf,
            fieldnames=[
                "snapshotDate",
                "artist",
                "lastfmName",
                "listeners",
                "playcount",
                "collectedAt",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)

        original_urlopen = runner.urllib.request.urlopen
        original_local = runner.LASTFM_LOCAL
        runner.urllib.request.urlopen = lambda *args, **kwargs: FakeResponse(buf.getvalue())
        runner.LASTFM_LOCAL = tmp_path / "lastfm_bootstrap.csv"
        try:
            runner.bootstrap_lastfm_history()
        finally:
            runner.urllib.request.urlopen = original_urlopen
            runner.LASTFM_LOCAL = original_local

        with (tmp_path / "lastfm_bootstrap.csv").open(
            "r", encoding="utf-8-sig", newline=""
        ) as f:
            bootstrap_rows = list(csv.DictReader(f))
        assert len(bootstrap_rows) == 22
        assert {row["artist"] for row in bootstrap_rows} == set(artists)

    print("PASS: Cloud master + YouTube parity + runner support 11 artists")


if __name__ == "__main__":
    main()
