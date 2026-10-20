from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
BASELINE = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_canonical_shadow_receipt_v1.json"
REPEAT = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_repeat_observation_receipt_v1.json"
OUTPUT = Path("listenbrainz_full21_provider_epoch_probe_v1.json")
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
            "User-Agent": "FANDEX-ArtistExpansion-ListenBrainz-EpochProbe/1.0",
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
    repeat = read_json(REPEAT)
    previous_max_epoch = int(repeat["providerEpochEvidence"]["maximumEpoch"])

    prior_rows = baseline["artists"]
    prior_by_id = {row["canonicalArtistId"]: row for row in prior_rows}

    current = {}
    for index, row in enumerate(prior_rows, start=1):
        cid = row["canonicalArtistId"]
        mbid = row["musicBrainzArtistMbid"]
        try:
            result = fetch(mbid)
        except Exception as exc:
            result = {"status": "unavailable", "reason": f"request_error:{exc}"}
        if result.get("status") == "ok":
            if norm(result.get("returnedArtistMbid")).casefold() != mbid.casefold():
                result["status"] = "identity_mismatch"
                result["reason"] = "returned_mbid_differs_from_reviewed_binding"
        current[cid] = result
        print(
            f"PROBE {index:02d}/21 | {cid} | status={result.get('status')} | "
            f"http={result.get('httpStatus')} | lastUpdated={result.get('lastUpdated')}"
        )
        if index < len(prior_rows):
            time.sleep(1.0)

    rows = []
    new_epoch_ids = []
    stale_epoch_ids = []
    unavailable_ids = []
    mismatch_ids = []
    negative_delta_ids = []
    positive_delta_ids = []
    unchanged_ids = []

    for row in prior_rows:
        cid = row["canonicalArtistId"]
        result = current.get(cid, {"status": "unavailable", "reason": "missing_worker_result"})
        prior_value = int(row["allTimeTotalListenCount"])
        status = result.get("status")
        last_updated = result.get("lastUpdated")
        current_value = result.get("totalListenCount")
        delta = None

        if status == "ok" and current_value is not None:
            current_value = int(current_value)
            delta = current_value - prior_value
            if delta < 0:
                negative_delta_ids.append(cid)
            elif delta > 0:
                positive_delta_ids.append(cid)
            else:
                unchanged_ids.append(cid)

            if last_updated is not None and int(last_updated) > previous_max_epoch:
                new_epoch_ids.append(cid)
            else:
                stale_epoch_ids.append(cid)
        elif status == "identity_mismatch":
            mismatch_ids.append(cid)
        else:
            unavailable_ids.append(cid)

        rows.append({
            "canonicalArtistId": cid,
            "artist": row["artist"],
            "musicBrainzArtistMbid": row["musicBrainzArtistMbid"],
            "previousAllTimeTotalListenCount": prior_value,
            "status": status,
            "lastUpdated": last_updated,
            "lastUpdatedIsoUtc": (
                datetime.fromtimestamp(int(last_updated), tz=timezone.utc).isoformat()
                if last_updated is not None else None
            ),
            "newerThanPreviousMaximumProviderEpoch": (
                bool(last_updated is not None and int(last_updated) > previous_max_epoch)
                if status == "ok" else None
            ),
            "currentAllTimeTotalListenCount": current_value,
            "deltaFromBaseline": delta,
        })

    all_exact = not unavailable_ids and not mismatch_ids
    all21_new_epoch = all_exact and len(new_epoch_ids) == 21

    output = {
        "version": "listenbrainz_full21_provider_epoch_probe_v1",
        "probeTransport": {"mode": "serial", "maxAttemptsPerArtist": 6, "requestTimeoutSeconds": 20, "interArtistDelaySeconds": 1.0},
        "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "github": {
            "runId": norm(os.environ.get("GITHUB_RUN_ID")),
            "sha": norm(os.environ.get("GITHUB_SHA")),
            "refName": norm(os.environ.get("GITHUB_REF_NAME")),
        },
        "previousEpochBoundary": {
            "maximumEpoch": previous_max_epoch,
            "maximumIsoUtc": repeat["providerEpochEvidence"]["maximumIsoUtc"],
        },
        "summary": {
            "targetArtistCount": 21,
            "exactIdentityArtistCount": 21 - len(unavailable_ids) - len(mismatch_ids),
            "newProviderEpochArtistCount": len(new_epoch_ids),
            "staleProviderEpochArtistCount": len(stale_epoch_ids),
            "unavailableArtistCount": len(unavailable_ids),
            "identityMismatchArtistCount": len(mismatch_ids),
            "negativeAllTimeDeltaArtistCount": len(negative_delta_ids),
            "positiveAllTimeDeltaArtistCount": len(positive_delta_ids),
            "unchangedAllTimeArtistCount": len(unchanged_ids),
            "all21DistinctProviderEpochEstablished": all21_new_epoch,
            "rateOrScoreComputed": False,
            "productActivationAuthorized": False,
        },
        "sets": {
            "newProviderEpochCanonicalArtistIds": sorted(new_epoch_ids),
            "staleProviderEpochCanonicalArtistIds": sorted(stale_epoch_ids),
            "unavailableCanonicalArtistIds": sorted(unavailable_ids),
            "identityMismatchCanonicalArtistIds": sorted(mismatch_ids),
            "negativeAllTimeDeltaCanonicalArtistIds": sorted(negative_delta_ids),
            "positiveAllTimeDeltaCanonicalArtistIds": sorted(positive_delta_ids),
            "unchangedAllTimeCanonicalArtistIds": sorted(unchanged_ids),
        },
        "artists": rows,
        "nextGate": (
            "LISTENBRAINZ_DISTINCT_EPOCH_DELTA_CHARACTERIZATION_REQUIRED"
            if all21_new_epoch
            else "LISTENBRAINZ_PROVIDER_UPDATE_EPOCH_REQUIRED"
        ),
        "safety": {
            "staleEpochInterpretedAsZeroGrowth": False,
            "missingIsZero": False,
            "unavailableIsZero": False,
            "newScoreFormulaDefined": False,
            "newWeightDefined": False,
            "thresholdDefined": False,
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
        "SUMMARY | target=21"
        f" | exact={output['summary']['exactIdentityArtistCount']}"
        f" | newEpoch={len(new_epoch_ids)}"
        f" | staleEpoch={len(stale_epoch_ids)}"
        f" | positiveDelta={len(positive_delta_ids)}"
        f" | negativeDelta={len(negative_delta_ids)}"
        f" | unchanged={len(unchanged_ids)}"
    )
    print("newEpochIds=" + json.dumps(sorted(new_epoch_ids)))
    print("staleEpochIds=" + json.dumps(sorted(stale_epoch_ids)))
    print("nextGate=" + output["nextGate"])
    print("rateOrScoreComputed=FALSE")


if __name__ == "__main__":
    main()
