from __future__ import annotations

import json
import os
import statistics
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
FIRST_INTERVAL = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_distinct_epoch_delta_receipt_v1.json"
OUTPUT = Path("listenbrainz_full21_second_distinct_interval_probe_v1.json")
API = "https://api.listenbrainz.org/1/stats/artist"
RANGE = "all_time"


def norm(value: Any) -> str:
    return "" if value is None else str(value).strip()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def fetch(mbid: str) -> dict[str, Any]:
    url = f"{API}/{mbid}/listeners?range={RANGE}"
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "FANDEX-ArtistExpansion-ListenBrainz-SecondInterval/1.0",
        },
    )
    last_error = None
    for attempt in range(1, 7):
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                if response.status == 204:
                    return {"status": "unavailable", "httpStatus": 204, "reason": "no_content"}
                payload = json.loads(response.read().decode("utf-8"))
            data = payload.get("payload") or {}
            return {
                "status": "ok",
                "httpStatus": response.status,
                "returnedArtistMbid": norm(data.get("artist_mbid")),
                "returnedArtistName": norm(data.get("artist_name")),
                "lastUpdated": data.get("last_updated"),
                "totalListenCount": data.get("total_listen_count"),
            }
        except urllib.error.HTTPError as exc:
            last_error = f"HTTP {exc.code}: {exc.reason}"
            if exc.code not in {429, 500, 502, 503, 504}:
                return {"status": "unavailable", "httpStatus": exc.code, "reason": last_error}
        except Exception as exc:
            last_error = str(exc)
        time.sleep(min(3 * attempt, 15))
    return {"status": "unavailable", "httpStatus": None, "reason": last_error or "unknown_error"}


def main() -> None:
    first = read_json(FIRST_INTERVAL)
    prior_rows = first["artists"]
    if len(prior_rows) != 21:
        raise RuntimeError("Expected 21 first-interval artists.")

    rows = []
    for index, prior in enumerate(prior_rows, start=1):
        cid = prior["canonicalArtistId"]
        mbid = prior["musicBrainzArtistMbid"]
        result = fetch(mbid)

        if result.get("status") == "ok":
            if norm(result.get("returnedArtistMbid")).casefold() != mbid.casefold():
                result["status"] = "identity_mismatch"
                result["reason"] = "returned_mbid_differs_from_reviewed_binding"

        prior_count = int(prior["currentAllTimeTotalListenCount"])
        prior_epoch = int(prior["currentLastUpdated"])
        current_count = result.get("totalListenCount") if result.get("status") == "ok" else None
        current_count = int(current_count) if current_count is not None else None
        current_epoch = result.get("lastUpdated")
        current_epoch = int(current_epoch) if current_epoch is not None else None
        newer = bool(result.get("status") == "ok" and current_epoch is not None and current_epoch > prior_epoch)

        delta = None
        provider_elapsed_seconds = None
        if newer and current_count is not None:
            delta = current_count - prior_count
            provider_elapsed_seconds = current_epoch - prior_epoch

        row = {
            "canonicalArtistId": cid,
            "artist": prior["artist"],
            "musicBrainzArtistMbid": mbid,
            "status": result.get("status"),
            "httpStatus": result.get("httpStatus"),
            "firstIntervalAllTimeTotalListenCount": prior_count,
            "firstIntervalLastUpdated": prior_epoch,
            "firstIntervalLastUpdatedIsoUtc": datetime.fromtimestamp(prior_epoch, tz=timezone.utc).isoformat(),
            "currentAllTimeTotalListenCount": current_count,
            "currentLastUpdated": current_epoch,
            "currentLastUpdatedIsoUtc": (
                datetime.fromtimestamp(current_epoch, tz=timezone.utc).isoformat()
                if current_epoch is not None else None
            ),
            "newerThanFirstIntervalArtistEpoch": newer,
            "secondIntervalRawAllTimeDelta": delta,
            "providerElapsedSeconds": provider_elapsed_seconds,
        }
        rows.append(row)
        print(
            f"SECOND {index:02d}/21 | {cid} | status={row['status']} | "
            f"priorEpoch={prior_epoch} | currentEpoch={current_epoch} | newer={newer} | "
            f"delta={delta} | elapsed={provider_elapsed_seconds}"
        )
        if index < len(prior_rows):
            time.sleep(1.0)

    exact = [r for r in rows if r["status"] == "ok"]
    newer = [r for r in exact if r["newerThanFirstIntervalArtistEpoch"]]
    stale = [r for r in exact if not r["newerThanFirstIntervalArtistEpoch"]]
    unavailable = [r for r in rows if r["status"] == "unavailable"]
    mismatches = [r for r in rows if r["status"] == "identity_mismatch"]
    complete_second = len(exact) == 21 and len(newer) == 21

    deltas = [r["secondIntervalRawAllTimeDelta"] for r in newer if r["secondIntervalRawAllTimeDelta"] is not None]
    elapsed = [r["providerElapsedSeconds"] for r in newer if r["providerElapsedSeconds"] is not None]
    positive = [d for d in deltas if d > 0]
    negative = [d for d in deltas if d < 0]
    unchanged = [d for d in deltas if d == 0]

    output = {
        "version": "listenbrainz_full21_second_distinct_interval_probe_v1",
        "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "github": {
            "runId": norm(os.environ.get("GITHUB_RUN_ID")),
            "sha": norm(os.environ.get("GITHUB_SHA")),
            "refName": norm(os.environ.get("GITHUB_REF_NAME")),
        },
        "baseline": {
            "receiptVersion": first["version"],
            "receiptRunId": first["characterization"]["runId"],
            "artistCount": len(prior_rows),
        },
        "probeTransport": {
            "mode": "serial",
            "maxAttemptsPerArtist": 6,
            "requestTimeoutSeconds": 20,
            "interArtistDelaySeconds": 1.0,
        },
        "summary": {
            "targetArtistCount": 21,
            "exactIdentityArtistCount": len(exact),
            "newerPerArtistEpochCount": len(newer),
            "stalePerArtistEpochCount": len(stale),
            "unavailableArtistCount": len(unavailable),
            "identityMismatchArtistCount": len(mismatches),
            "secondDistinctIntervalEstablished": complete_second,
            "positiveDeltaArtistCount": len(positive) if complete_second else None,
            "negativeDeltaArtistCount": len(negative) if complete_second else None,
            "unchangedDeltaArtistCount": len(unchanged) if complete_second else None,
            "rawDeltaStats": (
                {
                    "count": len(deltas),
                    "sum": sum(deltas),
                    "min": min(deltas),
                    "max": max(deltas),
                    "mean": sum(deltas) / len(deltas),
                    "median": statistics.median(deltas),
                }
                if complete_second and deltas
                else None
            ),
            "providerElapsedSecondsStats": (
                {
                    "count": len(elapsed),
                    "min": min(elapsed),
                    "max": max(elapsed),
                    "mean": sum(elapsed) / len(elapsed),
                    "median": statistics.median(elapsed),
                }
                if complete_second and elapsed
                else None
            ),
            "rateComputed": False,
            "scoreComputed": False,
            "normalizationComputed": False,
        },
        "sets": {
            "newerEpochCanonicalArtistIds": sorted(r["canonicalArtistId"] for r in newer),
            "staleEpochCanonicalArtistIds": sorted(r["canonicalArtistId"] for r in stale),
            "unavailableCanonicalArtistIds": sorted(r["canonicalArtistId"] for r in unavailable),
            "identityMismatchCanonicalArtistIds": sorted(r["canonicalArtistId"] for r in mismatches),
        },
        "artists": rows,
        "interpretation": {
            "partialNewEpochIsNotCompleteSecondInterval": True,
            "staleArtistIsNotZeroGrowth": True,
            "missingIsNotZero": True,
            "unavailableIsNotZero": True,
            "scoreContractEstablished": False,
            "rateContractEstablished": False,
        },
        "nextGate": (
            "LISTENBRAINZ_MULTI_EPOCH_DELTA_STABILITY_DECISION_REQUIRED"
            if complete_second
            else "LISTENBRAINZ_SECOND_DISTINCT_INTERVAL_REQUIRED"
        ),
        "safety": {
            "partialEpochMixedIntoSecondInterval": False,
            "staleEpochInterpretedAsZeroGrowth": False,
            "missingIsZero": False,
            "unavailableIsZero": False,
            "newScoreFormulaDefined": False,
            "newNormalizationDefined": False,
            "newWeightDefined": False,
            "thresholdDefined": False,
            "lastfmReplaced": False,
            "productSourceChanged": False,
            "productRuntimeModified": False,
            "schedulerModified": False,
            "databaseModified": False,
            "deploymentAuthorized": False,
            "mainMergeAuthorized": False,
        },
    }

    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        "SUMMARY | exact="
        + str(len(exact))
        + "/21 | newer="
        + str(len(newer))
        + "/21 | stale="
        + str(len(stale))
        + " | secondInterval="
        + str(complete_second).upper()
    )
    print("newerIds=" + json.dumps(output["sets"]["newerEpochCanonicalArtistIds"]))
    print("staleIds=" + json.dumps(output["sets"]["staleEpochCanonicalArtistIds"]))
    print("nextGate=" + output["nextGate"])
    print("rateComputed=FALSE")
    print("scoreComputed=FALSE")


if __name__ == "__main__":
    main()
