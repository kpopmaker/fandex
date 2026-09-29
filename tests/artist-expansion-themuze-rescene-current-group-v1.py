from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_themuze_rescene_current_group_v1.py"
spec = importlib.util.spec_from_file_location("themuze_rescene_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

group = "<html><body>RESCENE 리센느 원이 미나미 리브 메이 제나</body></html>"
discography = "<html><body>Pretty Girl Runaway lip bomb Dearest Glow Up SCENEDROME</body></html>"
runaway = "<html><body>Runaway RESCENE 리센느 WONI LIV MINAMI MAY ZENA</body></html>"
pretty_girl = "<html><body>Pretty Girl RESCENE 리센느 WONI LIV MINAMI MAY ZENA</body></html>"

rows = module.parse_live_pages(group, discography, runaway, pretty_girl)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-30T08:14:00+09:00")
assert snapshot["candidateCount"] == 1
entry = snapshot["currentIdentityState"]["RESCENE"]
assert entry["agency"] == "THE MUZE Entertainment"
assert entry["agencyStatus"] == "verified"
assert entry["lifecycleStatus"] == "active"
assert entry["entityType"] == "group"
assert entry["members"] == module.MEMBERS
assert entry["memberCount"] == 5
assert entry["currentDiscographyEvidence"][:2] == ["Runaway", "Pretty Girl"]
assert snapshot["contract"]["memberNameAloneDoesNotCreateSoloCanonical"] is True
assert snapshot["contract"]["existingCanonicalMustSuppressDuplicateDiscovery"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(group.replace("제나", "OTHER"), discography, runaway, pretty_girl) == []
assert module.parse_live_pages(group, discography.replace("Runaway", "OTHER"), runaway, pretty_girl) == []
assert module.parse_live_pages(group, discography, runaway.replace("RESCENE", "OTHER"), pretty_girl) == []
assert module.parse_live_pages(group, discography, runaway, pretty_girl.replace("Pretty Girl", "OTHER")) == []

print("THE MUZE RESCENE current group identity regression: PASS")
