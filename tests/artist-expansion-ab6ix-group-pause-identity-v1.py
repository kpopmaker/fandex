from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_ab6ix_group_pause_identity_catalog_v1.py"
spec = importlib.util.spec_from_file_location("ab6ix_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

pause = "<html><body>BRANDNEW MUSIC AB6IX exclusive contracts end May 25. After 2026 AB6IX CONCERT 6IX TO SEVEN, group activities will enter a temporary hiatus.</body></html>"
profile = "<html><body>AB6IX 4-member group: JEON WOONG, KIM DONG HYUN, PARK WOO JIN, LEE DAE HWI.</body></html>"
departure = "<html><body>BRANDNEW MUSIC: Lim Young Min departure from AB6IX. AB6IX will continue as a four-member group.</body></html>"
debut = "<html><body>B:COMPLETE AB6IX May 22, 2019 ℗ 2019 BRANDNEW MUSIC</body></html>"
woong = "<html><body>Jeon Woong renewed his contract with BRANDNEW MUSIC.</body></html>"
woojin = "<html><body>PARA MUSIC ARTISTS PARK WOO JIN 박우진</body></html>"
daehwi = "<html><body>Lee Dae Hwi signs with Off The Record Entertainment.</body></html>"
donghyun = "<html><body>김동현 AER Entertainment 아에르엔터테인먼트 전속계약</body></html>"

rows = module.parse_live_pages(pause, profile, departure, debut, woong, woojin, daehwi, donghyun)
assert [row["displayArtist"] for row in rows] == ["AB6IX"]
snapshot = module.build_snapshot(rows, "2026-09-28T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["explicitTemporaryGroupHiatusEvidenceRequired"] is True
assert snapshot["contract"]["groupContractEndDoesNotEqualGroupTermination"] is True
assert snapshot["contract"]["groupActivityPauseDoesNotEqualDisbandment"] is True
assert snapshot["contract"]["pausedGroupRetainsActiveLifecycle"] is True
assert snapshot["contract"]["individualAgencyContractsDoNotResolveGroupAgency"] is True
assert snapshot["contract"]["blankAgencyRequiredWhenGroupAgencyUnresolved"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["currentIdentity"]["lifecycleStatus"] == "active"
assert snapshot["currentIdentity"]["groupActivityPaused"] is True
assert snapshot["currentIdentity"]["groupDisbanded"] is False
assert snapshot["currentIdentity"]["groupAgency"] == ""
assert snapshot["currentIdentity"]["groupAgencyStatus"] == "unresolved"
assert snapshot["currentIdentity"]["members"] == module.EXPECTED_MEMBERS
assert snapshot["currentIdentity"]["currentMemberCount"] == 4
assert snapshot["currentIdentity"]["priorExitedMembers"][0]["member"] == "LIM YOUNG MIN"
assert snapshot["currentIdentity"]["debutDate"] == "2019-05-22"
assert module.parse_live_pages(pause.replace("temporary hiatus", "group termination"), profile, departure, debut, woong, woojin, daehwi, donghyun) == []
assert module.parse_live_pages(pause, profile.replace("LEE DAE HWI", ""), departure, debut, woong, woojin, daehwi, donghyun) == []
assert module.parse_live_pages(pause, profile, departure.replace("departure from AB6IX", "temporary hiatus from AB6IX"), debut, woong, woojin, daehwi, donghyun) == []
assert module.parse_live_pages(pause, profile, departure, debut.replace("May 22, 2019", "May 23, 2019"), woong, woojin, daehwi, donghyun) == []
assert module.parse_live_pages(pause, profile, departure, debut, woong.replace("renewed his contract", "ended his contract"), woojin, daehwi, donghyun) == []
assert module.parse_live_pages(pause, profile, departure, debut, woong, woojin.replace("PARA MUSIC", "OTHER"), daehwi, donghyun) == []
assert module.parse_live_pages(pause, profile, departure, debut, woong, woojin, daehwi.replace("Off The Record", "OTHER"), donghyun) == []
assert module.parse_live_pages(pause, profile, departure, debut, woong, woojin, daehwi, donghyun.replace("아에르엔터테인먼트", "OTHER")) == []
print("AB6IX group pause identity catalog adapter regression: PASS")
