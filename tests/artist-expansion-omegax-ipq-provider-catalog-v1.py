from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_omegax_ipq_current_provider_catalog_v1.py"
spec = importlib.util.spec_from_file_location("omegax_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

current = "<html><body>Photo Credit: IPQ. OMEGA X is currently a 10-member K-pop group under IPQ. The members include JAEHAN, HWICHAN, SEBIN, HANGYEOM, TAEDONG, XEN, JEHYUN, KEVIN, HYUK and YECHAN. OMEGA X returns with UNCAPPED on June 19, 2026 with seven members JAEHAN, YECHAN, XEN, KEVIN, SEBIN, JEHYUN, and HWICHAN.</body></html>"
departure = "<html><body>안녕하세요, 아이피큐입니다. 2026년 6월 1일을 기점으로 정훈이 오메가엑스 멤버로서 공식적인 활동을 마무리하게 되었음을 안내드립니다. 팀 탈퇴 결정.</body></html>"
debut = "<html><body>1st Mini Album 'VAMOS' - EP OMEGA X June 30, 2021</body></html>"

rows = module.parse_live_pages(current, departure, debut)
assert [row["displayArtist"] for row in rows] == ["OMEGA X"]
snapshot = module.build_snapshot(rows, "2026-09-28T00:00:00+09:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["currentTenMemberRosterRequired"] is True
assert snapshot["contract"]["activitySubsetDoesNotChangeCanonicalRoster"] is True
assert snapshot["contract"]["sevenMemberAlbumLineupIsPromotionSubset"] is True
assert snapshot["contract"]["explicitDepartureRequiredForMemberRemoval"] is True
assert snapshot["contract"]["priorExplicitDepartureExcludedFromCurrentRoster"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["currentRoster"]["lifecycleStatus"] == "active"
assert snapshot["currentRoster"]["agencyStatus"] == "verified"
assert snapshot["currentRoster"]["members"] == module.EXPECTED_MEMBERS
assert snapshot["currentRoster"]["currentMemberCount"] == 10
assert snapshot["currentRoster"]["priorExitedMembers"][0]["member"] == "JUNGHOON"
assert snapshot["currentRoster"]["currentPromotionSubset"]["members"] == module.PROMOTION_MEMBERS
assert snapshot["currentRoster"]["currentPromotionSubset"]["memberCount"] == 7
assert snapshot["currentRoster"]["debutDate"] == "2021-06-30"
assert module.parse_live_pages(current.replace("10-member K-pop group under IPQ", "7-member K-pop group under IPQ"), departure, debut) == []
assert module.parse_live_pages(current.replace("HANGYEOM", ""), departure, debut) == []
assert module.parse_live_pages(current.replace("HYUK", ""), departure, debut) == []
assert module.parse_live_pages(current.replace("seven members", "ten members").replace("JAEHAN, YECHAN, XEN, KEVIN, SEBIN, JEHYUN, and HWICHAN", "all members"), departure, debut) == []
assert module.parse_live_pages(current, departure.replace("공식적인 활동을 마무리", "활동을 잠시 쉰다").replace("팀 탈퇴 결정", "휴식 결정"), debut) == []
assert module.parse_live_pages(current, departure, debut.replace("June 30, 2021", "July 1, 2021")) == []
print("OMEGA X IPQ current provider catalog adapter regression: PASS")
