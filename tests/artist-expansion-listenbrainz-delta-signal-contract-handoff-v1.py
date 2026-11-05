import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HANDOFF = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_delta_signal_contract_handoff_v1.json"
RECEIPT = ROOT / "data/fandex-cloud-v10/seed/listenbrainz_full21_distinct_epoch_delta_receipt_v1.json"


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8-sig"))


def main():
    handoff = read_json(HANDOFF)
    receipt = read_json(RECEIPT)

    assert handoff["version"] == "listenbrainz_full21_delta_signal_contract_handoff_v1"
    assert handoff["status"] == "shadow_signal_candidate_requires_second_distinct_interval"

    evidence = handoff["evidence"]
    assert evidence["runId"] == receipt["characterization"]["runId"]
    assert evidence["exactIdentity"] == "21/21"
    assert evidence["newProviderEpoch"] == "21/21"
    assert evidence["positiveRawDelta"] == "21/21"
    assert evidence["negativeRawDelta"] == "0/21"
    assert evidence["rawDeltaSum"] == 306827
    assert evidence["rawDeltaMedian"] == 850

    selected = handoff["selectedPolicy"]
    assert selected["option"] == "retain_raw_cumulative_delta_as_shadow_signal_candidate_only"

    allowed = handoff["authorizedNow"]
    assert all(value is True for value in allowed.values())

    blocked = handoff["notAuthorizedNow"]
    assert all(value is True for value in blocked.values())

    nxt = handoff["requiredNextObservation"]
    assert nxt["code"] == "LISTENBRAINZ_SECOND_DISTINCT_INTERVAL_REQUIRED"
    assert nxt["baselineReceipt"] == "listenbrainz_full21_distinct_epoch_delta_receipt_v1"
    assert len(nxt["requirements"]) == 6

    after = handoff["nextDecisionAfterObservation"]
    assert after["code"] == "LISTENBRAINZ_MULTI_EPOCH_DELTA_STABILITY_DECISION_REQUIRED"

    assert receipt["interpretation"]["rawCumulativeDeltaObservableAsUniformFull21Signal"] is True
    assert receipt["interpretation"]["productionScoreContractEstablished"] is False
    assert receipt["interpretation"]["rateContractEstablished"] is False

    assert all(value is False for value in handoff["safety"].values())

    print(
        "PASS: ListenBrainz delta signal handoff | "
        "raw-delta=SHADOW-CANDIDATE | score=BLOCKED | "
        "next=second-distinct-interval"
    )


if __name__ == "__main__":
    main()
