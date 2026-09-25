from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_wakeone_agency_roster_v1.py"

spec = importlib.util.spec_from_file_location("wakeone_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <div>YICHEN이첸</div>
  <div>KANG WOO JIN강우진</div>
  <div>ALPHA DRIVE ONE알파드라이브원</div>
  <div>KIM FEEL김필</div>
  <div>ZEROBASEONE제로베이스원</div>
  <div>izna이즈나</div>
  <div>Kep1er케플러</div>
  <div>JO YURI조유리</div>
  <div>KIM JAE HWAN김재환</div>
  <div>HA HYUN SANG하현상</div>
  <div>LEE DAE HWI이대휘</div>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == module.EFFECTIVE_ARTISTS
assert "HA HYUN SANG" not in [row["displayArtist"] for row in rows]

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-26T00:00:00+00:00",
)
assert snapshot["candidateCount"] == 10
assert snapshot["contract"]["officialNoticeOverridesRosterPage"] is True
assert snapshot["contract"]["terminatedArtistsExcluded"] == ["HA HYUN SANG"]
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_roster(html.replace("<div>ALPHA DRIVE ONE알파드라이브원</div>", "")) == []

print("WAKEONE notice-aware roster adapter regression: PASS")
