from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_dxmon_official_provider_catalog_v1.py"

spec = importlib.util.spec_from_file_location("dxmon_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

profile = """
<html><body>
<h1>DXMON 다이몬</h1>
<div>SEITA</div><div>MINJAE</div><div>HEE</div><div>TK</div><div>REX</div>
</body></html>
"""
agency = "<html><body>안녕하세요. 에이치뮤직엔터테인먼트입니다. 소속 아티스트 DXMON 다이몬 안내</body></html>"
activity = "<html><body>2026 DXMON FANMEETING [HYPER LINK: ON]</body></html>"

rows = module.parse_live_pages(profile, agency, activity)
assert [row["displayArtist"] for row in rows] == ["DXMON"]
assert rows[0]["aliases"] == ["다이몬"]

snapshot = module.build_snapshot(rows, "2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"] == 1
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["contract"]["currentFiveMemberLineupRequired"] is True
assert snapshot["contract"]["formerMemberExcludedFromCurrentLineup"] is True
assert snapshot["contract"]["memberProfilesDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(profile.replace("<div>REX</div>", ""), agency, activity) == []
assert module.parse_live_pages(profile, agency.replace("에이치뮤직엔터테인먼트", "Other"), activity) == []
assert module.parse_live_pages(profile, agency, activity.replace("2026 DXMON FANMEETING", "Other")) == []

print("DXMON official current provider catalog adapter regression: PASS")
