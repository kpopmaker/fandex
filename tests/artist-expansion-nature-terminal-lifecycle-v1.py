from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_nature_nch_terminal_lifecycle_catalog_v1.py"
spec = importlib.util.spec_from_file_location("nature_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>n.CH Entertainment. NATURE is ending all official activities as a group. It was decided that the group's activities would come to an end and the members would go their separate ways. Although the group's activities have come to an end, member Sohee will remain with our agency.</body></html>"
terminal_ko = "<html><body>엔씨에이치 엔터테인먼트. NATURE 네이처가 공식적인 그룹 활동을 종료합니다. 그룹 활동을 종료하고 앞으로 각자의 길을 가기로 결정했습니다.</body></html>"
profile = "<html><body>네이처 소희 새봄 루 채빈 하루 유채 선샤인 오로라 로하 9인조 NATURE.</body></html>"
debut = "<html><body>Girls and Flowers - EP NATURE August 3, 2018 ℗ 2018 n.CH Entertainment</body></html>"

rows = module.parse_live_pages(terminal, terminal_ko, profile, debut)
assert [row["displayArtist"] for row in rows] == ["NATURE"]
snapshot = module.build_snapshot(rows, "2026-09-29T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["explicitGroupActivityEndRequired"] is True
assert snapshot["contract"]["temporaryNonparticipationDoesNotEqualDeparture"] is True
assert snapshot["contract"]["explicitDepartureRequiredForMemberRemoval"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalLifecycle"]["effectiveDate"] == "2024-04-27"
assert snapshot["terminalLifecycle"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalLifecycle"]["agencyStatus"] == "historical"
assert snapshot["terminalLifecycle"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalLifecycle"]["terminalMemberCount"] == 9
assert snapshot["terminalLifecycle"]["officialGroupActivitiesEnded"] is True
assert snapshot["terminalLifecycle"]["membersProceedSeparately"] is True
assert snapshot["terminalLifecycle"]["soheeIndividualAgencyRetention"] is True
assert snapshot["terminalLifecycle"]["debutDate"] == "2018-08-03"
assert module.parse_live_pages(terminal.replace("ending all official activities as a group", "continuing official activities as a group").replace("group's activities would come to an end", "group activities continue"), terminal_ko, profile, debut) == []
assert module.parse_live_pages(terminal, terminal_ko.replace("그룹 활동을 종료", "그룹 활동을 계속"), profile, debut) == []
assert module.parse_live_pages(terminal, terminal_ko, profile.replace("선샤인", ""), debut) == []
assert module.parse_live_pages(terminal, terminal_ko, profile.replace("9인조", "8인조"), debut) == []
assert module.parse_live_pages(terminal, terminal_ko, profile, debut.replace("August 3, 2018", "August 4, 2018")) == []
print("NATURE n.CH terminal lifecycle catalog adapter regression: PASS")
