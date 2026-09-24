from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_yg_agency_roster_v1.py"

spec = importlib.util.spec_from_file_location("yg_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <a href="/en/artists/yg-family/profile">YG FAMILY</a>
  <a href="/en/artists/bigbang/profile">BIGBANG</a>
  <a href="/en/artists/blackpink/profile">BLACKPINK</a>
  <a href="/en/artists/treasure/profile">TREASURE</a>
  <a href="/en/artists/babymonster/profile">BABYMONSTER</a>
  <a href="/en/artists/winner/profile">WINNER</a>
  <a href="/en/artists/eun-jiwon/profile">EUN JIWON</a>
  <a href="/en/about/introduction">ABOUT YG</a>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == [
    "BIGBANG",
    "BLACKPINK",
    "TREASURE",
    "BABYMONSTER",
    "WINNER",
    "EUN JIWON",
]
assert rows[-1]["evidence"][0]["url"] == "https://ygfamily.com/en/artists/eun-jiwon/profile"

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-24T00:00:00+00:00",
)
assert snapshot["candidateCount"] == 6
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["contract"]["autoPromote"] is False

print("YG agency roster adapter regression: PASS")
