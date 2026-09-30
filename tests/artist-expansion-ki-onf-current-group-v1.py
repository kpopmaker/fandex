from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_ki_onf_current_group_v1.py"
spec = importlib.util.spec_from_file_location("ki_onf_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

agency = """
<html><body>
KI ENTERTAINMENT OFFICIAL
ONF exclusive contract current artist
</body></html>
"""
group = """
<html><body>
ONF OFFICIAL
ONF:MY SELF
Open The Door
</body></html>
"""

rows = module.parse_live_pages(agency, group)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-30T11:10:00+09:00")
assert snapshot["candidateCount"] == 1
entry = snapshot["currentIdentityState"]["ONF"]
assert entry["agency"] == "KI Entertainment"
assert entry["agencyStatus"] == "verified"
assert entry["lifecycleStatus"] == "active"
assert entry["entityType"] == "group"
assert entry["members"] == module.MEMBERS
assert entry["memberCount"] == 6
assert entry["current2026MusicEvidence"]["release"] == "ONF:MY SELF"
assert entry["current2026MusicEvidence"]["releaseDate"] == "2026-06-17"
assert entry["current2026MusicEvidence"]["titleTrack"] == "Open The Door"
assert snapshot["contract"]["historicalWMNotCurrentAgency"] is True
assert snapshot["contract"]["existingCanonicalMustSuppressDuplicateDiscovery"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(agency.replace("KI ENTERTAINMENT", "OTHER"), group) == []
assert module.parse_live_pages(agency.replace("ONF", "OTHER"), group) == []
assert module.parse_live_pages(agency, group.replace("ONF", "OTHER")) == []
assert module.parse_live_pages(agency, group.replace("Open The Door", "OTHER").replace("ONF:MY SELF", "OTHER")) == []

print("KI Entertainment ONF current group identity regression: PASS")
