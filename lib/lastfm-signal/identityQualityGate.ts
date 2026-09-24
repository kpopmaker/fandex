import { sha256Canonical } from '../shared/canonicalDigest';
import type { LastfmRealSignal, LastfmRealSignalReadModel } from './contracts';

export const LASTFM_IDENTITY_QUALITY_GATE_VERSION =
  'v132_lastfm_identity_quality_gate_v1' as const;

export const LASTFM_EXPECTED_SIGNAL_COUNT = 10 as const;

export type LastfmCanonicalIdentity = Readonly<{
  artistLabel: string;
  artistId: string;
  expectedQuery: string;
  acceptedLastfmNames: readonly string[];
}>;

export const LASTFM_CANONICAL_IDENTITIES: readonly LastfmCanonicalIdentity[] = Object.freeze([
  Object.freeze({ artistLabel: '뉴진스', artistId: 'newjeans', expectedQuery: 'NewJeans', acceptedLastfmNames: Object.freeze(['NewJeans']) }),
  Object.freeze({ artistLabel: '르세라핌', artistId: 'lesserafim', expectedQuery: 'LE SSERAFIM', acceptedLastfmNames: Object.freeze(['LE SSERAFIM']) }),
  Object.freeze({ artistLabel: '보이넥스트도어', artistId: 'boynextdoor', expectedQuery: 'BOYNEXTDOOR', acceptedLastfmNames: Object.freeze(['BOYNEXTDOOR']) }),
  Object.freeze({ artistLabel: '세븐틴', artistId: 'seventeen', expectedQuery: 'SEVENTEEN', acceptedLastfmNames: Object.freeze(['Seventeen', 'SEVENTEEN']) }),
  Object.freeze({ artistLabel: '스트레이키즈', artistId: 'straykids', expectedQuery: 'Stray Kids', acceptedLastfmNames: Object.freeze(['Stray Kids']) }),
  Object.freeze({ artistLabel: '아이브', artistId: 'ive', expectedQuery: 'IVE', acceptedLastfmNames: Object.freeze(['IVE']) }),
  Object.freeze({ artistLabel: '아이유', artistId: 'iu', expectedQuery: 'IU', acceptedLastfmNames: Object.freeze(['IU']) }),
  Object.freeze({ artistLabel: '에스파', artistId: 'aespa', expectedQuery: 'aespa', acceptedLastfmNames: Object.freeze(['aespa', 'Aespa']) }),
  Object.freeze({ artistLabel: '에이티즈', artistId: 'ateez', expectedQuery: 'ATEEZ', acceptedLastfmNames: Object.freeze(['ATEEZ']) }),
  Object.freeze({ artistLabel: '투모로우바이투게더', artistId: 'txt', expectedQuery: 'TOMORROW X TOGETHER', acceptedLastfmNames: Object.freeze(['TOMORROW X TOGETHER']) }),
]);

export type LastfmIdentityQualityState = 'eligible' | 'blocked';

export type LastfmCanonicalSignal = Readonly<{
  artistId: string;
  artistLabel: string;
  query: string;
  resolvedLastfmName: string;
  previousDate: string;
  latestDate: string;
  collectedAt: string;
  listeners: number;
  playcount: number;
  listenerDelta: number;
  playcountDelta: number;
  listenerDeltaPerDay: number;
  playcountDeltaPerDay: number;
  listenerLogNormalized: number;
  playcountLogNormalized: number;
  previewPoint: number;
  sourceRank: number;
  qualityState: LastfmIdentityQualityState;
  blockers: readonly string[];
}>;

export type LastfmIdentityQualityGateResult = Readonly<{
  contractVersion: typeof LASTFM_IDENTITY_QUALITY_GATE_VERSION;
  sourceContractVersion: LastfmRealSignalReadModel['contractVersion'];
  snapshotDate: string;
  state: LastfmIdentityQualityState;
  reasons: readonly string[];
  expectedSignalCount: typeof LASTFM_EXPECTED_SIGNAL_COUNT;
  resolvedSignalCount: number;
  eligibleSignalCount: number;
  signals: readonly LastfmCanonicalSignal[];
  digest: string;
  effects: Readonly<{
    externalCalls: 0;
    databaseReads: 0;
    databaseWrites: 0;
    masterScoreWrites: 0;
    websiteWrites: 0;
  }>;
}>;

function normalized(value: string): string {
  return value.normalize('NFC').trim().toLocaleLowerCase('en-US');
}

function identityByLabel(): ReadonlyMap<string, LastfmCanonicalIdentity> {
  return new Map(LASTFM_CANONICAL_IDENTITIES.map((identity) => [identity.artistLabel, identity]));
}

function signalBlockers(
  signal: LastfmRealSignal,
  identity: LastfmCanonicalIdentity | undefined,
  canonicalArtistIds: ReadonlySet<string>,
): readonly string[] {
  const blockers: string[] = [];
  if (!identity) return Object.freeze(['identity-unmapped']);
  if (!canonicalArtistIds.has(identity.artistId)) blockers.push('canonical-artist-missing');
  if (normalized(signal.query) !== normalized(identity.expectedQuery)) blockers.push('provider-query-mismatch');
  if (!identity.acceptedLastfmNames.some((name) => normalized(name) === normalized(signal.resolvedLastfmName))) {
    blockers.push('resolved-lastfm-name-mismatch');
  }
  if (signal.previewPoint < 0 || signal.previewPoint > 100) blockers.push('preview-point-out-of-range');
  if (signal.listenerDelta < 0 || signal.playcountDelta < 0) blockers.push('negative-delta-needs-review');
  return Object.freeze(blockers);
}

export function applyLastfmIdentityQualityGate(
  readModel: LastfmRealSignalReadModel,
  canonicalArtistIds: ReadonlySet<string>,
): LastfmIdentityQualityGateResult {
  const reasons: string[] = [];
  if (readModel.readiness.state !== 'ready') reasons.push('source-read-model-blocked');
  if (readModel.effects.masterScoreWrites !== 0 || readModel.effects.websiteWrites !== 0) {
    reasons.push('source-side-effects-not-read-only');
  }
  if (readModel.signals.length !== LASTFM_EXPECTED_SIGNAL_COUNT) reasons.push('unexpected-signal-count');

  const identities = identityByLabel();
  const seenArtistIds = new Set<string>();
  const signals = Object.freeze(readModel.signals.map((signal) => {
    const identity = identities.get(signal.artistLabel);
    const blockers = [...signalBlockers(signal, identity, canonicalArtistIds)];
    if (identity && seenArtistIds.has(identity.artistId)) blockers.push('duplicate-canonical-artist');
    if (identity) seenArtistIds.add(identity.artistId);
    return Object.freeze({
      artistId: identity?.artistId ?? 'unresolved',
      artistLabel: signal.artistLabel,
      query: signal.query,
      resolvedLastfmName: signal.resolvedLastfmName,
      previousDate: signal.previousDate,
      latestDate: signal.latestDate,
      collectedAt: signal.collectedAt,
      listeners: signal.listeners,
      playcount: signal.playcount,
      listenerDelta: signal.listenerDelta,
      playcountDelta: signal.playcountDelta,
      listenerDeltaPerDay: signal.listenerDeltaPerDay,
      playcountDeltaPerDay: signal.playcountDeltaPerDay,
      listenerLogNormalized: signal.listenerLogNormalized,
      playcountLogNormalized: signal.playcountLogNormalized,
      previewPoint: signal.previewPoint,
      sourceRank: signal.sourceRank,
      qualityState: blockers.length === 0 ? 'eligible' as const : 'blocked' as const,
      blockers: Object.freeze(blockers),
    });
  }));

  const resolvedSignalCount = signals.filter((signal) => signal.artistId !== 'unresolved').length;
  const eligibleSignalCount = signals.filter((signal) => signal.qualityState === 'eligible').length;
  if (resolvedSignalCount !== LASTFM_EXPECTED_SIGNAL_COUNT) reasons.push('identity-coverage-incomplete');
  if (eligibleSignalCount !== LASTFM_EXPECTED_SIGNAL_COUNT) reasons.push('quality-coverage-incomplete');

  const state = reasons.length === 0 ? 'eligible' as const : 'blocked' as const;
  const digestPayload = {
    contractVersion: LASTFM_IDENTITY_QUALITY_GATE_VERSION,
    sourceContractVersion: readModel.contractVersion,
    snapshotDate: readModel.snapshotDate,
    state,
    reasons,
    signals,
  };

  return Object.freeze({
    contractVersion: LASTFM_IDENTITY_QUALITY_GATE_VERSION,
    sourceContractVersion: readModel.contractVersion,
    snapshotDate: readModel.snapshotDate,
    state,
    reasons: Object.freeze(reasons),
    expectedSignalCount: LASTFM_EXPECTED_SIGNAL_COUNT,
    resolvedSignalCount,
    eligibleSignalCount,
    signals,
    digest: sha256Canonical(digestPayload),
    effects: Object.freeze({
      externalCalls: 0 as const,
      databaseReads: 0 as const,
      databaseWrites: 0 as const,
      masterScoreWrites: 0 as const,
      websiteWrites: 0 as const,
    }),
  });
}
