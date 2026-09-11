import { sha256Canonical } from '../shared/canonicalDigest';
import {
  LASTFM_SHADOW_SCORING_RECONCILIATION_VERSION,
  type LastfmShadowReconciliationItem,
  type LastfmShadowScoringReconciliation,
} from './shadowScoringReconciliation';
import { LASTFM_SHADOW_VARIABLE_ADAPTER_VERSION } from './shadowVariableAdapter';

export const LASTFM_REPEATED_SHADOW_RECONCILIATION_VERSION =
  'v136_lastfm_repeated_shadow_reconciliation_v1' as const;

export type LastfmRepeatedShadowReadinessPolicy = Readonly<{
  minimumSuccessiveSnapshots: number;
  requireLatestEligible: boolean;
  requireZeroBlockedSnapshots: boolean;
  minimumCoverageRatio: number;
  maximumMeanAbsoluteNormalizedDelta: number;
  maximumMeanAbsoluteRankDelta: number;
}>;

/** Experimental shadow-readiness defaults only; these are not production scoring rules. */
export const LASTFM_DEFAULT_REPEATED_SHADOW_READINESS_POLICY = Object.freeze({
  minimumSuccessiveSnapshots: 3,
  requireLatestEligible: true,
  requireZeroBlockedSnapshots: true,
  minimumCoverageRatio: 1,
  maximumMeanAbsoluteNormalizedDelta: 20,
  maximumMeanAbsoluteRankDelta: 2,
}) satisfies LastfmRepeatedShadowReadinessPolicy;

const LASTFM_V135_TOP_LEVEL_REASON_ORDER = Object.freeze([
  'shadow-variable-adapter-blocked',
  'unexpected-shadow-variable',
  'source-side-effects-not-read-only',
  'no-comparable-shadow-signals',
  'preview-seed-coverage-incomplete',
] as const);

const LASTFM_V135_TOP_LEVEL_REASON_INDEX = new Map<string, number>(
  LASTFM_V135_TOP_LEVEL_REASON_ORDER.map((reason, index) => [reason, index]),
);

const LASTFM_V136_HARD_UPSTREAM_SAFETY_REASONS = new Set<string>([
  'shadow-variable-adapter-blocked',
  'unexpected-shadow-variable',
  'source-side-effects-not-read-only',
]);

export type LastfmRepeatedShadowReadinessState =
  | 'insufficient_history'
  | 'blocked'
  | 'observe'
  | 'readiness_candidate';

export type LastfmRepeatedShadowMetricHistoryPoint = Readonly<{
  snapshotDate: string | null;
  value: number | null;
}>;

export type LastfmRepeatedShadowArtistPersistence = Readonly<{
  artistId: string;
  artistLabel: string;
  snapshotCount: number;
  presenceRatio: number;
  comparableSnapshotCount: number;
  comparableRatio: number;
  candidateSnapshotCount: number;
  observeSnapshotCount: number;
  blockedSnapshotCount: number;
  meanAbsoluteNormalizedDelta: number | null;
  maxAbsoluteNormalizedDelta: number | null;
  meanAbsoluteRankDelta: number | null;
  latestState: LastfmShadowReconciliationItem['state'];
}>;

export type LastfmRepeatedShadowReconciliationReadiness = Readonly<{
  contractVersion: typeof LASTFM_REPEATED_SHADOW_RECONCILIATION_VERSION;
  sourceReconciliationContractVersion: typeof LASTFM_SHADOW_SCORING_RECONCILIATION_VERSION;
  sourceContractVersion: typeof LASTFM_SHADOW_VARIABLE_ADAPTER_VERSION;
  targetVariable: 'momentum';
  state: LastfmRepeatedShadowReadinessState;
  reasons: readonly string[];
  policy: LastfmRepeatedShadowReadinessPolicy;
  snapshotCount: number;
  dateRange: Readonly<{
    startDate: string | null;
    endDate: string | null;
  }>;
  eligibleSnapshotCount: number;
  partialSnapshotCount: number;
  blockedSnapshotCount: number;
  history: Readonly<{
    coverageRatio: readonly LastfmRepeatedShadowMetricHistoryPoint[];
    meanAbsoluteNormalizedDelta: readonly LastfmRepeatedShadowMetricHistoryPoint[];
    medianAbsoluteNormalizedDelta: readonly LastfmRepeatedShadowMetricHistoryPoint[];
    maxAbsoluteNormalizedDelta: readonly LastfmRepeatedShadowMetricHistoryPoint[];
    meanAbsoluteRankDelta: readonly LastfmRepeatedShadowMetricHistoryPoint[];
  }>;
  artistPersistence: readonly LastfmRepeatedShadowArtistPersistence[];
  latestSnapshotState: LastfmShadowScoringReconciliation['state'] | null;
  digest: string;
  application: Readonly<{
    mode: 'shadow-readiness-only';
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

type SummaryKey = keyof LastfmShadowScoringReconciliation['summary'];

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function roundV135(value: number, digits = 2): number {
  return round(value, digits);
}

function medianV135(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? roundV135((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === 'number' && value >= 0;
}

function containsNonFiniteNumber(value: unknown, visited = new WeakSet<object>()): boolean {
  if (typeof value === 'number') return !Number.isFinite(value);
  if (typeof value !== 'object' || value === null) return false;
  if (visited.has(value)) return false;
  visited.add(value);
  return Object.values(value).some((child) => containsNonFiniteNumber(child, visited));
}

function addReason(reasons: string[], reason: string): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

function validPolicy(policy: LastfmRepeatedShadowReadinessPolicy): boolean {
  return (
    isNonNegativeInteger(policy.minimumSuccessiveSnapshots) &&
    policy.minimumSuccessiveSnapshots >= 1 &&
    typeof policy.requireLatestEligible === 'boolean' &&
    policy.requireZeroBlockedSnapshots === true &&
    isFiniteNonNegative(policy.minimumCoverageRatio) &&
    policy.minimumCoverageRatio <= 1 &&
    isFiniteNonNegative(policy.maximumMeanAbsoluteNormalizedDelta) &&
    isFiniteNonNegative(policy.maximumMeanAbsoluteRankDelta)
  );
}

function hasReadOnlyEffects(snapshot: LastfmShadowScoringReconciliation): boolean {
  return (
    snapshot?.effects?.externalCalls === 0 &&
    snapshot.effects.databaseReads === 0 &&
    snapshot.effects.databaseWrites === 0 &&
    snapshot.effects.masterScoreWrites === 0 &&
    snapshot.effects.websiteWrites === 0 &&
    snapshot.application?.mode === 'shadow-reconciliation-only' &&
    snapshot.application.masterScoreApplied === false &&
    snapshot.application.metricRegistryModified === false &&
    snapshot.application.publicWebsiteApplied === false &&
    snapshot.application.previewSeedModified === false
  );
}

type SnapshotConsistency = Readonly<{
  metrics: boolean;
  state: boolean;
  reasons: boolean;
  digest: boolean;
}>;

function sameNullableNumber(left: unknown, right: number | null): boolean {
  return right === null ? left === null : typeof left === 'number' && left === right;
}

function inspectSnapshotConsistency(
  snapshot: LastfmShadowScoringReconciliation,
): SnapshotConsistency {
  const invalid = Object.freeze({ metrics: false, state: false, reasons: false, digest: false });
  if (!isRecord(snapshot) || containsNonFiniteNumber(snapshot)) return invalid;
  if (
    !isNonNegativeInteger(snapshot.expectedSignalCount) ||
    !isNonNegativeInteger(snapshot.comparedCount) ||
    !isNonNegativeInteger(snapshot.candidateCount) ||
    !isNonNegativeInteger(snapshot.observeCount) ||
    !isNonNegativeInteger(snapshot.blockedCount) ||
    !isFiniteNonNegative(snapshot.coverageRatio) ||
    snapshot.coverageRatio > 1 ||
    !Array.isArray(snapshot.items)
  ) {
    return invalid;
  }

  const summary = snapshot.summary;
  if (!isRecord(summary)) return invalid;
  const summaryValues = [
    summary.meanAbsoluteNormalizedDelta,
    summary.medianAbsoluteNormalizedDelta,
    summary.maxAbsoluteNormalizedDelta,
    summary.meanAbsoluteRankDelta,
  ];
  if (summaryValues.some((value) => value !== null && !isFiniteNonNegative(value))) return invalid;

  const seenArtists = new Set<string>();
  const absoluteNormalizedDeltas: number[] = [];
  const absoluteRankDeltas: number[] = [];
  let candidateCount = 0;
  let observeCount = 0;
  let blockedCount = 0;
  for (const item of snapshot.items) {
    if (
      !isRecord(item) ||
      typeof item.artistId !== 'string' ||
      item.artistId.length === 0 ||
      seenArtists.has(item.artistId) ||
      item.snapshotDate !== snapshot.snapshotDate ||
      item.variableKey !== 'momentum' ||
      !['candidate', 'observe', 'blocked'].includes(String(item.state)) ||
      !Array.isArray(item.reasons) ||
      item.reasons.some((reason) => typeof reason !== 'string') ||
      !isRecord(item.seed) ||
      !isRecord(item.shadow) ||
      !isRecord(item.comparison)
    ) {
      return invalid;
    }
    seenArtists.add(item.artistId);
    const normalizedDelta = item.comparison.normalizedDelta;
    const absoluteNormalizedDelta = item.comparison.absoluteNormalizedDelta;
    const rankDelta = item.comparison.rankDelta;
    const absoluteRankDelta = item.comparison.absoluteRankDelta;
    const allNull =
      normalizedDelta === null &&
      absoluteNormalizedDelta === null &&
      rankDelta === null &&
      absoluteRankDelta === null;
    const allComparable =
      typeof normalizedDelta === 'number' &&
      Number.isFinite(normalizedDelta) &&
      isFiniteNonNegative(absoluteNormalizedDelta) &&
      Number.isSafeInteger(rankDelta) &&
      typeof rankDelta === 'number' &&
      Number.isSafeInteger(absoluteRankDelta) &&
      typeof absoluteRankDelta === 'number';
    if (!allNull && !allComparable) return invalid;

    if (allComparable) {
      if (
        absoluteNormalizedDelta !== roundV135(Math.abs(normalizedDelta)) ||
        absoluteRankDelta !== Math.abs(rankDelta) ||
        item.state === 'blocked' ||
        item.reasons.length !== 0 ||
        item.shadow.candidateState !== item.state ||
        !isFiniteNonNegative(item.seed.cohortNormalizedMomentum) ||
        !isFiniteNonNegative(item.shadow.candidateValue) ||
        !Number.isSafeInteger(item.seed.rank) ||
        typeof item.seed.rank !== 'number' ||
        item.seed.rank < 1 ||
        !Number.isSafeInteger(item.shadow.rank) ||
        typeof item.shadow.rank !== 'number' ||
        item.shadow.rank < 1 ||
        normalizedDelta !==
          roundV135(item.shadow.candidateValue - item.seed.cohortNormalizedMomentum) ||
        rankDelta !== item.shadow.rank - item.seed.rank
      ) {
        return invalid;
      }
      absoluteNormalizedDeltas.push(absoluteNormalizedDelta);
      absoluteRankDeltas.push(absoluteRankDelta);
    } else if (
      item.state !== 'blocked' ||
      item.reasons.length === 0 ||
      item.seed.cohortNormalizedMomentum !== null ||
      item.seed.rank !== null ||
      item.shadow.rank !== null
    ) {
      return invalid;
    }

    if (item.state === 'candidate') candidateCount += 1;
    if (item.state === 'observe') observeCount += 1;
    if (item.state === 'blocked') blockedCount += 1;
  }

  const comparedCount = absoluteNormalizedDeltas.length;
  const coverageRatio = snapshot.items.length === 0
    ? 0
    : roundV135(comparedCount / snapshot.items.length, 4);
  const meanAbsoluteNormalizedDelta = comparedCount === 0
    ? null
    : roundV135(
        absoluteNormalizedDeltas.reduce((sum, value) => sum + value, 0) / comparedCount,
      );
  const medianAbsoluteNormalizedDelta = medianV135(absoluteNormalizedDeltas);
  const maxAbsoluteNormalizedDelta = comparedCount === 0
    ? null
    : Math.max(...absoluteNormalizedDeltas);
  const meanAbsoluteRankDelta = comparedCount === 0
    ? null
    : roundV135(absoluteRankDeltas.reduce((sum, value) => sum + value, 0) / comparedCount);

  const metrics =
    snapshot.expectedSignalCount === snapshot.items.length &&
    snapshot.comparedCount === comparedCount &&
    snapshot.candidateCount === candidateCount &&
    snapshot.observeCount === observeCount &&
    snapshot.blockedCount === blockedCount &&
    snapshot.coverageRatio === coverageRatio &&
    sameNullableNumber(summary.meanAbsoluteNormalizedDelta, meanAbsoluteNormalizedDelta) &&
    sameNullableNumber(summary.medianAbsoluteNormalizedDelta, medianAbsoluteNormalizedDelta) &&
    sameNullableNumber(summary.maxAbsoluteNormalizedDelta, maxAbsoluteNormalizedDelta) &&
    sameNullableNumber(summary.meanAbsoluteRankDelta, meanAbsoluteRankDelta);

  const reasonsValid =
    Array.isArray(snapshot.reasons) &&
    snapshot.reasons.every((reason) => typeof reason === 'string');
  const reasonIndexes = reasonsValid
    ? snapshot.reasons.map((reason) => LASTFM_V135_TOP_LEVEL_REASON_INDEX.get(reason) ?? -1)
    : [];
  const reasons =
    reasonsValid &&
    reasonIndexes.every((index) => index >= 0) &&
    new Set(snapshot.reasons).size === snapshot.reasons.length &&
    reasonIndexes.every((index, position) => position === 0 || reasonIndexes[position - 1] < index) &&
    snapshot.reasons.includes('no-comparable-shadow-signals') === (comparedCount === 0) &&
    snapshot.reasons.includes('preview-seed-coverage-incomplete') === (blockedCount > 0);
  const adapterBlocked = reasonsValid && snapshot.reasons.includes('shadow-variable-adapter-blocked');
  const expectedState = adapterBlocked || comparedCount === 0
    ? 'blocked'
    : blockedCount > 0
      ? 'partial'
      : 'eligible';
  const state =
    reasonsValid &&
    snapshot.state === expectedState;

  const expectedDigest = reasonsValid
    ? sha256Canonical({
        contractVersion: LASTFM_SHADOW_SCORING_RECONCILIATION_VERSION,
        sourceContractVersion: snapshot.sourceContractVersion,
        snapshotDate: snapshot.snapshotDate,
        targetVariable: snapshot.targetVariable,
        state: snapshot.state,
        reasons: snapshot.reasons,
        items: snapshot.items,
        summary: snapshot.summary,
      })
    : null;
  const digest = expectedDigest !== null && snapshot.digest === expectedDigest;

  return Object.freeze({ metrics, state, reasons, digest });
}

function safeSnapshotDate(snapshot: LastfmShadowScoringReconciliation): string | null {
  return isIsoDate(snapshot?.snapshotDate) ? snapshot.snapshotDate : null;
}

function safeMetric(
  snapshot: LastfmShadowScoringReconciliation,
  key: SummaryKey,
): number | null {
  const value = snapshot?.summary?.[key];
  return value === null || isFiniteNonNegative(value) ? value : null;
}

function metricHistory(
  snapshots: readonly LastfmShadowScoringReconciliation[],
  key: SummaryKey,
): readonly LastfmRepeatedShadowMetricHistoryPoint[] {
  return Object.freeze(
    snapshots.map((snapshot) =>
      Object.freeze({
        snapshotDate: safeSnapshotDate(snapshot),
        value: safeMetric(snapshot, key),
      }),
    ),
  );
}

function coverageHistory(
  snapshots: readonly LastfmShadowScoringReconciliation[],
): readonly LastfmRepeatedShadowMetricHistoryPoint[] {
  return Object.freeze(
    snapshots.map((snapshot) =>
      Object.freeze({
        snapshotDate: safeSnapshotDate(snapshot),
        value: isFiniteNonNegative(snapshot?.coverageRatio) && snapshot.coverageRatio <= 1
          ? snapshot.coverageRatio
          : null,
      }),
    ),
  );
}

function average(values: readonly number[]): number | null {
  return values.length === 0
    ? null
    : round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildArtistPersistence(
  snapshots: readonly LastfmShadowScoringReconciliation[],
): readonly LastfmRepeatedShadowArtistPersistence[] {
  type MutableArtistHistory = {
    artistId: string;
    artistLabel: string;
    snapshotCount: number;
    comparableSnapshotCount: number;
    candidateSnapshotCount: number;
    observeSnapshotCount: number;
    blockedSnapshotCount: number;
    normalizedDeltas: number[];
    rankDeltas: number[];
    latestState: LastfmShadowReconciliationItem['state'];
  };

  const byArtist = new Map<string, MutableArtistHistory>();
  for (const snapshot of snapshots) {
    if (!Array.isArray(snapshot?.items)) continue;
    for (const item of snapshot.items) {
      if (
        !isRecord(item) ||
        typeof item.artistId !== 'string' ||
        typeof item.artistLabel !== 'string' ||
        !['candidate', 'observe', 'blocked'].includes(String(item.state))
      ) {
        continue;
      }
      const state = item.state as LastfmShadowReconciliationItem['state'];
      const current = byArtist.get(item.artistId) ?? {
        artistId: item.artistId,
        artistLabel: item.artistLabel,
        snapshotCount: 0,
        comparableSnapshotCount: 0,
        candidateSnapshotCount: 0,
        observeSnapshotCount: 0,
        blockedSnapshotCount: 0,
        normalizedDeltas: [],
        rankDeltas: [],
        latestState: state,
      };
      current.artistLabel = item.artistLabel;
      current.snapshotCount += 1;
      current.latestState = state;
      if (state === 'candidate') current.candidateSnapshotCount += 1;
      if (state === 'observe') current.observeSnapshotCount += 1;
      if (state === 'blocked') current.blockedSnapshotCount += 1;

      const normalizedDelta = isRecord(item.comparison)
        ? item.comparison.absoluteNormalizedDelta
        : null;
      const rankDelta = isRecord(item.comparison) ? item.comparison.absoluteRankDelta : null;
      if (isFiniteNonNegative(normalizedDelta)) {
        current.normalizedDeltas.push(normalizedDelta);
        current.comparableSnapshotCount += 1;
      }
      if (isFiniteNonNegative(rankDelta)) current.rankDeltas.push(rankDelta);
      byArtist.set(item.artistId, current);
    }
  }

  return Object.freeze(
    [...byArtist.values()]
      .sort((left, right) => left.artistId.localeCompare(right.artistId))
      .map((artist) =>
        Object.freeze({
          artistId: artist.artistId,
          artistLabel: artist.artistLabel,
          snapshotCount: artist.snapshotCount,
          presenceRatio: snapshots.length === 0 ? 0 : round(artist.snapshotCount / snapshots.length),
          comparableSnapshotCount: artist.comparableSnapshotCount,
          comparableRatio:
            snapshots.length === 0 ? 0 : round(artist.comparableSnapshotCount / snapshots.length),
          candidateSnapshotCount: artist.candidateSnapshotCount,
          observeSnapshotCount: artist.observeSnapshotCount,
          blockedSnapshotCount: artist.blockedSnapshotCount,
          meanAbsoluteNormalizedDelta: average(artist.normalizedDeltas),
          maxAbsoluteNormalizedDelta:
            artist.normalizedDeltas.length === 0 ? null : Math.max(...artist.normalizedDeltas),
          meanAbsoluteRankDelta: average(artist.rankDeltas),
          latestState: artist.latestState,
        }),
      ),
  );
}

export function evaluateLastfmRepeatedShadowReconciliationReadiness(
  snapshots: readonly LastfmShadowScoringReconciliation[],
  suppliedPolicy: LastfmRepeatedShadowReadinessPolicy =
    LASTFM_DEFAULT_REPEATED_SHADOW_READINESS_POLICY,
): LastfmRepeatedShadowReconciliationReadiness {
  const policy = Object.freeze({ ...suppliedPolicy });
  const reasons: string[] = [];
  const sequenceEmpty = !Array.isArray(snapshots) || snapshots.length === 0;
  const policyInvalid = !validPolicy(policy);
  let snapshotDateInvalid = false;
  let duplicateSnapshotDate = false;
  let snapshotDatesNotIncreasing = false;
  let reconciliationContractIncompatible = false;
  let sourceContractIncompatible = false;
  let targetVariableInconsistent = false;
  let snapshotMetricsInconsistent = false;
  let snapshotStateInconsistent = false;
  let snapshotReasonsInconsistent = false;
  let snapshotDigestInconsistent = false;
  let forbiddenUpstreamSafetyReason = false;
  let forbiddenSourceEffects = false;
  const seenDates = new Set<string>();
  let previousDate: string | null = null;
  for (const snapshot of snapshots) {
    if (snapshot?.contractVersion !== LASTFM_SHADOW_SCORING_RECONCILIATION_VERSION) {
      reconciliationContractIncompatible = true;
    }
    if (snapshot?.sourceContractVersion !== LASTFM_SHADOW_VARIABLE_ADAPTER_VERSION) {
      sourceContractIncompatible = true;
    }
    if (snapshot?.targetVariable !== 'momentum') {
      targetVariableInconsistent = true;
    }
    const consistency = inspectSnapshotConsistency(snapshot);
    if (!consistency.metrics) snapshotMetricsInconsistent = true;
    if (!consistency.state) snapshotStateInconsistent = true;
    if (!consistency.reasons) snapshotReasonsInconsistent = true;
    if (!consistency.digest) snapshotDigestInconsistent = true;
    if (
      Array.isArray(snapshot?.reasons) &&
      snapshot.reasons.some(
        (reason) =>
          typeof reason === 'string' && LASTFM_V136_HARD_UPSTREAM_SAFETY_REASONS.has(reason),
      )
    ) {
      forbiddenUpstreamSafetyReason = true;
    }
    if (!hasReadOnlyEffects(snapshot)) forbiddenSourceEffects = true;

    const snapshotDate = safeSnapshotDate(snapshot);
    if (snapshotDate === null) {
      snapshotDateInvalid = true;
      continue;
    }
    if (seenDates.has(snapshotDate)) duplicateSnapshotDate = true;
    if (previousDate !== null && snapshotDate <= previousDate) {
      snapshotDatesNotIncreasing = true;
    }
    seenDates.add(snapshotDate);
    previousDate = snapshotDate;
  }

  if (sequenceEmpty) addReason(reasons, 'snapshot-sequence-empty');
  if (snapshotDateInvalid) addReason(reasons, 'snapshot-date-invalid');
  if (duplicateSnapshotDate) addReason(reasons, 'duplicate-snapshot-date');
  if (snapshotDatesNotIncreasing) addReason(reasons, 'snapshot-dates-not-strictly-increasing');
  if (targetVariableInconsistent) addReason(reasons, 'target-variable-inconsistent');
  if (reconciliationContractIncompatible) {
    addReason(reasons, 'reconciliation-contract-version-incompatible');
  }
  if (sourceContractIncompatible) addReason(reasons, 'source-contract-version-incompatible');
  if (policyInvalid) addReason(reasons, 'readiness-policy-invalid');
  if (snapshotMetricsInconsistent) addReason(reasons, 'snapshot-metrics-internally-inconsistent');
  if (snapshotStateInconsistent) addReason(reasons, 'snapshot-state-inconsistent');
  if (snapshotDigestInconsistent) addReason(reasons, 'snapshot-digest-inconsistent');
  if (snapshotReasonsInconsistent) addReason(reasons, 'snapshot-reasons-internally-inconsistent');
  if (forbiddenUpstreamSafetyReason) {
    addReason(reasons, 'forbidden-upstream-safety-reason-reported');
  }
  if (forbiddenSourceEffects) addReason(reasons, 'forbidden-source-effects-reported');

  const eligibleSnapshotCount = snapshots.filter((snapshot) => snapshot?.state === 'eligible').length;
  const partialSnapshotCount = snapshots.filter((snapshot) => snapshot?.state === 'partial').length;
  const blockedSnapshotCount = snapshots.filter((snapshot) => snapshot?.state === 'blocked').length;
  if (eligibleSnapshotCount + partialSnapshotCount + blockedSnapshotCount !== snapshots.length) {
    addReason(reasons, 'snapshot-state-invalid');
  }

  const coverage = coverageHistory(snapshots);
  const meanNormalized = metricHistory(snapshots, 'meanAbsoluteNormalizedDelta');
  const medianNormalized = metricHistory(snapshots, 'medianAbsoluteNormalizedDelta');
  const maxNormalized = metricHistory(snapshots, 'maxAbsoluteNormalizedDelta');
  const meanRank = metricHistory(snapshots, 'meanAbsoluteRankDelta');
  const history = Object.freeze({
    coverageRatio: coverage,
    meanAbsoluteNormalizedDelta: meanNormalized,
    medianAbsoluteNormalizedDelta: medianNormalized,
    maxAbsoluteNormalizedDelta: maxNormalized,
    meanAbsoluteRankDelta: meanRank,
  });
  const artistPersistence = buildArtistPersistence(snapshots);
  const validDates = snapshots.map(safeSnapshotDate).filter((date): date is string => date !== null);
  const latest = snapshots.at(-1);
  const latestSnapshotState = latest && ['eligible', 'partial', 'blocked'].includes(latest.state)
    ? latest.state
    : null;

  let state: LastfmRepeatedShadowReadinessState;
  if (reasons.length > 0) {
    state = 'blocked';
  } else if (policy.requireZeroBlockedSnapshots && blockedSnapshotCount > 0) {
    addReason(reasons, 'blocked-snapshot-in-evaluation-window');
    state = 'blocked';
  } else if (snapshots.length < policy.minimumSuccessiveSnapshots) {
    addReason(reasons, 'insufficient-successive-snapshot-history');
    state = 'insufficient_history';
  } else {
    if (partialSnapshotCount > 0) {
      addReason(reasons, 'partial-snapshot-in-evaluation-window');
    }
    if (policy.requireLatestEligible && latestSnapshotState !== 'eligible') {
      addReason(reasons, 'latest-snapshot-not-eligible');
    }
    if (coverage.some((point) => point.value === null || point.value < policy.minimumCoverageRatio)) {
      addReason(reasons, 'coverage-below-policy');
    }
    if (
      meanNormalized.some(
        (point) =>
          point.value === null || point.value > policy.maximumMeanAbsoluteNormalizedDelta,
      )
    ) {
      addReason(reasons, 'mean-absolute-normalized-delta-exceeds-policy');
    }
    if (
      meanRank.some(
        (point) => point.value === null || point.value > policy.maximumMeanAbsoluteRankDelta,
      )
    ) {
      addReason(reasons, 'mean-absolute-rank-delta-exceeds-policy');
    }
    if (reasons.length === 0) {
      addReason(reasons, 'shadow-readiness-criteria-satisfied');
      state = 'readiness_candidate';
    } else {
      state = 'observe';
    }
  }

  const dateRange = Object.freeze({
    startDate: validDates[0] ?? null,
    endDate: validDates.at(-1) ?? null,
  });
  const digestPayload = {
    contractVersion: LASTFM_REPEATED_SHADOW_RECONCILIATION_VERSION,
    sourceReconciliationContractVersion: LASTFM_SHADOW_SCORING_RECONCILIATION_VERSION,
    sourceContractVersion: LASTFM_SHADOW_VARIABLE_ADAPTER_VERSION,
    targetVariable: 'momentum' as const,
    state,
    reasons,
    policy,
    snapshotCount: snapshots.length,
    dateRange,
    eligibleSnapshotCount,
    partialSnapshotCount,
    blockedSnapshotCount,
    history,
    artistPersistence,
    latestSnapshotState,
  };

  return Object.freeze({
    ...digestPayload,
    reasons: Object.freeze(reasons),
    digest: sha256Canonical(digestPayload),
    application: Object.freeze({
      mode: 'shadow-readiness-only' as const,
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
