import csv
import io
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMPARISON = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_lastfm_provider_contract_comparison_v1.json"
LASTFM_SEED = ROOT / "scripts/lastfm-cloud/lastfm_artist_seed_v1.csv"
LASTFM_STATUS = ROOT / "data/lastfm-cloud/lastfm_cloud_status_latest.json"
LASTFM_COMPAT = ROOT / "data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json"
LASTFM_SCORE = ROOT / "scripts/fandex-cloud-migration/source/lastfm_global_interest_score_preview_v1.py"
LASTFM_CLOUD = ROOT / "scripts/lastfm-cloud/lastfm_cloud_history_v1.py"
LASTFM_CONTRACTS = ROOT / "lib/lastfm-signal/contracts.ts"
LISTENBRAINZ_RECEIPT = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_canonical_shadow_receipt_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    comparison = read_json(COMPARISON)
    status = read_json(LASTFM_STATUS)
    compat = read_json(LASTFM_COMPAT)
    receipt = read_json(LISTENBRAINZ_RECEIPT)

    seed_rows = list(csv.DictReader(io.StringIO(LASTFM_SEED.read_text(encoding="utf-8-sig"))))
    seed_ids = {row["canonicalArtistId"] for row in seed_rows}

    assert comparison["version"] == "listenbrainz_lastfm_provider_contract_comparison_v1"
    assert comparison["status"] == "comparison_complete_non_activating"

    assert len(seed_rows) == 19
    assert "v" not in seed_ids
    assert "lisa" not in seed_ids

    assert status["scoreUsage"] == "preview_only_not_master_score"
    assert status["deltaReadyCount"] == 19
    assert status["needsReviewCount"] == 0
    assert status["scorePreviewCount"] == 19
    assert status["masterModified"] is False
    assert status["websiteModified"] is False

    lastfm_compat = compat["sources"]["lastfm"]
    assert set(lastfm_compat["unsupportedCanonicalArtistIds"]) == {"v", "lisa"}
    assert len(lastfm_compat["supportedCanonicalArtistIds"]) == 19

    score_source = LASTFM_SCORE.read_text(encoding="utf-8")
    assert "listenerDeltaPerDay" in score_source
    assert "playcountDeltaPerDay" in score_source
    assert "ln * 0.5" in score_source
    assert "+ pn * 0.5" in score_source
    assert "log_minmax" in score_source

    cloud_source = LASTFM_CLOUD.read_text(encoding="utf-8")
    assert '"method": "artist.getInfo"' in cloud_source
    assert 'stats.get("listeners")' in cloud_source
    assert 'stats.get("playcount")' in cloud_source

    contract_source = LASTFM_CONTRACTS.read_text(encoding="utf-8")
    assert "listeners: number;" in contract_source
    assert "playcount: number;" in contract_source
    assert "listenerDeltaPerDay: number;" in contract_source
    assert "playcountDeltaPerDay: number;" in contract_source

    shadow = receipt["shadow"]
    assert shadow["targetArtistCount"] == 21
    assert shadow["fullyObservedExactIdentityArtistCount"] == 21
    assert shadow["unavailableArtistCount"] == 0
    assert shadow["identityMismatchArtistCount"] == 0
    assert shadow["metric"] == "total_listen_count"
    assert shadow["ranges"] == ["all_time", "month", "week"]
    assert shadow["zeroImputationUsed"] is False

    c = comparison["comparison"]
    assert c["canonicalIdentity"]["compatiblePrinciple"] is True
    assert c["canonicalIdentity"]["equivalentMechanism"] is False
    assert c["cohortCoverage"]["lastfmSupportedCount"] == 19
    assert c["cohortCoverage"]["listenbrainzObservedCount"] == 21
    assert set(c["cohortCoverage"]["listenbrainzAddsCanonicalArtistIds"]) == {"v", "lisa"}
    assert c["rawMetricSchema"]["equivalent"] is False
    assert c["rawMetricSchema"]["commonExactMetricNames"] == []
    assert c["temporalSemantics"]["equivalent"] is False
    assert c["existingScoreFormulaCompatibility"]["compatible"] is False
    assert c["directDropInReplacement"]["allowed"] is False
    assert c["perArtistHybridSubstitution"]["allowed"] is False

    decision = comparison["decision"]
    assert decision["currentLastfmContractCanRemainUnchangedFor19"] is True
    assert decision["vLisaCanBeFilledByListenbrainzUnderCurrentFormula"] is False
    assert decision["full21ListenbrainzReplacementTechnicallyCoverable"] is True
    assert decision["full21ListenbrainzReplacementSemanticallyAuthorized"] is False
    assert decision["hybridOptionRejected"] is True

    assert comparison["nextGate"]["code"] == "FULL21_GLOBAL_INTEREST_PROVIDER_POLICY_DECISION_REQUIRED"
    assert all(value is False for value in comparison["safety"].values())

    print(
        "PASS: Last.fm vs ListenBrainz contract comparison | "
        "coverage=19_vs_21 | raw-schema=NON_EQUIVALENT | "
        "drop-in=FALSE | hybrid=FALSE | "
        "next=provider-policy-decision"
    )


if __name__ == "__main__":
    main()
