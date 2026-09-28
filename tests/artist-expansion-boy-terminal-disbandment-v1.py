from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_boy_musicworks_terminal_disbandment_catalog_v1.py"
spec = importlib.util.spec_from_file_location("boy_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>The Music Works Entertainment. Song Yu Vin leaves the agency. In addition, after much deliberation, we decided to wrap up B.O.Y's activities. Song Yu Vin: the disbandment of B.O.Y was decided after sufficient discussion with Kook Heon hyung. Kim Kook Heon and Song Yu Vin.</body></html>"
debut_profile = "<html><body>The new duo B.O.Y has officially made their debut January 7 with Phase One : YOU. B.O.Y is a duo formed by Kim Kook Heon and Song Yu Vin.</body></html>"
apple = "<html><body>Phase One : YOU - EP B Of You (B.O.Y) January 7, 2020 ℗ 2020 더뮤직웍스 under licence to Genie Music Corporation</body></html>"
bugs = "<html><body>Phase One : YOU 비오브유(B.O.Y) 발매일 2020.01.07 기획사 더뮤직웍스</body></html>"

rows = module.parse_live_pages(terminal, debut_profile, apple, bugs)
assert [row["displayArtist"] for row in rows] == ["B.O.Y"]
snapshot = module.build_snapshot(rows, "2026-09-29T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["agencyGroupActivityWrapUpRequired"] is True
assert snapshot["contract"]["memberDirectDisbandmentConfirmationRequired"] is True
assert snapshot["contract"]["individualContractTerminationDoesNotInferOtherMemberContractEnd"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["groupDisbandmentConfirmed"] is True
assert snapshot["contract"]["legalEntityDissolutionNotAsserted"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalManagement"]["effectiveDate"] == "2021-04-30"
assert snapshot["terminalManagement"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalManagement"]["agencyStatus"] == "historical"
assert snapshot["terminalManagement"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalManagement"]["terminalMemberCount"] == 2
assert snapshot["terminalManagement"]["groupActivitiesWrappedUp"] is True
assert snapshot["terminalManagement"]["memberDirectDisbandmentConfirmed"] is True
assert snapshot["terminalManagement"]["kimKookHeonContractEndNotInferred"] is True
assert snapshot["terminalManagement"]["groupDisbandmentConfirmed"] is True
assert snapshot["terminalManagement"]["legalEntityDissolutionAsserted"] is False
assert snapshot["terminalManagement"]["debutDate"] == "2020-01-07"
assert module.parse_live_pages(terminal.replace("wrap up B.O.Y's activities", "continue B.O.Y's activities"), debut_profile, apple, bugs) == []
assert module.parse_live_pages(terminal.replace("disbandment of B.O.Y was decided", "future of B.O.Y was discussed"), debut_profile, apple, bugs) == []
assert module.parse_live_pages(terminal, debut_profile.replace("Kim Kook Heon", ""), apple, bugs) == []
assert module.parse_live_pages(terminal, debut_profile, apple.replace("January 7, 2020", "January 8, 2020"), bugs) == []
assert module.parse_live_pages(terminal, debut_profile, apple, bugs.replace("더뮤직웍스", "OTHER")) == []
print("B.O.Y The Music Works terminal disbandment catalog adapter regression: PASS")
