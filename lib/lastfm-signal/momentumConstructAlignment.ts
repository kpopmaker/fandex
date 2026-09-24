import { artistIndexChartProfiles } from '../../app/data/v4/charts/artistIndexChartData';
import { artistMonthlyMetricSeed } from '../../app/data/v4/metrics/artistMonthlyMetricSeed';
import { getMetricDefinitionByKey } from '../../app/data/v4/metrics/fandexMetricDefinitions';
import { getMetricSourceInfo } from '../../app/data/v4/metrics/fandexMetricSourceRegistry';
import type { ArtistMonthlyMetricPoint } from '../../app/data/v4/metrics/fandexMetricTypes';
import { sha256Canonical } from '../shared/canonicalDigest';
import {
  LASTFM_CANONICAL_IDENTITIES,
} from './identityQualityGate';
import {
  LASTFM_HISTORICAL_SHADOW_CHECKPOINT_VERSION,
  type LastfmHistoricalShadowCheckpoint,
} from './historicalShadowCheckpoint';

export const LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_VERSION =
  'v138_lastfm_momentum_construct_alignment_v1' as const;

export const LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_DESCRIPTOR = Object.freeze({
  contractVersion: LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_VERSION,
  lifecycle: 'research' as const,
  targetVariable: 'momentum' as const,
  lastfmConstruct: 'audience-consumption-growth-persistence' as const,
  fandexMomentumConstruct: 'composite-recent-reaction-change-persistence' as const,
  recommendedRole: 'component-input-research' as const,
  legacyComparatorRole: 'diagnostic-only' as const,
  directReplacementAllowed: false as const,
  legacyDivergencePromotionGate: false as const,
  v136ReadinessCanAuthorizePromotion: false as const,
  syntheticSeedBackfillAllowed: false as const,
  thresholdRelaxationToForceReadinessAllowed: false as const,
  methodologyFreezePerformed: false as const,
  productActivationAllowed: false as const,
  productionEligible: false as const,
});

export type LastfmMomentumConstructAlignment = Readonly<{
  contractVersion: typeof LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_VERSION;
  sourceCheckpointVersion: typeof LASTFM_HISTORICAL_SHADOW_CHECKPOINT_VERSION;
  state: 'component_research_candidate' | 'blocked';
  targetVariable: 'momentum';
  constructs: Readonly<{
    lastfm: 'audience-consumption-growth-persistence';
    fandexMomentum: 'composite-recent-reaction-change-persistence';
    equivalentForDirectReplacement: false;
  }>;
  legacyComparator: Readonly<{
    sourceStage: string;
    qualityLabel: string;
    legacyChartKey: string | null;
    formulaSeedVerified: boolean;
    comparableArtistCount: number;
    expectedArtistCount: number;
    missingArtistIds: readonly string[];
    role: 'diagnostic-only';
  }>;
  checkpoint: Readonly<{
    state: LastfmHistoricalShadowCheckpoint['state'];
    replaySnapshotCount: number;
    latestCoverage: number | null;
    latestMeanAbsoluteNormalizedDelta: number | null;
    latestMeanAbsoluteRankDelta: number | null;
  }>;
  decision: Readonly<{
    recommendedRole: 'component-input-research';
    directReplacementAllowed: false;
    legacyDivergencePromotionGate: false;
    v136ReadinessCanAuthorizePromotion: false;
    syntheticSeedBackfillAllowed: false;
    thresholdRelaxationToForceReadinessAllowed: false;
    futureCompositeOrConstructRedefinitionRequiredForProductMomentum: true;
    methodologyFreezePerformed: false;
    productActivationAllowed: false;
    productionEligible: false;
  }>;
  reasons: readonly string[];
  digest: string;
  effects: Readonly<{
    externalCalls: 0;
    databaseReads: 0;
    databaseWrites: 0;
    masterScoreWrites: 0;
    websiteWrites: 0;
  }>;
}>;

function legacyFormulaSeedVerified(): boolean {
  return artistIndexChartProfiles.every((profile) =>
    profile.history.every((point, index) =>
      point.growthMomentumPoint ===
        Math.round((point.fandexPoint / 100) * (11 + (index % 5))),
    ),
  );
}

function latestMetricIds(metricPoints: readonly ArtistMonthlyMetricPoint[]): ReadonlySet<string> {
  const latestMonthByArtist = new Map<string, string>();
  for (const point of metricPoints) {
    const current = latestMonthByArtist.get(point.artistId);
    if (!current || point.month > current) latestMonthByArtist.set(point.artistId, point.month);
  }
  return new Set(latestMonthByArtist.keys());
}

function metricArtistId(canonicalArtistId: string): string {
  return canonicalArtistId === 'straykids' ? 'stray-kids' : canonicalArtistId;
}

export function evaluateLastfmMomentumConstructAlignment(
  checkpoint: LastfmHistoricalShadowCheckpoint,
  metricPoints: readonly ArtistMonthlyMetricPoint[] = artistMonthlyMetricSeed,
): LastfmMomentumConstructAlignment {
  const reasons: string[] = [];
  const definition = getMetricDefinitionByKey('momentum');
  const sourceInfo = getMetricSourceInfo('momentum');
  const formulaSeedVerified = legacyFormulaSeedVerified();
  const metricIds = latestMetricIds(metricPoints);
  const expectedMetricIds = LASTFM_CANONICAL_IDENTITIES.map((identity) =>
    metricArtistId(identity.artistId),
  );
  const missingArtistIds = Object.freeze(
    LASTFM_CANONICAL_IDENTITIES
      .filter((identity) => !metricIds.has(metricArtistId(identity.artistId)))
      .map((identity) => identity.artistId),
  );
  const comparableArtistCount = expectedMetricIds.length - missingArtistIds.length;

  if (checkpoint.contractVersion !== LASTFM_HISTORICAL_SHADOW_CHECKPOINT_VERSION) {
    reasons.push('checkpoint-contract-incompatible');
  }
  if (checkpoint.effects.externalCalls !== 0 || checkpoint.effects.databaseWrites !== 0) {
    reasons.push('checkpoint-side-effects-not-read-only');
  }
  if (checkpoint.application.productionApplied !== false) {
    reasons.push('checkpoint-production-boundary-violated');
  }
  if (sourceInfo.sourceStage !== 'derived_signal' || sourceInfo.qualityLabel !== 'preview') {
    reasons.push('legacy-momentum-source-semantics-changed');
  }
  if (definition?.legacyChartKey !== 'growthMomentumPoint') {
    reasons.push('legacy-momentum-key-bridge-changed');
  }
  if (!formulaSeedVerified) {
    reasons.push('legacy-growth-momentum-formula-seed-changed');
  }

  const blocked = reasons.length > 0;
  if (!blocked) {
    reasons.push(
      'legacy-momentum-is-derived-preview-seed',
      'lastfm-is-single-source-audience-growth-signal',
      'constructs-not-equivalent-for-direct-replacement',
      'legacy-comparison-retained-diagnostic-only',
    );
    if (missingArtistIds.length > 0) reasons.push('legacy-comparator-coverage-incomplete');
    reasons.push('threshold-relaxation-not-justified-by-construct-mismatch');
  }

  const latestCoverage = checkpoint.repeatedReadiness.history.coverageRatio.at(-1)?.value ?? null;
  const latestMeanAbsoluteNormalizedDelta =
    checkpoint.repeatedReadiness.history.meanAbsoluteNormalizedDelta.at(-1)?.value ?? null;
  const latestMeanAbsoluteRankDelta =
    checkpoint.repeatedReadiness.history.meanAbsoluteRankDelta.at(-1)?.value ?? null;

  const payload = {
    contractVersion: LASTFM_MOMENTUM_CONSTRUCT_ALIGNMENT_VERSION,
    sourceCheckpointVersion: LASTFM_HISTORICAL_SHADOW_CHECKPOINT_VERSION,
    state: blocked ? 'blocked' as const : 'component_research_candidate' as const,
    targetVariable: 'momentum' as const,
    constructs: {
      lastfm: 'audience-consumption-growth-persistence' as const,
      fandexMomentum: 'composite-recent-reaction-change-persistence' as const,
      equivalentForDirectReplacement: false as const,
    },
    legacyComparator: {
      sourceStage: sourceInfo.sourceStage,
      qualityLabel: sourceInfo.qualityLabel,
      legacyChartKey: definition?.legacyChartKey ?? null,
      formulaSeedVerified,
      comparableArtistCount,
      expectedArtistCount: expectedMetricIds.length,
      missingArtistIds,
      role: 'diagnostic-only' as const,
    },
    checkpoint: {
      state: checkpoint.state,
      replaySnapshotCount: checkpoint.replaySnapshotCount,
      latestCoverage,
      latestMeanAbsoluteNormalizedDelta,
      latestMeanAbsoluteRankDelta,
    },
    decision: {
      recommendedRole: 'component-input-research' as const,
      directReplacementAllowed: false as const,
      legacyDivergencePromotionGate: false as const,
      v136ReadinessCanAuthorizePromotion: false as const,
      syntheticSeedBackfillAllowed: false as const,
      thresholdRelaxationToForceReadinessAllowed: false as const,
      futureCompositeOrConstructRedefinitionRequiredForProductMomentum: true as const,
      methodologyFreezePerformed: false as const,
      productActivationAllowed: false as const,
      productionEligible: false as const,
    },
    reasons: Object.freeze(reasons),
  };

  return Object.freeze({
    ...payload,
    constructs: Object.freeze(payload.constructs),
    legacyComparator: Object.freeze(payload.legacyComparator),
    checkpoint: Object.freeze(payload.checkpoint),
    decision: Object.freeze(payload.decision),
    digest: sha256Canonical(payload),
    effects: Object.freeze({
      externalCalls: 0 as const,
      databaseReads: 0 as const,
      databaseWrites: 0 as const,
      masterScoreWrites: 0 as const,
      websiteWrites: 0 as const,
    }),
  });
}
