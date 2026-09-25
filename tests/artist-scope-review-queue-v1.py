from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/artist_scope_review_queue_v1.py"

spec = importlib.util.spec_from_file_location("scope_queue", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


payload = {
    "version": "artist_universe_multisource_discovery_v1",
    "candidates": [
        {
            "displayArtist": "HORI7ON",
            "normalizedArtist": "hori7on",
            "scopeStatus": "review_required",
            "reviewDecision": "identity_verified_scope_review_required",
            "relationResolution": "cross_border_group_current_management_status_requires_review",
            "sources": [{"sourceId": "award", "sourceType": "broadcast_or_award_roster"}],
            "evidence": [{"sourceId": "award", "url": "https://example.com/hori7on"}],
            "decisionEvidence": [{"source": "fixture", "url": "https://example.com/decision"}],
        },
        {
            "displayArtist": "Known Artist",
            "normalizedArtist": "knownartist",
            "scopeStatus": "unverified",
            "reviewDecision": None,
        },
        {
            "displayArtist": "Lee Sung-kyung",
            "normalizedArtist": "leesungkyung",
            "scopeStatus": "review_required",
            "reviewDecision": "identity_verified_scope_review_required",
            "relationResolution": "cross_domain_actor_singer_identity_scope_not_frozen",
            "sources": [{"sourceId": "provider", "sourceType": "provider_catalog"}],
        },
    ],
}

result = module.build_scope_review_queue(payload)

assert result["scopeReviewCount"] == 2
assert [row["displayArtist"] for row in result["items"]] == [
    "HORI7ON",
    "Lee Sung-kyung",
]
assert all(row["identityStatus"] == "verified" for row in result["items"])
assert all(row["autoPromote"] is False for row in result["items"])
assert result["contract"]["identityVerificationDoesNotImplyScopeEligibility"] is True
assert result["contract"]["scopeDecisionMustBeExplicit"] is True
assert result["contract"]["noImplicitGenreBoundary"] is True

print("artist scope review queue regression: PASS")
