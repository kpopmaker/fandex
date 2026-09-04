import assert from 'node:assert/strict';
import test from 'node:test';
import { buildDirectAlbumObservation } from '../lib/alternative-evidence/directAlbumProvider';

function observation(overrides: Record<string, unknown> = {}) {
  return buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId: 'circle-chart',
    providerObservationId: null,
    providerArtistId: null,
    providerReleaseId: null,
    providerEditionId: null,
    providerSkuId: '8800000000000',
    fandexArtistId: 'artist-a',
    fandexReleaseId: 'release-a',
    fandexReleaseFamilyId: null,
    semantic: 'period-sale',
    value: 123,
    unit: 'physical-units',
    territory: null,
    format: null,
    providerPeriod: 'day:20260831',
    providerPublishedAt: null,
    observedAt: '2026-09-01T00:00:00.000Z',
    collectedAt: '2026-09-01T00:00:01.000Z',
    revisionId: null,
    revisionObservedAt: null,
    supersedesObservationId: null,
    knowledgeMode: 'current-research',
    scopeRole: 'standalone',
    parentObservationId: null,
    syntheticFixture: false,
    ...overrides,
  } as any);
}

test('observation ID is invariant to collection timestamps and FANDEX reconciliation metadata', () => {
  const first = observation();
  const reacquired = observation({
    observedAt: '2026-09-04T01:10:12.000Z',
    collectedAt: '2026-09-04T01:10:13.000Z',
    fandexArtistId: 'artist-a-reviewed-again',
    fandexReleaseId: 'release-a-reviewed-again',
    knowledgeMode: 'as-known-at-collection',
  });
  assert.equal(first.observationId, reacquired.observationId);
});

test('observation ID changes when the provider quantity changes', () => {
  assert.notEqual(observation({ value: 123 }).observationId, observation({ value: 124 }).observationId);
});

test('observation ID changes when revision identity changes', () => {
  assert.notEqual(observation({ revisionId: null }).observationId, observation({ revisionId: 'revision-1' }).observationId);
});
