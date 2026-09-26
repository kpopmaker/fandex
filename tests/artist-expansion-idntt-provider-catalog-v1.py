from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/"scripts/artist-expansion/collect_idntt_official_provider_catalog_v1.py"
spec=importlib.util.spec_from_file_location("idntt_adapter",SCRIPT)
assert spec and spec.loader
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

official="<html><body><h1>idntt</h1><div>Kids Return MV</div><footer>© Modhaus Inc.</footer></body></html>"
cosmo="<html><body><div>idntt</div><footer>Company Name: Modhaus Inc.</footer></body></html>"
rows=module.parse_live_pages(official,cosmo)
assert [row["displayArtist"] for row in rows]==["idntt"]
snapshot=module.build_snapshot(rows,"2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"]==1
assert snapshot["source"]["type"]=="provider_catalog"
assert snapshot["contract"]["singleParentGroupIdentityOnly"] is True
assert snapshot["contract"]["unitDebutDoesNotEqualParentGroupDebut"] is True
assert snapshot["contract"]["plannedFinalMemberCountDoesNotEqualCurrentLineup"] is True
assert snapshot["contract"]["unitMembersDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["autoPromote"] is False
assert module.parse_live_pages(official.replace("Kids Return","Other"),cosmo)==[]
assert module.parse_live_pages(official,cosmo.replace("Modhaus","Other"))==[]
print("idntt official current provider catalog adapter regression: PASS")
