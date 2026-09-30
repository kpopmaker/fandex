import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION,
  buildFandexMomentumCategoricalOutputAttestation,
  type MomentumCurrentDualSourceEvaluationEvidence,
} from '../lib/intelligence/fandexMomentumCategoricalOutputAttestation';

const BASE_EVIDENCE: MomentumCurrentDualSourceEvaluationEvidence = Object.freeze({
  contractVersion:
    'momentum-current-dual-source-categorical-evaluation-evidence-v1',
  evaluatedAgainstMain: '8c766ce1c4706941cf16472b0a861dcdc4e6a497',
  evaluationHead: '0c9d0140bf61180510dce720cfaea8809d160279',
  workflowRunId: 36290882671,
  workflowJobId: 108540600155,
  evaluatedAt: '2026-09-27T03:16:07.048Z',
  canonicalArtistId: 'iu',
  latestNaverStoredEvidence: Object.freeze({
    throughSlotStart: '2026-09-27T03:00:00.000Z',
    jobId:
      '362b77504d31b89d9f9a5b66a1216c6adb59be376b2ae811d664f351929677f2',
    collectionKey:
      'sched-v125-naver-news-20260927t030000z-f1ed381d367d',
    exactOfficialProtocol: true,
    seriesStatus: 'available',
    expectedSlotCount: 276,
    reproducedSnapshotCount: 276,
  }),
  categoricalEvaluation: Object.freeze({
    state: 'cross-family-direction-conflicted',
    alignmentCutoffAt: '2026-09-27T02:10:05.000Z',
    directionalConsensus: 'direction-conflicted',
    persistenceConsensus: 'persistence-not-applicable',
    qualitativeDirectionEvidenceUsable: false,
    productMomentumScore: null,
    digest:
      '3ac534dd6afc2e75f534cf4bc98ce6fb33fdd22e081eaae9aedcf97a90fd6721',
  }),
  decision: Object.freeze({
    classification: 'attested-no-op-cutoff-advanced-same-state',
    currentDualSourceCategoricalEvaluationPerformed: true,
    currentNaverStoredEvidenceReproducedForReadiness: true,
    newHistoryObservationRequired: false,
    attestedNoOp: true,
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

test('builds preview-independent categorical source attestation without v143 reuse', () => {
  const result =
    buildFandexMomentumCategoricalOutputAttestation(BASE_EVIDENCE);

  assert.equal(
    result.contractVersion,
    FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION,
  );
  assert.deepEqual(result.sourceLineage, {
    kind: 'preview-independent-v142-current-evaluation',
    sourceContractVersion:
      'v142_fandex_momentum_cross_family_combination_research_v1',
    sourceV142Digest:
      '3ac534dd6afc2e75f534cf4bc98ce6fb33fdd22e081eaae9aedcf97a90fd6721',
    legacySourceV143Required: false,
    legacySourceV143Digest: null,
  });
  assert.equal(
    result.carrierLineageEligibility.sourceContractField,
    'sourceAttestationContractVersion',
  );
  assert.equal(
    result.carrierLineageEligibility.sourceDigestField,
    'sourceAttestationDigest',
  );
  assert.equal(
    result.carrierLineageEligibility.existingSourceV143FieldMustNotBeReused,
    true,
  );
  assert.equal(result.categoricalOutput.productMomentumScore, null);
  assert.match(result.attestationDigest, /^[0-9a-f]{64}$/);
});

test('attestation binds exact NAVER Stored Evidence and evaluation identity', () => {
  const result =
    buildFandexMomentumCategoricalOutputAttestation(BASE_EVIDENCE);

  assert.equal(
    result.evaluationEvidence.latestNaverThroughSlotStart,
    BASE_EVIDENCE.latestNaverStoredEvidence.throughSlotStart,
  );
  assert.equal(
    result.evaluationEvidence.latestNaverJobId,
    BASE_EVIDENCE.latestNaverStoredEvidence.jobId,
  );
  assert.equal(
    result.evaluationEvidence.evaluationClassification,
    'attested-no-op-cutoff-advanced-same-state',
  );
  assert.match(
    result.evaluationEvidence.evaluationEvidenceDigest,
    /^[0-9a-f]{64}$/,
  );
});


test('obsolete cutoff-advanced same-state append classification fails closed', () => {
  const tampered = {
    ...BASE_EVIDENCE,
    decision: {
      ...BASE_EVIDENCE.decision,
      classification: 'new-carrier-cutoff-advanced-same-state',
      newHistoryObservationRequired: true,
      attestedNoOp: false,
    },
  } as unknown as MomentumCurrentDualSourceEvaluationEvidence;

  assert.throws(
    () => buildFandexMomentumCategoricalOutputAttestation(tampered),
    /momentum_categorical_attestation_decision_invalid/,
  );
});

test('Product/Preview access fails closed', () => {
  const tampered: MomentumCurrentDualSourceEvaluationEvidence = {
    ...BASE_EVIDENCE,
    safety: {
      ...BASE_EVIDENCE.safety,
      previewFallbackReads: 1,
    },
  };

  assert.throws(
    () => buildFandexMomentumCategoricalOutputAttestation(tampered),
    /momentum_categorical_attestation_isolation_invalid/,
  );
});

test('incomplete NAVER Stored Evidence reproduction fails closed', () => {
  const tampered: MomentumCurrentDualSourceEvaluationEvidence = {
    ...BASE_EVIDENCE,
    latestNaverStoredEvidence: {
      ...BASE_EVIDENCE.latestNaverStoredEvidence,
      reproducedSnapshotCount:
        BASE_EVIDENCE.latestNaverStoredEvidence.expectedSlotCount - 1,
    },
  };

  assert.throws(
    () => buildFandexMomentumCategoricalOutputAttestation(tampered),
    /momentum_categorical_attestation_naver_evidence_invalid/,
  );
});

test('implementation has no legacy Product score or preview dependency', async () => {
  const source = await readFile(
    new URL(
      '../lib/intelligence/fandexMomentumCategoricalOutputAttestation.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(source, /fandexMomentumOutputFormEligibilityResearch/);
  assert.doesNotMatch(source, /metricScoringPipeline/);
  assert.doesNotMatch(source, /artistMonthlyMetricSeed/);
  assert.doesNotMatch(source, /getResolvedMetricScore/);
  assert.doesNotMatch(source, /preview-seed/);
  assert.doesNotMatch(source, /sourceV143Digest:\s*output\.digest/);
});

test('attestation digest is deterministic', () => {
  const left =
    buildFandexMomentumCategoricalOutputAttestation(BASE_EVIDENCE);
  const right =
    buildFandexMomentumCategoricalOutputAttestation(BASE_EVIDENCE);

  assert.equal(left.attestationDigest, right.attestationDigest);
  assert.equal(
    left.evaluationEvidence.evaluationEvidenceDigest,
    right.evaluationEvidence.evaluationEvidenceDigest,
  );
});
