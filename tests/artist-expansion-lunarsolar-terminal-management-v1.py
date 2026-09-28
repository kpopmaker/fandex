from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_lunarsolar_jplanet_terminal_management_catalog_v1.py"
spec = importlib.util.spec_from_file_location("lunarsolar_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>J Planet Entertainment would like to inform that after long discussions with LUNARSOLAR members, we decided to terminate the exclusive artist contract. Eseo, Taeryeong, Jian, Yuuri decided to part their ways by supporting each other for their new beginning.</body></html>"
debut = "<html><body>SOLAR : flare - Single LUNARSOLAR September 2, 2020 ℗ 2020 제이플래닛 엔터테인먼트</body></html>"

rows = module.parse_live_pages(terminal, debut)
assert [row["displayArtist"] for row in rows] == ["LUNARSOLAR"]
snapshot = module.build_snapshot(rows, "2026-09-28T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["exclusiveContractTerminationRequired"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["legalDisbandmentNotIndependentlyAsserted"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalManagement"]["effectiveDate"] == "2022-05-22"
assert snapshot["terminalManagement"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalManagement"]["agencyStatus"] == "historical"
assert snapshot["terminalManagement"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalManagement"]["terminalMemberCount"] == 4
assert snapshot["terminalManagement"]["exclusiveArtistContractTerminated"] is True
assert snapshot["terminalManagement"]["legalDisbandmentAsserted"] is False
assert snapshot["terminalManagement"]["debutDate"] == "2020-09-02"
assert module.parse_live_pages(terminal.replace("terminate the exclusive artist contract", "continue the exclusive artist contract"), debut) == []
assert module.parse_live_pages(terminal.replace("Yuuri", ""), debut) == []
assert module.parse_live_pages(terminal.replace("supporting each other for their new beginning", "continue together"), debut) == []
assert module.parse_live_pages(terminal, debut.replace("September 2, 2020", "September 3, 2020")) == []
print("LUNARSOLAR J Planet terminal management catalog adapter regression: PASS")
