import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BRAND_FIT_POINT_CONSTRUCT,
  adaptBrandFitPartnershipEvidence,
  evaluateBrandFitProductReadiness,
  validateBrandFitEvidenceHistory,
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
      sourceUrl: 'https://example.com/official-brand-announcement',
      sourcePublishedAt: '2026-09-01T00:00:00.000Z',
      rightsState: 'allow',
    },
    time: {
      activityStartAt: '2026-09-01T00:00:00.000Z',
      activityEndAt: null,
      collectedAt: '2026-09-01T01:00:00.000Z',
    },
    revision: {
      revisionId: 'rev-1',
      supersedesRevisionId: null,
    },
    ...overrides,
  };
}

test('construct is categorical and does not claim numeric brand fit', () => {
  assert.equal(BRAND_FIT_POINT_CONSTRUCT.variableId, 'brandFitPoint');
  assert.equal(BRAND_FIT_POINT_CONSTRUCT.productForm, 'categorical-event-stream');
  assert.equal(BRAND_FIT_POINT_CONSTRUCT.numericEligible, false);
});

test('official explicit partnership evidence is accepted without a score', () => {
  const result = adaptBrandFitPartnershipEvidence(observation());
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.evidence.identity.canonicalArtistId, 'iu');
  assert.equal(result.evidence.identity.canonicalBrandId, 'estee-lauder');
  assert.equal(result.evidence.identity.canonicalCampaignId, 'estee-lauder-iu-2026');
  assert.equal(result.evidence.interpretation.score, null);
  assert.equal(result.evidence.interpretation.sentiment, null);
  assert.equal(result.evidence.interpretation.inferredDealValue, null);
});

test('brand mentions without an explicit relationship claim are unsupported', () => {
  const result = adaptBrandFitPartnershipEvidence(
    observation({ explicitRelationshipClaim: false }),
  );
  assert.deepEqual(result, {
    status: 'unsupported',
    reason: 'relationship-not-explicit',
  });
});

test('secondary or unverified evidence is not promoted as qualified evidence', () => {
  assert.deepEqual(
    adaptBrandFitPartnershipEvidence(
      observation({
        source: {
          ...observation().source,
          reliability: 'secondary-corroborated',
        },
      }),
    ),
    {
      status: 'unsupported',
      reason: 'source-reliability-insufficient',
    },
  );
});

test('unsupported source family is distinct from missing evidence', () => {
  const result = adaptBrandFitPartnershipEvidence(
    observation({
      source: {
        ...observation().source,
        family: 'social-mention',
      },
    }),
  );
  assert.deepEqual(result, {
    status: 'unsupported',
    reason: 'source-family-unsupported',
  });
});

test('campaign events require resolved campaign identity', () => {
  const result = adaptBrandFitPartnershipEvidence(
    observation({
      identity: {
        ...observation().identity,
        canonicalCampaignId: null,
      },
    }),
  );
  assert.deepEqual(result, {
    status: 'unsupported',
    reason: 'campaign-identity-required',
  });
});

test('relationship announcement may exist without campaign identity', () => {
  const result = adaptBrandFitPartnershipEvidence(
    observation({
      eventType: 'relationship-announced',
      identity: {
        ...observation().identity,
        canonicalCampaignId: null,
      },
    }),
  );
  assert.equal(result.status, 'ok');
});

test('identity unresolved and identity conflict stay distinct', () => {
  assert.deepEqual(
    adaptBrandFitPartnershipEvidence(
      observation({
        identity: {
          ...observation().identity,
          identityState: 'unresolved',
        },
      }),
    ),
    { status: 'unsupported', reason: 'identity-unresolved' },
  );
  assert.deepEqual(
    adaptBrandFitPartnershipEvidence(
      observation({
        identity: {
          ...observation().identity,
          identityState: 'conflict',
        },
      }),
    ),
    { status: 'unsupported', reason: 'identity-conflict' },
  );
});

test('observation/source time remains separate from collection time', () => {
  const result = adaptBrandFitPartnershipEvidence(
    observation({
      source: {
        ...observation().source,
        sourcePublishedAt: '2026-09-02T00:00:00.000Z',
      },
      time: {
        activityStartAt: '2026-09-05T00:00:00.000Z',
        activityEndAt: '2026-09-30T00:00:00.000Z',
        collectedAt: '2026-09-03T12:00:00.000Z',
      },
    }),
  );
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  assert.equal(result.evidence.source.sourcePublishedAt, '2026-09-02T00:00:00.000Z');
  assert.equal(result.evidence.time.activityStartAt, '2026-09-05T00:00:00.000Z');
  assert.equal(result.evidence.time.collectedAt, '2026-09-03T12:00:00.000Z');
});

test('revision history is append-only and must reference an earlier revision', () => {
  const first = adaptBrandFitPartnershipEvidence(observation());
  const second = adaptBrandFitPartnershipEvidence(
    observation({
      revision: {
        revisionId: 'rev-2',
        supersedesRevisionId: 'rev-1',
      },
    }),
  );
  assert.equal(first.status, 'ok');
  assert.equal(second.status, 'ok');
  if (first.status !== 'ok' || second.status !== 'ok') return;

  assert.deepEqual(
    validateBrandFitEvidenceHistory([first.evidence, second.evidence]),
    [],
  );
  assert.deepEqual(
    validateBrandFitEvidenceHistory([second.evidence]),
    ['superseded-revision-not-found-earlier'],
  );
});

test('no campaign evidence is insufficient data, not zero or negative fit', () => {
  const readiness = evaluateBrandFitProductReadiness([]);
  assert.equal(readiness.status, 'insufficient_data');
  assert.equal(readiness.evidenceCount, 0);
  assert.equal(readiness.numericEligible, false);
  assert.equal('score' in readiness, false);
});

test('unknown rights block Product candidacy without changing evidence existence', () => {
  const result = adaptBrandFitPartnershipEvidence(
    observation({
      source: {
        ...observation().source,
        rightsState: 'unknown',
      },
    }),
  );
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  const readiness = evaluateBrandFitProductReadiness([result.evidence]);
  assert.equal(readiness.status, 'blocked');
  assert.deepEqual(readiness.blockers, ['rights-unknown']);
  assert.equal(readiness.evidenceCount, 1);
});

test('restricted rights are preserved as a limitation, not scored', () => {
  const result = adaptBrandFitPartnershipEvidence(
    observation({
      source: {
        ...observation().source,
        rightsState: 'restricted',
      },
    }),
  );
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;

  const readiness = evaluateBrandFitProductReadiness([result.evidence]);
  assert.equal(readiness.status, 'categorical_candidate');
  assert.deepEqual(readiness.limitations, ['rights-restricted']);
  assert.equal(readiness.numericEligible, false);
});
