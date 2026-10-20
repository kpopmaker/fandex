from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

BASE = "https://api.listenbrainz.org/1/stats/artist"
OUTPUT = Path("listenbrainz_v_lisa_probe_v1.json")

TARGETS = [
    {
        "canonicalArtistId": "v",
        "artist": "V",
        "musicBrainzArtistMbid": "83096042-3785-481e-8843-dee69f1aad12",
    },
    {
        "canonicalArtistId": "lisa",
        "artist": "LISA",
        "musicBrainzArtistMbid": "30aeb57f-bb16-47fa-86ca-79fc57b4d12c",
    },
]

RANGES = ["all_time", "month", "week"]


def norm(value):
    return "" if value is None else str(value).strip()


def fetch(mbid: str, stat_range: str):
    url = f"{BASE}/{mbid}/listeners?range={stat_range}"
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "FANDEX-ArtistExpansion-ListenBrainz-Probe/1.0",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            status = response.status
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        status = exc.code
        body = exc.read().decode("utf-8", errors="replace")
        return {
            "ok": False,
            "status": status,
            "errorBody": body[:1000],
        }
    except Exception as exc:
        return {
            "ok": False,
            "status": None,
            "transportError": str(exc),
        }

    if status == 204:
        return {
            "ok": False,
            "status": 204,
            "noContent": True,
        }

    payload = json.loads(body)
    data = payload.get("payload") or {}
    listeners = data.get("listeners") or []

    return {
        "ok": status == 200,
        "status": status,
        "payloadArtistMbid": norm(data.get("artist_mbid")),
        "payloadArtistName": norm(data.get("artist_name")),
        "range": norm(data.get("range")),
        "fromTs": data.get("from_ts"),
        "toTs": data.get("to_ts"),
        "lastUpdated": data.get("last_updated"),
        "totalListenCount": data.get("total_listen_count"),
        "returnedTopListenerCount": len(listeners),
        "topListeners": [
            {
                "userName": norm(row.get("user_name")),
                "listenCount": row.get("listen_count"),
            }
            for row in listeners[:20]
        ],
    }


def main():
    results = []

    for target in TARGETS:
        mbid = target["musicBrainzArtistMbid"]
        range_results = {
            stat_range: fetch(mbid, stat_range)
            for stat_range in RANGES
        }

        successful = [
            item
            for item in range_results.values()
            if item.get("ok") is True
        ]
        exact_mbid = (
            bool(successful)
            and all(
                norm(item.get("payloadArtistMbid")).casefold() == mbid.casefold()
                for item in successful
            )
        )
        positive_listen_signal = any(
            (item.get("totalListenCount") or 0) > 0
            for item in successful
        )

        results.append({
            **target,
            "ranges": range_results,
            "evidence": {
                "successfulRangeCount": len(successful),
                "allSuccessfulResponsesEchoExactCanonicalMbid": exact_mbid,
                "positiveListenSignalObserved": positive_listen_signal,
                "canonicalSpecificListeningSignalSupported": (
                    exact_mbid and positive_listen_signal
                ),
            },
        })

    canonical_supported_count = sum(
        row["evidence"]["canonicalSpecificListeningSignalSupported"]
        for row in results
    )

    output = {
        "version": "listenbrainz_v_lisa_probe_v1",
        "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "github": {
            "runId": norm(os.environ.get("GITHUB_RUN_ID")),
            "sha": norm(os.environ.get("GITHUB_SHA")),
            "refName": norm(os.environ.get("GITHUB_REF_NAME")),
        },
        "providerContract": {
            "provider": "ListenBrainz",
            "identityKey": "MusicBrainz artist MBID",
            "endpoint": "/1/stats/artist/{artist_mbid}/listeners",
            "returnedPrimaryMetric": "total_listen_count",
            "returnsTopListeners": True,
            "returnsTotalUniqueListenerCount": False,
            "lastfmDropInMetricParity": False,
        },
        "targets": results,
        "summary": {
            "targetCount": len(results),
            "canonicalSpecificListeningSignalSupportedCount": canonical_supported_count,
            "allTargetsCanonicalSpecificListeningSignalSupported": (
                canonical_supported_count == len(results)
            ),
            "lastfmDropInReplacementReady": False,
            "productActivationAuthorized": False,
            "productFormulaChangeAuthorized": False,
        },
        "decisionRule": {
            "exactCanonicalMbidEchoRequired": True,
            "positiveListenSignalRequired": True,
            "nameOnlyMatchInsufficient": True,
            "zeroImputationAllowed": False,
            "metricSemanticSubstitutionAllowed": False,
        },
    }

    OUTPUT.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    for row in results:
        print("\nTARGET", row["canonicalArtistId"], row["musicBrainzArtistMbid"])
        for stat_range, item in row["ranges"].items():
            print(stat_range, item)
        print("evidence", row["evidence"])

    print(
        "\nallTargetsCanonicalSpecificListeningSignalSupported="
        + str(
            output["summary"]["allTargetsCanonicalSpecificListeningSignalSupported"]
        ).upper()
    )
    print("lastfmDropInReplacementReady=FALSE")
    print("productActivationAuthorized=FALSE")


if __name__ == "__main__":
    main()
