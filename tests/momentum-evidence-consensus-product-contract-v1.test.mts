import assert from 'node:assert/strict';
import test from 'node:test';

import {
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION,
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID,
  PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID,
  type ProductMomentumEvidenceConsensusStoredRecord,
} from '../lib/product/contracts/productMomentumEvidenceConsensus';
import {
  buildProductMomentumEvidenceConsensusReadModel,
} from '../lib/product/adapters/momentumEvidenceConsensusProductReadModel';

const BASE_RECORD = Object.freeze({
  recordId:
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  observationId: 'obs-iu-momentum-001',
  canonicalArtistId: 'iu',
  variableId:
    PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_SOURCE_VARIABLE_ID,
  alignmentCutoffAt: '2026-09-21T12:00:00.000Z',
  directionalConsensus: 'direction-corroborated-up',
  persistenceConsensus: 'both-directions-repeated',
  sourceV143Digest:
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
  observationDigest:
    'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
  rawValue: 'direction-corroborated-up',
  lifecycleState: 'research',
  materialClass: 'real',
} as const satisfies ProductMomentumEvidenceConsensusStoredRecord);

test('builds a separate shadow Product contract from stored categorical evidence', () => {
  const result = buildProductMomentumEvidenceConsensusReadModel({
    artistId: 'iu',
    records: [BASE_RECORD],
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(
    result.model.contractVersion,
    PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONTRACT_VERSION,
  );
  assert.equal(
    result.model.identity.constructId,
    PRODUCT_MOMENTUM_EVIDENCE_CONSENSUS_CONSTRUCT_ID,
  );
  assert.equal(result.model.construct, 'Momentum Evidence Consensus');
  assert.equal(result.model.dataOrigin, 'observed');
  assert.equal(result.model.publication, 'shadow');
  assert.equal(result.model.presentation, 'standard');
  assert.equal(result.model.previewFallbackUsed, false);
  assert.equal(result.model.productMetricReadPerformed, false);
});

test('preserves categorical consensus and Stored Evidence trace without a numeric score', () => {
  const result = buildProductMomentumEvidenceConsensusReadModel({
    artistId: 'iu',
    records: [BASE_RECORD],
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.deepEqual(result.model.evidence, {
    alignmentCutoffAt: '2026-09-21T12:00:00.000Z',
    directionalConsensus: 'direction-corroborated-up',
    persistenceConsensus: 'both-directions-repeated',
    qualitativeDirectionEvidenceUsable: true,
    conflictState: 'none',
  });
  assert.deepEqual(result.model.requiredFamilies, [
    'audience-consumption',
    'media-attention',
  ]);
  assert.deepEqual(result.model.storedEvidenceTrace, {
    carrierRecordId: BASE_RECORD.recordId,
    observationId: BASE_RECORD.observationId,
    sourceV143Digest: BASE_RECORD.sourceV143Digest,
    observationDigest: BASE_RECORD.observationDigest,
  });

  const serialized = JSON.stringify(result.model);
  assert.doesNotMatch(serialized, /"score"/);
  assert.doesNotMatch(serialized, /"weightedScore"/);
  assert.doesNotMatch(serialized, /"normalizedValue"/);
  assert.doesNotMatch(serialized, /"productMomentumScore"/);
});

test('missing categorical evidence remains missing and never falls back to preview', () => {
  const result = buildProductMomentumEvidenceConsensusReadModel({
    artistId: 'iu',
    records: [],
  });

  assert.deepEqual(result, {
    status: 'missing',
    reason: 'no-stored-categorical-evidence',
    previewFallbackUsed: false,
    productMetricReadPerformed: false,
  });
});

test('latest Stored Evidence record is selected deterministically', () => {
  const older = Object.freeze({
    ...BASE_RECORD,
    recordId:
      '1111111111111111111111111111111111111111111111111111111111111111',
    observationId: 'obs-iu-momentum-older',
    alignmentCutoffAt: '2026-09-21T04:00:00.000Z',
    directionalConsensus: 'direction-conflicted',
    persistenceConsensus: 'persistence-not-applicable',
    rawValue: 'direction-conflicted',
    sourceV143Digest:
      '2222222222222222222222222222222222222222222222222222222222222222',
    observationDigest:
      '3333333333333333333333333333333333333333333333333333333333333333',
  } as const satisfies ProductMomentumEvidenceConsensusStoredRecord);

  const result = buildProductMomentumEvidenceConsensusReadModel({
    artistId: 'iu',
    records: [BASE_RECORD, older],
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(
    result.model.storedEvidenceTrace.carrierRecordId,
    BASE_RECORD.recordId,
  );
  assert.equal(
    result.model.evidence.directionalConsensus,
    'direction-corroborated-up',
  );
});

test('direction conflict remains visible rather than collapsed into zero/stable', () => {
  const conflicted = Object.freeze({
    ...BASE_RECORD,
    directionalConsensus: 'direction-conflicted',
    persistenceConsensus: 'persistence-not-applicable',
    rawValue: 'direction-conflicted',
  } as const satisfies ProductMomentumEvidenceConsensusStoredRecord);

  const result = buildProductMomentumEvidenceConsensusReadModel({
    artistId: 'iu',
    records: [conflicted],
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(
    result.model.evidence.directionalConsensus,
    'direction-conflicted',
  );
  assert.equal(result.model.evidence.conflictState, 'detected');
  assert.equal(result.model.evidence.qualitativeDirectionEvidenceUsable, false);
});

test('invalid Stored Evidence fails as data issue rather than missing', () => {
  const invalid = {
    ...BASE_RECORD,
    observationDigest: 'not-a-digest',
  } as ProductMomentumEvidenceConsensusStoredRecord;

  const result = buildProductMomentumEvidenceConsensusReadModel({
    artistId: 'iu',
    records: [invalid],
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.ok(
    result.issues.some(
      (issue) => issue.code === 'invalid-stored-evidence-trace',
    ),
  );
  assert.equal(result.previewFallbackUsed, false);
  assert.equal(result.productMetricReadPerformed, false);
});

test('research carrier identity remains explicit and separate from Product construct identity', () => {
  const result = buildProductMomentumEvidenceConsensusReadModel({
    artistId: 'iu',
    records: [BASE_RECORD],
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(
    result.model.sourceCarrier.variableId,
    'momentum.cross-family-evidence-state.research',
  );
  assert.equal(result.model.sourceCarrier.lifecycleState, 'research');
  assert.equal(result.model.sourceCarrier.materialClass, 'real');
  assert.equal(result.model.identity.constructId, 'momentumEvidenceConsensus');
});
