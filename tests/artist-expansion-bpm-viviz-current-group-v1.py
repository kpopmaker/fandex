from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_bpm_viviz_current_group_v1.py"
spec = importlib.util.spec_from_file_location("bpm_viviz_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

group = "<html><body>BIGPLANETMADE ARTISTS 비비지 VIVIZ PROFILE DISCOGRAPHY VIDEO GALLERY</body></html>"
video = "<html><body>VIVIZ 비비지 La La Love Me 2025.07.08</body></html>"
album = "<html><body>VIVIZ 비비지 A Montage of ( ) La La Love Me 2025.07.08 총 9곡</body></html>"
eunha = "<html><body>은하 EUNHA PROFILE</body></html>"
sinb = "<html><body>신비 SINB PROFILE</body></html>"
umji = "<html><body>엄지 UMJI PROFILE</body></html>"

rows = module.parse_live_pages(group, video, album, eunha, sinb, umji)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-30T07:08:00+09:00")
assert snapshot["candidateCount"] == 1
entry = snapshot["currentIdentityState"]["VIVIZ"]
assert entry["agency"] == "BPM Entertainment"
assert entry["agencyStatus"] == "verified"
assert entry["lifecycleStatus"] == "active"
assert entry["entityType"] == "group"
assert entry["members"] == module.MEMBERS
assert entry["memberCount"] == 3
assert entry["recentMusicEvidence"]["title"] == "A Montage of ( )"
assert entry["recentMusicEvidence"]["titleTrack"] == "La La Love Me"
assert snapshot["contract"]["memberProfileAloneDoesNotCreateSoloCanonical"] is True
assert snapshot["contract"]["existingCanonicalMustSuppressDuplicateDiscovery"] is True
assert snapshot["contract"]["notExhaustiveLabelRoster"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(group.replace("VIVIZ", "OTHER"), video, album, eunha, sinb, umji) == []
assert module.parse_live_pages(group, video.replace("2025.07.08", "2024.07.08"), album, eunha, sinb, umji) == []
assert module.parse_live_pages(group, video, album.replace("9곡", "8곡"), eunha, sinb, umji) == []
assert module.parse_live_pages(group, video, album, eunha.replace("EUNHA", "OTHER"), sinb, umji) == []
assert module.parse_live_pages(group, video, album, eunha, sinb, umji.replace("UMJI", "OTHER")) == []

print("BPM VIVIZ current group identity regression: PASS")
