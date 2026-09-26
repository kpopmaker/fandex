from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/"scripts/artist-expansion/collect_thekingdom_official_provider_catalog_v1.py"
spec=importlib.util.spec_from_file_location("thekingdom_adapter",SCRIPT)
assert spec and spec.loader
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

notice="<html><body>The KingDom GF엔터테인먼트 2026 그룹 활동을 중단</body></html>"
highlight="<html><body>DANN ARTHUR MUJIN LOUIS IVAN JAHAN The KingDom</body></html>"
fancon="<html><body>2026 The KingDom 5th FAN-CON THE QUINQUENNIUM</body></html>"
rows=module.parse_live_pages(notice,highlight,fancon)
assert [row["displayArtist"] for row in rows]==["The KingDom"]
snapshot=module.build_snapshot(rows,"2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"]==1
assert snapshot["source"]["type"]=="provider_catalog"
assert snapshot["contract"]["renameContinuityPreserved"] is True
assert snapshot["contract"]["temporaryGroupHaltMapsToInactiveLifecycle"] is True
assert snapshot["contract"]["currentAgencySupportDoesNotBecomeHistorical"] is True
assert snapshot["contract"]["militaryStatusDoesNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["autoPromote"] is False
assert module.parse_live_pages(notice.replace("그룹 활동을 중단","활동 지속"),highlight,fancon)==[]
assert module.parse_live_pages(notice,highlight.replace("DANN ARTHUR MUJIN",""),fancon)==[]
print("The KingDom official current provider catalog adapter regression: PASS")
