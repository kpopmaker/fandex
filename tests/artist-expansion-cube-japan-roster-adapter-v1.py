from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_cube_japan_music_roster_v1.py"

spec = importlib.util.spec_from_file_location("cube_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <h1>ARTISTS</h1>
  <div>PENTAGON</div>
  <div>i-dle</div>
  <div>LIGHTSUM</div>
  <div>NOWZ</div>
  <div>SLAY</div>
  <div>ACTORS/TALENT</div>
  <div>KWON SOHYUN</div>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-26T00:00:00+00:00",
)
assert snapshot["candidateCount"] == 5
assert snapshot["contract"]["musicTaxonomyOnly"] is True
assert snapshot["contract"]["actorTalentTaxonomyExcluded"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_roster(html.replace("<div>SLAY</div>", "")) == []

print("CUBE Japan music roster adapter regression: PASS")
