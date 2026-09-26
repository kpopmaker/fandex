from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_newways_asc2nt_roster_v1.py"

spec = importlib.util.spec_from_file_location("newways_asc2nt_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

artist = """
<html><body>
<h1>ASC2NT</h1>
<div>KARAM</div><div>REON</div><div>JAY</div><div>KYLE</div><div>HYOWON</div>
</body></html>
"""
activity = "<html><body><h1>ASC2NT</h1><div>STILL : I</div></body></html>"

rows = module.parse_live_pages(artist, activity)
assert [row["displayArtist"] for row in rows] == ["ASC2NT"]
assert rows[0]["aliases"] == ["어센트"]

snapshot = module.build_snapshot(rows, "2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["contract"]["currentOfficialLineupOnly"] is True
assert snapshot["contract"]["currentActivityEvidenceRequired"] is True
assert snapshot["contract"]["historicalLineupDoesNotOverrideCurrentProfile"] is True
assert snapshot["contract"]["memberProfilesDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(artist.replace("<div>HYOWON</div>", ""), activity) == []
assert module.parse_live_pages(artist, activity.replace("STILL : I", "")) == []

print("NEW WAYS COMPANY ASC2NT roster adapter regression: PASS")
