import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFandexMomentumCategoricalOutputAttestation,
  type MomentumCurrentDualSourceEvaluationEvidence,
} from '../lib/intelligence/fandexMomentumCategoricalOutputAttestation';
import {
  decideFandexMomentumCarrierPersistence,
  type MomentumCarrierTail,
} from '../lib/intelligence/fandexMomentumCarrierPersistenceDecision';

const CURRENT_CARRIER: MomentumCarrierTail = Object.freeze({
  canonicalArtistId: 'iu',
  carrierRecordId:
    '6bf29ed2e15a4c374f9985279e5d60e44eab404371fd807b62adad1bebf6cadd',
  alignmentCutoffAt: '2026-09-20T01:59:13.000Z',
  directionalConsensus: 'direction-conflicted',
  persistenceConsensus: 'persistence-not-applicable',
  sourceLineage: Object.freeze({
    kind: 'legacy-v143' as const,
    sourceContractVersion:
      'v143_fandex_momentum_output_form_eligibility_research_v1' as const,
    sourceDigest:
      '87edf2884c2f35a3a5819349ebb374012926f103fdeb3d41af10da59ca68de7a',
  }),
});

type Classification =
  MomentumCurrentDualSourceEvaluationEvidence['decision']['classification'];

function evidence(
  input: Readonly<{
    cutoff: string;
    direction:
      MomentumCurrentDualSourceEvaluationEvidence[
        'categoricalEvaluation'
      ]['directionalConsensus'];
    persistence:
      MomentumCurrentDualSourceEvaluationEvidence[
        'categoricalEvaluation'
      ]['persistenceConsensus'];
    classification: Classification;
    newHistoryObservationRequired: boolean;
    attestedNoOp: boolean;
  }>,
): MomentumCurrentDualSourceEvaluationEvidence {
  return Object.freeze({
    contractVersion:
      'momentum-current-dual-source-categorical-evaluation-evidence-v1',
    evaluatedAgainstMain:
      '352b4d88ee8111ce4b4867604b4093285d8814f6',
    evaluationHead:
      '1111111111111111111111111111111111111111',
    workflowRunId: 36700000001,
    workflowJobId: 109000000001,
    evaluatedAt: '2026-09-30T13:30:00.000Z',
    canonicalArtistId: 'iu',
    latestNaverStoredEvidence: Object.freeze({
      throughSlotStart: '2026-09-30T13:00:00.000Z',
      jobId:
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      collectionKey: 'sched-current-iu',
      exactOfficialProtocol: true,
      seriesStatus: 'available',
      expectedSlotCount: 300,
      reproducedSnapshotCount: 300,
    }),
    categoricalEvaluation: Object.freeze({
      state: 'current-categorical-evaluation',
      alignmentCutoffAt: input.cutoff,
      directionalConsensus: input.direction,
      persistenceConsensus: input.persistence,
      qualitativeDirectionEvidenceUsable: false,
      productMomentumScore: null,
      digest:
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    }),
    decision: Object.freeze({
      classification: input.classification,
      currentDualSourceCategoricalEvaluationPerformed: true,
      currentNaverStoredEvidenceReproducedForReadiness: true,
      newHistoryObservationRequired:
        input.newHistoryObservationRequired,
      attestedNoOp: input.attestedNoOp,
    }),
    safety: Object.freeze({
      databaseMode: 'read-only',
      databaseWrites: 0,
      productMetricReads: 0,
      productMetricWrites: 0,
      previewFallbackReads: 0,
      registryMutations: 0,
      productionActivations: 0,
    }),
  });
}

test('cutoff advance with unchanged categorical state is attested no-op', () => {
  const attestation = buildFandexMomentumCategoricalOutputAttestation(
    evidence({
      cutoff: '2026-09-27T02:10:05.000Z',
      direction: 'direction-conflicted',
      persistence: 'persistence-not-applicable',
      classification:
        'attested-no-op-cutoff-advanced-same-state',
      newHistoryObservationRequired: false,
      attestedNoOp: true,
    }),
  );

  const result = decideFandexMomentumCarrierPersistence({
    currentCarrier: CURRENT_CARRIER,
    attestation,
  });

  assert.equal(result.state, 'attested-no-op');
  if (result.state !== 'attested-no-op') return;
  assert.equal(result.appendRequired, false);
  assert.equal(
    result.classification,
    'attested-no-op-cutoff-advanced-same-state',
  );
  assert.equal(result.currentCarrierRecordId, CURRENT_CARRIER.carrierRecordId);
  assert.equal(result.safety.historyWritePerformed, false);
  assert.equal(result.safety.databaseWrites, 0);
  assert.equal(result.safety.productMomentumScore, null);
});

test('same cutoff and same categorical state is attested no-op', () => {
  const attestation = buildFandexMomentumCategoricalOutputAttestation(
    evidence({
      cutoff: CURRENT_CARRIER.alignmentCutoffAt,
      direction: CURRENT_CARRIER.directionalConsensus,
      persistence: CURRENT_CARRIER.persistenceConsensus,
      classification: 'attested-no-op-same-cutoff-same-state',
      newHistoryObservationRequired: false,
      attestedNoOp: true,
    }),
  );

  const result = decideFandexMomentumCarrierPersistence({
    currentCarrier: CURRENT_CARRIER,
    attestation,
  });

  assert.equal(result.state, 'attested-no-op');
  if (result.state !== 'attested-no-op') return;
  assert.equal(result.appendRequired, false);
});

test('advanced cutoff plus direction-state change yields v2 append candidate', () => {
  const attestation = buildFandexMomentumCategoricalOutputAttestation(
    evidence({
      cutoff: '2026-09-30T02:10:05.000Z',
      direction: 'flat-corroborated',
      persistence: CURRENT_CARRIER.persistenceConsensus,
      classification: 'new-carrier-direction-state-changed',
      newHistoryObservationRequired: true,
      attestedNoOp: false,
    }),
  );

  const result = decideFandexMomentumCarrierPersistence({
    currentCarrier: CURRENT_CARRIER,
    attestation,
  });

  assert.equal(result.state, 'append-v2-carrier-candidate');
  if (result.state !== 'append-v2-carrier-candidate') return;

  assert.equal(result.appendRequired, true);
  assert.equal(
    result.targetHistoryContractVersion,
    'v147_fandex_momentum_unified_history_research_v2',
  );
  assert.equal(result.changeKind, 'direction-state-changed');
  assert.equal(
    result.previousRecordDigest,
    CURRENT_CARRIER.carrierRecordId,
  );
  assert.equal(
    result.previousSourceDigest,
    CURRENT_CARRIER.sourceLineage.sourceDigest,
  );
  assert.equal(result.nextDirectionalConsensus, 'flat-corroborated');
  assert.equal(result.safety.historyWritePerformed, false);
  assert.equal(result.safety.databaseWrites, 0);
  assert.equal(result.safety.productMomentumScore, null);
  assert.equal(result.safety.numericProductEligible, false);
});

test('advanced cutoff plus both state changes yields v2 append candidate', () => {
  const attestation = buildFandexMomentumCategoricalOutputAttestation(
    evidence({
      cutoff: '2026-09-30T02:10:05.000Z',
      direction: 'direction-corroborated-up',
      persistence: 'one-direction-repeated',
      classification:
        'new-carrier-direction-and-persistence-changed',
      newHistoryObservationRequired: true,
      attestedNoOp: false,
    }),
  );

  const result = decideFandexMomentumCarrierPersistence({
    currentCarrier: CURRENT_CARRIER,
    attestation,
  });

  assert.equal(result.state, 'append-v2-carrier-candidate');
  if (result.state !== 'append-v2-carrier-candidate') return;
  assert.equal(result.changeKind, 'direction-and-persistence-changed');
});

test('same-cutoff state change is revision review, never a new observation', () => {
  const attestation = buildFandexMomentumCategoricalOutputAttestation(
    evidence({
      cutoff: CURRENT_CARRIER.alignmentCutoffAt,
      direction: 'flat-corroborated',
      persistence: CURRENT_CARRIER.persistenceConsensus,
      classification: 'new-carrier-direction-state-changed',
      newHistoryObservationRequired: true,
      attestedNoOp: false,
    }),
  );

  const result = decideFandexMomentumCarrierPersistence({
    currentCarrier: CURRENT_CARRIER,
    attestation,
  });

  assert.deepEqual(result, {
    contractVersion: 'momentum-carrier-persistence-decision-v1',
    state: 'blocked',
    reason: 'same-cutoff-state-change-revision-review-required',
    appendRequired: false,
    safety: {
      productMomentumScore: null,
      numericProductEligible: false,
      previewFallbackAllowed: false,
      historyWritePerformed: false,
      databaseWrites: 0,
    },
  });
});

test('alignment regression fails closed', () => {
  const attestation = buildFandexMomentumCategoricalOutputAttestation(
    evidence({
      cutoff: '2026-09-19T01:59:13.000Z',
      direction: 'flat-corroborated',
      persistence: CURRENT_CARRIER.persistenceConsensus,
      classification: 'new-carrier-direction-state-changed',
      newHistoryObservationRequired: true,
      attestedNoOp: false,
    }),
  );

  const result = decideFandexMomentumCarrierPersistence({
    currentCarrier: CURRENT_CARRIER,
    attestation,
  });

  assert.equal(result.state, 'blocked');
  if (result.state !== 'blocked') return;
  assert.equal(result.reason, 'alignment-regression');
});

test('attestation classification must match actual carrier transition', () => {
  const attestation = buildFandexMomentumCategoricalOutputAttestation(
    evidence({
      cutoff: '2026-09-30T02:10:05.000Z',
      direction: CURRENT_CARRIER.directionalConsensus,
      persistence: CURRENT_CARRIER.persistenceConsensus,
      classification: 'new-carrier-direction-state-changed',
      newHistoryObservationRequired: true,
      attestedNoOp: false,
    }),
  );

  const result = decideFandexMomentumCarrierPersistence({
    currentCarrier: CURRENT_CARRIER,
    attestation,
  });

  assert.equal(result.state, 'blocked');
  if (result.state !== 'blocked') return;
  assert.equal(result.reason, 'classification-carrier-state-mismatch');
});

test('tampered attestation digest fails closed', () => {
  const valid = buildFandexMomentumCategoricalOutputAttestation(
    evidence({
      cutoff: '2026-09-27T02:10:05.000Z',
      direction: CURRENT_CARRIER.directionalConsensus,
      persistence: CURRENT_CARRIER.persistenceConsensus,
      classification:
        'attested-no-op-cutoff-advanced-same-state',
      newHistoryObservationRequired: false,
      attestedNoOp: true,
    }),
  );

  const result = decideFandexMomentumCarrierPersistence({
    currentCarrier: CURRENT_CARRIER,
    attestation: {
      ...valid,
      attestationDigest:
        'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
    },
  });

  assert.equal(result.state, 'blocked');
  if (result.state !== 'blocked') return;
  assert.equal(result.reason, 'attestation-invalid');
});
