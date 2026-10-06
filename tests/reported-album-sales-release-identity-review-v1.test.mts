import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createReportedAlbumSalesObservation,
  type ReportedAlbumSalesObservationDraft,
} from '../lib/alternative-evidence/reportedAlbumSalesEvidence';
import {
  resolveReportedAlbumSalesReleaseIdentity,
  validateReportedAlbumSalesReleaseIdentityReview,
} from '../lib/alternative-evidence/reportedAlbumSalesReleaseIdentityReview';

function source(
  overrides: Partial<ReportedAlbumSalesObservationDraft> = {},
) {
  return createReportedAlbumSalesObservation({
    canonicalArtistId: 'iu',
    artistName: 'IU',
    release: {
      canonicalReleaseId: null,
      identityState: 'candidate',
      releaseTitle: 'LILAC',
      releaseDate: '2021-03-25',
      edition: null,
      skuOrBarcode: null,
      providerReleaseId: null,
    },
    metricSemantic: 'hanteo-first-week-sales',
    value: 278_414,
    unit: 'physical-copies',
    providerPeriodStart: '2021-03-26',
    providerPeriodEnd: '2021-04-01',
    observedAt: null,
    reportedAt: null,
    collectedAt: '2026-10-06T23:30:11+09:00',
    underlyingProvider: 'Hanteo Chart',
    territory: null,
    format: 'physical-album',
    revision: {
      state: 'original',
      supersedesObservationId: null,
      revisionObservedAt: null,
    },
    supportingEvidence: [
      {
        evidenceId: 'edaily:iu-lilac',
        sourceTier: 'tier-b-provider-attributed-reputable',
        reportingSource: 'Edaily Starin',
        sourceUrl: 'https://example.com/iu-lilac',
        sourcePublicationDate: '2021-04-07',
        sourcePublishedAt: null,
        reportedAt: null,
        collectedAt: '2026-10-06T23:30:11+09:00',
        extractionMethod: 'manual-reviewed-web-research',
        underlyingProvider: 'Hanteo Chart',
      },
    ],
    lifecycle: 'research',
    ...overrides,
  });
}

test('human-reviewed release mapping resolves a shadow observation without auto-resolution', () => {
  const original = source();
  const resolved = resolveReportedAlbumSalesReleaseIdentity({
    observation: original,
    canonicalReleaseId: 'release-iu-lilac-2021-03-25',
    supportingIdentityEvidenceRefs: [
      'identity:official-release-page:iu-lilac',
      'identity:provider-period-source:iu-lilac',
    ],
    reviewerRef: 'review:music-album-release-identity',
    reviewedAt: '2026-10-06T23:45:00+09:00',
  });

  assert.equal(
    resolved.observation.release.canonicalReleaseId,
    'release-iu-lilac-2021-03-25',
  );
  assert.equal(
    resolved.observation.release.identityState,
    'resolved',
  );
  assert.equal(resolved.observation.lifecycle, 'shadow');
  assert.notEqual(
    resolved.observation.observationId,
    original.observationId,
  );
  assert.equal(resolved.review.autoResolved, false);
  assert.equal(
    resolved.review.identityMapping.reviewState,
    'human-reviewed',
  );
  assert.equal(
    resolved.review.identityMapping.sourceEntityId,
    original.observationId,
  );
  assert.deepEqual(
    validateReportedAlbumSalesReleaseIdentityReview(
      resolved.observation,
      resolved.review,
    ),
    [],
  );
});

test('Tier C discovery-only observation cannot be release-resolved for Production use by this review contract', () => {
  const original = source({
    supportingEvidence: [
      {
        ...source().supportingEvidence[0],
        sourceTier: 'tier-c-discovery-only',
      },
    ],
  });

  assert.throws(
    () =>
      resolveReportedAlbumSalesReleaseIdentity({
        observation: original,
        canonicalReleaseId: 'release-iu-lilac-2021-03-25',
        supportingIdentityEvidenceRefs: ['identity:some-ref'],
        reviewerRef: 'review:music-album-release-identity',
        reviewedAt: '2026-10-06T23:45:00+09:00',
      }),
    /identity_review_not_reviewable/,
  );
});

test('resolved identity requires external evidence and a reviewer reference', () => {
  const original = source();

  assert.throws(
    () =>
      resolveReportedAlbumSalesReleaseIdentity({
        observation: original,
        canonicalReleaseId: 'release-iu-lilac-2021-03-25',
        supportingIdentityEvidenceRefs: [],
        reviewerRef: '',
        reviewedAt: '2026-10-06T23:45:00+09:00',
      }),
    /identity_review_not_reviewable/,
  );
});

test('explicit correction identity review requires a resolved supersession target', () => {
  const original = source();
  const correction = source({
    value: 278_500,
    revision: {
      state: 'explicit-correction',
      supersedesObservationId: original.observationId,
      revisionObservedAt: '2026-10-07T00:00:00+09:00',
    },
  });

  assert.throws(
    () =>
      resolveReportedAlbumSalesReleaseIdentity({
        observation: correction,
        canonicalReleaseId: 'release-iu-lilac-2021-03-25',
        supportingIdentityEvidenceRefs: ['identity:official-release-page'],
        reviewerRef: 'review:music-album-release-identity',
        reviewedAt: '2026-10-07T00:05:00+09:00',
      }),
    /revision_binding_required/,
  );
});
