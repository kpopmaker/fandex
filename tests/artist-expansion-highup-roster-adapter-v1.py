from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_highup_agency_roster_v1.py"

spec = importlib.util.spec_from_file_location("highup_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <section>STAYC The 6th Single Album [2:LOVE]</section>
  <section>UNCHILD Beyond the ordinary, UNCHILD defines its own energy</section>
  <footer>High Up Audition</footer>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == ["STAYC", "UNCHILD"]
assert all(row["evidence"][0]["url"] == module.DEFAULT_URL for row in rows)

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-25T00:00:00+00:00",
)
assert snapshot["candidateCount"] == 2
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["contract"]["exactCurrentRosterRequired"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_roster(html.replace("UNCHILD Beyond the ordinary, UNCHILD defines its own energy", "")) == []

print("High Up agency roster adapter regression: PASS")
