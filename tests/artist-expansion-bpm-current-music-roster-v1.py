from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_bpm_current_music_roster_v1.py"

spec = importlib.util.spec_from_file_location("bpm_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

pages = {
    "HA SUNG WOON": [
        "<html><body><h1>하성운 HA SUNG WOON</h1></body></html>",
        "<html><body><h1>HA SUNG WOON</h1><div>Tell The World</div><div>2026.01.09</div></body></html>",
    ],
    "BADVILLAIN": [
        "<html><body><h1>배드빌런 BADVILLAIN</h1></body></html>",
        "<html><body><h1>BADVILLAIN</h1><div>THRILLER</div><div>OVERSTEP</div></body></html>",
    ],
}

rows = module.parse_live_pages(pages)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS
assert rows[0]["aliases"] == ["하성운"]
assert rows[1]["aliases"] == ["배드빌런"]

snapshot = module.build_snapshot(rows, "2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"] == 2
assert snapshot["contract"]["notExhaustiveLabelRoster"] is True
assert snapshot["contract"]["currentActivityEvidenceRequired"] is True
assert snapshot["contract"]["historicalOrStaleProfilesExcludedByDefault"] is True
assert snapshot["contract"]["autoPromote"] is False

bad_pages = dict(pages)
bad_pages["HA SUNG WOON"] = list(pages["HA SUNG WOON"])
bad_pages["HA SUNG WOON"][1] = "<html><body><h1>HA SUNG WOON</h1></body></html>"
assert module.parse_live_pages(bad_pages) == []

print("BPM current verified music roster adapter regression: PASS")
