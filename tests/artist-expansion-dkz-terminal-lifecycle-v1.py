from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_dkz_terminal_lifecycle_catalog_v1.py"
spec = importlib.util.spec_from_file_location("dkz_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>동요엔터테인먼트 DKZ 2026년 5월 31일 그룹 활동을 마무리 세현 민규 재찬 주원 기석</body></html>"
group_rename = "<html><body>DONGKIZ changes official group name to DKZ; do not think of DONGKIZ and DKZ as separate groups, but one group</body></html>"
member_rename = "<html><body>2026 동요엔터테인먼트 종형 활동명을 주원으로 변경</body></html>"
fancon = "<html><body>2026 DKZ FAN-CON THE DINNER DONG-ARI Organizer / Promoter : Dongyo Entertainment</body></html>"
debut = "<html><body>Jaechan since my debut on April 24, 2019 DKZ DONGKIZ journey</body></html>"

rows = module.parse_live_pages(terminal, group_rename, member_rename, fancon, debut)
assert [row["displayArtist"] for row in rows] == ["DKZ"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["terminalLifecycleEvidenceRequired"] is True
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["terminalNoticeOverridesEarlierActiveEvidence"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["groupRenameContinuityRequired"] is True
assert snapshot["contract"]["memberStageNameRenameContinuityRequired"] is True
assert snapshot["contract"]["individualPostGroupActivitiesDoNotReactivateGroup"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["identityContinuity"]["formerGroupName"] == "DONGKIZ"
assert snapshot["identityContinuity"]["currentCanonicalName"] == "DKZ"
assert snapshot["identityContinuity"]["renamedMember"]["formerStageName"] == "JONGHYEONG"
assert snapshot["identityContinuity"]["renamedMember"]["currentStageName"] == "JUONE"
assert snapshot["terminalLifecycle"]["effectiveDate"] == "2026-05-31"
assert snapshot["terminalLifecycle"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalLifecycle"]["agencyStatus"] == "historical"
assert snapshot["terminalLifecycle"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert module.parse_live_pages(terminal.replace("기석", ""), group_rename, member_rename, fancon, debut) == []
assert module.parse_live_pages(terminal.replace("그룹 활동을 마무리", "그룹 활동을 계속"), group_rename, member_rename, fancon, debut) == []
assert module.parse_live_pages(terminal, group_rename.replace("one group", "different identities").replace("separate groups", "same text"), member_rename, fancon, debut) == []
assert module.parse_live_pages(terminal, group_rename, member_rename.replace("주원", "다른이름"), fancon, debut) == []
assert module.parse_live_pages(terminal, group_rename, member_rename, fancon.replace("DONG-ARI", "OTHER"), debut) == []
print("DKZ official terminal lifecycle catalog adapter regression: PASS")
