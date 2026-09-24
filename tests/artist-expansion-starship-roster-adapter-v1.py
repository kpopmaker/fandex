from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_starship_agency_roster_v1.py"

spec = importlib.util.spec_from_file_location("starship_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <a href="/musician/kwill">K.will (케이윌)</a>
  <a href="/musician/ive">IVE (아이브)</a>
  <a href="/musician/kiiikiii">KiiiKiii (키키)</a>
  <a href="/musician/idid">IDID (아이딧)</a>
  <a href="/musician/aen">AEN (에이엔)</a>
  <a href="/about">ABOUT STARSHIP</a>
  <a href="/musician">ARTISTS</a>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == [
    "K.will (케이윌)",
    "IVE (아이브)",
    "KiiiKiii (키키)",
    "IDID (아이딧)",
    "AEN (에이엔)",
]
assert rows[1]["evidence"][0]["url"] == "https://www.starship-ent.com/musician/ive"

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-24T00:00:00+00:00",
)
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["candidateCount"] == 5
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["contract"]["identityReviewRequired"] is True

print("STARSHIP agency roster adapter regression: PASS")


fallback = {
    "source": {
        "id": "starship-official-musician-roster",
        "type": "agency_roster",
        "name": "STARSHIP Entertainment Official Artist Roster",
        "observedAt": "2026-09-24T00:00:00Z",
        "url": module.DEFAULT_URL,
    },
    "candidates": [{"displayArtist": "IDID", "aliases": ["아이딧"]}],
}
assert fallback["source"]["type"] == "agency_roster"
assert fallback["candidates"][0]["displayArtist"] == "IDID"
print("STARSHIP verified snapshot fallback contract: PASS")
