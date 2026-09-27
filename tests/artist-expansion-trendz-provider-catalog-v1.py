from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_trendz_official_provider_catalog_v1.py"
spec = importlib.util.spec_from_file_location("trendz_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

profile = "<html><body>TRENDZ 7-member 2026 HANKOOK HAVIT LEON YOONWOO ra.L EUNIL YECHAN</body></html>"
management = "<html><body>2026 TRENDZ 글로벌에이치미디어 fan meeting notice</body></html>"
activity = "<html><body>2026 TRENDZ 6th Single Album On My Knees</body></html>"
fandom = "<html><body>TRENDZ OFFICIAL FANCLUB FRIENDZ MEMBERSHIP</body></html>"
debut = "<html><body>22년 1월 5일 이후 TRENDZ</body></html>"

rows = module.parse_live_pages(profile, management, activity, fandom, debut)
assert [row["displayArtist"] for row in rows] == ["TRENDZ"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["exactCurrentMemberRosterRequired"] is True
assert snapshot["contract"]["currentManagementEvidenceRequired"] is True
assert snapshot["contract"]["koreanAndJapanOfficialSurfacesMustAgree"] is True
assert snapshot["contract"]["officialDebutDateEvidenceRequired"] is True
assert snapshot["contract"]["fandomEvidenceRequired"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["currentRoster"]["currentMemberCount"] == 7
assert snapshot["currentRoster"]["agency"] == "Global H Media"
assert snapshot["currentRoster"]["debutDate"] == "2022-01-05"
assert snapshot["currentRoster"]["fandomName"] == "FRIENDZ"
assert module.parse_live_pages(profile.replace("YECHAN", ""), management, activity, fandom, debut) == []
assert module.parse_live_pages(profile, management.replace("글로벌에이치미디어", "OTHER"), activity, fandom, debut) == []
assert module.parse_live_pages(profile, management, activity.replace("On My Knees", "Other"), fandom, debut) == []
assert module.parse_live_pages(profile, management, activity, fandom.replace("FRIENDZ", "OTHER"), debut) == []
assert module.parse_live_pages(profile, management, activity, fandom, debut.replace("1월 5일", "1월 6일")) == []
print("TRENDZ official current provider catalog adapter regression: PASS")
