from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_arrc_terminal_lifecycle_catalog_v1.py"
spec = importlib.util.spec_from_file_location("arrc_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>MYSTIC STORY ARrC conclude group activities June 22 2026 ANDY CHOI HAN DOHA HYUNMIN JIBEEN KIEN RIOTO</body></html>"
debut = "<html><body>ARrC DEBUT SHOWCASE 2024 August 19 THE 1ST EP AR^C</body></html>"
seven = "<html><body>MYSTIC STORY ARrC ANDY joins 7 member group</body></html>"
fandom = "<html><body>ARrC official fandom ARrCer</body></html>"

rows = module.parse_live_pages(terminal, debut, seven, fandom)
assert [row["displayArtist"] for row in rows] == ["ARrC"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["terminalLifecycleEvidenceRequired"] is True
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["terminalNoticeOverridesEarlierActiveEvidence"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalLifecycle"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalLifecycle"]["agencyStatus"] == "historical"
assert snapshot["terminalLifecycle"]["effectiveDate"] == "2026-06-22"
assert snapshot["terminalLifecycle"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert module.parse_live_pages(terminal.replace("RIOTO", ""), debut, seven, fandom) == []
assert module.parse_live_pages(terminal.replace("conclude", "continue"), debut, seven, fandom) == []
assert module.parse_live_pages(terminal, debut.replace("DEBUT SHOWCASE", "event"), seven, fandom) == []
assert module.parse_live_pages(terminal, debut, seven.replace("7 member", "6 member"), fandom) == []
assert module.parse_live_pages(terminal, debut, seven, fandom.replace("ARrCer", "Other")) == []
print("ARrC official terminal lifecycle catalog adapter regression: PASS")
