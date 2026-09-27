import { sha256Canonical } from '../shared/canonicalDigest';
import { parseCsvRows, requireCsvColumns } from '../lastfm-signal/csv';
import {
  buildLastfmHistoricalReplaySourceBundle,
} from '../lastfm-signal/historicalShadowCheckpoint';
import { buildLastfmRealSignalReadModel } from '../lastfm-signal/readModel';
import {
  LASTFM_CANONICAL_IDENTITIES,
  applyLastfmIdentityQualityGate,
} from '../lastfm-signal/identityQualityGate';
import { buildLastfmHistoricalWindowModel } from '../lastfm-signal/historicalWindow';
import { buildLastfmShadowVariableAdapter } from '../lastfm-signal/shadowVariableAdapter';
import {
  FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_VERSION,
  type FandexNaverMediaAttentionMomentumResearchResult,
} from './fandexNaverMediaAttentionMomentumResearch';

export const FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_VERSION =
  'v141_fandex_momentum_temporal_normalization_research_v1' as const;

export const FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_DESCRIPTOR =
  Object.freeze({
    contractVersion: FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_VERSION,
    lifecycle: 'research' as const,
    targetVariable: 'momentum' as const,
    componentFamilies: Object.freeze([
      'audience-consumption',
      'media-attention',
    ] as const),
    temporalAlignment:
      'latest-common-component-end-cutoff-without-lookahead' as const,
    normalization:
      'same-artist-same-family-historical-strict-exceedance-share' as const,
    currentIncludedInBaseline: false as const,
    tieHandling:
      'included-in-denominator-excluded-from-numerator' as const,
    missingAsZeroAllowed: false as const,
    missingAsStableAllowed: false as const,
    futureEvidenceAllowed: false as const,
    familyNativeDirectionPreserved: true as const,
    familyNativePersistencePreserved: true as const,
    crossFamilyRawAveragingAllowed: false as const,
    crossFamilyNormalizedAveragingAllowed: false as const,
    componentWeightingFrozen: false as const,
    compositeScoreProduced: false as const,
    methodologyFreezePerformed: false as const,
    productActivationAllowed: false as const,
    productionEligible: false as const,
  });

const LASTFM_HISTORY_COLUMNS = [
  'snapshotDate',
  'artist',
  'query',
  'lastfmName',
  'listeners',
  'playcount',
  'collectedAt',
  'status',
] as const;

type Direction = 'up' | 'down' | 'flat';

type LastfmReplayPoint = Readonly<{
  snapshotDate: string;
  componentEndAt: string;
  nativeValue: number;
  sourceState: 'candidate' | 'observe';
}>;

type NativePoint = Readonly<{
  key: string;
  componentEndAt: string;
  nativeValue: number;
}>;

export type FandexMomentumNormalizedComponent = Readonly<{
  family: 'audience-consumption' | 'media-attention';
  canonicalArtistId: string;
  sourceValueKind:
    | 'lastfm-historical-normalized-growth-point'
    | 'naver-current-activity-rate';
  nativeCadenceHours: 24 | 8;
  selectedKey: string;
  selectedComponentEndAt: string;
  alignmentCutoffAt: string;
  freshnessLagHours: number;
  freshnessWithinNativeCadence: boolean;
  nativeValue: number;
  priorDefinedCount: number;
  priorLessThanCurrentCount: number;
  priorEqualToCurrentCount: number;
  priorGreaterThanCurrentCount: number;
  historicalStrictExceedanceShare: number | null;
  previousNativeValue: number | null;
  nativeDelta: number | null;
  direction: Direction | null;
  latestDirectionalRunTransitionCount: number;
  latestDirectionalRunDurationHours: number;
  missingAsZeroApplied: false;
  missingAsStableApplied: false;
}>;

export type FandexMomentumTemporalNormalizationResearchResult = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_VERSION;
  state:
    | 'aligned-normalized-research'
    | 'normalization-history-insufficient'
    | 'temporal-alignment-unavailable'
    | 'blocked';
  canonicalArtistId: string;
  alignmentCutoffAt: string | null;
  alignmentPolicy: 'latest-common-component-end-cutoff-without-lookahead';
  normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE_WITHIN_ARTIST_FAMILY';
  components: readonly FandexMomentumNormalizedComponent[];
  componentCount: number;
  normalizedComponentCount: number;
  futureEvidenceUsed: false;
  crossFamilyRawAveragingApplied: false;
  crossFamilyNormalizedAveragingApplied: false;
  componentWeights: null;
  compositeScore: null;
  freezeStatus: Readonly<{
    temporalAlignmentPolicy: 'defined-research';
    componentNormalization: 'defined-research';
    componentWeighting: 'not-frozen';
    compositeScoreFormula: 'not-frozen';
  }>;
  blockers: readonly string[];
  digest: string;
  effects: Readonly<{
    externalCalls: 0;
    databaseReads: 0;
    databaseWrites: 0;
    masterScoreWrites: 0;
    websiteWrites: 0;
  }>;
}>;

function canonicalArtistIdForLastfm(identityId: string): string {
  return identityId === 'straykids' ? 'stray-kids' : identityId;
}

function parseTimestamp(value: string, errorCode: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(errorCode);
  return timestamp;
}

function round(value: number, digits = 12): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function direction(delta: number): Direction {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

function calendarDayDiff(left: string, right: string): number {
  const leftMs = Date.parse(`${left}T00:00:00.000Z`);
  const rightMs = Date.parse(`${right}T00:00:00.000Z`);
  return Math.round((rightMs - leftMs) / 86_400_000);
}

function buildLastfmReplayPoints(
  historyCsv: string,
  canonicalArtistId: string,
): readonly LastfmReplayPoint[] {
  const rows = parseCsvRows(historyCsv);
  requireCsvColumns(rows, LASTFM_HISTORY_COLUMNS);
  const identity = LASTFM_CANONICAL_IDENTITIES.find(
    (candidate) => canonicalArtistIdForLastfm(candidate.artistId) === canonicalArtistId,
  );
  if (!identity) throw new Error('momentum_v141_lastfm_artist_not_tracked');

  const dates = [...new Set(
    rows
      .filter((row) => row.artist.normalize('NFC').trim() === identity.artistLabel)
      .map((row) => row.snapshotDate.normalize('NFC').trim()),
  )].sort();
  const canonicalArtistIds = new Set(
    LASTFM_CANONICAL_IDENTITIES.map((candidate) => candidate.artistId),
  );
  const points: LastfmReplayPoint[] = [];

  for (const snapshotDate of dates) {
    const sourceBundle = buildLastfmHistoricalReplaySourceBundle(
      historyCsv,
      snapshotDate,
    );
    const readModel = buildLastfmRealSignalReadModel(sourceBundle);
    const gate = applyLastfmIdentityQualityGate(
      readModel,
      canonicalArtistIds,
    );
    const historical = buildLastfmHistoricalWindowModel(
      gate,
      sourceBundle.historyCsv,
    );
    const adapter = buildLastfmShadowVariableAdapter(historical);
    const candidate = adapter.candidates.find(
      (item) => canonicalArtistIdForLastfm(item.artistId) === canonicalArtistId,
    );
    if (!candidate || candidate.candidateValue === null || candidate.state === 'blocked') {
      continue;
    }

    const collectedAtValues = rows
      .filter(
        (row) =>
          row.artist.normalize('NFC').trim() === identity.artistLabel
          && row.snapshotDate.normalize('NFC').trim() === snapshotDate,
      )
      .map((row) => row.collectedAt.normalize('NFC').trim());
    if (collectedAtValues.length !== 1) {
      throw new Error('momentum_v141_lastfm_snapshot_collection_time_ambiguous');
    }
    parseTimestamp(
      collectedAtValues[0],
      'momentum_v141_lastfm_collection_time_invalid',
    );
    points.push(Object.freeze({
      snapshotDate,
      componentEndAt: collectedAtValues[0],
      nativeValue: candidate.candidateValue,
      sourceState: candidate.state,
    }));
  }

  return Object.freeze(points);
}

function strictHistoricalPosition(
  current: number,
  priorValues: readonly number[],
): Readonly<{
  priorDefinedCount: number;
  priorLessThanCurrentCount: number;
  priorEqualToCurrentCount: number;
  priorGreaterThanCurrentCount: number;
  historicalStrictExceedanceShare: number | null;
}> {
  if (priorValues.length === 0) {
    return Object.freeze({
      priorDefinedCount: 0,
      priorLessThanCurrentCount: 0,
      priorEqualToCurrentCount: 0,
      priorGreaterThanCurrentCount: 0,
      historicalStrictExceedanceShare: null,
    });
  }
  const lower = priorValues.filter((value) => value < current).length;
  const equal = priorValues.filter((value) => value === current).length;
  const greater = priorValues.length - lower - equal;
  return Object.freeze({
    priorDefinedCount: priorValues.length,
    priorLessThanCurrentCount: lower,
    priorEqualToCurrentCount: equal,
    priorGreaterThanCurrentCount: greater,
    historicalStrictExceedanceShare: round(100 * lower / priorValues.length),
  });
}

function latestRun(
  points: readonly NativePoint[],
  cadenceHours: number,
  cadenceKey: 'calendar-day' | 'exact-hours',
): Readonly<{
  previousNativeValue: number | null;
  nativeDelta: number | null;
  direction: Direction | null;
  runCount: number;
}> {
  if (points.length < 2) {
    return Object.freeze({
      previousNativeValue: null,
      nativeDelta: null,
      direction: null,
      runCount: 0,
    });
  }

  const transitions: Array<Readonly<{ direction: Direction; delta: number }>> = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    let contiguous = false;
    if (cadenceKey === 'calendar-day') {
      contiguous = calendarDayDiff(previous.key, current.key) === 1;
    } else {
      contiguous =
        (parseTimestamp(current.componentEndAt, 'momentum_v141_timestamp_invalid')
          - parseTimestamp(previous.componentEndAt, 'momentum_v141_timestamp_invalid'))
        === cadenceHours * 60 * 60 * 1_000;
    }
    if (!contiguous) {
      transitions.length = 0;
      continue;
    }
    const delta = round(current.nativeValue - previous.nativeValue);
    transitions.push(Object.freeze({ direction: direction(delta), delta }));
  }

  const latestTransition = transitions.at(-1);
  if (!latestTransition) {
    return Object.freeze({
      previousNativeValue: null,
      nativeDelta: null,
      direction: null,
      runCount: 0,
    });
  }

  let runCount = 0;
  for (let index = transitions.length - 1; index >= 0; index -= 1) {
    if (transitions[index].direction !== latestTransition.direction) break;
    runCount += 1;
  }
  return Object.freeze({
    previousNativeValue: points.at(-2)?.nativeValue ?? null,
    nativeDelta: latestTransition.delta,
    direction: latestTransition.direction,
    runCount,
  });
}

function componentDescriptor(
  input: Readonly<{
    family: 'audience-consumption' | 'media-attention';
    canonicalArtistId: string;
    sourceValueKind:
      | 'lastfm-historical-normalized-growth-point'
      | 'naver-current-activity-rate';
    nativeCadenceHours: 24 | 8;
    selected: NativePoint;
    eligibleHistory: readonly NativePoint[];
    alignmentCutoffAt: string;
    cadenceKey: 'calendar-day' | 'exact-hours';
  }>,
): FandexMomentumNormalizedComponent {
  const selectedTimestamp = parseTimestamp(
    input.selected.componentEndAt,
    'momentum_v141_selected_timestamp_invalid',
  );
  const cutoffTimestamp = parseTimestamp(
    input.alignmentCutoffAt,
    'momentum_v141_cutoff_invalid',
  );
  if (selectedTimestamp > cutoffTimestamp) {
    throw new Error('momentum_v141_future_evidence_forbidden');
  }

  const prior = input.eligibleHistory.filter(
    (point) =>
      parseTimestamp(point.componentEndAt, 'momentum_v141_history_timestamp_invalid')
      < selectedTimestamp,
  );
  const position = strictHistoricalPosition(
    input.selected.nativeValue,
    prior.map((point) => point.nativeValue),
  );
  const throughSelected = input.eligibleHistory.filter(
    (point) =>
      parseTimestamp(point.componentEndAt, 'momentum_v141_history_timestamp_invalid')
      <= selectedTimestamp,
  );
  const persistence = latestRun(
    throughSelected,
    input.nativeCadenceHours,
    input.cadenceKey,
  );
  const freshnessLagHours = round(
    (cutoffTimestamp - selectedTimestamp) / (60 * 60 * 1_000),
    6,
  );

  return Object.freeze({
    family: input.family,
    canonicalArtistId: input.canonicalArtistId,
    sourceValueKind: input.sourceValueKind,
    nativeCadenceHours: input.nativeCadenceHours,
    selectedKey: input.selected.key,
    selectedComponentEndAt: input.selected.componentEndAt,
    alignmentCutoffAt: input.alignmentCutoffAt,
    freshnessLagHours,
    freshnessWithinNativeCadence:
      freshnessLagHours >= 0 && freshnessLagHours <= input.nativeCadenceHours,
    nativeValue: input.selected.nativeValue,
    ...position,
    previousNativeValue: persistence.previousNativeValue,
    nativeDelta: persistence.nativeDelta,
    direction: persistence.direction,
    latestDirectionalRunTransitionCount: persistence.runCount,
    latestDirectionalRunDurationHours:
      persistence.runCount * input.nativeCadenceHours,
    missingAsZeroApplied: false as const,
    missingAsStableApplied: false as const,
  });
}

export function evaluateFandexMomentumTemporalNormalizationResearch(
  input: Readonly<{
    canonicalArtistId: string;
    lastfmHistoryCsv: string;
    naverComponent: FandexNaverMediaAttentionMomentumResearchResult;
  }>,
): FandexMomentumTemporalNormalizationResearchResult {
  const hardBlockers: string[] = [];
  if (
    input.naverComponent.contractVersion
      !== FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_VERSION
    || input.naverComponent.canonicalArtistId !== input.canonicalArtistId
  ) {
    hardBlockers.push('naver-component-contract-or-artist-mismatch');
  }
  if (
    input.naverComponent.effects.externalCalls !== 0
    || input.naverComponent.effects.databaseWrites !== 0
    || input.naverComponent.effects.masterScoreWrites !== 0
    || input.naverComponent.effects.websiteWrites !== 0
  ) {
    hardBlockers.push('naver-component-side-effects-not-read-only');
  }

  const lastfmPoints = buildLastfmReplayPoints(
    input.lastfmHistoryCsv,
    input.canonicalArtistId,
  );
  const naverPoints: readonly NativePoint[] = Object.freeze(
    input.naverComponent.anchors.map((anchor) => Object.freeze({
      key: anchor.throughSlotStart,
      componentEndAt: anchor.throughSlotStart,
      nativeValue: anchor.currentActivityRate,
    })),
  );

  const lastfmLatest = lastfmPoints.at(-1);
  const naverLatest = naverPoints.at(-1);
  if (!lastfmLatest || !naverLatest) {
    hardBlockers.push('component-history-unavailable');
  }

  let alignmentCutoffAt: string | null = null;
  const components: FandexMomentumNormalizedComponent[] = [];

  if (hardBlockers.length === 0 && lastfmLatest && naverLatest) {
    const lastfmLatestMs = parseTimestamp(
      lastfmLatest.componentEndAt,
      'momentum_v141_lastfm_latest_invalid',
    );
    const naverLatestMs = parseTimestamp(
      naverLatest.componentEndAt,
      'momentum_v141_naver_latest_invalid',
    );
    alignmentCutoffAt = new Date(
      Math.min(lastfmLatestMs, naverLatestMs),
    ).toISOString();

    const selectedLastfm = [...lastfmPoints].reverse().find(
      (point) =>
        parseTimestamp(point.componentEndAt, 'momentum_v141_lastfm_point_invalid')
        <= parseTimestamp(alignmentCutoffAt as string, 'momentum_v141_cutoff_invalid'),
    );
    const selectedNaver = [...naverPoints].reverse().find(
      (point) =>
        parseTimestamp(point.componentEndAt, 'momentum_v141_naver_point_invalid')
        <= parseTimestamp(alignmentCutoffAt as string, 'momentum_v141_cutoff_invalid'),
    );

    if (!selectedLastfm || !selectedNaver) {
      hardBlockers.push('common-cutoff-component-missing');
    } else {
      components.push(
        componentDescriptor({
          family: 'audience-consumption',
          canonicalArtistId: input.canonicalArtistId,
          sourceValueKind: 'lastfm-historical-normalized-growth-point',
          nativeCadenceHours: 24,
          selected: Object.freeze({
            key: selectedLastfm.snapshotDate,
            componentEndAt: selectedLastfm.componentEndAt,
            nativeValue: selectedLastfm.nativeValue,
          }),
          eligibleHistory: lastfmPoints.map((point) => Object.freeze({
            key: point.snapshotDate,
            componentEndAt: point.componentEndAt,
            nativeValue: point.nativeValue,
          })),
          alignmentCutoffAt,
          cadenceKey: 'calendar-day',
        }),
        componentDescriptor({
          family: 'media-attention',
          canonicalArtistId: input.canonicalArtistId,
          sourceValueKind: 'naver-current-activity-rate',
          nativeCadenceHours: 8,
          selected: selectedNaver,
          eligibleHistory: naverPoints,
          alignmentCutoffAt,
          cadenceKey: 'exact-hours',
        }),
      );
    }
  }

  const normalizationInsufficient = components.some(
    (component) => component.historicalStrictExceedanceShare === null,
  );
  const freshnessBlocked = components.some(
    (component) => !component.freshnessWithinNativeCadence,
  );

  const state: FandexMomentumTemporalNormalizationResearchResult['state'] =
    hardBlockers.length > 0
      ? 'blocked'
      : components.length !== 2 || freshnessBlocked
        ? 'temporal-alignment-unavailable'
        : normalizationInsufficient
          ? 'normalization-history-insufficient'
          : 'aligned-normalized-research';

  const blockers = Object.freeze([
    ...hardBlockers,
    ...(freshnessBlocked ? ['component-freshness-outside-native-cadence'] : []),
    ...(normalizationInsufficient ? ['normalization-prior-history-zero'] : []),
    'component-normalization-research-not-product-freeze',
    'component-weighting-not-frozen',
    'composite-score-formula-not-frozen',
  ]);

  const payload = {
    contractVersion: FANDEX_MOMENTUM_TEMPORAL_NORMALIZATION_RESEARCH_VERSION,
    state,
    canonicalArtistId: input.canonicalArtistId,
    alignmentCutoffAt,
    alignmentPolicy:
      'latest-common-component-end-cutoff-without-lookahead' as const,
    normalizationType:
      'HISTORICAL_STRICT_EXCEEDANCE_SHARE_WITHIN_ARTIST_FAMILY' as const,
    components: Object.freeze(components),
    componentCount: components.length,
    normalizedComponentCount: components.filter(
      (component) => component.historicalStrictExceedanceShare !== null,
    ).length,
    futureEvidenceUsed: false as const,
    crossFamilyRawAveragingApplied: false as const,
    crossFamilyNormalizedAveragingApplied: false as const,
    componentWeights: null,
    compositeScore: null,
    freezeStatus: {
      temporalAlignmentPolicy: 'defined-research' as const,
      componentNormalization: 'defined-research' as const,
      componentWeighting: 'not-frozen' as const,
      compositeScoreFormula: 'not-frozen' as const,
    },
    blockers,
  };

  return Object.freeze({
    ...payload,
    freezeStatus: Object.freeze(payload.freezeStatus),
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
