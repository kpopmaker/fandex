from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_allhours_official_provider_catalog_v1.py"
spec = importlib.util.spec_from_file_location("allhours_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

intro = "<html><body>ALL(H)OURS KUNHO YOUMIN XAYDEN MINJE MASAMI HYUNBIN ON:N</body></html>"
japan = "<html><body>EDEN Entertainment Korean 7 member ALL(H)OURS debut 2024 1 10 KUNHO YOUMIN XAYDEN MINJE MASAMI HYUNBIN ON:N</body></html>"
activity = "<html><body>2026 EDEN Entertainment ALL(H)OURS SIXTH MINI ALBUM UNBOUND</body></html>"
second = "<html><body>2026 ALL(H)OURS music broadcast</body></html>"

rows = module.parse_live_pages(intro, japan, activity, second)
assert [row["displayArtist"] for row in rows] == ["ALL(H)OURS"]
snapshot = module.build_snapshot(rows, "2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["currentManagementEvidenceRequired"] is True
assert snapshot["contract"]["exactCurrentMemberRosterRequired"] is True
assert snapshot["contract"]["currentActivityEvidenceRequired"] is True
assert snapshot["contract"]["koreanAndJapanOfficialProfilesMustAgree"] is True
assert snapshot["contract"]["memberProfilesDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["currentPromotionsDoNotCreateUnitCanonicals"] is True
assert snapshot["contract"]["autoPromote"] is False
assert module.parse_live_pages(intro.replace("ON:N", ""), japan, activity, second) == []
assert module.parse_live_pages(intro, japan.replace("MASAMI", ""), activity, second) == []
assert module.parse_live_pages(intro, japan.replace("EDEN", "Other"), activity, second) == []
assert module.parse_live_pages(intro, japan, activity.replace("UNBOUND", "Other"), second) == []
assert module.parse_live_pages(intro, japan, activity, second.replace("2026", "2025")) == []
print("ALL(H)OURS official current provider catalog adapter regression: PASS")
