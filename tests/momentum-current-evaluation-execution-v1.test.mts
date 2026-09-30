import assert from 'node:assert/strict';
import test from 'node:test';

import {
  executeFandexMomentumCurrentEvaluation,
} from '../lib/intelligence/fandexMomentumCurrentEvaluationExecution';
import type {
  MomentumCurrentDualSourceEvaluationEvidence,
} from '../lib/intelligence/fandexMomentumCategoricalOutputAttestation';
import type {
  MomentumCarrierTail,
} from '../lib/intelligence/fandexMomentumCarrierPersistenceDecision';

const CARRIER: MomentumCarrierTail = Object.freeze({
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

function evidence(
  overrides: Partial<
    MomentumCurrentDualSourceEvaluationEvidence
  > = {},
): MomentumCurrentDualSourceEvaluationEvidence {
  return {
    contractVersion:
      'momentum-current-dual-source-categorical-evaluation-evidence-v1',
    evaluatedAgainstMain:
      '79ac55100ec4b64be8eeb234dc0fa9b617960303',
    evaluationHead:
      '1111111111111111111111111111111111111111',
    workflowRunId: 36730000000,
    workflowJobId: 109930000000,
    evaluatedAt: '2026-09-30T13:50:00.000Z',
    canonicalArtistId: 'iu',
    latestNaverStoredEvidence: {
      throughSlotStart: '2026-09-30T13:00:00.000Z',
      jobId:
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      collectionKey: 'sched-current-iu',
      exactOfficialProtocol: true,
      seriesStatus: 'available',
      expectedSlotCount: 300,
      reproducedSnapshotCount: 300,
    },
    categoricalEvaluation: {
      state: 'current-categorical-evaluation',
      alignmentCutoffAt: '2026-09-30T02:10:05.000Z',
      directionalConsensus: 'direction-conflicted',
      persistenceConsensus: 'persistence-not-applicable',
      qualitativeDirectionEvidenceUsable: false,
      productMomentumScore: null,
      digest:
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    },
    decision: {
      classification:
        'attested-no-op-cutoff-advanced-same-state',
      currentDualSourceCategoricalEvaluationPerformed: true,
      currentNaverStoredEvidenceReproducedForReadiness: true,
      newHistoryObservationRequired: false,
      attestedNoOp: true,
    },
    safety: {
      databaseMode: 'read-only',
      databaseWrites: 0,
      productMetricReads: 0,
      productMetricWrites: 0,
      previewFallbackReads: 0,
      registryMutations: 0,
      productionActivations: 0,
    },
    ...overrides,
  } as MomentumCurrentDualSourceEvaluationEvidence;
}

test('executes advanced-cutoff same-state as no-op with zero writes', () => {
  const result = executeFandexMomentumCurrentEvaluation({
    currentCarrier: CARRIER,
    evaluationEvidence: evidence(),
  });

  assert.equal(result.state, 'attested-no-op');
  if (result.state !== 'attested-no-op') return;

  assert.equal(result.persistenceDecision.appendRequired, false);
  assert.equal(
    result.persistenceDecision.classification,
    'attested-no-op-cutoff-advanced-same-state',
  );
  assert.equal(result.safety.historyWritePerformed, false);
  assert.equal(result.safety.databaseWrites, 0);
  assert.equal(result.safety.productMetricReads, 0);
  assert.equal(result.safety.previewFallbackReads, 0);
});

test('executes advanced-cutoff direction change as V2 append candidate only', () => {
  const current = evidence();
  const result = executeFandexMomentumCurrentEvaluation({
    currentCarrier: CARRIER,
    evaluationEvidence: evidence({
      categoricalEvaluation: {
        ...current.categoricalEvaluation,
        directionalConsensus: 'flat-corroborated',
      },
      decision: {
        ...current.decision,
        classification: 'new-carrier-direction-state-changed',
        newHistoryObservationRequired: true,
        attestedNoOp: false,
      },
    }),
  });

  assert.equal(result.state, 'append-v2-carrier-candidate');
  if (result.state !== 'append-v2-carrier-candidate') return;

  assert.equal(result.persistenceDecision.appendRequired, true);
  assert.equal(
    result.persistenceDecision.targetHistoryContractVersion,
    'v147_fandex_momentum_unified_history_research_v2',
  );
  assert.equal(result.persistenceDecision.changeKind, 'direction-state-changed');
  assert.equal(result.safety.historyWritePerformed, false);
  assert.equal(result.safety.databaseWrites, 0);
});

test('fails closed before persistence when NAVER Stored Evidence is incomplete', () => {
  const current = evidence();
  const result = executeFandexMomentumCurrentEvaluation({
    currentCarrier: CARRIER,
    evaluationEvidence: evidence({
      latestNaverStoredEvidence: {
        ...current.latestNaverStoredEvidence,
        reproducedSnapshotCount: 299,
      },
    }),
  });

  assert.deepEqual(result, {
    contractVersion: 'momentum-current-evaluation-execution-v1',
    state: 'blocked',
    stage: 'categorical-attestation',
    reason: 'naver-stored-evidence-invalid',
    safety: {
      databaseMode: 'read-only',
      databaseWrites: 0,
      historyWritePerformed: false,
      productMetricReads: 0,
      productMetricWrites: 0,
      previewFallbackReads: 0,
      registryMutations: 0,
      productionActivations: 0,
    },
  });
});

test('fails closed at persistence when artist identity mismatches carrier', () => {
  const result = executeFandexMomentumCurrentEvaluation({
    currentCarrier: CARRIER,
    evaluationEvidence: evidence({
      canonicalArtistId: 'different-artist',
    }),
  });

  assert.equal(result.state, 'blocked');
  if (result.state !== 'blocked') return;
  assert.equal(result.stage, 'carrier-persistence-decision');
  assert.equal(result.reason, 'artist-identity-mismatch');
});

test('fails closed when evaluation classification does not match actual transition', () => {
  const current = evidence();
  const result = executeFandexMomentumCurrentEvaluation({
    currentCarrier: CARRIER,
    evaluationEvidence: evidence({
      decision: {
        ...current.decision,
        classification: 'new-carrier-direction-state-changed',
        newHistoryObservationRequired: true,
        attestedNoOp: false,
      },
    }),
  });

  assert.equal(result.state, 'blocked');
  if (result.state !== 'blocked') return;
  assert.equal(result.stage, 'carrier-persistence-decision');
  assert.equal(result.reason, 'classification-carrier-state-mismatch');
});
