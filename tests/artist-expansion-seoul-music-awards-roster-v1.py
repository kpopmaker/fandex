from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_seoul_music_awards_group_roster_v1.py"

spec = importlib.util.spec_from_file_location("sma_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

html = """
<html><body>
  <img alt="SUPER JUNIOR" />
  <img alt="EXO" />
  <img alt="AHOF" />
  <img alt="MONSTA X" />
</body></html>
"""
rows = module.parse_roster(html)
assert [row["displayArtist"] for row in rows] == [
    "SUPER JUNIOR", "EXO", "AHOF", "MONSTA X"
]
snapshot = module.build_snapshot(rows, "2026-09-25T00:00:00Z")
assert snapshot["source"]["type"] == "broadcast_or_award_roster"
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["contract"]["voteRankIsNotEligibilityThreshold"] is True
print("Seoul Music Awards roster adapter regression: PASS")
