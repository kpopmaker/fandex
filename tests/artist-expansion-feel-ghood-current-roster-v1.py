from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_feel_ghood_current_artist_roster_v1.py"
spec = importlib.util.spec_from_file_location("feel_ghood_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

roster = "<html><body>ARTIST Tiger JK yoonmirae BIBI FEEL GHOOD MUSIC</body></html>"
duet = "<html><body>Tiger JK 윤미래 Let Me Love You 2026.08.20 FeelGhoodMusic</body></html>"
bibi = "<html><body>Warner Music BIBI FeelGHood Music management company May 19 2026</body></html>"

rows = module.parse_live_pages(roster, duet, bibi)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS
snapshot = module.build_snapshot(rows, "2026-09-29T22:51:00+09:00")
assert snapshot["candidateCount"] == 3
assert snapshot["currentRoster"]["Tiger JK"]["entityType"] == "solo"
assert snapshot["currentRoster"]["Yoonmirae"]["entityType"] == "solo"
assert snapshot["currentRoster"]["BIBI"]["agency"] == "Feel Ghood Music"
assert snapshot["contract"]["historicalGroupIdentityNotAutoCreated"] is True
assert snapshot["contract"]["duetDoesNotCreateUnitCanonical"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(roster.replace("Tiger JK", ""), duet, bibi) == []
assert module.parse_live_pages(roster.replace("BIBI", ""), duet, bibi) == []
assert module.parse_live_pages(roster, duet.replace("2026.08.20", ""), bibi) == []
assert module.parse_live_pages(roster, duet, bibi.replace("management company", "other")) == []

print("Feel Ghood current artist roster regression: PASS")
