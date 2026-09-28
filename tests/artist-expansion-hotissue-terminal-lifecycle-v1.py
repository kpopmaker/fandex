from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_hotissue_s2_terminal_lifecycle_catalog_v1.py"
spec = importlib.util.spec_from_file_location("hotissue_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>April 22 Hello. This is S2 Entertainment. After the end of a long discussion, the agency and the agency's artist HOT ISSUE have decided to disband the team.</body></html>"
terminal_ko = "<html><body>S2엔터테인먼트입니다. 당사와 소속 아티스트 핫이슈는 오랜 논의 끝에 팀을 해체하기로 결정했습니다.</body></html>"
debut = "<html><body>2021년04월28일 S2엔터테인먼트 1호 그룹 핫이슈. 나현, 메이나, 형신, 다나, 예원, 예빈, 다인 등 7명의 멤버.</body></html>"
catalog = "<html><body>ISSUE MAKER 핫이슈 (HOT ISSUE) 발매일 2021.04.28 기획사 S2 Entertainment</body></html>"

rows = module.parse_live_pages(terminal, terminal_ko, debut, catalog)
assert [row["displayArtist"] for row in rows] == ["HOT ISSUE"]
snapshot = module.build_snapshot(rows, "2026-09-28T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["explicitGroupDisbandmentEvidenceRequired"] is True
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["groupDisbandmentDoesNotInferIndividualContractEnd"] is True
assert snapshot["contract"]["groupDisbandmentDoesNotInferIndividualCareerEnd"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalLifecycle"]["effectiveDate"] == "2022-04-22"
assert snapshot["terminalLifecycle"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalLifecycle"]["agencyStatus"] == "historical"
assert snapshot["terminalLifecycle"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalLifecycle"]["terminalMemberCount"] == 7
assert snapshot["terminalLifecycle"]["groupDisbandmentExplicit"] is True
assert snapshot["terminalLifecycle"]["debutDate"] == "2021-04-28"
assert module.parse_live_pages(terminal.replace("decided to disband the team", "decided to discuss the team"), terminal_ko, debut, catalog) == []
assert module.parse_live_pages(terminal, terminal_ko.replace("팀을 해체하기로 결정", "팀의 방향을 논의"), debut, catalog) == []
assert module.parse_live_pages(terminal, terminal_ko, debut.replace("다인", ""), catalog) == []
assert module.parse_live_pages(terminal, terminal_ko, debut, catalog.replace("2021.04.28", "2021.04.29")) == []
print("HOT ISSUE S2 terminal lifecycle catalog adapter regression: PASS")
