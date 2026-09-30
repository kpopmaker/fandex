import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  executeFandexMomentumCurrentEvaluation,
} from '../lib/intelligence/fandexMomentumCurrentEvaluationExecution';
import {
  buildFandexMomentumV2CarrierRecordCandidate,
} from '../lib/intelligence/fandexMomentumV2CarrierRecordCandidate';
import type {
  MomentumCurrentDualSourceEvaluationEvidence,
} from '../lib/intelligence/fandexMomentumCategoricalOutputAttestation';
import type {
  MomentumCarrierTail,
} from '../lib/intelligence/fandexMomentumCarrierPersistenceDecision';
import {
  parseMomentumEvidenceConsensusHistory,
  readMomentumEvidenceConsensusShadowProductFromJsonl,
} from '../lib/server/ingestion/momentumEvidenceConsensusRepository';

const HISTORY_URL = new URL(
  '../data/momentum-product/iu_momentum_evidence_consensus_v147.jsonl',
  import.meta.url,
);

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

function appendEvidence(): MomentumCurrentDualSourceEvaluationEvidence {
  return Object.freeze({
    contractVersion:
      'momentum-current-dual-source-categorical-evaluation-evidence-v1',
    evaluatedAgainstMain:
      '79ac55100ec4b64be8eeb234dc0fa9b617960303',
    evaluationHead:
      '1111111111111111111111111111111111111111',
    workflowRunId: 36730000000,
    workflowJobId: 109930000000,
    evaluatedAt: '2026-09-30T14:10:00.000Z',
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
      alignmentCutoffAt: '2026-09-30T02:10:05.000Z',
      directionalConsensus: 'flat-corroborated',
      persistenceConsensus: 'persistence-not-applicable',
      qualitativeDirectionEvidenceUsable: true,
      productMomentumScore: null,
      digest:
        'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    }),
    decision: Object.freeze({
      classification: 'new-carrier-direction-state-changed',
      currentDualSourceCategoricalEvaluationPerformed: true,
      currentNaverStoredEvidenceReproducedForReadiness: true,
      newHistoryObservationRequired: true,
      attestedNoOp: false,
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

test('builds deterministic V2 record candidate that validates when appended in memory', async () => {
  const execution = executeFandexMomentumCurrentEvaluation({
    currentCarrier: CARRIER,
    evaluationEvidence: appendEvidence(),
  });
  assert.equal(execution.state, 'append-v2-carrier-candidate');

  const first = buildFandexMomentumV2CarrierRecordCandidate({
    execution,
    sequence: 3,
    recordedAt: '2026-09-30T14:10:00.000Z',
  });
  const second = buildFandexMomentumV2CarrierRecordCandidate({
    execution,
    sequence: 3,
    recordedAt: '2026-09-30T14:10:00.000Z',
  });

  assert.equal(first.state, 'record-candidate');
  assert.deepEqual(second, first);
  if (first.state !== 'record-candidate') return;

  assert.equal(
    first.record.contractVersion,
    'v147_fandex_momentum_unified_history_research_v2',
  );
  assert.equal(first.record.sourceV143Digest, null);
  assert.equal(
    first.record.sourceAttestationContractVersion,
    'momentum-categorical-output-attestation-v1',
  );
  assert.equal(first.record.changeKind, 'direction-state-changed');
  assert.equal(first.record.sequence, 3);
  assert.equal(first.record.previousRecordDigest, CARRIER.carrierRecordId);
  assert.equal(
    first.record.previousSourceDigest,
    CARRIER.sourceLineage.sourceDigest,
  );
  assert.equal(first.safety.historyWritePerformed, false);
  assert.equal(first.safety.databaseWrites, 0);

  const currentHistory = (await readFile(HISTORY_URL, 'utf8')).trimEnd();
  const candidateHistory =
    currentHistory + '\n' + JSON.stringify(first.record) + '\n';

  const parsed = parseMomentumEvidenceConsensusHistory(candidateHistory);
  assert.equal(parsed.length, 3);
  assert.equal(parsed[2].recordDigest, first.record.recordDigest);

  const product = readMomentumEvidenceConsensusShadowProductFromJsonl({
    artistId: 'iu',
    jsonl: candidateHistory,
  });
  assert.equal(product.status, 'ok');
  if (product.status !== 'ok') return;

  assert.equal(
    product.model.evidence.directionalConsensus,
    'flat-corroborated',
  );
  assert.equal(product.model.storedEvidenceTrace.sourceV143Digest, null);
  assert.equal(product.model.productMetricReadPerformed, false);
  assert.equal(product.model.previewFallbackUsed, false);
});

test('no-op execution never yields a record candidate', () => {
  const current = appendEvidence();
  const execution = executeFandexMomentumCurrentEvaluation({
    currentCarrier: CARRIER,
    evaluationEvidence: {
      ...current,
      categoricalEvaluation: {
        ...current.categoricalEvaluation,
        directionalConsensus: CARRIER.directionalConsensus,
        qualitativeDirectionEvidenceUsable: false,
      },
      decision: {
        ...current.decision,
        classification: 'attested-no-op-cutoff-advanced-same-state',
        newHistoryObservationRequired: false,
        attestedNoOp: true,
      },
    },
  });

  assert.equal(execution.state, 'attested-no-op');

  const result = buildFandexMomentumV2CarrierRecordCandidate({
    execution,
    sequence: 3,
    recordedAt: '2026-09-30T14:10:00.000Z',
  });

  assert.deepEqual(result, {
    contractVersion: 'momentum-v2-carrier-record-candidate-v1',
    state: 'blocked',
    reason: 'execution-not-append-candidate',
    safety: {
      historyWritePerformed: false,
      databaseWrites: 0,
      productMetricReads: 0,
      productMetricWrites: 0,
      previewFallbackReads: 0,
    },
  });
});

test('blocked execution never yields a record candidate', () => {
  const current = appendEvidence();
  const execution = executeFandexMomentumCurrentEvaluation({
    currentCarrier: CARRIER,
    evaluationEvidence: {
      ...current,
      latestNaverStoredEvidence: {
        ...current.latestNaverStoredEvidence,
        reproducedSnapshotCount: 299,
      },
    },
  });

  assert.equal(execution.state, 'blocked');

  const result = buildFandexMomentumV2CarrierRecordCandidate({
    execution,
    sequence: 3,
    recordedAt: '2026-09-30T14:10:00.000Z',
  });

  assert.equal(result.state, 'blocked');
  if (result.state !== 'blocked') return;
  assert.equal(result.reason, 'execution-not-append-candidate');
});

test('candidate sequence and recordedAt are validated before construction', () => {
  const execution = executeFandexMomentumCurrentEvaluation({
    currentCarrier: CARRIER,
    evaluationEvidence: appendEvidence(),
  });
  assert.equal(execution.state, 'append-v2-carrier-candidate');

  const badSequence = buildFandexMomentumV2CarrierRecordCandidate({
    execution,
    sequence: 1,
    recordedAt: '2026-09-30T14:10:00.000Z',
  });
  assert.equal(badSequence.state, 'blocked');
  if (badSequence.state === 'blocked') {
    assert.equal(badSequence.reason, 'sequence-invalid');
  }

  const beforeObservation = buildFandexMomentumV2CarrierRecordCandidate({
    execution,
    sequence: 3,
    recordedAt: '2026-09-29T14:10:00.000Z',
  });
  assert.equal(beforeObservation.state, 'blocked');
  if (beforeObservation.state === 'blocked') {
    assert.equal(beforeObservation.reason, 'recorded-before-observation');
  }
});
