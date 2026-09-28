from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_gugudan_jellyfish_terminal_lifecycle_catalog_v1.py"
spec = importlib.util.spec_from_file_location("gugudan_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>Hello. This is Jellyfish Entertainment. After a long and in-depth discussion, we have decided they will officially end their group activities on December 31, 2020. Although their group activities are over, we will support their individual activities such as music and acting.</body></html>"
hyeyeon = "<html><body>Jellyfish Entertainment announced Hyeyeon is ending her activities with gugudan. gugudan will now be an eight-member group. The remaining eight members are Hana, Mimi, Nayoung, Haebin, Kim Sejeong, Soyee, Sally, and Mina.</body></html>"
debut = "<html><body>Act.1 The Little Mermaid - EP gugudan June 28, 2016 ℗ 2016 JELLYFISH ENTERTAINMENT</body></html>"

rows = module.parse_live_pages(terminal, hyeyeon, debut)
assert [row["displayArtist"] for row in rows] == ["gugudan"]
snapshot = module.build_snapshot(rows, "2026-09-29T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["explicitGroupActivityEndEvidenceRequired"] is True
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["priorExplicitMemberDepartureRequired"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["legalDisbandmentNotIndependentlyAsserted"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalLifecycle"]["effectiveDate"] == "2020-12-31"
assert snapshot["terminalLifecycle"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalLifecycle"]["agencyStatus"] == "historical"
assert snapshot["terminalLifecycle"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalLifecycle"]["terminalMemberCount"] == 8
assert snapshot["terminalLifecycle"]["groupActivitiesEnded"] is True
assert snapshot["terminalLifecycle"]["legalDisbandmentAsserted"] is False
assert snapshot["terminalLifecycle"]["priorExitedMembers"][0]["member"] == "HYEYEON"
assert snapshot["terminalLifecycle"]["debutDate"] == "2016-06-28"
assert module.parse_live_pages(terminal.replace("officially end their group activities on December 31, 2020", "continue their group activities"), hyeyeon, debut) == []
assert module.parse_live_pages(terminal, hyeyeon.replace("remaining eight members", "remaining members").replace("eight-member group", "group"), debut) == []
assert module.parse_live_pages(terminal, hyeyeon.replace("Mina", ""), debut) == []
assert module.parse_live_pages(terminal, hyeyeon, debut.replace("June 28, 2016", "June 29, 2016")) == []
print("gugudan Jellyfish terminal lifecycle catalog adapter regression: PASS")
