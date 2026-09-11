import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LASTFM_HISTORICAL_WINDOW_VERSION,
  type LastfmHistoricalWindowModel,
  type LastfmHistoricalWindowSignal,
} from '../lib/lastfm-signal/historicalWindow';
import {
  LASTFM_SHADOW_TARGET_VARIABLE,
  LASTFM_SHADOW_VARIABLE_ADAPTER_VERSION,
  buildLastfmShadowVariableAdapter,
} from '../lib/lastfm-signal/shadowVariableAdapter';
import { LASTFM_IDENTITY_QUALITY_GATE_VERSION } from '../lib/lastfm-signal/identityQualityGate';

function zeroEffects() {
  return Object.freeze({
    externalCalls: 0 as const,
    databaseReads: 0 as const,
    databaseWrites: 0 as const,
    masterScoreWrites: 0 as const,
    websiteWrites: 0 as const,
  });
}

function historicalSignal(
  index: number,
  overrides: Partial<LastfmHistoricalWindowSignal> = {},
): LastfmHistoricalWindowSignal {
  return Object.freeze({
    artistId: `artist-${index}`,
    artistLabel: `아티스트-${index}`,
    windowStartDate: '2026-08-01',
    windowEndDate: '2026-08-14',
    snapshotCount: 14,
    intervalCount: 13,
    medianListenerDeltaPerDay: 100 + index * 10,
    medianPlaycountDeltaPerDay: 1_000 + index * 100,
    listenerRelativeMad: 0.1,
    playcountRelativeMad: 0.1,
    positiveIntervalRatio: 1,
    latestListenerDeltaPerDay: 100 + index * 10,
    latestPlaycountDeltaPerDay: 1_000 + index * 100,
    historicalNormalizedPoint: index * 10,
    stabilityState: 'stable' as const,
    blockers: Object.freeze([]),
    ...overrides,
  });
}

function historicalModel(
  signals: readonly LastfmHistoricalWindowSignal[] = Object.freeze(
    Array.from({ length: 10 }, (_, index) => historicalSignal(index)),
  ),
  overrides: Partial<LastfmHistoricalWindowModel> = {},
): LastfmHistoricalWindowModel {
  return Object.freeze({
    contractVersion: LASTFM_HISTORICAL_WINDOW_VERSION,
    sourceGateVersion: LASTFM_IDENTITY_QUALITY_GATE_VERSION,
    snapshotDate: '2026-08-14',
    windowDays: 14,
    minimumIntervals: 6,
    state: 'eligible' as const,
    reasons: Object.freeze([]),
    signalCount: signals.length,
    stableSignalCount: signals.filter((signal) => signal.stabilityState === 'stable').length,
    variableSignalCount: signals.filter((signal) => signal.stabilityState === 'variable').length,
    blockedSignalCount: signals.filter((signal) => signal.stabilityState === 'blocked').length,
    signals,
    digest: 'historical-test-digest',
    effects: zeroEffects(),
    ...overrides,
  });
}

test('v134 maps stable historical signals into preview-only FANDEX momentum candidates', () => {
  const result = buildLastfmShadowVariableAdapter(historicalModel());
  assert.equal(result.contractVersion, LASTFM_SHADOW_VARIABLE_ADAPTER_VERSION);
  assert.equal(result.targetVariable, LASTFM_SHADOW_TARGET_VARIABLE);
  assert.equal(result.targetVariable, 'momentum');
  assert.equal(result.state, 'eligible');
  assert.equal(result.signalCount, 10);
  assert.equal(result.candidateCount, 10);
  assert.equal(result.observeCount, 0);
  assert.equal(result.blockedCount, 0);
  assert.ok(result.candidates.every((candidate) => candidate.variableKey === 'momentum'));
  assert.ok(result.candidates.every((candidate) => candidate.state === 'candidate'));
  assert.ok(result.candidates.every((candidate) => candidate.candidateValue !== null));
  assert.equal(result.application.mode, 'shadow-only');
  assert.equal(result.application.masterScoreApplied, false);
  assert.equal(result.application.defaultWeightApplied, false);
  assert.equal(result.application.metricRegistryModified, false);
  assert.equal(result.application.publicWebsiteApplied, false);
  assert.equal(result.effects.masterScoreWrites, 0);
  assert.equal(result.effects.websiteWrites, 0);
  assert.equal(result.effects.databaseWrites, 0);
});

test('v134 keeps variable historical signals observable but does not promote them as stable candidates', () => {
  const signals = Object.freeze([
    historicalSignal(0, {
      stabilityState: 'variable',
      listenerRelativeMad: 1.2,
      playcountRelativeMad: 0.9,
      positiveIntervalRatio: 0.7,
    }),
    ...Array.from({ length: 9 }, (_, offset) => historicalSignal(offset + 1)),
  ]);
  const result = buildLastfmShadowVariableAdapter(historicalModel(signals));
  const observed = result.candidates.find((candidate) => candidate.artistId === 'artist-0');
  assert.ok(observed);
  assert.equal(observed.state, 'observe');
  assert.equal(observed.candidateValue, 0);
  assert.ok(observed.reasons.includes('historical-signal-variable'));
  assert.equal(result.state, 'eligible');
  assert.equal(result.candidateCount, 9);
  assert.equal(result.observeCount, 1);
});

test('v134 fails closed when the historical source model is blocked', () => {
  const source = historicalModel(undefined, {
    state: 'blocked',
    reasons: Object.freeze(['historical-window-blocked-signals']),
  });
  const result = buildLastfmShadowVariableAdapter(source);
  assert.equal(result.state, 'blocked');
  assert.ok(result.reasons.includes('historical-window-model-blocked'));
  assert.equal(result.effects.masterScoreWrites, 0);
});

test('v134 blocks an individual signal with no historical normalized point', () => {
  const signals = Object.freeze([
    historicalSignal(0, {
      stabilityState: 'blocked',
      historicalNormalizedPoint: null,
      blockers: Object.freeze(['historical-negative-delta']),
    }),
    ...Array.from({ length: 9 }, (_, offset) => historicalSignal(offset + 1)),
  ]);
  const result = buildLastfmShadowVariableAdapter(historicalModel(signals));
  const blocked = result.candidates.find((candidate) => candidate.artistId === 'artist-0');
  assert.ok(blocked);
  assert.equal(blocked.state, 'blocked');
  assert.equal(blocked.candidateValue, null);
  assert.ok(blocked.reasons.includes('historical-point-unavailable'));
  assert.ok(blocked.reasons.includes('historical-signal-blocked'));
  assert.equal(result.state, 'blocked');
  assert.ok(result.reasons.includes('shadow-variable-blocked-signals'));
});

test('v134 digest and candidate values are deterministic without applying FANDEX weights', () => {
  const source = historicalModel();
  const first = buildLastfmShadowVariableAdapter(source);
  const second = buildLastfmShadowVariableAdapter(source);
  assert.equal(first.digest, second.digest);
  assert.deepEqual(first.candidates, second.candidates);
  assert.equal(first.candidates[4].candidateValue, 40);
  assert.equal(first.application.defaultWeightApplied, false);
});
