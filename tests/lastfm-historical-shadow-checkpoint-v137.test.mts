import assert from 'node:assert/strict';
import test from 'node:test';

import type { ArtistMonthlyMetricPoint } from '../app/data/v4/metrics/fandexMetricTypes';
import {
  LASTFM_CANONICAL_IDENTITIES,
} from '../lib/lastfm-signal/identityQualityGate';
import {
  LASTFM_HISTORICAL_SHADOW_CHECKPOINT_DESCRIPTOR,
  LASTFM_HISTORICAL_SHADOW_CHECKPOINT_VERSION,
  buildLastfmHistoricalShadowCheckpoint,
} from '../lib/lastfm-signal/historicalShadowCheckpoint';

function historyCsv(days = 10): string {
  const headers = [
    'snapshotDate', 'artist', 'query', 'lastfmName', 'listeners', 'playcount', 'collectedAt', 'status',
  ];
  const rows: string[] = [headers.join(',')];
  for (let day = 1; day <= days; day += 1) {
    const date = `2026-08-${String(day).padStart(2, '0')}`;
    LASTFM_CANONICAL_IDENTITIES.forEach((identity, index) => {
      const rate = 2 ** index;
      const listeners = 100_000 + rate * day;
      const playcount = 1_000_000 + rate * 10 * day;
      rows.push([
        date,
        identity.artistLabel,
        identity.expectedQuery,
        identity.acceptedLastfmNames[0],
        listeners,
        playcount,
        `${date}T10:00:00+09:00`,
        'ok',
      ].join(','));
    });
  }
  return rows.join('\n') + '\n';
}

function metricPoints(): readonly ArtistMonthlyMetricPoint[] {
  return Object.freeze(
    LASTFM_CANONICAL_IDENTITIES.map((identity, index) => ({
      artistId: identity.artistId === 'straykids' ? 'stray-kids' : identity.artistId,
      month: '2026-07',
      label: '26.07',
      fandexPoint: 4_000,
      variables: { momentum: index + 1 },
      sourceType: 'manual_seed' as const,
      quality: 'tracked' as const,
      updatedAt: '2026-08-01',
    })),
  );
}

test('v137 is explicitly retrospective research evidence and cannot apply Product state', () => {
  assert.equal(
    LASTFM_HISTORICAL_SHADOW_CHECKPOINT_DESCRIPTOR.evidenceMode,
    'retrospective-replay-from-genuine-daily-history',
  );
  assert.equal(LASTFM_HISTORICAL_SHADOW_CHECKPOINT_DESCRIPTOR.capturedContemporaneously, false);
  assert.equal(LASTFM_HISTORICAL_SHADOW_CHECKPOINT_DESCRIPTOR.productionEligible, false);
  assert.equal(LASTFM_HISTORICAL_SHADOW_CHECKPOINT_DESCRIPTOR.masterScoreApplied, false);
});

test('v137 replays structurally ready daily history through v136 without writes', () => {
  const result = buildLastfmHistoricalShadowCheckpoint(historyCsv(), metricPoints());

  assert.equal(result.contractVersion, LASTFM_HISTORICAL_SHADOW_CHECKPOINT_VERSION);
  assert.equal(result.sourceDateCount, 10);
  assert.equal(result.sourceRowCount, 100);
  assert.equal(result.replayStartDate, '2026-08-07');
  assert.equal(result.replaySnapshotCount, 4);
  assert.deepEqual(
    result.replayEvidence.map((point) => point.snapshotDate),
    ['2026-08-07', '2026-08-08', '2026-08-09', '2026-08-10'],
  );
  assert.ok(result.replayEvidence.every((point) => /^[0-9a-f]{64}$/.test(point.sourceHistoryDigest)));
  assert.ok(result.replayEvidence.every((point) => /^[0-9a-f]{64}$/.test(point.reconciliationDigest)));
  assert.equal(result.application.mode, 'research-replay-checkpoint-only');
  assert.equal(result.application.productionApplied, false);
  assert.equal(result.effects.externalCalls, 0);
  assert.equal(result.effects.databaseWrites, 0);
  assert.equal(result.repeatedReadiness.snapshotCount, 4);
  assert.ok(result.reasons.includes('retrospective-replay-not-contemporaneous-capture'));
});

test('v137 is deterministic for the same history and preview seed', () => {
  const first = buildLastfmHistoricalShadowCheckpoint(historyCsv(), metricPoints());
  const second = buildLastfmHistoricalShadowCheckpoint(historyCsv(), metricPoints());
  assert.equal(first.digest, second.digest);
  assert.equal(first.previewSeedDigest, second.previewSeedDigest);
  assert.deepEqual(first.replayEvidence, second.replayEvidence);
  assert.deepEqual(first.repeatedReadiness, second.repeatedReadiness);
});

test('v137 rejects an incomplete genuine daily snapshot instead of filling missing artists', () => {
  const lines = historyCsv().trimEnd().split('\n');
  const incomplete = lines.slice(0, -1).join('\n') + '\n';
  assert.throws(
    () => buildLastfmHistoricalShadowCheckpoint(incomplete, metricPoints()),
    /incomplete_snapshot_2026-08-10/,
  );
});

test('v137 does not silently treat retrospective replay as contemporaneous capture', () => {
  const result = buildLastfmHistoricalShadowCheckpoint(historyCsv(), metricPoints());
  assert.equal(result.capturedContemporaneously, false);
  assert.notEqual(result.state, 'readiness_candidate');
  if (result.state === 'replay_evidence_candidate') {
    assert.ok(result.reasons.includes('replay-evidence-does-not-authorize-production'));
  }
});
