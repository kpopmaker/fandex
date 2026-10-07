import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createReportedAlbumSalesObservation,
} from '../lib/alternative-evidence/reportedAlbumSalesEvidence';
import {
  buildReportedAlbumSalesProductionIdentityReviewRequest,
  createReportedAlbumSalesProductionIdentityBinding,
  validateReportedAlbumSalesProductionIdentityBinding,
} from '../lib/alternative-evidence/reportedAlbumSalesProductionIdentity';
import {
  buildReportedAlbumSalesProductionSourceCandidate,
} from '../lib/alternative-evidence/reportedAlbumSalesProductionSource';
import {
  buildReportedWebUsageReviewRequest,
  materializeReportedWebUsageReview,
} from '../lib/alternative-evidence/reportedWebUsageReviewRequest';

function candidateObservation() {
  return createReportedAlbumSalesObservation({
    canonicalArtistId: 'iu',
    artistName: 'IU',
    release: {
      canonicalReleaseId: null,
      identityState: 'candidate',
      releaseTitle: 'Test Album',
      releaseDate: '2026-10-01',
      edition: null,
      skuOrBarcode: null,
      providerReleaseId: null,
    },
    metricSemantic: 'hanteo-first-week-sales',
    value: 123_456,
    unit: 'physical-copies',
    providerPeriodStart: '2026-10-01',
    providerPeriodEnd: '2026-10-07',
    observedAt: null,
    reportedAt: null,
    collectedAt: '2026-10-08T09:00:00+09:00',
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
        evidenceId: 'fixture:web:identity',
        sourceTier: 'tier-b-provider-attributed-reputable',
        reportingSource: 'Fixture News',
        sourceUrl: 'https://example.com/identity',
        sourcePublicationDate: '2026-10-08',
        sourcePublishedAt: '2026-10-08T08:00:00+09:00',
        reportedAt: null,
        collectedAt: '2026-10-08T09:00:00+09:00',
        extractionMethod: 'manual-reviewed-web-research',
        underlyingProvider: 'Hanteo Chart',
      },
    ],
    lifecycle: 'research',
  });
}

function reviewedRights(
  observation: ReturnType<typeof candidateObservation>,
) {
  const request = buildReportedWebUsageReviewRequest({
    observation,
    rightsReviewReferences: [
      {
        referenceId: 'fixture:rights:identity',
        sourceUrl: 'https://example.com/rights',
        kind: 'legal-review-memo',
        observedAt: '2026-10-09T10:05:00+09:00',
        reviewSignal: 'fixture rights review',
        authorizationStateNotInferred: true,
      },
    ],
  });
  return materializeReportedWebUsageReview({
    request,
    decision: {
      requestId: request.requestId,
      states: {
        acquisitionState: 'allowed',
        normalizedStorageState: 'allowed',
        retentionState: 'allowed',
        commercialUseState: 'allowed-with-conditions',
        derivedPublicationState: 'allowed-with-conditions',
      },
      evidenceRefs: ['legal-review:reported-web:identity'],
      conditionRefs: ['condition:factual-values-only'],
      reviewerRef: 'reviewer:rights:identity',
      reviewedAt: '2026-10-09T10:10:00+09:00',
    },
  });
}

test('candidate release identity produces a deterministic human review request without auto-resolution', () => {
  const observation = candidateObservation();
  const first =
    buildReportedAlbumSalesProductionIdentityReviewRequest(observation);
  const second =
    buildReportedAlbumSalesProductionIdentityReviewRequest(observation);

  assert.equal(first.requestId, second.requestId);
  assert.equal(first.observationId, observation.observationId);
  assert.equal(first.sourceIdentityState, 'candidate');
  assert.equal(first.sourceCanonicalReleaseId, null);
  assert.equal(first.sourceEdition, null);
  assert.deepEqual(first.evidenceRefs, ['fixture:web:identity']);
  assert.equal(first.reviewerConclusionRequired, true);
  assert.equal(first.autoResolved, false);
});

test('review decision creates a resolved binding only with explicit canonical id, reviewer, and supporting evidence', () => {
  const observation = candidateObservation();
  const request =
    buildReportedAlbumSalesProductionIdentityReviewRequest(observation);
  const binding =
    createReportedAlbumSalesProductionIdentityBinding({
      request,
      decision: {
        requestId: request.requestId,
        canonicalReleaseId: 'release:iu:test-album:2026-10-01',
        editionResolutionState: 'release-level',
        canonicalEditionId: null,
        supportingEvidenceRefs: [
          'canonical-release-registry:iu:test-album',
          'fixture:web:identity',
        ],
        reviewerRef: 'reviewer:music-album:fixture',
        reviewedAt: '2026-10-09T10:00:00+09:00',
      },
    });

  assert.equal(binding.resolutionState, 'resolved');
  assert.equal(binding.reviewState, 'human-reviewed');
  assert.equal(binding.autoResolved, false);
  assert.equal(
    binding.canonicalReleaseId,
    'release:iu:test-album:2026-10-01',
  );
  assert.equal(binding.editionResolutionState, 'release-level');
  assert.equal(binding.canonicalEditionId, null);
  assert.equal(
    validateReportedAlbumSalesProductionIdentityBinding(
      binding,
      observation,
    ),
    true,
  );
});

test('reviewed binding can resolve the Production source candidate without mutating the Research observation', () => {
  const observation = candidateObservation();
  const request =
    buildReportedAlbumSalesProductionIdentityReviewRequest(observation);
  const binding =
    createReportedAlbumSalesProductionIdentityBinding({
      request,
      decision: {
        requestId: request.requestId,
        canonicalReleaseId: 'release:iu:test-album:2026-10-01',
        editionResolutionState: 'release-level',
        canonicalEditionId: null,
        supportingEvidenceRefs: [
          'canonical-release-registry:iu:test-album',
        ],
        reviewerRef: 'reviewer:music-album:fixture',
        reviewedAt: '2026-10-09T10:00:00+09:00',
      },
    });

  const candidate =
    buildReportedAlbumSalesProductionSourceCandidate({
      observation,
      asOfDate: '2026-10-09',
      rightsReview: reviewedRights(observation),
      releaseIdentityBinding: binding,
    });

  assert.equal(observation.release.identityState, 'candidate');
  assert.equal(observation.release.canonicalReleaseId, null);
  assert.equal(candidate.releaseIdentityState, 'resolved');
  assert.equal(
    candidate.canonicalReleaseId,
    'release:iu:test-album:2026-10-01',
  );
  assert.equal(candidate.releaseIdentityBindingId, binding.bindingId);
  assert.equal(candidate.releaseIdentityReviewState, 'human-reviewed');
  assert.equal(candidate.blockers.includes('release-identity-not-resolved'), false);
  assert.equal(candidate.productSourceEligible, true);
});

test('stale or mismatched binding fails closed', () => {
  const observation = candidateObservation();
  const request =
    buildReportedAlbumSalesProductionIdentityReviewRequest(observation);
  const binding =
    createReportedAlbumSalesProductionIdentityBinding({
      request,
      decision: {
        requestId: request.requestId,
        canonicalReleaseId: 'release:iu:test-album:2026-10-01',
        editionResolutionState: 'release-level',
        canonicalEditionId: null,
        supportingEvidenceRefs: ['canonical-release-registry:fixture'],
        reviewerRef: 'reviewer:music-album:fixture',
        reviewedAt: '2026-10-09T10:00:00+09:00',
      },
    });
  const forged = Object.freeze({
    ...binding,
    observationScopeId: 'stale-scope',
  });

  const candidate =
    buildReportedAlbumSalesProductionSourceCandidate({
      observation,
      asOfDate: '2026-10-09',
      rightsReview: reviewedRights(observation),
      releaseIdentityBinding: forged,
    });

  assert.equal(candidate.releaseIdentityReviewState, 'unbound');
  assert.equal(candidate.productSourceEligible, false);
  assert.ok(
    candidate.blockers.includes('release-identity-binding-invalid'),
  );
  assert.ok(
    candidate.blockers.includes('release-identity-not-resolved'),
  );
});

test('identity binding creation never accepts a fabricated reviewer-free decision', () => {
  const observation = candidateObservation();
  const request =
    buildReportedAlbumSalesProductionIdentityReviewRequest(observation);

  assert.throws(
    () => createReportedAlbumSalesProductionIdentityBinding({
      request,
      decision: {
        requestId: request.requestId,
        canonicalReleaseId: 'release:iu:test-album:2026-10-01',
        editionResolutionState: 'release-level',
        canonicalEditionId: null,
        supportingEvidenceRefs: ['canonical-release-registry:fixture'],
        reviewerRef: '',
        reviewedAt: '2026-10-09T10:00:00+09:00',
      },
    }),
    /reviewer_missing/,
  );
});
