from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts/artist-expansion/artist_scope_deferred_queue_v1.py"

spec = importlib.util.spec_from_file_location("scope_deferred_queue", SCRIPT)
assert spec and spec.loader
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


payload = {
    "version": "artist_universe_multisource_discovery_v1",
    "candidates": [
        {
            "displayArtist": "CIIU",
            "normalizedArtist": "ciiu",
            "scopeStatus": "deferred",
            "scopeDecision": "deferred",
            "scopeBasis": "localized_china_identity_without_verified_kr_market_or_explicit_kpop_evidence",
            "scopeRecheckTrigger": "verified_korean_market_music_activity_or_explicit_official_kpop_classification",
            "reviewDecision": "identity_verified_scope_deferred",
            "relationResolution": "localized_china_group_scope_deferred_pending_kr_or_kpop_evidence",
            "sources": [{"sourceId": "jyp", "sourceType": "agency_roster"}],
        },
        {
            "displayArtist": "Scope Pending",
            "normalizedArtist": "scopepending",
            "scopeStatus": "review_required",
            "scopeDecision": None,
        },
        {
            "displayArtist": "Eligible Artist",
            "normalizedArtist": "eligible",
            "scopeStatus": "eligible",
            "scopeDecision": "eligible",
        },
    ],
}

result = module.build_scope_deferred_queue(payload)

assert result["scopeDeferredCount"] == 1
assert [row["displayArtist"] for row in result["items"]] == ["CIIU"]
assert result["items"][0]["scopeStatus"] == "deferred"
assert result["items"][0]["autoPromote"] is False
assert result["contract"]["deferredIsNotExcluded"] is True
assert result["contract"]["deferredIsNotEligible"] is True
assert result["contract"]["recheckTriggerRequired"] is True

bad = {
    "version": "artist_universe_multisource_discovery_v1",
    "candidates": [
        {
            "displayArtist": "Broken Deferred",
            "normalizedArtist": "brokendeferred",
            "scopeStatus": "deferred",
            "scopeDecision": "deferred",
        }
    ],
}
try:
    module.build_scope_deferred_queue(bad)
except RuntimeError as exc:
    assert "missing recheck trigger" in str(exc)
else:
    raise AssertionError("deferred scope must require a recheck trigger")

print("artist scope deferred queue regression: PASS")
