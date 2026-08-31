import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LASTFM_DEFAULT_REPEATED_SHADOW_READINESS_POLICY,
  LASTFM_REPEATED_SHADOW_RECONCILIATION_VERSION,
  evaluateLastfmRepeatedShadowReconciliationReadiness,
  type LastfmRepeatedShadowReadinessPolicy,
} from '../lib/lastfm-signal/repeatedShadowReconciliation';
import {
  buildLastfmShadowScoringReconciliation,
  LASTFM_SHADOW_SCORING_RECONCILIATION_VERSION,
  type LastfmShadowReconciliationItem,
  type LastfmShadowScoringReconciliation,
} from '../lib/lastfm-signal/shadowScoringReconciliation';
import {
  LASTFM_SHADOW_VARIABLE_ADAPTER_VERSION,
  type LastfmShadowVariableAdapterResult,
} from '../lib/lastfm-signal/shadowVariableAdapter';
import type { ArtistMonthlyMetricPoint } from '../app/data/v4/metrics/fandexMetricTypes';
import { sha256Canonical } from '../lib/shared/canonicalDigest';

type SnapshotOptions = Readonly<{
  state?: LastfmShadowScoringReconciliation['state'];
  artistIds?: readonly string[];
  blockedArtistIds?: readonly string[];
  normalizedDelta?: number;
  rankDelta?: number;
}>;

function rounded(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? rounded((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function item(
  snapshotDate: string,
  artistId: string,
  normalizedDelta: number,
  rankDelta: number,
  state: LastfmShadowReconciliationItem['state'] = 'candidate',
): LastfmShadowReconciliationItem {
  const blocked = state === 'blocked';
  const seedNormalized = blocked ? null : 50;
  const shadowValue = blocked ? null : rounded(50 + normalizedDelta);
  const seedRank = blocked ? null : 1;
  const shadowRank = blocked ? null : 1 + rankDelta;
  return Object.freeze({
    artistId,
    metricArtistId: artistId,
    artistLabel: artistId.toUpperCase(),
    snapshotDate,
    variableKey: 'momentum' as const,
    state,
    reasons: Object.freeze(blocked ? ['synthetic-coverage-gap'] : []),
    seed: Object.freeze({
      month: blocked ? null : '2026-07',
      label: blocked ? null : '26.07',
      sourceType: blocked ? null : 'manual_seed' as const,
      quality: blocked ? null : 'tracked' as const,
      rawMomentumPoint: blocked ? null : 50,
      cohortNormalizedMomentum: seedNormalized,
      rank: seedRank,
    }),
    shadow: Object.freeze({
      candidateValue: shadowValue,
      candidateState: blocked ? 'blocked' as const : state,
      rank: shadowRank,
    }),
    comparison: Object.freeze({
      normalizedDelta: blocked ? null : normalizedDelta,
      absoluteNormalizedDelta: blocked ? null : rounded(Math.abs(normalizedDelta)),
      rankDelta: blocked ? null : rankDelta,
      absoluteRankDelta: blocked ? null : Math.abs(rankDelta),
    }),
  });
}

function v135Digest(snapshot: LastfmShadowScoringReconciliation): string {
  return sha256Canonical({
    contractVersion: LASTFM_SHADOW_SCORING_RECONCILIATION_VERSION,
    sourceContractVersion: snapshot.sourceContractVersion,
    snapshotDate: snapshot.snapshotDate,
    targetVariable: snapshot.targetVariable,
    state: snapshot.state,
    reasons: snapshot.reasons,
    items: snapshot.items,
    summary: snapshot.summary,
  });
}

function redigest(
  snapshot: LastfmShadowScoringReconciliation,
): LastfmShadowScoringReconciliation {
  return Object.freeze({ ...snapshot, digest: v135Digest(snapshot) });
}

function snapshot(
  snapshotDate: string,
  options: SnapshotOptions = {},
): LastfmShadowScoringReconciliation {
  const artistIds = options.artistIds ?? ['aespa', 'ive'];
  const blockedArtistIds = new Set(options.blockedArtistIds ?? []);
  const normalizedDelta = options.normalizedDelta ?? 10;
  const rankDelta = options.rankDelta ?? 1;
  const items = Object.freeze(
    artistIds.map((artistId) =>
      item(
        snapshotDate,
        artistId,
        normalizedDelta,
        rankDelta,
        blockedArtistIds.has(artistId) ? 'blocked' : 'candidate',
      ),
    ),
  );
  const comparable = items.filter((candidate) => candidate.comparison.normalizedDelta !== null);
  const candidateCount = items.filter((candidate) => candidate.state === 'candidate').length;
  const observeCount = items.filter((candidate) => candidate.state === 'observe').length;
  const blockedCount = items.filter((candidate) => candidate.state === 'blocked').length;
  const absoluteNormalizedDeltas = comparable.map(
    (candidate) => candidate.comparison.absoluteNormalizedDelta as number,
  );
  const absoluteRankDeltas = comparable.map(
    (candidate) => candidate.comparison.absoluteRankDelta as number,
  );
  const state = options.state ?? (
    comparable.length === 0 ? 'blocked' : blockedCount > 0 ? 'partial' : 'eligible'
  );
  const reasons: string[] = [];
  if (state === 'blocked' && comparable.length > 0) reasons.push('shadow-variable-adapter-blocked');
  if (comparable.length === 0) reasons.push('no-comparable-shadow-signals');
  if (blockedCount > 0) reasons.push('preview-seed-coverage-incomplete');
  const draft = Object.freeze({
    contractVersion: LASTFM_SHADOW_SCORING_RECONCILIATION_VERSION,
    sourceContractVersion: LASTFM_SHADOW_VARIABLE_ADAPTER_VERSION,
    snapshotDate,
    targetVariable: 'momentum' as const,
    state,
    reasons: Object.freeze(reasons),
    expectedSignalCount: items.length,
    comparedCount: comparable.length,
    candidateCount,
    observeCount,
    blockedCount,
    coverageRatio: items.length === 0 ? 0 : rounded(comparable.length / items.length, 4),
    summary: Object.freeze({
      meanAbsoluteNormalizedDelta: comparable.length === 0
        ? null
        : rounded(
            absoluteNormalizedDeltas.reduce((sum, value) => sum + value, 0) / comparable.length,
          ),
      medianAbsoluteNormalizedDelta: median(absoluteNormalizedDeltas),
      maxAbsoluteNormalizedDelta:
        comparable.length === 0 ? null : Math.max(...absoluteNormalizedDeltas),
      meanAbsoluteRankDelta: comparable.length === 0
        ? null
        : rounded(absoluteRankDeltas.reduce((sum, value) => sum + value, 0) / comparable.length),
    }),
    items,
    digest: '',
    application: Object.freeze({
      mode: 'shadow-reconciliation-only' as const,
      masterScoreApplied: false as const,
      metricRegistryModified: false as const,
      publicWebsiteApplied: false as const,
      previewSeedModified: false as const,
    }),
    effects: Object.freeze({
      externalCalls: 0 as const,
      databaseReads: 0 as const,
      databaseWrites: 0 as const,
      masterScoreWrites: 0 as const,
      websiteWrites: 0 as const,
    }),
  }) satisfies LastfmShadowScoringReconciliation;
  return redigest(draft);
}

function replaceFirstItem(
  source: LastfmShadowScoringReconciliation,
  replacement: LastfmShadowReconciliationItem,
): LastfmShadowScoringReconciliation {
  return redigest(Object.freeze({
    ...source,
    items: Object.freeze([replacement, ...source.items.slice(1)]),
  }));
}

const stableSnapshots = () => Object.freeze([
  snapshot('2026-08-29'),
  snapshot('2026-08-30'),
  snapshot('2026-08-31'),
]);

function builderSnapshotWithForbiddenSourceEffect(
  snapshotDate: string,
): LastfmShadowScoringReconciliation {
  const adapter = {
    contractVersion: LASTFM_SHADOW_VARIABLE_ADAPTER_VERSION,
    sourceContractVersion: 'synthetic-v133-source',
    snapshotDate,
    targetVariable: 'momentum',
    state: 'eligible',
    reasons: Object.freeze([]),
    signalCount: 1,
    candidateCount: 1,
    observeCount: 0,
    blockedCount: 0,
    candidates: Object.freeze([{
      artistId: 'aespa',
      artistLabel: 'aespa',
      snapshotDate,
      variableKey: 'momentum',
      candidateValue: 50,
      state: 'candidate',
      reasons: Object.freeze([]),
      source: Object.freeze({
        provider: 'lastfm',
        sourceType: 'preview_signal',
        quality: 'preview',
        historicalNormalizedPoint: 50,
        stabilityState: 'stable',
        windowStartDate: snapshotDate,
        windowEndDate: snapshotDate,
        intervalCount: 3,
        positiveIntervalRatio: 1,
        listenerRelativeMad: 0,
        playcountRelativeMad: 0,
      }),
    }]),
    digest: 'synthetic-adapter-digest',
    application: Object.freeze({
      mode: 'shadow-only',
      masterScoreApplied: false,
      metricRegistryModified: false,
      publicWebsiteApplied: false,
      defaultWeightApplied: false,
    }),
    effects: Object.freeze({
      externalCalls: 0,
      databaseReads: 0,
      databaseWrites: 0,
      masterScoreWrites: 1,
      websiteWrites: 0,
    }),
  } as unknown as LastfmShadowVariableAdapterResult;
  const metricPoints: readonly ArtistMonthlyMetricPoint[] = Object.freeze([{
    artistId: 'aespa',
    month: '2026-08',
    label: '26.08',
    fandexPoint: 50,
    variables: { momentum: 50 },
    sourceType: 'manual_seed',
    quality: 'tracked',
  }]);

  return buildLastfmShadowScoringReconciliation(adapter, metricPoints);
}

test('v136 reports insufficient history before the experimental three-snapshot minimum', () => {
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness(stableSnapshots().slice(0, 2));
  assert.equal(result.state, 'insufficient_history');
  assert.deepEqual(result.reasons, ['insufficient-successive-snapshot-history']);
});

test('v136 promotes stable repeated eligible snapshots only to a readiness candidate', () => {
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness(stableSnapshots());
  assert.equal(result.contractVersion, LASTFM_REPEATED_SHADOW_RECONCILIATION_VERSION);
  assert.equal(result.state, 'readiness_candidate');
  assert.deepEqual(result.dateRange, { startDate: '2026-08-29', endDate: '2026-08-31' });
  assert.deepEqual(
    [result.eligibleSnapshotCount, result.partialSnapshotCount, result.blockedSnapshotCount],
    [3, 0, 0],
  );
  assert.deepEqual(result.history.coverageRatio.map((point) => point.value), [1, 1, 1]);
  assert.deepEqual(result.history.meanAbsoluteNormalizedDelta.map((point) => point.value), [10, 10, 10]);
  assert.deepEqual(result.history.medianAbsoluteNormalizedDelta.map((point) => point.value), [10, 10, 10]);
  assert.deepEqual(result.history.maxAbsoluteNormalizedDelta.map((point) => point.value), [10, 10, 10]);
  assert.deepEqual(result.history.meanAbsoluteRankDelta.map((point) => point.value), [1, 1, 1]);
  assert.deepEqual(result.policy, {
    minimumSuccessiveSnapshots: 3,
    requireLatestEligible: true,
    requireZeroBlockedSnapshots: true,
    minimumCoverageRatio: 1,
    maximumMeanAbsoluteNormalizedDelta: 20,
    maximumMeanAbsoluteRankDelta: 2,
  });
});

test('v136 blocks the full window when one legitimate v135 snapshot is blocked', () => {
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    snapshot('2026-08-30', { blockedArtistIds: ['aespa', 'ive'] }),
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.equal(result.blockedSnapshotCount, 1);
  assert.deepEqual(result.reasons, ['blocked-snapshot-in-evaluation-window']);
});

test('v136 explicitly prevents a valid partial snapshot from contributing to readiness', () => {
  const partial = snapshot('2026-08-30', { blockedArtistIds: ['ive'] });
  const relaxedCoveragePolicy: LastfmRepeatedShadowReadinessPolicy = {
    ...LASTFM_DEFAULT_REPEATED_SHADOW_READINESS_POLICY,
    minimumCoverageRatio: 0.5,
  };
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    partial,
    snapshot('2026-08-31'),
  ], relaxedCoveragePolicy);
  assert.equal(result.state, 'observe');
  assert.equal(result.partialSnapshotCount, 1);
  assert.deepEqual(result.reasons, ['partial-snapshot-in-evaluation-window']);
});

test('v136 observes excessive normalized divergence anywhere in the supplied window', () => {
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    snapshot('2026-08-30', { normalizedDelta: 20.01 }),
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'observe');
  assert.deepEqual(result.reasons, ['mean-absolute-normalized-delta-exceeds-policy']);
});

test('v136 observes excessive rank divergence anywhere in the supplied window', () => {
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    snapshot('2026-08-30', { rankDelta: 3 }),
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'observe');
  assert.deepEqual(result.reasons, ['mean-absolute-rank-delta-exceeds-policy']);
});

test('v136 rejects an empty sequence', () => {
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([]);
  assert.equal(result.state, 'blocked');
  assert.deepEqual(result.reasons, ['snapshot-sequence-empty']);
});

test('v136 rejects an impossible calendar date even when the v135 payload is otherwise coherent', () => {
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-02-30'),
    snapshot('2026-03-01'),
    snapshot('2026-03-02'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.deepEqual(result.reasons, ['snapshot-date-invalid']);
});

test('v136 rejects out-of-order and duplicate snapshot dates', () => {
  const outOfOrder = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    snapshot('2026-08-31'),
    snapshot('2026-08-30'),
  ]);
  assert.equal(outOfOrder.state, 'blocked');
  assert.deepEqual(outOfOrder.reasons, ['snapshot-dates-not-strictly-increasing']);

  const duplicate = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    snapshot('2026-08-29'),
    snapshot('2026-08-31'),
  ]);
  assert.equal(duplicate.state, 'blocked');
  assert.deepEqual(duplicate.reasons, [
    'duplicate-snapshot-date',
    'snapshot-dates-not-strictly-increasing',
  ]);
});

test('v136 rejects a target-variable mismatch', () => {
  const mismatch = {
    ...snapshot('2026-08-30'),
    targetVariable: 'audience',
  } as unknown as LastfmShadowScoringReconciliation;
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    mismatch,
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.ok(result.reasons.includes('target-variable-inconsistent'));
});

test('v136 rejects incompatible reconciliation and source contracts', () => {
  const reconciliationMismatch = {
    ...snapshot('2026-08-30'),
    contractVersion: 'incompatible-v135',
  } as unknown as LastfmShadowScoringReconciliation;
  const sourceMismatch = {
    ...snapshot('2026-08-31'),
    sourceContractVersion: 'incompatible-v134',
  } as unknown as LastfmShadowScoringReconciliation;
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    reconciliationMismatch,
    sourceMismatch,
  ]);
  assert.equal(result.state, 'blocked');
  assert.ok(result.reasons.includes('reconciliation-contract-version-incompatible'));
  assert.ok(result.reasons.includes('source-contract-version-incompatible'));
});

test('v136 rejects a finite inconsistent signed/absolute normalized delta', () => {
  const source = snapshot('2026-08-30');
  const original = source.items[0];
  const malformedItem = Object.freeze({
    ...original,
    shadow: Object.freeze({ ...original.shadow, candidateValue: 40 }),
    comparison: Object.freeze({
      ...original.comparison,
      normalizedDelta: -10,
      absoluteNormalizedDelta: 9,
    }),
  });
  const malformed = replaceFirstItem(source, malformedItem);
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    malformed,
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.ok(result.reasons.includes('snapshot-metrics-internally-inconsistent'));
});

test('v136 rejects a finite inconsistent signed/absolute rank delta', () => {
  const source = snapshot('2026-08-30');
  const original = source.items[0];
  const malformed = replaceFirstItem(source, Object.freeze({
    ...original,
    comparison: Object.freeze({ ...original.comparison, absoluteRankDelta: 2 }),
  }));
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    malformed,
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.ok(result.reasons.includes('snapshot-metrics-internally-inconsistent'));
});

test('v136 independently derives normalized delta from the seed and shadow values', () => {
  const source = snapshot('2026-08-30');
  const original = source.items[0];
  assert.equal(
    original.comparison.normalizedDelta,
    rounded(
      Number(original.shadow.candidateValue) - Number(original.seed.cohortNormalizedMomentum),
    ),
  );
  const malformed = replaceFirstItem(source, Object.freeze({
    ...original,
    comparison: Object.freeze({
      ...original.comparison,
      normalizedDelta: 9,
      absoluteNormalizedDelta: 9,
    }),
  }));
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    malformed,
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.ok(result.reasons.includes('snapshot-metrics-internally-inconsistent'));
});

test('v136 independently derives rank delta from the seed and shadow ranks', () => {
  const source = snapshot('2026-08-30');
  const original = source.items[0];
  assert.equal(
    original.comparison.rankDelta,
    Number(original.shadow.rank) - Number(original.seed.rank),
  );
  const malformed = replaceFirstItem(source, Object.freeze({
    ...original,
    comparison: Object.freeze({
      ...original.comparison,
      rankDelta: 2,
      absoluteRankDelta: 2,
    }),
  }));
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    malformed,
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.ok(result.reasons.includes('snapshot-metrics-internally-inconsistent'));
});

test('v136 rejects comparison null layouts that valid v135 output cannot produce', () => {
  const source = snapshot('2026-08-30');
  const original = source.items[0];
  const malformed = replaceFirstItem(source, Object.freeze({
    ...original,
    comparison: Object.freeze({
      ...original.comparison,
      rankDelta: null,
      absoluteRankDelta: null,
    }),
  }));
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    malformed,
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.ok(result.reasons.includes('snapshot-metrics-internally-inconsistent'));
});

for (const summaryField of [
  'meanAbsoluteNormalizedDelta',
  'medianAbsoluteNormalizedDelta',
  'maxAbsoluteNormalizedDelta',
  'meanAbsoluteRankDelta',
] as const) {
  test(`v136 rejects an inconsistent ${summaryField} summary`, () => {
    const source = snapshot('2026-08-30');
    const malformed = redigest(Object.freeze({
      ...source,
      summary: Object.freeze({ ...source.summary, [summaryField]: 9 }),
    }));
    const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
      snapshot('2026-08-29'),
      malformed,
      snapshot('2026-08-31'),
    ]);
    assert.equal(result.state, 'blocked');
    assert.ok(result.reasons.includes('snapshot-metrics-internally-inconsistent'));
  });
}

for (const countChange of [
  ['expectedSignalCount', 3],
  ['comparedCount', 1],
  ['candidateCount', 1],
  ['observeCount', 1],
  ['blockedCount', 1],
] as const) {
  test(`v136 derives and validates ${countChange[0]} from items`, () => {
    const source = snapshot('2026-08-30');
    const malformed = Object.freeze({ ...source, [countChange[0]]: countChange[1] });
    const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
      snapshot('2026-08-29'),
      malformed,
      snapshot('2026-08-31'),
    ]);
    assert.equal(result.state, 'blocked');
    assert.ok(result.reasons.includes('snapshot-metrics-internally-inconsistent'));
  });
}

test('v136 derives and validates coverage ratio from items', () => {
  const source = snapshot('2026-08-30');
  const malformed = Object.freeze({ ...source, coverageRatio: 0.5 });
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    malformed,
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.ok(result.reasons.includes('snapshot-metrics-internally-inconsistent'));
});

test('v136 blocks builder-produced v135 source-side-effect reasons', () => {
  const unsafeSnapshots = [
    builderSnapshotWithForbiddenSourceEffect('2026-08-29'),
    builderSnapshotWithForbiddenSourceEffect('2026-08-30'),
    builderSnapshotWithForbiddenSourceEffect('2026-08-31'),
  ];
  for (const unsafeSnapshot of unsafeSnapshots) {
    assert.equal(unsafeSnapshot.state, 'eligible');
    assert.deepEqual(unsafeSnapshot.reasons, ['source-side-effects-not-read-only']);
    assert.deepEqual(unsafeSnapshot.effects, {
      externalCalls: 0,
      databaseReads: 0,
      databaseWrites: 0,
      masterScoreWrites: 0,
      websiteWrites: 0,
    });
  }

  const result = evaluateLastfmRepeatedShadowReconciliationReadiness(unsafeSnapshots);
  assert.equal(result.state, 'blocked');
  assert.notEqual(result.state as string, 'readiness_candidate');
  assert.deepEqual(result.reasons, ['forbidden-upstream-safety-reason-reported']);
  assert.deepEqual(result.effects, {
    externalCalls: 0,
    databaseReads: 0,
    databaseWrites: 0,
    masterScoreWrites: 0,
    websiteWrites: 0,
  });
});

test('v136 rejects a fabricated unknown v135 top-level reason', () => {
  const source = snapshot('2026-08-30');
  const malformed = redigest(Object.freeze({
    ...source,
    reasons: Object.freeze(['fabricated-v135-reason']),
  }));
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    malformed,
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.deepEqual(result.reasons, ['snapshot-reasons-internally-inconsistent']);
});

test('v136 accepts a canonical supported v135 reason set as structurally valid', () => {
  const partial = snapshot('2026-08-30', { blockedArtistIds: ['ive'] });
  assert.deepEqual(partial.reasons, ['preview-seed-coverage-incomplete']);
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    partial,
    snapshot('2026-08-31'),
  ], {
    ...LASTFM_DEFAULT_REPEATED_SHADOW_READINESS_POLICY,
    minimumCoverageRatio: 0.5,
  });
  assert.equal(result.state, 'observe');
  assert.deepEqual(result.reasons, ['partial-snapshot-in-evaluation-window']);
});

test('v136 rejects a duplicated legitimate v135 top-level reason', () => {
  const source = snapshot('2026-08-30', { blockedArtistIds: ['ive'] });
  const malformed = redigest(Object.freeze({
    ...source,
    reasons: Object.freeze([
      'preview-seed-coverage-incomplete',
      'preview-seed-coverage-incomplete',
    ]),
  }));
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    malformed,
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.deepEqual(result.reasons, ['snapshot-reasons-internally-inconsistent']);
});

test('v136 rejects a missing no-comparable reason when v135 semantics require it', () => {
  const source = snapshot('2026-08-30', { blockedArtistIds: ['aespa', 'ive'] });
  assert.deepEqual(source.reasons, [
    'no-comparable-shadow-signals',
    'preview-seed-coverage-incomplete',
  ]);
  const malformed = redigest(Object.freeze({
    ...source,
    reasons: Object.freeze(['preview-seed-coverage-incomplete']),
  }));
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    malformed,
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.deepEqual(result.reasons, ['snapshot-reasons-internally-inconsistent']);
});

test('v136 rejects a fabricated no-comparable reason when comparable signals exist', () => {
  const source = snapshot('2026-08-30');
  const malformed = redigest(Object.freeze({
    ...source,
    reasons: Object.freeze(['no-comparable-shadow-signals']),
  }));
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    malformed,
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.deepEqual(result.reasons, ['snapshot-reasons-internally-inconsistent']);
});

test('v136 rejects a missing preview-coverage reason when v135 semantics require it', () => {
  const source = snapshot('2026-08-30', { blockedArtistIds: ['ive'] });
  const malformed = redigest(Object.freeze({
    ...source,
    reasons: Object.freeze([]),
  }));
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    malformed,
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.deepEqual(result.reasons, ['snapshot-reasons-internally-inconsistent']);
});

test('v136 rejects a fabricated preview-coverage reason when coverage is complete', () => {
  const source = snapshot('2026-08-30');
  const malformed = redigest(Object.freeze({
    ...source,
    reasons: Object.freeze(['preview-seed-coverage-incomplete']),
  }));
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    malformed,
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.deepEqual(result.reasons, ['snapshot-reasons-internally-inconsistent']);
});

test('v136 produces deterministic output for multiple malformed v135 reasons', () => {
  const source = snapshot('2026-08-30');
  const malformed = redigest(Object.freeze({
    ...source,
    reasons: Object.freeze([
      'preview-seed-coverage-incomplete',
      'no-comparable-shadow-signals',
      'preview-seed-coverage-incomplete',
      'fabricated-v135-reason',
    ]),
  }));
  const input = [snapshot('2026-08-29'), malformed, snapshot('2026-08-31')];
  const first = evaluateLastfmRepeatedShadowReconciliationReadiness(input);
  const second = evaluateLastfmRepeatedShadowReconciliationReadiness(input);
  assert.equal(first.state, 'blocked');
  assert.deepEqual(first.reasons, ['snapshot-reasons-internally-inconsistent']);
  assert.deepEqual(second.reasons, first.reasons);
  assert.equal(second.digest, first.digest);
});

test('v136 blocks a malformed partial snapshot that claims eligible full coverage', () => {
  const eligible = snapshot('2026-08-30');
  const malformed = redigest(Object.freeze({
    ...eligible,
    state: 'partial' as const,
    reasons: Object.freeze(['preview-seed-coverage-incomplete']),
  }));
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    malformed,
    snapshot('2026-08-31'),
  ]);
  assert.equal(result.state, 'blocked');
  assert.ok(result.reasons.includes('snapshot-state-inconsistent'));
});

test('v136 requires the latest snapshot to be eligible', () => {
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    snapshot('2026-08-30'),
    snapshot('2026-08-31', { blockedArtistIds: ['ive'] }),
  ]);
  assert.equal(result.state, 'observe');
  assert.deepEqual(result.reasons, [
    'partial-snapshot-in-evaluation-window',
    'latest-snapshot-not-eligible',
    'coverage-below-policy',
  ]);
});

test('v136 artist persistence exposes an artist missing from one supplied snapshot', () => {
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
    snapshot('2026-08-29'),
    snapshot('2026-08-30'),
    snapshot('2026-08-31', { artistIds: ['aespa'] }),
  ]);
  assert.equal(result.state, 'readiness_candidate');
  const ive = result.artistPersistence.find((artist) => artist.artistId === 'ive');
  assert.ok(ive);
  assert.equal(ive.snapshotCount, 2);
  assert.equal(ive.comparableSnapshotCount, 2);
  assert.equal(ive.presenceRatio, 0.6667);
  assert.equal(ive.comparableRatio, 0.6667);
  assert.equal(ive.candidateSnapshotCount, 2);
  assert.equal(ive.blockedSnapshotCount, 0);
});

test('v136 custom policy changes readiness state and deterministic digest', () => {
  const input = stableSnapshots();
  const defaultResult = evaluateLastfmRepeatedShadowReconciliationReadiness(input);
  const stricterPolicy: LastfmRepeatedShadowReadinessPolicy = {
    ...LASTFM_DEFAULT_REPEATED_SHADOW_READINESS_POLICY,
    maximumMeanAbsoluteNormalizedDelta: 9,
  };
  const strictFirst = evaluateLastfmRepeatedShadowReconciliationReadiness(input, stricterPolicy);
  const strictSecond = evaluateLastfmRepeatedShadowReconciliationReadiness(input, stricterPolicy);
  assert.equal(defaultResult.state, 'readiness_candidate');
  assert.equal(strictFirst.state, 'observe');
  assert.notEqual(defaultResult.digest, strictFirst.digest);
  assert.equal(strictFirst.digest, strictSecond.digest);
});

test('v136 rejects a policy that tries to permit blocked snapshot history', () => {
  const unsafePolicy: LastfmRepeatedShadowReadinessPolicy = {
    ...LASTFM_DEFAULT_REPEATED_SHADOW_READINESS_POLICY,
    requireZeroBlockedSnapshots: false,
  };
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness(stableSnapshots(), unsafePolicy);
  assert.equal(result.state, 'blocked');
  assert.deepEqual(result.reasons, ['readiness-policy-invalid']);
});

test('v136 digest and repeated summaries are deterministic for identical semantic input', () => {
  const first = evaluateLastfmRepeatedShadowReconciliationReadiness(stableSnapshots());
  const second = evaluateLastfmRepeatedShadowReconciliationReadiness(stableSnapshots());
  assert.equal(first.digest, second.digest);
  assert.deepEqual(first.history, second.history);
  assert.deepEqual(first.artistPersistence, second.artistPersistence);
});

test('v136 multiple simultaneous failures use deterministic ordered reasons', () => {
  const base = snapshot('2026-02-30');
  const malformed = {
    ...base,
    contractVersion: 'bad-v135',
    sourceContractVersion: 'bad-v134',
    targetVariable: 'audience',
    summary: { ...base.summary, meanAbsoluteNormalizedDelta: Number.NaN },
    effects: { ...base.effects, externalCalls: 1 },
  } as unknown as LastfmShadowScoringReconciliation;
  const expectedReasons = [
    'snapshot-date-invalid',
    'target-variable-inconsistent',
    'reconciliation-contract-version-incompatible',
    'source-contract-version-incompatible',
    'snapshot-metrics-internally-inconsistent',
    'snapshot-state-inconsistent',
    'snapshot-digest-inconsistent',
    'snapshot-reasons-internally-inconsistent',
    'forbidden-source-effects-reported',
  ];
  const first = evaluateLastfmRepeatedShadowReconciliationReadiness([malformed]);
  const second = evaluateLastfmRepeatedShadowReconciliationReadiness([malformed]);
  assert.equal(first.state, 'blocked');
  assert.deepEqual(first.reasons, expectedReasons);
  assert.deepEqual(second.reasons, expectedReasons);
  assert.equal(first.digest, second.digest);
});

const safetyViolations = [
  ['externalCalls', (source: LastfmShadowScoringReconciliation) => ({
    ...source,
    effects: { ...source.effects, externalCalls: 1 },
  })],
  ['databaseReads', (source: LastfmShadowScoringReconciliation) => ({
    ...source,
    effects: { ...source.effects, databaseReads: 1 },
  })],
  ['databaseWrites', (source: LastfmShadowScoringReconciliation) => ({
    ...source,
    effects: { ...source.effects, databaseWrites: 1 },
  })],
  ['masterScoreWrites', (source: LastfmShadowScoringReconciliation) => ({
    ...source,
    effects: { ...source.effects, masterScoreWrites: 1 },
  })],
  ['websiteWrites', (source: LastfmShadowScoringReconciliation) => ({
    ...source,
    effects: { ...source.effects, websiteWrites: 1 },
  })],
  ['masterScoreApplied', (source: LastfmShadowScoringReconciliation) => ({
    ...source,
    application: { ...source.application, masterScoreApplied: true },
  })],
  ['metricRegistryModified', (source: LastfmShadowScoringReconciliation) => ({
    ...source,
    application: { ...source.application, metricRegistryModified: true },
  })],
  ['publicWebsiteApplied', (source: LastfmShadowScoringReconciliation) => ({
    ...source,
    application: { ...source.application, publicWebsiteApplied: true },
  })],
  ['previewSeedModified', (source: LastfmShadowScoringReconciliation) => ({
    ...source,
    application: { ...source.application, previewSeedModified: true },
  })],
  ['application mode', (source: LastfmShadowScoringReconciliation) => ({
    ...source,
    application: { ...source.application, mode: 'production' },
  })],
] as const;

for (const [label, violate] of safetyViolations) {
  test(`v136 rejects the ${label} safety-boundary violation`, () => {
    const forbidden = violate(snapshot('2026-08-31')) as unknown as LastfmShadowScoringReconciliation;
    const result = evaluateLastfmRepeatedShadowReconciliationReadiness([
      snapshot('2026-08-29'),
      snapshot('2026-08-30'),
      forbidden,
    ]);
    assert.equal(result.state, 'blocked');
    assert.deepEqual(result.reasons, ['forbidden-source-effects-reported']);
  });
}

test('v136 readiness candidate remains advisory, immutable, and exactly read-only', () => {
  const snapshots = stableSnapshots();
  const before = structuredClone(snapshots);
  const result = evaluateLastfmRepeatedShadowReconciliationReadiness(snapshots);
  assert.deepEqual(snapshots, before);
  assert.equal(result.state, 'readiness_candidate');
  assert.deepEqual(result.application, {
    mode: 'shadow-readiness-only',
    masterScoreApplied: false,
    metricRegistryModified: false,
    publicWebsiteApplied: false,
    previewSeedModified: false,
  });
  assert.deepEqual(result.effects, {
    externalCalls: 0,
    databaseReads: 0,
    databaseWrites: 0,
    masterScoreWrites: 0,
    websiteWrites: 0,
  });
  assert.ok(!('productionScoringAuthorized' in result.application));
});
