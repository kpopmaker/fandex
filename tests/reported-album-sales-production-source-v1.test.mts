import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReportedAlbumSalesHistory,
  createReportedAlbumSalesObservation,
  type ReportedAlbumSalesObservation,
  type ReportedAlbumSalesSourceTier,
} from '../lib/alternative-evidence/reportedAlbumSalesEvidence';
import {
  buildReportedAlbumSalesProductionSourceCandidate,
  buildReportedAlbumSalesProductionSourceSnapshot,
  REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_CONTRACT_VERSION,
  REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_ID,
} from '../lib/alternative-evidence/reportedAlbumSalesProductionSource';
import type {
  SourceAuthorizationDimensions,
} from '../lib/alternative-evidence/onboarding';

function rights(
  overrides: Partial<SourceAuthorizationDimensions> = {},
): SourceAuthorizationDimensions {
  return Object.freeze({
    acquisitionState: 'review-required',
    automationState: 'review-required',
    rawStorageState: 'review-required',
    normalizedStorageState: 'review-required',
    retentionState: 'review-required',
    commercialUseState: 'review-required',
    derivedPublicationState: 'review-required',
    rawRedistributionState: 'blocked',
    ...overrides,
  });
}

const authorizedReviewedWebRights = rights({
  acquisitionState: 'allowed',
  normalizedStorageState: 'allowed',
  retentionState: 'allowed',
  commercialUseState: 'allowed-with-conditions',
  derivedPublicationState: 'allowed-with-conditions',
});

function observation(input: Readonly<{
  value?: number;
  identityState?: 'resolved' | 'candidate' | 'unresolved' | 'conflicting';
  canonicalReleaseId?: string | null;
  sourceTier?: ReportedAlbumSalesSourceTier;
  sourcePublicationDate?: string | null;
  providerPeriodStart?: string;
  providerPeriodEnd?: string;
}> = {}): ReportedAlbumSalesObservation {
  return createReportedAlbumSalesObservation({
    canonicalArtistId: 'iu',
    artistName: 'IU',
    release: {
      canonicalReleaseId:
        input.canonicalReleaseId === undefined
          ? 'release:iu:test-album'
          : input.canonicalReleaseId,
      identityState: input.identityState ?? 'resolved',
      releaseTitle: 'Test Album',
      releaseDate: '2026-10-01',
      edition: null,
      skuOrBarcode: null,
      providerReleaseId: null,
    },
    metricSemantic: 'hanteo-first-week-sales',
    value: input.value ?? 123_456,
    unit: 'physical-copies',
    providerPeriodStart:
      input.providerPeriodStart ?? '2026-10-01',
    providerPeriodEnd:
      input.providerPeriodEnd ?? '2026-10-07',
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
        evidenceId: 'fixture:reported-web:1',
        sourceTier:
          input.sourceTier
          ?? 'tier-b-provider-attributed-reputable',
        reportingSource: 'Fixture News',
        sourceUrl: 'https://example.com/reported-web-evidence',
        sourcePublicationDate:
          input.sourcePublicationDate === undefined
            ? '2026-10-08'
            : input.sourcePublicationDate,
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

test('reported web evidence becomes a truthful production-source candidate without direct or licensed provider claims', () => {
  const candidate = buildReportedAlbumSalesProductionSourceCandidate({
    observation: observation({
      identityState: 'candidate',
      canonicalReleaseId: null,
    }),
    asOfDate: '2026-10-08',
    rights: rights(),
  });

  assert.equal(
    candidate.contractVersion,
    REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_CONTRACT_VERSION,
  );
  assert.equal(candidate.sourceId, REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_ID);
  assert.equal(candidate.sourceType, 'reported-web-evidence');
  assert.equal(candidate.lifecycle, 'production-candidate');
  assert.equal(
    candidate.metricSemantic,
    'reported-hanteo-first-week-sales',
  );
  assert.equal(
    candidate.underlyingMetricSemantic,
    'hanteo-first-week-sales',
  );
  assert.equal(candidate.underlyingProvider, 'Hanteo Chart');
  assert.equal(candidate.observationSource, 'public-reporting-source');
  assert.equal(candidate.extractionMethod, 'reviewed-web-evidence');
  assert.equal(candidate.periodInferenceUsed, false);
  assert.equal(candidate.directProviderClaim, false);
  assert.equal(candidate.licensedFeedClaim, false);
  assert.equal(candidate.numericScoreProduced, false);
  assert.equal(candidate.productSourceEligible, false);
  assert.equal(candidate.rightsState, 'review-required');
  assert.ok(candidate.blockers.includes('release-identity-not-resolved'));
  assert.ok(
    candidate.blockers.includes(
      'rights-commercial-use-not-authorized',
    ),
  );
  assert.ok(
    candidate.blockers.includes(
      'rights-derived-publication-not-authorized',
    ),
  );
});

test('resolved Tier B reviewed web evidence can become source-eligible only after explicit required rights are granted', () => {
  const candidate = buildReportedAlbumSalesProductionSourceCandidate({
    observation: observation(),
    asOfDate: '2026-10-08',
    rights: authorizedReviewedWebRights,
  });

  assert.equal(candidate.evidenceQuality, 'provider-attributed-secondary');
  assert.equal(candidate.availability, 'available');
  assert.equal(candidate.rightsState, 'authorized');
  assert.deepEqual(candidate.blockers, []);
  assert.equal(candidate.durableNormalizedStorageEligible, true);
  assert.equal(candidate.productSourceEligible, true);
  assert.equal(
    candidate.rights.automationState,
    'review-required',
    'human-reviewed v1 does not silently claim automated-access rights',
  );
  assert.equal(candidate.rights.rawStorageState, 'review-required');
  assert.equal(candidate.rights.rawRedistributionState, 'blocked');
});

test('incomplete first-week periods remain pending instead of being estimated', () => {
  const candidate = buildReportedAlbumSalesProductionSourceCandidate({
    observation: observation(),
    asOfDate: '2026-10-05',
    rights: authorizedReviewedWebRights,
  });

  assert.equal(candidate.availability, 'pending');
  assert.equal(candidate.periodInferenceUsed, false);
  assert.equal(candidate.productSourceEligible, false);
  assert.ok(candidate.blockers.includes('first-week-period-incomplete'));
});

test('discovery-only evidence cannot be promoted to a Production source', () => {
  const candidate = buildReportedAlbumSalesProductionSourceCandidate({
    observation: observation({
      sourceTier: 'tier-c-discovery-only',
    }),
    asOfDate: '2026-10-08',
    rights: authorizedReviewedWebRights,
  });

  assert.equal(candidate.productSourceEligible, false);
  assert.ok(
    candidate.blockers.includes('source-tier-not-production-eligible'),
  );
  assert.ok(
    candidate.blockers.includes('research-observation-not-usable'),
  );
});

test('missing publication date fails closed for Production source eligibility', () => {
  const candidate = buildReportedAlbumSalesProductionSourceCandidate({
    observation: observation({
      sourcePublicationDate: null,
    }),
    asOfDate: '2026-10-08',
    rights: authorizedReviewedWebRights,
  });

  assert.equal(candidate.productSourceEligible, false);
  assert.ok(
    candidate.blockers.includes('source-publication-date-missing'),
  );
});

test('conflicting active values remain preserved and blocked', () => {
  const first = observation({ value: 123_456 });
  const second = observation({ value: 123_457 });
  const snapshot = buildReportedAlbumSalesProductionSourceSnapshot({
    history: buildReportedAlbumSalesHistory([first, second]),
    asOf: '2026-10-08T23:59:59+09:00',
    rights: authorizedReviewedWebRights,
  });

  assert.equal(snapshot.candidates.length, 2);
  assert.equal(snapshot.eligibleObservationIds.length, 0);
  assert.equal(snapshot.blockedObservationIds.length, 2);
  assert.ok(
    snapshot.candidates.every(
      candidate =>
        candidate.conflictState === 'conflicting-evidence'
        && candidate.blockers.includes('conflicting-evidence'),
    ),
  );
});

test('Production-source contract defines no arbitrary corpus threshold, score, activation, publication, or methodology lock', () => {
  const snapshot = buildReportedAlbumSalesProductionSourceSnapshot({
    history: buildReportedAlbumSalesHistory([observation()]),
    asOf: '2026-10-08T23:59:59+09:00',
    rights: authorizedReviewedWebRights,
  });

  assert.equal(snapshot.minimumCorpusSizeDefined, false);
  assert.equal(snapshot.collectionExpansionRequiredByContract, false);
  assert.equal(snapshot.numericScoreProduced, false);
  assert.equal(snapshot.productActivationAuthorized, false);
  assert.equal(snapshot.publicPublicationAuthorized, false);
  assert.equal(snapshot.methodologyLocked, false);
});
