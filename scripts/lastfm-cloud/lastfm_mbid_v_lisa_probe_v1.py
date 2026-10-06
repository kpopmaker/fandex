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
            "User-Agent": "FANDEX-ArtistExpansion-LastFM-MBID-Probe/1.0",
        },
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if "error" in payload:
        raise RuntimeError(
            f"{method} error {payload.get('error')}: {payload.get('message')}"
        )
    return payload


def int_or_none(value):
    value = norm(value)
    if not value:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def info_summary(payload):
    artist = payload.get("artist") or {}
    stats = artist.get("stats") or {}
    return {
        "name": norm(artist.get("name")),
        "mbid": norm(artist.get("mbid")),
        "url": norm(artist.get("url")),
        "listeners": int_or_none(stats.get("listeners")),
        "playcount": int_or_none(stats.get("playcount")),
    }


def top_tracks_summary(payload, requested_mbid):
    root = payload.get("toptracks") or {}
    tracks = root.get("track") or []
    if isinstance(tracks, dict):
        tracks = [tracks]
    out = []
    matching_track_artist_mbid_count = 0
    nonempty_track_artist_mbid_count = 0
    for item in tracks[:20]:
        artist = item.get("artist") or {}
        artist_mbid = norm(artist.get("mbid"))
        if artist_mbid:
            nonempty_track_artist_mbid_count += 1
            if artist_mbid.casefold() == requested_mbid.casefold():
                matching_track_artist_mbid_count += 1
        out.append({
            "name": norm(item.get("name")),
            "playcount": int_or_none(item.get("playcount")),
            "listeners": int_or_none(item.get("listeners")),
            "artistName": norm(artist.get("name")),
            "artistMbid": artist_mbid,
            "url": norm(item.get("url")),
        })
    return {
        "attrArtist": norm((root.get("@attr") or {}).get("artist")),
        "returnedTrackCount": len(tracks),
        "examinedTrackCount": len(out),
        "nonemptyTrackArtistMbidCount": nonempty_track_artist_mbid_count,
        "matchingRequestedArtistMbidCount": matching_track_artist_mbid_count,
        "tracks": out,
    }


def main():
    api_key = get_api_key()
    results = []

    for target in TARGETS:
        mbid = target["musicBrainzArtistMbid"]
        name = target["nameQuery"]

        name_info_payload = api_call(
            api_key,
            "artist.getInfo",
            artist=name,
            autocorrect=1,
        )
        mbid_info_payload = api_call(
            api_key,
            "artist.getInfo",
            mbid=mbid,
            autocorrect=0,
        )
        name_tracks_payload = api_call(
            api_key,
            "artist.getTopTracks",
            artist=name,
            autocorrect=1,
            limit=20,
        )
        mbid_tracks_payload = api_call(
            api_key,
            "artist.getTopTracks",
            mbid=mbid,
            autocorrect=0,
            limit=20,
        )

        name_info = info_summary(name_info_payload)
        mbid_info = info_summary(mbid_info_payload)
        name_tracks = top_tracks_summary(name_tracks_payload, mbid)
        mbid_tracks = top_tracks_summary(mbid_tracks_payload, mbid)

        returned_mbid_exact = (
            mbid_info["mbid"].casefold() == mbid.casefold()
        )
        positive_stats = (
            (mbid_info["listeners"] or 0) > 0
            and (mbid_info["playcount"] or 0) > 0
        )
        track_mbid_identity_supported = (
            mbid_tracks["nonemptyTrackArtistMbidCount"] > 0
            and mbid_tracks["matchingRequestedArtistMbidCount"]
            == mbid_tracks["nonemptyTrackArtistMbidCount"]
        )

        # Do not infer canonical-only stats merely because getInfo echoes MBID.
        # Stronger binding requires exact returned artist MBID plus top-track
        # artist MBID evidence where Last.fm exposes it.
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
            "evidence": {
                "returnedMbidExact": returned_mbid_exact,
                "positiveStats": positive_stats,
                "trackMbidIdentitySupported": track_mbid_identity_supported,
                "canonicalSpecificBindingSupported": canonical_specific_binding_supported,
                "nameAndMbidStatsEqual": (
                    name_info["listeners"] == mbid_info["listeners"]
                    and name_info["playcount"] == mbid_info["playcount"]
                ),
                "nameAndMbidUrlEqual": name_info["url"] == mbid_info["url"],
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
        e = row["evidence"]
        print(
            f"{row['canonicalArtistId']} | "
            f"returnedMbidExact={e['returnedMbidExact']} | "
            f"positiveStats={e['positiveStats']} | "
            f"trackMbidIdentitySupported={e['trackMbidIdentitySupported']} | "
            f"nameAndMbidStatsEqual={e['nameAndMbidStatsEqual']} | "
            f"nameAndMbidUrlEqual={e['nameAndMbidUrlEqual']} | "
            f"canonicalSpecificBindingSupported={e['canonicalSpecificBindingSupported']}"
        )
        print(
            "  MBID info:",
            row["mbidQueryProbe"]["artistInfo"],
        )
        print(
            "  MBID top tracks:",
            [
                {
                    "name": t["name"],
                    "artistName": t["artistName"],
                    "artistMbid": t["artistMbid"],
                }
                for t in row["mbidQueryProbe"]["topTracks"]["tracks"][:10]
            ],
        )

    print(
        "allTargetsCanonicalSpecificBindingSupported="
        + str(all_supported).upper()
    )
    print("activationAuthorized=FALSE")


if __name__ == "__main__":
    main()
