from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_fantagio_music_roster_v1.py"

spec = importlib.util.spec_from_file_location("fantagio_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <div>LUN8</div>
  <div>ZOONIZINI</div>
  <div>LEECHANGSUB</div>
  <div>CHA EUN-WOO</div>
  <div>YOON SAN-HA</div>
  <div>LUN8WAVE</div>
  <div>MOONBIN&SANHA</div>
  <div>WEKIMEKI</div>
  <div>ASTRO</div>
  <div>JINJIN&ROCKY</div>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-26T00:00:00+00:00",
)
assert snapshot["candidateCount"] == 10
assert snapshot["contract"]["identityRosterIsNotLifecycleTruth"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_roster(html.replace("<div>LUN8</div>", "")) == []

print("Fantagio music identity roster adapter regression: PASS")
