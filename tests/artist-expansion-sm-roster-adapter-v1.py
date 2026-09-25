from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_sm_agency_roster_v1.py"

spec = importlib.util.spec_from_file_location("sm_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <nav><span>ARTIST</span></nav>
  <main>
    <h1>ARTIST</h1>
    <div>KANGTA</div>
    <div>TVXQ!</div>
    <div>SUPER JUNIOR</div>
    <div>GIRLS’ GENERATION</div>
    <div>SHINee</div>
    <div>EXO</div>
    <div>Red Velvet</div>
    <div>NCT 127</div>
    <div>NCT DREAM</div>
    <div>WayV</div>
    <div>aespa</div>
    <div>RIIZE</div>
    <div>NCT WISH</div>
    <div>nævis</div>
    <div>Hearts2Hearts</div>
    <div>XngHan&amp;Xoul</div>
    <input placeholder="아티스트 검색..." />
    <div>2Spade</div>
    <div>A-NA</div>
    <div>BAEKHYUN</div>
  </main>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == [
    "KANGTA",
    "TVXQ!",
    "SUPER JUNIOR",
    "GIRLS’ GENERATION",
    "SHINee",
    "EXO",
    "Red Velvet",
    "NCT 127",
    "NCT DREAM",
    "WayV",
    "aespa",
    "RIIZE",
    "NCT WISH",
    "nævis",
    "Hearts2Hearts",
    "XngHan&Xoul",
]
assert all(row["evidence"][0]["url"] == module.DEFAULT_URL for row in rows)

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-25T00:00:00+00:00",
)
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["candidateCount"] == 16
assert snapshot["contract"]["featuredRosterOnly"] is True
assert snapshot["contract"]["memberDirectoryExcluded"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_roster("<html><body><div>KANGTA</div></body></html>") == []

print("SM agency roster adapter regression: PASS")
