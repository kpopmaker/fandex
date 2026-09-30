from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_mainstream_leeyoungji_current_solo_v1.py"
spec = importlib.util.spec_from_file_location("mainstream_leeyoungji_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

html = """
<html><body>
MAINSTREAM
이영지 (LEE YOUNG JI)
2019.11.02 [ 암실 ] 발매 및 공식데뷔
2024.06.21 [ 16 Fantasy ] 발매
2026.02.28 [ ROBOT ] 발매
</body></html>
"""

rows = module.parse_live_page(html)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-30T17:56:00+09:00")
assert snapshot["candidateCount"] == 1
entry = snapshot["currentIdentityState"]["Lee Young Ji"]
assert entry["agency"] == "Mainstream"
assert entry["agencyStatus"] == "verified"
assert entry["lifecycleStatus"] == "active"
assert entry["entityType"] == "solo"
assert entry["debutDate"] == "2019-11-02"
assert entry["current2026MusicEvidence"]["release"] == "ROBOT"
assert entry["current2026MusicEvidence"]["releaseDate"] == "2026-02-28"
assert snapshot["contract"]["existingCanonicalMustSuppressDuplicateDiscovery"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_page(html.replace("LEE YOUNG JI", "OTHER")) == []
assert module.parse_live_page(html.replace("공식데뷔", "OTHER")) == []
assert module.parse_live_page(html.replace("ROBOT", "OTHER")) == []
assert module.parse_live_page(html.replace("MAINSTREAM", "OTHER")) == []

print("MAINSTREAM Lee Young Ji current solo identity regression: PASS")
