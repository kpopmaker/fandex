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
        observedAt: '2026-10-07T08:40:00+09:00',
        reviewSignal:
          'Official Hanteo notice states sales-data copyright and unauthorized-use restrictions; authorization is not inferred.',
        authorizationStateNotInferred: true,
      },
    ],
  });
}

test('rights request preserves source provenance and never auto-authorizes web Production', () => {
  const result = request();

  assert.equal(
    result.contractVersion,
    REPORTED_WEB_USAGE_REVIEW_REQUEST_VERSION,
  );
  assert.equal(result.sourceType, 'reported-web-evidence');
  assert.equal(result.accessMode, 'manual-reviewed');
  assert.equal(
    result.materialBoundary,
    'factual-values-and-provenance-only',
  );
  assert.equal(
    result.copyrightedArticleExpressionRequestedForStorage,
    false,
  );
  assert.equal(result.fixedManualOnlyStates.automationState, 'blocked');
  assert.equal(result.fixedManualOnlyStates.rawStorageState, 'blocked');
  assert.equal(
    result.fixedManualOnlyStates.rawRedistributionState,
    'blocked',
  );
  assert.equal(result.reviewerConclusionRequired, true);
  assert.equal(result.autoAuthorized, false);
  assert.equal(result.productionAuthorizationContained, false);
  assert.equal(
    result.publicPublicationAuthorizationContained,
    false,
  );
});

test('granted rights require evidence and conditional rights require condition refs', () => {
  const reviewRequest = request();

  assert.throws(
    () =>
      materializeReportedWebUsageReview({
        request: reviewRequest,
        decision: {
          requestId: reviewRequest.requestId,
          states: {
            acquisitionState: 'allowed',
            normalizedStorageState: 'allowed',
            retentionState: 'allowed',
            commercialUseState: 'allowed-with-conditions',
            derivedPublicationState: 'allowed-with-conditions',
          },
          evidenceRefs: [],
          conditionRefs: [],
          reviewerRef: 'reviewer:legal-owner',
          reviewedAt: '2026-10-07T08:45:00+09:00',
        },
      }),
    /granted_state_requires_evidence/,
  );

  assert.throws(
    () =>
      materializeReportedWebUsageReview({
        request: reviewRequest,
        decision: {
          requestId: reviewRequest.requestId,
          states: {
            acquisitionState: 'allowed',
            normalizedStorageState: 'allowed',
            retentionState: 'allowed',
            commercialUseState: 'allowed-with-conditions',
            derivedPublicationState: 'allowed-with-conditions',
          },
          evidenceRefs: ['legal-review:reported-web:v1'],
          conditionRefs: [],
          reviewerRef: 'reviewer:legal-owner',
          reviewedAt: '2026-10-07T08:45:00+09:00',
        },
      }),
    /conditional_requires_conditions/,
  );
});

test('materialized manual review can authorize only required normalized-use dimensions while raw/automation remain blocked', () => {
  const reviewRequest = request();
  const review = materializeReportedWebUsageReview({
    request: reviewRequest,
    decision: {
      requestId: reviewRequest.requestId,
      states: {
        acquisitionState: 'allowed',
        normalizedStorageState: 'allowed',
        retentionState: 'allowed',
        commercialUseState: 'allowed-with-conditions',
        derivedPublicationState: 'allowed-with-conditions',
      },
      evidenceRefs: [
        'hanteo:sales-data-copyright-notice',
        'legal-review:reported-web:v1',
      ],
      conditionRefs: [
        'condition:store-factual-values-and-provenance-only',
        'condition:retain-source-attribution',
      ],
      reviewerRef: 'reviewer:legal-owner',
      reviewedAt: '2026-10-07T08:45:00+09:00',
    },
  });

  assert.equal(review.rights.acquisitionState, 'allowed');
  assert.equal(review.rights.automationState, 'blocked');
  assert.equal(review.rights.rawStorageState, 'blocked');
  assert.equal(review.rights.normalizedStorageState, 'allowed');
  assert.equal(review.rights.retentionState, 'allowed');
  assert.equal(
    review.rights.commercialUseState,
    'allowed-with-conditions',
  );
  assert.equal(
    review.rights.derivedPublicationState,
    'allowed-with-conditions',
  );
  assert.equal(review.rights.rawRedistributionState, 'blocked');
  assert.equal(review.autoAuthorized, false);
  assert.equal(review.productActivationAuthorized, false);
  assert.equal(review.publicPublicationAuthorized, false);
});
