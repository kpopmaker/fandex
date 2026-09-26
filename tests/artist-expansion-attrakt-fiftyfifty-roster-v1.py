from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_attrakt_fiftyfifty_roster_v1.py"

spec = importlib.util.spec_from_file_location("attrakt_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

directory = "<html><body><h1>FIFTY FIFTY</h1></body></html>"
profile = "<html><body>KEENA CHANELLE MOON YEWON HANA ATHENA</body></html>"
activity = "<html><body>2026 FIFTY FIFTY Asia Fancon Tour</body></html>"

rows = module.parse_live_pages(directory, profile, activity)
assert [row["displayArtist"] for row in rows] == ["FIFTY FIFTY"]
assert rows[0]["aliases"] == ["피프티피프티", "피프티 피프티", "FIFTYFIFTY"]

snapshot = module.build_snapshot(rows, "2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["contract"]["currentLineupEvidenceRequired"] is True
assert snapshot["contract"]["memberHiatusDoesNotOverrideGroupLifecycle"] is True
assert snapshot["contract"]["formerMemberIdentityDoesNotReplaceCurrentGroupIdentity"] is True
assert snapshot["contract"]["memberProfilesDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(directory.replace("FIFTY FIFTY", ""), profile, activity) == []
assert module.parse_live_pages(directory, profile.replace("ATHENA", ""), activity) == []
assert module.parse_live_pages(directory, profile, activity.replace("2026", "")) == []

print("ATTRAKT FIFTY FIFTY roster adapter regression: PASS")
