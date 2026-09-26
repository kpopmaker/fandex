from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/"scripts/artist-expansion/collect_waker_official_provider_catalog_v1.py"
spec=importlib.util.spec_from_file_location("waker_adapter",SCRIPT)
assert spec and spec.loader
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

renewal="<html><body>2026 WAKER 웨이커 하울링엔터테인먼트 전속계약 재계약</body></html>"
activity="<html><body>2026 WAKER LiKE THAT In Elixir Spellbound</body></html>"
hiatus="<html><body>WAKER 웨이커 세범 불참 5인 활동</body></html>"
rows=module.parse_live_pages(renewal,activity,hiatus)
assert [row["displayArtist"] for row in rows]==["WAKER"]
snapshot=module.build_snapshot(rows,"2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"]==1
assert snapshot["source"]["type"]=="provider_catalog"
assert snapshot["contract"]["fullGroupRenewalIsCurrentManagementEvidence"] is True
assert snapshot["contract"]["memberLineupNotInferredWithoutCurrentOfficialEnumeration"] is True
assert snapshot["contract"]["memberHealthOrParticipationStatusDoesNotOverrideGroupLifecycle"] is True
assert snapshot["contract"]["autoPromote"] is False
assert module.parse_live_pages(renewal.replace("하울링엔터테인먼트","Other"),activity,hiatus)==[]
assert module.parse_live_pages(renewal,activity.replace("LiKE THAT","Other").replace("In Elixir","Other").replace("Spellbound","Other"),hiatus)==[]
print("WAKER official current provider catalog adapter regression: PASS")
