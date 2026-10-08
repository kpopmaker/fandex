import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createReportedAlbumSalesObservation,
} from '../lib/alternative-evidence/reportedAlbumSalesEvidence';
import {
  buildReportedAlbumSalesProductionEvidenceQualificationRequest,
  createReportedAlbumSalesProductionEvidenceQualificationBinding,
  validateReportedAlbumSalesProductionEvidenceQualificationBinding,
} from '../lib/alternative-evidence/reportedAlbumSalesProductionEvidenceQualification';

function observation(sourceTier:
  | 'tier-a-primary-official'
  | 'tier-b-provider-attributed-reputable'
  | 'tier-c-discovery-only' =
    'tier-b-provider-attributed-reputable') {
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
    supportingEvidence: [{
      evidenceId: 'fixture:qualified-source',
      sourceTier,
      reportingSource: 'Fixture Reporting Source',
      sourceUrl: 'https://example.com/qualified',
      sourcePublicationDate: '2026-10-08',
      sourcePublishedAt: '2026-10-08T08:00:00+09:00',
      reportedAt: null,
      collectedAt: '2026-10-08T09:00:00+09:00',
      extractionMethod: 'manual-reviewed-web-research',
      underlyingProvider: 'Hanteo Chart',
    }],
    lifecycle: 'research',
  });
}

test('human review can bind Tier A/B evidence to the exact value and explicit provider period claims', () => {
  const source = observation();
  const request =
    buildReportedAlbumSalesProductionEvidenceQualificationRequest(
      source,
    );
  const binding =
    createReportedAlbumSalesProductionEvidenceQualificationBinding({
      request,
      decision: {
        requestId: request.requestId,
        evidenceId: 'fixture:qualified-source',
        supportedClaims: [
          'exact-value',
          'explicit-provider-period',
          'metric-semantic',
          'underlying-provider',
        ],
        reviewEvidenceRefs: [
          'review:fixture:qualified-source',
        ],
        reviewerRef: 'reviewer:music-album:fixture',
        reviewedAt: '2026-10-08T10:20:00+09:00',
      },
    });

  assert.deepEqual(
    [...binding.supportedClaims].sort(),
    [
      'exact-value',
      'explicit-provider-period',
      'metric-semantic',
      'underlying-provider',
    ].sort(),
  );
  assert.equal(binding.confirmedValue, 123_456);
  assert.equal(binding.confirmedUnit, 'physical-copies');
  assert.equal(
    binding.confirmedProviderPeriodStart,
    '2026-10-01',
  );
  assert.equal(
    binding.confirmedProviderPeriodEnd,
    '2026-10-07',
  );
  assert.equal(
    validateReportedAlbumSalesProductionEvidenceQualificationBinding(
      binding,
      source,
    ),
    true,
  );
});

test('Tier C discovery evidence cannot receive a Production qualification binding', () => {
  const source = observation('tier-c-discovery-only');
  const request =
    buildReportedAlbumSalesProductionEvidenceQualificationRequest(
      source,
    );

  assert.throws(
    () =>
      createReportedAlbumSalesProductionEvidenceQualificationBinding({
        request,
        decision: {
          requestId: request.requestId,
          evidenceId: 'fixture:qualified-source',
          supportedClaims: [
            'exact-value',
            'explicit-provider-period',
          ],
          reviewEvidenceRefs: ['review:fixture'],
          reviewerRef: 'reviewer:fixture',
          reviewedAt: '2026-10-08T10:20:00+09:00',
        },
      }),
    /source_ineligible/,
  );
});

test('claim binding is observation-specific and fails after value mutation', () => {
  const source = observation();
  const request =
    buildReportedAlbumSalesProductionEvidenceQualificationRequest(
      source,
    );
  const binding =
    createReportedAlbumSalesProductionEvidenceQualificationBinding({
      request,
      decision: {
        requestId: request.requestId,
        evidenceId: 'fixture:qualified-source',
        supportedClaims: [
          'exact-value',
          'explicit-provider-period',
          'metric-semantic',
          'underlying-provider',
        ],
        reviewEvidenceRefs: ['review:fixture'],
        reviewerRef: 'reviewer:fixture',
        reviewedAt: '2026-10-08T10:20:00+09:00',
      },
    });
  const changed = createReportedAlbumSalesObservation({
    canonicalArtistId: 'iu',
    artistName: 'IU',
    release: source.release,
    metricSemantic: source.metricSemantic,
    value: 123_457,
    unit: source.unit,
    providerPeriodStart: source.providerPeriodStart,
    providerPeriodEnd: source.providerPeriodEnd,
    observedAt: source.observedAt,
    reportedAt: source.reportedAt,
    collectedAt: source.collectedAt,
    underlyingProvider: source.underlyingProvider,
    territory: source.territory,
    format: source.format,
    revision: source.revision,
    supportingEvidence: source.supportingEvidence,
    lifecycle: 'research',
  });

  assert.equal(
    validateReportedAlbumSalesProductionEvidenceQualificationBinding(
      binding,
      changed,
    ),
    false,
  );
});

test('partial Tier B claim review is preserved but does not pretend to cover absent claims', () => {
  const source = observation();
  const request =
    buildReportedAlbumSalesProductionEvidenceQualificationRequest(
      source,
    );
  const binding =
    createReportedAlbumSalesProductionEvidenceQualificationBinding({
      request,
      decision: {
        requestId: request.requestId,
        evidenceId: 'fixture:qualified-source',
        supportedClaims: ['underlying-provider'],
        reviewEvidenceRefs: ['review:fixture'],
        reviewerRef: 'reviewer:fixture',
        reviewedAt: '2026-10-08T10:20:00+09:00',
      },
    });

  assert.deepEqual(binding.supportedClaims, ['underlying-provider']);
  assert.equal(binding.confirmedValue, null);
  assert.equal(binding.confirmedProviderPeriodStart, null);
  assert.equal(binding.confirmedMetricSemantic, null);
  assert.equal(binding.confirmedUnderlyingProvider, 'Hanteo Chart');
});
