import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createReportedAlbumSalesObservation,
  type ReportedAlbumSalesObservationDraft,
} from '../lib/alternative-evidence/reportedAlbumSalesEvidence';
import {
  buildReportedAlbumSalesProductionSourceCandidate,
  REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_VERSION,
  type ReportedWebUsageReview,
} from '../lib/alternative-evidence/reportedAlbumSalesProductionSource';

function draft(
  overrides: Partial<ReportedAlbumSalesObservationDraft> = {},
): ReportedAlbumSalesObservationDraft {
  return {
    canonicalArtistId: 'iu',
    artistName: 'IU',
    release: {
      canonicalReleaseId: 'release:iu:lilac:2021-03-25',
      identityState: 'resolved',
      releaseTitle: 'LILAC',
      releaseDate: '2021-03-25',
      edition: null,
      skuOrBarcode: null,
      providerReleaseId: null,
    },
    metricSemantic: 'hanteo-first-week-sales',
    value: 278_414,
    unit: 'physical-copies',
    providerPeriodStart: '2021-03-25',
    providerPeriodEnd: '2021-03-31',
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
        evidenceId: 'source:iu-lilac:hanteo-first-week',
        sourceTier: 'tier-b-provider-attributed-reputable',
        reportingSource: 'Qualified reporting source',
        sourceUrl: 'https://example.com/iu-lilac',
        sourcePublicationDate: '2021-04-01',
        sourcePublishedAt: null,
        reportedAt: null,
        collectedAt: '2026-10-06T23:30:11+09:00',
        extractionMethod: 'manual-reviewed-web-research',
        underlyingProvider: 'Hanteo Chart',
      },
    ],
    lifecycle: 'research',
    ...overrides,
  };
}

function rights(
  overrides: Partial<ReportedWebUsageReview> = {},
): ReportedWebUsageReview {
  return {
    reviewStatus: 'reviewed',
    accessMode: 'manual-reviewed',
    sourceTermsState: 'allowed',
    automatedAccessState: 'not-used',
    factualValueStorageState: 'allowed',
    attributionState: 'not-required',
    commercialProductUseState: 'allowed',
    publicDerivedPublicationState: 'allowed',
    evidenceRefs: ['rights-review:source:iu-lilac'],
    conditionRefs: [],
    reviewerRef: 'reviewer:legal-owner',
    reviewedAt: '2026-10-06T23:30:11+09:00',
    ...overrides,
  };
}

test('resolved Tier A/B public reporting evidence can become a Production observation candidate without pretending to be a licensed feed', () => {
  const candidate =
    buildReportedAlbumSalesProductionSourceCandidate({
      observation: createReportedAlbumSalesObservation(draft()),
      conflictState: 'clear',
      rightsUsageReview: rights(),
    });

  assert.equal(
    candidate.contractVersion,
    REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_VERSION,
  );
  assert.equal(candidate.sourceType, 'reported-web-evidence');
  assert.equal(candidate.observationSource, 'public-reporting-source');
  assert.equal(candidate.extractionMethod, 'reviewed-web-evidence');
  assert.equal(candidate.underlyingProvider, 'Hanteo Chart');
  assert.equal(
    candidate.metricSemantic,
    'reported-hanteo-first-week-sales',
  );
  assert.equal(
    candidate.underlyingMetricSemantic,
    'hanteo-first-week-sales',
  );
  assert.equal(candidate.lifecycle, 'production-candidate');
  assert.equal(candidate.productionObservationEligible, true);
  assert.deepEqual(candidate.blockers, []);
  assert.equal(candidate.licensedFeedClaimAllowed, false);
  assert.equal(candidate.directProviderApiClaimAllowed, false);
  assert.equal(candidate.directProviderReplacementAllowed, false);
  assert.equal(candidate.productActivationAuthorized, false);
  assert.equal(candidate.productPublicationAuthorized, false);
  assert.equal(candidate.numericScoreDefined, false);
  assert.equal(
    candidate.storedMaterialClass,
    'factual-values-and-provenance-only',
  );
  assert.equal(candidate.copyrightedExpressionStored, false);
});

test('research candidate identity is not silently promoted into a Production observation', () => {
  const observation = createReportedAlbumSalesObservation(
    draft({
      release: {
        ...draft().release,
        canonicalReleaseId: null,
        identityState: 'candidate',
      },
    }),
  );

  const candidate =
    buildReportedAlbumSalesProductionSourceCandidate({
      observation,
      conflictState: 'clear',
      rightsUsageReview: rights(),
    });

  assert.equal(candidate.productionObservationEligible, false);
  assert.ok(
    candidate.blockers.includes(
      'canonical-release-identity-not-resolved',
    ),
  );
});

test('Tier C discovery-only evidence remains ineligible for Production', () => {
  const observation = createReportedAlbumSalesObservation(
    draft({
      supportingEvidence: [
        {
          ...draft().supportingEvidence[0],
          sourceTier: 'tier-c-discovery-only',
        },
      ],
    }),
  );

  const candidate =
    buildReportedAlbumSalesProductionSourceCandidate({
      observation,
      conflictState: 'clear',
      rightsUsageReview: rights(),
    });

  assert.equal(candidate.productionObservationEligible, false);
  assert.ok(
    candidate.blockers.includes(
      'tier-a-or-b-production-source-required',
    ),
  );
  assert.deepEqual(candidate.qualifyingEvidenceRefs, []);
  assert.deepEqual(
    candidate.discoveryEvidenceRefs,
    ['source:iu-lilac:hanteo-first-week'],
  );
});

test('unknown commercial/public usage does not become an implicit web Production authorization', () => {
  const candidate =
    buildReportedAlbumSalesProductionSourceCandidate({
      observation: createReportedAlbumSalesObservation(draft()),
      conflictState: 'clear',
      rightsUsageReview: rights({
        commercialProductUseState: 'unknown',
        publicDerivedPublicationState: 'unknown',
      }),
    });

  assert.equal(candidate.productionObservationEligible, false);
  assert.ok(
    candidate.blockers.includes(
      'rights-commercial-product-use-not-cleared',
    ),
  );
  assert.ok(
    candidate.blockers.includes(
      'rights-public-derived-publication-not-cleared',
    ),
  );
});

test('conflicting observations and unresolved possible corrections fail closed', () => {
  const observation = createReportedAlbumSalesObservation(
    draft({
      revision: {
        state: 'possible-correction',
        supersedesObservationId: null,
        revisionObservedAt: '2026-10-06T23:30:11+09:00',
      },
    }),
  );

  const candidate =
    buildReportedAlbumSalesProductionSourceCandidate({
      observation,
      conflictState: 'conflicting',
      rightsUsageReview: rights(),
    });

  assert.equal(candidate.productionObservationEligible, false);
  assert.ok(
    candidate.blockers.includes('observation-conflict-unresolved'),
  );
  assert.ok(
    candidate.blockers.includes(
      'revision-possible-correction-unresolved',
    ),
  );
});

test('explicit provider-period boundaries must themselves form a seven-day first-week period', () => {
  const observation = createReportedAlbumSalesObservation(
    draft({
      providerPeriodEnd: '2021-04-01',
    }),
  );

  const candidate =
    buildReportedAlbumSalesProductionSourceCandidate({
      observation,
      conflictState: 'clear',
      rightsUsageReview: rights(),
    });

  assert.equal(candidate.productionObservationEligible, false);
  assert.ok(
    candidate.blockers.includes(
      'provider-period-not-explicit-seven-day',
    ),
  );
});

test('manual-reviewed ingestion does not claim automated access rights', () => {
  const candidate =
    buildReportedAlbumSalesProductionSourceCandidate({
      observation: createReportedAlbumSalesObservation(draft()),
      conflictState: 'clear',
      rightsUsageReview: rights({
        automatedAccessState: 'allowed',
      }),
    });

  assert.equal(candidate.productionObservationEligible, false);
  assert.ok(
    candidate.blockers.includes(
      'rights-automated-access-state-inconsistent',
    ),
  );
});
