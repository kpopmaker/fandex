import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateMusicAlbumReportedWebProductReadiness,
  MUSIC_ALBUM_REPORTED_WEB_PRODUCT_READINESS_VERSION,
} from '../lib/product/readiness/musicAlbumReportedWebProductReadiness';
import type {
  ReportedAlbumSalesCurrentReleaseRead,
} from '../lib/alternative-evidence/reportedAlbumSalesCurrentRelease';

function available(): ReportedAlbumSalesCurrentReleaseRead {
  return {
    status: 'available',
    contractVersion: 'reported-album-sales-current-release-v1',
    canonicalArtistId: 'iu',
    canonicalReleaseId: 'release:iu:test',
    releaseTitle: 'Test Album',
    releaseDate: '2026-10-01',
    metricSemantic: 'reported-hanteo-first-week-sales',
    value: 123_456,
    unit: 'physical-copies',
    providerPeriodStart: '2026-10-01',
    providerPeriodEnd: '2026-10-07',
    observationId: 'observation:test',
    observationScopeId: 'scope:test',
    evidenceDigest: 'a'.repeat(64),
    sourceCandidateDigest: 'b'.repeat(64),
    evidenceRefs: ['source:test'],
    freshnessState: 'verified-current-release',
    conflictState: 'clear',
    revisionState: 'original',
    lifecycle: 'production-candidate',
    numericScoreDefined: false,
  };
}

test('a valid current reported-web observation can clear source gates without pretending methodology or activation is approved', () => {
  const readiness =
    evaluateMusicAlbumReportedWebProductReadiness(available());

  assert.equal(
    readiness.contractVersion,
    MUSIC_ALBUM_REPORTED_WEB_PRODUCT_READINESS_VERSION,
  );
  assert.equal(
    readiness.state,
    'source-ready-methodology-blocked',
  );
  assert.equal(
    readiness.checks['current-observation-available'],
    true,
  );
  assert.equal(
    readiness.checks['reported-web-rights-reviewed'],
    true,
  );
  assert.equal(
    readiness.checks['final-product-methodology-approved'],
    false,
  );
  assert.equal(readiness.methodologyLocked, false);
  assert.equal(readiness.productValue, null);
  assert.equal(readiness.numericProductEligible, false);
  assert.equal(readiness.productActivationAuthorized, false);
  assert.equal(readiness.publicPublicationAuthorized, false);
  assert.equal(
    readiness.directProviderAuthorizationRequiredForThisTrack,
    false,
  );
  assert.equal(
    readiness.licensedProviderRequiredForThisTrack,
    false,
  );
  assert.deepEqual(
    readiness.blockers,
    [
      'final-product-methodology-approved',
      'product-activation-authorized',
      'public-publication-authorized',
    ],
  );
});

test('current IU gap stays source-blocked without falling back to direct-provider authorization', () => {
  const current: ReportedAlbumSalesCurrentReleaseRead = {
    status: 'unavailable',
    contractVersion: 'reported-album-sales-current-release-v1',
    canonicalArtistId: 'iu',
    reason: 'latest-release-not-verified',
    freshnessState: 'unknown',
    value: null,
    unit: null,
    missingIsZero: false,
    missingIsStable: false,
  };

  const readiness =
    evaluateMusicAlbumReportedWebProductReadiness(current);

  assert.equal(readiness.state, 'source-blocked');
  assert.equal(
    readiness.checks['current-physical-release-verified'],
    false,
  );
  assert.equal(
    readiness.checks['current-observation-available'],
    false,
  );
  assert.equal(
    readiness.directProviderAuthorizationRequiredForThisTrack,
    false,
  );
  assert.equal(
    readiness.licensedProviderRequiredForThisTrack,
    false,
  );
  assert.equal(readiness.productValue, null);
});

test('reported-web readiness never derives a numeric score from the first-week value', () => {
  const readiness =
    evaluateMusicAlbumReportedWebProductReadiness(available());
  const serialized = JSON.stringify(readiness);

  assert.equal(serialized.includes('"score"'), false);
  assert.equal(serialized.includes('"weight"'), false);
  assert.equal(serialized.includes('"normalization"'), false);
});
