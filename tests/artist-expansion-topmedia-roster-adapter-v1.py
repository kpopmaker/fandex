from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_topmedia_music_roster_v1.py"

spec = importlib.util.spec_from_file_location("topmedia_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <nav>
    <span>ODD YOUTH</span>
    <span>MCND</span>
    <span>TEEN TOP</span>
    <span>UP10TION</span>
    <span>100%</span>
  </nav>
  <main>MCND PROFILE</main>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS
assert rows[0]["aliases"] == ["오드유스"]
assert rows[4]["aliases"] == ["백퍼센트", "100PERCENT"]

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-26T00:00:00+00:00",
)
assert snapshot["candidateCount"] == 5
assert snapshot["contract"]["identityRosterIsNotLifecycleTruth"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_roster(html.replace("<span>UP10TION</span>", "")) == []

print("TOP Media music identity roster adapter regression: PASS")
