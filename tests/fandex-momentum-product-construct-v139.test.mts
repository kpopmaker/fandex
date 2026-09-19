import assert from 'node:assert/strict';
import test from 'node:test';

import type { ArtistMonthlyMetricPoint } from '../app/data/v4/metrics/fandexMetricTypes';
import {
  LASTFM_CANONICAL_IDENTITIES,
} from '../lib/lastfm-signal/identityQualityGate';
import {
  buildLastfmHistoricalShadowCheckpoint,
} from '../lib/lastfm-signal/historicalShadowCheckpoint';
import {
  evaluateLastfmMomentumConstructAlignment,
} from '../lib/lastfm-signal/momentumConstructAlignment';
import {
  FANDEX_MOMENTUM_COMPONENT_CATALOG,
  FANDEX_MOMENTUM_PRODUCT_CONSTRUCT_RESEARCH_DESCRIPTOR,
  FANDEX_MOMENTUM_PRODUCT_CONSTRUCT_RESEARCH_VERSION,
  evaluateFandexMomentumProductConstructResearch,
} from '../lib/lastfm-signal/momentumProductConstructResearch';

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

function constructResult() {
  const points = metricPoints();
  const checkpoint = buildLastfmHistoricalShadowCheckpoint(historyCsv(), points);
  const alignment = evaluateLastfmMomentumConstructAlignment(checkpoint, points);
  return evaluateFandexMomentumProductConstructResearch(alignment);
}

test('v139 defines momentum as cross-family reaction-change persistence, not a single-provider score', () => {
  const result = constructResult();

  assert.equal(result.contractVersion, FANDEX_MOMENTUM_PRODUCT_CONSTRUCT_RESEARCH_VERSION);
  assert.equal(result.state, 'construct-defined-composite-not-ready');
  assert.equal(
    result.construct,
    'cross-family-persistence-of-recent-directional-reaction-change',
  );
  assert.equal(result.semanticRules.crossFamilyEvidenceRequired, true);
  assert.equal(result.semanticRules.singleFamilySufficient, false);
  assert.equal(result.lastfmAlignment.acceptedRole, 'component-input-research');
  assert.equal(result.lastfmAlignment.directReplacementAllowed, false);
});

test('v139 forbids raw provider averaging, missing-as-zero/stable, and cause/outcome mixing', () => {
  const result = constructResult();

  assert.equal(result.semanticRules.rawCrossProviderAveragingAllowed, false);
  assert.equal(result.semanticRules.missingComponentAsZeroAllowed, false);
  assert.equal(result.semanticRules.missingComponentAsStableAllowed, false);
  assert.equal(result.semanticRules.observationTimeCollectionTimeInterchangeable, false);
  assert.equal(result.semanticRules.eventExposureAsReactionAllowed, false);
  assert.equal(result.semanticRules.sameUnderlyingPhenomenonDoubleCountingAllowed, false);
});

test('v139 current catalog admits Last.fm only as research component and keeps NAVER derivation unresolved', () => {
  const lastfm = FANDEX_MOMENTUM_COMPONENT_CATALOG.find(
    (item) => item.componentId === 'lastfm-audience-consumption-growth-persistence',
  );
  const naver = FANDEX_MOMENTUM_COMPONENT_CATALOG.find(
    (item) => item.componentId === 'naver-media-attention-change-persistence',
  );
  const youtube = FANDEX_MOMENTUM_COMPONENT_CATALOG.find(
    (item) => item.componentId === 'youtube-video-engagement-growth-persistence',
  );

  assert.equal(lastfm?.currentState, 'component-research-candidate');
  assert.equal(lastfm?.directProductContributionEligible, false);
  assert.equal(naver?.currentState, 'derivation-research-required');
  assert.ok(naver?.blockers.includes('momentum-specific-change-derivation-not-frozen'));
  assert.equal(youtube?.currentState, 'source-not-ready');
});

test('v139 excludes activity exposure and event-bounded album reaction from the continuous core construct', () => {
  const activity = FANDEX_MOMENTUM_COMPONENT_CATALOG.find(
    (item) => item.componentId === 'activity-exposure-context',
  );
  const album = FANDEX_MOMENTUM_COMPONENT_CATALOG.find(
    (item) => item.componentId === 'album-purchase-reaction-context',
  );

  assert.equal(activity?.role, 'context-only');
  assert.equal(activity?.currentState, 'excluded-from-core-construct');
  assert.ok(activity?.blockers.includes('cause-outcome-mixing-risk'));

  assert.equal(album?.role, 'context-only');
  assert.equal(album?.requiredTemporalProperty, 'release-relative-event-observations');
  assert.equal(album?.currentState, 'excluded-from-core-construct');
});

test('v139 deliberately leaves normalization, weighting, temporal alignment and missingness aggregation unfrozen', () => {
  const result = constructResult();

  assert.equal(result.freezeStatus.constructSemantics, 'defined-research');
  assert.equal(result.freezeStatus.componentAdmissionRules, 'defined-research');
  assert.equal(result.freezeStatus.componentNormalization, 'not-frozen');
  assert.equal(result.freezeStatus.componentWeighting, 'not-frozen');
  assert.equal(result.freezeStatus.compositeScoreFormula, 'not-frozen');
  assert.equal(result.freezeStatus.temporalAlignmentPolicy, 'not-frozen');
  assert.equal(result.freezeStatus.missingnessAggregationPolicy, 'not-frozen');

  for (const blocker of [
    'cross-family-composite-evidence-not-yet-ready',
    'component-normalization-not-frozen',
    'component-weighting-not-frozen',
    'composite-score-formula-not-frozen',
    'temporal-alignment-policy-not-frozen',
    'missingness-aggregation-policy-not-frozen',
  ]) {
    assert.ok(result.blockers.includes(blocker));
  }
});

test('v139 preserves research-only product safety boundaries', () => {
  assert.equal(FANDEX_MOMENTUM_PRODUCT_CONSTRUCT_RESEARCH_DESCRIPTOR.methodologyFreezePerformed, false);
  assert.equal(FANDEX_MOMENTUM_PRODUCT_CONSTRUCT_RESEARCH_DESCRIPTOR.productActivationAllowed, false);
  assert.equal(FANDEX_MOMENTUM_PRODUCT_CONSTRUCT_RESEARCH_DESCRIPTOR.productionEligible, false);

  const result = constructResult();
  assert.equal(result.effects.externalCalls, 0);
  assert.equal(result.effects.databaseReads, 0);
  assert.equal(result.effects.databaseWrites, 0);
  assert.equal(result.effects.masterScoreWrites, 0);
  assert.equal(result.effects.websiteWrites, 0);
});
