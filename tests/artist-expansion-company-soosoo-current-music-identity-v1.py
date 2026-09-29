from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_company_soosoo_current_music_identity_v1.py"
spec = importlib.util.spec_from_file_location("company_soosoo_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

artist = "<html><body>ARTIST 안녕하세요, 도경수입니다. Mars CONCEPT PHOTO</body></html>"
notice = "<html><body>도경수 BLISS Snowfall at Night 공지</body></html>"
bliss = "<html><body>도경수 첫 번째 정규 앨범 BLISS SING ALONG! 총 10곡</body></html>"
snowfall = "<html><body>도경수 Doh Kyung Soo Digital Single Snowfall at Night Out Now!</body></html>"

rows = module.parse_live_pages(artist, notice, bliss, snowfall)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-30T07:08:00+09:00")
assert snapshot["candidateCount"] == 1
entry = snapshot["currentIdentityState"]["DOH KYUNG SOO"]
assert entry["agency"] == "Company Soosoo"
assert entry["agencyStatus"] == "verified"
assert entry["lifecycleStatus"] == "active"
assert entry["entityType"] == "solo"
assert [row["title"] for row in entry["recentMusicEvidence"]] == ["BLISS", "Snowfall at Night"]
assert snapshot["contract"]["actingActivityDoesNotDisqualifyMusicCanonical"] is True
assert snapshot["contract"]["existingCanonicalMustSuppressDuplicateDiscovery"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(artist.replace("Mars", "OTHER"), notice, bliss, snowfall) == []
assert module.parse_live_pages(artist, notice.replace("BLISS", "OTHER"), bliss, snowfall) == []
assert module.parse_live_pages(artist, notice, bliss.replace("10곡", "9곡"), snowfall) == []
assert module.parse_live_pages(artist, notice, bliss, snowfall.replace("Digital Single", "Actor")) == []

print("Company Soosoo current music identity regression: PASS")
