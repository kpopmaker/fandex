from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/"scripts/artist-expansion/collect_madein_official_provider_catalog_v1.py"
spec=importlib.util.spec_from_file_location("madein_adapter",SCRIPT)
assert spec and spec.loader
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

profile="<html><body>MADEIN MASHIRO MiU SUHYE YESEO SERINA NAGOMI</body></html>"
blog="<html><body>2026 MASHIRO MiU SERINA NAGOMI <footer>143 Entertainment Inc.</footer></body></html>"
schedule="<html><body>Girl Meets Boy 2026.02.09 <footer>143 Entertainment Inc.</footer></body></html>"
rows=module.parse_live_pages(profile,blog,schedule)
assert [row["displayArtist"] for row in rows]==["MADEIN"]
snapshot=module.build_snapshot(rows,"2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"]==1
assert snapshot["source"]["type"]=="provider_catalog"
assert snapshot["contract"]["historicalLimelightContinuityPreserved"] is True
assert snapshot["contract"]["temporaryPromotionLineupDoesNotOverrideCanonicalMembership"] is True
assert snapshot["contract"]["departedFormerMemberExcluded"]==["GAEUN"]
assert snapshot["contract"]["memberProfilesDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["autoPromote"] is False
assert module.parse_live_pages(profile.replace("SUHYE",""),blog,schedule)==[]
assert module.parse_live_pages(profile,blog.replace("NAGOMI",""),schedule)==[]
assert module.parse_live_pages(profile,blog,schedule.replace("Girl Meets Boy","Other"))==[]
print("MADEIN official current provider catalog adapter regression: PASS")
