import csv
import json
import math
import os
import re
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path


VERSION = "lastfm_cloud_history_v1"
KST = timezone(timedelta(hours=9))
API_URL = "https://ws.audioscrobbler.com/2.0/"

SEED_FILE = Path("scripts/lastfm-cloud/lastfm_artist_seed_v1.csv")
DATA_DIR = Path("data/lastfm-cloud")
HISTORY_FILE = DATA_DIR / "lastfm_artist_interest_history_v1.csv"
DELTA_FILE = DATA_DIR / "lastfm_global_interest_delta_v1_latest.csv"
SCORE_FILE = DATA_DIR / "lastfm_global_interest_score_preview_v1_latest.csv"
STATUS_FILE = DATA_DIR / "lastfm_cloud_status_latest.json"

HISTORY_FIELDS = [
    "snapshotDate",
    "artist",
    "query",
    "lastfmName",
    "listeners",
    "playcount",
    "collectedAt",
    "status",
]

DELTA_FIELDS = [
    "artist",
    "previousDate",
    "latestDate",
    "daysBetween",
    "listenerDelta",
    "playcountDelta",
    "listenerDeltaPerDay",
    "playcountDeltaPerDay",
    "status",
]

SCORE_FIELDS = [
    "rank",
    "artist",
    "previousDate",
    "latestDate",
    "daysBetween",
    "listenerDeltaPerDay",
    "playcountDeltaPerDay",
    "listenerLogNormalized",
    "playcountLogNormalized",
    "lastfmGlobalInterestPreviewPoint",
    "status",
]


def read_csv(path):
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def write_csv(path, rows, fields):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    tmp.replace(path)


def to_int(value):
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return 0


def to_float(value):
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return 0.0


def get_api_key():
    key = (os.environ.get("LASTFM_API_KEY") or "").strip()
    if not re.fullmatch(r"[0-9A-Fa-f]{32}", key):
        raise RuntimeError(
            "LASTFM_API_KEY is missing or invalid. Expected a 32-character hex key."
        )
    return key


def read_seed():
    rows = read_csv(SEED_FILE)
    seeds = []
    for row in rows:
        artist = (row.get("artist") or "").strip()
        query = (row.get("query") or "").strip()
        if artist and query:
            seeds.append({"artist": artist, "query": query})
    if len(seeds) != 10:
        raise RuntimeError(f"Expected 10 Last.fm seed rows, got {len(seeds)}.")
    if len({row["artist"] for row in seeds}) != 10:
        raise RuntimeError("Duplicate artist detected in Last.fm seed.")
    return seeds


def fetch_artist_info(seed, api_key):
    params = {
        "method": "artist.getInfo",
        "api_key": api_key,
        "format": "json",
        "artist": seed["query"],
        "autocorrect": 1,
    }
    url = API_URL + "?" + urllib.parse.urlencode(params)
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "FANDEX-LastFM-Cloud/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        data = json.loads(response.read().decode("utf-8"))

    if "error" in data:
        raise RuntimeError(
            f"Last.fm API error {data.get('error')}: {data.get('message')}"
        )

    artist_info = data.get("artist") or {}
    stats = artist_info.get("stats") or {}
    listeners = to_int(stats.get("listeners"))
    playcount = to_int(stats.get("playcount"))
    if listeners <= 0 or playcount <= 0:
        raise RuntimeError(
            f"Invalid Last.fm stats for {seed['artist']}: "
            f"listeners={listeners}, playcount={playcount}"
        )

    return {
        "artist": seed["artist"],
        "query": seed["query"],
        "lastfmName": (artist_info.get("name") or "").strip(),
        "listeners": listeners,
        "playcount": playcount,
    }


def append_daily_snapshot(seeds, api_key):
    now = datetime.now(KST)
    snapshot_date = now.date().isoformat()
    history = read_csv(HISTORY_FILE)

    today_rows = [
        row
        for row in history
        if (row.get("snapshotDate") or "").strip() == snapshot_date
    ]
    if today_rows:
        today_artists = {(row.get("artist") or "").strip() for row in today_rows}
        expected_artists = {row["artist"] for row in seeds}
        if today_artists == expected_artists and len(today_rows) == len(seeds):
            print(f"SKIP: {snapshot_date} snapshot already complete (10/10).")
            return history, snapshot_date, False
        raise RuntimeError(
            f"Partial snapshot already exists for {snapshot_date}: "
            f"{len(today_rows)}/10. Refusing to mix runs."
        )

    collected = []
    errors = []
    for index, seed in enumerate(seeds, start=1):
        try:
            item = fetch_artist_info(seed, api_key)
            collected.append(item)
            print(
                f"[{index}/10] OK {item['artist']} | "
                f"listeners={item['listeners']} | playcount={item['playcount']}"
            )
        except Exception as exc:
            errors.append(f"{seed['artist']}: {exc}")
            print(f"[{index}/10] ERROR {seed['artist']} | {exc}")

    if errors:
        raise RuntimeError(
            "Last.fm collection failed; history was not modified.\n" + "\n".join(errors)
        )

    collected_at = now.isoformat(timespec="seconds")
    new_rows = [
        {
            "snapshotDate": snapshot_date,
            "artist": item["artist"],
            "query": item["query"],
            "lastfmName": item["lastfmName"],
            "listeners": item["listeners"],
            "playcount": item["playcount"],
            "collectedAt": collected_at,
            "status": "ok",
        }
        for item in collected
    ]

    merged = history + new_rows
    merged.sort(
        key=lambda row: ((row.get("snapshotDate") or ""), (row.get("artist") or ""))
    )
    write_csv(HISTORY_FILE, merged, HISTORY_FIELDS)
    print(f"ADD: {snapshot_date} snapshot appended (10 rows).")
    return merged, snapshot_date, True


def build_delta(history, seeds):
    by_artist = defaultdict(list)
    for row in history:
        artist = (row.get("artist") or "").strip()
        snapshot_date = (row.get("snapshotDate") or "").strip()
        if artist and snapshot_date:
            by_artist[artist].append(row)

    delta_rows = []
    for seed in seeds:
        artist = seed["artist"]
        rows = sorted(by_artist.get(artist, []), key=lambda row: row["snapshotDate"])
        distinct = {}
        for row in rows:
            distinct[row["snapshotDate"]] = row
        dates = sorted(distinct)
        if len(dates) < 2:
            delta_rows.append(
                {
                    "artist": artist,
                    "previousDate": "",
                    "latestDate": dates[-1] if dates else "",
                    "daysBetween": "",
                    "listenerDelta": "",
                    "playcountDelta": "",
                    "listenerDeltaPerDay": "",
                    "playcountDeltaPerDay": "",
                    "status": "insufficient_history",
                }
            )
            continue

        previous_date, latest_date = dates[-2], dates[-1]
        previous = distinct[previous_date]
        latest = distinct[latest_date]
        days_between = (
            datetime.fromisoformat(latest_date).date()
            - datetime.fromisoformat(previous_date).date()
        ).days
        if days_between <= 0:
            raise RuntimeError(f"Invalid date order for {artist}.")

        listener_delta = to_int(latest.get("listeners")) - to_int(
            previous.get("listeners")
        )
        playcount_delta = to_int(latest.get("playcount")) - to_int(
            previous.get("playcount")
        )
        status = "delta_ready"
        if listener_delta < 0 or playcount_delta < 0:
            status = "needs_review"

        delta_rows.append(
            {
                "artist": artist,
                "previousDate": previous_date,
                "latestDate": latest_date,
                "daysBetween": days_between,
                "listenerDelta": listener_delta,
                "playcountDelta": playcount_delta,
                "listenerDeltaPerDay": round(listener_delta / days_between, 4),
                "playcountDeltaPerDay": round(playcount_delta / days_between, 4),
                "status": status,
            }
        )

    write_csv(DELTA_FILE, delta_rows, DELTA_FIELDS)
    return delta_rows


def log_minmax(values):
    logged = [math.log1p(max(0.0, value)) for value in values]
    low = min(logged)
    high = max(logged)
    if high == low:
        return [50.0 for _ in logged]
    return [((value - low) / (high - low)) * 100.0 for value in logged]


def build_score(delta_rows):
    ready = [row for row in delta_rows if row["status"] == "delta_ready"]
    if len(ready) != 10:
        write_csv(SCORE_FILE, [], SCORE_FIELDS)
        return []

    listener_values = [to_float(row["listenerDeltaPerDay"]) for row in ready]
    playcount_values = [to_float(row["playcountDeltaPerDay"]) for row in ready]
    listener_norm = log_minmax(listener_values)
    playcount_norm = log_minmax(playcount_values)

    score_rows = []
    for row, listener_score, playcount_score in zip(
        ready, listener_norm, playcount_norm
    ):
        preview = listener_score * 0.5 + playcount_score * 0.5
        score_rows.append(
            {
                "rank": 0,
                "artist": row["artist"],
                "previousDate": row["previousDate"],
                "latestDate": row["latestDate"],
                "daysBetween": row["daysBetween"],
                "listenerDeltaPerDay": row["listenerDeltaPerDay"],
                "playcountDeltaPerDay": row["playcountDeltaPerDay"],
                "listenerLogNormalized": round(listener_score, 4),
                "playcountLogNormalized": round(playcount_score, 4),
                "lastfmGlobalInterestPreviewPoint": round(preview, 2),
                "status": "preview_ready",
            }
        )

    score_rows.sort(
        key=lambda row: (
            row["lastfmGlobalInterestPreviewPoint"],
            to_float(row["listenerDeltaPerDay"]),
            to_float(row["playcountDeltaPerDay"]),
        ),
        reverse=True,
    )
    for rank, row in enumerate(score_rows, start=1):
        row["rank"] = rank

    write_csv(SCORE_FILE, score_rows, SCORE_FIELDS)
    return score_rows


def write_status(snapshot_date, appended, history, delta_rows, score_rows):
    dates = sorted(
        {
            (row.get("snapshotDate") or "").strip()
            for row in history
            if (row.get("snapshotDate") or "").strip()
        }
    )
    payload = {
        "version": VERSION,
        "createdAt": datetime.now(KST).isoformat(timespec="seconds"),
        "snapshotDate": snapshot_date,
        "snapshotAppended": appended,
        "historyRowCount": len(history),
        "snapshotDateCount": len(dates),
        "deltaReadyCount": sum(row["status"] == "delta_ready" for row in delta_rows),
        "needsReviewCount": sum(row["status"] == "needs_review" for row in delta_rows),
        "scorePreviewCount": len(score_rows),
        "scoreUsage": "preview_only_not_master_score",
        "masterModified": False,
        "websiteModified": False,
    }
    STATUS_FILE.parent.mkdir(parents=True, exist_ok=True)
    STATUS_FILE.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return payload


def main():
    print("FANDEX Last.fm Cloud History v1")
    print("=" * 72)
    print(f"version: {VERSION}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")

    api_key = get_api_key()
    seeds = read_seed()
    history, snapshot_date, appended = append_daily_snapshot(seeds, api_key)
    delta_rows = build_delta(history, seeds)
    score_rows = build_score(delta_rows)
    status = write_status(snapshot_date, appended, history, delta_rows, score_rows)

    print("=" * 72)
    print(f"snapshotDate: {snapshot_date}")
    print(f"snapshotAppended: {str(appended).upper()}")
    print(f"historyRowCount: {status['historyRowCount']}")
    print(f"snapshotDateCount: {status['snapshotDateCount']}")
    print(f"deltaReadyCount: {status['deltaReadyCount']}")
    print(f"needsReviewCount: {status['needsReviewCount']}")
    print(f"scorePreviewCount: {status['scorePreviewCount']}")
    print(f"history: {HISTORY_FILE}")
    print(f"delta: {DELTA_FILE}")
    print(f"scorePreview: {SCORE_FILE}")
    print(f"status: {STATUS_FILE}")
    print("masterModified: FALSE")
    print("websiteModified: FALSE")


if __name__ == "__main__":
    main()
