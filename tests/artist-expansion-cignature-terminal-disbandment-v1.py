from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_cignature_c9_terminal_disbandment_catalog_v1.py"
spec = importlib.util.spec_from_file_location("cignature_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>C9 Entertainment. After thorough discussions, it was mutually agreed that the disbandment of the group was necessary. We terminated the exclusive contracts of all seven cignature members. The group's activities officially concluded as of November 30, 2024.</body></html>"
terminal_ko = "<html><body>C9엔터테인먼트. 당사와 멤버들은 팀의 해체가 필요하다는 사실을 확인했습니다. 시그니처 멤버 7인 전원의 전속계약을 종료하며 2024년 11월 30일 부로 그룹 활동을 종료했습니다.</body></html>"
profile = "<html><body>cignature is a seven-member girl group — Chaesol, Jeewon, Seline, Chloe, Belle, Semi and Dohee. Belle joined project girl group UNIS and cignature has been performing as a group of six during that period.</body></html>"
debut = "<html><body>Nun Nu Nan Na - Single cignature February 4, 2020 ℗ 2020 J9 Entertainment</body></html>"

rows = module.parse_live_pages(terminal, terminal_ko, profile, debut)
assert [row["displayArtist"] for row in rows] == ["cignature"]
snapshot = module.build_snapshot(rows, "2026-09-29T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["explicitAgencyDisbandmentRequired"] is True
assert snapshot["contract"]["allSevenExclusiveContractsTerminatedRequired"] is True
assert snapshot["contract"]["temporaryProjectAbsenceDoesNotTerminateMembership"] is True
assert snapshot["contract"]["sixMemberPromotionSubsetDoesNotChangeCanonicalRoster"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["groupDisbandmentConfirmed"] is True
assert snapshot["contract"]["legalEntityDissolutionNotAsserted"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalManagement"]["effectiveDate"] == "2024-11-30"
assert snapshot["terminalManagement"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalManagement"]["agencyStatus"] == "historical"
assert snapshot["terminalManagement"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalManagement"]["terminalMemberCount"] == 7
assert snapshot["terminalManagement"]["allSevenExclusiveContractsTerminated"] is True
assert snapshot["terminalManagement"]["groupActivitiesEnded"] is True
assert snapshot["terminalManagement"]["groupDisbandmentConfirmed"] is True
assert snapshot["terminalManagement"]["belleTemporaryProjectAbsencePreserved"] is True
assert snapshot["terminalManagement"]["promotionSubsetBeforeTermination"]["activePromotionMemberCount"] == 6
assert snapshot["terminalManagement"]["promotionSubsetBeforeTermination"]["absentMember"] == "BELLE"
assert snapshot["terminalManagement"]["legalEntityDissolutionAsserted"] is False
assert snapshot["terminalManagement"]["debutDate"] == "2020-02-04"
assert module.parse_live_pages(terminal.replace("disbandment of the group was necessary", "future of the group was discussed"), terminal_ko, profile, debut) == []
assert module.parse_live_pages(terminal.replace("all seven cignature members", "six cignature members"), terminal_ko, profile, debut) == []
assert module.parse_live_pages(terminal, terminal_ko.replace("7인 전원의 전속계약", "6인의 전속계약"), profile, debut) == []
assert module.parse_live_pages(terminal, terminal_ko, profile.replace("Belle", "OTHER"), debut) == []
assert module.parse_live_pages(terminal, terminal_ko, profile.replace("performing as a group of six", "Belle departed permanently"), debut) == []
assert module.parse_live_pages(terminal, terminal_ko, profile, debut.replace("February 4, 2020", "February 5, 2020")) == []
print("cignature C9 terminal disbandment catalog adapter regression: PASS")
