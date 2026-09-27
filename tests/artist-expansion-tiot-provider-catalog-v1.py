from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_tiot_official_provider_catalog_v1.py"
spec = importlib.util.spec_from_file_location("tiot_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

profile = "<html><body>TIOT KIM MIN SEOUNG KUM JUN HYEON HONG KEON HEE CHOI WOO JIN SHIN YE CHAN</body></html>"
management = "<html><body>Redstart ENM TIOT official community rules</body></html>"
activity = "<html><body>2026 TIOT 1st FANMEETING in HONG KONG 1:5 group polaroid</body></html>"
debut = "<html><body>TIOT 2024년 4월 22일 멤버 김민성 금준현 홍건희 최우진 신예찬</body></html>"
fandom = "<html><body>Welcome to TIOT official global fan community for LOTI</body></html>"

rows = module.parse_live_pages(profile, management, activity, debut, fandom)
assert [row["displayArtist"] for row in rows] == ["TIOT"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["exactCurrentMemberRosterRequired"] is True
assert snapshot["contract"]["currentOfficialMemberSectionControlsRoster"] is True
assert snapshot["contract"]["scheduleParticipationDoesNotDefineMembership"] is True
assert snapshot["contract"]["explicitTerminalDepartureEvidenceRequiredForMemberRemoval"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["currentRoster"]["currentMemberCount"] == 5
assert snapshot["currentRoster"]["agency"] == "Redstart ENM"
assert snapshot["currentRoster"]["debutDate"] == "2024-04-22"
assert snapshot["currentRoster"]["fandomName"] == "LOTI"
assert module.parse_live_pages(profile.replace("SHIN YE CHAN", ""), management, activity, debut, fandom) == []
assert module.parse_live_pages(profile, management.replace("Redstart ENM", "OTHER"), activity, debut, fandom) == []
assert module.parse_live_pages(profile, management, activity.replace("1:5", "1:4"), debut, fandom) == []
assert module.parse_live_pages(profile, management, activity, debut.replace("2024년 4월 22일", "2024년 4월 23일"), fandom) == []
assert module.parse_live_pages(profile, management, activity, debut, fandom.replace("LOTI", "OTHER")) == []
print("TIOT official current provider catalog adapter regression: PASS")
