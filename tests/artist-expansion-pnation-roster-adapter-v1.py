from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_pnation_agency_roster_v1.py"

spec = importlib.util.spec_from_file_location("pnation_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <a href="/artists/11">PSY</a>
  <a href="/artists/12">CRUSH</a>
  <a href="/artists/13">TNX</a>
  <a href="/artists/14">HWASA</a>
  <a href="/artists/15">AN SHINAE</a>
  <a href="/artists/16">DANIEL JIKAL</a>
  <a href="/artists/17">Baby DONT Cry</a>
  <a href="/releases">RELEASES</a>
  <a href="https://example.com/artists/99">Not P NATION</a>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == [
    "PSY",
    "CRUSH",
    "TNX",
    "HWASA",
    "AN SHINAE",
    "DANIEL JIKAL",
    "Baby DONT Cry",
]
assert rows[-1]["evidence"][0]["url"] == "https://pnation.com/artists/17"
assert module.artist_id_from_href("https://example.com/artists/99") == ""

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-25T00:00:00+00:00",
)
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["candidateCount"] == 7
assert snapshot["contract"]["autoPromote"] is False

print("P NATION agency roster adapter regression: PASS")
