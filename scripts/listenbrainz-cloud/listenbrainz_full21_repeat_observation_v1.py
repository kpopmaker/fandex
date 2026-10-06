from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
PREVIOUS = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_canonical_shadow_receipt_v1.json"
OUTPUT = Path("listenbrainz_full21_repeat_observation_v1.json")
BASE = "https://api.listenbrainz.org/1/stats/artist"
RANGES = ["all_time", "month", "week"]


def norm(value: Any) -> str:
    return "" if value is None else str(value).strip()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def fetch(mbid: str, stat_range: str) -> dict[str, Any]:
    url = f"{BASE}/{mbid}/listeners?range={stat_range}"
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "FANDEX-ArtistExpansion-ListenBrainz-Repeat/1.0",
        },
    )
    last_error = None
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                if response.status == 204:
                    return {
                        "status": "unavailable",
                        "httpStatus": 204,
                        "reason": "no_content",
                    }
                payload = json.loads(response.read().decode("utf-8"))
            data = payload.get("payload") or {}
            return {
                "status": "ok",
                "httpStatus": response.status,
                "returnedArtistMbid": norm(data.get("artist_mbid")),
                "returnedArtistName": norm(data.get("artist_name")),
                "range": norm(data.get("range")),
                "fromTs": data.get("from_ts"),
                "toTs": data.get("to_ts"),
                "lastUpdated": data.get("last_updated"),
                "totalListenCount": data.get("total_listen_count"),
            }
        except urllib.error.HTTPError as exc:
            if exc.code == 204:
                return {
                    "status": "unavailable",
                    "httpStatus": 204,
                    "reason": "no_content",
                }
            last_error = f"HTTP {exc.code}: {exc.reason}"
            if exc.code not in {429, 500, 502, 503, 504}:
                return {
                    "status": "unavailable",
                    "httpStatus": exc.code,
                    "reason": last_error,
                }
        except Exception as exc:
            last_error = str(exc)
        time.sleep(min(1.5 * attempt, 4.5))
    return {
        "status": "unavailable",
        "httpStatus": None,
        "reason": last_error or "unknown_error",
    }


def main() -> None:
    previous = read_json(PREVIOUS)
    prior_rows = previous["artists"]
    if len(prior_rows) != 21:
        raise RuntimeError("Previous full21 receipt must contain 21 artists.")

    tasks = {}
    current = {row["canonicalArtistId"]: {} for row in prior_rows}
    with ThreadPoolExecutor(max_workers=3) as executor:
        for row in prior_rows:
            mbid = row["musicBrainzArtistMbid"]
            for stat_range in RANGES:
                future = executor.submit(fetch, mbid, stat_range)
                tasks[future] = (row["canonicalArtistId"], mbid, stat_range)

        for future in as_completed(tasks):
            canonical_id, mbid, stat_range = tasks[future]
            try:
                result = future.result()
            except Exception as exc:
                result = {
                    "status": "unavailable",
                    "httpStatus": None,
                    "reason": f"worker_error:{exc}",
                }
            if result.get("status") == "ok":
                if norm(result.get("returnedArtistMbid")).casefold() != mbid.casefold():
                    result["status"] = "identity_mismatch"
                    result["reason"] = "returned_mbid_differs_from_reviewed_binding"
            current[canonical_id][stat_range] = result

    rows = []
    all_time_negative = []
    all_time_positive = []
    all_time_unchanged = []
    unavailable = []
    mismatches = []
    provider_update_epochs = set()

    for prior in prior_rows:
        cid = prior["canonicalArtistId"]
        ranges = current[cid]
        for stat_range in RANGES:
            if stat_range not in ranges:
                ranges[stat_range] = {
                    "status": "unavailable",
                    "reason": "missing_worker_result",
                }

        for stat_range, result in ranges.items():
            if result.get("status") == "unavailable":
                unavailable.append(f"{cid}:{stat_range}")
            if result.get("status") == "identity_mismatch":
                mismatches.append(f"{cid}:{stat_range}")
            if result.get("status") == "ok" and result.get("lastUpdated") is not None:
                provider_update_epochs.add(str(result.get("lastUpdated")))

        prior_values = {
            "all_time": prior["allTimeTotalListenCount"],
            "month": prior["monthTotalListenCount"],
            "week": prior["weekTotalListenCount"],
        }
        deltas = {}
        for stat_range in RANGES:
            result = ranges[stat_range]
            current_value = result.get("totalListenCount") if result.get("status") == "ok" else None
            prior_value = prior_values[stat_range]
            deltas[stat_range] = (
                None if current_value is None
                else current_value - prior_value
            )

        if deltas["all_time"] is not None:
            if deltas["all_time"] < 0:
                all_time_negative.append(cid)
            elif deltas["all_time"] > 0:
                all_time_positive.append(cid)
            else:
                all_time_unchanged.append(cid)

        rows.append({
            "canonicalArtistId": cid,
            "artist": prior["artist"],
            "musicBrainzArtistMbid": prior["musicBrainzArtistMbid"],
            "previous": prior_values,
            "current": {
                stat_range: {
                    "status": ranges[stat_range].get("status"),
                    "totalListenCount": ranges[stat_range].get("totalListenCount"),
                    "lastUpdated": ranges[stat_range].get("lastUpdated"),
                    "fromTs": ranges[stat_range].get("fromTs"),
                    "toTs": ranges[stat_range].get("toTs"),
                }
                for stat_range in RANGES
            },
            "delta": deltas,
        })

    all_ok = not unavailable and not mismatches
    all_time_monotonic_in_this_repeat = all_ok and not all_time_negative
    all_time_changed = len(all_time_positive) > 0

    output = {
        "version": "listenbrainz_full21_repeat_observation_v1",
        "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "github": {
            "runId": norm(os.environ.get("GITHUB_RUN_ID")),
            "sha": norm(os.environ.get("GITHUB_SHA")),
            "refName": norm(os.environ.get("GITHUB_REF_NAME")),
        },
        "previousObservation": {
            "receiptVersion": previous["version"],
            "runId": previous["shadow"]["runId"],
            "head": previous["shadow"]["head"],
            "artifactDigest": previous["artifact"]["digest"],
        },
        "contract": {
            "provider": "ListenBrainz",
            "identity": "reviewed MusicBrainz artist MBID",
            "metric": "total_listen_count",
            "ranges": RANGES,
            "allTimeInterpretationUnderTest": "candidate cumulative observation surface",
            "monthWeekInterpretation": "provider-defined rolling/ranged aggregates; monotonicity not required",
            "zeroImputationAllowed": False,
        },
        "summary": {
            "targetArtistCount": 21,
            "fullyObservedExactIdentity": all_ok,
            "unavailableRangeCount": len(unavailable),
            "identityMismatchRangeCount": len(mismatches),
            "allTimeNegativeDeltaArtistCount": len(all_time_negative),
            "allTimePositiveDeltaArtistCount": len(all_time_positive),
            "allTimeUnchangedArtistCount": len(all_time_unchanged),
            "allTimeMonotonicInThisRepeat": all_time_monotonic_in_this_repeat,
            "allTimeChangedSincePreviousObservation": all_time_changed,
            "providerLastUpdatedDistinctValueCount": len(provider_update_epochs),
            "providerLastUpdatedValues": sorted(provider_update_epochs),
            "rateOrScoreComputed": False,
            "productActivationAuthorized": False,
        },
        "artists": rows,
        "decision": {
            "singleRepeatEstablishesProductionDeltaContract": False,
            "reason": (
                "One repeat can detect identity/availability and negative all_time movement, "
                "but cannot by itself establish provider refresh cadence or a production scoring formula."
            ),
            "ifAllTimeChangedNextGate": "LISTENBRAINZ_DISTINCT_EPOCH_DELTA_CHARACTERIZATION_REQUIRED",
            "ifAllTimeUnchangedNextGate": "LISTENBRAINZ_PROVIDER_UPDATE_EPOCH_REQUIRED",
        },
        "safety": {
            "missingIsZero": False,
            "unavailableIsZero": False,
            "monthWeekNegativeDeltaTreatedAsError": False,
            "newScoreFormulaDefined": False,
            "newWeightDefined": False,
            "thresholdDefined": False,
            "productSourceChanged": False,
            "databaseModified": False,
            "schedulerModified": False,
            "deploymentAuthorized": False,
            "mainMergeAuthorized": False,
        },
    }

    OUTPUT.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    print(
        "SUMMARY | target=21 | exact="
        + str(all_ok).upper()
        + " | allTimeNegative="
        + str(len(all_time_negative))
        + " | allTimePositive="
        + str(len(all_time_positive))
        + " | allTimeUnchanged="
        + str(len(all_time_unchanged))
    )
    print("providerLastUpdatedValues=" + json.dumps(sorted(provider_update_epochs)))
    print("rateOrScoreComputed=FALSE")
    print("productActivationAuthorized=FALSE")


if __name__ == "__main__":
    main()
