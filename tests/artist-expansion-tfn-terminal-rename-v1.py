from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_tfn_mld_terminal_rename_catalog_v1.py"
spec = importlib.util.spec_from_file_location("tfn_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>On February 29, 2024 MLD Entertainment confirmed: It is true that TFN's exclusive contracts and group activities have ended.</body></html>"
rename = "<html><body>グループ名変更のお知らせ 2022.10.17 T1419のグループ名をTFNに変更することをお知らせいたします。</body></html>"
profile = "<html><body>韓国人5名、日本人4名の計9名で構成。MLD ENTERTAINMENT所属。 NOA SIAN KEVIN GUNWOO LEO ON ZERO KAIRI KIO.</body></html>"
debut = "<html><body>BEFORE SUNRISE, Pt. 1 - Single TFN January 11, 2021 ℗ 2021 MLD entertainment</body></html>"

rows = module.parse_live_pages(terminal, rename, profile, debut)
assert [row["displayArtist"] for row in rows] == ["TFN"]
snapshot = module.build_snapshot(rows, "2026-09-28T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["renameContinuityRequired"] is True
assert snapshot["contract"]["renameDoesNotCreateNewCanonical"] is True
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["exclusiveContractEndEvidenceRequired"] is True
assert snapshot["contract"]["groupActivityEndEvidenceRequired"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["managementClosureDoesNotAssertLegalEntityDissolution"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["renameContinuity"]["from"] == "T1419"
assert snapshot["renameContinuity"]["to"] == "TFN"
assert snapshot["renameContinuity"]["effectiveDate"] == "2022-10-17"
assert snapshot["terminalLifecycle"]["effectiveDate"] == "2024-02-29"
assert snapshot["terminalLifecycle"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalLifecycle"]["agencyStatus"] == "historical"
assert snapshot["terminalLifecycle"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalLifecycle"]["terminalMemberCount"] == 9
assert snapshot["terminalLifecycle"]["exclusiveContractsEnded"] is True
assert snapshot["terminalLifecycle"]["groupActivitiesEnded"] is True
assert snapshot["terminalLifecycle"]["legalEntityDissolutionAsserted"] is False
assert snapshot["terminalLifecycle"]["debutDate"] == "2021-01-11"
assert module.parse_live_pages(terminal.replace("group activities have ended", "group activities continue"), rename, profile, debut) == []
assert module.parse_live_pages(terminal, rename.replace("T1419", "OTHER"), profile, debut) == []
assert module.parse_live_pages(terminal, rename, profile.replace("KIO", ""), debut) == []
assert module.parse_live_pages(terminal, rename, profile, debut.replace("January 11, 2021", "January 12, 2021")) == []
print("TFN MLD terminal rename catalog adapter regression: PASS")
