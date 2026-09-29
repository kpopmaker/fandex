from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_galaxy_current_music_roster_v1.py"
spec = importlib.util.spec_from_file_location("galaxy_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

artists = """
<html><body>
G-DRAGON K-pop artist
TAEMIN K-pop artist March 2026
Kim Jong-kook Singer TV personality
Song Kang-ho Actor
Lee Jung-hoo MLB player
Ryu Jun-yeol Actor
Na In-woo Actor
Jung Il-woo Actor
</body></html>
"""
faq = """
<html><body>
G-DRAGON K-pop artist
TAEMIN K-pop artist joined March 2026
Kim Jong-kook Singer TV personality
</body></html>
"""
robot = "<html><body>G-DRAGON HOME SWEET HOME TAEMIN Advice Idea</body></html>"

rows = module.parse_live_pages(artists, faq, robot)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-30T00:24:00+09:00")
assert snapshot["candidateCount"] == 3
assert snapshot["currentMusicEligibleRoster"]["G-DRAGON"]["officialRosterField"] == "K-pop artist"
assert snapshot["currentMusicEligibleRoster"]["TAEMIN"]["joinedGalaxy"] == "2026-03"
assert snapshot["currentMusicEligibleRoster"]["KIM JONG KOOK"]["officialRosterField"] == "Singer · TV personality"
assert [row["displayArtist"] for row in snapshot["excludedNonMusicRoster"]] == module.EXCLUDED_NON_MUSIC
assert snapshot["contract"]["musicEligibilityRequiresKpopArtistOrSingerField"] is True
assert snapshot["contract"]["actorAndAthleteEntriesMustBeExcluded"] is True
assert snapshot["contract"]["existingCanonicalMustSuppressDuplicateDiscovery"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(artists.replace("TAEMIN", "OTHER"), faq, robot) == []
assert module.parse_live_pages(
    artists.replace("Singer", "Actor"),
    faq.replace("Singer", "Actor"),
    robot,
) == []
assert module.parse_live_pages(artists, faq, robot.replace("Advice", "OTHER")) == []
assert module.parse_live_pages(artists.replace("Lee Jung-hoo", "OTHER"), faq, robot) == []

print("Galaxy current music-eligible artist roster regression: PASS")
