import assert from 'node:assert/strict';
import test from 'node:test';

import {
  adaptBrandFitPointToFandexVariableProduct,
  BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
} from '../lib/product/adapters/brandFitPointFandexVariableProduct';
import {
  adaptBrandFitPartnershipEvidence,
  type BrandFitPartnershipEvidence,
  type BrandFitPartnershipObservationInput,
} from '../lib/intelligence/brandFitPointConstruct';

function observation(
  overrides: Partial<BrandFitPartnershipObservationInput> = {},
): BrandFitPartnershipObservationInput {
  return {
    eventId: 'iu-estee-lauder-2026',
    eventType: 'campaign-launched',
    relationshipType: 'ambassador',
    explicitRelationshipClaim: true,
    identity: {
      canonicalArtistId: 'iu',
      canonicalBrandId: 'estee-lauder',
      canonicalCampaignId: 'estee-lauder-iu-2026',
      identityState: 'resolved',
    },
    source: {
      family: 'official-brand-announcement',
      reliability: 'primary-official',
      sourceUrl: 'https://example.com/brand-fit-evidence',
      sourcePublishedAt: '2026-09-02T00:00:00.000Z',
      rightsState: 'restricted',
    },
    time: {
      activityStartAt: '2026-09-05T00:00:00.000Z',
      activityEndAt: null,
      collectedAt: '2026-09-03T12:00:00.000Z',
    },
    revision: {
      revisionId: 'rev-1',
      supersedesRevisionId: null,
    },
    ...overrides,
  };
}

function evidence(
  overrides: Partial<BrandFitPartnershipObservationInput> = {},
): BrandFitPartnershipEvidence {
  const result = adaptBrandFitPartnershipEvidence(observation(overrides));
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') {
    throw new Error('brand_fit_test_evidence_invalid');
  }
  return result.evidence;
}

test('no qualified evidence maps to building-history rather than zero or negative fit', () => {
  const result = adaptBrandFitPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    evidence: [],
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.variableId, 'brandFitPoint');
  assert.equal(result.record.lifecycleState, 'research');
  assert.equal(result.record.materialClass, 'real');
  assert.equal(result.record.readinessState, 'building-history');
  assert.equal(result.record.availability, 'unavailable');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'none',
    reason: 'not-produced',
  });
  assert.equal(result.record.confidence, 'insufficient');
  assert.equal(result.record.coverage, 'unknown');
  assert.equal(result.record.freshness, 'unknown');
  assert.equal(result.record.asOf, null);
  assert.deepEqual(result.record.observationTime, { kind: 'unknown' });
  assert.equal(result.record.collectionTime, null);
});

test('qualified partnership evidence maps to an available categorical event while remaining research-only', () => {
  const result = adaptBrandFitPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    evidence: [evidence()],
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.lifecycleState, 'research');
  assert.equal(result.record.readinessState, 'research-only');
  assert.equal(result.record.availability, 'available');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'event',
    state: 'verified-commercial-partnership-activity',
  });
  assert.equal(result.record.coverage, 'incomplete');
  assert.equal(
    result.record.productVersion,
    BRAND_FIT_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  );
});

test('restricted rights remain a limitation and never become publication authorization', () => {
  const result = adaptBrandFitPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    evidence: [evidence()],
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.ok(
    result.record.evidenceRefs.includes(
      'brand-fit-limitation:rights-restricted',
    ),
  );
  assert.equal(result.record.lifecycleState, 'research');
  assert.equal(result.record.readinessState, 'research-only');
});

test('unknown rights block the common record explicitly', () => {
  const result = adaptBrandFitPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    evidence: [
      evidence({
        source: {
          ...observation().source,
          rightsState: 'unknown',
        },
      }),
    ],
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.readinessState, 'blocked');
  assert.equal(result.record.availability, 'blocked');
  assert.deepEqual(result.record.valueRepresentation, {
    kind: 'none',
    reason: 'blocked',
  });
  assert.equal(result.record.blockerReason, 'rights-unknown');
});

test('artist identity mismatch fails closed', () => {
  const result = adaptBrandFitPointToFandexVariableProduct({
    canonicalArtistId: 'blackpink',
    evidence: [evidence()],
  });

  assert.deepEqual(result, {
    status: 'blocked',
    reason: 'artist-identity-mismatch',
  });
});

test('event/source time remains distinct from collection time', () => {
  const result = adaptBrandFitPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    evidence: [evidence()],
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.record.asOf, '2026-09-02T00:00:00.000Z');
  assert.deepEqual(result.record.observationTime, {
    kind: 'instant',
    observedAt: '2026-09-02T00:00:00.000Z',
  });
  assert.deepEqual(result.record.collectionTime, {
    collectedAt: '2026-09-03T12:00:00.000Z',
  });
});

test('Brand Fit common representation never emits a numeric score or deal-value inference', () => {
  const result = adaptBrandFitPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    evidence: [evidence()],
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  const serialized = JSON.stringify(result.record);
  assert.equal(serialized.includes('"kind":"numeric"'), false);
  assert.equal(serialized.includes('"score"'), false);
  assert.equal(serialized.includes('inferredDealValue'), false);
  assert.equal(serialized.includes('"value":0'), false);
});

test('revision and source lineage is retained as evidence refs', () => {
  const result = adaptBrandFitPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    evidence: [evidence()],
  });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.ok(
    result.record.evidenceRefs.includes('brand-fit-event:iu-estee-lauder-2026'),
  );
  assert.ok(
    result.record.evidenceRefs.includes('brand-fit-revision:rev-1'),
  );
  assert.ok(
    result.record.evidenceRefs.includes(
      'https://example.com/brand-fit-evidence',
    ),
  );
});
