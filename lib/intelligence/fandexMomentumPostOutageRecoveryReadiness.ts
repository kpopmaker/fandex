import {
  NAVER_NEWS_ISSUE_POINT_CONSTRUCT,
} from './naverNewsIssuePointConstruct';
import {
  evaluateNaverNewsIssuePointFrozenMethodology,
  type NaverNewsIssuePointFrozenMethodologyResult,
} from '../server/ingestion/naverNewsIssuePointFrozenMethodology';
import type {
  NaverNewsShadowFirstSeenSeriesResult,
} from '../server/ingestion/naverNewsShadowFirstSeenSeries';

export const FANDEX_MOMENTUM_POST_OUTAGE_RECOVERY_READINESS_VERSION =
  'momentum-post-outage-recovery-readiness-v1' as const;

const HOUR_MS = 60 * 60 * 1_000;
const NAVER_NATIVE_CADENCE_HOURS =
  NAVER_NEWS_ISSUE_POINT_CONSTRUCT.selectedWindowDurationHours;

export type FandexMomentumPostOutageRecoveryReadinessResult = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_POST_OUTAGE_RECOVERY_READINESS_VERSION;
  state:
    | 'official-epoch-gap-blocked'
    | 'naver-source-not-ready'
    | 'lookahead-blocked'
    | 'temporal-alignment-not-ready'
    | 'ready-for-v140-replay'
    | 'blocked';
  canonicalArtistId: string;
  lastfmComponentEndAt: string;
  requestedNaverThroughSlotStart: string;
  officialProtocolStart: string;
  missingSlotStart: string | null;
  naverIssuePointStatus: NaverNewsIssuePointFrozenMethodologyResult['status'] | null;
  naverIssuePointReason: NaverNewsIssuePointFrozenMethodologyResult['reason'] | null;
  naverFreshnessLagHours: number | null;
  naverNativeCadenceHours: number;
  futureEvidenceUsed: false;
  blockers: readonly string[];
  safety: Readonly<{
    databaseMode: 'read-only';
    databaseWrites: 0;
    historyWritePerformed: false;
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    registryMutations: 0;
    productionActivations: 0;
  }>;
}>;

export type FandexMomentumPostOutageRecoveryReadinessDependencies = Readonly<{
  evaluateIssuePoint?: typeof evaluateNaverNewsIssuePointFrozenMethodology;
}>;

const SAFETY = Object.freeze({
  databaseMode: 'read-only' as const,
  databaseWrites: 0 as const,
  historyWritePerformed: false as const,
  productMetricReads: 0 as const,
  productMetricWrites: 0 as const,
  previewFallbackReads: 0 as const,
  registryMutations: 0 as const,
  productionActivations: 0 as const,
});

function exactIso(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    throw new Error('momentum_post_outage_recovery_timestamp_invalid');
  }
  return timestamp;
}

function result(
  input: Readonly<{
    state: FandexMomentumPostOutageRecoveryReadinessResult['state'];
    canonicalArtistId: string;
    lastfmComponentEndAt: string;
    series: NaverNewsShadowFirstSeenSeriesResult;
    issuePoint?: NaverNewsIssuePointFrozenMethodologyResult | null;
    freshnessLagHours?: number | null;
    blockers: readonly string[];
  }>,
): FandexMomentumPostOutageRecoveryReadinessResult {
  return Object.freeze({
    contractVersion: FANDEX_MOMENTUM_POST_OUTAGE_RECOVERY_READINESS_VERSION,
    state: input.state,
    canonicalArtistId: input.canonicalArtistId,
    lastfmComponentEndAt: input.lastfmComponentEndAt,
    requestedNaverThroughSlotStart: input.series.throughSlotStart,
    officialProtocolStart: input.series.protocolStart,
    missingSlotStart: input.series.missingSlotStart,
    naverIssuePointStatus: input.issuePoint?.status ?? null,
    naverIssuePointReason: input.issuePoint?.reason ?? null,
    naverFreshnessLagHours: input.freshnessLagHours ?? null,
    naverNativeCadenceHours: NAVER_NATIVE_CADENCE_HOURS,
    futureEvidenceUsed: false as const,
    blockers: Object.freeze([...input.blockers]),
    safety: SAFETY,
  });
}

export function evaluateFandexMomentumPostOutageRecoveryReadiness(
  input: Readonly<{
    canonicalArtistId: string;
    lastfmComponentEndAt: string;
    naverSeries: NaverNewsShadowFirstSeenSeriesResult;
  }>,
  dependencies: FandexMomentumPostOutageRecoveryReadinessDependencies = {},
): FandexMomentumPostOutageRecoveryReadinessResult {
  const lastfmEnd = exactIso(input.lastfmComponentEndAt);
  const naverThrough = exactIso(input.naverSeries.throughSlotStart);
  exactIso(input.naverSeries.protocolStart);

  if (
    input.canonicalArtistId.length === 0
    || input.naverSeries.canonicalArtistId !== input.canonicalArtistId
  ) {
    return result({
      state: 'blocked',
      canonicalArtistId: input.canonicalArtistId,
      lastfmComponentEndAt: input.lastfmComponentEndAt,
      series: input.naverSeries,
      blockers: ['artist-identity-mismatch'],
    });
  }

  if (input.naverSeries.status !== 'available') {
    const officialGap =
      input.naverSeries.reason === 'expected_job_missing'
      && input.naverSeries.missingSlotStart !== null;
    return result({
      state: officialGap
        ? 'official-epoch-gap-blocked'
        : 'naver-source-not-ready',
      canonicalArtistId: input.canonicalArtistId,
      lastfmComponentEndAt: input.lastfmComponentEndAt,
      series: input.naverSeries,
      blockers: officialGap
        ? [
            'official-epoch-continuity-gap',
            'backfill-not-authorized',
            'current-frozen-methodology-requires-official-epoch',
          ]
        : ['naver-source-series-unavailable'],
    });
  }

  const issuePoint = (
    dependencies.evaluateIssuePoint
    ?? evaluateNaverNewsIssuePointFrozenMethodology
  )(input.naverSeries);

  if (issuePoint.status !== 'available') {
    return result({
      state: 'naver-source-not-ready',
      canonicalArtistId: input.canonicalArtistId,
      lastfmComponentEndAt: input.lastfmComponentEndAt,
      series: input.naverSeries,
      issuePoint,
      blockers: [
        'naver-frozen-methodology-point-unavailable',
        issuePoint.reason,
      ],
    });
  }

  if (naverThrough > lastfmEnd) {
    return result({
      state: 'lookahead-blocked',
      canonicalArtistId: input.canonicalArtistId,
      lastfmComponentEndAt: input.lastfmComponentEndAt,
      series: input.naverSeries,
      issuePoint,
      blockers: ['future-naver-evidence-forbidden'],
    });
  }

  const freshnessLagHours =
    Math.round(((lastfmEnd - naverThrough) / HOUR_MS) * 1_000_000) / 1_000_000;

  if (freshnessLagHours > NAVER_NATIVE_CADENCE_HOURS) {
    return result({
      state: 'temporal-alignment-not-ready',
      canonicalArtistId: input.canonicalArtistId,
      lastfmComponentEndAt: input.lastfmComponentEndAt,
      series: input.naverSeries,
      issuePoint,
      freshnessLagHours,
      blockers: ['naver-component-freshness-outside-native-cadence'],
    });
  }

  return result({
    state: 'ready-for-v140-replay',
    canonicalArtistId: input.canonicalArtistId,
    lastfmComponentEndAt: input.lastfmComponentEndAt,
    series: input.naverSeries,
    issuePoint,
    freshnessLagHours,
    blockers: [],
  });
}
