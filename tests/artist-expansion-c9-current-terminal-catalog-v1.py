from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_c9_current_terminal_music_catalog_v1.py"

spec = importlib.util.spec_from_file_location("c9_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

epex_current = "<html><body>EPEX C9 Entertainment " + " ".join(module.EPEX_MEMBERS) + "</body></html>"
epex_departure = "<html><body>C9 Entertainment Keum departure seven-member group</body></html>"
younha_current = "<html><body>YOUNHA 2026.03.09 C9 Entertainment</body></html>"
lee_current = "<html><body>Lee Seok-hoon Provided by C9 Entertainment</body></html>"
naze_current = "<html><body>C9 Entertainment Naze May 4 " + " ".join(module.NAZE_MEMBERS) + "</body></html>"
cix_terminal = "<html><body>C9 Entertainment CIX halting group activities " + " ".join(module.CIX_TERMINAL_MEMBERS) + "</body></html>"

rows = module.parse_live_pages(
    epex_current,
    epex_departure,
    younha_current,
    lee_current,
    naze_current,
    cix_terminal,
)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-29T17:37:00+09:00")
assert snapshot["candidateCount"] == 5
assert snapshot["currentRoster"]["EPEX"]["members"] == module.EPEX_MEMBERS
assert snapshot["currentRoster"]["EPEX"]["memberCount"] == 7
assert snapshot["currentRoster"]["NAZE"]["members"] == module.NAZE_MEMBERS
assert snapshot["terminalIdentity"]["CIX"]["members"] == module.CIX_TERMINAL_MEMBERS
assert snapshot["terminalIdentity"]["CIX"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalIdentity"]["CIX"]["agencyStatus"] == "historical"
assert snapshot["contract"]["temporaryHiatusDoesNotEqualDeparture"] is True
assert snapshot["contract"]["explicitDepartureRequiredForMemberRemoval"] is True
assert snapshot["contract"]["groupMembershipDoesNotCollapseSoloIdentity"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(
    epex_current.replace("JEFF", ""),
    epex_departure,
    younha_current,
    lee_current,
    naze_current,
    cix_terminal,
) == []
assert module.parse_live_pages(
    epex_current,
    epex_departure.replace("Keum", ""),
    younha_current,
    lee_current,
    naze_current,
    cix_terminal,
) == []
assert module.parse_live_pages(
    epex_current,
    epex_departure,
    younha_current,
    lee_current.replace("C9 Entertainment", "OTHER"),
    naze_current,
    cix_terminal,
) == []
assert module.parse_live_pages(
    epex_current,
    epex_departure,
    younha_current,
    lee_current,
    naze_current,
    cix_terminal.replace("halting group activities", "temporary hiatus"),
) == []

print("C9 current + terminal music identity catalog regression: PASS")
