from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_ghost9_maroo_current_provider_catalog_v1.py"
spec = importlib.util.spec_from_file_location("ghost9_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

profile = "<html><body>GHOST9 고스트나인 이신 손준형 이강성 최준성 프린스 이우진 이진우 PRE EPISODE 1 : DOOR</body></html>"
current_company = "<html><body>2026 제16기 마루기획 주식회사 정기주주총회</body></html>"
departure = "<html><body>Maroo Entertainment Hwang Dong Jun and Lee Tae Seung are leaving, wrapping up promotions. GHOST9 will continue as seven.</body></html>"
debut = "<html><body>Maroo Entertainment GHOST9 will make debut on September 23, 2020 with PRE EPISODE 1 : DOOR</body></html>"

rows = module.parse_live_pages(profile, current_company, departure, debut)
assert [row["displayArtist"] for row in rows] == ["GHOST9"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["contract"]["currentOfficialArtistDirectoryRequired"] is True
assert snapshot["contract"]["currentOfficialCompanySurfaceRequired"] is True
assert snapshot["contract"]["exactCurrentMemberRosterRequired"] is True
assert snapshot["contract"]["explicitDepartureEvidenceRequiredForFormerMemberExclusion"] is True
assert snapshot["contract"]["preservedOfficialStatementsAllowedForHistoricalEvents"] is True
assert snapshot["contract"]["secondaryEditorialInferenceForbidden"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["currentRoster"]["agency"] == "Maroo Entertainment"
assert snapshot["currentRoster"]["agencyStatus"] == "verified"
assert snapshot["currentRoster"]["currentMemberCount"] == 7
assert snapshot["currentRoster"]["lifecycleStatus"] == "active"
assert snapshot["currentRoster"]["debutDate"] == "2020-09-23"
assert snapshot["currentRoster"]["formerMembers"] == ["HWANG DONG JUN", "LEE TAE SEUNG"]
assert module.parse_live_pages(profile.replace("이진우", ""), current_company, departure, debut) == []
assert module.parse_live_pages(profile, current_company.replace("2026", "2025"), departure, debut) == []
assert module.parse_live_pages(profile, current_company, departure.replace("Lee Tae Seung", "OTHER"), debut) == []
assert module.parse_live_pages(profile, current_company, departure.replace("seven", "nine"), debut) == []
assert module.parse_live_pages(profile, current_company, departure, debut.replace("September 23", "September 22")) == []
print("GHOST9 Maroo current provider catalog adapter regression: PASS")
