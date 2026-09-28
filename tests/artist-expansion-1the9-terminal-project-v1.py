from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_1the9_pocketdol_terminal_project_catalog_v1.py"
spec = importlib.util.spec_from_file_location("one_the_nine_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

terminal = "<html><body>PocketDol Studio said: 1THE9's promotions end on August 8, and their activities as a group end that day. The members will then return to their respective agencies.</body></html>"
roster = "<html><body>Under 19 final 9 members: Jeon Doyum, Jung Jinsung, Kim Taewoo, Shin Yechan, Jeong Taekhyeon, Yoo Yongha, Park Sungwon, Lee Seunghwan, Kim Junseo.</body></html>"
debut = "<html><body>XIX 1THE9 April 13, 2019 ℗ 2019 포켓돌 스튜디오(PocketDol Studio), under license to Kakao M Corp.</body></html>"

rows = module.parse_live_pages(terminal, roster, debut)
assert [row["displayArtist"] for row in rows] == ["1THE9"]
snapshot = module.build_snapshot(rows, "2026-09-29T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["officialProjectGroupActivityEndRequired"] is True
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["projectGroupExpirationRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["historicalAgencyRequiresInactiveLifecycle"] is True
assert snapshot["contract"]["legalEntityDissolutionNotAsserted"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalLifecycle"]["effectiveDate"] == "2020-08-08"
assert snapshot["terminalLifecycle"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalLifecycle"]["agencyStatus"] == "historical"
assert snapshot["terminalLifecycle"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalLifecycle"]["terminalMemberCount"] == 9
assert snapshot["terminalLifecycle"]["officialPromotionsEnded"] is True
assert snapshot["terminalLifecycle"]["groupActivitiesEnded"] is True
assert snapshot["terminalLifecycle"]["membersReturnedToRespectiveAgencies"] is True
assert snapshot["terminalLifecycle"]["projectGroupCompleted"] is True
assert snapshot["terminalLifecycle"]["legalEntityDissolutionAsserted"] is False
assert snapshot["terminalLifecycle"]["debutDate"] == "2019-04-13"
assert module.parse_live_pages(terminal.replace("activities as a group end that day", "activities as a group continue"), roster, debut) == []
assert module.parse_live_pages(terminal.replace("return to their respective agencies", "remain under one agency"), roster, debut) == []
assert module.parse_live_pages(terminal, roster.replace("Kim Junseo", ""), debut) == []
assert module.parse_live_pages(terminal, roster, debut.replace("April 13, 2019", "April 14, 2019")) == []
print("1THE9 PocketDol terminal project catalog adapter regression: PASS")
