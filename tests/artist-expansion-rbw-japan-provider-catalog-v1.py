from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_rbw_japan_provider_catalog_v1.py"

spec = importlib.util.spec_from_file_location("rbw_japan_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <div>KARA</div>
  <div>B1A4</div>
  <div>MAMAMOO</div>
  <div>Solar</div>
  <div>Moon Byul</div>
  <div>OH MY GIRL</div>
  <div>KARD</div>
  <div>ONEWE</div>
  <div>CSR</div>
  <div>AHN YEEUN</div>
  <div>YOUNG POSSE</div>
  <div>XLOV</div>
  <div>SECRET</div>
</body></html>
"""

rows = module.parse_catalog(html)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS
assert rows[4]["aliases"] == ["문별", "Moonbyul"]
assert rows[-1]["aliases"] == ["시크릿"]

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-26T00:00:00+00:00",
)
assert snapshot["candidateCount"] == 13
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["crossLabelCatalog"] is True
assert snapshot["contract"]["catalogPresenceDoesNotImplyPrimaryAgency"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_catalog(html.replace("<div>XLOV</div>", "")) == []

print("RBW JAPAN provider catalog adapter regression: PASS")
