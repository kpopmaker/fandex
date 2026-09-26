from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_belift_agency_roster_v1.py"

spec = importlib.util.spec_from_file_location("belift_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <nav>
    <a href="/artist/profile/ENHYPEN">ENHYPEN</a>
    <a href="/artist/profile/ILLIT">ILLIT</a>
    <a href="/artist/profile/EVAN">EVAN</a>
  </nav>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS
assert all(row["aliases"] == [] for row in rows)
assert rows[2]["evidence"][0]["url"].endswith("/EVAN")

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-26T00:00:00+00:00",
)
assert snapshot["candidateCount"] == 3
assert snapshot["contract"]["identityRosterIsNotLifecycleTruth"] is True
assert snapshot["contract"]["memberCreditIsNotIndependentSoloIdentity"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_roster(html.replace('<a href="/artist/profile/EVAN">EVAN</a>', "")) == []
assert module.parse_roster(html.replace("ILLIT", "ILLITX")) == []

print("BELIFT LAB official music roster adapter regression: PASS")
