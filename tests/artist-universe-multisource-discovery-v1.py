from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/artist_universe_multisource_discovery_v1.py"

spec = importlib.util.spec_from_file_location("multisource", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


identity = {
    "artists": [
        {"id": "iu", "aliases": ["아이유", "IU"]},
        {"id": "ive", "aliases": ["아이브", "IVE"]},
    ]
}

snapshots = [
    (
        Path("agency.json"),
        {
            "source": {
                "id": "agency-a",
                "type": "agency_roster",
                "name": "Agency A",
                "observedAt": "2026-09-24T00:00:00Z",
            },
            "candidates": [
                {
                    "displayArtist": "아이유",
                    "aliases": ["IU"],
                    "evidence": {"label": "official profile", "url": "https://example.com/iu"},
                },
                {
                    "displayArtist": "신인가수 A",
                    "aliases": ["Rookie A"],
                    "evidence": {"label": "official profile", "url": "https://example.com/a"},
                },
            ],
        },
    ),
    (
        Path("provider.json"),
        {
            "source": {
                "id": "provider-b",
                "type": "provider_catalog",
                "name": "Provider B",
                "observedAt": "2026-09-24T00:05:00Z",
            },
            "candidates": [
                {
                    "displayArtist": "신인가수 A",
                    "aliases": ["Rookie A"],
                    "evidence": {"label": "artist page", "url": "https://example.com/provider/a"},
                },
                {
                    "displayArtist": "신인그룹 B",
                    "aliases": ["Rookie B"],
                },
            ],
        },
    ),
    (
        Path("event.json"),
        {
            "source": {
                "id": "event-c",
                "type": "festival_or_event_roster",
                "name": "Event C",
                "observedAt": "2026-09-24T00:10:00Z",
            },
            "candidates": [
                {"displayArtist": "IVE", "aliases": ["아이브"]},
                {"displayArtist": "신인그룹 B", "aliases": ["Rookie B"]},
            ],
        },
    ),
]

result = module.build_discovery(identity, snapshots)

assert result["sourceCount"] == 3
assert result["candidateCount"] == 2
assert result["knownSuppressionCount"] == 2
assert result["contract"]["autoPromote"] is False
assert result["contract"]["evidenceCountIsNotThreshold"] is True

by_name = {row["displayArtist"]: row for row in result["candidates"]}
assert set(by_name) == {"신인가수 A", "신인그룹 B"}
assert len(by_name["신인가수 A"]["sources"]) == 2
assert len(by_name["신인그룹 B"]["sources"]) == 2
assert by_name["신인가수 A"]["autoPromote"] is False
assert by_name["신인가수 A"]["scopeStatus"] == "unverified"

bad = (
    Path("bad.json"),
    {
        "source": {
            "id": "bad",
            "type": "social_followers",
            "name": "Bad Source",
            "observedAt": "2026-09-24T00:00:00Z",
        },
        "candidates": [],
    },
)
try:
    module.build_discovery(identity, [bad])
except RuntimeError as exc:
    assert "unsupported source type" in str(exc)
else:
    raise AssertionError("unsupported source type must fail")

print("artist universe multisource discovery regression: PASS")
