from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_eden_allhours_current_group_v1.py"
spec = importlib.util.spec_from_file_location("eden_allhours_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

intro = "<html><body>ALL(H)OURS INTRO KUNHO ON:N MINJE YOUMIN HYUNBIN MASAMI XAYDEN</body></html>"
unbound = "<html><body>안녕하세요, 이든엔터테인먼트입니다. ALL(H)OURS SIXTH MINI ALBUM [UNBOUND] 2026 예약판매</body></html>"
broadcast = "<html><body>2026 ALL(H)OURS SIXTH MINI ALBUM [UNBOUND] 공개방송</body></html>"

rows = module.parse_live_pages(intro, unbound, broadcast)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-30T10:01:00+09:00")
assert snapshot["candidateCount"] == 1
entry = snapshot["currentIdentityState"]["ALL(H)OURS"]
assert entry["agency"] == "Eden Entertainment"
assert entry["agencyStatus"] == "verified"
assert entry["lifecycleStatus"] == "active"
assert entry["entityType"] == "group"
assert entry["members"] == module.MEMBERS
assert entry["memberCount"] == 7
assert entry["current2026MusicEvidence"]["release"] == "UNBOUND"
assert entry["current2026MusicEvidence"]["releaseDate"] == "2026-09-10"
assert snapshot["contract"]["memberNameAloneDoesNotCreateSoloCanonical"] is True
assert snapshot["contract"]["existingCanonicalMustSuppressDuplicateDiscovery"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(intro.replace("XAYDEN", "OTHER"), unbound, broadcast) == []
assert module.parse_live_pages(intro, unbound.replace("이든엔터테인먼트", "OTHER"), broadcast) == []
assert module.parse_live_pages(intro, unbound.replace("UNBOUND", "OTHER"), broadcast) == []
assert module.parse_live_pages(intro, unbound, broadcast.replace("SIXTH MINI ALBUM", "OTHER")) == []

print("EDEN ALL(H)OURS current group identity regression: PASS")
