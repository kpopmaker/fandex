import assert from 'node:assert/strict';
import test from 'node:test';

import { artistUniverseV4 } from '../app/data/v4/artistUniverse';
import {
  LASTFM_CANONICAL_IDENTITIES,
  LASTFM_EXPECTED_SIGNAL_COUNT,
  applyLastfmIdentityQualityGate,
} from '../lib/lastfm-signal/identityQualityGate';
import {
  LASTFM_CLOUD_HISTORY_VERSION,
  LASTFM_CLOUD_SCORE_USAGE,
  LASTFM_REAL_SIGNAL_READ_MODEL_VERSION,
  type LastfmRealSignal,
  type LastfmRealSignalReadModel,
} from '../lib/lastfm-signal/contracts';

function signal(index: number): LastfmRealSignal {
  const identity = LASTFM_CANONICAL_IDENTITIES[index];
  return Object.freeze({
    artistLabel: identity.artistLabel,
    query: identity.expectedQuery,
    resolvedLastfmName: identity.acceptedLastfmNames[0],
    previousDate: '2026-08-29',
    latestDate: '2026-08-30',
    collectedAt: '2026-08-30T00:00:00+09:00',
    listeners: 1_000_000 + index,
    playcount: 100_000_000 + index,
    listenerDelta: 100 + index,
    playcountDelta: 10_000 + index,
    listenerDeltaPerDay: 100 + index,
    playcountDeltaPerDay: 10_000 + index,
    listenerLogNormalized: 50 + index,
    playcountLogNormalized: 50 + index,
    previewPoint: 50 + index,
    sourceRank: index + 1,
    sourceStatus: 'preview_ready',
  });
}

function model(overrides: Partial<LastfmRealSignalReadModel> = {}): LastfmRealSignalReadModel {
  const signals = Object.freeze(
    Array.from({ length: LASTFM_EXPECTED_SIGNAL_COUNT }, (_, index) => signal(index)),
  );
  return Object.freeze({
    contractVersion: LASTFM_REAL_SIGNAL_READ_MODEL_VERSION,
    sourceVersion: LASTFM_CLOUD_HISTORY_VERSION,
    sourceUsage: LASTFM_CLOUD_SCORE_USAGE,
    sourceCreatedAt: '2026-08-30T14:28:49+09:00',
    snapshotDate: '2026-08-30',
    readiness: Object.freeze({
      state: 'ready' as const,
      reasons: Object.freeze([]),
      signalCount: LASTFM_EXPECTED_SIGNAL_COUNT,
      deltaReadyCount: LASTFM_EXPECTED_SIGNAL_COUNT,
      needsReviewCount: 0,
    }),
    signals,
    digest: 'synthetic-v131-digest',
    effects: Object.freeze({
      externalCalls: 0 as const,
      databaseReads: 0 as const,
      databaseWrites: 0 as const,
      masterScoreWrites: 0 as const,
      websiteWrites: 0 as const,
    }),
    ...overrides,
  });
}

const canonicalIds = new Set(artistUniverseV4.map((artist) => artist.id));

test('all ten Last.fm identities resolve to existing FANDEX canonical artists', () => {
  assert.equal(LASTFM_CANONICAL_IDENTITIES.length, LASTFM_EXPECTED_SIGNAL_COUNT);
  assert.equal(new Set(LASTFM_CANONICAL_IDENTITIES.map((identity) => identity.artistLabel)).size, 10);
  assert.equal(new Set(LASTFM_CANONICAL_IDENTITIES.map((identity) => identity.artistId)).size, 10);
  for (const identity of LASTFM_CANONICAL_IDENTITIES) {
    assert.equal(canonicalIds.has(identity.artistId), true, identity.artistId);
  }
});

test('complete resolved source becomes eligible without changing master score or website', () => {
  const result = applyLastfmIdentityQualityGate(model(), canonicalIds);
  assert.equal(result.state, 'eligible');
  assert.deepEqual(result.reasons, []);
  assert.equal(result.resolvedSignalCount, 10);
  assert.equal(result.eligibleSignalCount, 10);
  assert.ok(result.signals.every((item) => item.qualityState === 'eligible'));
  assert.deepEqual(result.effects, {
    externalCalls: 0,
    databaseReads: 0,
    databaseWrites: 0,
    masterScoreWrites: 0,
    websiteWrites: 0,
  });
});

test('missing canonical artist fails the quality gate closed', () => {
  const ids = new Set(canonicalIds);
  ids.delete('aespa');
  const result = applyLastfmIdentityQualityGate(model(), ids);
  assert.equal(result.state, 'blocked');
  assert.ok(result.reasons.includes('quality-coverage-incomplete'));
  const aespa = result.signals.find((item) => item.artistId === 'aespa');
  assert.ok(aespa?.blockers.includes('canonical-artist-missing'));
});

test('provider query drift is preserved as a blocker rather than silently remapped', () => {
  const signals = [...model().signals];
  signals[0] = Object.freeze({ ...signals[0], query: 'New Jeans' });
  const result = applyLastfmIdentityQualityGate(
    model({ signals: Object.freeze(signals) }),
    canonicalIds,
  );
  assert.equal(result.state, 'blocked');
  assert.ok(result.signals[0].blockers.includes('provider-query-mismatch'));
});

test('blocked v131 source cannot become v132 eligible', () => {
  const source = model({
    readiness: Object.freeze({
      state: 'blocked' as const,
      reasons: Object.freeze(['source-needs-review']),
      signalCount: 10,
      deltaReadyCount: 9,
      needsReviewCount: 1,
    }),
  });
  const result = applyLastfmIdentityQualityGate(source, canonicalIds);
  assert.equal(result.state, 'blocked');
  assert.ok(result.reasons.includes('source-read-model-blocked'));
});

test('v132 gate digest is deterministic for identical inputs', () => {
  const left = applyLastfmIdentityQualityGate(model(), canonicalIds);
  const right = applyLastfmIdentityQualityGate(model(), canonicalIds);
  assert.equal(left.digest, right.digest);
});
