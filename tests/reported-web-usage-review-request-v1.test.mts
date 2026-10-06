import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createReportedAlbumSalesObservation,
} from '../lib/alternative-evidence/reportedAlbumSalesEvidence';
import {
  buildReportedWebUsageReviewRequest,
  materializeReportedWebUsageReview,
  REPORTED_WEB_USAGE_REVIEW_REQUEST_VERSION,
} from '../lib/alternative-evidence/reportedWebUsageReviewRequest';

function observation() {
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
    supportingEvidence: [
      {
        evidenceId: 'edaily:iu-lilac',
        sourceTier: 'tier-b-provider-attributed-reputable',
        reportingSource: 'Edaily Starin',
        sourceUrl: 'https://www.edaily.co.kr/example',
        sourcePublicationDate: '2021-04-07',
        sourcePublishedAt: null,
        reportedAt: null,
        collectedAt: '2026-10-06T23:30:11+09:00',
        extractionMethod: 'manual-reviewed-web-research',
        underlyingProvider: 'Hanteo Chart',
      },
    ],
    lifecycle: 'research',
  });
}

function request() {
  return buildReportedWebUsageReviewRequest({
    observation: observation(),
    rightsReviewReferences: [
      {
        referenceId: 'hanteo:sales-data-copyright-notice',
        sourceUrl:
          'https://www.hanteonews.com/en/article/93728',
        kind: 'underlying-provider-restriction',
        observedAt: '2026-10-06T23:50:00+09:00',
        reviewSignal:
          'Official Hanteo notice states sales-data copyright and unauthorized-use restrictions; authorization is not inferred.',
        authorizationStateNotInferred: true,
      },
    ],
  });
}

test('rights request preserves source URLs and restriction references without auto-authorization', () => {
  const result = request();

  assert.equal(
    result.contractVersion,
    REPORTED_WEB_USAGE_REVIEW_REQUEST_VERSION,
  );
  assert.equal(result.sourceType, 'reported-web-evidence');
  assert.equal(result.accessMode, 'manual-reviewed');
  assert.equal(result.automatedAccessState, 'not-used');
  assert.equal(
    result.materialBoundary,
    'factual-values-and-provenance-only',
  );
  assert.equal(
    result.copyrightedArticleExpressionRequestedForStorage,
    false,
  );
  assert.equal(result.reviewerConclusionRequired, true);
  assert.equal(result.autoAuthorized, false);
  assert.equal(result.productionAuthorizationContained, false);
  assert.equal(
    result.publicPublicationAuthorizationContained,
    false,
  );
  assert.equal(
    result.reportingSources[0]?.sourceUrl,
    'https://www.edaily.co.kr/example',
  );
  assert.equal(
    result.rightsReviewReferences[0]
      ?.authorizationStateNotInferred,
    true,
  );
});

test('a positive rights decision requires reviewer evidence', () => {
  const reviewRequest = request();

  assert.throws(
    () =>
      materializeReportedWebUsageReview({
        request: reviewRequest,
        decision: {
          requestId: reviewRequest.requestId,
          states: {
            sourceTermsState: 'allowed',
            factualValueStorageState: 'allowed',
            attributionState: 'not-required',
            commercialProductUseState: 'allowed',
            publicDerivedPublicationState: 'allowed',
          },
          evidenceRefs: [],
          conditionRefs: [],
          reviewerRef: 'reviewer:legal-owner',
          reviewedAt: '2026-10-06T23:55:00+09:00',
        },
      }),
    /positive_state_requires_evidence/,
  );
});

test('conditional use must bind the applicable conditions', () => {
  const reviewRequest = request();

  assert.throws(
    () =>
      materializeReportedWebUsageReview({
        request: reviewRequest,
        decision: {
          requestId: reviewRequest.requestId,
          states: {
            sourceTermsState: 'conditional',
            factualValueStorageState: 'conditional',
            attributionState: 'conditional',
            commercialProductUseState: 'conditional',
            publicDerivedPublicationState: 'conditional',
          },
          evidenceRefs: ['legal-review:reported-web:v1'],
          conditionRefs: [],
          reviewerRef: 'reviewer:legal-owner',
          reviewedAt: '2026-10-06T23:55:00+09:00',
        },
      }),
    /conditional_requires_conditions/,
  );
});

test('reviewer can record unknown or restricted dimensions without pretending Production is authorized', () => {
  const reviewRequest = request();
  const review = materializeReportedWebUsageReview({
    request: reviewRequest,
    decision: {
      requestId: reviewRequest.requestId,
      states: {
        sourceTermsState: 'unknown',
        factualValueStorageState: 'conditional',
        attributionState: 'conditional',
        commercialProductUseState: 'unknown',
        publicDerivedPublicationState: 'unknown',
      },
      evidenceRefs: [
        'hanteo:sales-data-copyright-notice',
        'legal-review:reported-web:v1',
      ],
      conditionRefs: [
        'condition:store-factual-values-only',
        'condition:retain-attribution',
      ],
      reviewerRef: 'reviewer:legal-owner',
      reviewedAt: '2026-10-06T23:55:00+09:00',
    },
  });

  assert.equal(review.reviewStatus, 'reviewed');
  assert.equal(review.accessMode, 'manual-reviewed');
  assert.equal(review.automatedAccessState, 'not-used');
  assert.equal(review.sourceTermsState, 'unknown');
  assert.equal(review.factualValueStorageState, 'conditional');
  assert.equal(review.commercialProductUseState, 'unknown');
  assert.equal(review.publicDerivedPublicationState, 'unknown');
});
