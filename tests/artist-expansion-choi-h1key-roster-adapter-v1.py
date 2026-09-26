from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_choi_h1key_roster_v1.py"

spec = importlib.util.spec_from_file_location("choi_h1key_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

company = """
<html><body>
<div>SEOI (H1-KEY)</div><div>RIINA (H1-KEY)</div>
<div>HWISEO (H1-KEY)</div><div>YEL (H1-KEY)</div>
</body></html>
"""
group = "<html><body><h1>H1-KEY</h1><footer>CHOI CREATIVE LAB</footer></body></html>"
home = "<html><body><h2>H1-KEY</h2><div>LOVECHAPTER</div></body></html>"

rows = module.parse_live_pages(company, group, home)
assert [row["displayArtist"] for row in rows] == ["H1-KEY"]
assert rows[0]["aliases"] == ["하이키", "H1KEY"]

snapshot = module.build_snapshot(rows, "2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["contract"]["notExhaustiveLabelRoster"] is True
assert snapshot["contract"]["currentGroupActivityEvidenceRequired"] is True
assert snapshot["contract"]["memberDirectoryDoesNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(company.replace("<div>SEOI (H1-KEY)</div>", ""), group, home) == []
assert module.parse_live_pages(company, group.replace("CHOI CREATIVE LAB", ""), home) == []
assert module.parse_live_pages(company, group, home.replace("LOVECHAPTER", "")) == []

print("CHOI CREATIVE LAB H1-KEY roster adapter regression: PASS")
