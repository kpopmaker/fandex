from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_bugaboo_ateam_terminal_management_catalog_v1.py"
spec = importlib.util.spec_from_file_location("bugaboo_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>Hello. This is ATEAM Entertainment. bugAboo will be halting group activities from today. The agency and the members decided to halt group activities and terminate all the members' contracts after lengthy consideration.</body></html>"
debut_profile = "<html><body>bugAboo is a six-member group with Choyeon, Yoona, Rainie, Zin, Eunchae, and Cyan. The group made their debut on October 25.</body></html>"
debut_catalog = "<html><body>bugAboo - Single bugAboo October 25, 2021 ℗ 2021 에이팀엔터테인먼트(A TEAM ENTERTAINMENT), under license to Kakao Entertainment</body></html>"

rows = module.parse_live_pages(terminal, debut_profile, debut_catalog)
assert [row["displayArtist"] for row in rows] == ["bugAboo"]
snapshot = module.build_snapshot(rows, "2026-09-28T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["groupActivityHaltEvidenceRequired"] is True
assert snapshot["contract"]["allMemberExclusiveContractTerminationRequired"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["legalDisbandmentNotIndependentlyAsserted"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalManagement"]["effectiveDate"] == "2022-12-08"
assert snapshot["terminalManagement"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalManagement"]["agencyStatus"] == "historical"
assert snapshot["terminalManagement"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalManagement"]["terminalMemberCount"] == 6
assert snapshot["terminalManagement"]["groupActivitiesHalted"] is True
assert snapshot["terminalManagement"]["allMemberExclusiveContractsTerminated"] is True
assert snapshot["terminalManagement"]["legalDisbandmentAsserted"] is False
assert snapshot["terminalManagement"]["debutDate"] == "2021-10-25"
assert module.parse_live_pages(terminal.replace("terminate all the members' contracts", "retain all member contracts"), debut_profile, debut_catalog) == []
assert module.parse_live_pages(terminal.replace("halting group activities from today", "continuing group activities"), debut_profile, debut_catalog) == []
assert module.parse_live_pages(terminal, debut_profile.replace("Cyan", ""), debut_catalog) == []
assert module.parse_live_pages(terminal, debut_profile, debut_catalog.replace("October 25, 2021", "October 26, 2021")) == []
print("bugAboo ATEAM terminal management catalog adapter regression: PASS")
