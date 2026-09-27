from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_blitzers_official_provider_catalog_v1.py"
spec = importlib.util.spec_from_file_location("blitzers_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

profile = "<html><body>BLITZERS BLEE 2021-05-11T15:00 JINHWA JUHAN SYA CHRIS LUTAN WOOJU</body></html>"
departure = "<html><body>WUZO Entertainment BLITZERS GO_U will conclude activities as a member; group continues as a 6-member lineup</body></html>"
management = "<html><body>2026 우조엔터테인먼트입니다 BLITZERS IN MATE STAGE 블리</body></html>"
activity = "<html><body>2026 BLITZERS 5th ANNIVERSARY 6종 포토카드 6:1 촬영 완전체 무대</body></html>"

rows = module.parse_live_pages(profile, departure, management, activity)
assert [row["displayArtist"] for row in rows] == ["BLITZERS"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["exactCurrentMemberRosterRequired"] is True
assert snapshot["contract"]["explicitDepartureNoticeControlsFormerMemberExclusion"] is True
assert snapshot["contract"]["currentOfficialMemberSectionControlsRoster"] is True
assert snapshot["contract"]["sixMemberContinuationRequired"] is True
assert snapshot["contract"]["formerMemberDoesNotRemainInCurrentRoster"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["currentRoster"]["currentMemberCount"] == 6
assert snapshot["currentRoster"]["agency"] == "WUZO Entertainment"
assert snapshot["currentRoster"]["departedMember"] == "GO_U"
assert snapshot["currentRoster"]["debutDate"] == "2021-05-12"
assert snapshot["currentRoster"]["fandomName"] == "BLEE"
assert module.parse_live_pages(profile.replace("WOOJU", ""), departure, management, activity) == []
assert module.parse_live_pages(profile + " Who is BLITZERS GO_U?", departure, management, activity) == []
assert module.parse_live_pages(profile, departure.replace("6-member", "7-member"), management, activity) == []
assert module.parse_live_pages(profile, departure, management.replace("우조엔터테인먼트", "OTHER"), activity) == []
assert module.parse_live_pages(profile, departure, management, activity.replace("6:1", "7:1")) == []
print("BLITZERS official current provider catalog adapter regression: PASS")
