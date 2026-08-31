import type { FandexVariableKey } from '../../app/data/v4/metrics/fandexMetricTypes';
import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  LastfmHistoricalWindowModel,
  LastfmHistoricalWindowSignal,
} from './historicalWindow';

export const LASTFM_SHADOW_VARIABLE_ADAPTER_VERSION =
  'v134_lastfm_shadow_variable_adapter_v1' as const;

export const LASTFM_SHADOW_TARGET_VARIABLE = 'momentum' satisfies FandexVariableKey;
export const LASTFM_SHADOW_SOURCE_TYPE = 'preview_signal' as const;
export const LASTFM_SHADOW_QUALITY = 'preview' as const;

export type LastfmShadowVariableState = 'candidate' | 'observe' | 'blocked';

export type LastfmShadowVariableCandidate = Readonly<{
  artistId: string;
  artistLabel: string;
  snapshotDate: string;
  variableKey: typeof LASTFM_SHADOW_TARGET_VARIABLE;
  candidateValue: number | null;
  state: LastfmShadowVariableState;
  reasons: readonly string[];
  source: Readonly<{
    provider: 'lastfm';
    sourceType: typeof LASTFM_SHADOW_SOURCE_TYPE;
    quality: typeof LASTFM_SHADOW_QUALITY;
    historicalNormalizedPoint: number | null;
    stabilityState: LastfmHistoricalWindowSignal['stabilityState'];
    windowStartDate: string;
    windowEndDate: string;
    intervalCount: number;
    positiveIntervalRatio: number;
    listenerRelativeMad: number;
    playcountRelativeMad: number;
  }>;
}>;

export type LastfmShadowVariableAdapterResult = Readonly<{
  contractVersion: typeof LASTFM_SHADOW_VARIABLE_ADAPTER_VERSION;
  sourceContractVersion: LastfmHistoricalWindowModel['contractVersion'];
  snapshotDate: string;
  targetVariable: typeof LASTFM_SHADOW_TARGET_VARIABLE;
  state: 'eligible' | 'blocked';
  reasons: readonly string[];
  signalCount: number;
  candidateCount: number;
  observeCount: number;
  blockedCount: number;
  candidates: readonly LastfmShadowVariableCandidate[];
  digest: string;
  application: Readonly<{
    mode: 'shadow-only';
    masterScoreApplied: false;
    metricRegistryModified: false;
    publicWebsiteApplied: false;
    defaultWeightApplied: false;
  }>;
  effects: Readonly<{
    externalCalls: 0;
    databaseReads: 0;
    databaseWrites: 0;
    masterScoreWrites: 0;
    websiteWrites: 0;
  }>;
}>;

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

function candidateFromHistoricalSignal(
  signal: LastfmHistoricalWindowSignal,
  snapshotDate: string,
): LastfmShadowVariableCandidate {
  const reasons: string[] = [];

  if (signal.windowEndDate !== snapshotDate) reasons.push('snapshot-window-mismatch');
  if (signal.historicalNormalizedPoint === null) reasons.push('historical-point-unavailable');
  if (
    signal.historicalNormalizedPoint !== null &&
    (signal.historicalNormalizedPoint < 0 || signal.historicalNormalizedPoint > 100)
  ) {
    reasons.push('historical-point-out-of-range');
  }
  if (signal.stabilityState === 'blocked') reasons.push('historical-signal-blocked');
  if (signal.blockers.length > 0) reasons.push('historical-signal-has-blockers');

  let state: LastfmShadowVariableState;
  if (reasons.length > 0) {
    state = 'blocked';
  } else if (signal.stabilityState === 'stable') {
    state = 'candidate';
  } else {
    state = 'observe';
    reasons.push('historical-signal-variable');
  }

  const candidateValue =
    state === 'blocked' || signal.historicalNormalizedPoint === null
      ? null
      : rounded(signal.historicalNormalizedPoint);

  return Object.freeze({
    artistId: signal.artistId,
    artistLabel: signal.artistLabel,
    snapshotDate,
    variableKey: LASTFM_SHADOW_TARGET_VARIABLE,
    candidateValue,
    state,
    reasons: Object.freeze(reasons),
    source: Object.freeze({
      provider: 'lastfm' as const,
      sourceType: LASTFM_SHADOW_SOURCE_TYPE,
      quality: LASTFM_SHADOW_QUALITY,
      historicalNormalizedPoint: signal.historicalNormalizedPoint,
      stabilityState: signal.stabilityState,
      windowStartDate: signal.windowStartDate,
      windowEndDate: signal.windowEndDate,
      intervalCount: signal.intervalCount,
      positiveIntervalRatio: signal.positiveIntervalRatio,
      listenerRelativeMad: signal.listenerRelativeMad,
      playcountRelativeMad: signal.playcountRelativeMad,
    }),
  });
}

export function buildLastfmShadowVariableAdapter(
  historical: LastfmHistoricalWindowModel,
): LastfmShadowVariableAdapterResult {
  const reasons: string[] = [];

  if (historical.state !== 'eligible') reasons.push('historical-window-model-blocked');
  if (
    historical.effects.masterScoreWrites !== 0 ||
    historical.effects.websiteWrites !== 0 ||
    historical.effects.databaseWrites !== 0
  ) {
    reasons.push('source-side-effects-not-read-only');
  }

  const seenArtistIds = new Set<string>();
  const candidates = Object.freeze(
    historical.signals.map((signal) => {
      const candidate = candidateFromHistoricalSignal(signal, historical.snapshotDate);
      if (seenArtistIds.has(candidate.artistId)) {
        return Object.freeze({
          ...candidate,
          candidateValue: null,
          state: 'blocked' as const,
          reasons: Object.freeze([...candidate.reasons, 'duplicate-canonical-artist']),
        });
      }
      seenArtistIds.add(candidate.artistId);
      return candidate;
    }),
  );

  if (candidates.length !== historical.signalCount) reasons.push('shadow-signal-count-mismatch');
  const candidateCount = candidates.filter((candidate) => candidate.state === 'candidate').length;
  const observeCount = candidates.filter((candidate) => candidate.state === 'observe').length;
  const blockedCount = candidates.filter((candidate) => candidate.state === 'blocked').length;
  if (blockedCount > 0) reasons.push('shadow-variable-blocked-signals');
  if (candidateCount === 0) reasons.push('no-stable-shadow-candidates');

  const state = reasons.length === 0 ? 'eligible' as const : 'blocked' as const;
  const digestPayload = {
    contractVersion: LASTFM_SHADOW_VARIABLE_ADAPTER_VERSION,
    sourceContractVersion: historical.contractVersion,
    snapshotDate: historical.snapshotDate,
    targetVariable: LASTFM_SHADOW_TARGET_VARIABLE,
    state,
    reasons,
    candidates,
  };

  return Object.freeze({
    contractVersion: LASTFM_SHADOW_VARIABLE_ADAPTER_VERSION,
    sourceContractVersion: historical.contractVersion,
    snapshotDate: historical.snapshotDate,
    targetVariable: LASTFM_SHADOW_TARGET_VARIABLE,
    state,
    reasons: Object.freeze(reasons),
    signalCount: candidates.length,
    candidateCount,
    observeCount,
    blockedCount,
    candidates,
    digest: sha256Canonical(digestPayload),
    application: Object.freeze({
      mode: 'shadow-only' as const,
      masterScoreApplied: false as const,
      metricRegistryModified: false as const,
      publicWebsiteApplied: false as const,
      defaultWeightApplied: false as const,
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
