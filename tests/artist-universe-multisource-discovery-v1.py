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
                    "displayArtist": "IVE (아이브)",
                    "aliases": [],
                    "evidence": {"label": "official profile", "url": "https://example.com/ive"},
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
                    "displayArtist": "IVE",
                    "aliases": ["아이브"],
                    "evidence": {"label": "artist page", "url": "https://example.com/provider/ive"},
                },
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

decisions = {
    "decisions": [
        {
            "displayArtist": "신인가수 A",
            "decision": "new_canonical_solo_candidate",
            "relationResolution": "fixture_identity_verified",
            "relatedCanonicalArtistIds": [],
            "autoPromote": False,
            "evidence": [{"source": "fixture", "url": "https://example.com/decision/a"}],
        }
    ]
}

result = module.build_discovery(identity, snapshots, decisions)

assert result["sourceCount"] == 3
assert result["candidateCount"] == 2
assert result["candidateResolvedCount"] == 1
assert result["candidateUnresolvedCount"] == 1
assert result["knownSuppressionCount"] == 4
assert result["contract"]["autoPromote"] is False
assert result["contract"]["evidenceCountIsNotThreshold"] is True

coverage = {row["canonicalArtistId"]: row for row in result["knownCanonicalCoverage"]}
assert coverage["ive"]["sourceCount"] == 3
assert {row["sourceType"] for row in coverage["ive"]["sources"]} == {
    "agency_roster",
    "provider_catalog",
    "festival_or_event_roster",
}

by_name = {row["displayArtist"]: row for row in result["candidates"]}
assert set(by_name) == {"신인가수 A", "신인그룹 B"}
assert len(by_name["신인가수 A"]["sources"]) == 2
assert len(by_name["신인그룹 B"]["sources"]) == 2
assert by_name["신인가수 A"]["autoPromote"] is False
assert by_name["신인가수 A"]["scopeStatus"] == "unverified"
assert module.candidate_names({"displayArtist": "BIGBANG (빅뱅)", "aliases": []}) == ["BIGBANG (빅뱅)", "빅뱅", "BIGBANG"]
assert module.candidate_names({"displayArtist": "TREASURE(트레저)", "aliases": []}) == ["TREASURE(트레저)", "트레저", "TREASURE"]
assert by_name["신인가수 A"]["reviewStatus"] == "resolved"
assert by_name["신인가수 A"]["reviewDecision"] == "new_canonical_solo_candidate"
assert by_name["신인그룹 B"]["reviewStatus"] == "unresolved"

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


bilingual_identity = {
    "artists": [
        {"id": "bigbang", "aliases": ["BIGBANG", "빅뱅"]},
        {"id": "treasure", "aliases": ["TREASURE", "트레저"]},
    ]
}
bilingual_snapshot = [
    (
        Path("provider-bilingual.json"),
        {
            "source": {
                "id": "bugs-label",
                "type": "provider_catalog",
                "name": "Bugs Label",
                "observedAt": "2026-09-24T00:20:00Z",
            },
            "candidates": [
                {"displayArtist": "BIGBANG (빅뱅)", "aliases": []},
                {"displayArtist": "TREASURE(트레저)", "aliases": []},
                {"displayArtist": "신규 솔로", "aliases": []},
            ],
        },
    )
]
bilingual_result = module.build_discovery(bilingual_identity, bilingual_snapshot)
assert bilingual_result["candidateCount"] == 1
assert bilingual_result["knownSuppressionCount"] == 2
assert bilingual_result["candidates"][0]["displayArtist"] == "신규 솔로"
print("bilingual provider identity suppression regression: PASS")


decision_identity = {
    "artists": [
        {"id": "txt", "aliases": ["TXT", "TOMORROW X TOGETHER"]},
    ]
}
decision_snapshot = [
    (
        Path("decision-aware.json"),
        {
            "source": {
                "id": "decision-aware",
                "type": "festival_or_event_roster",
                "name": "Decision Aware",
                "observedAt": "2026-09-24T00:30:00Z",
            },
            "candidates": [
                {"displayArtist": "CUTIE STREET", "aliases": []},
                {"displayArtist": "SOOBIN of TXT", "aliases": []},
                {"displayArtist": "HORI7ON", "aliases": []},
            ],
        },
    )
]
decision_payload = {
    "decisions": [
        {
            "displayArtist": "CUTIE STREET",
            "decision": "exclude_non_kpop_scope",
            "relationResolution": "japanese_idol_group_non_kpop_scope",
            "relatedCanonicalArtistIds": [],
            "autoPromote": False,
            "evidence": [],
        },
        {
            "displayArtist": "SOOBIN of TXT",
            "decision": "existing_canonical_member_credit",
            "relationResolution": "member_specific_event_credit_not_independent_artist",
            "relatedCanonicalArtistIds": ["txt"],
            "autoPromote": False,
            "evidence": [],
        },
        {
            "displayArtist": "HORI7ON",
            "decision": "identity_verified_scope_eligible_onboarding_blocked",
            "relationResolution": "cross_border_group_scope_verified_current_management_unresolved",
            "relatedCanonicalArtistIds": [],
            "scopeDecision": "eligible",
            "scopeBasis": "official_kpop_award_roster",
            "onboardingBlocker": "current_management_unresolved_after_contract_termination",
            "autoPromote": False,
            "evidence": [],
        },
    ]
}
decision_result = module.build_discovery(
    decision_identity,
    decision_snapshot,
    decision_payload,
)
assert decision_result["candidateCount"] == 1
assert decision_result["decisionSuppressionCount"] == 2
assert decision_result["candidates"][0]["displayArtist"] == "HORI7ON"
assert decision_result["candidates"][0]["status"] == "identity_verified_onboarding_blocked"
assert decision_result["candidates"][0]["scopeStatus"] == "eligible"
assert decision_result["candidates"][0]["scopeDecision"] == "eligible"
assert decision_result["candidates"][0]["scopeBasis"] == "official_kpop_award_roster"
assert decision_result["candidates"][0]["onboardingBlocker"] == "current_management_unresolved_after_contract_termination"
assert decision_result["candidates"][0]["reviewDecision"] == "identity_verified_scope_eligible_onboarding_blocked"
assert {row["displayArtist"] for row in decision_result["decisionSuppressions"]} == {
    "CUTIE STREET",
    "SOOBIN of TXT",
}

print("decision-aware Stage 7 discovery: PASS")
