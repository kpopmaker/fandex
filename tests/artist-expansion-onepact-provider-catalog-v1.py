from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/"scripts/artist-expansion/collect_onepact_official_provider_catalog_v1.py"
spec=importlib.util.spec_from_file_location("onepact_adapter",SCRIPT)
assert spec and spec.loader
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

armada="<html><body><div>one + impact</div><footer>armada-ent@armada-ent.com</footer></body></html>"
platform="<html><head><title>ONE PACT OFFICIAL PLATFORM</title></head><body>ONE PACT</body></html>"
activity="<html><body><div>2026</div><div>ARMADA ENT</div><div>ONE PACT</div></body></html>"
rows=module.parse_live_pages(armada,platform,activity)
assert [row["displayArtist"] for row in rows]==["ONE PACT"]
snapshot=module.build_snapshot(rows,"2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"]==1
assert snapshot["source"]["type"]=="provider_catalog"
assert snapshot["contract"]["singleGroupIdentityOnly"] is True
assert snapshot["contract"]["memberLineupNotInferredWithoutCurrentOfficialRoster"] is True
assert snapshot["contract"]["memberProfilesDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["autoPromote"] is False
assert module.parse_live_pages(armada,platform.replace("ONE PACT",""),activity)==[]
assert module.parse_live_pages(armada,platform,activity.replace("ARMADA ENT","Other"))==[]
print("ONE PACT official current provider catalog adapter regression: PASS")
