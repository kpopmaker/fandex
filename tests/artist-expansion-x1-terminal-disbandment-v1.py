from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_x1_swing_terminal_disbandment_catalog_v1.py"
spec = importlib.util.spec_from_file_location("x1_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

disband = "<html><body>Play M Entertainment Yuehua Entertainment TOP Media OUI Entertainment MBK Entertainment Woollim Entertainment DSP Media Starship Entertainment Brand New Music. We could not come to an agreement, so we have decided on their disbandment.</body></html>"
roster = "<html><body>X1's management agency Swing Entertainment attended with Play M Entertainment (Han Seung Woo), Yuehua Entertainment (Cho Seung Youn), TOP Media (Kim Woo Seok), OUI Entertainment (Kim Yo Han), MBK Entertainment (Lee Han Gyul and Nam Do Hyon), Woollim Entertainment (Cha Jun Ho), DSP Media (Son Dong Pyo), Brand New Entertainment (Lee Eun Sang), and Starship Entertainment (Kang Min Hee and Song Hyeong Jun).</body></html>"
fancafe = "<html><body>As X1's official activities have concluded, this is a notice. Please cheer on the futures of the 11 members.</body></html>"
swing = "<html><body>Hello. This is Swing Entertainment. Since X1's activities have officially concluded, we will provide refunds.</body></html>"
debut = "<html><body>QUANTUM LEAP - EP X1 August 27, 2019 ℗ SWING Entertainment, Stone Music Entertainment</body></html>"

rows = module.parse_live_pages(disband, roster, fancafe, swing, debut)
assert [row["displayArtist"] for row in rows] == ["X1"]
snapshot = module.build_snapshot(rows, "2026-09-29T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["explicitJointAgencyDisbandmentDecisionRequired"] is True
assert snapshot["contract"]["explicitOfficialActivityConclusionRequired"] is True
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["managementAgencyMustRemainDistinctFromMemberAgencies"] is True
assert snapshot["contract"]["legalDisbandmentAssertionRequiresExplicitJointStatement"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalLifecycle"]["effectiveDate"] == "2020-01-06"
assert snapshot["terminalLifecycle"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalLifecycle"]["agencyStatus"] == "historical"
assert snapshot["terminalLifecycle"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalLifecycle"]["terminalMemberCount"] == 11
assert snapshot["terminalLifecycle"]["explicitDisbandmentDecision"] is True
assert snapshot["terminalLifecycle"]["officialActivitiesConcluded"] is True
assert snapshot["terminalLifecycle"]["legalDisbandmentAsserted"] is True
assert snapshot["terminalLifecycle"]["debutDate"] == "2019-08-27"
assert module.parse_live_pages(disband.replace("decided on their disbandment", "decided to continue"), roster, fancafe, swing, debut) == []
assert module.parse_live_pages(disband, roster.replace("Song Hyeong Jun", ""), fancafe, swing, debut) == []
assert module.parse_live_pages(disband, roster, fancafe.replace("official activities have concluded", "official activities continue"), swing, debut) == []
assert module.parse_live_pages(disband, roster, fancafe, swing.replace("activities have officially concluded", "activities continue"), debut) == []
assert module.parse_live_pages(disband, roster, fancafe, swing, debut.replace("August 27, 2019", "August 28, 2019")) == []
print("X1 Swing terminal disbandment catalog adapter regression: PASS")
