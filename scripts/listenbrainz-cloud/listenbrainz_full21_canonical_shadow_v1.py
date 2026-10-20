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
BINDINGS = ROOT / "data/fandex-cloud-v10/seed/musicbrainz_21_artist_bindings_reviewed_v1.json"
OUTPUT = Path("listenbrainz_full21_canonical_shadow_v1.json")
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
            "User-Agent": "FANDEX-ArtistExpansion-ListenBrainz-Full21/1.0",
        },
    )
    last_error = None
    for attempt in range(1, 4):
        try:
            with urllib.request.urlopen(request, timeout=12) as response:
                status = response.status
                body = response.read().decode("utf-8")
            if status == 204:
                return {
                    "status": "unavailable",
                    "httpStatus": 204,
                    "totalListenCount": None,
                    "reason": "no_content",
                }
            payload = json.loads(body)
            data = payload.get("payload") or {}
            returned_mbid = norm(data.get("artist_mbid"))
            return {
                "status": "ok",
                "httpStatus": status,
                "returnedArtistMbid": returned_mbid,
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
                    "totalListenCount": None,
                    "reason": "no_content",
                }
            last_error = f"HTTP {exc.code}: {exc.reason}"
            if exc.code not in {429, 500, 502, 503, 504}:
                return {
                    "status": "unavailable",
                    "httpStatus": exc.code,
                    "totalListenCount": None,
                    "reason": last_error,
                }
        except Exception as exc:
            last_error = str(exc)
        time.sleep(min(1.5 * attempt, 4.5))
    return {
        "status": "unavailable",
        "httpStatus": None,
        "totalListenCount": None,
        "reason": last_error or "unknown_error",
    }


def main() -> None:
    binding_doc = read_json(BINDINGS)
    bindings = binding_doc["bindings"]
    if len(bindings) != 21:
        raise RuntimeError("Expected exactly 21 reviewed MusicBrainz bindings.")
    if len({row["canonicalArtistId"] for row in bindings}) != 21:
        raise RuntimeError("Canonical artist IDs are not unique.")
    if len({row["musicBrainzArtistMbid"] for row in bindings}) != 21:
        raise RuntimeError("MusicBrainz MBIDs are not unique.")

    indexed_bindings = {
        binding["canonicalArtistId"]: binding
        for binding in bindings
    }
    raw_results = {
        binding["canonicalArtistId"]: {}
        for binding in bindings
    }

    tasks = {}
    with ThreadPoolExecutor(max_workers=3) as executor:
        for binding in bindings:
            mbid = binding["musicBrainzArtistMbid"]
            for stat_range in RANGES:
                future = executor.submit(fetch, mbid, stat_range)
                tasks[future] = (binding["canonicalArtistId"], stat_range, mbid)

        for future in as_completed(tasks):
            canonical_id, stat_range, mbid = tasks[future]
            try:
                result = future.result()
            except Exception as exc:
                result = {
                    "status": "unavailable",
                    "httpStatus": None,
                    "totalListenCount": None,
                    "reason": f"worker_error:{exc}",
                }

            if result["status"] == "ok":
                if norm(result.get("returnedArtistMbid")).casefold() != mbid.casefold():
                    result["status"] = "identity_mismatch"
                    result["reason"] = "returned_mbid_differs_from_reviewed_binding"

            raw_results[canonical_id][stat_range] = result

    rows = []
    for binding in bindings:
        canonical_id = binding["canonicalArtistId"]
        mbid = binding["musicBrainzArtistMbid"]
        range_results = raw_results[canonical_id]

        for stat_range in RANGES:
            if stat_range not in range_results:
                range_results[stat_range] = {
                    "status": "unavailable",
                    "httpStatus": None,
                    "totalListenCount": None,
                    "reason": "missing_worker_result",
                }

        statuses = [range_results[r]["status"] for r in RANGES]
        all_ok = all(status == "ok" for status in statuses)
        exact_identity = all(
            range_results[r]["status"] != "ok"
            or norm(range_results[r].get("returnedArtistMbid")).casefold() == mbid.casefold()
            for r in RANGES
        )
        any_unavailable = any(status == "unavailable" for status in statuses)
        any_mismatch = any(status == "identity_mismatch" for status in statuses)

        row = {
            "canonicalArtistId": canonical_id,
            "artist": binding["artist"],
            "providerArtistName": binding["providerArtistName"],
            "musicBrainzArtistMbid": mbid,
            "ranges": range_results,
            "allRangesOk": all_ok,
            "exactIdentityForAllOkRanges": exact_identity,
            "hasUnavailableRange": any_unavailable,
            "hasIdentityMismatch": any_mismatch,
        }
        rows.append(row)
        print(
            f"{row['canonicalArtistId']} | "
            f"all_time={range_results['all_time']['status']}:{range_results['all_time'].get('totalListenCount')} | "
            f"month={range_results['month']['status']}:{range_results['month'].get('totalListenCount')} | "
            f"week={range_results['week']['status']}:{range_results['week'].get('totalListenCount')} | "
            f"exactIdentity={exact_identity}"
        )

    complete_rows = [r for r in rows if r["allRangesOk"] and r["exactIdentityForAllOkRanges"]]
    unavailable_rows = [r for r in rows if r["hasUnavailableRange"]]
    mismatch_rows = [r for r in rows if r["hasIdentityMismatch"]]

    output = {
        "version": "listenbrainz_full21_canonical_shadow_v1",
        "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "github": {
            "runId": norm(os.environ.get("GITHUB_RUN_ID")),
            "sha": norm(os.environ.get("GITHUB_SHA")),
            "refName": norm(os.environ.get("GITHUB_REF_NAME")),
        },
        "bindingVersion": binding_doc["version"],
        "provider": {
            "name": "ListenBrainz",
            "endpoint": "/1/stats/artist/{artist_mbid}/listeners",
            "ranges": RANGES,
            "metric": "total_listen_count",
        },
        "summary": {
            "targetArtistCount": 21,
            "fullyObservedExactIdentityArtistCount": len(complete_rows),
            "unavailableArtistCount": len(unavailable_rows),
            "identityMismatchArtistCount": len(mismatch_rows),
            "all21CanonicalCohortObserved": len(complete_rows) == 21,
            "scoreFormulaDefined": False,
            "promotionThresholdDefined": False,
            "productActivationAuthorized": False,
        },
        "artists": rows,
        "nextGate": (
            "LISTENBRAINZ_FULL21_PROVIDER_CONTRACT_COMPARISON_REQUIRED"
            if len(complete_rows) == 21
            else "LISTENBRAINZ_FULL21_COVERAGE_GAPS_REQUIRED"
        ),
        "safety": {
            "missingIsZero": False,
            "unavailableIsZero": False,
            "lastfmSourceModified": False,
            "productRuntimeModified": False,
            "scoreFormulaChanged": False,
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
        "SUMMARY | target=21 | fullyObservedExactIdentity="
        + str(len(complete_rows))
        + " | unavailable="
        + str(len(unavailable_rows))
        + " | identityMismatch="
        + str(len(mismatch_rows))
    )
    print("nextGate=" + output["nextGate"])
    print("productActivationAuthorized=FALSE")


if __name__ == "__main__":
    main()
