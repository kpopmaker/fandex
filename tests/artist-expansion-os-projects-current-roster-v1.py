from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_os_projects_current_music_roster_v1.py"

spec = importlib.util.spec_from_file_location("os_projects_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

artists = """
<html><body>
허각 (Huh Gak)
임한별 (Onestar)
김예찬 (KIM YECHAN)
허용별 (허각, 신용재, 임한별)
허용별 '이게 뭐냔 말이야' MV
허용별 '별의 순간' MV
</body></html>
"""
home = """
<html><body>
2026 OS Projects News
허각X임한별 각별한 콘서트
임한별 다시, 별 아래
허각 미친 사랑의 노래
</body></html>
"""
kim = """
<html><body>
김예찬 OS프로젝트 전속계약 솔로 가수 신곡 발매 음악 활동
</body></html>
"""

rows = module.parse_live_pages(artists, home, kim)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-29T20:35:00+09:00")
assert snapshot["candidateCount"] == 4
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["currentRoster"]["Huh Gak"]["lifecycleStatus"] == "active"
assert snapshot["currentRoster"]["Lim Han Byul"]["lifecycleStatus"] == "active"
assert snapshot["currentRoster"]["KIM YECHAN"]["agency"] == "OS Projects"
assert snapshot["currentRoster"]["HYB"]["entityType"] == "project"
assert snapshot["currentRoster"]["HYB"]["members"] == module.HYB_MEMBERS
assert snapshot["currentRoster"]["HYB"]["memberCount"] == 3
assert snapshot["contract"]["projectMemberDoesNotCreateSoloCanonical"] is True
assert snapshot["contract"]["projectIdentityDoesNotCollapseMemberSoloIdentity"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(artists.replace("김예찬", ""), home, kim) == []
assert module.parse_live_pages(artists.replace("신용재", ""), home, kim) == []
assert module.parse_live_pages(artists.replace("이게 뭐냔 말이야", "").replace("별의 순간", ""), home, kim) == []
assert module.parse_live_pages(artists, home.replace("2026", "2025"), kim) == []
assert module.parse_live_pages(artists, home, kim.replace("전속계약", "")) == []

print("OS Projects current music roster regression: PASS")
