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
  expectedReportedAlbumSalesImmutableEvidencePath,
  REPORTED_ALBUM_SALES_IMMUTABLE_EVIDENCE_ROOT,
  REPORTED_ALBUM_SALES_IMMUTABLE_EVIDENCE_VERSION,
} from '../lib/alternative-evidence/reportedAlbumSalesImmutableEvidenceRecord';

function draft(
  overrides: Partial<ReportedAlbumSalesObservationDraft> = {},
): ReportedAlbumSalesObservationDraft {
  return {
    canonicalArtistId: 'iu',
    artistName: 'IU',
    release: {
      canonicalReleaseId: 'release-iu-lilac-2021-03-25',
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

function eligibleCandidate() {
  return buildReportedAlbumSalesProductionSourceCandidate({
    observation: createReportedAlbumSalesObservation(draft()),
    conflictState: 'clear',
    rightsUsageReview: rights(),
  });
}

test('eligible reported web candidate becomes an immutable factual/provenance object candidate without authorizing a write', () => {
  const sourceCandidate = eligibleCandidate();
  assert.equal(sourceCandidate.productionObservationEligible, true);

  const object =
    buildReportedAlbumSalesImmutableEvidenceObjectCandidate(
      sourceCandidate,
    );
  const envelope =
    decodeReportedAlbumSalesImmutableEvidenceEnvelope(object.body);

  assert.equal(
    envelope.contractVersion,
    REPORTED_ALBUM_SALES_IMMUTABLE_EVIDENCE_VERSION,
  );
  assert.equal(
    envelope.kind,
    'reported-hanteo-first-week-sales-evidence',
  );
  assert.equal(envelope.canonicalArtistId, 'iu');
  assert.equal(
    envelope.canonicalReleaseId,
    'release-iu-lilac-2021-03-25',
  );
  assert.equal(
    envelope.sourceCandidateDigest,
    object.sourceCandidateDigest,
  );
  assert.equal(
    object.pathname,
    expectedReportedAlbumSalesImmutableEvidencePath(envelope),
  );
  assert.match(
    object.pathname,
    new RegExp(
      '^'
      + REPORTED_ALBUM_SALES_IMMUTABLE_EVIDENCE_ROOT
        .replaceAll('/', '\\/')
      + '/iu/[a-f0-9]{64}\\.json$',
    ),
  );
  assert.equal(
    envelope.storedMaterialClass,
    'factual-values-and-provenance-only',
  );
  assert.equal(envelope.copyrightedExpressionStored, false);
  assert.equal(envelope.numericScoreStored, false);
  assert.equal(object.storageWriteAuthorized, false);
  assert.equal(object.productActivationAuthorized, false);
  assert.equal(object.publicPublicationAuthorized, false);
});

test('immutable payload retains stable web provenance but no article expression field', () => {
  const object =
    buildReportedAlbumSalesImmutableEvidenceObjectCandidate(
      eligibleCandidate(),
    );
  const envelope =
    decodeReportedAlbumSalesImmutableEvidenceEnvelope(object.body);

  assert.equal(
    envelope.sourceCandidate.sourceEvidence[0]?.sourceUrl,
    'https://example.com/iu-lilac',
  );
  assert.equal(
    envelope.sourceCandidate.sourceEvidence[0]?.sourcePublicationDate,
    '2021-04-01',
  );
  assert.equal(
    envelope.sourceCandidate.sourceEvidence[0]?.collectedAt,
    '2026-10-06T23:30:11+09:00',
  );
  assert.equal('articleBody' in envelope.sourceCandidate, false);
  assert.equal('articleText' in envelope.sourceCandidate, false);
  assert.equal('copyrightedExpression' in envelope.sourceCandidate, false);
});

test('blocked source candidate cannot be materialized as durable Production evidence', () => {
  const blocked =
    buildReportedAlbumSalesProductionSourceCandidate({
      observation: createReportedAlbumSalesObservation(
        draft({
          release: {
            ...draft().release,
            canonicalReleaseId: null,
            identityState: 'candidate',
          },
        }),
      ),
      conflictState: 'clear',
      rightsUsageReview: rights(),
    });

  assert.equal(blocked.productionObservationEligible, false);
  assert.throws(
    () =>
      buildReportedAlbumSalesImmutableEvidenceObjectCandidate(
        blocked,
      ),
    /immutable_source_candidate_invalid/,
  );
});

test('tampered immutable envelope fails digest validation', () => {
  const object =
    buildReportedAlbumSalesImmutableEvidenceObjectCandidate(
      eligibleCandidate(),
    );
  const parsed = JSON.parse(object.body);
  parsed.sourceCandidate.value = 999_999;

  assert.throws(
    () =>
      decodeReportedAlbumSalesImmutableEvidenceEnvelope(
        JSON.stringify(parsed),
      ),
    /immutable_payload_invalid/,
  );
});

test('path identity is derived from canonical artist plus immutable source digest', () => {
  const first =
    buildReportedAlbumSalesImmutableEvidenceObjectCandidate(
      eligibleCandidate(),
    );
  const second =
    buildReportedAlbumSalesImmutableEvidenceObjectCandidate(
      eligibleCandidate(),
    );

  assert.equal(first.pathname, second.pathname);
  assert.equal(first.payloadDigest, second.payloadDigest);
  assert.equal(first.sourceCandidateDigest, second.sourceCandidateDigest);
});
