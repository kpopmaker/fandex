import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptBrandFitPartnershipEvidence,
  type BrandFitPartnershipObservationInput,
} from '../lib/intelligence/brandFitPointConstruct';
import {
  adaptRiskAdjustmentProducerQualityMetadata,
} from '../lib/intelligence/riskAdjustmentProducerMetadataAdapter';
import {
  adaptBrandFitPointToFandexVariableProduct,
} from '../lib/product/adapters/brandFitPointFandexVariableProduct';
import {
  BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
  buildBrandFitPointRiskQualityMetadata,
} from '../lib/product/adapters/brandFitPointRiskQualityMetadata';

function observation(): BrandFitPartnershipObservationInput {
  return {
    eventId: 'brand-fit:youtube:39CUlBDuRSo',
    eventType: 'campaign-appearance',
    relationshipType: 'ambassador',
    explicitRelationshipClaim: true,
    identity: {
      canonicalArtistId: 'iu',
      canonicalBrandId: 'estee-lauder',
      canonicalCampaignId:
        'estee-lauder-korea-new-night-campaign-2025-iu',
      identityState: 'resolved',
    },
    source: {
      family: 'official-brand-youtube-video',
      reliability: 'primary-official',
      sourceUrl: 'https://www.youtube.com/watch?v=39CUlBDuRSo',
      sourcePublishedAt: '2025-08-04T02:30:02Z',
      rightsState: 'restricted',
    },
    time: {
      activityStartAt: null,
      activityEndAt: null,
      collectedAt: '2026-10-06T12:57:34Z',
    },
    revision: {
      revisionId:
        'd597ee9e419cb8c5cd71a2206cc2b33b11652caa20bea3ff1f0fed3b68f91f96',
      supersedesRevisionId: null,
    },
  };
}

function currentBrandFitRecord() {
  const evidenceResult =
    adaptBrandFitPartnershipEvidence(observation());
  assert.equal(evidenceResult.status, 'ok');
  if (evidenceResult.status !== 'ok') {
    throw new Error('brand_fit_risk_test_evidence_invalid');
  }

  const productResult =
    adaptBrandFitPointToFandexVariableProduct({
      canonicalArtistId: 'iu',
      evidence: [evidenceResult.evidence],
    });
  assert.equal(productResult.status, 'ok');
  if (productResult.status !== 'ok') {
    throw new Error('brand_fit_risk_test_product_invalid');
  }
  return productResult.record;
}

test('Brand Fit producer metadata exposes all Risk quality dimensions without inventing Production', () => {
  const result = buildBrandFitPointRiskQualityMetadata({
    canonicalArtistId: 'iu',
    record: currentBrandFitRecord(),
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(
    result.metadata.contractVersion,
    BRAND_FIT_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
  );
  assert.equal(result.metadata.variableId, 'brandFitPoint');
  assert.equal(result.metadata.lifecycleState, 'research');
  assert.equal(result.metadata.materialClass, 'real');
  assert.equal(result.metadata.availabilityState, 'available');
  assert.equal(result.metadata.identityState, 'resolved');
  assert.equal(result.metadata.confidenceState, 'insufficient');
  assert.equal(result.metadata.coverageState, 'incomplete');
  assert.equal(result.metadata.freshnessState, 'unknown');
  assert.equal(result.metadata.conflictState, 'unknown');
  assert.equal(result.metadata.revisionState, 'unknown');
  assert.equal(result.metadata.historyState, 'unknown');

  assert.deepEqual(
    Object.keys(result.metadata.requiredDimensionSemantics).sort(),
    [
      'availability',
      'confidence',
      'conflict',
      'coverage',
      'freshness',
      'history',
      'identity',
      'revision',
    ],
  );
});

test('Risk recognizes Brand Fit metadata but rejects current research lifecycle', () => {
  const metadataResult = buildBrandFitPointRiskQualityMetadata({
    canonicalArtistId: 'iu',
    record: currentBrandFitRecord(),
  });

  assert.equal(metadataResult.status, 'ok');
  if (metadataResult.status !== 'ok') return;

  const result = adaptRiskAdjustmentProducerQualityMetadata(
    metadataResult.metadata,
  );

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.envelope.variableId, 'brandFitPoint');
  assert.equal(result.envelope.lifecycleState, 'research');
  assert.equal(result.envelope.materialClass, 'real');
  assert.equal(result.assessment.status, 'not-production-eligible');
  assert.equal(
    result.assessment.handoff.acceptedForRiskConsumption,
    false,
  );
  assert.deepEqual(
    result.assessment.handoff.blockers,
    ['upstream-not-production'],
  );
});

test('Brand Fit Risk handoff preserves the non-numeric boundary', () => {
  const metadataResult = buildBrandFitPointRiskQualityMetadata({
    canonicalArtistId: 'iu',
    record: currentBrandFitRecord(),
  });

  assert.equal(metadataResult.status, 'ok');
  if (metadataResult.status !== 'ok') return;

  const serialized = JSON.stringify(metadataResult.metadata);
  assert.equal(serialized.includes('"kind":"numeric"'), false);
  assert.equal(serialized.includes('"score"'), false);
  assert.equal(serialized.includes('"penalty"'), false);
  assert.equal(serialized.includes('"weight"'), false);
  assert.equal(serialized.includes('"value":0'), false);
});

test('Brand Fit producer metadata rejects a mismatched canonical artist', () => {
  const result = buildBrandFitPointRiskQualityMetadata({
    canonicalArtistId: 'blackpink',
    record: currentBrandFitRecord(),
  });

  assert.deepEqual(result, {
    status: 'blocked',
    reason: 'upstream-identity-mismatch',
  });
});
