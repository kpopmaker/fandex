from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_aimers_official_provider_catalog_v1.py"
spec = importlib.util.spec_from_file_location("aimers_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

profile = "<html><body>2026 AIMERS MEMBER SEUNGHYUN EUNJUN DORYUN YOEL SEUNGHWAN WOOYOUNG</body></html>"
faq = "<html><body>AIMERS HYPER RHYTHM Seoul Republic of Korea</body></html>"
discography = "<html><body>1st Mini Album BETTING STARTS 2022.11.17</body></html>"
enlistment = "<html><body>2026 HYPER RHYTHM AIMERS SEUNGHYUN military enlistment notice</body></html>"
event = "<html><body>2026 AIMERS live notice SEUNGHYUN EUNJUN non-participation for these performances</body></html>"

rows = module.parse_live_pages(profile, faq, discography, enlistment, event)
assert [row["displayArtist"] for row in rows] == ["AIMERS"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["exactCurrentMemberRosterRequired"] is True
assert snapshot["contract"]["militaryServiceDoesNotImplyMembershipTermination"] is True
assert snapshot["contract"]["temporaryEventAbsenceDoesNotChangeMembership"] is True
assert snapshot["contract"]["currentOfficialMemberSectionControlsRoster"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["membershipContinuity"]["currentMemberCount"] == 6
assert snapshot["membershipContinuity"]["militaryServiceMember"] == "SEUNGHYUN"
assert snapshot["membershipContinuity"]["temporaryEventAbsenceMembers"] == ["SEUNGHYUN", "EUNJUN"]
assert module.parse_live_pages(profile.replace("WOOYOUNG", ""), faq, discography, enlistment, event) == []
assert module.parse_live_pages(profile, faq.replace("HYPER RHYTHM", "OTHER"), discography, enlistment, event) == []
assert module.parse_live_pages(profile, faq, discography.replace("2022.11.17", "2022.11.18"), enlistment, event) == []
assert module.parse_live_pages(profile, faq, discography, enlistment.replace("SEUNGHYUN", "OTHER"), event) == []
assert module.parse_live_pages(profile, faq, discography, enlistment, event.replace("EUNJUN", "OTHER")) == []
print("AIMERS official current provider catalog adapter regression: PASS")
