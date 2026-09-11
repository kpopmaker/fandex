import assert from 'node:assert/strict';
import test from 'node:test';

import type { ArtistMonthlyMetricPoint } from '../app/data/v4/metrics/fandexMetricTypes';
import {
  LASTFM_SHADOW_SCORING_RECONCILIATION_VERSION,
  buildLastfmShadowScoringReconciliation,
} from '../lib/lastfm-signal/shadowScoringReconciliation';
import {
  LASTFM_SHADOW_VARIABLE_ADAPTER_VERSION,
  type LastfmShadowVariableAdapterResult,
  type LastfmShadowVariableCandidate,
} from '../lib/lastfm-signal/shadowVariableAdapter';
import { LASTFM_HISTORICAL_WINDOW_VERSION } from '../lib/lastfm-signal/historicalWindow';

const SNAPSHOT_DATE = '2026-08-31';

function candidate(
  artistId: string,
  artistLabel: string,
  value: number,
  state: LastfmShadowVariableCandidate['state'] = 'candidate',
): LastfmShadowVariableCandidate {
  return Object.freeze({
    artistId,
    artistLabel,
    snapshotDate: SNAPSHOT_DATE,
    variableKey: 'momentum' as const,
    candidateValue: value,
    state,
    reasons: Object.freeze(state === 'observe' ? ['historical-signal-variable'] : []),
    source: Object.freeze({
      provider: 'lastfm' as const,
      sourceType: 'preview_signal' as const,
      quality: 'preview' as const,
      historicalNormalizedPoint: value,
      stabilityState: state === 'observe' ? 'variable' as const : 'stable' as const,
      windowStartDate: '2026-08-18',
      windowEndDate: SNAPSHOT_DATE,
      intervalCount: 13,
      positiveIntervalRatio: 1,
      listenerRelativeMad: 0.1,
      playcountRelativeMad: 0.1,
    }),
  });
}

function adapter(
  candidates: readonly LastfmShadowVariableCandidate[] = Object.freeze([
    candidate('aespa', '에스파', 20),
    candidate('ive', '아이브', 40),
    candidate('iu', '아이유', 60),
    candidate('straykids', '스트레이키즈', 80),
  ]),
): LastfmShadowVariableAdapterResult {
  return Object.freeze({
    contractVersion: LASTFM_SHADOW_VARIABLE_ADAPTER_VERSION,
    sourceContractVersion: LASTFM_HISTORICAL_WINDOW_VERSION,
    snapshotDate: SNAPSHOT_DATE,
    targetVariable: 'momentum' as const,
    state: 'eligible' as const,
    reasons: Object.freeze([]),
    signalCount: candidates.length,
    candidateCount: candidates.filter((item) => item.state === 'candidate').length,
    observeCount: candidates.filter((item) => item.state === 'observe').length,
    blockedCount: candidates.filter((item) => item.state === 'blocked').length,
    candidates,
    digest: 'synthetic-adapter-digest',
    application: Object.freeze({
      mode: 'shadow-only' as const,
      masterScoreApplied: false as const,
      metricRegistryModified: false as const,
      publicWebsiteApplied: false as const,
      defaultWeightApplied: false as const,
    }),
    effects: Object.freeze({
      externalCalls: 0 as const,
      databaseReads: 0 as const,
      databaseWrites: 0 as const,
      masterScoreWrites: 0 as const,
      websiteWrites: 0 as const,
    }),
  });
}

function metricPoint(artistId: string, momentum: number): ArtistMonthlyMetricPoint {
  return {
    artistId,
    month: '2026-07',
    label: '26.07',
    fandexPoint: 4_000,
    variables: { momentum },
    sourceType: 'manual_seed',
    quality: 'tracked',
    updatedAt: '2026-08-01',
  };
}

const fullMetrics = Object.freeze([
  metricPoint('aespa', 100),
  metricPoint('ive', 200),
  metricPoint('iu', 300),
  metricPoint('stray-kids', 400),
]);

test('v135 reconciles shadow momentum against cohort-normalized preview momentum without writes', () => {
  const result = buildLastfmShadowScoringReconciliation(adapter(), fullMetrics);
  assert.equal(result.contractVersion, LASTFM_SHADOW_SCORING_RECONCILIATION_VERSION);
  assert.equal(result.state, 'eligible');
  assert.equal(result.comparedCount, 4);
  assert.equal(result.candidateCount, 4);
  assert.equal(result.blockedCount, 0);
  assert.equal(result.coverageRatio, 1);
  assert.equal(result.application.mode, 'shadow-reconciliation-only');
  assert.equal(result.application.masterScoreApplied, false);
  assert.equal(result.application.previewSeedModified, false);
  assert.equal(result.effects.masterScoreWrites, 0);
  assert.equal(result.effects.websiteWrites, 0);
  assert.ok(result.items.every((item) => item.seed.cohortNormalizedMomentum !== null));
  assert.ok(result.items.every((item) => item.shadow.rank !== null));
});

test('v135 resolves the canonical straykids id to the legacy metric seed id without mutating either', () => {
  const result = buildLastfmShadowScoringReconciliation(adapter(), fullMetrics);
  const strayKids = result.items.find((item) => item.artistId === 'straykids');
  assert.ok(strayKids);
  assert.equal(strayKids.metricArtistId, 'stray-kids');
  assert.equal(strayKids.seed.rawMomentumPoint, 400);
  assert.equal(strayKids.state, 'candidate');
});

test('v135 reports partial coverage instead of inventing a preview seed for a canonical artist', () => {
  const withoutIu = fullMetrics.filter((point) => point.artistId !== 'iu');
  const result = buildLastfmShadowScoringReconciliation(adapter(), withoutIu);
  assert.equal(result.state, 'partial');
  assert.equal(result.comparedCount, 3);
  assert.equal(result.blockedCount, 1);
  assert.equal(result.coverageRatio, 0.75);
  assert.ok(result.reasons.includes('preview-seed-coverage-incomplete'));
  const iu = result.items.find((item) => item.artistId === 'iu');
  assert.ok(iu);
  assert.equal(iu.state, 'blocked');
  assert.ok(iu.reasons.includes('preview-metric-point-missing'));
  assert.equal(iu.seed.rawMomentumPoint, null);
  assert.equal(iu.comparison.normalizedDelta, null);
});

test('v135 keeps variable upstream signals observable rather than promotion candidates', () => {
  const candidates = adapter().candidates.map((item) =>
    item.artistId === 'ive' ? candidate('ive', '아이브', 40, 'observe') : item,
  );
  const result = buildLastfmShadowScoringReconciliation(adapter(Object.freeze(candidates)), fullMetrics);
  assert.equal(result.state, 'eligible');
  assert.equal(result.candidateCount, 3);
  assert.equal(result.observeCount, 1);
  const ive = result.items.find((item) => item.artistId === 'ive');
  assert.ok(ive);
  assert.equal(ive.state, 'observe');
  assert.notEqual(ive.comparison.normalizedDelta, null);
});

test('v135 digest and normalized comparison are deterministic', () => {
  const first = buildLastfmShadowScoringReconciliation(adapter(), fullMetrics);
  const second = buildLastfmShadowScoringReconciliation(adapter(), fullMetrics);
  assert.equal(first.digest, second.digest);
  assert.deepEqual(first.summary, second.summary);
  assert.deepEqual(first.items, second.items);
});
