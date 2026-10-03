import {
  buildMusicChartObservationId,
  type MusicChartObservation,
  type MusicChartPlatform,
} from './musicChartObservation';

export const MUSIC_CHART_HISTORY_CONTRACT_VERSION = 'music-chart-observation-history-v1' as const;

export type MusicChartHistoryEntry = Readonly<{
  contractVersion: typeof MUSIC_CHART_HISTORY_CONTRACT_VERSION;
  observationId: string;
  canonicalArtistId: string;
  platform: MusicChartPlatform;
  providerPeriod: string | null;
  status: MusicChartObservation['status'];
  observation: MusicChartObservation;
  firstCollectedAt: string;
  lastCollectedAt: string;
  acquisitionTimes: readonly string[];
  acquisitionCount: number;
}>;

export type MusicChartFreshness = Readonly<{
  referenceKind: 'provider-observed-at' | 'collection-proxy';
  referenceAt: string;
  asOf: string;
  ageSeconds: number;
  thresholdApplied: false;
}>;

export type MusicChartCurrentReadRow = Readonly<{
  canonicalArtistId: string;
  platform: MusicChartPlatform;
  observationId: string;
  providerPeriod: string | null;
  status: MusicChartObservation['status'];
  rank: number | null;
  trackTitle: string | null;
  collectedAt: string;
  freshness: MusicChartFreshness;
  scoreFieldsPresent: false;
}>;

export type MusicChartCurrentReadModel = Readonly<{
  contractVersion: typeof MUSIC_CHART_HISTORY_CONTRACT_VERSION;
  asOf: string;
  rows: readonly MusicChartCurrentReadRow[];
  scoreFieldsPresent: false;
  thresholdApplied: false;
}>;

function instant(value: string): number {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`music_chart_history_invalid_instant:${value}`);
  }
  return parsed;
}

function assertObservationIntegrity(observation: MusicChartObservation): void {
  const rebuilt = buildMusicChartObservationId({
    canonicalArtistId: observation.canonicalArtistId,
    artistLabel: observation.artistLabel,
    platform: observation.platform,
    chartName: observation.chartName,
    chartType: observation.chartType,
    providerPeriod: observation.providerPeriod,
    observedAt: observation.observedAt,
    collectedAt: observation.collectedAt,
    status: observation.status,
    rank: observation.rank,
    trackTitle: observation.trackTitle,
    coverage: observation.coverage,
    sourceKeys: observation.sourceKeys,
    evidenceFile: observation.evidenceFile,
    sourceVersion: observation.sourceVersion,
    failureCode: observation.failureCode,
    unsupportedReason: observation.unsupportedReason,
  });

  if (rebuilt !== observation.observationId) {
    throw new Error('music_chart_history_observation_id_mismatch');
  }
}

function sameStableObservation(
  left: MusicChartObservation,
  right: MusicChartObservation,
): boolean {
  return left.observationId === right.observationId
    && left.canonicalArtistId === right.canonicalArtistId
    && left.platform === right.platform
    && left.providerPeriod === right.providerPeriod
    && left.status === right.status
    && left.rank === right.rank
    && left.trackTitle === right.trackTitle;
}

export function appendMusicChartObservationHistory(input: Readonly<{
  existing: readonly MusicChartHistoryEntry[];
  observations: readonly MusicChartObservation[];
}>): readonly MusicChartHistoryEntry[] {
  const byId = new Map<string, MusicChartHistoryEntry>();

  for (const entry of input.existing) {
    assertObservationIntegrity(entry.observation);

    if (
      entry.contractVersion !== MUSIC_CHART_HISTORY_CONTRACT_VERSION
      || entry.observationId !== entry.observation.observationId
      || entry.canonicalArtistId !== entry.observation.canonicalArtistId
      || entry.platform !== entry.observation.platform
      || entry.providerPeriod !== entry.observation.providerPeriod
      || entry.status !== entry.observation.status
      || entry.acquisitionCount < 1
      || !Number.isInteger(entry.acquisitionCount)
      || entry.acquisitionTimes.length !== entry.acquisitionCount
    ) {
      throw new Error('music_chart_history_entry_invalid');
    }

    if (byId.has(entry.observationId)) {
      throw new Error('music_chart_history_duplicate_existing_observation_id');
    }

    const acquisitionTimes = [...new Set(entry.acquisitionTimes)].sort(
      (a, b) => instant(a) - instant(b),
    );
    if (acquisitionTimes.length !== entry.acquisitionTimes.length) {
      throw new Error('music_chart_history_duplicate_acquisition_time');
    }
    if (
      acquisitionTimes[0] !== entry.firstCollectedAt
      || acquisitionTimes[acquisitionTimes.length - 1] !== entry.lastCollectedAt
    ) {
      throw new Error('music_chart_history_collection_range_invalid');
    }

    byId.set(entry.observationId, entry);
  }

  for (const observation of input.observations) {
    assertObservationIntegrity(observation);
    const collectedAtMs = instant(observation.collectedAt);
    const previous = byId.get(observation.observationId);

    if (!previous) {
      byId.set(observation.observationId, Object.freeze({
        contractVersion: MUSIC_CHART_HISTORY_CONTRACT_VERSION,
        observationId: observation.observationId,
        canonicalArtistId: observation.canonicalArtistId,
        platform: observation.platform,
        providerPeriod: observation.providerPeriod,
        status: observation.status,
        observation,
        firstCollectedAt: observation.collectedAt,
        lastCollectedAt: observation.collectedAt,
        acquisitionTimes: Object.freeze([observation.collectedAt]),
        acquisitionCount: 1,
      }));
      continue;
    }

    if (!sameStableObservation(previous.observation, observation)) {
      throw new Error('music_chart_history_observation_identity_collision');
    }

    const acquisitionTimes = [...new Set([
      ...previous.acquisitionTimes,
      observation.collectedAt,
    ])].sort((a, b) => instant(a) - instant(b));

    const lastMs = instant(previous.lastCollectedAt);
    byId.set(observation.observationId, Object.freeze({
      ...previous,
      firstCollectedAt: acquisitionTimes[0],
      lastCollectedAt: acquisitionTimes[acquisitionTimes.length - 1],
      acquisitionTimes: Object.freeze(acquisitionTimes),
      acquisitionCount: acquisitionTimes.length,
      observation: collectedAtMs >= lastMs
        ? observation
        : previous.observation,
    }));
  }

  return Object.freeze(
    [...byId.values()].sort((a, b) => {
      const timeDelta = instant(a.firstCollectedAt) - instant(b.firstCollectedAt);
      if (timeDelta !== 0) return timeDelta;
      return a.observationId.localeCompare(b.observationId);
    }),
  );
}

export function musicChartObservationFreshness(input: Readonly<{
  observation: MusicChartObservation;
  asOf: string;
  collectionProxyAt?: string;
}>): MusicChartFreshness {
  const asOfMs = instant(input.asOf);
  const referenceKind = input.observation.observedAt === null
    ? 'collection-proxy'
    : 'provider-observed-at';
  const referenceAt = input.observation.observedAt
    ?? input.collectionProxyAt
    ?? input.observation.collectedAt;
  const referenceMs = instant(referenceAt);

  if (referenceMs > asOfMs) {
    throw new Error('music_chart_freshness_reference_after_as_of');
  }

  return Object.freeze({
    referenceKind,
    referenceAt,
    asOf: input.asOf,
    ageSeconds: Math.floor((asOfMs - referenceMs) / 1000),
    thresholdApplied: false,
  });
}

export function buildMusicChartCurrentReadModel(input: Readonly<{
  history: readonly MusicChartHistoryEntry[];
  asOf: string;
}>): MusicChartCurrentReadModel {
  instant(input.asOf);

  const latestByArtistPlatform = new Map<
    string,
    Readonly<{ entry: MusicChartHistoryEntry; effectiveCollectedAt: string }>
  >();
  const asOfMs = instant(input.asOf);

  for (const entry of input.history) {
    assertObservationIntegrity(entry.observation);
    const eligibleAcquisitions = entry.acquisitionTimes
      .filter(value => instant(value) <= asOfMs)
      .sort((a, b) => instant(a) - instant(b));

    if (eligibleAcquisitions.length === 0) continue;

    const effectiveCollectedAt = eligibleAcquisitions[eligibleAcquisitions.length - 1];
    const key = `${entry.canonicalArtistId}\u0000${entry.platform}`;
    const previous = latestByArtistPlatform.get(key);

    if (
      !previous
      || instant(effectiveCollectedAt) > instant(previous.effectiveCollectedAt)
      || (
        instant(effectiveCollectedAt) === instant(previous.effectiveCollectedAt)
        && entry.observationId.localeCompare(previous.entry.observationId) > 0
      )
    ) {
      latestByArtistPlatform.set(key, Object.freeze({ entry, effectiveCollectedAt }));
    }
  }

  const rows = [...latestByArtistPlatform.values()]
    .map(({ entry, effectiveCollectedAt }): MusicChartCurrentReadRow => Object.freeze({
      canonicalArtistId: entry.canonicalArtistId,
      platform: entry.platform,
      observationId: entry.observationId,
      providerPeriod: entry.providerPeriod,
      status: entry.status,
      rank: entry.observation.rank,
      trackTitle: entry.observation.trackTitle,
      collectedAt: effectiveCollectedAt,
      freshness: musicChartObservationFreshness({
        observation: entry.observation,
        asOf: input.asOf,
        collectionProxyAt: effectiveCollectedAt,
      }),
      scoreFieldsPresent: false,
    }))
    .sort((a, b) => {
      const artist = a.canonicalArtistId.localeCompare(b.canonicalArtistId);
      return artist !== 0 ? artist : a.platform.localeCompare(b.platform);
    });

  return Object.freeze({
    contractVersion: MUSIC_CHART_HISTORY_CONTRACT_VERSION,
    asOf: input.asOf,
    rows: Object.freeze(rows),
    scoreFieldsPresent: false,
    thresholdApplied: false,
  });
}
