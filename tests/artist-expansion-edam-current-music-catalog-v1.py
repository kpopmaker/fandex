from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_edam_current_music_catalog_v1.py"

spec = importlib.util.spec_from_file_location("edam_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

iu = "<html><body>IU 2026 SEASON'S GREETINGS This is EDAM Entertainment</body></html>"
woodz = "<html><body>2026 WOODZ WORLD TOUR Archive. 1 This is EDAM Entertainment</body></html>"

rows = module.parse_live_pages(iu, woodz)
assert [row["displayArtist"] for row in rows] == ["IU", "WOODZ"]

snapshot = module.build_snapshot(rows, "2026-09-29T19:28:00+09:00")
assert snapshot["candidateCount"] == 2
assert snapshot["source"]["type"] == "provider_catalog"
assert snapshot["currentIdentity"]["IU"]["agency"] == "EDAM Entertainment"
assert snapshot["currentIdentity"]["WOODZ"]["agency"] == "EDAM Entertainment"
assert snapshot["currentIdentity"]["IU"]["lifecycleStatus"] == "active"
assert snapshot["currentIdentity"]["WOODZ"]["lifecycleStatus"] == "active"
assert snapshot["contract"]["officialFirstPartyEdamEvidenceRequired"] is True
assert snapshot["contract"]["merchandiseEvidenceDoesNotSubstituteForMusicIdentityAlone"] is True
assert snapshot["contract"]["currentMusicActivityCrossCheckRequired"] is True
assert snapshot["contract"]["noNewCanonicalFromMerchandiseOnly"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(iu.replace("EDAM Entertainment", "OTHER"), woodz) == []
assert module.parse_live_pages(iu, woodz.replace("WOODZ", "OTHER")) == []
assert module.parse_live_pages(iu.replace("2026", "2025"), woodz) == []
assert module.parse_live_pages(iu, woodz.replace("2026 WOODZ WORLD TOUR", "WOODZ")) == []

print("EDAM current music identity catalog regression: PASS")
