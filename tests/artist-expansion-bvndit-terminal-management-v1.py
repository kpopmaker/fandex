from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/"scripts/artist-expansion/collect_bvndit_mnh_terminal_management_catalog_v1.py"
spec=importlib.util.spec_from_file_location("bvndit_adapter",SCRIPT)
assert spec and spec.loader
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal="<html><body>Hello. This is MNH Entertainment. After an in-depth discussion with the members of BVNDIT, we decided to terminate BVNDIT's exclusive contract at the end of October. The members have decided to support each other's new beginnings.</body></html>"
profile="<html><body>BVNDIT has five members Yiyeon, Songhee, Jungwoo, Simyeong, and Seungeun. They debut April 10.</body></html>"
catalog="<html><body>BVNDIT, BE AMBITIOUS! - Single BVNDIT April 10, 2019 ℗ 2019 MNH Entertainment, Stone Music Entertainment</body></html>"

rows=module.parse_live_pages(terminal,profile,catalog)
assert [row["displayArtist"] for row in rows]==["BVNDIT"]
snapshot=module.build_snapshot(rows,"2026-09-28T00:00:00+09:00")
assert snapshot["candidateCount"]==1
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["groupExclusiveContractEndEvidenceRequired"] is True
assert snapshot["contract"]["impreciseContractEndDateMustRemainPeriod"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["legalDisbandmentNotIndependentlyAsserted"] is True
assert snapshot["terminalManagement"]["contractEndPeriod"]=="2022-10"
assert snapshot["terminalManagement"]["lifecycleStatus"]=="inactive"
assert snapshot["terminalManagement"]["agencyStatus"]=="historical"
assert snapshot["terminalManagement"]["terminalMembers"]==module.EXPECTED_MEMBERS
assert snapshot["terminalManagement"]["terminalMemberCount"]==5
assert snapshot["terminalManagement"]["groupExclusiveContractEnded"] is True
assert snapshot["terminalManagement"]["legalDisbandmentAsserted"] is False
assert snapshot["terminalManagement"]["debutDate"]=="2019-04-10"
assert module.parse_live_pages(terminal.replace("at the end of October","at an unknown time"),profile,catalog)==[]
assert module.parse_live_pages(terminal,profile.replace("Seungeun",""),catalog)==[]
assert module.parse_live_pages(terminal,profile,catalog.replace("April 10, 2019","April 11, 2019"))==[]
print("BVNDIT MNH terminal management catalog adapter regression: PASS")
