import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildMusicChartObservation,
  evaluateMusicChartCurrentPresenceReadiness,
  musicChartStatusIsZeroValue,
  type MusicChartObservationDraft,
  type MusicChartPlatform,
} from '../lib/alternative-evidence/musicChartObservation';

const coverage = Object.freeze({
  startRank: 1,
  endRank: 100,
  evidenceIds: Object.freeze(['provider-chart-complete:melon:2026-09-30']),
});

function draft(
  platform: MusicChartPlatform,
  overrides: Partial<MusicChartObservationDraft> = {},
): MusicChartObservationDraft {
  return {
    canonicalArtistId: 'iu',
    artistLabel: '아이유',
    platform,
    chartName: platform === 'melon' ? 'TOP100' : platform === 'genie' ? 'Top 200 Daily' : 'Bugs Realtime',
    chartType: platform === 'bugs' ? 'realtime' : 'daily',
    providerPeriod: platform === 'bugs'
      ? 'realtime:2026-09-30T11:42:10+09:00'
      : 'daily:2026-09-30',
    observedAt: null,
    collectedAt: '2026-09-30T11:42:10+09:00',
    status: 'ranked',
    rank: 11,
    trackTitle: '이 별로부터',
    coverage,
    sourceKeys: [platform === 'melon' ? 'melon_top100' : platform === 'genie' ? 'genie_daily_page_1|2|3|4' : 'bugs_realtime'],
    evidenceFile: 'provider-evidence.json',
    sourceVersion: 'music-provider-v1',
    failureCode: null,
    unsupportedReason: null,
    ...overrides,
  };
}

test('ranked observation preserves raw rank without creating a score', () => {
  const observation = buildMusicChartObservation(draft('melon'));
  assert.equal(observation.status, 'ranked');
  assert.equal(observation.rank, 11);
  assert.equal('score' in observation, false);
  assert.equal('point' in observation, false);
});

test('not-ranked is valid only with complete chart coverage and is never represented as zero', () => {
  const observation = buildMusicChartObservation(draft('melon', {
    status: 'not-ranked',
    rank: null,
    trackTitle: null,
  }));

  assert.equal(observation.status, 'not-ranked');
  assert.equal(observation.rank, null);
  assert.equal(musicChartStatusIsZeroValue(observation.status), false);

  assert.throws(
    () => buildMusicChartObservation(draft('melon', {
      status: 'not-ranked',
      rank: null,
      trackTitle: null,
      coverage: null,
    })),
    /not-ranked-coverage-unproven/,
  );
});

test('missing, unsupported and collection-failed remain distinct states', () => {
  const missing = buildMusicChartObservation(draft('melon', {
    status: 'missing',
    rank: null,
    trackTitle: null,
    coverage: null,
    providerPeriod: 'daily:2026-09-30',
  }));
  const unsupported = buildMusicChartObservation(draft('genie', {
    status: 'unsupported',
    rank: null,
    trackTitle: null,
    coverage: null,
    unsupportedReason: 'artist-scope-not-supported',
  }));
  const failed = buildMusicChartObservation(draft('bugs', {
    status: 'collection-failed',
    rank: null,
    trackTitle: null,
    coverage: null,
    failureCode: 'http-timeout',
  }));

  assert.deepEqual(
    [missing.status, unsupported.status, failed.status],
    ['missing', 'unsupported', 'collection-failed'],
  );
  assert.equal(musicChartStatusIsZeroValue(missing.status), false);
  assert.equal(musicChartStatusIsZeroValue(unsupported.status), false);
  assert.equal(musicChartStatusIsZeroValue(failed.status), false);
});

test('collection time is not observation identity', () => {
  const first = buildMusicChartObservation(draft('melon'));
  const reacquired = buildMusicChartObservation(draft('melon', {
    collectedAt: '2026-10-01T09:00:00+09:00',
  }));
  assert.equal(first.observationId, reacquired.observationId);
});

test('provider observation time and provider period are distinct from collection time', () => {
  const first = buildMusicChartObservation(draft('bugs', {
    observedAt: '2026-09-30T11:40:00+09:00',
    providerPeriod: 'realtime:2026-09-30T11:40:00+09:00',
  }));
  const laterSnapshot = buildMusicChartObservation(draft('bugs', {
    observedAt: '2026-09-30T11:45:00+09:00',
    providerPeriod: 'realtime:2026-09-30T11:45:00+09:00',
  }));
  assert.notEqual(first.observationId, laterSnapshot.observationId);
});

test('rank cannot exist outside proven chart coverage', () => {
  assert.throws(
    () => buildMusicChartObservation(draft('melon', {
      rank: 101,
    })),
    /rank-outside-proven-coverage/,
  );
});

test('canonical artist identity is required and artist label is not the identity key', () => {
  assert.throws(
    () => buildMusicChartObservation(draft('melon', {
      canonicalArtistId: '',
    })),
    /canonical-artist-id-missing/,
  );

  const first = buildMusicChartObservation(draft('melon'));
  const relabeled = buildMusicChartObservation(draft('melon', {
    artistLabel: 'IU',
  }));
  assert.equal(first.observationId, relabeled.observationId);
});

test('readiness accepts ranked and proven not-ranked but blocks missing states', () => {
  const eligible = evaluateMusicChartCurrentPresenceReadiness({
    canonicalArtistId: 'iu',
    expectedPlatforms: ['melon', 'genie', 'bugs'],
    observations: [
      buildMusicChartObservation(draft('melon')),
      buildMusicChartObservation(draft('genie', {
        coverage: { startRank: 1, endRank: 200, evidenceIds: ['genie-pages-1-4-complete'] },
        rank: 33,
        trackTitle: 'Dear my crazy soulmate',
      })),
      buildMusicChartObservation(draft('bugs', {
        status: 'not-ranked',
        rank: null,
        trackTitle: null,
        coverage: { startRank: 1, endRank: 100, evidenceIds: ['bugs-current-chart-complete'] },
      })),
    ],
  });

  assert.equal(eligible.state, 'eligible');
  assert.deepEqual(eligible.notRankedPlatforms, ['bugs']);

  const blocked = evaluateMusicChartCurrentPresenceReadiness({
    canonicalArtistId: 'iu',
    expectedPlatforms: ['melon', 'genie', 'bugs'],
    observations: [
      buildMusicChartObservation(draft('melon')),
      buildMusicChartObservation(draft('genie', {
        status: 'missing',
        rank: null,
        trackTitle: null,
        coverage: null,
      })),
      buildMusicChartObservation(draft('bugs', {
        status: 'collection-failed',
        rank: null,
        trackTitle: null,
        coverage: null,
        failureCode: 'provider-unreachable',
      })),
    ],
  });

  assert.equal(blocked.state, 'blocked');
  assert.deepEqual(blocked.blockers, ['collection-failed:bugs', 'missing:genie']);
});

test('readiness fails closed on duplicate, cross-artist and unexpected provider observations', () => {
  const melon = buildMusicChartObservation(draft('melon'));

  assert.throws(
    () => evaluateMusicChartCurrentPresenceReadiness({
      canonicalArtistId: 'iu',
      expectedPlatforms: ['melon'],
      observations: [melon, melon],
    }),
    /music_chart_readiness_duplicate_platform_observation/,
  );

  assert.throws(
    () => evaluateMusicChartCurrentPresenceReadiness({
      canonicalArtistId: 'aespa',
      expectedPlatforms: ['melon'],
      observations: [melon],
    }),
    /music_chart_readiness_cross_artist_observation/,
  );

  assert.throws(
    () => evaluateMusicChartCurrentPresenceReadiness({
      canonicalArtistId: 'iu',
      expectedPlatforms: ['melon'],
      observations: [buildMusicChartObservation(draft('bugs'))],
    }),
    /music_chart_readiness_unexpected_platform/,
  );
});
