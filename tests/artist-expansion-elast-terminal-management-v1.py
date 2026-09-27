from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_elast_terminal_management_catalog_v1.py"
spec = importlib.util.spec_from_file_location("elast_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>안녕하세요 이엔터테인먼트입니다 2026년 8월 31일부로 라노 백결 로민 원혁 원준 예준의 전속계약을 종료</body></html>"
choi_in = "<html><body>이엔터테인먼트 E'LAST 멤버 최인 전속계약이 종료 2026년 4월 30일</body></html>"
seungyeop = "<html><body>이엔터테인먼트 승엽 전속 계약 2025년 6월 5일자로 해지 그에 따라 팀에서 탈퇴</body></html>"
debut = "<html><body>백결 BAEK GYEUL 보이그룹 엘라스트 데뷔 2020년 6월 9일 엘라스트 미니 1집 DAY DREAM</body></html>"
fandom = "<html><body>E'LAST ELRING MEMBERSHIP E ENTERTAINMENT</body></html>"

rows = module.parse_live_pages(terminal, choi_in, seungyeop, debut, fandom)
assert [row["displayArtist"] for row in rows] == ["E'LAST"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["terminalManagementEvidenceRequired"] is True
assert snapshot["contract"]["exactTerminalManagedMemberRosterRequired"] is True
assert snapshot["contract"]["allRemainingManagementContractsTerminated"] is True
assert snapshot["contract"]["priorExplicitDeparturesExcludedFromTerminalRoster"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["managementClosureDoesNotAssertLegalDisbandment"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalManagement"]["effectiveDate"] == "2026-08-31"
assert snapshot["terminalManagement"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalManagement"]["agencyStatus"] == "historical"
assert snapshot["terminalManagement"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalManagement"]["terminalMemberCount"] == 6
assert snapshot["terminalManagement"]["priorExitedMembers"][0]["member"] == "SEUNGYEOP"
assert snapshot["terminalManagement"]["priorExitedMembers"][1]["member"] == "CHOI IN"
assert module.parse_live_pages(terminal.replace("예준", ""), choi_in, seungyeop, debut, fandom) == []
assert module.parse_live_pages(terminal.replace("전속계약을 종료", "전속계약 유지"), choi_in, seungyeop, debut, fandom) == []
assert module.parse_live_pages(terminal, choi_in.replace("최인", "OTHER"), seungyeop, debut, fandom) == []
assert module.parse_live_pages(terminal, choi_in, seungyeop.replace("팀에서 탈퇴", "활동 유지"), debut, fandom) == []
assert module.parse_live_pages(terminal, choi_in, seungyeop, debut.replace("2020년 6월 9일", "2020년 6월 8일"), fandom) == []
assert module.parse_live_pages(terminal, choi_in, seungyeop, debut, fandom.replace("ELRING", "OTHER")) == []
print("E'LAST official terminal management catalog adapter regression: PASS")
