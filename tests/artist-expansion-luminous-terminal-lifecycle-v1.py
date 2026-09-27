from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_luminous_terminal_lifecycle_catalog_v1.py"
spec = importlib.util.spec_from_file_location("luminous_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>Hello. This is Barunson Double IP. We and the members of Luminous have decided to terminate the contract and activities of 'Luminous.' Lumini Youngbin Sooil Steven Woobin new beginnings.</body></html>"
catalog = "<html><body>LUMINOUS Youth EP September 9, 2021 YOUTH ℗ 2021 BarunsonWip Entertainment under license to Kakao Entertainment</body></html>"
debut = "<html><body>Published Sep 9, 2021 KST K-pop boy group LUMINOUS comprising Suil, Steven, Youngbin and Woobin has debuted with first mini-album YOUTH. Barunson WIP.</body></html>"

rows = module.parse_live_pages(terminal, catalog, debut)
assert [row["displayArtist"] for row in rows] == ["LUMINOUS"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["terminalContractEvidenceRequired"] is True
assert snapshot["contract"]["explicitGroupActivityTerminationRequired"] is True
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["laterMemberActivityDoesNotReactivateGroup"] is True
assert snapshot["contract"]["legalEntityDissolutionNotAsserted"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalLifecycle"]["effectiveDate"] == "2025-02-09"
assert snapshot["terminalLifecycle"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalLifecycle"]["agencyStatus"] == "historical"
assert snapshot["terminalLifecycle"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalLifecycle"]["terminalMemberCount"] == 4
assert snapshot["terminalLifecycle"]["contractAndGroupActivitiesEnded"] is True
assert snapshot["terminalLifecycle"]["debutDate"] == "2021-09-09"
assert module.parse_live_pages(terminal.replace("Woobin", ""), catalog, debut) == []
assert module.parse_live_pages(terminal.replace("terminate the contract and activities of 'Luminous.'", "continue Luminous activities."), catalog, debut) == []
assert module.parse_live_pages(terminal, catalog.replace("September 9, 2021", "September 10, 2021"), debut) == []
assert module.parse_live_pages(terminal, catalog, debut.replace("Woobin", "")) == []
print("LUMINOUS Barunson terminal lifecycle catalog adapter regression: PASS")
