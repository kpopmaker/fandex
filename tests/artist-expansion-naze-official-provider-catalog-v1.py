from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_naze_official_provider_catalog_v1.py"

spec = importlib.util.spec_from_file_location("naze_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

profile = """
<html><body>
<h1>NAZE</h1><div>C9 Entertainment</div>
<div>KAISEI</div><div>YOUNKI</div><div>ATO</div><div>TURN</div>
<div>YUYA</div><div>KIMKUN</div><div>DOHYEOK</div>
</body></html>
"""
release = "<html><body><h1>NAZE I LIKE IT</h1><div>2026.09.14</div></body></html>"

rows = module.parse_live_pages(profile, release)
assert [row["displayArtist"] for row in rows] == ["NAZE"]
assert rows[0]["aliases"] == ["네이즈"]

snapshot = module.build_snapshot(rows, "2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["singleActOfficialCatalog"] is True
assert snapshot["contract"]["currentReleaseEvidenceRequired"] is True
assert snapshot["contract"]["catalogPresenceDoesNotImplyBroaderC9Roster"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(profile.replace("<div>KAISEI</div>", ""), release) == []
assert module.parse_live_pages(profile, release.replace("I LIKE IT", "")) == []

print("NAZE official current provider catalog adapter regression: PASS")
