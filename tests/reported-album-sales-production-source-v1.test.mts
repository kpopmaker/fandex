import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildReportedAlbumSalesHistory,
  createReportedAlbumSalesObservation,
  type ReportedAlbumSalesObservation,
  type ReportedAlbumSalesSourceTier,
} from '../lib/alternative-evidence/reportedAlbumSalesEvidence';
import {
  buildReportedAlbumSalesProductionEvidenceQualificationRequest,
  createReportedAlbumSalesProductionEvidenceQualificationBinding,
} from '../lib/alternative-evidence/reportedAlbumSalesProductionEvidenceQualification';
import {
  buildReportedAlbumSalesProductionIdentityReviewRequest,
  createReportedAlbumSalesProductionIdentityBinding,
} from '../lib/alternative-evidence/reportedAlbumSalesProductionIdentity';
import {
  buildReportedAlbumSalesProductionSourceCandidate,
  buildReportedAlbumSalesProductionSourceSnapshot,
  REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_CONTRACT_VERSION,
  REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_ID,
} from '../lib/alternative-evidence/reportedAlbumSalesProductionSource';
import {
  buildReportedWebUsageReviewRequest,
  materializeReportedWebUsageReview,
} from '../lib/alternative-evidence/reportedWebUsageReviewRequest';

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

function reviewedReleaseBinding(
  source: ReportedAlbumSalesObservation,
) {
  const request =
    buildReportedAlbumSalesProductionIdentityReviewRequest(source);
  return createReportedAlbumSalesProductionIdentityBinding({
    request,
    decision: {
      requestId: request.requestId,
      canonicalReleaseId: 'release:iu:test-album',
      editionResolutionState: 'release-level',
      canonicalEditionId: null,
      supportingEvidenceRefs: [
        'canonical-release-registry:iu:test-album',
      ],
      reviewerRef: 'reviewer:music-album:fixture',
      reviewedAt: '2026-10-08T10:00:00+09:00',
    },
  });
}

function reviewedEvidenceQualification(
  source: ReportedAlbumSalesObservation,
) {
  const request =
    buildReportedAlbumSalesProductionEvidenceQualificationRequest(
      source,
    );
  return createReportedAlbumSalesProductionEvidenceQualificationBinding({
    request,
    decision: {
      requestId: request.requestId,
      evidenceId: 'fixture:reported-web:1',
      supportedClaims: [
        'exact-value',
        'explicit-provider-period',
        'metric-semantic',
        'underlying-provider',
      ],
      reviewEvidenceRefs: [
        'review:fixture:reported-web:claims',
      ],
      reviewerRef: 'reviewer:music-album:fixture',
      reviewedAt: '2026-10-08T10:15:00+09:00',
    },
  });
}

function reviewedRights(
  source: ReportedAlbumSalesObservation,
) {
  const request = buildReportedWebUsageReviewRequest({
    observation: source,
    rightsReviewReferences: [
      {
        referenceId: 'fixture:rights:reported-web',
        sourceUrl: 'https://example.com/rights',
        kind: 'legal-review-memo',
        observedAt: '2026-10-08T10:05:00+09:00',
        reviewSignal: 'fixture rights review input',
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
      evidenceRefs: ['legal-review:reported-web:fixture'],
      conditionRefs: [
        'condition:store-factual-values-and-provenance-only',
      ],
      reviewerRef: 'reviewer:rights:fixture',
      reviewedAt: '2026-10-08T10:10:00+09:00',
    },
  });
}

function productionCandidate(
  source: ReportedAlbumSalesObservation,
  asOfDate = '2026-10-08',
) {
  const sourceTier = source.supportingEvidence[0]?.sourceTier;
  const evidenceQualifications =
    sourceTier === 'tier-a-primary-official'
    || sourceTier === 'tier-b-provider-attributed-reputable'
      ? [reviewedEvidenceQualification(source)]
      : [];

  return buildReportedAlbumSalesProductionSourceCandidate({
    observation: source,
    asOfDate,
    rightsReview: reviewedRights(source),
    releaseIdentityBinding: reviewedReleaseBinding(source),
    evidenceQualifications,
  });
}

test('reported web evidence becomes a truthful production-source candidate without direct or licensed provider claims', () => {
  const candidate = buildReportedAlbumSalesProductionSourceCandidate({
    observation: observation({
      identityState: 'candidate',
      canonicalReleaseId: null,
    }),
    asOfDate: '2026-10-08',
    rightsReview: null,
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
  assert.ok(
    candidate.blockers.includes(
      'production-evidence-qualification-required',
    ),
  );
  assert.ok(
    candidate.blockers.includes(
      'tier-a-or-b-exact-value-evidence-missing',
    ),
  );
  assert.ok(candidate.blockers.includes('rights-review-binding-required'));
  assert.ok(candidate.blockers.includes('release-identity-not-resolved'));
  assert.ok(candidate.blockers.includes('release-identity-binding-required'));
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

test('Tier B reviewed web evidence becomes source-eligible only after explicit rights and human-reviewed release binding', () => {
  const source = observation();
  const rightsReview = reviewedRights(source);
  const candidate = buildReportedAlbumSalesProductionSourceCandidate({
    observation: source,
    asOfDate: '2026-10-08',
    rightsReview,
    releaseIdentityBinding: reviewedReleaseBinding(source),
    evidenceQualifications: [
      reviewedEvidenceQualification(source),
    ],
  });

  assert.equal(candidate.evidenceQuality, 'provider-attributed-secondary');
  assert.equal(candidate.availability, 'available');
  assert.equal(candidate.rightsState, 'authorized');
  assert.deepEqual(
    [...candidate.evidenceClaimCoverage].sort(),
    [
      'exact-value',
      'explicit-provider-period',
      'metric-semantic',
      'underlying-provider',
    ].sort(),
  );
  assert.equal(candidate.evidenceQualificationBindingIds.length, 1);
  assert.equal(candidate.editionResolutionState, 'release-level');
  assert.equal(candidate.canonicalEditionId, null);
  assert.deepEqual(candidate.blockers, []);
  assert.equal(candidate.durableNormalizedStorageEligible, true);
  assert.equal(candidate.productSourceEligible, true);
  assert.equal(
    candidate.rights.automationState,
    'blocked',
    'human-reviewed v1 does not silently claim automated-access rights',
  );
  assert.equal(candidate.rights.rawStorageState, 'blocked');
  assert.equal(candidate.rights.rawRedistributionState, 'blocked');
});

test('incomplete first-week periods remain pending instead of being estimated', () => {
  const candidate = productionCandidate(
    observation(),
    '2026-10-05',
  );

  assert.equal(candidate.availability, 'pending');
  assert.equal(candidate.periodInferenceUsed, false);
  assert.equal(candidate.productSourceEligible, false);
  assert.ok(candidate.blockers.includes('first-week-period-incomplete'));
});

test('discovery-only evidence cannot be promoted to a Production source', () => {
  const candidate = productionCandidate(
    observation({
      sourceTier: 'tier-c-discovery-only',
    }),
  );

  assert.equal(candidate.productSourceEligible, false);
  assert.ok(
    candidate.blockers.includes('source-tier-not-production-eligible'),
  );
  assert.ok(
    candidate.blockers.includes('research-observation-not-usable'),
  );
});

test('missing publication date fails closed for Production source eligibility', () => {
  const candidate = productionCandidate(
    observation({
      sourcePublicationDate: null,
    }),
  );

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
  });

  assert.equal(snapshot.minimumCorpusSizeDefined, false);
  assert.equal(snapshot.collectionExpansionRequiredByContract, false);
  assert.equal(snapshot.numericScoreProduced, false);
  assert.equal(snapshot.productActivationAuthorized, false);
  assert.equal(snapshot.publicPublicationAuthorized, false);
  assert.equal(snapshot.methodologyLocked, false);
});

test('raw resolved identity flag without a Production identity binding remains blocked', () => {
  const source = observation({
    identityState: 'resolved',
    canonicalReleaseId: 'release:iu:test-album',
  });
  const candidate = buildReportedAlbumSalesProductionSourceCandidate({
    observation: source,
    asOfDate: '2026-10-08',
    rightsReview: reviewedRights(source),
  });

  assert.equal(candidate.releaseIdentityState, 'resolved');
  assert.equal(candidate.releaseIdentityReviewState, 'unbound');
  assert.equal(candidate.productSourceEligible, false);
  assert.ok(
    candidate.blockers.includes('release-identity-binding-required'),
  );
  assert.ok(
    candidate.blockers.includes('release-identity-not-resolved'),
  );
});


test('an unrelated Tier B source cannot qualify a value that is only present in discovery evidence', () => {
  const source = observation();
  const request =
    buildReportedAlbumSalesProductionEvidenceQualificationRequest(
      source,
    );
  const providerOnly =
    createReportedAlbumSalesProductionEvidenceQualificationBinding({
      request,
      decision: {
        requestId: request.requestId,
        evidenceId: 'fixture:reported-web:1',
        supportedClaims: ['underlying-provider'],
        reviewEvidenceRefs: [
          'review:fixture:provider-attribution-only',
        ],
        reviewerRef: 'reviewer:music-album:fixture',
        reviewedAt: '2026-10-08T10:15:00+09:00',
      },
    });
  const candidate =
    buildReportedAlbumSalesProductionSourceCandidate({
      observation: source,
      asOfDate: '2026-10-08',
      rightsReview: reviewedRights(source),
      releaseIdentityBinding: reviewedReleaseBinding(source),
      evidenceQualifications: [providerOnly],
    });

  assert.equal(candidate.productSourceEligible, false);
  assert.deepEqual(
    candidate.evidenceClaimCoverage,
    ['underlying-provider'],
  );
  assert.ok(
    candidate.blockers.includes(
      'tier-a-or-b-exact-value-evidence-missing',
    ),
  );
  assert.ok(
    candidate.blockers.includes(
      'tier-a-or-b-provider-period-evidence-missing',
    ),
  );
  assert.ok(
    candidate.blockers.includes(
      'tier-a-or-b-metric-semantic-evidence-missing',
    ),
  );
});


test('cross-source exact-value and first-week period laundering stays blocked even with rights approved', () => {
  const original = observation();
  const multipleSources = createReportedAlbumSalesObservation({
    canonicalArtistId: original.canonicalArtistId,
    artistName: original.artistName,
    release: original.release,
    metricSemantic: original.metricSemantic,
    value: original.value,
    unit: original.unit,
    providerPeriodStart: original.providerPeriodStart,
    providerPeriodEnd: original.providerPeriodEnd,
    observedAt: original.observedAt,
    reportedAt: original.reportedAt,
    collectedAt: original.collectedAt,
    underlyingProvider: original.underlyingProvider,
    territory: original.territory,
    format: original.format,
    revision: original.revision,
    supportingEvidence: [
      ...original.supportingEvidence,
      {
        ...original.supportingEvidence[0],
        evidenceId: 'fixture:reported-web:period-only',
        reportingSource: 'Fixture Period Reporting',
        sourceUrl: 'https://example.com/period-only',
      },
    ],
    lifecycle: 'research',
  });
  const request =
    buildReportedAlbumSalesProductionEvidenceQualificationRequest(
      multipleSources,
    );
  const bindingFor = (
    evidenceId: string,
    supportedClaims: (
      | 'exact-value'
      | 'explicit-provider-period'
      | 'metric-semantic'
      | 'underlying-provider'
    )[],
  ) => createReportedAlbumSalesProductionEvidenceQualificationBinding({
    request,
    decision: {
      requestId: request.requestId,
      evidenceId,
      supportedClaims,
      reviewEvidenceRefs: ['review:fixture:two-source-claim-review'],
      reviewerRef: 'reviewer:music-album:fixture',
      reviewedAt: '2026-10-08T10:15:00+09:00',
    },
  });
  const valueOnly = bindingFor('fixture:reported-web:1', [
    'exact-value',
    'metric-semantic',
    'underlying-provider',
  ]);
  const periodOnly = bindingFor('fixture:reported-web:period-only', [
    'explicit-provider-period',
  ]);
  const base = {
    observation: multipleSources,
    asOfDate: '2026-10-08',
    releaseIdentityBinding: reviewedReleaseBinding(multipleSources),
    rightsReview: reviewedRights(multipleSources),
  };

  const combined = buildReportedAlbumSalesProductionSourceCandidate({
    ...base,
    evidenceQualifications: [valueOnly, periodOnly],
  });
  // All four claims are present in their union, but no reviewed Tier A/B
  // evidence links the exact quantity to the explicit seven-day period.
  assert.deepEqual(combined.evidenceClaimCoverage, [
    'exact-value',
    'explicit-provider-period',
    'metric-semantic',
    'underlying-provider',
  ]);
  assert.equal(combined.rightsState, 'authorized');
  assert.equal(combined.availability, 'available');
  assert.equal(combined.releaseIdentityReviewState, 'human-reviewed');
  assert.equal(combined.productSourceEligible, false);
  assert.equal(combined.durableNormalizedStorageEligible, false);
  assert.ok(combined.blockers.includes(
    'tier-a-or-b-exact-value-period-binding-missing',
  ));
  assert.equal(combined.numericScoreProduced, false);

  const coherent = buildReportedAlbumSalesProductionSourceCandidate({
    ...base,
    evidenceQualifications: [
      bindingFor('fixture:reported-web:1', [
        'exact-value',
        'explicit-provider-period',
        'metric-semantic',
        'underlying-provider',
      ]),
      periodOnly,
    ],
  });
  assert.equal(coherent.blockers.includes(
    'tier-a-or-b-exact-value-period-binding-missing',
  ), false);
  assert.deepEqual(coherent.blockers, []);
  assert.equal(coherent.productSourceEligible, true);
});
