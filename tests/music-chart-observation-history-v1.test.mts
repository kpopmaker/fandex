import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  buildMusicChartObservation,
  type MusicChartObservation,
} from '../lib/alternative-evidence/musicChartObservation';
import {
  adaptMusicChartEvidence,
  type MusicChartCanonicalBinding,
} from '../lib/alternative-evidence/musicChartEvidenceAdapter';
import {
  appendMusicChartObservationHistory,
  buildMusicChartCurrentReadModel,
  musicChartObservationFreshness,
} from '../lib/alternative-evidence/musicChartObservationHistory';

const stateDir = 'data/fandex-cloud-v10/state';

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(`${stateDir}/${name}`, 'utf8'));
}

function latestSnapshotDate(): string {
  const payload = readJson('music_chart_check_history_v1_latest.json') as Record<string, unknown>;
  assert.equal(typeof payload.latestCheckDate, 'string');
  return payload.latestCheckDate as string;
}

function endOfLatestSnapshotDay(): string {
  return `${latestSnapshotDate()}T23:59:59+09:00`;
}

function offsetInstant(instant: string, milliseconds: number): string {
  return new Date(Date.parse(instant) + milliseconds).toISOString();
}

const bindings: readonly MusicChartCanonicalBinding[] = Object.freeze([
  { canonicalArtistId: 'iu', artist: '아이유' },
  { canonicalArtistId: 'aespa', artist: '에스파' },
  { canonicalArtistId: 'ateez', artist: '에이티즈' },
  { canonicalArtistId: 'boynextdoor', artist: '보이넥스트도어' },
  { canonicalArtistId: 'ive', artist: '아이브' },
  { canonicalArtistId: 'lesserafim', artist: '르세라핌' },
  { canonicalArtistId: 'newjeans', artist: '뉴진스' },
  { canonicalArtistId: 'seventeen', artist: '세븐틴' },
  { canonicalArtistId: 'straykids', artist: '스트레이키즈' },
  { canonicalArtistId: 'txt', artist: '투모로우바이투게더' },
]);

function currentObservations(): readonly MusicChartObservation[] {
  return adaptMusicChartEvidence({
    checkHistoryPayload: readJson('music_chart_check_history_v1_latest.json'),
    melonGeniePayload: readJson('music_chart_artist_candidates_v2_raw_latest.json'),
    bugsPayload: readJson('music_chart_bugs_all_targets_v1_latest.json'),
    bindings,
  }).observations;
}

function reacquire(
  observation: MusicChartObservation,
  collectedAt: string,
): MusicChartObservation {
  return buildMusicChartObservation({
    canonicalArtistId: observation.canonicalArtistId,
    artistLabel: observation.artistLabel,
    platform: observation.platform,
    chartName: observation.chartName,
    chartType: observation.chartType,
    providerPeriod: observation.providerPeriod,
    observedAt: observation.observedAt,
    collectedAt,
    status: observation.status,
    rank: observation.rank,
    trackTitle: observation.trackTitle,
    coverage: observation.coverage,
    sourceKeys: observation.sourceKeys,
    evidenceFile: observation.evidenceFile,
    sourceVersion: observation.sourceVersion,
    failureCode: observation.failureCode,
    unsupportedReason: observation.unsupportedReason,
  });
}

test('actual normalized snapshot appends as 30 score-free history entries', () => {
  const observations = currentObservations();
  const history = appendMusicChartObservationHistory({
    existing: [],
    observations,
  });

  assert.equal(history.length, 30);
  assert.ok(history.every(entry => entry.acquisitionCount === 1));
  assert.ok(history.every(entry => entry.acquisitionTimes.length === 1));
  assert.ok(history.every(entry => !('score' in entry) && !('point' in entry)));

  const read = buildMusicChartCurrentReadModel({
    history,
    asOf: endOfLatestSnapshotDay(),
  });

  assert.equal(read.rows.length, 30);
  assert.equal(read.scoreFieldsPresent, false);
  assert.equal(read.thresholdApplied, false);
  assert.ok(read.rows.every(row => row.freshness.thresholdApplied === false));
  assert.ok(read.rows.every(row => row.freshness.referenceKind === 'collection-proxy'));
});

test('legacy timezone-less collector timestamps are normalized to explicit KST', () => {
  const observations = currentObservations();

  assert.ok(
    observations.every(observation =>
      /\+09:00$/.test(observation.collectedAt),
    ),
  );

  assert.throws(
    () => buildMusicChartObservation({
      canonicalArtistId: 'iu',
      artistLabel: '아이유',
      platform: 'melon',
      chartName: 'TOP100',
      chartType: 'daily',
      providerPeriod: `daily-check-date:${latestSnapshotDate()}`,
      observedAt: null,
      collectedAt: `${latestSnapshotDate()}T11:42:00`,
      status: 'not-ranked',
      rank: null,
      trackTitle: null,
      coverage: { startRank: 1, endRank: 100, evidenceIds: ['coverage'] },
      sourceKeys: ['melon_top100'],
      evidenceFile: 'evidence.json',
      sourceVersion: 'v1',
      failureCode: null,
      unsupportedReason: null,
    }),
    /collected-at-invalid/,
  );
});

test('reacquiring the same provider observation deduplicates identity and preserves acquisition times', () => {
  const original = currentObservations().find(
    observation => observation.canonicalArtistId === 'iu' && observation.platform === 'melon',
  );
  assert.ok(original);

  const laterAt = offsetInstant(original.collectedAt, 24 * 60 * 60 * 1000);
  const later = reacquire(original, laterAt);
  assert.equal(original.observationId, later.observationId);

  const history = appendMusicChartObservationHistory({
    existing: [],
    observations: [original, later, later],
  });

  assert.equal(history.length, 1);
  assert.equal(history[0].acquisitionCount, 2);
  assert.deepEqual(
    history[0].acquisitionTimes,
    [original.collectedAt, laterAt],
  );

  const beforeReacquisition = buildMusicChartCurrentReadModel({
    history,
    asOf: offsetInstant(original.collectedAt, 5 * 60 * 1000),
  });
  assert.equal(beforeReacquisition.rows[0].collectedAt, original.collectedAt);

  const afterReacquisition = buildMusicChartCurrentReadModel({
    history,
    asOf: offsetInstant(laterAt, 5 * 60 * 1000),
  });
  assert.equal(afterReacquisition.rows[0].collectedAt, laterAt);
});

test('a changed rank in the same provider period is a new observation, not a duplicate reacquisition', () => {
  const original = currentObservations().find(
    observation => observation.canonicalArtistId === 'iu' && observation.platform === 'melon',
  );
  assert.ok(original && original.status === 'ranked');

  const changedRank = original.rank === 1 ? 2 : (original.rank ?? 1) - 1;
  const changedCollectedAt = offsetInstant(original.collectedAt, 5 * 60 * 1000);
  const changed = buildMusicChartObservation({
    canonicalArtistId: original.canonicalArtistId,
    artistLabel: original.artistLabel,
    platform: original.platform,
    chartName: original.chartName,
    chartType: original.chartType,
    providerPeriod: original.providerPeriod,
    observedAt: original.observedAt,
    collectedAt: changedCollectedAt,
    status: 'ranked',
    rank: changedRank,
    trackTitle: original.trackTitle,
    coverage: original.coverage,
    sourceKeys: original.sourceKeys,
    evidenceFile: original.evidenceFile,
    sourceVersion: original.sourceVersion,
    failureCode: null,
    unsupportedReason: null,
  });

  assert.notEqual(original.observationId, changed.observationId);

  const history = appendMusicChartObservationHistory({
    existing: [],
    observations: [original, changed],
  });
  assert.equal(history.length, 2);

  const beforeChange = buildMusicChartCurrentReadModel({
    history,
    asOf: offsetInstant(original.collectedAt, 60 * 1000),
  });
  assert.equal(beforeChange.rows[0].rank, original.rank);

  const afterChange = buildMusicChartCurrentReadModel({
    history,
    asOf: offsetInstant(changedCollectedAt, 60 * 1000),
  });
  assert.equal(afterChange.rows[0].rank, changedRank);
});

test('freshness keeps provider observation time separate from collection time and applies no threshold', () => {
  const observation = buildMusicChartObservation({
    canonicalArtistId: 'iu',
    artistLabel: '아이유',
    platform: 'bugs',
    chartName: 'Bugs Realtime',
    chartType: 'realtime',
    providerPeriod: 'realtime:2026-09-30T11:40:00+09:00',
    observedAt: '2026-09-30T11:40:00+09:00',
    collectedAt: '2026-09-30T11:42:00+09:00',
    status: 'not-ranked',
    rank: null,
    trackTitle: null,
    coverage: { startRank: 1, endRank: 100, evidenceIds: ['bugs-complete'] },
    sourceKeys: ['bugs_realtime'],
    evidenceFile: 'bugs.json',
    sourceVersion: 'v1',
    failureCode: null,
    unsupportedReason: null,
  });

  const freshness = musicChartObservationFreshness({
    observation,
    asOf: '2026-09-30T11:50:00+09:00',
  });

  assert.equal(freshness.referenceKind, 'provider-observed-at');
  assert.equal(freshness.referenceAt, '2026-09-30T11:40:00+09:00');
  assert.equal(freshness.ageSeconds, 600);
  assert.equal(freshness.thresholdApplied, false);
});

test('as-of reads cannot see acquisitions that happened in the future', () => {
  const observation = currentObservations()[0];
  const history = appendMusicChartObservationHistory({
    existing: [],
    observations: [observation],
  });

  const read = buildMusicChartCurrentReadModel({
    history,
    asOf: offsetInstant(observation.collectedAt, -1),
  });

  assert.equal(read.rows.length, 0);
});
