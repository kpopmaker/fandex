from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_mulgogi_limyoungwoong_current_solo_v1.py"
spec = importlib.util.spec_from_file_location("mulgogi_limyoungwoong_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

html = """
<html><body>
Mulgogimusic
임 영 웅 Lim Young Woong
데뷔일 : 2016년 8월 8일
Album
[IM HERO 10]
2026. 09. 08
</body></html>
"""

rows = module.parse_live_page(html)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-30T10:45:00+09:00")
assert snapshot["candidateCount"] == 1
entry = snapshot["currentIdentityState"]["Lim Young-woong"]
assert entry["agency"] == "Mulgogi Music"
assert entry["agencyStatus"] == "verified"
assert entry["lifecycleStatus"] == "active"
assert entry["entityType"] == "solo"
assert entry["debutDate"] == "2016-08-08"
assert entry["current2026MusicEvidence"]["release"] == "IM HERO 10"
assert entry["current2026MusicEvidence"]["releaseDate"] == "2026-09-08"
assert snapshot["contract"]["existingCanonicalMustSuppressDuplicateDiscovery"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_page(html.replace("Lim Young Woong", "OTHER")) == []
assert module.parse_live_page(html.replace("2016년 8월 8일", "OTHER")) == []
assert module.parse_live_page(html.replace("IM HERO 10", "OTHER")) == []
assert module.parse_live_page(html.replace("2026. 09. 08", "OTHER")) == []

print("Mulgogi Lim Young-woong current solo identity regression: PASS")
