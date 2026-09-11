import { artistMonthlyMetricSeed } from '../../app/data/v4/metrics/artistMonthlyMetricSeed';
import type { ArtistMonthlyMetricPoint } from '../../app/data/v4/metrics/fandexMetricTypes';
import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  LastfmShadowVariableAdapterResult,
  LastfmShadowVariableCandidate,
} from './shadowVariableAdapter';

export const LASTFM_SHADOW_SCORING_RECONCILIATION_VERSION =
  'v135_lastfm_shadow_scoring_reconciliation_v1' as const;

export const LASTFM_LEGACY_METRIC_ARTIST_ID_ALIASES = Object.freeze({
  straykids: 'stray-kids',
} as const);

export type LastfmShadowReconciliationState = 'candidate' | 'observe' | 'blocked';

export type LastfmShadowReconciliationItem = Readonly<{
  artistId: string;
  metricArtistId: string;
  artistLabel: string;
  snapshotDate: string;
  variableKey: 'momentum';
  state: LastfmShadowReconciliationState;
  reasons: readonly string[];
  seed: Readonly<{
    month: string | null;
    label: string | null;
    sourceType: ArtistMonthlyMetricPoint['sourceType'] | null;
    quality: ArtistMonthlyMetricPoint['quality'] | null;
    rawMomentumPoint: number | null;
    cohortNormalizedMomentum: number | null;
    rank: number | null;
  }>;
  shadow: Readonly<{
    candidateValue: number | null;
    candidateState: LastfmShadowVariableCandidate['state'];
    rank: number | null;
  }>;
  comparison: Readonly<{
    normalizedDelta: number | null;
    absoluteNormalizedDelta: number | null;
    rankDelta: number | null;
    absoluteRankDelta: number | null;
  }>;
}>;

export type LastfmShadowScoringReconciliation = Readonly<{
  contractVersion: typeof LASTFM_SHADOW_SCORING_RECONCILIATION_VERSION;
  sourceContractVersion: LastfmShadowVariableAdapterResult['contractVersion'];
  snapshotDate: string;
  targetVariable: 'momentum';
  state: 'eligible' | 'partial' | 'blocked';
  reasons: readonly string[];
  expectedSignalCount: number;
  comparedCount: number;
  candidateCount: number;
  observeCount: number;
  blockedCount: number;
  coverageRatio: number;
  summary: Readonly<{
    meanAbsoluteNormalizedDelta: number | null;
    medianAbsoluteNormalizedDelta: number | null;
    maxAbsoluteNormalizedDelta: number | null;
    meanAbsoluteRankDelta: number | null;
  }>;
  items: readonly LastfmShadowReconciliationItem[];
  digest: string;
  application: Readonly<{
    mode: 'shadow-reconciliation-only';
    masterScoreApplied: false;
    metricRegistryModified: false;
    publicWebsiteApplied: false;
    previewSeedModified: false;
  }>;
  effects: Readonly<{
    externalCalls: 0;
    databaseReads: 0;
    databaseWrites: 0;
    masterScoreWrites: 0;
    websiteWrites: 0;
  }>;
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

function metricArtistId(artistId: string): string {
  return (
    LASTFM_LEGACY_METRIC_ARTIST_ID_ALIASES[
      artistId as keyof typeof LASTFM_LEGACY_METRIC_ARTIST_ID_ALIASES
    ] ?? artistId
  );
}

function latestMetricByArtist(
  points: readonly ArtistMonthlyMetricPoint[],
): ReadonlyMap<string, ArtistMonthlyMetricPoint> {
  const latest = new Map<string, ArtistMonthlyMetricPoint>();
  for (const point of points) {
    const current = latest.get(point.artistId);
    if (!current || point.month.localeCompare(current.month) > 0) latest.set(point.artistId, point);
  }
  return latest;
}

function minMax(values: readonly number[]): readonly number[] {
  if (values.length === 0) return Object.freeze([]);
  const low = Math.min(...values);
  const high = Math.max(...values);
  if (high === low) return Object.freeze(values.map(() => 50));
  return Object.freeze(values.map((value) => rounded(((value - low) / (high - low)) * 100)));
}

function rankByValue(entries: readonly Readonly<{ key: string; value: number }>[]): ReadonlyMap<string, number> {
  const sorted = [...entries].sort((left, right) => right.value - left.value || left.key.localeCompare(right.key));
  const ranks = new Map<string, number>();
  let previousValue: number | null = null;
  let previousRank = 0;
  sorted.forEach((entry, index) => {
    const rank = previousValue !== null && entry.value === previousValue ? previousRank : index + 1;
    ranks.set(entry.key, rank);
    previousValue = entry.value;
    previousRank = rank;
  });
  return ranks;
}

export function buildLastfmShadowScoringReconciliation(
  adapter: LastfmShadowVariableAdapterResult,
  metricPoints: readonly ArtistMonthlyMetricPoint[],
): LastfmShadowScoringReconciliation {
  const reasons: string[] = [];
  if (adapter.state !== 'eligible') reasons.push('shadow-variable-adapter-blocked');
  if (adapter.targetVariable !== 'momentum') reasons.push('unexpected-shadow-variable');
  if (
    adapter.effects.masterScoreWrites !== 0 ||
    adapter.effects.websiteWrites !== 0 ||
    adapter.effects.databaseWrites !== 0
  ) {
    reasons.push('source-side-effects-not-read-only');
  }

  const latestMetrics = latestMetricByArtist(metricPoints);
  const prelim = adapter.candidates.map((candidate) => {
    const resolvedMetricArtistId = metricArtistId(candidate.artistId);
    const metric = latestMetrics.get(resolvedMetricArtistId) ?? null;
    const momentum = metric?.variables.momentum ?? null;
    const itemReasons: string[] = [];

    if (!metric) itemReasons.push('preview-metric-point-missing');
    if (metric && (momentum === null || momentum === undefined)) itemReasons.push('preview-momentum-missing');
    if (typeof momentum === 'number' && (!Number.isFinite(momentum) || momentum < 0)) {
      itemReasons.push('preview-momentum-invalid');
    }
    if (candidate.candidateValue === null) itemReasons.push('shadow-candidate-unavailable');
    if (
      candidate.candidateValue !== null &&
      (!Number.isFinite(candidate.candidateValue) || candidate.candidateValue < 0 || candidate.candidateValue > 100)
    ) {
      itemReasons.push('shadow-candidate-invalid');
    }
    if (candidate.state === 'blocked') itemReasons.push('shadow-candidate-blocked');

    return Object.freeze({
      candidate,
      metricArtistId: resolvedMetricArtistId,
      metric,
      momentum: typeof momentum === 'number' ? momentum : null,
      reasons: Object.freeze(itemReasons),
    });
  });

  const comparable = prelim.filter(
    (item) => item.reasons.length === 0 && item.momentum !== null && item.candidate.candidateValue !== null,
  );
  const seedNormalized = minMax(comparable.map((item) => Number(item.momentum)));
  const seedNormalizedByArtist = new Map<string, number>();
  comparable.forEach((item, index) => seedNormalizedByArtist.set(item.candidate.artistId, seedNormalized[index]));

  const seedRanks = rankByValue(
    comparable.map((item) => ({
      key: item.candidate.artistId,
      value: seedNormalizedByArtist.get(item.candidate.artistId) ?? 0,
    })),
  );
  const shadowRanks = rankByValue(
    comparable.map((item) => ({
      key: item.candidate.artistId,
      value: Number(item.candidate.candidateValue),
    })),
  );

  const items = Object.freeze(
    prelim.map((item) => {
      const seedNormalizedValue = seedNormalizedByArtist.get(item.candidate.artistId) ?? null;
      const shadowValue = item.candidate.candidateValue;
      const seedRank = seedRanks.get(item.candidate.artistId) ?? null;
      const shadowRank = shadowRanks.get(item.candidate.artistId) ?? null;
      const normalizedDelta =
        seedNormalizedValue !== null && shadowValue !== null
          ? rounded(shadowValue - seedNormalizedValue)
          : null;
      const rankDelta = seedRank !== null && shadowRank !== null ? shadowRank - seedRank : null;
      const state: LastfmShadowReconciliationState =
        item.reasons.length > 0
          ? 'blocked'
          : item.candidate.state === 'candidate'
            ? 'candidate'
            : 'observe';

      return Object.freeze({
        artistId: item.candidate.artistId,
        metricArtistId: item.metricArtistId,
        artistLabel: item.candidate.artistLabel,
        snapshotDate: adapter.snapshotDate,
        variableKey: 'momentum' as const,
        state,
        reasons: item.reasons,
        seed: Object.freeze({
          month: item.metric?.month ?? null,
          label: item.metric?.label ?? null,
          sourceType: item.metric?.sourceType ?? null,
          quality: item.metric?.quality ?? null,
          rawMomentumPoint: item.momentum,
          cohortNormalizedMomentum: seedNormalizedValue,
          rank: seedRank,
        }),
        shadow: Object.freeze({
          candidateValue: shadowValue,
          candidateState: item.candidate.state,
          rank: shadowRank,
        }),
        comparison: Object.freeze({
          normalizedDelta,
          absoluteNormalizedDelta: normalizedDelta === null ? null : rounded(Math.abs(normalizedDelta)),
          rankDelta,
          absoluteRankDelta: rankDelta === null ? null : Math.abs(rankDelta),
        }),
      });
    }),
  );

  const compared = items.filter((item) => item.comparison.normalizedDelta !== null);
  const candidateCount = items.filter((item) => item.state === 'candidate').length;
  const observeCount = items.filter((item) => item.state === 'observe').length;
  const blockedCount = items.filter((item) => item.state === 'blocked').length;
  const absoluteDeltas = compared
    .map((item) => item.comparison.absoluteNormalizedDelta)
    .filter((value): value is number => value !== null);
  const absoluteRankDeltas = compared
    .map((item) => item.comparison.absoluteRankDelta)
    .filter((value): value is number => value !== null);

  if (compared.length === 0) reasons.push('no-comparable-shadow-signals');
  if (blockedCount > 0) reasons.push('preview-seed-coverage-incomplete');

  const state = reasons.includes('shadow-variable-adapter-blocked') || compared.length === 0
    ? 'blocked' as const
    : blockedCount > 0
      ? 'partial' as const
      : 'eligible' as const;
  const coverageRatio = adapter.signalCount === 0 ? 0 : rounded(compared.length / adapter.signalCount, 4);
  const summary = Object.freeze({
    meanAbsoluteNormalizedDelta:
      absoluteDeltas.length === 0
        ? null
        : rounded(absoluteDeltas.reduce((sum, value) => sum + value, 0) / absoluteDeltas.length),
    medianAbsoluteNormalizedDelta: median(absoluteDeltas),
    maxAbsoluteNormalizedDelta: absoluteDeltas.length === 0 ? null : Math.max(...absoluteDeltas),
    meanAbsoluteRankDelta:
      absoluteRankDeltas.length === 0
        ? null
        : rounded(absoluteRankDeltas.reduce((sum, value) => sum + value, 0) / absoluteRankDeltas.length),
  });

  const digestPayload = {
    contractVersion: LASTFM_SHADOW_SCORING_RECONCILIATION_VERSION,
    sourceContractVersion: adapter.contractVersion,
    snapshotDate: adapter.snapshotDate,
    targetVariable: adapter.targetVariable,
    state,
    reasons,
    items,
    summary,
  };

  return Object.freeze({
    contractVersion: LASTFM_SHADOW_SCORING_RECONCILIATION_VERSION,
    sourceContractVersion: adapter.contractVersion,
    snapshotDate: adapter.snapshotDate,
    targetVariable: 'momentum' as const,
    state,
    reasons: Object.freeze(reasons),
    expectedSignalCount: adapter.signalCount,
    comparedCount: compared.length,
    candidateCount,
    observeCount,
    blockedCount,
    coverageRatio,
    summary,
    items,
    digest: sha256Canonical(digestPayload),
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
  });
}

export function buildLastfmShadowScoringReconciliationFromCurrentSeed(
  adapter: LastfmShadowVariableAdapterResult,
): LastfmShadowScoringReconciliation {
  return buildLastfmShadowScoringReconciliation(adapter, artistMonthlyMetricSeed);
}
