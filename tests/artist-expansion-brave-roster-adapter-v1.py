from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_brave_music_roster_v1.py"

spec = importlib.util.spec_from_file_location("brave_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


html = """
<html><body>
  <section class="artists">
    <a>DKB</a>
    <a>Candy Shop</a>
  </section>
</body></html>
"""

rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS
assert rows[0]["aliases"] == ["다크비"]
assert rows[1]["aliases"] == ["캔디샵", "CANDY SHOP"]

snapshot = module.build_snapshot(
    rows,
    module.DEFAULT_URL,
    "2026-09-26T00:00:00+00:00",
)
assert snapshot["candidateCount"] == 2
assert snapshot["contract"]["musicGroupsOnly"] is True
assert snapshot["contract"]["individualMemberStatusDoesNotOverrideGroupLifecycle"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_roster(html.replace("<a>DKB</a>", "")) == []
assert module.parse_roster(html.replace("<a>Candy Shop</a>", "")) == []

print("Brave Entertainment music group roster adapter regression: PASS")
