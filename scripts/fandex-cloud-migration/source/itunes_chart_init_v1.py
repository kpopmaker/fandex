import csv
from pathlib import Path
from datetime import datetime


VERSION = "itunes_chart_init_v1"

IDENTITY_FILE = Path(
    "fandex_artist_identity_map_v1.csv"
)

OUTPUT_FILE = Path(
    "itunes_chart_seed_v1.csv"
)

PREVIEW_FILE = Path(
    "itunes_chart_seed_v1_preview.csv"
)

FIELDNAMES = [
    "artist",
    "itunesArtistId",
    "chartCountry",
    "chartName",
    "chartRank",
    "trackTitle",
    "trackId",
    "chartDate",
    "sourceType",
    "sourceUrl",
    "validationStatus",
    "validationWarnings",
]


def read_csv(path):
    if not path.exists():
        raise SystemExit(
            f"ERROR: 파일 없음: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        return list(
            csv.DictReader(f)
        )


def write_csv(path, rows):
    with path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=FIELDNAMES,
        )
        writer.writeheader()
        writer.writerows(rows)


def main():
    print()
    print("FANDEX iTunes Chart seed init v1")
    print("=" * 72)
    print(f"version: {VERSION}")
    print("mode: preview-first")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 72)

    identity_rows = read_csv(
        IDENTITY_FILE
    )

    if len(identity_rows) != 10:
        raise SystemExit(
            "ERROR: Identity Map row count가 "
            f"10이 아닙니다: {len(identity_rows)}"
        )

    output_rows = []

    seen_artists = set()
    seen_ids = set()

    for row in identity_rows:
        artist = str(
            row.get("artist")
            or ""
        ).strip()

        artist_id = str(
            row.get("itunesArtistId")
            or ""
        ).strip()

        verified = str(
            row.get("itunesVerified")
            or ""
        ).strip().upper()

        if not artist:
            raise SystemExit(
                "ERROR: artist 없음"
            )

        if not artist_id:
            raise SystemExit(
                f"ERROR: {artist} iTunes artistId 없음"
            )

        if verified != "TRUE":
            raise SystemExit(
                f"ERROR: {artist} iTunes identity 미검증"
            )

        if artist in seen_artists:
            raise SystemExit(
                f"ERROR: artist 중복: {artist}"
            )

        if artist_id in seen_ids:
            raise SystemExit(
                f"ERROR: iTunes artistId 중복: "
                f"{artist_id}"
            )

        seen_artists.add(artist)
        seen_ids.add(artist_id)

        output_rows.append({
            "artist": artist,
            "itunesArtistId": artist_id,
            "chartCountry": "",
            "chartName": "",
            "chartRank": "",
            "trackTitle": "",
            "trackId": "",
            "chartDate": "",
            "sourceType": "",
            "sourceUrl": "",
            "validationStatus": "pending_chart_data",
            "validationWarnings": "",
        })

    write_csv(
        PREVIEW_FILE,
        output_rows,
    )

    print()
    print("preview 생성")
    print("-" * 72)

    for row in output_rows:
        print(
            f"{row['artist']} | "
            f"artistId={row['itunesArtistId']} | "
            f"status={row['validationStatus']}"
        )

    print()
    print("=" * 72)
    print(f"rowCount: {len(output_rows)}")
    print(
        f"uniqueArtistIdCount: "
        f"{len(seen_ids)}"
    )
    print(
        f"preview: {PREVIEW_FILE}"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")

    if OUTPUT_FILE.exists():
        print()
        print(
            "INFO: 기존 itunes_chart_seed_v1.csv가 "
            "있어서 덮어쓰지 않았습니다."
        )
        print(
            "preview만 생성했습니다."
        )
        return

    write_csv(
        OUTPUT_FILE,
        output_rows,
    )

    print()
    print(
        f"seed 생성 완료: {OUTPUT_FILE}"
    )
    print(
        "현재 chartRank는 모두 비어 있으므로 "
        "점수화할 수 없습니다."
    )


if __name__ == "__main__":
    main()