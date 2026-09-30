import csv
import importlib.util
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
    bindings = {"Artist A": "canonical-a"}

    assert (
        preview.resolve_row_canonical_id(
            {"artist": "Artist A"},
            bindings,
        )
        == "canonical-a"
    )

    try:
        preview.resolve_row_canonical_id(
            {
                "canonicalArtistId": "wrong-id",
                "artist": "Artist A",
            },
            bindings,
        )
        raise AssertionError(
            "expected Music candidate canonical mismatch rejection"
        )
    except RuntimeError as exc:
        assert "canonicalArtistId mismatch" in str(exc)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_path = Path(tmp)
        history = tmp_path / "history.csv"

        with history.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=[
                    "snapshotDate",
                    "checkedAt",
                    "artist",
                    "musicV2Point",
                    "rankedPlatformCount",
                    "version",
                ],
            )
            writer.writeheader()
            writer.writerow(
                {
                    "snapshotDate": "2026-09-29",
                    "checkedAt": "2026-09-29T12:00:00",
                    "artist": "Artist A",
                    "musicV2Point": "10",
                    "rankedPlatformCount": "1",
                    "version": "legacy",
                }
            )

        original_history = publish.HISTORY_FILE
        publish.HISTORY_FILE = history
        try:
            publish.write_history(
                [
                    {
                        "snapshotDate": "2026-09-30",
                        "checkedAt": "2026-09-30T12:00:00",
                        "canonicalArtistId": "canonical-a",
                        "artist": "Artist A",
                        "musicV2Point": "20",
                        "rankedPlatformCount": "2",
                        "version": "current",
                    }
                ],
                bindings,
            )
        finally:
            publish.HISTORY_FILE = original_history

        with history.open(
            "r",
            encoding="utf-8-sig",
            newline="",
        ) as f:
            rows = list(csv.DictReader(f))

        assert len(rows) == 2
        assert {
            row["canonicalArtistId"]
            for row in rows
        } == {"canonical-a"}

        with history.open("w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=publish.HISTORY_FIELDS,
            )
            writer.writeheader()
            writer.writerow(
                {
                    "snapshotDate": "2026-09-29",
                    "checkedAt": "2026-09-29T12:00:00",
                    "canonicalArtistId": "wrong-id",
                    "artist": "Artist A",
                    "musicV2Point": "10",
                    "rankedPlatformCount": "1",
                    "version": "legacy",
                }
            )

        original_history = publish.HISTORY_FILE
        publish.HISTORY_FILE = history
        try:
            try:
                publish.write_history([], bindings)
                raise AssertionError(
                    "expected Music history canonical mismatch rejection"
                )
            except RuntimeError as exc:
                assert "canonicalArtistId mismatch" in str(exc)
        finally:
            publish.HISTORY_FILE = original_history

    print(
        "PASS: Music canonical identity backfills legacy history "
        "and fails closed on mismatches"
    )


if __name__ == "__main__":
    main()
