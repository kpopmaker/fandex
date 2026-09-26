from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/"scripts/artist-expansion/collect_jellyfish_group_roster_v1.py"
spec=importlib.util.spec_from_file_location("jellyfish_adapter",SCRIPT)
assert spec and spec.loader
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

directory="<html><body>EVNNE 빅스 VIXX 베리베리 VERIVERY</body></html>"
history="<html><body>2026 EVNNE OUR EVNNEing VIXX Case No. VIXX 2025 VERIVERY Lost and Found</body></html>"
rows=module.parse_live_pages(directory,history)
assert [row["displayArtist"] for row in rows]==module.EXPECTED_ARTISTS
snapshot=module.build_snapshot(rows,"2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"]==3
assert snapshot["contract"]["currentMusicGroupsOnly"] is True
assert snapshot["contract"]["nonGroupArtistRowsExcluded"] is True
assert snapshot["contract"]["individualMemberAgencyDoesNotOverrideGroupManagement"] is True
assert snapshot["contract"]["memberActivityDoesNotCreateSoloCanonical"] is True
assert snapshot["contract"]["autoPromote"] is False
assert module.parse_live_pages(directory.replace("EVNNE",""),history)==[]
assert module.parse_live_pages(directory,history.replace("Case No. VIXX",""))==[]
print("Jellyfish current group roster adapter regression: PASS")
