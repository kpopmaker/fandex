import csv
import sys
from pathlib import Path


VERSION = "musicbrainz_build_approved_seed_v2"

OLD_METADATA = Path(
    "musicbrainz_artist_metadata_v1_latest.csv"
)

CANDIDATES = Path(
    "musicbrainz_artist_candidates_v2_latest.csv"
)

OUTPUT = Path(
    "musicbrainz_artist_seed_v2.csv"
)

PREVIEW = Path(
    "musicbrainz_artist_seed_v2_preview.csv"
)


ARTIST_ORDER = [
    "아이유",
    "에스파",
    "에이티즈",
    "보이넥스트도어",
    "아이브",
    "르세라핌",
    "뉴진스",
    "세븐틴",
    "스트레이키즈",
    "투모로우바이투게더",
]


CONFIG = {
    "아이유": {
        "query": "IU",
        "expectedCountry": "KR",
        "expectedType": "Person",
        "aliases": "IU|아이유",
    },
    "에스파": {
        "query": "aespa",
        "expectedCountry": "KR",
        "expectedType": "Group",
        "aliases": "aespa|에스파",
    },
    "에이티즈": {
        "query": "ATEEZ",
        "expectedCountry": "KR",
        "expectedType": "Group",
        "aliases": "ATEEZ|에이티즈",
    },
    "보이넥스트도어": {
        "query": "BOYNEXTDOOR",
        "expectedCountry": "KR",
        "expectedType": "Group",
        "aliases": "BOYNEXTDOOR|보이넥스트도어",
    },
    "아이브": {
        "query": "IVE",
        "expectedCountry": "KR",
        "expectedType": "Group",
        "aliases": "IVE|아이브",
    },
    "르세라핌": {
        "query": "LE SSERAFIM",
        "expectedCountry": "KR",
        "expectedType": "Group",
        "aliases": "LE SSERAFIM|르세라핌",
    },
    "뉴진스": {
        "query": "NewJeans",
        "expectedCountry": "KR",
        "expectedType": "Group",
        "aliases": "NewJeans|뉴진스",
    },
    "세븐틴": {
        "query": "SEVENTEEN",
        "expectedCountry": "KR",
        "expectedType": "Group",
        "aliases": "SEVENTEEN|세븐틴",
    },
    "스트레이키즈": {
        "query": "Stray Kids",
        "expectedCountry": "KR",
        "expectedType": "Group",
        "aliases": "Stray Kids|스트레이키즈",
    },
    "투모로우바이투게더": {
        "query": "TOMORROW X TOGETHER",
        "expectedCountry": "KR",
        "expectedType": "Group",
        "aliases": (
            "TOMORROW X TOGETHER|TXT|"
            "투모로우바이투게더"
        ),
    },
}


LEGACY_ARTISTS = {
    "아이유",
    "에스파",
    "에이티즈",
    "보이넥스트도어",
}


FIELDNAMES = [
    "artist",
    "query",
    "mbid",
    "approvedMusicBrainzName",
    "expectedCountry",
    "expectedType",
    "aliases",
    "approvalSource",
    "memo",
]


def read_csv(path):
    if not path.exists():
        raise SystemExit(
            f"ERROR: 파일이 없습니다: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        return list(csv.DictReader(f))


def clean(value):
    return str(value or "").strip()


def load_legacy():
    rows = read_csv(OLD_METADATA)

    result = {}

    for row in rows:
        artist = clean(row.get("artist"))

        if artist not in LEGACY_ARTISTS:
            continue

        status = clean(
            row.get("status")
        ).lower()

        mbid = clean(
            row.get("mbid")
        )

        name = clean(
            row.get("musicbrainzName")
        )

        country = clean(
            row.get("country")
        ).upper()

        artist_type = clean(
            row.get("type")
        )

        if status != "ok":
            raise SystemExit(
                f"ERROR: 기존 검증 실패: {artist}"
            )

        if not mbid:
            raise SystemExit(
                f"ERROR: 기존 MBID 없음: {artist}"
            )

        expected = CONFIG[artist]

        if (
            country
            != expected["expectedCountry"]
        ):
            raise SystemExit(
                f"ERROR: 기존 country 불일치: "
                f"{artist} / {country}"
            )

        if (
            artist_type.casefold()
            != expected["expectedType"].casefold()
        ):
            raise SystemExit(
                f"ERROR: 기존 type 불일치: "
                f"{artist} / {artist_type}"
            )

        result[artist] = {
            "mbid": mbid,
            "name": name,
        }

    missing = (
        LEGACY_ARTISTS
        - set(result)
    )

    if missing:
        raise SystemExit(
            "ERROR: 기존 4명 누락: "
            + ", ".join(sorted(missing))
        )

    return result


def load_new_candidates():
    rows = read_csv(CANDIDATES)

    new_artists = (
        set(ARTIST_ORDER)
        - LEGACY_ARTISTS
    )

    result = {}

    for artist in new_artists:
        matches = []

        for row in rows:
            if clean(
                row.get("artist")
            ) != artist:
                continue

            if (
                clean(
                    row.get("exactNameMatch")
                ).upper()
                != "TRUE"
            ):
                continue

            if (
                clean(
                    row.get("countryMatch")
                ).upper()
                != "TRUE"
            ):
                continue

            if (
                clean(
                    row.get("typeMatch")
                ).upper()
                != "TRUE"
            ):
                continue

            matches.append(row)

        if len(matches) != 1:
            raise SystemExit(
                f"ERROR: {artist} fullMatch 후보가 "
                f"{len(matches)}개입니다."
            )

        row = matches[0]

        mbid = clean(
            row.get("mbid")
        )

        name = clean(
            row.get("musicbrainzName")
        )

        if not mbid or not name:
            raise SystemExit(
                f"ERROR: {artist} MBID/name 없음"
            )

        result[artist] = {
            "mbid": mbid,
            "name": name,
        }

    return result


def build_rows():
    legacy = load_legacy()
    new = load_new_candidates()

    approved = {
        **legacy,
        **new,
    }

    rows = []

    for artist in ARTIST_ORDER:
        config = CONFIG[artist]
        identity = approved.get(artist)

        if not identity:
            raise SystemExit(
                f"ERROR: 승인 identity 없음: "
                f"{artist}"
            )

        source = (
            "legacy_v1_verified"
            if artist in LEGACY_ARTISTS
            else "v2_candidate_fullmatch"
        )

        rows.append(
            {
                "artist": artist,
                "query": config["query"],
                "mbid": identity["mbid"],
                "approvedMusicBrainzName": (
                    identity["name"]
                ),
                "expectedCountry": (
                    config["expectedCountry"]
                ),
                "expectedType": (
                    config["expectedType"]
                ),
                "aliases": config["aliases"],
                "approvalSource": source,
                "memo": (
                    "approved MusicBrainz identity"
                ),
            }
        )

    if len(rows) != 10:
        raise SystemExit(
            f"ERROR: row count={len(rows)}"
        )

    mbids = [
        row["mbid"]
        for row in rows
    ]

    if len(set(mbids)) != 10:
        raise SystemExit(
            "ERROR: 중복 MBID가 있습니다."
        )

    return rows


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
    apply_mode = "--apply" in sys.argv

    rows = build_rows()

    target = (
        OUTPUT
        if apply_mode
        else PREVIEW
    )

    write_csv(
        target,
        rows,
    )

    print()
    print(
        "FANDEX MusicBrainz approved seed v2"
    )
    print("=" * 76)
    print(f"version: {VERSION}")
    print(
        "mode: "
        + (
            "APPLY"
            if apply_mode
            else "DRY-RUN"
        )
    )
    print(f"rowCount: {len(rows)}")
    print("problemCount: 0")
    print("legacyV1Modified: FALSE")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("-" * 76)

    for row in rows:
        print(
            f"{row['artist']} | "
            f"{row['approvedMusicBrainzName']} | "
            f"MBID={row['mbid']} | "
            f"{row['expectedType']} | "
            f"{row['expectedCountry']} | "
            f"{row['approvalSource']}"
        )

    print("-" * 76)
    print(f"output: {target}")

    if not apply_mode:
        print()
        print("실제 적용:")
        print(
            "py musicbrainz_build_approved_"
            "seed_v2.py --apply"
        )


if __name__ == "__main__":
    main()