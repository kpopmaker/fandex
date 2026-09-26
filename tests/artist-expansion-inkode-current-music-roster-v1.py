from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_inkode_current_music_roster_v1.py"

spec = importlib.util.spec_from_file_location("inkode_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

directory = """
<html><body>
<div>KIM JAEJOONG</div><div>NICOLE</div><div>SAY MY NAME</div>
<div>KEYVITUP</div><div>VAYONN</div>
</body></html>
"""
details = {
    "NICOLE": "<html><body>NICOLE KOREAN DISCOGRAPHY JAPANESE DISCOGRAPHY</body></html>",
    "SAY MY NAME": "<html><body>SAY MY NAME October 16, 2024 SHUIE</body></html>",
    "KEYVITUP": "<html><body>KEYVITUP April 08, 2026 TAEHWAN HYUNMIN SENA JAEIN RUKIA</body></html>",
    "VAYONN": "<html><body>VAYONN July 06, 2026 MASATO SEN AYANG JINYU TERU MANO</body></html>",
}

rows = module.parse_live_pages(directory, details)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS
assert rows[1]["aliases"] == ["니콜"]
assert rows[-1]["aliases"] == ["베이온"]

snapshot = module.build_snapshot(rows, "2026-09-26T00:00:00+00:00")
assert snapshot["candidateCount"] == 5
assert snapshot["source"]["type"] == "agency_roster"
assert snapshot["contract"]["exactCurrentDirectoryRequired"] is True
assert snapshot["contract"]["memberProfilesDoNotCreateSoloCanonicals"] is True
assert snapshot["contract"]["careerDebutDoesNotAutomaticallyEqualSoloDebut"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(directory.replace("<div>VAYONN</div>", ""), details) == []
bad = dict(details)
bad["KEYVITUP"] = bad["KEYVITUP"].replace("RUKIA", "")
assert module.parse_live_pages(directory, bad) == []

print("iNKODE current music roster adapter regression: PASS")
