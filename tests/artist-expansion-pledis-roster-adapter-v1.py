from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_pledis_music_roster_v1.py"

spec = importlib.util.spec_from_file_location("pledis_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <div>AFTER SCHOOL</div>
  <div>ORANGE CARAMEL</div>
  <div>BUMZU</div>
  <div>NU&#96;EST</div>
  <div>SINGER HWANG MIN HYUN</div>
  <div>SEVENTEEN</div>
  <div>TWS</div>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS
assert "뉴이스트" in rows[3]["aliases"]

serialized_html = """
<html><body>
<script>
window.__PLEDIS_STATE__ = {
  "brand":"PLEDIS Entertainment",
  "artists":"AFTER SCHOOL ORANGE CARAMEL BUMZU NU`EST HWANG MIN HYUN SEVENTEEN TWS"
};
</script>
</body></html>
"""
serialized_rows = module.parse_roster(serialized_html)
assert [row["displayArtist"] for row in serialized_rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-26T00:00:00+00:00",
)
assert snapshot["candidateCount"] == 7
assert snapshot["contract"]["identityRosterIsNotLifecycleTruth"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_roster(html.replace("<div>BUMZU</div>", "")) == []
assert module.parse_roster(serialized_html.replace("TWS", "")) == []

print("PLEDIS music identity roster adapter regression: PASS")
