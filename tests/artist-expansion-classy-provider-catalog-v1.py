from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/"scripts/artist-expansion/collect_classy_official_provider_catalog_v1.py"
spec=importlib.util.spec_from_file_location("classy_adapter",SCRIPT)
assert spec and spec.loader
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

ktigers="<html><body>2025 클라씨(CLASS:y) 전속계약</body></html>"
management="<html><body>K-TIGERS Entertainment CLASS:y all members new album</body></html>"
media="<html><body>2026 RE:BOOT HYUNGSEO CHAEWON HYEJU RIWON JIMIN BOEUN SEONYOU</body></html>"
rows=module.parse_live_pages(ktigers,management,media)
assert [row["displayArtist"] for row in rows]==["CLASS:y"]
snapshot=module.build_snapshot(rows,"2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"]==1
assert snapshot["source"]["type"]=="provider_catalog"
assert snapshot["contract"]["currentManagementEvidenceRequired"] is True
assert snapshot["contract"]["currentSevenMemberContentEvidenceRequired"] is True
assert snapshot["contract"]["memberSoloContentDoesNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["debutDateNotInferredFromAnniversaryContent"] is True
assert snapshot["contract"]["autoPromote"] is False
assert module.parse_live_pages(ktigers,management.replace("K-TIGERS Entertainment","Other"),media)==[]
assert module.parse_live_pages(ktigers,management,media.replace("SEONYOU",""))==[]
print("CLASS:y official current provider catalog adapter regression: PASS")
