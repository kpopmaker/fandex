import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyMusicBrainzHttpFailure,
  MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_DESCRIPTOR,
  runMusicBrainzAlbumCatalogResearchAttempt,
} from '../lib/alternative-evidence/musicbrainzProviderAvailabilityResearch';

const IU_MUSICBRAINZ_ARTIST_ID = 'b9545342-1e6d-4dae-84ac-013374ad8d7c';
const argv = [
  '--canonical-artist-id=iu',
  `--provider-artist-id=${IU_MUSICBRAINZ_ARTIST_ID}`,
];
const now = () => new Date('2026-09-16T10:33:18.000Z');
const userAgent = 'FANDEXResearchTest/0.1 (https://github.com/kpopmaker/fandex)';

const providerFixture = Object.freeze({
  'release-group-count': 1,
  'release-group-offset': 0,
  'release-groups': [
    {
      id: 'b2c99753-a266-4571-8c66-809579893470',
      title: 'Unknown Planet',
      'first-release-date': '2026-09-10',
      'primary-type': 'Single',
      'secondary-types': [],
      'artist-credit': [
        {
          name: 'IU',
          joinphrase: '',
          artist: {
            id: IU_MUSICBRAINZ_ARTIST_ID,
            name: 'IU',
          },
        },
      ],
    },
  ],
});

function dependencies(fetchImpl: typeof fetch) {
  return { fetchImpl, now, userAgent };
}

test('availability descriptor keeps failures outside Product, Missing, and zero semantics', () => {
  assert.equal(MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_DESCRIPTOR.lifecycle, 'research');
  assert.equal(MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_DESCRIPTOR.directProductContributionEligible, false);
  assert.equal(MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_DESCRIPTOR.productScorePublished, false);
  assert.equal(MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_DESCRIPTOR.productionEligible, false);
  assert.equal(MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_DESCRIPTOR.pollingAllowed, false);
  assert.equal(MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_DESCRIPTOR.automaticRetryAllowed, false);
  assert.equal(MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_DESCRIPTOR.failureNeverMeansMissing, true);
  assert.equal(MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_DESCRIPTOR.failureNeverMeansZero, true);
  assert.equal(MUSICBRAINZ_PROVIDER_AVAILABILITY_RESEARCH_DESCRIPTOR.productFallbackAllowed, false);
});

test('503 is provider unavailable or throttled, never zero or Missing, and makes exactly one request', async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return new Response('Service Unavailable', {
      status: 503,
      headers: { 'retry-after': '60' },
    });
  }) as typeof fetch;

  const result = await runMusicBrainzAlbumCatalogResearchAttempt(argv, dependencies(fetchImpl));
  assert.equal(calls, 1);
  assert.equal(result.outcome, 'not-observed');
  if (result.outcome !== 'not-observed') return;
  assert.equal(result.availabilityState, 'provider-unavailable-or-throttled');
  assert.equal(result.evidenceState, 'not-observed-provider-unavailable');
  assert.equal(result.retryDisposition, 'manual-retry-eligible');
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.productFallbackAllowed, false);
  assert.equal(result.missingEquivalent, false);
  assert.equal(result.zeroEquivalent, false);
  assert.equal(result.httpStatus, 503);
  assert.equal(result.retryAfter, '60');
  assert.equal(result.providerReleaseGroupCount, null);
  assert.equal(result.returnedCount, null);
});

test('429 is retained as explicit rate limiting without automatic retry', async () => {
  const fetchImpl = (async () => new Response('Too Many Requests', {
    status: 429,
    headers: { 'retry-after': '120' },
  })) as typeof fetch;
  const result = await runMusicBrainzAlbumCatalogResearchAttempt(argv, dependencies(fetchImpl));
  assert.equal(result.outcome, 'not-observed');
  if (result.outcome !== 'not-observed') return;
  assert.equal(result.availabilityState, 'rate-limited');
  assert.equal(result.evidenceState, 'not-observed-rate-limited');
  assert.equal(result.retryDisposition, 'manual-retry-eligible');
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.retryAfter, '120');
});

test('4xx request rejection requires investigation and cannot be treated as missing catalog data', async () => {
  const fetchImpl = (async () => new Response('Not Found', { status: 404 })) as typeof fetch;
  const result = await runMusicBrainzAlbumCatalogResearchAttempt(argv, dependencies(fetchImpl));
  assert.equal(result.outcome, 'not-observed');
  if (result.outcome !== 'not-observed') return;
  assert.equal(result.availabilityState, 'request-rejected');
  assert.equal(result.evidenceState, 'not-observed-request-rejected');
  assert.equal(result.retryDisposition, 'manual-investigation-required');
  assert.equal(result.missingEquivalent, false);
  assert.equal(result.zeroEquivalent, false);
});

test('transport failure remains not observed and is manual-retry eligible', async () => {
  const fetchImpl = (async () => {
    throw new TypeError('network unreachable');
  }) as typeof fetch;
  const result = await runMusicBrainzAlbumCatalogResearchAttempt(argv, dependencies(fetchImpl));
  assert.equal(result.outcome, 'not-observed');
  if (result.outcome !== 'not-observed') return;
  assert.equal(result.availabilityState, 'transport-failure');
  assert.equal(result.evidenceState, 'not-observed-transport-failure');
  assert.equal(result.retryDisposition, 'manual-retry-eligible');
  assert.equal(result.httpStatus, null);
  assert.equal(result.providerReleaseGroupCount, null);
});

test('AbortError is classified as transport timeout without internal retry', async () => {
  const fetchImpl = (async () => {
    const error = new Error('aborted');
    error.name = 'AbortError';
    throw error;
  }) as typeof fetch;
  const result = await runMusicBrainzAlbumCatalogResearchAttempt(argv, dependencies(fetchImpl));
  assert.equal(result.outcome, 'not-observed');
  if (result.outcome !== 'not-observed') return;
  assert.equal(result.availabilityState, 'transport-timeout');
  assert.equal(result.retryDisposition, 'manual-retry-eligible');
  assert.equal(result.automaticRetryAllowed, false);
});

test('2xx malformed JSON becomes provider data issue, not Missing', async () => {
  const fetchImpl = (async () => new Response('{not-json', {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch;
  const result = await runMusicBrainzAlbumCatalogResearchAttempt(argv, dependencies(fetchImpl));
  assert.equal(result.outcome, 'not-observed');
  if (result.outcome !== 'not-observed') return;
  assert.equal(result.availabilityState, 'provider-data-issue');
  assert.equal(result.evidenceState, 'provider-data-issue');
  assert.equal(result.retryDisposition, 'manual-investigation-required');
  assert.equal(result.missingEquivalent, false);
  assert.equal(result.zeroEquivalent, false);
});

test('2xx structurally invalid provider payload becomes provider data issue', async () => {
  const fetchImpl = (async () => new Response(JSON.stringify({ unexpected: [] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })) as typeof fetch;
  const result = await runMusicBrainzAlbumCatalogResearchAttempt(argv, dependencies(fetchImpl));
  assert.equal(result.outcome, 'not-observed');
  if (result.outcome !== 'not-observed') return;
  assert.equal(result.availabilityState, 'provider-data-issue');
  assert.match(result.errorCode, /musicbrainz_release_groups_missing/);
  assert.equal(result.returnedCount, null);
});

test('successful response yields observed page and makes exactly one request', async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return new Response(JSON.stringify(providerFixture), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
  const result = await runMusicBrainzAlbumCatalogResearchAttempt(argv, dependencies(fetchImpl));
  assert.equal(calls, 1);
  assert.equal(result.outcome, 'observed');
  if (result.outcome !== 'observed') return;
  assert.equal(result.availabilityState, 'available');
  assert.equal(result.evidenceState, 'observed');
  assert.equal(result.retryDisposition, 'not-needed');
  assert.equal(result.automaticRetryAllowed, false);
  assert.equal(result.httpStatus, 200);
  assert.equal(result.page.providerReleaseGroupCount, 1);
  assert.equal(result.page.returnedCount, 1);
});

test('HTTP classifier keeps 503 ambiguous and separates 429 from request errors', () => {
  assert.equal(classifyMusicBrainzHttpFailure(503).availabilityState, 'provider-unavailable-or-throttled');
  assert.equal(classifyMusicBrainzHttpFailure(429).availabilityState, 'rate-limited');
  assert.equal(classifyMusicBrainzHttpFailure(400).availabilityState, 'request-rejected');
});
