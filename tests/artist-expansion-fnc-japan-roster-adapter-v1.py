from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_fnc_japan_music_roster_v1.py"

spec = importlib.util.spec_from_file_location("fnc_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <div>ARTIST LIST</div>
  <a>FTISLAND</a>
  <a>CNBLUE</a>
  <a>N.Flying</a>
  <a>SF9</a>
  <a>P1Harmony</a>
  <a>Hi-Fi Un!corn</a>
  <a>AMPERS&amp;ONE</a>
  <a>AxMxP</a>
  <a>JUNG HAEIN</a>
  <a>ROWOON</a>
  <h2>FTISLAND</h2>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_MUSIC_ARTISTS
assert all(row["evidence"][0]["url"] == module.DEFAULT_URL for row in rows)

serialized_html = """
<html><body>
<script>
window.__WIX_STATE__ = {"artistList":"FTISLAND CNBLUE N.Flying SF9 P1Harmony Hi-Fi Un!corn AMPERS&ONE AxMxP JUNG HAEIN ROWOON"};
</script>
</body></html>
"""
serialized_rows = module.parse_roster(serialized_html)
assert [row["displayArtist"] for row in serialized_rows] == module.EXPECTED_MUSIC_ARTISTS

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-25T00:00:00+00:00",
)
assert snapshot["candidateCount"] == 8
assert snapshot["contract"]["musicRosterOnly"] is True
assert snapshot["contract"]["actorsExcluded"] is True
assert snapshot["contract"]["autoPromote"] is False

bad_serialized = serialized_html.replace("ROWOON", "")
assert module.parse_roster(bad_serialized) == []

bad_html = html.replace("<a>AxMxP</a>", "")
assert module.parse_roster(bad_html) == []

print("FNC Japan music roster adapter regression: PASS")
