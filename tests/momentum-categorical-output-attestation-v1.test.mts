import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION,
  buildFandexMomentumCategoricalOutputAttestation,
  type MomentumCurrentDualSourceEvaluationEvidence,
} from '../lib/intelligence/fandexMomentumCategoricalOutputAttestation';

const EVIDENCE_URL = new URL(
  '../data/momentum-product/iu_momentum_current_dual_source_evaluation_v1.json',
  import.meta.url,
);

async function evidence(): Promise<MomentumCurrentDualSourceEvaluationEvidence> {
  return JSON.parse(
    await readFile(EVIDENCE_URL, 'utf8'),
  ) as MomentumCurrentDualSourceEvaluationEvidence;
}

test('builds preview-independent source lineage from the authoritative current evaluation', async () => {
  const result = buildFandexMomentumCategoricalOutputAttestation(
    await evidence(),
  );

  assert.equal(
    result.contractVersion,
    FANDEX_MOMENTUM_CATEGORICAL_OUTPUT_ATTESTATION_VERSION,
  );
  assert.equal(result.lifecycle, 'research');
  assert.equal(result.canonicalArtistId, 'iu');

  assert.deepEqual(result.sourceLineage, {
    kind: 'preview-independent-v142-current-evaluation',
    sourceContractVersion:
      'v142_fandex_momentum_cross_family_combination_research_v1',
    sourceV142Digest:
      '3ac534dd6afc2e75f534cf4bc98ce6fb33fdd22e081eaae9aedcf97a90fd6721',
    legacySourceV143Required: false,
    legacySourceV143Digest: null,
  });

  assert.deepEqual(result.categoricalOutput, {
    alignmentCutoffAt: '2026-09-27T02:10:05.000Z',
    directionalConsensus: 'direction-conflicted',
    persistenceConsensus: 'persistence-not-applicable',
    qualitativeDirectionEvidenceUsable: false,
    productMomentumScore: null,
  });

  assert.equal(
    result.evaluationEvidence.latestNaverThroughSlotStart,
    '2026-09-27T03:00:00.000Z',
  );
  assert.equal(
    result.evaluationEvidence.latestNaverJobId,
    '362b77504d31b89d9f9a5b66a1216c6adb59be376b2ae811d664f351929677f2',
  );
  assert.equal(
    result.evaluationEvidence.evaluationClassification,
    'new-carrier-cutoff-advanced-same-state',
  );
  assert.match(result.evaluationEvidence.evaluationEvidenceDigest, /^[0-9a-f]{64}$/);
  assert.match(result.attestationDigest, /^[0-9a-f]{64}$/);
});

test('attestation explicitly evolves carrier lineage instead of mislabeling v142 as v143', async () => {
  const result = buildFandexMomentumCategoricalOutputAttestation(
    await evidence(),
  );

  assert.equal(result.carrierLineageEligibility.eligible, true);
  assert.equal(
    result.carrierLineageEligibility.sourceDigestField,
    'sourceAttestationDigest',
  );
  assert.equal(
    result.carrierLineageEligibility.sourceContractField,
    'sourceAttestationContractVersion',
  );
  assert.equal(
    result.carrierLineageEligibility.existingSourceV143FieldMustNotBeReused,
    true,
  );
  assert.equal(result.sourceLineage.legacySourceV143Required, false);
  assert.equal(result.sourceLineage.legacySourceV143Digest, null);
});

test('zero-effect isolation is part of attested lineage', async () => {
  const result = buildFandexMomentumCategoricalOutputAttestation(
    await evidence(),
  );

  assert.deepEqual(result.isolation, {
    databaseMode: 'read-only',
    databaseWrites: 0,
    productMetricReads: 0,
    productMetricWrites: 0,
    previewFallbackReads: 0,
    registryMutations: 0,
    productionActivations: 0,
  });
});

test('tampered Product or Preview access fails closed', async () => {
  const source = await evidence();
  const tampered: MomentumCurrentDualSourceEvaluationEvidence = {
    ...source,
    safety: {
      ...source.safety,
      previewFallbackReads: 1,
    },
  };

  assert.throws(
    () => buildFandexMomentumCategoricalOutputAttestation(tampered),
    /momentum_categorical_attestation_isolation_invalid/,
  );
});

test('incomplete NAVER Stored Evidence reproduction fails closed', async () => {
  const source = await evidence();
  const tampered: MomentumCurrentDualSourceEvaluationEvidence = {
    ...source,
    latestNaverStoredEvidence: {
      ...source.latestNaverStoredEvidence,
      reproducedSnapshotCount:
        source.latestNaverStoredEvidence.expectedSlotCount - 1,
    },
  };

  assert.throws(
    () => buildFandexMomentumCategoricalOutputAttestation(tampered),
    /momentum_categorical_attestation_naver_evidence_invalid/,
  );
});

test('source implementation contains no v143, Product metric, or Preview dependency', async () => {
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

test('attestation digest is deterministic for the same authoritative evidence', async () => {
  const source = await evidence();
  const left = buildFandexMomentumCategoricalOutputAttestation(source);
  const right = buildFandexMomentumCategoricalOutputAttestation(source);

  assert.equal(left.attestationDigest, right.attestationDigest);
  assert.equal(
    left.evaluationEvidence.evaluationEvidenceDigest,
    right.evaluationEvidence.evaluationEvidenceDigest,
  );
});


test('recorded attestation artifact exactly matches the deterministic builder output', async () => {
  const source = await evidence();
  const built = buildFandexMomentumCategoricalOutputAttestation(source);
  const recorded = JSON.parse(
    await readFile(
      new URL(
        '../data/momentum-product/iu_momentum_categorical_output_attestation_v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );

  assert.deepEqual(recorded, built);
  assert.equal(
    recorded.attestationDigest,
    '03888fbf16462320cb4fcd70c2f237f62a7f18e80f0f964d956fb75732af4582',
  );
  assert.equal(
    recorded.evaluationEvidence.evaluationEvidenceDigest,
    'aef8a7e60d475d1d5c1d7d05746e0b748cb1e7aa32246ec4a2f98efea285ffe0',
  );
});
