import { sha256Canonical } from '../shared/canonicalDigest';
import {
  NAVER_NEWS_ISSUE_POINT_CONSTRUCT,
  NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
} from './naverNewsIssuePointConstruct';
import {
  NAVER_NEWS_ISSUE_POINT_FROZEN_METHODOLOGY_CONTRACT_VERSION,
  type NaverNewsIssuePointFrozenMethodologyResult,
} from '../server/ingestion/naverNewsIssuePointFrozenMethodology';

export const FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_VERSION =
  'v140_fandex_naver_media_attention_momentum_research_v1' as const;

export const FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  targetVariable: 'momentum' as const,
  componentFamily: 'media-attention' as const,
  sourceVariableId: 'newsIssuePoint' as const,
  sourceMethodologyVersion: NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
  sourceConstructFrozenRequired: true as const,
  directionSource: 'currentActivityRate' as const,
  normalizedNewsIssuePointScoreRole: 'diagnostic-only' as const,
  persistenceSampling:
    'latest-anchored-non-overlapping-frozen-window-duration' as const,
  missingOrUndefinedBreaksContinuity: true as const,
  missingAsZeroAllowed: false as const,
  missingAsStableAllowed: false as const,
  overlappingHourlyWindowsUsedForPersistence: false as const,
  componentScoreProduced: false as const,
  componentNormalizationFrozen: false as const,
  productActivationAllowed: false as const,
  productionEligible: false as const,
});

export type NaverMediaAttentionMomentumDirection = 'up' | 'down' | 'flat';

export type NaverMediaAttentionMomentumAnchor = Readonly<{
  throughSlotStart: string;
  currentActivityRate: number;
  newsIssuePointScore: number;
  priorDefinedWindowCount: number;
}>;

export type NaverMediaAttentionMomentumTransition = Readonly<{
  fromThroughSlotStart: string;
  toThroughSlotStart: string;
  intervalHours: number;
  fromActivityRate: number;
  toActivityRate: number;
  activityRateDelta: number;
  direction: NaverMediaAttentionMomentumDirection;
  newsIssuePointScoreDeltaDiagnostic: number;
}>;

export type FandexNaverMediaAttentionMomentumResearchResult = Readonly<{
  contractVersion: typeof FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_VERSION;
  state:
    | 'persistence-observed'
    | 'direction-observed'
    | 'flat-observed'
    | 'insufficient-non-overlapping-history'
    | 'latest-source-unavailable'
    | 'blocked';
  canonicalArtistId: string | null;
  protocolStart: string | null;
  sourceMethodologyVersion: typeof NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION;
  sourceWindowDurationHours: 8;
  samplingIntervalHours: 8;
  sourcePointCount: number;
  usableAvailablePointCount: number;
  nonOverlappingAnchorCount: number;
  anchors: readonly NaverMediaAttentionMomentumAnchor[];
  transitions: readonly NaverMediaAttentionMomentumTransition[];
  latestDirection: NaverMediaAttentionMomentumDirection | null;
  latestActivityRateDelta: number | null;
  latestNewsIssuePointScoreDeltaDiagnostic: number | null;
  latestDirectionalRunTransitionCount: number;
  latestDirectionalRunDurationHours: number;
  persistenceObserved: boolean;
  componentScore: null;
  scoreRole: 'not-produced-research-descriptor-only';
  continuity: Readonly<{
    latestSourceAvailable: boolean;
    exactFrozenWindowCadenceRequired: true;
    missingOrUndefinedBreaksContinuity: true;
    overlappingHourlyWindowsUsedForPersistence: false;
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

const HOUR_MS = 60 * 60 * 1_000;
const WINDOW_HOURS = NAVER_NEWS_ISSUE_POINT_CONSTRUCT.selectedWindowDurationHours;

function parseIso(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new Error('naver_media_attention_momentum_timestamp_invalid');
  }
  return timestamp;
}

function round(value: number, digits = 12): number {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function direction(delta: number): NaverMediaAttentionMomentumDirection {
  if (delta > 0) return 'up';
  if (delta < 0) return 'down';
  return 'flat';
}

function validateScope(
  points: readonly NaverNewsIssuePointFrozenMethodologyResult[],
): Readonly<{
  canonicalArtistId: string;
  protocolStart: string;
}> | null {
  if (points.length === 0) return null;

  const first = points[0];
  const canonicalArtistId = first.canonicalArtistId;
  const protocolStart = first.protocolStart;

  for (const point of points) {
    if (
      point.contractVersion !== NAVER_NEWS_ISSUE_POINT_FROZEN_METHODOLOGY_CONTRACT_VERSION
      || point.methodologyVersion !== NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION
      || point.variableId !== 'newsIssuePoint'
      || point.selectedWindowSlotCount !== 8
      || point.rollingWindowSemantics !== 'overlapping'
      || point.normalizationType !== 'HISTORICAL_STRICT_EXCEEDANCE_SHARE'
      || point.canonicalArtistId !== canonicalArtistId
      || point.protocolStart !== protocolStart
    ) {
      throw new Error('naver_media_attention_momentum_scope_invalid');
    }
    parseIso(point.throughSlotStart);
    if (
      point.status === 'available'
      && (
        typeof point.currentActivityRate !== 'number'
        || !Number.isFinite(point.currentActivityRate)
        || point.currentActivityRate < 0
        || point.currentActivityRate > 1
        || typeof point.score !== 'number'
        || !Number.isFinite(point.score)
        || point.score < 0
        || point.score > 100
      )
    ) {
      throw new Error('naver_media_attention_momentum_available_point_invalid');
    }
  }

  return Object.freeze({ canonicalArtistId, protocolStart });
}

function selectLatestAnchoredNonOverlapping(
  points: readonly NaverNewsIssuePointFrozenMethodologyResult[],
): readonly NaverNewsIssuePointFrozenMethodologyResult[] {
  if (points.length === 0) return Object.freeze([]);

  const sorted = [...points].sort(
    (left, right) => parseIso(left.throughSlotStart) - parseIso(right.throughSlotStart),
  );
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index - 1].throughSlotStart === sorted[index].throughSlotStart) {
      throw new Error('naver_media_attention_momentum_duplicate_point');
    }
  }

  const latest = sorted.at(-1)!;
  if (latest.status !== 'available') return Object.freeze([]);

  const byTimestamp = new Map(
    sorted.map((point) => [parseIso(point.throughSlotStart), point]),
  );
  const selected: NaverNewsIssuePointFrozenMethodologyResult[] = [latest];
  let expected = parseIso(latest.throughSlotStart) - WINDOW_HOURS * HOUR_MS;

  while (true) {
    const candidate = byTimestamp.get(expected);
    if (!candidate || candidate.status !== 'available') break;
    selected.push(candidate);
    expected -= WINDOW_HOURS * HOUR_MS;
  }

  return Object.freeze(selected.reverse());
}

function buildTransitions(
  anchors: readonly NaverMediaAttentionMomentumAnchor[],
): readonly NaverMediaAttentionMomentumTransition[] {
  const transitions: NaverMediaAttentionMomentumTransition[] = [];
  for (let index = 1; index < anchors.length; index += 1) {
    const from = anchors[index - 1];
    const to = anchors[index];
    const intervalHours =
      (parseIso(to.throughSlotStart) - parseIso(from.throughSlotStart)) / HOUR_MS;
    if (intervalHours !== WINDOW_HOURS) {
      throw new Error('naver_media_attention_momentum_non_overlapping_cadence_invalid');
    }
    const activityRateDelta = round(to.currentActivityRate - from.currentActivityRate);
    transitions.push(Object.freeze({
      fromThroughSlotStart: from.throughSlotStart,
      toThroughSlotStart: to.throughSlotStart,
      intervalHours,
      fromActivityRate: from.currentActivityRate,
      toActivityRate: to.currentActivityRate,
      activityRateDelta,
      direction: direction(activityRateDelta),
      newsIssuePointScoreDeltaDiagnostic: round(
        to.newsIssuePointScore - from.newsIssuePointScore,
      ),
    }));
  }
  return Object.freeze(transitions);
}

function latestRunLength(
  transitions: readonly NaverMediaAttentionMomentumTransition[],
): number {
  const latest = transitions.at(-1);
  if (!latest) return 0;

  let count = 0;
  for (let index = transitions.length - 1; index >= 0; index -= 1) {
    if (transitions[index].direction !== latest.direction) break;
    count += 1;
  }
  return count;
}

export function deriveFandexNaverMediaAttentionMomentumResearch(
  points: readonly NaverNewsIssuePointFrozenMethodologyResult[],
): FandexNaverMediaAttentionMomentumResearchResult {
  const scope = validateScope(points);
  const sorted = [...points].sort(
    (left, right) => parseIso(left.throughSlotStart) - parseIso(right.throughSlotStart),
  );
  const latest = sorted.at(-1) ?? null;
  const usableAvailablePointCount = sorted.filter((point) => point.status === 'available').length;
  const selected = selectLatestAnchoredNonOverlapping(sorted);

  const anchors = Object.freeze(
    selected.map((point) => Object.freeze({
      throughSlotStart: point.throughSlotStart,
      currentActivityRate: point.currentActivityRate as number,
      newsIssuePointScore: point.score as number,
      priorDefinedWindowCount: point.priorDefinedWindowCount,
    })),
  );
  const transitions = buildTransitions(anchors);
  const latestTransition = transitions.at(-1) ?? null;
  const latestDirection = latestTransition?.direction ?? null;
  const runLength = latestRunLength(transitions);
  const persistenceObserved =
    latestDirection !== null
    && latestDirection !== 'flat'
    && runLength >= 2;

  let state: FandexNaverMediaAttentionMomentumResearchResult['state'];
  if (scope === null) {
    state = 'insufficient-non-overlapping-history';
  } else if (latest?.status !== 'available') {
    state = 'latest-source-unavailable';
  } else if (transitions.length === 0) {
    state = 'insufficient-non-overlapping-history';
  } else if (latestDirection === 'flat') {
    state = 'flat-observed';
  } else if (persistenceObserved) {
    state = 'persistence-observed';
  } else {
    state = 'direction-observed';
  }

  const blockers = Object.freeze([
    'component-normalization-not-frozen',
    'component-weighting-not-frozen',
    'cross-family-composite-evidence-not-yet-ready',
    ...(state === 'latest-source-unavailable'
      ? ['latest-source-unavailable']
      : []),
    ...(state === 'insufficient-non-overlapping-history'
      ? ['insufficient-non-overlapping-history']
      : []),
  ]);

  const payload = {
    contractVersion: FANDEX_NAVER_MEDIA_ATTENTION_MOMENTUM_RESEARCH_VERSION,
    state,
    canonicalArtistId: scope?.canonicalArtistId ?? null,
    protocolStart: scope?.protocolStart ?? null,
    sourceMethodologyVersion: NAVER_NEWS_ISSUE_POINT_METHODOLOGY_VERSION,
    sourceWindowDurationHours: WINDOW_HOURS as 8,
    samplingIntervalHours: WINDOW_HOURS as 8,
    sourcePointCount: points.length,
    usableAvailablePointCount,
    nonOverlappingAnchorCount: anchors.length,
    anchors,
    transitions,
    latestDirection,
    latestActivityRateDelta: latestTransition?.activityRateDelta ?? null,
    latestNewsIssuePointScoreDeltaDiagnostic:
      latestTransition?.newsIssuePointScoreDeltaDiagnostic ?? null,
    latestDirectionalRunTransitionCount: runLength,
    latestDirectionalRunDurationHours: runLength * WINDOW_HOURS,
    persistenceObserved,
    componentScore: null,
    scoreRole: 'not-produced-research-descriptor-only' as const,
    continuity: {
      latestSourceAvailable: latest?.status === 'available',
      exactFrozenWindowCadenceRequired: true as const,
      missingOrUndefinedBreaksContinuity: true as const,
      overlappingHourlyWindowsUsedForPersistence: false as const,
    },
    blockers,
  };

  return Object.freeze({
    ...payload,
    continuity: Object.freeze(payload.continuity),
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
