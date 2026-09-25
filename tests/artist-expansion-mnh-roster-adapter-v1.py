from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_mnh_agency_roster_v1.py"

spec = importlib.util.spec_from_file_location("mnh_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <nav>
    <span>8TURN</span>
    <span>이젤 (EJel)</span>
    <span>LIM SANG HYUN</span>
    <span>VVON</span>
  </nav>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS
assert rows[1]["aliases"] == ["이젤", "이젤 (EJel)"]
assert rows[2]["aliases"] == ["임상현"]
assert rows[3]["aliases"] == ["본", "VVON (본)"]

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-26T00:00:00+00:00",
)
assert snapshot["candidateCount"] == 4
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["contract"]["exactCurrentRosterRequired"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_roster(html.replace("<span>VVON</span>", "")) == []

print("MNH agency roster adapter regression: PASS")
