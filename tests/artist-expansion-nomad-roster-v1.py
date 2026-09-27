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
rows=module.parse_live_identity_pages(home,artist,disco)
assert [row["displayArtist"] for row in rows]==["NOMAD"]
snapshot=module.build_snapshot(rows,"2026-09-27T00:00:00+00:00")
assert snapshot["candidateCount"]==1
assert snapshot["source"]["type"]=="agency_roster"
assert snapshot["source"]["id"]=="nomad-entertainment-official-group-lifecycle"
assert snapshot["contract"]["currentRosterClaimAllowed"] is False
assert snapshot["contract"]["terminalLifecycleEvidenceRequired"] is True
assert snapshot["contract"]["staleOfficialProfileDoesNotOverrideTerminalNotice"] is True
assert snapshot["contract"]["exactLastPublishedMemberRosterRequired"] is True
assert snapshot["contract"]["memberProfilesDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["autoPromote"] is False
assert snapshot["terminalLifecycle"]["lifecycleStatus"]=="inactive"
assert snapshot["terminalLifecycle"]["agencyStatus"]=="historical"
assert snapshot["terminalLifecycle"]["effectiveDate"]=="2026-04-24"
assert module.parse_live_identity_pages(home,artist.replace("JUNHO",""),disco)==[]
assert module.parse_live_identity_pages(home,artist,disco.replace("Call Me Back","Other"))==[]
print("NOMAD terminal lifecycle adapter regression: PASS")
