from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_dcrunch_ai_grand_terminal_lifecycle_catalog_v1.py"
spec = importlib.util.spec_from_file_location("dcrunch_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

disband = "<html><body>Hello. This is Ai Grand Korea. After discussing with the members of D-CRUNCH, we've decided to disband the group. The official fan cafe and official social media accounts will close in November.</body></html>"
dylan = "<html><body>AI GRAND KOREA: Dylan will be leaving D-CRUNCH as of today. In the future D-CRUNCH plans to continue promotions as six members.</body></html>"
minhyuk = "<html><body>AIG KOREA: Minhyuk will be leaving the group D-CRUNCH. We support his new path.</body></html>"
hyunwoo = "<html><body>D-CRUNCH's Hyunwoo has officially left the group. AI Grand Korea stated his contract has been terminated.</body></html>"
debut = "<html><body>D-CRUNCH debuted August 6, 2018. Nine members: Hyunwook, Hyunho, Hyunwoo, Hyunoh, O.V, Minhyuk, Chanyoung, Dylan, Jungseung. Debut single album 0806 with Palace.</body></html>"
provider = "<html><body>D-CRUNCH K-Pop FORMED August 6, 2018</body></html>"

rows = module.parse_live_pages(disband, dylan, minhyuk, hyunwoo, debut, provider)
assert [row["displayArtist"] for row in rows] == ["D-CRUNCH"]
snapshot = module.build_snapshot(rows, "2026-09-28T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["explicitGroupDisbandmentRequired"] is True
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["priorDepartureChainRequired"] is True
assert snapshot["contract"]["temporaryHiatusDoesNotEqualDeparture"] is True
assert snapshot["contract"]["individualContractsEndedNotInferred"] is True
assert snapshot["contract"]["legalEntityDissolutionNotAsserted"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalLifecycle"]["effectiveDate"] == "2022-11-09"
assert snapshot["terminalLifecycle"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalLifecycle"]["agencyStatus"] == "historical"
assert snapshot["terminalLifecycle"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalLifecycle"]["terminalMemberCount"] == 6
assert snapshot["terminalLifecycle"]["groupDisbandmentExplicit"] is True
assert snapshot["terminalLifecycle"]["legalEntityDissolutionAsserted"] is False
assert [row["member"] for row in snapshot["terminalLifecycle"]["priorExitedMembers"]] == ["HYUNWOO", "MINHYUK", "DYLAN"]
assert snapshot["terminalLifecycle"]["debutDate"] == "2018-08-06"
assert module.parse_live_pages(disband.replace("decided to disband the group", "decided to continue the group"), dylan, minhyuk, hyunwoo, debut, provider) == []
assert module.parse_live_pages(disband, dylan.replace("continue promotions as six members", "continue promotions"), minhyuk, hyunwoo, debut, provider) == []
assert module.parse_live_pages(disband, dylan, minhyuk.replace("Minhyuk will be leaving the group D-CRUNCH", "Minhyuk will rest"), hyunwoo, debut, provider) == []
assert module.parse_live_pages(disband, dylan, minhyuk, hyunwoo.replace("Hyunwoo has officially left the group", "Hyunwoo is on hiatus"), debut, provider) == []
assert module.parse_live_pages(disband, dylan, minhyuk, hyunwoo, debut.replace("Jungseung", ""), provider) == []
assert module.parse_live_pages(disband, dylan, minhyuk, hyunwoo, debut, provider.replace("August 6, 2018", "August 7, 2018")) == []
print("D-CRUNCH AI Grand terminal lifecycle catalog adapter regression: PASS")
