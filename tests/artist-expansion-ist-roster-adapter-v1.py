from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_ist_artist_roster_v1.py"

spec = importlib.util.spec_from_file_location("ist_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <h1>TUNEXX</h1>
  <div>Arctic</div><div>Sihwan</div><div>Zeon</div>
  <div>Sungjun</div><div>Taira</div><div>Inhu</div><div>Donggyu</div>
  <div>Set By Us Only</div>
</body></html>
"""

rows = module.parse_roster(html, "https://istent.co.kr/artist/tunexx")
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS
assert rows[0]["aliases"] == ["튜넥스"]

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-26T00:00:00+00:00",
    "https://istent.co.kr/artist/tunexx",
)
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["resolvedUrl"].endswith("/artist/tunexx")
assert snapshot["contract"]["currentDirectoryOnly"] is True
assert snapshot["contract"]["formerHistoricActsAreNotCurrentRoster"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_roster(html.replace("<div>Arctic</div>", "")) == []
assert module.parse_roster(html.replace("<div>Set By Us Only</div>", "")) == []

print("IST current artist directory adapter regression: PASS")
