from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_rbw_agency_roster_v1.py"

spec = importlib.util.spec_from_file_location("rbw_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <h1>RBW Artist</h1>
  <div>MAMAMOO+</div>
  <div>ONEWE</div>
  <div>PURPLE KISS</div>
  <div>[PRE-DEBUT] NXD</div>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == [
    "MAMAMOO+",
    "ONEWE",
    "PURPLE KISS",
    "NXD",
]
assert rows[-1]["aliases"] == ["[PRE-DEBUT] NXD"]

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-25T00:00:00+00:00",
)
assert snapshot["candidateCount"] == 4
assert snapshot["contract"]["preDebutStatusPreserved"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_roster(html.replace("<div>[PRE-DEBUT] NXD</div>", "")) == []

print("RBW agency roster adapter regression: PASS")
