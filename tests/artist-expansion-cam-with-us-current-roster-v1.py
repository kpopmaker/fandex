from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_cam_with_us_current_music_roster_v1.py"

spec = importlib.util.spec_from_file_location("cam_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

home = "<html><body>" + " ".join(module.PAGE_ROSTER) + "</body></html>"
archive = "<html><body>" + " ".join(
    f"{artist} Album {module.ALBUM_ANCHORS[artist]}"
    for artist in module.MUSIC_ARTISTS
) + "</body></html>"

rows = module.parse_live_pages(home, archive)
assert [row["displayArtist"] for row in rows] == module.MUSIC_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-29T17:37:00+09:00")
assert snapshot["candidateCount"] == 13
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["contract"]["fullCurrentRosterPresenceRequired"] is True
assert snapshot["contract"]["musicIdentityRequiresOfficialAlbumArchiveEvidence"] is True
assert snapshot["contract"]["rosterPresenceAloneDoesNotCreateMusicCanonical"] is True
assert snapshot["contract"]["memberRosterNotInferredFromAgencyListing"] is True
assert snapshot["contract"]["autoPromote"] is False
assert [row["displayArtist"] for row in snapshot["excludedRosterProfiles"]] == [
    "Joo Woojae",
    "SANAGO",
    "Lee Seungkook",
]

assert module.parse_live_pages(home.replace("SANAGO", ""), archive) == []
assert module.parse_live_pages(
    home,
    archive.replace(module.ALBUM_ANCHORS["PARKMOONCHI"], ""),
) == []
assert module.parse_live_pages(
    home,
    archive.replace(module.ALBUM_ANCHORS["IDIOTAPE"], ""),
) == []

print("CAM WITH US current music roster adapter regression: PASS")
