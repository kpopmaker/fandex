from __future__ import annotations
import importlib.util
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/"scripts/artist-expansion/collect_hinapia_osr_terminal_disbandment_catalog_v1.py"
spec=importlib.util.spec_from_file_location("hinapia_adapter",SCRIPT); assert spec and spec.loader
module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
terminal="<html><body>Hello, this is OSR Entertainment. We wish to speak to you of HINAPIA's disbandment and the termination of all members' contracts. We all came to the decision to disband the group and terminate our exclusive contracts with all five members.</body></html>"
profile="<html><body>HINAPIA made their debut on November 3 with DRIP. HINAPIA consists of five members: Minkyeung, Gyeongwon, Yaebin, Eunwoo, and Bada.</body></html>"
catalog="<html><body>Drip - Single HINAPIA November 3, 2019 ℗ 2019 OSR Entertainment, under license to Kakao M Corp.</body></html>"
rows=module.parse_live_pages(terminal,profile,catalog); assert [r["displayArtist"] for r in rows]==["HINAPIA"]
s=module.build_snapshot(rows,"2026-09-29T00:00:00+09:00")
assert s["candidateCount"]==1
assert s["contract"]["explicitGroupDisbandmentEvidenceRequired"] is True
assert s["contract"]["allFiveMemberExclusiveContractTerminationRequired"] is True
assert s["terminalLifecycle"]["terminalMembers"]==module.EXPECTED_MEMBERS
assert s["terminalLifecycle"]["terminalMemberCount"]==5
assert s["terminalLifecycle"]["lifecycleStatus"]=="inactive"
assert s["terminalLifecycle"]["agencyStatus"]=="historical"
assert s["terminalLifecycle"]["explicitGroupDisbandmentAnnounced"] is True
assert s["terminalLifecycle"]["allMemberExclusiveContractsTerminated"] is True
assert s["terminalLifecycle"]["legalEntityDissolutionAsserted"] is False
assert s["terminalLifecycle"]["debutDate"]=="2019-11-03"
assert module.parse_live_pages(terminal.replace("decision to disband the group","decision to continue the group").replace("HINAPIA's disbandment","HINAPIA's activities"),profile,catalog)==[]
assert module.parse_live_pages(terminal.replace("terminate our exclusive contracts with all five members","retain our contracts with all five members").replace("termination of all members' contracts","continuation of all members' contracts"),profile,catalog)==[]
assert module.parse_live_pages(terminal,profile.replace("Bada",""),catalog)==[]
assert module.parse_live_pages(terminal,profile,catalog.replace("November 3, 2019","November 4, 2019"))==[]
assert module.parse_live_pages(terminal,profile,catalog.replace("OSR Entertainment","OTHER"))==[]
print("HINAPIA OSR terminal disbandment catalog adapter regression: PASS")
