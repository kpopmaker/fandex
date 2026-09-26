from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_newbeat_official_provider_catalog_v1.py"

spec = importlib.util.spec_from_file_location("newbeat_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

profile = """
<html><body>
<h1>NEWBEAT</h1><div>2025年3月24日</div>
<div>Minseok Park</div><div>Minsung Hong</div><div>Yeoyeojeong Jeon</div>
<div>Seohyun Choi</div><div>Taeyang Kim</div><div>Yunhu Jo</div><div>Riwoo Kim</div>
</body></html>
"""
home = "<html><body><h1>NEWBEAT</h1><div>2026.09.25</div></body></html>"

rows = module.parse_live_pages(profile, home)
assert [row["displayArtist"] for row in rows] == ["NEWBEAT"]
assert rows[0]["aliases"] == ["뉴비트"]

snapshot = module.build_snapshot(rows, "2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["singleActOfficialCatalog"] is True
assert snapshot["contract"]["currentActivityEvidenceRequired"] is True
assert snapshot["contract"]["memberProfilesDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(profile.replace("<div>Minseok Park</div>", ""), home) == []
assert module.parse_live_pages(profile, home.replace("2026.09.25", "")) == []

print("NEWBEAT official current provider catalog adapter regression: PASS")
