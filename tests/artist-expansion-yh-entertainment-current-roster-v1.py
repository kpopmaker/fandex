from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_yh_entertainment_current_music_roster_v1.py"

spec = importlib.util.spec_from_file_location("yh_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

music = "<html><body>ARTISTS Music YENA TEMPEST DáFF AND2BLE</body></html>"
yena = "<html><body>YENA 예나 2022. 01. 17 SMiLEY</body></html>"
tempest = "<html><body>TEMPEST 템페스트 2022. 03. 02 " + " ".join(module.TEMPEST_MEMBERS) + "</body></html>"
daff = "<html><body>DáFF 다프 2024. 12. 11 ZOMBIE Glow up</body></html>"
and2ble = "<html><body>AND2BLE 2026.05.26 " + " ".join(module.AND2BLE_MEMBER_TOKENS) + "</body></html>"

rows = module.parse_live_pages(music, yena, tempest, daff, and2ble)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-29T20:35:00+09:00")
assert snapshot["candidateCount"] == 4
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["currentRoster"]["YENA"]["entityType"] == "solo"
assert snapshot["currentRoster"]["TEMPEST"]["members"] == module.TEMPEST_MEMBERS
assert snapshot["currentRoster"]["TEMPEST"]["memberCount"] == 6
assert snapshot["currentRoster"]["DáFF"]["debutDate"] == "2024-12-11"
assert snapshot["currentRoster"]["AND2BLE"]["members"] == module.AND2BLE_MEMBERS
assert snapshot["currentRoster"]["AND2BLE"]["memberCount"] == 5
assert snapshot["contract"]["dedicatedProfileRequiredForNewCanonical"] is True
assert snapshot["contract"]["groupMemberSoloActivityDoesNotCreateCanonicalWithoutDedicatedProfile"] is True
assert snapshot["contract"]["agencyNameNormalizedToCurrentOfficialYH"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(music.replace("DáFF", "OTHER"), yena, tempest, daff, and2ble) == []
assert module.parse_live_pages(music, yena, tempest.replace("TAERAE", ""), daff, and2ble) == []
assert module.parse_live_pages(music, yena, tempest, daff.replace("2024. 12. 11", ""), and2ble) == []
assert module.parse_live_pages(music, yena, tempest, daff, and2ble.replace("한유진", "")) == []

print("YH ENTERTAINMENT current music roster regression: PASS")
