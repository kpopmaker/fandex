from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_antenna_music_roster_v1.py"

spec = importlib.util.spec_from_file_location("antenna_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <div>You Hee Yul</div>
  <div>Yu Jae Seok</div>
  <div>Jung Jae Hyung</div>
  <div>Lucid Fall</div>
  <div>PEPPERTONES</div>
  <div>Lee Seo Jin</div>
  <div>Lee Sang Soon</div>
  <div>Lee Hyo Ri</div>
  <div>Jung Seung Hwan</div>
  <div>Park Sae Byul</div>
  <div>KYUHYUN</div>
  <div>Yang Se Chan</div>
  <div>Dragon Pony (드래곤포니)</div>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == module.MUSIC_ARTISTS
assert "Yu Jae Seok" not in [row["displayArtist"] for row in rows]
assert "Lee Seo Jin" not in [row["displayArtist"] for row in rows]
assert "Yang Se Chan" not in [row["displayArtist"] for row in rows]

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-26T00:00:00+00:00",
)
assert snapshot["candidateCount"] == 10
assert snapshot["contract"]["musicIdentitiesOnly"] is True
assert snapshot["contract"]["nonMusicProfilesExcluded"] == [
    "Yu Jae Seok",
    "Lee Seo Jin",
    "Yang Se Chan",
]
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_roster(html.replace("<div>KYUHYUN</div>", "")) == []

print("Antenna music roster adapter regression: PASS")
