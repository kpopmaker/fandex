import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  adaptMusicChartEvidence,
  assessMusicChartCoverage,
  type MusicChartCanonicalBinding,
} from '../lib/alternative-evidence/musicChartEvidenceAdapter';

const stateDir = 'data/fandex-cloud-v10/state';

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(`${stateDir}/${name}`, 'utf8'));
}

type LatestCheckHistory = Readonly<{
  latestCheckDate: string;
  latestRowCount: number;
  rankedCount: number;
  notRankedCount: number;
  rows: readonly Record<string, unknown>[];
}>;

function latestCheckHistory(): LatestCheckHistory {
  const payload = readJson('music_chart_check_history_v1_latest.json');
  assert.ok(payload !== null && typeof payload === 'object');
  const record = payload as Record<string, unknown>;
  assert.equal(typeof record.latestCheckDate, 'string');
  assert.equal(typeof record.latestRowCount, 'number');
  assert.equal(typeof record.rankedCount, 'number');
  assert.equal(typeof record.notRankedCount, 'number');
  assert.ok(Array.isArray(record.rows));
  return record as unknown as LatestCheckHistory;
}

function latestSnapshotDate(): string {
  const value = latestCheckHistory().latestCheckDate;
  assert.equal(typeof value, 'string');
  return value;
}

function previousDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() - 1);
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

test('actual latest collector state proves Melon 100, Genie 200, and Bugs 100 coverage', () => {
  const result = assessMusicChartCoverage({
    melonGeniePayload: readJson('music_chart_artist_candidates_v2_raw_latest.json'),
    bugsPayload: readJson('music_chart_bugs_all_targets_v1_latest.json'),
    snapshotDate: latestSnapshotDate(),
  });

  assert.deepEqual(
    result.map(item => ({
      platform: item.platform,
      state: item.state,
      startRank: item.coverage?.startRank ?? null,
      endRank: item.coverage?.endRank ?? null,
    })),
    [
      { platform: 'melon', state: 'complete', startRank: 1, endRank: 100 },
      { platform: 'genie', state: 'complete', startRank: 1, endRank: 200 },
      { platform: 'bugs', state: 'complete', startRank: 1, endRank: 100 },
    ],
  );
});

test('actual latest check history normalizes to 30 score-free observations', () => {
  const result = adaptMusicChartEvidence({
    checkHistoryPayload: readJson('music_chart_check_history_v1_latest.json'),
    melonGeniePayload: readJson('music_chart_artist_candidates_v2_raw_latest.json'),
    bugsPayload: readJson('music_chart_bugs_all_targets_v1_latest.json'),
    bindings,
  });

  const latest = latestCheckHistory();
  assert.equal(result.snapshotDate, latest.latestCheckDate);
  assert.equal(result.observations.length, latest.latestRowCount);
  assert.equal(result.blockers.length, 0);
  assert.equal(result.featureBridgeEligible, false);
  assert.equal(result.scoreFieldsPresent, false);

  const ranked = result.observations.filter(item => item.status === 'ranked');
  const notRanked = result.observations.filter(item => item.status === 'not-ranked');
  assert.equal(ranked.length, latest.rankedCount);
  assert.equal(notRanked.length, latest.notRankedCount);

  for (const observation of result.observations) {
    assert.equal('score' in observation, false);
    assert.equal('point' in observation, false);
    assert.ok(observation.canonicalArtistId);
    if (observation.status === 'not-ranked') {
      assert.equal(observation.rank, null);
      assert.ok(observation.coverage);
    }
  }
});

test('actual IU evidence preserves source ranks without translating them to points', () => {
  const result = adaptMusicChartEvidence({
    checkHistoryPayload: readJson('music_chart_check_history_v1_latest.json'),
    melonGeniePayload: readJson('music_chart_artist_candidates_v2_raw_latest.json'),
    bugsPayload: readJson('music_chart_bugs_all_targets_v1_latest.json'),
    bindings,
  });

  const iu = result.observations
    .filter(item => item.canonicalArtistId === 'iu')
    .sort((a, b) => a.platform.localeCompare(b.platform));

  const expected = latestCheckHistory().rows
    .filter((row: Record<string, unknown>) => row.artist === '아이유')
    .map((row: Record<string, unknown>) => ({
      platform: String(row.platform),
      status: row.status === 'RANKED' ? 'ranked' : 'not-ranked',
      rank: row.status === 'RANKED' ? Number(row.bestRank) : null,
    }))
    .sort((a: { platform: string }, b: { platform: string }) =>
      a.platform.localeCompare(b.platform),
    );

  assert.deepEqual(
    iu.map(item => ({ platform: item.platform, status: item.status, rank: item.rank })),
    expected,
  );
});

test('incomplete Genie page coverage converts NOT_RANKED evidence to missing instead of zero', () => {
  const mg = readJson('music_chart_artist_candidates_v2_raw_latest.json') as Record<string, unknown>;
  const sourceCounts = { ...(mg.sourceCounts as Record<string, unknown>), genie_daily_page_4: 49 };

  const result = adaptMusicChartEvidence({
    checkHistoryPayload: readJson('music_chart_check_history_v1_latest.json'),
    melonGeniePayload: { ...mg, sourceCounts },
    bugsPayload: readJson('music_chart_bugs_all_targets_v1_latest.json'),
    bindings,
  });

  const genie = result.observations.filter(item => item.platform === 'genie');
  assert.equal(genie.length, 10);
  assert.ok(genie.every(item => item.status === 'missing'));
  assert.ok(result.blockers.includes('coverage-missing:seventeen:genie'));
  assert.equal(genie.some(item => 'score' in item || 'point' in item), false);
});

test('explicit Melon HTTP failure becomes collection-failed rather than NOT_RANKED', () => {
  const mg = readJson('music_chart_artist_candidates_v2_raw_latest.json') as Record<string, unknown>;
  const fetchLogs = (mg.fetchLogs as Array<Record<string, unknown>>).map(log =>
    log.sourceKey === 'melon_top100'
      ? { ...log, statusCode: 503 }
      : log,
  );

  const result = adaptMusicChartEvidence({
    checkHistoryPayload: readJson('music_chart_check_history_v1_latest.json'),
    melonGeniePayload: { ...mg, fetchLogs },
    bugsPayload: readJson('music_chart_bugs_all_targets_v1_latest.json'),
    bindings,
  });

  const melon = result.observations.filter(item => item.platform === 'melon');
  assert.ok(melon.every(item => item.status === 'collection-failed'));
  assert.ok(melon.every(item => item.failureCode === 'http-503'));
});

test('stale Bugs payload cannot prove current NOT_RANKED state', () => {
  const bugs = readJson('music_chart_bugs_all_targets_v1_latest.json') as Record<string, unknown>;

  const result = adaptMusicChartEvidence({
    checkHistoryPayload: readJson('music_chart_check_history_v1_latest.json'),
    melonGeniePayload: readJson('music_chart_artist_candidates_v2_raw_latest.json'),
    bugsPayload: { ...bugs, chartDate: previousDate(latestSnapshotDate()) },
    bindings,
  });

  const bugsObservations = result.observations.filter(item => item.platform === 'bugs');
  assert.ok(bugsObservations.every(item => item.status === 'missing'));
  assert.ok(result.blockers.includes('coverage-missing:iu:bugs'));
});

test('adapter requires explicit external canonical bindings and does not resolve artist labels itself', () => {
  assert.throws(
    () => adaptMusicChartEvidence({
      checkHistoryPayload: readJson('music_chart_check_history_v1_latest.json'),
      melonGeniePayload: readJson('music_chart_artist_candidates_v2_raw_latest.json'),
      bugsPayload: readJson('music_chart_bugs_all_targets_v1_latest.json'),
      bindings: [],
    }),
    /music_chart_bindings_empty/,
  );
});
