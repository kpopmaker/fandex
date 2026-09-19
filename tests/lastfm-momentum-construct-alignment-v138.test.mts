import assert from 'node:assert/strict';
import test from 'node:test';

import { artistIndexChartProfiles } from '../app/data/v4/charts/artistIndexChartData';
import { artistMonthlyMetricSeed } from '../app/data/v4/metrics/artistMonthlyMetricSeed';
import type { ArtistMonthlyMetricPoint } from '../app/data/v4/metrics/fandexMetricTypes';
import {
  LASTFM_CANONICAL_IDENTITIES,
} from '../lib/lastfm-signal/identityQualityGate';
import {
  buildLastfmHistoricalShadowCheckpoint,
} from '../lib/lastfm-signal/historicalShadowCheckpoint';
import {
  LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_DESCRIPTOR,
  LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_VERSION,
  evaluateLastfmMomentumConstructAlignment,
} from '../lib/lastfm-signal/momentumConstructAlignment';

function historyCsv(days = 10): string {
  const headers = [
    'snapshotDate', 'artist', 'query', 'lastfmName', 'listeners', 'playcount', 'collectedAt', 'status',
  ];
  const rows: string[] = [headers.join(',')];
  for (let day = 1; day <= days; day += 1) {
    const date = `2026-08-${String(day).padStart(2, '0')}`;
    LASTFM_CANONICAL_IDENTITIES.forEach((identity, index) => {
      const rate = 2 ** index;
      rows.push([
        date,
        identity.artistLabel,
        identity.expectedQuery,
        identity.acceptedLastfmNames[0],
        100_000 + rate * day,
        1_000_000 + rate * 10 * day,
        `${date}T10:00:00+09:00`,
        'ok',
      ].join(','));
    });
  }
  return rows.join('\n') + '\n';
}

function fullMetricPoints(): readonly ArtistMonthlyMetricPoint[] {
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

test('legacy growthMomentumPoint is mechanically generated from the editorial chart seed formula', () => {
  for (const profile of artistIndexChartProfiles) {
    profile.history.forEach((point, index) => {
      assert.equal(
        point.growthMomentumPoint,
        Math.round((point.fandexPoint / 100) * (11 + (index % 5))),
      );
    });
  }
});

test('v138 classifies Last.fm as a component input, never a direct momentum replacement', () => {
  const metrics = fullMetricPoints();
  const checkpoint = buildLastfmHistoricalShadowCheckpoint(historyCsv(), metrics);
  const result = evaluateLastfmMomentumConstructAlignment(checkpoint, metrics);

  assert.equal(result.contractVersion, LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_VERSION);
  assert.equal(result.state, 'component_research_candidate');
  assert.equal(result.constructs.equivalentForDirectReplacement, false);
  assert.equal(result.legacyComparator.role, 'diagnostic-only');
  assert.equal(result.legacyComparator.formulaSeedVerified, true);
  assert.equal(result.legacyComparator.comparableArtistCount, 10);
  assert.deepEqual(result.legacyComparator.missingArtistIds, []);
  assert.equal(result.decision.directReplacementAllowed, false);
  assert.equal(result.decision.legacyDivergencePromotionGate, false);
  assert.equal(result.decision.v136ReadinessCanAuthorizePromotion, false);
  assert.equal(result.decision.thresholdRelaxationToForceReadinessAllowed, false);
  assert.equal(result.decision.futureCompositeOrConstructRedefinitionRequiredForProductMomentum, true);
  assert.equal(result.decision.productionEligible, false);
});

test('v138 does not repair the default legacy IU coverage gap by synthesizing a seed', () => {
  const checkpoint = buildLastfmHistoricalShadowCheckpoint(historyCsv(), fullMetricPoints());
  const result = evaluateLastfmMomentumConstructAlignment(checkpoint, artistMonthlyMetricSeed);

  assert.ok(result.legacyComparator.missingArtistIds.includes('iu'));
  assert.equal(result.legacyComparator.comparableArtistCount, 9);
  assert.ok(result.reasons.includes('legacy-comparator-coverage-incomplete'));
  assert.equal(result.decision.syntheticSeedBackfillAllowed, false);
  assert.equal(result.state, 'component_research_candidate');
});

test('v138 says legacy divergence is diagnostic even if v137 remains observe', () => {
  const checkpoint = buildLastfmHistoricalShadowCheckpoint(historyCsv(), fullMetricPoints());
  const result = evaluateLastfmMomentumConstructAlignment(checkpoint, fullMetricPoints());

  assert.equal(result.checkpoint.state, checkpoint.state);
  assert.equal(result.legacyComparator.role, 'diagnostic-only');
  assert.ok(result.reasons.includes('constructs-not-equivalent-for-direct-replacement'));
  assert.ok(result.reasons.includes('threshold-relaxation-not-justified-by-construct-mismatch'));
});

test('v138 descriptor preserves all research-only safety boundaries', () => {
  assert.equal(LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_DESCRIPTOR.recommendedRole, 'component-input-research');
  assert.equal(LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_DESCRIPTOR.directReplacementAllowed, false);
  assert.equal(LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_DESCRIPTOR.methodologyFreezePerformed, false);
  assert.equal(LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_DESCRIPTOR.productActivationAllowed, false);
  assert.equal(LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_DESCRIPTOR.productionEligible, false);
});
