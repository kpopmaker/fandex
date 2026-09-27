from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_ntx_victory_current_provider_catalog_v1.py"
spec = importlib.util.spec_from_file_location("ntx_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

tour = "<html><body>Hello, this is Victory Company. 2026 NTX ASIA TOUR TOKYO 2026.09.12–13 SHANGHAI HONGKONG TAIPEI SEOUL 2026.12.26 AND NEXT 2027 NTX EUROPE TOUR</body></html>"
leader = "<html><body>Hello, this is Victory Company. Members Hyeongjin and Yunhyeok had been co-leaders. Starting with the upcoming album release and future activities, NTX will proceed under Hyeongjin's sole leadership.</body></html>"
community = '<html><body>NTX Notice Regarding Member "XIHA" Health [ Information on changing the name of the member "JAEMIN" ]</body></html>'
roster = "<html><body>NTX 8인의 멤버 형진, 윤혁, 시하, 창훈, 호준, 로현, 은호, 승원으로 구성되어 있다.</body></html>"
debut = "<html><body>FULL OF LOVESCAPES NTX March 30, 2021 ℗ 2021 VICTORY COMPANY</body></html>"
gihyun = "<html><body>빅토리컴퍼니 NTX 기현 개인적인 사정으로 더 이상 함께 할 수 없음을 인지 전속 계약을 해지</body></html>"
jiseong = "<html><body>Hello, this is Victory Company. Jiseong has decided to withdraw from the NTX team on December 11, 2024 and terminate the exclusive contract.</body></html>"

rows = module.parse_live_pages(tour, leader, community, roster, debut, gihyun, jiseong)
assert [row["displayArtist"] for row in rows] == ["NTX"]
snapshot = module.build_snapshot(rows, "2026-09-28T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["officialCurrentActivityRequired"] is True
assert snapshot["contract"]["currentAgencyManagementEvidenceRequired"] is True
assert snapshot["contract"]["exactCurrentMemberRosterRequired"] is True
assert snapshot["contract"]["explicitFormerMemberDepartureEvidenceRequired"] is True
assert snapshot["contract"]["renameContinuityRequired"] is True
assert snapshot["contract"]["renameDoesNotCreateNewMember"] is True
assert snapshot["contract"]["temporaryNonparticipationDoesNotEqualDeparture"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["currentRoster"]["lifecycleStatus"] == "active"
assert snapshot["currentRoster"]["agencyStatus"] == "verified"
assert snapshot["currentRoster"]["members"] == module.EXPECTED_MEMBERS
assert snapshot["currentRoster"]["currentMemberCount"] == 8
assert snapshot["currentRoster"]["renameContinuity"][0]["from"] == "JAEMIN"
assert snapshot["currentRoster"]["renameContinuity"][0]["to"] == "XIHA"
assert snapshot["currentRoster"]["priorExitedMembers"][0]["member"] == "GIHYUN"
assert snapshot["currentRoster"]["priorExitedMembers"][1]["member"] == "JISEONG"
assert snapshot["currentRoster"]["debutDate"] == "2021-03-30"
assert module.parse_live_pages(tour.replace("SEOUL 2026.12.26", ""), leader, community, roster, debut, gihyun, jiseong) == []
assert module.parse_live_pages(tour, leader.replace("future activities", "past activities"), community, roster, debut, gihyun, jiseong) == []
assert module.parse_live_pages(tour, leader, community.replace('"JAEMIN"', '"OTHER"'), roster, debut, gihyun, jiseong) == []
assert module.parse_live_pages(tour, leader, community, roster.replace("승원", ""), debut, gihyun, jiseong) == []
assert module.parse_live_pages(tour, leader, community, roster, debut.replace("March 30, 2021", "March 31, 2021"), gihyun, jiseong) == []
assert module.parse_live_pages(tour, leader, community, roster, debut, gihyun.replace("전속 계약을 해지", "계약 유지"), jiseong) == []
assert module.parse_live_pages(tour, leader, community, roster, debut, gihyun, jiseong.replace("withdraw from the NTX team", "rest from NTX activities")) == []
print("NTX Victory current provider catalog adapter regression: PASS")
