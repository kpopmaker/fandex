from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_vvup_official_provider_catalog_v1.py"
spec = importlib.util.spec_from_file_location("vvup_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

highlight = "<html><body>VVUP KIM PAAN SUYEON JIYOON debut 2024-04-01</body></html>"
management = "<html><body>Hello from egoENT. VVUP Super Model promotion.</body></html>"
media = "<html><body>VVUP 2026 2nd Anniversary VVON House Party Super Model</body></html>"
release_notice = "<html><body>VVUP 1st Mini Album VVON 2026 10 29</body></html>"

rows = module.parse_live_pages(highlight, management, media, release_notice)
assert [row["displayArtist"] for row in rows] == ["VVUP"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["currentManagementEvidenceRequired"] is True
assert snapshot["contract"]["exactCurrentMemberRosterRequired"] is True
assert snapshot["contract"]["currentActivityEvidenceRequired"] is True
assert snapshot["contract"]["currentRosterDerivedFromOfficialArtistProfilesOnly"] is True
assert snapshot["contract"]["historicalMemberContentDoesNotOverrideCurrentProfiles"] is True
assert snapshot["contract"]["memberProfilesDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["autoPromote"] is False
assert module.parse_live_pages(highlight.replace("JIYOON", ""), management, media, release_notice) == []
assert module.parse_live_pages(highlight, management.replace("egoENT", "Other"), media, release_notice) == []
assert module.parse_live_pages(highlight, management, media.replace("2026", "2025"), release_notice) == []
assert module.parse_live_pages(highlight, management, media, release_notice.replace("VVON", "Other")) == []
print("VVUP official current provider catalog adapter regression: PASS")
