from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_weverse_con_2026_roster_v1.py"

spec = importlib.util.spec_from_file_location("weverse_con_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <img alt="82MAJOR 아티스트 프로필 이미지" />
  <img alt="ILLIT 아티스트 프로필 이미지" />
  <img alt="SOOBIN of TXT 아티스트 프로필 이미지" />
  <img alt="SOOBIN of TXT 아티스트 프로필 이미지" />
  <img alt="RAIN 아티스트 프로필 이미지" />
  <img alt="decorative image" />
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == [
    "82MAJOR",
    "ILLIT",
    "SOOBIN of TXT",
    "RAIN",
]

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-24T00:00:00+00:00",
)
assert snapshot["source"]["type"] == "festival_or_event_roster"
assert snapshot["candidateCount"] == 4
assert snapshot["contract"]["eventAppearanceDoesNotImplyAgencyRelation"] is True
assert snapshot["contract"]["eventAppearanceDoesNotImplyKpopScope"] is True
assert snapshot["contract"]["autoPromote"] is False

print("Weverse Con event roster adapter regression: PASS")
