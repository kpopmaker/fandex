from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_mirae_terminal_lifecycle_catalog_v1.py"
spec = importlib.util.spec_from_file_location("mirae_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>Hello, this is DSP Media. MIRAE members Lee Jun Hyuk, Lien, Yoo Dohyun, Khael, Son Dong Pyo, Park Si Young, and Jang Yu Bin have decided to conclude their group activities. While group activities will be coming to an end, Son Dong Pyo will continue with individual activities under DSP Media.</body></html>"
debut = "<html><body>Updated March 17 KST 2021: MIRAE has made their debut with their first mini album KILLA.</body></html>"
album = "<html><body>MIRAE KILLA - MIRAE 1st Mini Album Label DSP MEDIA</body></html>"

rows = module.parse_live_pages(terminal, debut, album)
assert [row["displayArtist"] for row in rows] == ["MIRAE"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["explicitGroupActivityTerminationRequired"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["individualMemberContinuationDoesNotReactivateGroup"] is True
assert snapshot["contract"]["terminalGroupStateDoesNotImplyAllIndividualContractsEnded"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalLifecycle"]["effectiveDate"] == "2024-07-09"
assert snapshot["terminalLifecycle"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalLifecycle"]["agencyStatus"] == "historical"
assert snapshot["terminalLifecycle"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalLifecycle"]["terminalMemberCount"] == 7
assert snapshot["terminalLifecycle"]["individualContinuationAtTerminal"][0]["member"] == "SON DONG PYO"
assert snapshot["terminalLifecycle"]["debutDate"] == "2021-03-17"
assert module.parse_live_pages(terminal.replace("Jang Yu Bin", ""), debut, album) == []
assert module.parse_live_pages(terminal.replace("conclude their group activities", "continue their group activities").replace("group activities will be coming to an end", "group activities continue"), debut, album) == []
assert module.parse_live_pages(terminal.replace("Son Dong Pyo will continue with individual activities under DSP Media.", "Son Dong Pyo."), debut, album) == []
assert module.parse_live_pages(terminal, debut.replace("March 17", "March 18"), album) == []
assert module.parse_live_pages(terminal, debut, album.replace("DSP MEDIA", "OTHER")) == []
print("MIRAE official terminal lifecycle catalog adapter regression: PASS")
