from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_d1ce_terminal_management_catalog_v1.py"
spec = importlib.util.spec_from_file_location("d1ce_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>Hello. This is D1CE Entertainment. D1CE's Woo Jin Young, Park Woo Dam, Kim Hyun Soo, Jung Yoo Jun, and Jo Yong Geun exclusive contracts expired on January 20, 2023. We mutually agreed to end our exclusive contracts.</body></html>"
debut_profile = "<html><body>D1CE debuted August 1, 2019 with Wake up : Roll the World. Members Woo Jin Young, Park Woo Dam, Kim Hyun Soo, Jung Yoo Jun, and Jo Yong Geun.</body></html>"
apple = "<html><body>Wake Up [Wake Up : Roll the World] - EP D1CE August 1, 2019</body></html>"
bugs = "<html><body>[Wake up : Roll the World] 디원스 (D1CE) 발매일 2019.08.01 기획사 D1CE ENTERTAINMENT</body></html>"

rows = module.parse_live_pages(terminal, debut_profile, apple, bugs)
assert [row["displayArtist"] for row in rows] == ["D1CE"]
snapshot = module.build_snapshot(rows, "2026-09-29T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["allMemberExclusiveContractExpiryRequired"] is True
assert snapshot["contract"]["agencyAnnouncementClassifiedAsGroupDisbandmentByPreservedSource"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["legalEntityDissolutionNotAsserted"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalManagement"]["effectiveDate"] == "2023-01-20"
assert snapshot["terminalManagement"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalManagement"]["agencyStatus"] == "historical"
assert snapshot["terminalManagement"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalManagement"]["terminalMemberCount"] == 5
assert snapshot["terminalManagement"]["allMemberExclusiveContractsExpired"] is True
assert snapshot["terminalManagement"]["groupDisbandmentAnnouncementPreserved"] is True
assert snapshot["terminalManagement"]["legalEntityDissolutionAsserted"] is False
assert snapshot["terminalManagement"]["debutDate"] == "2019-08-01"
assert module.parse_live_pages(terminal.replace("Jo Yong Geun", ""), debut_profile, apple, bugs) == []
assert module.parse_live_pages(terminal.replace("expired on January 20, 2023", "remain active"), debut_profile, apple, bugs) == []
assert module.parse_live_pages(terminal, debut_profile.replace("Jung Yoo Jun", ""), apple, bugs) == []
assert module.parse_live_pages(terminal, debut_profile, apple.replace("August 1, 2019", "August 2, 2019"), bugs) == []
assert module.parse_live_pages(terminal, debut_profile, apple, bugs.replace("D1CE ENTERTAINMENT", "OTHER")) == []
print("D1CE terminal management catalog adapter regression: PASS")
