from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_atbo_terminal_lifecycle_catalog_v1.py"
spec = importlib.util.spec_from_file_location("atbo_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>Hello, this is IST Entertainment. We decided to terminate the exclusive contracts with ATBO. The ATBO journey comes to an end. ATBO members Oh Junseok, Ryu Junmin, Bae Hyunjun, Jeong Seunghwan, Kim Yeonkyu, and Won Bin. Jeong Seunghwan is currently serving in the military.</body></html>"
departure = "<html><body>Hello, this is IST Entertainment. ATBO member Seok Rakwon has departed the group. ATBO will continue activities with six members.</body></html>"
debut = "<html><body>Jul 27, 2022 ATBO DEBUT SHOWCASE [The Beginning : 開花]</body></html>"

rows = module.parse_live_pages(terminal, departure, debut)
assert [row["displayArtist"] for row in rows] == ["ATBO"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["terminalManagementEvidenceRequired"] is True
assert snapshot["contract"]["explicitGroupJourneyEndEvidenceRequired"] is True
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["priorExplicitDepartureExcludedFromTerminalRoster"] is True
assert snapshot["contract"]["militaryServiceDoesNotTerminateMembership"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["managementTerminationAloneDoesNotAssertLegalDisbandment"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalLifecycle"]["effectiveDate"] == "2025-12-17"
assert snapshot["terminalLifecycle"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalLifecycle"]["agencyStatus"] == "historical"
assert snapshot["terminalLifecycle"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalLifecycle"]["terminalMemberCount"] == 6
assert snapshot["terminalLifecycle"]["militaryServiceAtTerminal"] == ["JEONG SEUNGHWAN"]
assert snapshot["terminalLifecycle"]["priorExitedMembers"][0]["member"] == "SEOK RAKWON"
assert snapshot["terminalLifecycle"]["debutDate"] == "2022-07-27"
assert module.parse_live_pages(terminal.replace("Won Bin", ""), departure, debut) == []
assert module.parse_live_pages(terminal.replace("journey comes to an end", "journey continues"), departure, debut) == []
assert module.parse_live_pages(terminal.replace("serving in the military", "active schedule"), departure, debut) == []
assert module.parse_live_pages(terminal, departure.replace("departed the group", "temporary hiatus"), debut) == []
assert module.parse_live_pages(terminal, departure, debut.replace("Jul 27, 2022", "Jul 28, 2022")) == []
print("ATBO official terminal lifecycle catalog adapter regression: PASS")
