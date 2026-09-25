from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/artist_onboarding_blocker_queue_v1.py"

spec = importlib.util.spec_from_file_location("onboarding_queue", SCRIPT)
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
            "scopeBasis": "official_kpop_award_roster",
            "onboardingBlocker": "current_management_unresolved_after_contract_termination",
            "reviewDecision": "identity_verified_scope_eligible_onboarding_blocked",
            "relationResolution": "cross_border_group_scope_verified_current_management_unresolved",
            "sources": [{"sourceId": "award", "sourceType": "broadcast_or_award_roster"}],
        },
        {
            "displayArtist": "SECHSKIES",
            "normalizedArtist": "sechskies",
            "scopeStatus": "eligible",
            "scopeDecision": "eligible",
            "scopeBasis": "official_debuted_kpop_group",
            "onboardingBlocker": "current_group_activity_and_tracking_tier_unresolved",
            "reviewDecision": "identity_verified_scope_eligible_onboarding_blocked",
            "relationResolution": "legacy_group_scope_verified_current_activity_unresolved",
        },
        {
            "displayArtist": "Lee Sung-kyung",
            "normalizedArtist": "leesungkyung",
            "scopeStatus": "eligible",
            "scopeDecision": "eligible",
            "scopeBasis": "official_music_discography_registration",
            "onboardingBlocker": "cross_domain_entity_representation_unresolved",
            "reviewDecision": "identity_verified_scope_eligible_onboarding_blocked",
            "relationResolution": "cross_domain_actor_singer_scope_verified_representation_review",
        },
        {
            "displayArtist": "Ready Artist",
            "normalizedArtist": "readyartist",
            "scopeStatus": "eligible",
            "scopeDecision": "eligible",
            "onboardingBlocker": None,
        },
        {
            "displayArtist": "Scope Pending",
            "normalizedArtist": "scopepending",
            "scopeStatus": "review_required",
            "onboardingBlocker": "must_not_leak_into_onboarding_queue",
        },
    ],
}

result = module.build_onboarding_blocker_queue(payload)

assert result["onboardingBlockerCount"] == 3
assert [row["displayArtist"] for row in result["items"]] == [
    "HORI7ON",
    "Lee Sung-kyung",
    "SECHSKIES",
]
assert all(row["scopeStatus"] == "eligible" for row in result["items"])
assert all(row["onboardingStatus"] == "blocked" for row in result["items"])
assert all(row["autoPromote"] is False for row in result["items"])
assert result["contract"]["scopeEligibilityDoesNotImplyOnboarding"] is True
assert result["contract"]["productionActivationSeparate"] is True

print("artist onboarding blocker queue regression: PASS")
