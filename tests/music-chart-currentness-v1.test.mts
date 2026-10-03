import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  adaptMusicChartEvidence,
  type MusicChartCanonicalBinding,
} from '../lib/alternative-evidence/musicChartEvidenceAdapter';
import {
  appendMusicChartObservationHistory,
  buildMusicChartCurrentReadModel,
  type MusicChartCurrentReadModel,
} from '../lib/alternative-evidence/musicChartObservationHistory';
import {
  assessMusicChartCurrentness,
  MUSIC_CHART_DAILY_CADENCE_EVIDENCE,
} from '../lib/alternative-evidence/musicChartCurrentness';

const stateDir = 'data/fandex-cloud-v10/state';

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(`${stateDir}/${name}`, 'utf8'));
}

function collectionHistoryDates(): readonly string[] {
  const csv = readFileSync(
    `${stateDir}/music_chart_check_history_v1.csv`,
    'utf8',
  ).trim();
  const lines = csv.split(/\r?\n/);
  assert.ok(lines[0].startsWith('checkDate,'));
  return Object.freeze(
    [...new Set(
      lines.slice(1)
        .map(line => line.slice(0, 10))
        .filter(value => /^\d{4}-\d{2}-\d{2}$/.test(value)),
    )].sort(),
  );
}

function latestSnapshotDate(): string {
  const payload = readJson(
    'music_chart_check_history_v1_latest.json',
  ) as Record<string, unknown>;
  assert.equal(typeof payload.latestCheckDate, 'string');
  return payload.latestCheckDate as string;
}

function plusDays(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
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

function currentMusicReadModel(): MusicChartCurrentReadModel {
  const adapted = adaptMusicChartEvidence({
    checkHistoryPayload: readJson('music_chart_check_history_v1_latest.json'),
    melonGeniePayload: readJson(
      'music_chart_artist_candidates_v2_raw_latest.json',
    ),
    bugsPayload: readJson('music_chart_bugs_all_targets_v1_latest.json'),
    bindings,
  });

  const observations = adapted.observations.filter(
    observation => observation.canonicalArtistId === 'iu',
  );
  const history = appendMusicChartObservationHistory({
    existing: [],
    observations,
  });

  return buildMusicChartCurrentReadModel({
    history,
    asOf: `${latestSnapshotDate()}T23:59:59+09:00`,
  });
}

test('daily cadence is repository-evidenced rather than invented as a freshness threshold', () => {
  assert.equal(MUSIC_CHART_DAILY_CADENCE_EVIDENCE.cadence, 'daily');
  assert.equal(MUSIC_CHART_DAILY_CADENCE_EVIDENCE.timezone, 'Asia/Seoul');
  assert.equal(MUSIC_CHART_DAILY_CADENCE_EVIDENCE.upstreamCron, '0 0 * * *');
  assert.equal(
    MUSIC_CHART_DAILY_CADENCE_EVIDENCE.downstreamTrigger,
    'successful-upstream-workflow-run',
  );
});

test('actual latest Music evidence is current with a continuous daily collection history', () => {
  const historyDates = collectionHistoryDates();
  const result = assessMusicChartCurrentness({
    music: currentMusicReadModel(),
    collectionHistoryDates: historyDates,
  });

  assert.equal(result.status, 'current');
  assert.equal(result.providerEvidenceDate, latestSnapshotDate());
  assert.equal(result.continuityStartDate, historyDates[0]);
  assert.equal(
    result.continuityEndDate,
    historyDates[historyDates.length - 1],
  );
  assert.equal(result.missingScheduledDates.length, 0);
  assert.equal(result.calendarDayLag, 0);
  assert.equal(result.thresholdApplied, false);
  assert.equal(result.scoreFieldsPresent, false);
  assert.equal(result.legacyHistoryStatusValuesPromoted, false);
});

test('next-calendar-day assessment without new evidence is stale-evidence, not zero and not a guessed timeout', () => {
  const current = currentMusicReadModel();
  const nextDate = plusDays(latestSnapshotDate(), 1);
  const futureAsOf: MusicChartCurrentReadModel = Object.freeze({
    ...current,
    asOf: `${nextDate}T23:59:59+09:00`,
  });

  const result = assessMusicChartCurrentness({
    music: futureAsOf,
    collectionHistoryDates: collectionHistoryDates(),
  });

  assert.equal(result.status, 'stale-evidence');
  assert.equal(result.calendarDayLag, 1);
  assert.equal(result.thresholdApplied, false);
  assert.ok(
    result.reasonCodes.includes(
      'provider-evidence-predates-assessment-date',
    ),
  );
});

test('a missing date between later successful daily runs is a collection-gap', () => {
  const dates = [...collectionHistoryDates()];
  assert.ok(dates.length > 3);
  const removed = dates[Math.floor(dates.length / 2)];
  const withGap = dates.filter(value => value !== removed);

  const result = assessMusicChartCurrentness({
    music: currentMusicReadModel(),
    collectionHistoryDates: withGap,
  });

  assert.equal(result.status, 'collection-gap');
  assert.deepEqual(result.missingScheduledDates, [removed]);
  assert.ok(result.reasonCodes.includes('daily-cadence-gap-detected'));
});

test('disagreeing provider evidence dates are unknown instead of being coerced to current', () => {
  const current = currentMusicReadModel();
  const previous = plusDays(latestSnapshotDate(), -1);
  const rows = current.rows.map((row, index) =>
    index === 0
      ? Object.freeze({
          ...row,
          providerPeriod: `daily-check-date:${previous}`,
        })
      : row,
  );
  const inconsistent: MusicChartCurrentReadModel = Object.freeze({
    ...current,
    rows: Object.freeze(rows),
  });

  const result = assessMusicChartCurrentness({
    music: inconsistent,
    collectionHistoryDates: collectionHistoryDates(),
  });

  assert.equal(result.status, 'unknown');
  assert.ok(
    result.reasonCodes.includes('provider-evidence-dates-disagree'),
  );
});

test('missing continuity evidence is unknown even when the latest rows look current', () => {
  const result = assessMusicChartCurrentness({
    music: currentMusicReadModel(),
    collectionHistoryDates: [],
  });

  assert.equal(result.status, 'unknown');
  assert.equal(result.continuityStartDate, null);
  assert.equal(result.continuityEndDate, null);
});
