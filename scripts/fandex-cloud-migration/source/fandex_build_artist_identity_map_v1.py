import csv
import json
import sys
from datetime import datetime
from pathlib import Path


VERSION = "fandex_build_artist_identity_map_v1"

ARTIST_LIST_FILE = Path("artist_list.txt")

ITUNES_SEED_FILE = Path(
    "itunes_track_seed_v2.csv"
)
ITUNES_METADATA_FILE = Path(
    "itunes_track_metadata_v2_latest.csv"
)

LASTFM_SEED_FILE = Path(
    "lastfm_artist_seed_v2.csv"
)
LASTFM_METADATA_FILE = Path(
    "lastfm_artist_interest_v2_latest.csv"
)

MUSICBRAINZ_SEED_FILE = Path(
    "musicbrainz_artist_seed_v2.csv"
)
MUSICBRAINZ_METADATA_FILE = Path(
    "musicbrainz_artist_metadata_v2_latest.csv"
)


OUTPUT_CSV = Path(
    "fandex_artist_identity_map_v1.csv"
)
OUTPUT_JSON = Path(
    "fandex_artist_identity_map_latest.json"
)
OUTPUT_REPORT = Path(
    "FANDEX_ARTIST_IDENTITY_MAP_REPORT.txt"
)

PREVIEW_CSV = Path(
    "fandex_artist_identity_map_v1_preview.csv"
)
PREVIEW_JSON = Path(
    "fandex_artist_identity_map_preview.json"
)
PREVIEW_REPORT = Path(
    "FANDEX_ARTIST_IDENTITY_MAP_PREVIEW.txt"
)


FIELDNAMES = [
    "artist",
    "sourceCount",

    "itunesArtistName",
    "itunesArtistId",
    "itunesTrackName",
    "itunesTrackId",
    "itunesVerified",

    "lastfmName",
    "lastfmMbid",
    "lastfmListeners",
    "lastfmPlaycount",
    "lastfmVerified",

    "musicbrainzName",
    "musicbrainzMbid",
    "musicbrainzType",
    "musicbrainzCountry",
    "musicbrainzVerified",

    "lastfmMusicBrainzMbidMatch",

    "identityStatus",
    "identityWarnings",
]


def clean(value):
    return str(value or "").strip()


def normalize(value):
    return "".join(
        ch.casefold()
        for ch in clean(value)
        if ch.isalnum()
    )


def true_value(value):
    return clean(value).upper() == "TRUE"


def pick(row, *names):
    for name in names:
        if name not in row:
            continue

        value = clean(row.get(name))

        if value:
            return value

    return ""


def read_csv(path):
    if not path.exists():
        raise SystemExit(
            f"ERROR: 파일이 없습니다: {path}"
        )

    with path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as file:
        return list(csv.DictReader(file))


def read_artist_list():
    if not ARTIST_LIST_FILE.exists():
        raise SystemExit(
            f"ERROR: 파일이 없습니다: "
            f"{ARTIST_LIST_FILE}"
        )

    artists = []

    for line in ARTIST_LIST_FILE.read_text(
        encoding="utf-8-sig"
    ).splitlines():

        artist = line.strip()

        if artist and artist not in artists:
            artists.append(artist)

    if len(artists) != 10:
        raise SystemExit(
            "ERROR: artist_list.txt 아티스트 수가 "
            f"10명이 아닙니다. count={len(artists)}"
        )

    return artists


def index_by_artist(rows, label):
    result = {}

    for row in rows:
        artist = clean(
            row.get("artist")
        )

        if not artist:
            continue

        if artist in result:
            raise SystemExit(
                f"ERROR: {label} 중복 artist: "
                f"{artist}"
            )

        result[artist] = row

    return result


def check_all_artists(
    artist_order,
    index,
    label,
):
    missing = [
        artist
        for artist in artist_order
        if artist not in index
    ]

    if missing:
        raise SystemExit(
            f"ERROR: {label} 누락: "
            + ", ".join(missing)
        )


def build_itunes(
    artist,
    seed,
    metadata,
):
    artist_id = pick(
        seed,
        "artistId",
        "approvedArtistId",
        "seedArtistId",
    )

    track_id = pick(
        seed,
        "trackId",
        "approvedTrackId",
        "seedTrackId",
    )

    seed_artist_name = pick(
        seed,
        "approvedArtistName",
        "artistName",
        "query",
    )

    seed_track_name = pick(
        seed,
        "approvedTrackName",
        "trackName",
        "track",
    )

    metadata_artist_name = pick(
        metadata,
        "itunesArtistName",
        "returnedArtistName",
        "artistName",
    )

    metadata_track_name = pick(
        metadata,
        "itunesTrackName",
        "returnedTrackName",
        "trackName",
    )

    metadata_artist_id = pick(
        metadata,
        "artistId",
        "returnedArtistId",
        "itunesArtistId",
    )

    metadata_track_id = pick(
        metadata,
        "trackId",
        "returnedTrackId",
        "itunesTrackId",
    )

    artist_name = (
        metadata_artist_name
        or seed_artist_name
    )

    track_name = (
        metadata_track_name
        or seed_track_name
    )

    warnings = []

    checks = {
        "trackIdMatch": true_value(
            metadata.get("trackIdMatch")
        ),
        "artistIdMatch": true_value(
            metadata.get("artistIdMatch")
        ),
        "artistNameMatch": true_value(
            metadata.get("artistNameMatch")
        ),
        "trackNameMatch": true_value(
            metadata.get("trackNameMatch")
        ),
    }

    if not all(checks.values()):
        for name, passed in checks.items():
            if not passed:
                warnings.append(
                    f"ITUNES_{name.upper()}_FALSE"
                )

    if not artist_id:
        artist_id = metadata_artist_id

    if not track_id:
        track_id = metadata_track_id

    if (
        metadata_artist_id
        and artist_id
        and metadata_artist_id != artist_id
    ):
        warnings.append(
            "ITUNES_ARTIST_ID_VALUE_MISMATCH"
        )

    if (
        metadata_track_id
        and track_id
        and metadata_track_id != track_id
    ):
        warnings.append(
            "ITUNES_TRACK_ID_VALUE_MISMATCH"
        )

    verified = (
        bool(artist_id)
        and bool(track_id)
        and bool(artist_name)
        and all(checks.values())
    )

    return {
        "artistName": artist_name,
        "artistId": artist_id,
        "trackName": track_name,
        "trackId": track_id,
        "verified": verified,
        "warnings": warnings,
    }


def build_lastfm(
    artist,
    seed,
    metadata,
):
    lastfm_name = pick(
        metadata,
        "lastfmName",
        "returnedName",
        "name",
    )

    if not lastfm_name:
        lastfm_name = pick(
            seed,
            "approvedLastfmName",
            "query",
        )

    mbid = pick(
        metadata,
        "mbid",
        "lastfmMbid",
    )

    listeners = pick(
        metadata,
        "listeners",
    )

    playcount = pick(
        metadata,
        "playcount",
    )

    status_ok = (
        clean(
            metadata.get(
                "validationStatus"
            )
        ).lower()
        == "ok"
    )

    name_match = true_value(
        metadata.get(
            "lastfmNameMatch"
        )
    )

    warnings = []

    if not status_ok:
        warnings.append(
            "LASTFM_VALIDATION_STATUS"
        )

    if not name_match:
        warnings.append(
            "LASTFM_NAME_MATCH_FALSE"
        )

    try:
        listeners_ok = (
            int(
                float(
                    listeners.replace(
                        ",",
                        "",
                    )
                )
            )
            > 0
        )

    except (
        TypeError,
        ValueError,
        AttributeError,
    ):
        listeners_ok = False

    try:
        playcount_ok = (
            int(
                float(
                    playcount.replace(
                        ",",
                        "",
                    )
                )
            )
            > 0
        )

    except (
        TypeError,
        ValueError,
        AttributeError,
    ):
        playcount_ok = False

    if not listeners_ok:
        warnings.append(
            "LASTFM_LISTENERS_INVALID"
        )

    if not playcount_ok:
        warnings.append(
            "LASTFM_PLAYCOUNT_INVALID"
        )

    verified = (
        bool(lastfm_name)
        and status_ok
        and name_match
        and listeners_ok
        and playcount_ok
    )

    return {
        "name": lastfm_name,
        "mbid": mbid,
        "listeners": listeners,
        "playcount": playcount,
        "verified": verified,
        "warnings": warnings,
    }


def build_musicbrainz(
    artist,
    seed,
    metadata,
):
    name = pick(
        metadata,
        "musicbrainzName",
    )

    if not name:
        name = pick(
            seed,
            "approvedMusicBrainzName",
            "query",
        )

    mbid = pick(
        metadata,
        "musicbrainzMbid",
        "seedMbid",
    )

    if not mbid:
        mbid = pick(
            seed,
            "mbid",
        )

    artist_type = pick(
        metadata,
        "type",
    )

    country = pick(
        metadata,
        "country",
    )

    status_ok = (
        clean(
            metadata.get(
                "validationStatus"
            )
        ).lower()
        == "ok"
    )

    required_matches = {
        "mbidMatch": true_value(
            metadata.get("mbidMatch")
        ),
        "nameMatch": true_value(
            metadata.get("nameMatch")
        ),
        "typeMatch": true_value(
            metadata.get("typeMatch")
        ),
        "countryMatch": true_value(
            metadata.get("countryMatch")
        ),
    }

    warnings = []

    if not status_ok:
        warnings.append(
            "MUSICBRAINZ_VALIDATION_STATUS"
        )

    for name_key, passed in (
        required_matches.items()
    ):
        if not passed:
            warnings.append(
                "MUSICBRAINZ_"
                + name_key.upper()
                + "_FALSE"
            )

    verified = (
        bool(name)
        and bool(mbid)
        and status_ok
        and all(
            required_matches.values()
        )
    )

    return {
        "name": name,
        "mbid": mbid,
        "type": artist_type,
        "country": country,
        "verified": verified,
        "warnings": warnings,
    }


def compare_lastfm_mbid(
    lastfm_mbid,
    musicbrainz_mbid,
):
    lastfm_mbid = clean(
        lastfm_mbid
    )

    musicbrainz_mbid = clean(
        musicbrainz_mbid
    )

    if not lastfm_mbid:
        return "UNKNOWN", []

    if not musicbrainz_mbid:
        return "UNKNOWN", [
            "MUSICBRAINZ_MBID_MISSING"
        ]

    if (
        lastfm_mbid.casefold()
        == musicbrainz_mbid.casefold()
    ):
        return "TRUE", []

    return "FALSE", [
        "LASTFM_MBID_DIFFERS_FROM_MUSICBRAINZ"
    ]


def write_csv(path, rows):
    with path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as file:

        writer = csv.DictWriter(
            file,
            fieldnames=FIELDNAMES,
            extrasaction="ignore",
        )

        writer.writeheader()
        writer.writerows(rows)


def main():
    apply_mode = (
        "--apply" in sys.argv
    )

    artist_order = read_artist_list()

    itunes_seed = index_by_artist(
        read_csv(ITUNES_SEED_FILE),
        "iTunes seed",
    )

    itunes_metadata = index_by_artist(
        read_csv(ITUNES_METADATA_FILE),
        "iTunes metadata",
    )

    lastfm_seed = index_by_artist(
        read_csv(LASTFM_SEED_FILE),
        "Last.fm seed",
    )

    lastfm_metadata = index_by_artist(
        read_csv(LASTFM_METADATA_FILE),
        "Last.fm metadata",
    )

    musicbrainz_seed = index_by_artist(
        read_csv(MUSICBRAINZ_SEED_FILE),
        "MusicBrainz seed",
    )

    musicbrainz_metadata = index_by_artist(
        read_csv(
            MUSICBRAINZ_METADATA_FILE
        ),
        "MusicBrainz metadata",
    )

    source_indexes = [
        ("iTunes seed", itunes_seed),
        ("iTunes metadata", itunes_metadata),
        ("Last.fm seed", lastfm_seed),
        ("Last.fm metadata", lastfm_metadata),
        (
            "MusicBrainz seed",
            musicbrainz_seed,
        ),
        (
            "MusicBrainz metadata",
            musicbrainz_metadata,
        ),
    ]

    for label, index in source_indexes:
        check_all_artists(
            artist_order,
            index,
            label,
        )

    rows = []

    print()
    print(
        "FANDEX Artist Identity Map v1"
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
    print(
        f"artistCount: {len(artist_order)}"
    )
    print("sourceCount: 3")
    print(
        "scoreUsage: "
        "identity_metadata_only_not_fandex_score"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 76)

    for index, artist in enumerate(
        artist_order,
        start=1,
    ):
        itunes = build_itunes(
            artist,
            itunes_seed[artist],
            itunes_metadata[artist],
        )

        lastfm = build_lastfm(
            artist,
            lastfm_seed[artist],
            lastfm_metadata[artist],
        )

        musicbrainz = build_musicbrainz(
            artist,
            musicbrainz_seed[artist],
            musicbrainz_metadata[artist],
        )

        (
            cross_mbid_match,
            cross_warnings,
        ) = compare_lastfm_mbid(
            lastfm["mbid"],
            musicbrainz["mbid"],
        )

        warnings = (
            itunes["warnings"]
            + lastfm["warnings"]
            + musicbrainz["warnings"]
            + cross_warnings
        )

        # Last.fm MBID가 없는 것은 실패로 보지 않는다.
        # 세 소스 자체 검증이 모두 성공하면 identity는 정상.
        verified = (
            itunes["verified"]
            and lastfm["verified"]
            and musicbrainz["verified"]
        )

        identity_status = (
            "ok"
            if verified
            else "error"
        )

        row = {
            "artist": artist,
            "sourceCount": 3,

            "itunesArtistName": (
                itunes["artistName"]
            ),
            "itunesArtistId": (
                itunes["artistId"]
            ),
            "itunesTrackName": (
                itunes["trackName"]
            ),
            "itunesTrackId": (
                itunes["trackId"]
            ),
            "itunesVerified": (
                "TRUE"
                if itunes["verified"]
                else "FALSE"
            ),

            "lastfmName": (
                lastfm["name"]
            ),
            "lastfmMbid": (
                lastfm["mbid"]
            ),
            "lastfmListeners": (
                lastfm["listeners"]
            ),
            "lastfmPlaycount": (
                lastfm["playcount"]
            ),
            "lastfmVerified": (
                "TRUE"
                if lastfm["verified"]
                else "FALSE"
            ),

            "musicbrainzName": (
                musicbrainz["name"]
            ),
            "musicbrainzMbid": (
                musicbrainz["mbid"]
            ),
            "musicbrainzType": (
                musicbrainz["type"]
            ),
            "musicbrainzCountry": (
                musicbrainz["country"]
            ),
            "musicbrainzVerified": (
                "TRUE"
                if musicbrainz["verified"]
                else "FALSE"
            ),

            "lastfmMusicBrainzMbidMatch": (
                cross_mbid_match
            ),

            "identityStatus": (
                identity_status
            ),

            "identityWarnings": (
                " | ".join(warnings)
            ),
        }

        rows.append(row)

        print(
            f"[{index}/10] {artist} | "
            f"iTunes="
            f"{row['itunesVerified']} | "
            f"Last.fm="
            f"{row['lastfmVerified']} | "
            f"MusicBrainz="
            f"{row['musicbrainzVerified']} | "
            f"identity={identity_status}"
        )

    ok_count = sum(
        1
        for row in rows
        if (
            row["identityStatus"]
            == "ok"
        )
    )

    error_count = (
        len(rows) - ok_count
    )

    warning_count = sum(
        1
        for row in rows
        if clean(
            row["identityWarnings"]
        )
    )

    payload = {
        "version": VERSION,
        "createdAt": (
            datetime.now().isoformat(
                timespec="seconds"
            )
        ),
        "artistCount": len(rows),
        "sourceCount": 3,
        "okCount": ok_count,
        "errorCount": error_count,
        "warningArtistCount": (
            warning_count
        ),
        "scoreUsage": (
            "identity_metadata_only_not_fandex_score"
        ),
        "sources": [
            "iTunes",
            "Last.fm",
            "MusicBrainz",
        ],
        "masterModified": False,
        "websiteModified": False,
        "artists": rows,
    }

    report_lines = [
        "FANDEX Artist Identity Map Report",
        "=" * 76,
        f"createdAt: {payload['createdAt']}",
        f"version: {VERSION}",
        f"artistCount: {len(rows)}",
        "sourceCount: 3",
        "",
        "아티스트 identity 결과",
        "-" * 76,
    ]

    for row in rows:
        report_lines.append(
            f"{row['artist']} | "
            f"status={row['identityStatus']} | "
            f"iTunes={row['itunesVerified']} | "
            f"Last.fm={row['lastfmVerified']} | "
            f"MusicBrainz="
            f"{row['musicbrainzVerified']} | "
            f"MBID="
            f"{row['musicbrainzMbid']}"
        )

        if row["identityWarnings"]:
            report_lines.append(
                "  warning: "
                + row[
                    "identityWarnings"
                ]
            )

    report_lines.extend(
        [
            "",
            "요약",
            "-" * 76,
            f"okCount: {ok_count}",
            f"errorCount: {error_count}",
            (
                "warningArtistCount: "
                f"{warning_count}"
            ),
            (
                "scoreUsage: "
                "identity_metadata_only_not_fandex_score"
            ),
            "masterModified: FALSE",
            "websiteModified: FALSE",
            "",
            "주의",
            "-" * 76,
            (
                "- Identity Map은 아티스트 "
                "식별용 메타데이터 계층이다."
            ),
            (
                "- 현재 FANDEX Master 점수에는 "
                "합산하지 않는다."
            ),
            (
                "- 웹사이트 public/data를 "
                "수정하지 않는다."
            ),
            (
                "- Last.fm MBID가 비어 있는 것은 "
                "오류로 처리하지 않는다."
            ),
        ]
    )

    if apply_mode:
        csv_path = OUTPUT_CSV
        json_path = OUTPUT_JSON
        report_path = OUTPUT_REPORT

    else:
        csv_path = PREVIEW_CSV
        json_path = PREVIEW_JSON
        report_path = PREVIEW_REPORT

    write_csv(
        csv_path,
        rows,
    )

    json_path.write_text(
        json.dumps(
            payload,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    report_path.write_text(
        "\n".join(report_lines),
        encoding="utf-8",
    )

    print()
    print("=" * 76)
    print(
        "Artist Identity Map 생성 완료"
    )
    print("=" * 76)
    print(f"결과 수: {len(rows)}")
    print(f"정상: {ok_count}")
    print(f"오류: {error_count}")
    print(
        f"경고 아티스트: "
        f"{warning_count}"
    )
    print(f"CSV: {csv_path}")
    print(f"JSON: {json_path}")
    print(f"리포트: {report_path}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")

    if not apply_mode:
        print()
        print("실제 적용:")
        print(
            "py "
            "fandex_build_artist_identity_map_v1.py "
            "--apply"
        )


if __name__ == "__main__":
    main()