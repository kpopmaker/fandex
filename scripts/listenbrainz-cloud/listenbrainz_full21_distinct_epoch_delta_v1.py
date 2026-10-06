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
BASELINE = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_canonical_shadow_receipt_v1.json"
OUTPUT = Path("listenbrainz_full21_distinct_epoch_delta_v1.json")
API = "https://api.listenbrainz.org/1/stats/artist"
RANGE = "all_time"
PREVIOUS_MAX_EPOCH = 1791063713
PREVIOUS_MAX_EPOCH_ISO = "2026-10-03T21:41:53Z"


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
            "User-Agent": "FANDEX-ArtistExpansion-ListenBrainz-DeltaCharacterization/1.0",
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
                "fromTs": data.get("from_ts"),
                "toTs": data.get("to_ts"),
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
    baseline = read_json(BASELINE)
    prior_rows = baseline["artists"]
    if len(prior_rows) != 21:
        raise RuntimeError("Expected 21 baseline artists.")

    rows = []
    for index, prior in enumerate(prior_rows, start=1):
        cid = prior["canonicalArtistId"]
        mbid = prior["musicBrainzArtistMbid"]
        result = fetch(mbid)
        if result.get("status") == "ok":
            if norm(result.get("returnedArtistMbid")).casefold() != mbid.casefold():
                result["status"] = "identity_mismatch"
                result["reason"] = "returned_mbid_differs_from_reviewed_binding"

        prior_count = int(prior["allTimeTotalListenCount"])
        current_count = result.get("totalListenCount") if result.get("status") == "ok" else None
        current_count = int(current_count) if current_count is not None else None
        delta = None if current_count is None else current_count - prior_count
        last_updated = result.get("lastUpdated")
        newer_epoch = bool(
            result.get("status") == "ok"
            and last_updated is not None
            and int(last_updated) > PREVIOUS_MAX_EPOCH
        )

        row = {
            "canonicalArtistId": cid,
            "artist": prior["artist"],
            "musicBrainzArtistMbid": mbid,
            "status": result.get("status"),
            "httpStatus": result.get("httpStatus"),
            "previousAllTimeTotalListenCount": prior_count,
            "currentAllTimeTotalListenCount": current_count,
            "rawAllTimeDelta": delta,
            "currentLastUpdated": last_updated,
            "currentLastUpdatedIsoUtc": (
                datetime.fromtimestamp(int(last_updated), tz=timezone.utc).isoformat()
                if last_updated is not None else None
            ),
            "newerThanPreviousMaxEpoch": newer_epoch,
        }
        rows.append(row)
        print(
            f"DELTA {index:02d}/21 | {cid} | status={row['status']} | "
            f"prior={prior_count} | current={current_count} | delta={delta} | "
            f"lastUpdated={last_updated} | newEpoch={newer_epoch}"
        )
        if index < len(prior_rows):
            time.sleep(1.0)

    exact = [r for r in rows if r["status"] == "ok"]
    new_epoch = [r for r in exact if r["newerThanPreviousMaxEpoch"]]
    deltas = [r["rawAllTimeDelta"] for r in new_epoch if r["rawAllTimeDelta"] is not None]
    positive = [r for r in new_epoch if r["rawAllTimeDelta"] is not None and r["rawAllTimeDelta"] > 0]
    negative = [r for r in new_epoch if r["rawAllTimeDelta"] is not None and r["rawAllTimeDelta"] < 0]
    unchanged = [r for r in new_epoch if r["rawAllTimeDelta"] == 0]

    eligible = len(exact) == 21 and len(new_epoch) == 21
    delta_stats = None
    if eligible and deltas:
        sorted_deltas = sorted(deltas)
        delta_stats = {
            "count": len(sorted_deltas),
            "sum": sum(sorted_deltas),
            "min": min(sorted_deltas),
            "max": max(sorted_deltas),
            "mean": sum(sorted_deltas) / len(sorted_deltas),
            "median": statistics.median(sorted_deltas),
        }

    ranking = []
    if eligible:
        ranking = [
            {
                "rank": rank,
                "canonicalArtistId": row["canonicalArtistId"],
                "rawAllTimeDelta": row["rawAllTimeDelta"],
            }
            for rank, row in enumerate(
                sorted(rows, key=lambda r: (-int(r["rawAllTimeDelta"]), r["canonicalArtistId"])),
                start=1,
            )
        ]

    current_epochs = [int(r["currentLastUpdated"]) for r in new_epoch if r["currentLastUpdated"] is not None]

    output = {
        "version": "listenbrainz_full21_distinct_epoch_delta_v1",
        "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "github": {
            "runId": norm(os.environ.get("GITHUB_RUN_ID")),
            "sha": norm(os.environ.get("GITHUB_SHA")),
            "refName": norm(os.environ.get("GITHUB_REF_NAME")),
        },
        "baseline": {
            "receiptVersion": baseline["version"],
            "measurementRunId": baseline["shadow"]["runId"],
            "artifactDigest": baseline["artifact"]["digest"],
            "providerEpochBoundaryMaximum": PREVIOUS_MAX_EPOCH,
            "providerEpochBoundaryMaximumIsoUtc": PREVIOUS_MAX_EPOCH_ISO,
        },
        "contract": {
            "provider": "ListenBrainz",
            "identity": "reviewed MusicBrainz artist MBID",
            "metric": "all_time.total_listen_count",
            "comparisonType": "raw cumulative delta across distinct provider update epochs",
            "rateComputed": False,
            "scoreComputed": False,
            "normalizationComputed": False,
            "weightDefined": False,
            "thresholdDefined": False,
        },
        "summary": {
            "targetArtistCount": 21,
            "exactIdentityArtistCount": len(exact),
            "newProviderEpochArtistCount": len(new_epoch),
            "positiveDeltaArtistCount": len(positive),
            "negativeDeltaArtistCount": len(negative),
            "unchangedDeltaArtistCount": len(unchanged),
            "distinctEpochDeltaCharacterizationEligible": eligible,
            "currentProviderEpochMinimum": min(current_epochs) if current_epochs else None,
            "currentProviderEpochMaximum": max(current_epochs) if current_epochs else None,
            "rawDeltaStats": delta_stats,
        },
        "rawDeltaRankingDescriptiveOnly": ranking,
        "artists": rows,
        "interpretation": {
            "all21CanonicalIdentityObserved": len(exact) == 21,
            "all21NewProviderEpochObserved": len(new_epoch) == 21,
            "all21RawDeltaPositive": eligible and len(positive) == 21,
            "negativeCumulativeMovementObserved": len(negative) > 0,
            "rawDeltaRankingIsScore": False,
            "rawDeltaRankingIsProductRanking": False,
            "productionScoreContractEstablished": False,
            "rateContractEstablished": False,
            "note": "Raw cumulative ListenBrainz deltas are descriptive evidence only. No rate, normalization, score, weight, or promotion threshold is inferred."
        },
        "nextGate": (
            "LISTENBRAINZ_FULL21_DELTA_SIGNAL_CONTRACT_DECISION_REQUIRED"
            if eligible
            else "LISTENBRAINZ_FULL21_DISTINCT_EPOCH_REOBSERVATION_REQUIRED"
        ),
        "safety": {
            "missingIsZero": False,
            "unavailableIsZero": False,
            "rawDeltaRankingUsedAsScore": False,
            "newScoreFormulaDefined": False,
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
        + "/21 | newEpoch="
        + str(len(new_epoch))
        + "/21 | positive="
        + str(len(positive))
        + " | negative="
        + str(len(negative))
        + " | unchanged="
        + str(len(unchanged))
    )
    print("rawDeltaStats=" + json.dumps(delta_stats, sort_keys=True))
    print("nextGate=" + output["nextGate"])
    print("scoreComputed=FALSE")


if __name__ == "__main__":
    main()
