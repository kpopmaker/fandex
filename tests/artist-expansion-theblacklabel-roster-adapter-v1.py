from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_theblacklabel_music_roster_v1.py"

spec = importlib.util.spec_from_file_location("theblacklabel_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <div>YIM SI WAN</div>
  <div>KWAK DONG YEON</div>
  <div>MEOVV</div>
  <div>TAEYANG</div>
  <div>PARK BO GUM</div>
  <div>ALLDAY PROJECT</div>
  <div>Vince</div>
  <div>JEON SOMI</div>
  <div>LEEJUNG LEE</div>
  <div>ROSÉ</div>
  <div>LEE JONG WON</div>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == module.MUSIC_ARTISTS
assert rows[1]["aliases"] == ["태양"]
assert rows[3]["aliases"] == ["빈스"]
assert rows[5]["displayArtist"] == "ROSÉ"

for excluded in module.NON_MUSIC_ARTISTS:
    assert excluded not in [row["displayArtist"] for row in rows]

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-26T00:00:00+00:00",
)
assert snapshot["candidateCount"] == 6
assert snapshot["contract"]["musicIdentitiesOnly"] is True
assert snapshot["contract"]["nonMusicProfilesExcluded"] == module.NON_MUSIC_ARTISTS
assert snapshot["contract"]["rosterPresenceDoesNotCreateMemberSoloIdentity"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_roster(html.replace("<div>Vince</div>", "")) == []
assert module.parse_roster(html.replace("<div>PARK BO GUM</div>", "")) == []

script_only_html = """
<html><body><div id="app"></div>
<script type="application/json">
{"artists":["YIM SI WAN","KWAK DONG YEON","MEOVV","TAEYANG","PARK BO GUM",
"ALLDAY PROJECT","Vince","JEON SOMI","LEEJUNG LEE","ROSE\\u0301","LEE JONG WON"]}
</script></body></html>
"""
script_rows = module.parse_roster(script_only_html)
assert [row["displayArtist"] for row in script_rows] == module.MUSIC_ARTISTS

print("THEBLACKLABEL music roster adapter regression: PASS")
