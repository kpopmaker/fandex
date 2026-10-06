import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createReportedAlbumSalesObservation,
  type ReportedAlbumSalesObservationDraft,
} from '../lib/alternative-evidence/reportedAlbumSalesEvidence';
import {
  buildReportedAlbumSalesProductionSourceCandidate,
  type ReportedWebUsageReview,
} from '../lib/alternative-evidence/reportedAlbumSalesProductionSource';
import {
  buildReportedAlbumSalesImmutableEvidenceObjectCandidate,
  decodeReportedAlbumSalesImmutableEvidenceEnvelope,
} from '../lib/alternative-evidence/reportedAlbumSalesImmutableEvidenceRecord';
import {
  REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
  selectReportedAlbumSalesCurrentRelease,
  type ReportedAlbumSalesCurrentReleaseDiscovery,
} from '../lib/alternative-evidence/reportedAlbumSalesCurrentRelease';

function rights(): ReportedWebUsageReview {
  return {
    reviewStatus: 'reviewed',
    accessMode: 'manual-reviewed',
    sourceTermsState: 'allowed',
    automatedAccessState: 'not-used',
    factualValueStorageState: 'allowed',
    attributionState: 'not-required',
    commercialProductUseState: 'allowed',
    publicDerivedPublicationState: 'allowed',
    evidenceRefs: ['rights-review:test-source'],
    conditionRefs: [],
    reviewerRef: 'reviewer:legal-owner',
    reviewedAt: '2026-10-06T23:30:11+09:00',
  };
}

function draft(
  overrides: Partial<ReportedAlbumSalesObservationDraft> = {},
): ReportedAlbumSalesObservationDraft {
  return {
    canonicalArtistId: 'iu',
    artistName: 'IU',
    release: {
      canonicalReleaseId: 'release-iu-current',
      identityState: 'resolved',
      releaseTitle: 'Current Release',
      releaseDate: '2026-09-20',
      edition: null,
      skuOrBarcode: null,
      providerReleaseId: null,
    },
    metricSemantic: 'hanteo-first-week-sales',
    value: 300_000,
    unit: 'physical-copies',
    providerPeriodStart: '2026-09-20',
    providerPeriodEnd: '2026-09-26',
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
        evidenceId: 'source:current-release',
        sourceTier: 'tier-b-provider-attributed-reputable',
        reportingSource: 'Qualified reporting source',
        sourceUrl: 'https://example.com/current-release',
        sourcePublicationDate: '2026-09-27',
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

function envelope(
  overrides: Partial<ReportedAlbumSalesObservationDraft> = {},
) {
  const candidate =
    buildReportedAlbumSalesProductionSourceCandidate({
      observation: createReportedAlbumSalesObservation(
        draft(overrides),
      ),
      conflictState: 'clear',
      rightsUsageReview: rights(),
    });
  assert.equal(candidate.productionObservationEligible, true);
  const object =
    buildReportedAlbumSalesImmutableEvidenceObjectCandidate(candidate);
  return decodeReportedAlbumSalesImmutableEvidenceEnvelope(
    object.body,
  );
}

function discovery(
  overrides:
    Partial<ReportedAlbumSalesCurrentReleaseDiscovery> = {},
): ReportedAlbumSalesCurrentReleaseDiscovery {
  return {
    contractVersion:
      REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
    canonicalArtistId: 'iu',
    canonicalReleaseId: 'release-iu-current',
    releaseTitle: 'Current Release',
    releaseDate: '2026-09-20',
    identityState: 'resolved',
    latestReleaseState: 'verified-latest',
    firstWeekCompletionState: 'completed',
    providerPeriodStart: '2026-09-20',
    providerPeriodEnd: '2026-09-26',
    evidenceRefs: ['release-discovery:iu-current'],
    observedAt: '2026-09-27T00:00:00+09:00',
    collectedAt: '2026-10-06T23:30:11+09:00',
    ...overrides,
  };
}

test('verified latest release selects the single active durable observation without numeric scoring', () => {
  const result = selectReportedAlbumSalesCurrentRelease({
    discovery: discovery(),
    storedEvidence: [envelope()],
  });

  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;

  assert.equal(result.value, 300_000);
  assert.equal(result.unit, 'physical-copies');
  assert.equal(
    result.metricSemantic,
    'reported-hanteo-first-week-sales',
  );
  assert.equal(result.freshnessState, 'verified-current-release');
  assert.equal(result.conflictState, 'clear');
  assert.equal(result.numericScoreDefined, false);
  assert.ok(
    result.evidenceRefs.includes('release-discovery:iu-current'),
  );
  assert.ok(
    result.evidenceRefs.includes('source:current-release'),
  );
});

test('verified current release with incomplete first week is pending, never zero or stable', () => {
  const result = selectReportedAlbumSalesCurrentRelease({
    discovery: discovery({
      firstWeekCompletionState: 'incomplete',
      providerPeriodStart: null,
      providerPeriodEnd: null,
    }),
    storedEvidence: [],
  });

  assert.equal(result.status, 'pending');
  if (result.status !== 'pending') return;
  assert.equal(result.reason, 'first-week-incomplete');
  assert.equal(result.value, null);
  assert.equal(result.missingIsZero, false);
  assert.equal(result.missingIsStable, false);
});

test('completed first week without stored qualifying evidence remains pending rather than falling back to history', () => {
  const result = selectReportedAlbumSalesCurrentRelease({
    discovery: discovery(),
    storedEvidence: [],
  });

  assert.equal(result.status, 'pending');
  if (result.status !== 'pending') return;
  assert.equal(
    result.reason,
    'completed-first-week-evidence-not-yet-stored',
  );
  assert.equal(result.value, null);
});

test('latest release candidate is not treated as current truth', () => {
  const result = selectReportedAlbumSalesCurrentRelease({
    discovery: discovery({
      latestReleaseState: 'candidate-latest',
    }),
    storedEvidence: [envelope()],
  });

  assert.equal(result.status, 'unavailable');
  if (result.status !== 'unavailable') return;
  assert.equal(result.reason, 'latest-release-not-verified');
  assert.equal(result.freshnessState, 'unknown');
});

test('explicit correction supersedes the original durable observation', () => {
  const original = envelope();
  const corrected = envelope({
    value: 310_000,
    revision: {
      state: 'explicit-correction',
      supersedesObservationId: original.observationId,
      revisionObservedAt: '2026-10-01T00:00:00+09:00',
    },
  });

  const result = selectReportedAlbumSalesCurrentRelease({
    discovery: discovery(),
    storedEvidence: [original, corrected],
  });

  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;
  assert.equal(result.value, 310_000);
  assert.equal(result.revisionState, 'explicit-correction');
  assert.equal(
    result.observationId,
    corrected.observationId,
  );
});

test('parallel unsuperseded observations fail closed instead of choosing the larger value', () => {
  const first = envelope();
  const second = envelope({ value: 310_000 });

  const result = selectReportedAlbumSalesCurrentRelease({
    discovery: discovery(),
    storedEvidence: [first, second],
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(result.reason, 'multiple-active-observations');
});

test('discovery period must match stored provider period; release date is never used to infer it', () => {
  const result = selectReportedAlbumSalesCurrentRelease({
    discovery: discovery({
      providerPeriodStart: '2026-09-21',
      providerPeriodEnd: '2026-09-27',
    }),
    storedEvidence: [envelope()],
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(result.reason, 'discovery-period-mismatch');
});
