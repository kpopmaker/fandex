from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_bdc_brandnew_terminal_management_catalog_v1.py"
spec = importlib.util.spec_from_file_location("bdc_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>Hello. This is BRANDNEW MUSIC. Kim Si Hun, Hong Seong Jun, and Yun Jung Hwan, the members of BDC, mutually agreed to end their exclusive contract. After the release of their digital single on August 26, BDC will end all official promotions as artists under BRANDNEW MUSIC.</body></html>"
terminal_ko = "<html><body>브랜뉴뮤직 BDC 김시훈 홍성준 윤정환 전속계약을 종료하기로 상호 합의. 8월 26일 디지털 싱글을 마지막으로 공식적인 활동을 마무리.</body></html>"
catalog = "<html><body>Boys Da Capo - EP BDC October 29, 2019 ℗ 2019 브랜뉴뮤직(BRANDNEW MUSIC)</body></html>"
rollout = "<html><body>Brand New Music BDC Kim Si Hun Hong Seong Jun Yun Jung Hwan debut October 29 with Remember Me.</body></html>"

rows = module.parse_live_pages(terminal, terminal_ko, catalog, rollout)
assert [row["displayArtist"] for row in rows] == ["BDC"]
snapshot = module.build_snapshot(rows, "2026-09-28T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["exclusiveContractEndEvidenceRequired"] is True
assert snapshot["contract"]["officialPromotionEndEvidenceRequired"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["managementClosureDoesNotAssertLegalDisbandment"] is True
assert snapshot["contract"]["postAgencyReactivationRequiresNewExplicitGroupEvidence"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalManagement"]["effectiveDate"] == "2023-08-26"
assert snapshot["terminalManagement"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalManagement"]["agencyStatus"] == "historical"
assert snapshot["terminalManagement"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalManagement"]["terminalMemberCount"] == 3
assert snapshot["terminalManagement"]["exclusiveContractEnded"] is True
assert snapshot["terminalManagement"]["officialPromotionsUnderAgencyEnded"] is True
assert snapshot["terminalManagement"]["legalDisbandmentAsserted"] is False
assert snapshot["terminalManagement"]["debutDate"] == "2019-10-29"
assert module.parse_live_pages(terminal.replace("Yun Jung Hwan", ""), terminal_ko, catalog, rollout) == []
assert module.parse_live_pages(terminal.replace("end all official promotions as artists under BRANDNEW MUSIC", "continue official promotions"), terminal_ko, catalog, rollout) == []
assert module.parse_live_pages(terminal, terminal_ko.replace("공식적인 활동을 마무리", "공식적인 활동을 계속"), catalog, rollout) == []
assert module.parse_live_pages(terminal, terminal_ko, catalog.replace("October 29, 2019", "October 30, 2019"), rollout) == []
assert module.parse_live_pages(terminal, terminal_ko, catalog, rollout.replace("Yun Jung Hwan", "")) == []
print("BDC BRANDNEW MUSIC terminal management catalog adapter regression: PASS")
