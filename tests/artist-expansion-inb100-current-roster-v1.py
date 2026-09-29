from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_inb100_current_roster_v1.py"
spec = importlib.util.spec_from_file_location("inb100_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

index = "<html><body>ARTIST BAEKHYUN XIUMIN CHEN</body></html>"
baekhyun = "<html><body>BAEKHYUN 백현 SOLO City Lights</body></html>"
xiumin = "<html><body>XIUMIN 시우민 SOLO Brand New</body></html>"
chen = "<html><body>CHEN 첸 SOLO 사월, 그리고 꽃</body></html>"

rows = module.parse_live_pages(index, baekhyun, xiumin, chen)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-30T00:24:00+09:00")
assert snapshot["candidateCount"] == 3
assert snapshot["currentRoster"]["BAEKHYUN"]["soloDebutDate"] == "2019-07-10"
assert snapshot["currentRoster"]["XIUMIN"]["soloDebutDate"] == "2022-09-26"
assert snapshot["currentRoster"]["CHEN"]["soloDebutDate"] == "2019-04-01"
for artist in module.EXPECTED_ARTISTS:
    assert snapshot["currentRoster"][artist]["agency"] == "INB100"
    assert snapshot["currentRoster"][artist]["agencyStatus"] == "verified"
    assert snapshot["currentRoster"][artist]["lifecycleStatus"] == "active"
    assert snapshot["currentRoster"][artist]["entityType"] == "solo"
assert snapshot["contract"]["groupMembershipAloneDoesNotCreateSoloCanonical"] is True
assert snapshot["contract"]["dedicatedSoloProfileRequired"] is True
assert snapshot["contract"]["existingCanonicalMustSuppressDuplicateDiscovery"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(index.replace("XIUMIN", ""), baekhyun, xiumin, chen) == []
assert module.parse_live_pages(index, baekhyun.replace("City Lights", ""), xiumin, chen) == []
assert module.parse_live_pages(index, baekhyun, xiumin.replace("SOLO", ""), chen) == []
assert module.parse_live_pages(index, baekhyun, xiumin, chen.replace("사월, 그리고 꽃", "")) == []

print("INB100 current artist roster regression: PASS")
