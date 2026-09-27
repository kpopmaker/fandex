from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_justb_official_provider_catalog_v1.py"
spec = importlib.util.spec_from_file_location("justb_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

profile = "<html><body>JUST B LIM JIMIN GEONU Bain SIWOO DY SANGWOO</body></html>"
hiatus = "<html><body>블루닷엔터테인먼트 지민 일시적으로 5인 체제 활동 복귀 시점 추후 안내</body></html>"
activity = "<html><body>Hello, this is BLUEDOT Entertainment. JUSTB LIVE IN JAPAN 2026</body></html>"
debut = "<html><body>JUST B is a six-member K-POP boy group composed of LIM JIMIN, GEONU, Bain, SIWOO, DY, and SANGWOO. official debut on June 30, 2021</body></html>"
fandom = "<html><body>Hello, this is BLUEDOT Entertainment. JUST B official fanclub ONLY B Membership</body></html>"

rows = module.parse_live_pages(profile, hiatus, activity, debut, fandom)
assert [row["displayArtist"] for row in rows] == ["JUST B"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["exactCurrentMemberRosterRequired"] is True
assert snapshot["contract"]["currentOfficialMemberSectionControlsMembership"] is True
assert snapshot["contract"]["temporaryMedicalHiatusDoesNotTerminateMembership"] is True
assert snapshot["contract"]["activityLineupMayBeSubsetOfCanonicalMembership"] is True
assert snapshot["contract"]["explicitTerminalDepartureEvidenceRequiredForMemberRemoval"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["currentRoster"]["currentMemberCount"] == 6
assert snapshot["currentRoster"]["temporaryActivityMemberCount"] == 5
assert snapshot["currentRoster"]["temporaryHiatusMember"] == "LIM JIMIN"
assert snapshot["currentRoster"]["agency"] == "BLUEDOT Entertainment"
assert snapshot["currentRoster"]["debutDate"] == "2021-06-30"
assert snapshot["currentRoster"]["fandomName"] == "ONLY B"
assert module.parse_live_pages(profile.replace("SANGWOO", ""), hiatus, activity, debut, fandom) == []
assert module.parse_live_pages(profile, hiatus.replace("5인 체제", "6인 체제"), activity, debut, fandom) == []
assert module.parse_live_pages(profile, hiatus, activity.replace("BLUEDOT Entertainment", "OTHER"), debut, fandom) == []
assert module.parse_live_pages(profile, hiatus, activity, debut.replace("June 30, 2021", "June 29, 2021"), fandom) == []
assert module.parse_live_pages(profile, hiatus, activity, debut, fandom.replace("ONLY B", "OTHER")) == []
print("JUST B official current provider catalog adapter regression: PASS")
