from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_s2_entertainment_current_artist_roster_v1.py"
spec = importlib.util.spec_from_file_location("s2_entertainment_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

roster = "<html><body>ARTIST KISS OF LIFE S2 ENTERTAINMENT</body></html>"
profile = "<html><body>KISS OF LIFE JULIE NATTY BELLE HANEUL</body></html>"
activity = '<html><body>KISS OF LIFE 3rd Single "SWEAT" 2026.08.04</body></html>'

rows = module.parse_live_pages(roster, profile, activity)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS
snapshot = module.build_snapshot(rows, "2026-09-29T23:18:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["currentRoster"]["KISS OF LIFE"]["agency"] == "S2 Entertainment"
assert snapshot["currentRoster"]["KISS OF LIFE"]["entityType"] == "group"
assert snapshot["currentRoster"]["KISS OF LIFE"]["members"] == module.EXPECTED_MEMBERS
assert snapshot["currentRoster"]["KISS OF LIFE"]["memberCount"] == 4
assert snapshot["contract"]["memberProfilesDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["existingCanonicalMustSuppressDuplicateDiscovery"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(roster.replace("KISS OF LIFE", ""), profile, activity) == []
assert module.parse_live_pages(roster, profile.replace("HANEUL", ""), activity) == []
assert module.parse_live_pages(roster, profile, activity.replace("2026.08.04", "2025.08.04")) == []
assert module.parse_live_pages(roster, profile, activity.replace("SWEAT", "OTHER")) == []

print("S2 Entertainment current artist roster regression: PASS")
