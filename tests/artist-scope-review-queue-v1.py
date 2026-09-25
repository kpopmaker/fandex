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
            "scopeStatus": "eligible",
            "scopeDecision": "eligible",
            "onboardingBlocker": "current_management_unresolved_after_contract_termination",
            "reviewDecision": "identity_verified_scope_eligible_onboarding_blocked",
            "relationResolution": "cross_border_group_scope_verified_current_management_unresolved",
        },
        {
            "displayArtist": "SECHSKIES",
            "normalizedArtist": "sechskies",
            "scopeStatus": "eligible",
            "scopeDecision": "eligible",
            "onboardingBlocker": "current_group_activity_and_tracking_tier_unresolved",
            "reviewDecision": "identity_verified_scope_eligible_onboarding_blocked",
            "relationResolution": "legacy_group_scope_verified_current_activity_unresolved",
        },
        {
            "displayArtist": "Lee Sung-kyung",
            "normalizedArtist": "leesungkyung",
            "scopeStatus": "eligible",
            "scopeDecision": "eligible",
            "onboardingBlocker": "cross_domain_entity_representation_unresolved",
            "reviewDecision": "identity_verified_scope_eligible_onboarding_blocked",
            "relationResolution": "cross_domain_actor_singer_scope_verified_representation_review",
        },
        {
            "displayArtist": "CIIU",
            "normalizedArtist": "ciiu",
            "scopeStatus": "deferred",
            "scopeDecision": "deferred",
            "reviewDecision": "identity_verified_scope_deferred",
            "relationResolution": "localized_china_group_scope_deferred_pending_kr_or_kpop_evidence",
            "scopeRecheckTrigger": "verified_korean_market_music_activity_or_explicit_official_kpop_classification",
        },
        {
            "displayArtist": "Scope Pending",
            "normalizedArtist": "scopepending",
            "scopeStatus": "review_required",
            "reviewDecision": "identity_verified_scope_review_required",
            "relationResolution": "scope_not_yet_frozen",
            "sources": [{"sourceId": "fixture", "sourceType": "provider_catalog"}],
        },
    ],
}

result = module.build_scope_review_queue(payload)

assert result["scopeReviewCount"] == 1
assert [row["displayArtist"] for row in result["items"]] == ["Scope Pending"]
assert result["items"][0]["scopeStatus"] == "review_required"
assert result["items"][0]["autoPromote"] is False
assert result["contract"]["identityVerificationDoesNotImplyScopeEligibility"] is True
assert result["contract"]["scopeDecisionMustBeExplicit"] is True
assert result["contract"]["noImplicitGenreBoundary"] is True

print("artist scope review queue regression: PASS")
