import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildDirectAlbumObservation,
  type DirectAlbumObservation,
} from '../lib/alternative-evidence/directAlbumProvider';
import type {
  MusicChartCurrentReadRow,
} from '../lib/alternative-evidence/musicChartObservationHistory';
import {
  compareMusicAlbumTemporalPair,
  evaluateMusicAlbumTemporalAlignment,
} from '../lib/product/contracts/musicAlbumTemporalAlignment';

function musicRow(
  providerPeriod: string,
  overrides: Partial<MusicChartCurrentReadRow> = {},
): MusicChartCurrentReadRow {
  return Object.freeze({
    canonicalArtistId: 'iu',
    platform: 'melon',
    observationId: `music:${providerPeriod}`,
    providerPeriod,
    status: 'ranked',
    rank: 10,
    trackTitle: 'track',
    collectedAt: '2026-10-01T12:00:00+09:00',
    freshness: Object.freeze({
      referenceKind: 'collection-proxy',
      referenceAt: '2026-10-01T12:00:00+09:00',
      asOf: '2026-10-01T23:59:59+09:00',
      ageSeconds: 43199,
      thresholdApplied: false,
    }),
    scoreFieldsPresent: false,
    ...overrides,
  });
}

function albumObservation(
  providerPeriod: string,
  overrides: Partial<DirectAlbumObservation> = {},
): DirectAlbumObservation {
  const base = buildDirectAlbumObservation({
    contractVersion: 'direct-album-observation-v1',
    providerId: 'circle-chart',
    providerObservationId: `album:${providerPeriod}`,
    providerArtistId: null,
    providerReleaseId: null,
    providerEditionId: null,
    providerSkuId: '8800000000000',
    fandexArtistId: 'iu',
    fandexReleaseId: 'iu-release-1',
    fandexReleaseFamilyId: null,
    semantic: 'period-sale',
    value: 100,
    unit: 'physical-units',
    territory: 'Korea',
    format: 'physical',
    providerPeriod,
    providerPublishedAt: null,
    observedAt: '2026-10-01T13:00:00+09:00',
    collectedAt: '2026-10-01T13:01:00+09:00',
    revisionId: null,
    revisionObservedAt: null,
    supersedesObservationId: null,
    knowledgeMode: 'current-research',
    scopeRole: 'standalone',
    parentObservationId: null,
    syntheticFixture: false,
  });

  return Object.freeze({
    ...base,
    ...overrides,
  });
}

test('resolved Music day and Album day with the same window are comparable', () => {
  const pair = compareMusicAlbumTemporalPair({
    music: musicRow('daily:2026-10-01'),
    album: albumObservation('day:20261001'),
  });

  assert.equal(pair.comparability, 'comparable');
  assert.equal(pair.musicScope.kind, 'day');
  assert.equal(pair.albumScope.kind, 'day');
  assert.equal(pair.numericCombinationAllowed, false);
  assert.ok(pair.reasonCodes.includes('exact-temporal-window-match'));
});

test('current Music check-date proxy and same-day Album period are only conditionally comparable', () => {
  const pair = compareMusicAlbumTemporalPair({
    music: musicRow('daily-check-date:2026-10-01'),
    album: albumObservation('day:20261001'),
  });

  assert.equal(pair.comparability, 'conditionally-comparable');
  assert.equal(pair.musicScope.resolution, 'proxy');
  assert.ok(
    pair.reasonCodes.includes('music-date-proxy-overlaps-album-period'),
  );
});

test('Music date proxy inside an explicit Hanteo weekly range is conditionally comparable', () => {
  const pair = compareMusicAlbumTemporalPair({
    music: musicRow('realtime-check-date:2026-10-01', {
      platform: 'bugs',
    }),
    album: albumObservation(
      'week:집계 기준 (KST) : 2026.09.28 ~ 2026.10.04',
      { providerId: 'hanteo-chart' },
    ),
  });

  assert.equal(pair.comparability, 'conditionally-comparable');
  assert.equal(pair.albumScope.kind, 'week');
  assert.equal(pair.albumScope.resolution, 'resolved');
  assert.equal(pair.numericCombinationAllowed, false);
});

test('Circle week anchor without an explicit range remains not comparable', () => {
  const pair = compareMusicAlbumTemporalPair({
    music: musicRow('daily-check-date:2026-10-01'),
    album: albumObservation('week:20261001'),
  });

  assert.equal(pair.comparability, 'not-comparable');
  assert.equal(pair.albumScope.resolution, 'unresolved');
  assert.ok(pair.reasonCodes.includes('album-week-range-unresolved'));
});

test('non-overlapping resolved periods are not comparable', () => {
  const pair = compareMusicAlbumTemporalPair({
    music: musicRow('daily:2026-10-01'),
    album: albumObservation('day:20260930'),
  });

  assert.equal(pair.comparability, 'not-comparable');
  assert.ok(pair.reasonCodes.includes('temporal-ranges-do-not-overlap'));
});

test('alignment methodology can be defined while current evidence is not evaluable', () => {
  const result = evaluateMusicAlbumTemporalAlignment({
    musicRows: [
      musicRow('daily-check-date:2026-10-01'),
    ],
    albumObservations: [],
  });

  assert.equal(result.methodologyDefined, true);
  assert.equal(result.state, 'not-evaluable');
  assert.equal(result.numericCombinationAllowed, false);
  assert.equal(result.scoreFieldsPresent, false);
  assert.equal(result.pairs.length, 0);
});

test('an Album observation is conditionally aligned when any Music source overlaps without inventing a score', () => {
  const result = evaluateMusicAlbumTemporalAlignment({
    musicRows: [
      musicRow('daily-check-date:2026-10-01'),
      musicRow('daily-check-date:2026-10-01', {
        platform: 'genie',
        observationId: 'music:genie:2026-10-01',
      }),
      musicRow('realtime-check-date:2026-10-01', {
        platform: 'bugs',
        observationId: 'music:bugs:2026-10-01',
      }),
    ],
    albumObservations: [
      albumObservation('day:20261001'),
    ],
  });

  assert.equal(result.state, 'conditionally-aligned');
  assert.equal(result.alignedAlbumObservationIds.length, 1);
  assert.equal(result.unalignedAlbumObservationIds.length, 0);
  assert.equal(result.numericCombinationAllowed, false);
  assert.equal('score' in result, false);
  assert.equal('point' in result, false);
});
