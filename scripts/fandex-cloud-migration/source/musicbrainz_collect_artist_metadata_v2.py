import csv
import json
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path


VERSION = "musicbrainz_collect_artist_metadata_v2_verified_10_artists"

BASE_URL = "https://musicbrainz.org/ws/2"

USER_AGENT = (
    "FANDEXPythonCollector/2.0 "
    "(local prototype; artist identity metadata research)"
)

SEED_FILE = Path(
    "musicbrainz_artist_seed_v2.csv"
)

LATEST_CSV = Path(
    "musicbrainz_artist_metadata_v2_latest.csv"
)

LATEST_JSON = Path(
    "fandex_musicbrainz_artist_metadata_v2_latest.json"
)

LATEST_REPORT = Path(
    "FANDEX_MUSICBRAINZ_COLLECTOR_V2_REPORT.txt"
)


CSV_FIELDS = [
    "artist",
    "query",
    "approvedMusicBrainzName",
    "seedMbid",
    "musicbrainzName",
    "musicbrainzMbid",
    "mbidMatch",
    "nameMatch",
    "nameExactMatch",
    "type",
    "expectedType",
    "typeMatch",
    "country",
    "expectedCountry",
    "countryMatch",
    "area",
    "beginDate",
    "endDate",
    "disambiguation",
    "aliasesPreview",
    "tagsPreview",
    "releaseGroupCount",
    "releaseGroup1",
    "releaseGroupsPreview",
    "validationStatus",
    "validationWarnings",
    "approvalSource",
    "memo",
]


def clean(value):
    return str(value or "").strip()


def normalize(value):
    return "".join(
        ch.casefold()
        for ch in clean(value)
        if ch.isalnum()
    )


def read_seed():
    if not SEED_FILE.exists():
        raise SystemExit(
            f"ERROR: seed 파일이 없습니다: {SEED_FILE}"
        )

    with SEED_FILE.open(
        "r",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        rows = list(csv.DictReader(f))

    if len(rows) != 10:
        raise SystemExit(
            f"ERROR: seed row count={len(rows)} / expected=10"
        )

    required = {
        "artist",
        "query",
        "mbid",
        "approvedMusicBrainzName",
        "expectedCountry",
        "expectedType",
        "aliases",
        "approvalSource",
        "memo",
    }

    missing_columns = required - set(
        rows[0].keys() if rows else []
    )

    if missing_columns:
        raise SystemExit(
            "ERROR: seed 필수 컬럼 누락: "
            + ", ".join(sorted(missing_columns))
        )

    seen_artists = set()
    seen_mbids = set()

    normalized_rows = []

    for row in rows:
        artist = clean(row.get("artist"))
        mbid = clean(row.get("mbid"))

        if not artist or not mbid:
            raise SystemExit(
                "ERROR: artist 또는 mbid가 비어 있습니다."
            )

        if artist in seen_artists:
            raise SystemExit(
                f"ERROR: 중복 artist: {artist}"
            )

        if mbid in seen_mbids:
            raise SystemExit(
                f"ERROR: 중복 MBID: {mbid}"
            )

        seen_artists.add(artist)
        seen_mbids.add(mbid)

        normalized_rows.append(
            {
                key: clean(value)
                for key, value in row.items()
            }
        )

    return normalized_rows


def fetch_json(path, params=None, retries=4):
    params = params or {}

    query = urllib.parse.urlencode(params)

    url = f"{BASE_URL}{path}"

    if query:
        url += f"?{query}"

    last_error = None

    for attempt in range(1, retries + 1):
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json",
            },
        )

        try:
            with urllib.request.urlopen(
                request,
                timeout=30,
            ) as response:
                body = response.read().decode(
                    "utf-8"
                )

            return json.loads(body), url

        except urllib.error.HTTPError as exc:
            last_error = exc

            if exc.code not in {
                429,
                500,
                502,
                503,
                504,
            }:
                raise

        except (
            urllib.error.URLError,
            TimeoutError,
        ) as exc:
            last_error = exc

        if attempt < retries:
            wait_seconds = (
                2.0 * attempt
            )

            print(
                f"    재시도 {attempt}/{retries} "
                f"/ {wait_seconds:.1f}초 대기"
            )

            time.sleep(wait_seconds)

    raise RuntimeError(
        f"MusicBrainz 요청 실패: {last_error}"
    )


def aliases_from_seed(seed):
    values = [
        seed["approvedMusicBrainzName"],
        seed["query"],
    ]

    aliases = clean(
        seed.get("aliases")
    )

    if aliases:
        values.extend(
            value.strip()
            for value in aliases.split("|")
            if value.strip()
        )

    return list(
        dict.fromkeys(values)
    )


def artist_name_values(payload):
    values = [
        clean(payload.get("name")),
        clean(payload.get("sort-name")),
    ]

    for alias in payload.get("aliases") or []:
        if not isinstance(alias, dict):
            continue

        name = clean(
            alias.get("name")
        )

        if name:
            values.append(name)

    return list(
        dict.fromkeys(
            value
            for value in values
            if value
        )
    )


def validate_name(seed, payload):
    approved_values = aliases_from_seed(seed)
    returned_values = artist_name_values(
        payload
    )

    approved_norm = {
        normalize(value)
        for value in approved_values
        if normalize(value)
    }

    returned_norm = {
        normalize(value)
        for value in returned_values
        if normalize(value)
    }

    exact = bool(
        approved_norm.intersection(
            returned_norm
        )
    )

    if exact:
        return True, True

    for approved in approved_norm:
        for returned in returned_norm:
            if (
                approved
                and returned
                and (
                    approved in returned
                    or returned in approved
                )
            ):
                return True, False

    return False, False


def area_name(payload):
    area = payload.get("area") or {}

    if isinstance(area, dict):
        return clean(
            area.get("name")
        )

    return ""


def life_span_value(payload, key):
    life_span = (
        payload.get("life-span") or {}
    )

    if isinstance(life_span, dict):
        return clean(
            life_span.get(key)
        )

    return ""


def aliases_preview(payload):
    values = []

    for alias in payload.get("aliases") or []:
        if not isinstance(alias, dict):
            continue

        name = clean(
            alias.get("name")
        )

        if name and name not in values:
            values.append(name)

    return " | ".join(
        values[:10]
    )


def tags_preview(payload):
    tags = []

    for tag in payload.get("tags") or []:
        if not isinstance(tag, dict):
            continue

        name = clean(
            tag.get("name")
        )

        count = tag.get("count")

        if not name:
            continue

        try:
            count_number = int(count or 0)
        except (
            TypeError,
            ValueError,
        ):
            count_number = 0

        tags.append(
            (
                count_number,
                name,
            )
        )

    tags.sort(
        reverse=True
    )

    return " | ".join(
        name
        for _, name in tags[:10]
    )


def collect_artist(mbid):
    path = f"/artist/{mbid}"

    params = {
        "fmt": "json",
        "inc": "aliases+tags",
    }

    return fetch_json(
        path,
        params,
    )


def collect_release_groups(mbid):
    params = {
        "artist": mbid,
        "fmt": "json",
        "limit": 10,
    }

    payload, url = fetch_json(
        "/release-group",
        params,
    )

    groups = (
        payload.get("release-groups")
        or []
    )

    return groups, url


def release_group_label(group):
    title = clean(
        group.get("title")
    )

    primary_type = clean(
        group.get("primary-type")
    )

    first_date = clean(
        group.get(
            "first-release-date"
        )
    )

    secondary = (
        group.get(
            "secondary-types"
        )
        or []
    )

    parts = []

    if title:
        parts.append(title)

    if primary_type:
        parts.append(primary_type)

    if secondary:
        parts.append(
            "/".join(
                clean(value)
                for value in secondary
                if clean(value)
            )
        )

    if first_date:
        parts.append(first_date)

    return " / ".join(parts)


def collect_one(seed):
    artist = seed["artist"]
    seed_mbid = seed["mbid"]

    artist_payload, artist_url = (
        collect_artist(seed_mbid)
    )

    # MusicBrainz 요청 간격
    time.sleep(1.1)

    release_groups, release_url = (
        collect_release_groups(
            seed_mbid
        )
    )

    returned_mbid = clean(
        artist_payload.get("id")
    )

    returned_name = clean(
        artist_payload.get("name")
    )

    returned_type = clean(
        artist_payload.get("type")
    )

    returned_country = clean(
        artist_payload.get("country")
    ).upper()

    expected_type = clean(
        seed["expectedType"]
    )

    expected_country = clean(
        seed["expectedCountry"]
    ).upper()

    mbid_match = (
        returned_mbid == seed_mbid
    )

    name_match, name_exact = (
        validate_name(
            seed,
            artist_payload,
        )
    )

    type_match = (
        returned_type.casefold()
        == expected_type.casefold()
    )

    country_match = (
        returned_country
        == expected_country
    )

    warnings = []

    if not mbid_match:
        warnings.append(
            "MBID_MISMATCH"
        )

    if not name_match:
        warnings.append(
            "NAME_MISMATCH"
        )

    if (
        name_match
        and not name_exact
    ):
        warnings.append(
            "NAME_PARTIAL_MATCH"
        )

    if not type_match:
        warnings.append(
            "TYPE_MISMATCH"
        )

    if not country_match:
        warnings.append(
            "COUNTRY_MISMATCH"
        )

    labels = [
        release_group_label(group)
        for group in release_groups
    ]

    labels = [
        label
        for label in labels
        if label
    ]

    critical_ok = (
        mbid_match
        and name_match
        and type_match
        and country_match
    )

    status = (
        "ok"
        if critical_ok
        else "error"
    )

    row = {
        "artist": artist,
        "query": seed["query"],
        "approvedMusicBrainzName": (
            seed["approvedMusicBrainzName"]
        ),
        "seedMbid": seed_mbid,
        "musicbrainzName": returned_name,
        "musicbrainzMbid": returned_mbid,
        "mbidMatch": (
            "TRUE"
            if mbid_match
            else "FALSE"
        ),
        "nameMatch": (
            "TRUE"
            if name_match
            else "FALSE"
        ),
        "nameExactMatch": (
            "TRUE"
            if name_exact
            else "FALSE"
        ),
        "type": returned_type,
        "expectedType": expected_type,
        "typeMatch": (
            "TRUE"
            if type_match
            else "FALSE"
        ),
        "country": returned_country,
        "expectedCountry": (
            expected_country
        ),
        "countryMatch": (
            "TRUE"
            if country_match
            else "FALSE"
        ),
        "area": area_name(
            artist_payload
        ),
        "beginDate": life_span_value(
            artist_payload,
            "begin",
        ),
        "endDate": life_span_value(
            artist_payload,
            "end",
        ),
        "disambiguation": clean(
            artist_payload.get(
                "disambiguation"
            )
        ),
        "aliasesPreview": (
            aliases_preview(
                artist_payload
            )
        ),
        "tagsPreview": (
            tags_preview(
                artist_payload
            )
        ),
        "releaseGroupCount": (
            len(release_groups)
        ),
        "releaseGroup1": (
            labels[0]
            if labels
            else ""
        ),
        "releaseGroupsPreview": (
            " || ".join(
                labels[:10]
            )
        ),
        "validationStatus": status,
        "validationWarnings": (
            " | ".join(warnings)
        ),
        "approvalSource": (
            seed["approvalSource"]
        ),
        "memo": seed["memo"],
    }

    details = {
        "artistUrl": artist_url,
        "releaseGroupUrl": (
            release_url
        ),
        "artistRaw": artist_payload,
        "releaseGroupsRaw": (
            release_groups
        ),
    }

    return row, details


def error_row(seed, exc):
    return {
        "artist": seed["artist"],
        "query": seed["query"],
        "approvedMusicBrainzName": (
            seed["approvedMusicBrainzName"]
        ),
        "seedMbid": seed["mbid"],
        "musicbrainzName": "",
        "musicbrainzMbid": "",
        "mbidMatch": "FALSE",
        "nameMatch": "FALSE",
        "nameExactMatch": "FALSE",
        "type": "",
        "expectedType": (
            seed["expectedType"]
        ),
        "typeMatch": "FALSE",
        "country": "",
        "expectedCountry": (
            seed["expectedCountry"]
        ),
        "countryMatch": "FALSE",
        "area": "",
        "beginDate": "",
        "endDate": "",
        "disambiguation": "",
        "aliasesPreview": "",
        "tagsPreview": "",
        "releaseGroupCount": 0,
        "releaseGroup1": "",
        "releaseGroupsPreview": "",
        "validationStatus": "error",
        "validationWarnings": (
            f"{type(exc).__name__}: {exc}"
        ),
        "approvalSource": (
            seed["approvalSource"]
        ),
        "memo": seed["memo"],
    }


def write_csv(path, rows):
    with path.open(
        "w",
        encoding="utf-8-sig",
        newline="",
    ) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=CSV_FIELDS,
            extrasaction="ignore",
        )

        writer.writeheader()
        writer.writerows(rows)


def main():
    seeds = read_seed()

    timestamp = datetime.now().strftime(
        "%Y%m%d_%H%M%S"
    )

    timestamp_csv = Path(
        "musicbrainz_artist_metadata_v2_"
        f"{timestamp}.csv"
    )

    timestamp_json = Path(
        "fandex_musicbrainz_artist_metadata_v2_"
        f"{timestamp}.json"
    )

    timestamp_report = Path(
        "FANDEX_MUSICBRAINZ_COLLECTOR_V2_REPORT_"
        f"{timestamp}.txt"
    )

    print()
    print(
        "FANDEX MusicBrainz collector v2"
    )
    print("=" * 76)
    print(f"version: {VERSION}")
    print(f"seed rows: {len(seeds)}")
    print(f"seed file: {SEED_FILE}")
    print(
        "scoreUsage: "
        "metadata_only_not_fandex_score"
    )
    print("masterModified: FALSE")
    print("websiteModified: FALSE")
    print("=" * 76)

    rows = []
    raw_by_artist = {}

    for index, seed in enumerate(
        seeds,
        start=1,
    ):
        print(
            f"[{index}/{len(seeds)}] "
            f"{seed['artist']} | "
            f"MBID={seed['mbid']}"
        )

        try:
            row, details = collect_one(
                seed
            )

            rows.append(row)

            raw_by_artist[
                seed["artist"]
            ] = details

            print(
                "  -> "
                f"{row['validationStatus']} | "
                f"name={row['musicbrainzName']} | "
                f"type={row['type']} | "
                f"country={row['country']} | "
                f"MBIDmatch={row['mbidMatch']} | "
                f"nameMatch={row['nameMatch']}"
            )

        except Exception as exc:
            row = error_row(
                seed,
                exc,
            )

            rows.append(row)

            raw_by_artist[
                seed["artist"]
            ] = {
                "error": (
                    f"{type(exc).__name__}: "
                    f"{exc}"
                )
            }

            print(
                f"  ERROR: "
                f"{type(exc).__name__}: {exc}"
            )

        if index < len(seeds):
            time.sleep(1.1)

    ok_count = sum(
        1
        for row in rows
        if (
            row["validationStatus"]
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
            row["validationWarnings"]
        )
    )

    write_csv(
        timestamp_csv,
        rows,
    )

    write_csv(
        LATEST_CSV,
        rows,
    )

    payload = {
        "version": VERSION,
        "createdAt": datetime.now().isoformat(
            timespec="seconds"
        ),
        "scope": (
            "Python-only MusicBrainz "
            "verified artist identity metadata"
        ),
        "artistCount": len(rows),
        "okCount": ok_count,
        "errorCount": error_count,
        "warningCount": warning_count,
        "scoreUsage": (
            "metadata_only_not_fandex_score"
        ),
        "identityUsage": (
            "artist_identity_and_catalog_metadata"
        ),
        "masterModified": False,
        "websiteModified": False,
        "artists": rows,
        "rawByArtist": raw_by_artist,
    }

    json_text = json.dumps(
        payload,
        ensure_ascii=False,
        indent=2,
    )

    timestamp_json.write_text(
        json_text,
        encoding="utf-8",
    )

    LATEST_JSON.write_text(
        json_text,
        encoding="utf-8",
    )

    lines = [
        "FANDEX MusicBrainz Collector v2",
        "=" * 76,
        f"createdAt: {payload['createdAt']}",
        f"version: {VERSION}",
        f"seed rows: {len(seeds)}",
        "",
        "수집 결과",
        "-" * 76,
    ]

    for row in rows:
        lines.append(
            f"{row['artist']} | "
            f"status={row['validationStatus']} | "
            f"name={row['musicbrainzName']} | "
            f"MBID={row['musicbrainzMbid']} | "
            f"mbidMatch={row['mbidMatch']} | "
            f"nameMatch={row['nameMatch']} | "
            f"type={row['type']} | "
            f"typeMatch={row['typeMatch']} | "
            f"country={row['country']} | "
            f"countryMatch={row['countryMatch']} | "
            f"releaseGroups={row['releaseGroupCount']}"
        )

        if row["validationWarnings"]:
            lines.append(
                "  warning: "
                + row[
                    "validationWarnings"
                ]
            )

    lines.extend(
        [
            "",
            "요약",
            "-" * 76,
            f"artistCount: {len(rows)}",
            f"okCount: {ok_count}",
            f"errorCount: {error_count}",
            f"warningCount: {warning_count}",
            (
                "scoreUsage: "
                "metadata_only_not_fandex_score"
            ),
            (
                "identityUsage: "
                "artist_identity_and_catalog_metadata"
            ),
            "masterModified: FALSE",
            "websiteModified: FALSE",
            "",
            "활용 방향",
            "-" * 76,
            "- 아티스트 고유 MBID identity 기준",
            "- 동명이인/동명 그룹 혼동 방지",
            "- release group 기반 카탈로그 메타데이터",
            (
                "- Last.fm/iTunes 등 외부 소스 "
                "identity 연결 기준으로 활용"
            ),
            "",
            "주의",
            "-" * 76,
            (
                "- MusicBrainz 데이터는 현재 "
                "FANDEX Master 점수에 합산하지 않음"
            ),
            (
                "- 웹사이트 public/data를 "
                "수정하지 않음"
            ),
        ]
    )

    report_text = "\n".join(lines)

    timestamp_report.write_text(
        report_text,
        encoding="utf-8",
    )

    LATEST_REPORT.write_text(
        report_text,
        encoding="utf-8",
    )

    print()
    print("=" * 76)
    print(
        "MusicBrainz collector v2 완료"
    )
    print("=" * 76)
    print(f"결과 수: {len(rows)}")
    print(f"정상: {ok_count}")
    print(f"오류: {error_count}")
    print(f"경고: {warning_count}")
    print(f"CSV: {LATEST_CSV}")
    print(f"JSON: {LATEST_JSON}")
    print(f"리포트: {LATEST_REPORT}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()