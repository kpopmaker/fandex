from __future__ import annotations
import importlib.util
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/"scripts/artist-expansion/collect_nomad_roster_v1.py"
spec=importlib.util.spec_from_file_location("nomad_adapter",SCRIPT)
assert spec and spec.loader
module=importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

home="<html><body>NOMAD K-POP artist</body></html>"
artist="<html><body>NOMAD 2024.02.28 DOY SANGHA ONE RIVR JUNHO</body></html>"
disco="<html><body>Call Me Back 2024.10.09</body></html>"
rows=module.parse_live_pages(home,artist,disco)
assert [row["displayArtist"] for row in rows]==["NOMAD"]
snapshot=module.build_snapshot(rows,"2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"]==1
assert snapshot["source"]["type"]=="agency_roster"
assert snapshot["contract"]["singleCurrentMusicGroupOnly"] is True
assert snapshot["contract"]["exactCurrentMemberRosterRequired"] is True
assert snapshot["contract"]["officialKpopDescriptionRequired"] is True
assert snapshot["contract"]["memberProfilesDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["autoPromote"] is False
assert module.parse_live_pages(home,artist.replace("JUNHO",""),disco)==[]
assert module.parse_live_pages(home,artist,disco.replace("Call Me Back","Other"))==[]
print("NOMAD Entertainment current roster adapter regression: PASS")
