from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

API_URL = "https://ws.audioscrobbler.com/2.0/"
OUTPUT = Path("lastfm_mbid_v_lisa_probe_v1.json")

TARGETS = [
    {
        "canonicalArtistId": "v",
        "artist": "V",
        "nameQuery": "V",
        "musicBrainzArtistMbid": "83096042-3785-481e-8843-dee69f1aad12",
        "musicBrainzDisambiguation": "BTS",
    },
    {
        "canonicalArtistId": "lisa",
        "artist": "LISA",
        "nameQuery": "LISA",
        "musicBrainzArtistMbid": "30aeb57f-bb16-47fa-86ca-79fc57b4d12c",
        "musicBrainzDisambiguation": "BLACKPINK",
    },
]


def norm(value):
    return "" if value is None else str(value).strip()


def get_api_key():
    key = norm(os.environ.get("LASTFM_API_KEY"))
    if len(key) != 32:
        raise RuntimeError("LASTFM_API_KEY missing or invalid length.")
    return key


def api_call(api_key, method, **params):
    query = {
        "method": method,
        "api_key": api_key,
        "format": "json",
        **params,
    }
    url = API_URL + "?" + urllib.parse.urlencode(query)
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/json",
            "User-Agent": "FANDEX-ArtistExpansion-LastFM-MBID-Probe/1.1",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))


def safe_call(api_key, method, **params):
    try:
        payload = api_call(api_key, method, **params)
    except Exception as exc:
        return {
            "ok": False,
            "transportError": str(exc),
            "apiError": None,
            "payload": None,
        }
    if "error" in payload:
        return {
            "ok": False,
            "transportError": None,
            "apiError": {
                "code": payload.get("error"),
                "message": payload.get("message"),
            },
            "payload": payload,
        }
    return {
        "ok": True,
        "transportError": None,
        "apiError": None,
        "payload": payload,
    }


def int_or_none(value):
    value = norm(value)
    if not value:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def info_summary(call):
    if not call["ok"]:
        return {
            "ok": False,
            "apiError": call["apiError"],
            "transportError": call["transportError"],
        }
    artist = (call["payload"].get("artist") or {})
    stats = artist.get("stats") or {}
    return {
        "ok": True,
        "name": norm(artist.get("name")),
        "mbid": norm(artist.get("mbid")),
        "url": norm(artist.get("url")),
        "listeners": int_or_none(stats.get("listeners")),
        "playcount": int_or_none(stats.get("playcount")),
    }


def top_tracks_summary(call, requested_mbid):
    if not call["ok"]:
        return {
            "ok": False,
            "apiError": call["apiError"],
            "transportError": call["transportError"],
            "tracks": [],
        }
    root = call["payload"].get("toptracks") or {}
    tracks = root.get("track") or []
    if isinstance(tracks, dict):
        tracks = [tracks]
    out = []
    nonempty_mbid_count = 0
    exact_mbid_count = 0
    for item in tracks[:20]:
        artist = item.get("artist") or {}
        artist_mbid = norm(artist.get("mbid"))
        if artist_mbid:
            nonempty_mbid_count += 1
            if artist_mbid.casefold() == requested_mbid.casefold():
                exact_mbid_count += 1
        out.append({
            "name": norm(item.get("name")),
            "playcount": int_or_none(item.get("playcount")),
            "listeners": int_or_none(item.get("listeners")),
            "artistName": norm(artist.get("name")),
            "artistMbid": artist_mbid,
            "url": norm(item.get("url")),
        })
    return {
        "ok": True,
        "attrArtist": norm((root.get("@attr") or {}).get("artist")),
        "returnedTrackCount": len(tracks),
        "examinedTrackCount": len(out),
        "nonemptyTrackArtistMbidCount": nonempty_mbid_count,
        "matchingRequestedArtistMbidCount": exact_mbid_count,
        "tracks": out,
    }


def search_summary(call):
    if not call["ok"]:
        return {
            "ok": False,
            "apiError": call["apiError"],
            "transportError": call["transportError"],
            "matches": [],
        }
    results = call["payload"].get("results") or {}
    matches = ((results.get("artistmatches") or {}).get("artist") or [])
    if isinstance(matches, dict):
        matches = [matches]
    return {
        "ok": True,
        "matches": [
            {
                "name": norm(row.get("name")),
                "mbid": norm(row.get("mbid")),
                "url": norm(row.get("url")),
                "listeners": int_or_none(row.get("listeners")),
            }
            for row in matches[:30]
        ],
    }


def main():
    api_key = get_api_key()
    results = []

    for target in TARGETS:
        mbid = target["musicBrainzArtistMbid"]
        name = target["nameQuery"]

        name_info = info_summary(safe_call(
            api_key, "artist.getInfo", artist=name, autocorrect=1
        ))
        mbid_info = info_summary(safe_call(
            api_key, "artist.getInfo", mbid=mbid, autocorrect=0
        ))
        name_tracks = top_tracks_summary(safe_call(
            api_key, "artist.getTopTracks", artist=name, autocorrect=1, limit=20
        ), mbid)
        mbid_tracks = top_tracks_summary(safe_call(
            api_key, "artist.getTopTracks", mbid=mbid, autocorrect=0, limit=20
        ), mbid)
        search = search_summary(safe_call(
            api_key, "artist.search", artist=name, limit=30
        ))

        returned_mbid_exact = (
            mbid_info.get("ok") is True
            and norm(mbid_info.get("mbid")).casefold() == mbid.casefold()
        )
        positive_stats = (
            mbid_info.get("ok") is True
            and (mbid_info.get("listeners") or 0) > 0
            and (mbid_info.get("playcount") or 0) > 0
        )
        track_mbid_identity_supported = (
            mbid_tracks.get("ok") is True
            and mbid_tracks.get("nonemptyTrackArtistMbidCount", 0) > 0
            and mbid_tracks.get("matchingRequestedArtistMbidCount", 0)
            == mbid_tracks.get("nonemptyTrackArtistMbidCount", 0)
        )
        search_exact_matches = [
            row for row in search.get("matches", [])
            if norm(row.get("mbid")).casefold() == mbid.casefold()
        ]

        canonical_specific_binding_supported = (
            returned_mbid_exact
            and positive_stats
            and track_mbid_identity_supported
        )

        results.append({
            **target,
            "nameQueryProbe": {
                "artistInfo": name_info,
                "topTracks": name_tracks,
            },
            "mbidQueryProbe": {
                "artistInfo": mbid_info,
                "topTracks": mbid_tracks,
            },
            "artistSearchProbe": search,
            "evidence": {
                "returnedMbidExact": returned_mbid_exact,
                "positiveStats": positive_stats,
                "trackMbidIdentitySupported": track_mbid_identity_supported,
                "artistSearchExactMbidMatchCount": len(search_exact_matches),
                "canonicalSpecificBindingSupported": canonical_specific_binding_supported,
                "nameAndMbidStatsEqual": (
                    name_info.get("ok") is True
                    and mbid_info.get("ok") is True
                    and name_info.get("listeners") == mbid_info.get("listeners")
                    and name_info.get("playcount") == mbid_info.get("playcount")
                ),
                "nameAndMbidUrlEqual": (
                    name_info.get("ok") is True
                    and mbid_info.get("ok") is True
                    and name_info.get("url") == mbid_info.get("url")
                ),
            },
        })

    all_supported = all(
        row["evidence"]["canonicalSpecificBindingSupported"]
        for row in results
    )

    output = {
        "version": "lastfm_mbid_v_lisa_probe_v1",
        "createdAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "github": {
            "runId": norm(os.environ.get("GITHUB_RUN_ID")),
            "sha": norm(os.environ.get("GITHUB_SHA")),
            "refName": norm(os.environ.get("GITHUB_REF_NAME")),
        },
        "targets": results,
        "summary": {
            "targetCount": len(results),
            "canonicalSpecificBindingSupportedCount": sum(
                row["evidence"]["canonicalSpecificBindingSupported"]
                for row in results
            ),
            "allTargetsCanonicalSpecificBindingSupported": all_supported,
            "activationAuthorized": False,
            "compatibilityRegistryModified": False,
            "seedModified": False,
        },
        "decisionRule": {
            "returnedArtistMbidMustMatchRequestedMbid": True,
            "positiveStatsRequired": True,
            "topTrackArtistMbidEvidenceRequiredWhereExposed": True,
            "nameOnlyMatchInsufficient": True,
            "fuzzyMatchForbidden": True,
            "missingMbidEvidenceFailsClosed": True,
        },
    }
    OUTPUT.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    for row in results:
        print("\nTARGET", row["canonicalArtistId"])
        print("nameInfo", row["nameQueryProbe"]["artistInfo"])
        print("mbidInfo", row["mbidQueryProbe"]["artistInfo"])
        print(
            "searchMatches",
            row["artistSearchProbe"].get("matches", [])[:10],
        )
        print(
            "mbidTopTracks",
            [
                {
                    "name": t["name"],
                    "artistName": t["artistName"],
                    "artistMbid": t["artistMbid"],
                }
                for t in row["mbidQueryProbe"]["topTracks"].get("tracks", [])[:10]
            ],
        )
        print("evidence", row["evidence"])

    print(
        "\nallTargetsCanonicalSpecificBindingSupported="
        + str(all_supported).upper()
    )
    print("activationAuthorized=FALSE")


if __name__ == "__main__":
    main()
