from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_whib_official_provider_catalog_v1.py"
spec = importlib.util.spec_from_file_location("whib_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

profile = "<html><body>WHIB 김준민 KIM JUN MIN 하승 HASEUNG 진범 JINBEOM 유건 UGeon 이정 LEEJEONG 재하 JAEHA 원준 WONJUN</body></html>"
departure = "<html><body>C-JeS Studio WHIB INHONG leaves the group. WHIB will continue activities as a 7-member group.</body></html>"
rename = "<html><body>C-JeS Studio JAYDER 제이더 will change stage name to KIMJUNMIN 김준민 from 2025 10 2.</body></html>"
activity = "<html><body>C-JeS Studio 2026 WHIB FAN CONCERT BLUE HOUR</body></html>"
debut = "<html><body>WHIB 데뷔일 2023.11.08</body></html>"

rows = module.parse_live_pages(profile, departure, rename, activity, debut)
assert [row["displayArtist"] for row in rows] == ["WHIB"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["exactCurrentMemberRosterRequired"] is True
assert snapshot["contract"]["formerMemberExcludedByOfficialDepartureNotice"] is True
assert snapshot["contract"]["renameContinuityRequired"] is True
assert snapshot["contract"]["renamedMemberDoesNotCreateNewCanonical"] is True
assert snapshot["contract"]["temporaryScheduleAbsenceDoesNotChangeMembership"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["identityContinuity"]["currentMemberCount"] == 7
assert snapshot["identityContinuity"]["departedMember"] == "INHONG"
assert snapshot["identityContinuity"]["renamedMember"]["formerStageName"] == "JAYDER"
assert snapshot["identityContinuity"]["renamedMember"]["currentName"] == "KIM JUN MIN"
assert module.parse_live_pages(profile + " INHONG", departure, rename, activity, debut) == []
assert module.parse_live_pages(profile + " JAYDER", departure, rename, activity, debut) == []
assert module.parse_live_pages(profile.replace("WONJUN", ""), departure, rename, activity, debut) == []
assert module.parse_live_pages(profile, departure.replace("7-member", "8-member"), rename, activity, debut) == []
assert module.parse_live_pages(profile, departure, rename.replace("KIMJUNMIN", "OTHER"), activity, debut) == []
assert module.parse_live_pages(profile, departure, rename, activity.replace("2026", "2025"), debut) == []
print("WHIB official current provider catalog adapter regression: PASS")
