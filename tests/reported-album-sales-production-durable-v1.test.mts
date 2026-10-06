import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createReportedAlbumSalesObservation,
  type ReportedAlbumSalesObservation,
} from '../lib/alternative-evidence/reportedAlbumSalesEvidence';
import {
  buildReportedAlbumSalesProductionIdentityReviewRequest,
  createReportedAlbumSalesProductionIdentityBinding,
} from '../lib/alternative-evidence/reportedAlbumSalesProductionIdentity';
import {
  buildReportedAlbumSalesProductionSourceCandidate,
} from '../lib/alternative-evidence/reportedAlbumSalesProductionSource';
import {
  buildReportedWebUsageReviewRequest,
  materializeReportedWebUsageReview,
} from '../lib/alternative-evidence/reportedWebUsageReviewRequest';
import {
  buildReportedAlbumSalesImmutableEvidenceObjectCandidate,
  decodeReportedAlbumSalesImmutableEvidenceEnvelope,
  expectedReportedAlbumSalesImmutableEvidencePath,
} from '../lib/alternative-evidence/reportedAlbumSalesImmutableEvidenceRecord';
import {
  REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
  selectReportedAlbumSalesCurrentRelease,
} from '../lib/alternative-evidence/reportedAlbumSalesCurrentRelease';
import {
  buildReportedAlbumSalesCurrentReleaseReviewRequest,
  createReportedAlbumSalesCurrentReleaseBinding,
} from '../lib/alternative-evidence/reportedAlbumSalesCurrentReleaseReview';
import {
  readReportedAlbumSalesStoredEvidenceRuntime,
} from '../lib/product/runtime/reportedAlbumSalesStoredEvidenceRuntime';
import type {
  ImmutableTextObjectStore,
} from '../lib/server/storage/immutableTextObjectStore';

function observation(input: Readonly<{
  value?: number;
  revision?: Readonly<{
    state: 'original' | 'explicit-correction';
    supersedesObservationId: string | null;
    revisionObservedAt: string | null;
  }>;
}> = {}): ReportedAlbumSalesObservation {
  return createReportedAlbumSalesObservation({
    canonicalArtistId: 'iu',
    artistName: 'IU',
    release: {
      canonicalReleaseId: null,
      identityState: 'candidate',
      releaseTitle: 'Current Physical Album',
      releaseDate: '2026-10-01',
      edition: null,
      skuOrBarcode: null,
      providerReleaseId: null,
    },
    metricSemantic: 'hanteo-first-week-sales',
    value: input.value ?? 300_000,
    unit: 'physical-copies',
    providerPeriodStart: '2026-10-01',
    providerPeriodEnd: '2026-10-07',
    observedAt: null,
    reportedAt: null,
    collectedAt: '2026-10-08T09:00:00+09:00',
    underlyingProvider: 'Hanteo Chart',
    territory: null,
    format: 'physical-album',
    revision: input.revision ?? {
      state: 'original',
      supersedesObservationId: null,
      revisionObservedAt: null,
    },
    supportingEvidence: [
      {
        evidenceId: 'fixture:reported-web:current',
        sourceTier: 'tier-b-provider-attributed-reputable',
        reportingSource: 'Qualified Reporting Source',
        sourceUrl: 'https://example.com/current',
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
  source: ReportedAlbumSalesObservation,
) {
  const request = buildReportedWebUsageReviewRequest({
    observation: source,
    rightsReviewReferences: [
      {
        referenceId: 'fixture:rights:durable',
        sourceUrl: 'https://example.com/rights',
        kind: 'legal-review-memo',
        observedAt: '2026-10-08T10:05:00+09:00',
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
      evidenceRefs: ['legal-review:reported-web:durable'],
      conditionRefs: ['condition:factual-values-only'],
      reviewerRef: 'reviewer:rights:durable',
      reviewedAt: '2026-10-08T10:10:00+09:00',
    },
  });
}

function eligibleCandidate(source: ReportedAlbumSalesObservation) {
  const request =
    buildReportedAlbumSalesProductionIdentityReviewRequest(source);
  const binding =
    createReportedAlbumSalesProductionIdentityBinding({
      request,
      decision: {
        requestId: request.requestId,
        canonicalReleaseId:
          'release:iu:current-physical-album:2026-10-01',
        supportingEvidenceRefs: [
          'canonical-release-registry:iu:current-physical-album',
        ],
        reviewerRef: 'reviewer:music-album:fixture',
        reviewedAt: '2026-10-08T10:00:00+09:00',
      },
    });

  const candidate =
    buildReportedAlbumSalesProductionSourceCandidate({
      observation: source,
      asOfDate: '2026-10-08',
      rightsReview: reviewedRights(source),
      releaseIdentityBinding: binding,
    });
  assert.equal(candidate.productSourceEligible, true);
  return candidate;
}

function envelope(source: ReportedAlbumSalesObservation) {
  const object =
    buildReportedAlbumSalesImmutableEvidenceObjectCandidate(
      eligibleCandidate(source),
    );
  return {
    object,
    envelope:
      decodeReportedAlbumSalesImmutableEvidenceEnvelope(
        object.body,
      ),
  };
}

function currentReleaseBinding() {
  const request =
    buildReportedAlbumSalesCurrentReleaseReviewRequest({
      canonicalArtistId: 'iu',
      releaseTitle: 'Current Physical Album',
      releaseDate: '2026-10-01',
      candidateCanonicalReleaseId:
        'release:iu:current-physical-album:2026-10-01',
      evidenceRefs: [
        'release-discovery:iu:current-physical-album',
      ],
    });
  return createReportedAlbumSalesCurrentReleaseBinding({
    request,
    decision: {
      requestId: request.requestId,
      conclusion: 'verified-latest-physical-release',
      canonicalReleaseId:
        'release:iu:current-physical-album:2026-10-01',
      supportingEvidenceRefs: [
        'release-discovery:iu:current-physical-album',
      ],
      reviewerRef: 'reviewer:music-album:current-release',
      reviewedAt: '2026-10-08T10:30:00+09:00',
    },
  });
}

function readStore(input: Readonly<{
  pathnames: readonly string[];
  bodies: Readonly<Record<string, string>>;
}>): Pick<ImmutableTextObjectStore, 'readText' | 'listPathnames'> {
  return Object.freeze({
    async listPathnames(prefix: string) {
      return Object.freeze(
        input.pathnames.filter(pathname =>
          pathname.startsWith(prefix)),
      );
    },
    async readText(pathname: string) {
      return input.bodies[pathname] ?? null;
    },
  });
}

test('eligible reviewed web evidence becomes an immutable factual/provenance envelope without authorizing a write', () => {
  const { object, envelope: decoded } =
    envelope(observation());

  assert.equal(
    decoded.storedMaterialClass,
    'factual-values-and-provenance-only',
  );
  assert.equal(decoded.copyrightedExpressionStored, false);
  assert.equal(decoded.numericScoreStored, false);
  assert.equal(
    object.pathname,
    expectedReportedAlbumSalesImmutableEvidencePath(decoded),
  );
  assert.equal(object.storageWriteAuthorized, false);
  assert.equal(object.productActivationAuthorized, false);
  assert.equal(object.publicPublicationAuthorized, false);
  assert.equal(
    decoded.sourceCandidate.directProviderClaim,
    false,
  );
  assert.equal(
    decoded.sourceCandidate.licensedFeedClaim,
    false,
  );
});

test('durable runtime reader validates immutable envelope and path binding', async () => {
  const { object, envelope: decoded } =
    envelope(observation());
  const result =
    await readReportedAlbumSalesStoredEvidenceRuntime({
      canonicalArtistId: 'iu',
      store: readStore({
        pathnames: [object.pathname],
        bodies: {
          [object.pathname]: object.body,
        },
      }),
    });

  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  assert.equal(result.evidence.length, 1);
  assert.equal(
    result.evidence[0]?.payloadDigest,
    decoded.payloadDigest,
  );
  assert.equal(result.pathnames[0], object.pathname);
});

test('tampered durable evidence fails closed', async () => {
  const { object } = envelope(observation());
  const parsed = JSON.parse(object.body);
  parsed.sourceCandidate.value = 999_999;

  const result =
    await readReportedAlbumSalesStoredEvidenceRuntime({
      canonicalArtistId: 'iu',
      store: readStore({
        pathnames: [object.pathname],
        bodies: {
          [object.pathname]: JSON.stringify(parsed),
        },
      }),
    });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(result.reason, 'stored-evidence-object-invalid');
});

test('verified latest physical release selects exactly one active durable observation', () => {
  const current = envelope(observation()).envelope;
  const result = selectReportedAlbumSalesCurrentRelease({
    discovery: {
      contractVersion:
        REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
      canonicalArtistId: 'iu',
      releaseScope: 'physical-album-eligible',
      canonicalReleaseId:
        'release:iu:current-physical-album:2026-10-01',
      releaseTitle: 'Current Physical Album',
      releaseDate: '2026-10-01',
      identityState: 'resolved',
      latestReleaseState: 'verified-latest',
      firstWeekCompletionState: 'completed',
      providerPeriodStart: '2026-10-01',
      providerPeriodEnd: '2026-10-07',
      evidenceRefs: [
        'release-discovery:iu:current-physical-album',
      ],
      observedAt: '2026-10-08T08:00:00+09:00',
      collectedAt: '2026-10-08T09:00:00+09:00',
    },
    currentReleaseBinding: currentReleaseBinding(),
    storedEvidence: [current],
  });

  assert.equal(result.status, 'available');
  if (result.status !== 'available') return;
  assert.equal(result.value, 300_000);
  assert.equal(result.unit, 'physical-copies');
  assert.equal(
    result.metricSemantic,
    'reported-hanteo-first-week-sales',
  );
  assert.equal(
    result.freshnessState,
    'verified-current-release',
  );
  assert.equal(result.numericScoreDefined, false);
});

test('incomplete first week remains pending and never becomes zero or stable', () => {
  const result = selectReportedAlbumSalesCurrentRelease({
    discovery: {
      contractVersion:
        REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
      canonicalArtistId: 'iu',
      releaseScope: 'physical-album-eligible',
      canonicalReleaseId:
        'release:iu:current-physical-album:2026-10-01',
      releaseTitle: 'Current Physical Album',
      releaseDate: '2026-10-01',
      identityState: 'resolved',
      latestReleaseState: 'verified-latest',
      firstWeekCompletionState: 'incomplete',
      providerPeriodStart: null,
      providerPeriodEnd: null,
      evidenceRefs: ['release-discovery:iu:current'],
      observedAt: '2026-10-05T08:00:00+09:00',
      collectedAt: '2026-10-05T09:00:00+09:00',
    },
    currentReleaseBinding: currentReleaseBinding(),
    storedEvidence: [],
  });

  assert.equal(result.status, 'pending');
  if (result.status !== 'pending') return;
  assert.equal(result.reason, 'first-week-incomplete');
  assert.equal(result.value, null);
  assert.equal(result.missingIsZero, false);
  assert.equal(result.missingIsStable, false);
});

test('parallel unsuperseded observations fail closed instead of selecting the larger value', () => {
  const first = envelope(observation({ value: 300_000 })).envelope;
  const second = envelope(observation({ value: 310_000 })).envelope;

  const result = selectReportedAlbumSalesCurrentRelease({
    discovery: {
      contractVersion:
        REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
      canonicalArtistId: 'iu',
      releaseScope: 'physical-album-eligible',
      canonicalReleaseId:
        'release:iu:current-physical-album:2026-10-01',
      releaseTitle: 'Current Physical Album',
      releaseDate: '2026-10-01',
      identityState: 'resolved',
      latestReleaseState: 'verified-latest',
      firstWeekCompletionState: 'completed',
      providerPeriodStart: '2026-10-01',
      providerPeriodEnd: '2026-10-07',
      evidenceRefs: ['release-discovery:iu:current'],
      observedAt: '2026-10-08T08:00:00+09:00',
      collectedAt: '2026-10-08T09:00:00+09:00',
    },
    currentReleaseBinding: currentReleaseBinding(),
    storedEvidence: [first, second],
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(result.reason, 'multiple-active-observations');
});


test('verified-latest discovery without a reviewed current-release binding fails closed', () => {
  const current = envelope(observation()).envelope;
  const result = selectReportedAlbumSalesCurrentRelease({
    discovery: {
      contractVersion:
        REPORTED_ALBUM_SALES_CURRENT_RELEASE_VERSION,
      canonicalArtistId: 'iu',
      releaseScope: 'physical-album-eligible',
      canonicalReleaseId:
        'release:iu:current-physical-album:2026-10-01',
      releaseTitle: 'Current Physical Album',
      releaseDate: '2026-10-01',
      identityState: 'resolved',
      latestReleaseState: 'verified-latest',
      firstWeekCompletionState: 'completed',
      providerPeriodStart: '2026-10-01',
      providerPeriodEnd: '2026-10-07',
      evidenceRefs: ['release-discovery:iu:current'],
      observedAt: '2026-10-08T08:00:00+09:00',
      collectedAt: '2026-10-08T09:00:00+09:00',
    },
    currentReleaseBinding: null,
    storedEvidence: [current],
  });

  assert.equal(result.status, 'data-issue');
  if (result.status !== 'data-issue') return;
  assert.equal(
    result.reason,
    'current-release-review-binding-invalid',
  );
});
