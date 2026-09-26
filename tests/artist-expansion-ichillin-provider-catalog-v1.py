from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_ichillin_official_provider_catalog_v1.py"

spec = importlib.util.spec_from_file_location("ichillin_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

group = """
<html><body>
<h1>ICHILLIN</h1>
<div>JIYOON</div><div>E.JI</div><div>JACKIE</div><div>JOONIE</div>
<div>CHAERIN</div><div>YEJU</div><div>CHOWON</div>
</body></html>
"""
unit = "<html><body><title>ICHILLIN' J BANANA(Look At Me!) MV</title></body></html>"

rows = module.parse_live_pages(group, unit)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS
assert rows[0]["aliases"] == ["아이칠린", "ICHILLIN"]
assert rows[1]["aliases"] == ["아이칠린 제이", "아이칠린J", "ICHILLIN J"]

snapshot = module.build_snapshot(rows, "2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"] == 2
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["parentGroupAndOfficialUnitOnly"] is True
assert snapshot["contract"]["unitMembersDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["unitIdentityDoesNotReplaceParentGroup"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(group.replace("<div>JIYOON</div><div>E.JI</div><div>JACKIE</div>", ""), unit) == []
assert module.parse_live_pages(group, unit.replace("Look At Me!", "No release")) == []

print("ICHILLIN official current provider catalog adapter regression: PASS")
