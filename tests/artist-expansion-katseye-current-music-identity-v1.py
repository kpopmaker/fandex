from __future__ import annotations

import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/collect_katseye_current_music_identity_v1.py"
spec = importlib.util.spec_from_file_location("katseye_adapter", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)

hybe = "<html><body>ARTIST KATSEYE 2024-06-28</body></html>"
releases = "<html><body>KATSEYE 2026 Internet Girl Pinky Up WILD Animal</body></html>"
videos = "<html><body>KATSEYE Animal PINKY UP Internet Girl Official MV</body></html>"
signup = "<html><body>KATSEYE Subscribe HYBE x Geffen</body></html>"

rows = module.parse_live_pages(hybe, releases, videos, signup)
assert [row["displayArtist"] for row in rows] == module.EXPECTED_ARTISTS

snapshot = module.build_snapshot(rows, "2026-09-30T07:08:00+09:00")
assert snapshot["candidateCount"] == 1
entry = snapshot["currentIdentityState"]["KATSEYE"]
assert entry["agency"] == "HYBE x Geffen"
assert entry["agencyStatus"] == "verified"
assert entry["lifecycleStatus"] == "active"
assert entry["entityType"] == "group"
assert entry["debutDate"] == "2024-06-28"
assert [row["title"] for row in entry["current2026MusicEvidence"]] == ["Internet Girl", "PINKY UP", "WILD", "Animal"]
assert snapshot["contract"]["hybeGeffenAttributionRequired"] is True
assert snapshot["contract"]["historicalDebutEvidenceAloneInsufficient"] is True
assert snapshot["contract"]["existingCanonicalMustSuppressDuplicateDiscovery"] is True
assert snapshot["contract"]["autoPromote"] is False

assert module.parse_live_pages(hybe.replace("KATSEYE", "OTHER"), releases, videos, signup) == []
assert module.parse_live_pages(hybe, releases.replace("Animal", "OTHER"), videos, signup) == []
assert module.parse_live_pages(hybe, releases, videos.replace("PINKY UP", "OTHER"), signup) == []
assert module.parse_live_pages(hybe, releases, videos, signup.replace("HYBE x Geffen", "OTHER")) == []

print("KATSEYE current music identity regression: PASS")
