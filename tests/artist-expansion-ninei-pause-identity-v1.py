from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_ninei_official_pause_identity_catalog_v1.py"
spec = importlib.util.spec_from_file_location("ninei_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

pause = "<html><body>Hello. This is NINE.i. For the time being, we will focus on individual activities rather than group activities. This decision does not mean that the group is disbanding.</body></html>"
seowon = "<html><body>나인아이 서원 팀 탈퇴. 이후 활동은 7인 체제로 이어가게 됐다. 현재 소속사 없이 소통을 이어가고 있다.</body></html>"
joohyoung = "<html><body>NINE.i 주형 팀 탈퇴 의사. 나인아이는 주형 없이 8인 체제로 활동을 계속한다.</body></html>"
winnie = "<html><body>FirstOne Entertainment Winnie leaving NINE.i. Winnie's activities as NINE.i are coming to an end. NINE.i will continue as a 9-member group.</body></html>"
debut = "<html><body>퍼스트원엔터테인먼트 나인아이 제원 이든 민준 반 베리 서원 태훈 주형 지호 위니 2022년 3월 30일 NEW WORLD 데뷔</body></html>"
catalog = "<html><body>NEW WORLD - EP NINE.i March 30, 2022</body></html>"

rows = module.parse_live_pages(pause, seowon, joohyoung, winnie, debut, catalog)
assert [row["displayArtist"] for row in rows] == ["NINE.i"]
snapshot = module.build_snapshot(rows, "2026-09-28T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["explicitNonDisbandingStatementRequired"] is True
assert snapshot["contract"]["groupActivityPauseDoesNotEqualTermination"] is True
assert snapshot["contract"]["pausedGroupRetainsActiveLifecycle"] is True
assert snapshot["contract"]["exactCurrentMemberRosterRequired"] is True
assert snapshot["contract"]["currentAgencyAbsenceMustRemainUnresolved"] is True
assert snapshot["contract"]["blankAgencyRequiredWhenAgencyStatusUnresolved"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["currentIdentity"]["lifecycleStatus"] == "active"
assert snapshot["currentIdentity"]["groupActivityPaused"] is True
assert snapshot["currentIdentity"]["groupDisbanded"] is False
assert snapshot["currentIdentity"]["agency"] == ""
assert snapshot["currentIdentity"]["agencyStatus"] == "unresolved"
assert snapshot["currentIdentity"]["members"] == module.EXPECTED_MEMBERS
assert snapshot["currentIdentity"]["currentMemberCount"] == 7
assert snapshot["currentIdentity"]["priorExitedMembers"][0]["member"] == "WINNIE"
assert snapshot["currentIdentity"]["priorExitedMembers"][1]["member"] == "JOOHYOUNG"
assert snapshot["currentIdentity"]["priorExitedMembers"][2]["member"] == "SEOWON"
assert snapshot["currentIdentity"]["debutDate"] == "2022-03-30"
assert module.parse_live_pages(pause.replace("does not mean that the group is disbanding", "the group is disbanding"), seowon, joohyoung, winnie, debut, catalog) == []
assert module.parse_live_pages(pause, seowon.replace("7인 체제", "8인 체제"), joohyoung, winnie, debut, catalog) == []
assert module.parse_live_pages(pause, seowon.replace("현재 소속사 없이", "현재 소속사와 함께"), joohyoung, winnie, debut, catalog) == []
assert module.parse_live_pages(pause, seowon, joohyoung.replace("8인 체제", "9인 체제"), winnie, debut, catalog) == []
assert module.parse_live_pages(pause, seowon, joohyoung, winnie.replace("9-member group", "10-member group"), debut, catalog) == []
assert module.parse_live_pages(pause, seowon, joohyoung, winnie, debut.replace("지호", ""), catalog) == []
assert module.parse_live_pages(pause, seowon, joohyoung, winnie, debut, catalog.replace("March 30, 2022", "March 31, 2022")) == []
print("NINE.i official pause identity catalog adapter regression: PASS")
