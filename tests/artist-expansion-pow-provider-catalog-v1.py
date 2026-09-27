from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_pow_official_provider_catalog_v1.py"
spec = importlib.util.spec_from_file_location("pow_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

grid = "<html><body>GRID Entertainment POW 5인 DEBUT 2023.10.11 YORCH HYUNBIN JUNGBIN DONGYEON HONG</body></html>"
japan = "<html><body>GRID POW 5 YORCH HYUNBIN JUNGBIN DONGYEON HONG</body></html>"
discography = "<html><body>COME TRUE 2026.01.28 FLAVOR 2026.07.28</body></html>"
news = "<html><body>GRID / CJ ENM Japan Inc. JUNGBIN 2026.07.22</body></html>"

rows = module.parse_live_pages(grid, japan, discography, news)
assert [row["displayArtist"] for row in rows] == ["POW"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["currentManagementEvidenceRequired"] is True
assert snapshot["contract"]["exactCurrentMemberRosterRequired"] is True
assert snapshot["contract"]["currentActivityEvidenceRequired"] is True
assert snapshot["contract"]["gridAndJapanOfficialProfilesMustAgree"] is True
assert snapshot["contract"]["officialDebutDateFromGridProfile"] is True
assert snapshot["contract"]["memberProfilesDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["autoPromote"] is False
assert module.parse_live_pages(grid.replace("HONG", ""), japan, discography, news) == []
assert module.parse_live_pages(grid, japan.replace("DONGYEON", ""), discography, news) == []
assert module.parse_live_pages(grid.replace("2023.10.11", "2023.10.10"), japan, discography, news) == []
assert module.parse_live_pages(grid, japan, discography.replace("FLAVOR", "Other"), news) == []
assert module.parse_live_pages(grid, japan, discography, news.replace("2026.07.22", "2025.07.22")) == []
print("POW official current provider catalog adapter regression: PASS")
