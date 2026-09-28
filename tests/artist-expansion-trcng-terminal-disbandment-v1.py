from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_trcng_ts_terminal_disbandment_catalog_v1.py"
spec = importlib.util.spec_from_file_location("trcng_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

disband = "<html><body>TRCNG has announced their disbandment. Jihun Hayoung Hakmin Jisung Hyunwoo Siwoo Hohyeon Kangmin. As of March 16, 2022 Hayoung ended his contract. As of February 28, 2022 the other members ended contracts. Jihun said TRCNG has come to an end. Final greeting as TRCNG.</body></html>"
eight = "<html><body>Hello. This is TS Entertainment. Following long discussions, TRCNG plans to promote as eight members in the future without Taeseon and Wooyeop.</body></html>"
debut_profile = "<html><body>TS Entertainment new 10-member group TRCNG: Ji Hun Ha Young Tae Seon Hak Min Woo Yeop Ji Sung Hyun Woo Si Woo Ho Hyeon Kang Min. Debut October 10.</body></html>"
debut_catalog = "<html><body>TRCNG 1st Mini Album 'New Generation' - EP October 10, 2017 ℗ 2017 TS ENTER</body></html>"

rows = module.parse_live_pages(disband, eight, debut_profile, debut_catalog)
assert [row["displayArtist"] for row in rows] == ["TRCNG"]
snapshot = module.build_snapshot(rows, "2026-09-29T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["explicitMemberDisbandmentStatementsRequired"] is True
assert snapshot["contract"]["exactTerminalMemberRosterRequired"] is True
assert snapshot["contract"]["explicitPriorExitEvidenceRequired"] is True
assert snapshot["contract"]["memberContractEndDatesMayDiffer"] is True
assert snapshot["contract"]["groupDisbandmentAnnouncementDateDistinctFromContractEndDates"] is True
assert snapshot["contract"]["legalEntityDissolutionNotAsserted"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalLifecycle"]["effectiveDate"] == "2022-03-28"
assert snapshot["terminalLifecycle"]["lifecycleStatus"] == "inactive"
assert snapshot["terminalLifecycle"]["agencyStatus"] == "historical"
assert snapshot["terminalLifecycle"]["terminalMembers"] == module.EXPECTED_MEMBERS
assert snapshot["terminalLifecycle"]["terminalMemberCount"] == 8
assert [row["member"] for row in snapshot["terminalLifecycle"]["priorExitedMembers"]] == module.PRIOR_EXITED
assert snapshot["terminalLifecycle"]["explicitGroupDisbandmentAnnounced"] is True
assert snapshot["terminalLifecycle"]["legalEntityDissolutionAsserted"] is False
assert snapshot["terminalLifecycle"]["debutDate"] == "2017-10-10"
assert module.parse_live_pages(disband.replace("announced their disbandment", "announced their return").replace("TRCNG has come to an end", "TRCNG continues"), eight, debut_profile, debut_catalog) == []
assert module.parse_live_pages(disband.replace("Siwoo", ""), eight, debut_profile, debut_catalog) == []
assert module.parse_live_pages(disband, eight.replace("without Taeseon and Wooyeop", "with Taeseon and Wooyeop"), debut_profile, debut_catalog) == []
assert module.parse_live_pages(disband, eight, debut_profile.replace("Woo Yeop", ""), debut_catalog) == []
assert module.parse_live_pages(disband, eight, debut_profile, debut_catalog.replace("October 10, 2017", "October 11, 2017")) == []
print("TRCNG TS terminal disbandment catalog adapter regression: PASS")
