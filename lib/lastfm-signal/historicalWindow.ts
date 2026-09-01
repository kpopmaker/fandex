import { sha256Canonical } from '../shared/canonicalDigest';
import { parseCsvRows, requireCsvColumns } from './csv';
import type {
  LastfmCanonicalSignal,
  LastfmIdentityQualityGateResult,
} from './identityQualityGate';

export const LASTFM_HISTORICAL_WINDOW_VERSION =
  'v133_lastfm_historical_window_v1' as const;

export const LASTFM_HISTORICAL_WINDOW_DAYS = 14 as const;
export const LASTFM_MINIMUM_WINDOW_INTERVALS = 6 as const;

const HISTORY_COLUMNS = [
  'snapshotDate',
  'artist',
  'query',
  'lastfmName',
  'listeners',
  'playcount',
  'collectedAt',
  'status',
] as const;

export type LastfmHistoricalStabilityState = 'stable' | 'variable' | 'blocked';

export type LastfmHistoricalWindowSignal = Readonly<{
  artistId: string;
  artistLabel: string;
  windowStartDate: string;
  windowEndDate: string;
  snapshotCount: number;
  intervalCount: number;
  medianListenerDeltaPerDay: number;
  medianPlaycountDeltaPerDay: number;
  listenerRelativeMad: number;
  playcountRelativeMad: number;
  positiveIntervalRatio: number;
  latestListenerDeltaPerDay: number;
  latestPlaycountDeltaPerDay: number;
  historicalNormalizedPoint: number | null;
  stabilityState: LastfmHistoricalStabilityState;
  blockers: readonly string[];
}>;

export type LastfmHistoricalWindowModel = Readonly<{
  contractVersion: typeof LASTFM_HISTORICAL_WINDOW_VERSION;
  sourceGateVersion: LastfmIdentityQualityGateResult['contractVersion'];
  snapshotDate: string;
  windowDays: typeof LASTFM_HISTORICAL_WINDOW_DAYS;
  minimumIntervals: typeof LASTFM_MINIMUM_WINDOW_INTERVALS;
  state: 'eligible' | 'blocked';
  reasons: readonly string[];
  signalCount: number;
  stableSignalCount: number;
  variableSignalCount: number;
  blockedSignalCount: number;
  signals: readonly LastfmHistoricalWindowSignal[];
  digest: string;
  effects: Readonly<{
    externalCalls: 0;
    databaseReads: 0;
    databaseWrites: 0;
    masterScoreWrites: 0;
    websiteWrites: 0;
  }>;
}>;

type HistoryPoint = Readonly<{
  snapshotDate: string;
  artist: string;
  listeners: number;
  playcount: number;
}>;

type IntervalPoint = Readonly<{
  previousDate: string;
  latestDate: string;
  daysBetween: number;
  listenerDeltaPerDay: number;
  playcountDeltaPerDay: number;
}>;

function rejected(code: string): never {
  throw new Error(`lastfm_historical_window_rejected:${code}`);
}

function isoDate(value: string, code: string): string {
  const normalized = value.normalize('NFC').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return rejected(code);
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    return rejected(code);
  }
  return normalized;
}

function nonNegativeInteger(value: string, code: string): number {
  if (!/^\d+$/.test(value.trim())) return rejected(code);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return rejected(code);
  return parsed;
}

function daysBetween(left: string, right: string): number {
  const leftMs = Date.parse(`${left}T00:00:00.000Z`);
  const rightMs = Date.parse(`${right}T00:00:00.000Z`);
  return Math.round((rightMs - leftMs) / 86_400_000);
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return rejected('median_empty');
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function relativeMad(values: readonly number[], center: number): number {
  const deviations = values.map((value) => Math.abs(value - center));
  return round(median(deviations) / Math.max(Math.abs(center), 1));
}

function parseHistory(historyCsv: string): readonly HistoryPoint[] {
  const rows = parseCsvRows(historyCsv);
  requireCsvColumns(rows, HISTORY_COLUMNS);
  const seen = new Set<string>();
  return Object.freeze(
    rows.map((row, index) => {
      if (row.status !== 'ok') return rejected(`history_status_${index}`);
      const snapshotDate = isoDate(row.snapshotDate, `history_date_${index}`);
      const artist = row.artist.normalize('NFC').trim();
      if (!artist) return rejected(`history_artist_${index}`);
      const key = `${artist}\u0000${snapshotDate}`;
      if (seen.has(key)) return rejected(`duplicate_history_${artist}_${snapshotDate}`);
      seen.add(key);
      return Object.freeze({
        snapshotDate,
        artist,
        listeners: nonNegativeInteger(row.listeners, `history_listeners_${index}`),
        playcount: nonNegativeInteger(row.playcount, `history_playcount_${index}`),
      });
    }),
  );
}

function windowStartDate(snapshotDate: string): string {
  const parsed = new Date(`${snapshotDate}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() - (LASTFM_HISTORICAL_WINDOW_DAYS - 1));
  return parsed.toISOString().slice(0, 10);
}

function buildIntervals(points: readonly HistoryPoint[]): readonly IntervalPoint[] {
  const intervals: IntervalPoint[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const latest = points[index];
    const intervalDays = daysBetween(previous.snapshotDate, latest.snapshotDate);
    if (intervalDays <= 0) return rejected(`history_order_${latest.artist}_${latest.snapshotDate}`);
    intervals.push(
      Object.freeze({
        previousDate: previous.snapshotDate,
        latestDate: latest.snapshotDate,
        daysBetween: intervalDays,
        listenerDeltaPerDay: round((latest.listeners - previous.listeners) / intervalDays),
        playcountDeltaPerDay: round((latest.playcount - previous.playcount) / intervalDays),
      }),
    );
  }
  return Object.freeze(intervals);
}

function equalWithinPrecision(left: number, right: number): boolean {
  return Math.abs(left - right) <= 0.0001;
}

function logMinMax(values: readonly number[]): readonly number[] {
  if (values.length === 0) return Object.freeze([]);
  const logged = values.map((value) => Math.log1p(Math.max(0, value)));
  const low = Math.min(...logged);
  const high = Math.max(...logged);
  if (high === low) return Object.freeze(logged.map(() => 50));
  return Object.freeze(logged.map((value) => round(((value - low) / (high - low)) * 100)));
}

function buildProfile(
  signal: LastfmCanonicalSignal,
  allHistory: readonly HistoryPoint[],
  snapshotDate: string,
): Omit<LastfmHistoricalWindowSignal, 'historicalNormalizedPoint'> {
  const blockers: string[] = [];
  if (signal.qualityState !== 'eligible') blockers.push('source-signal-blocked');
  const startDate = windowStartDate(snapshotDate);
  const points = allHistory
    .filter(
      (row) =>
        row.artist === signal.artistLabel &&
        row.snapshotDate >= startDate &&
        row.snapshotDate <= snapshotDate,
    )
    .sort((left, right) => left.snapshotDate.localeCompare(right.snapshotDate));

  if (points.length === 0 || points.at(-1)?.snapshotDate !== snapshotDate) {
    blockers.push('window-latest-snapshot-missing');
  }
  const intervals = buildIntervals(points);
  if (intervals.length < LASTFM_MINIMUM_WINDOW_INTERVALS) blockers.push('insufficient-window-history');
  if (intervals.some((interval) => interval.listenerDeltaPerDay < 0 || interval.playcountDeltaPerDay < 0)) {
    blockers.push('historical-negative-delta');
  }

  const listenerRates = intervals.map((interval) => interval.listenerDeltaPerDay);
  const playcountRates = intervals.map((interval) => interval.playcountDeltaPerDay);
  const medianListener = listenerRates.length > 0 ? median(listenerRates) : 0;
  const medianPlaycount = playcountRates.length > 0 ? median(playcountRates) : 0;
  const listenerMad = listenerRates.length > 0 ? relativeMad(listenerRates, medianListener) : 0;
  const playcountMad = playcountRates.length > 0 ? relativeMad(playcountRates, medianPlaycount) : 0;
  const positiveIntervalRatio = intervals.length > 0
    ? round(
        intervals.filter(
          (interval) => interval.listenerDeltaPerDay > 0 && interval.playcountDeltaPerDay > 0,
        ).length / intervals.length,
      )
    : 0;
  const latestInterval = intervals.at(-1);
  if (
    latestInterval &&
    (!equalWithinPrecision(latestInterval.listenerDeltaPerDay, signal.listenerDeltaPerDay) ||
      !equalWithinPrecision(latestInterval.playcountDeltaPerDay, signal.playcountDeltaPerDay))
  ) {
    blockers.push('latest-interval-source-mismatch');
  }

  const stabilityState: LastfmHistoricalStabilityState = blockers.length > 0
    ? 'blocked'
    : positiveIntervalRatio >= 0.8 && listenerMad <= 0.75 && playcountMad <= 0.75
      ? 'stable'
      : 'variable';

  return Object.freeze({
    artistId: signal.artistId,
    artistLabel: signal.artistLabel,
    windowStartDate: points[0]?.snapshotDate ?? startDate,
    windowEndDate: points.at(-1)?.snapshotDate ?? snapshotDate,
    snapshotCount: points.length,
    intervalCount: intervals.length,
    medianListenerDeltaPerDay: round(medianListener),
    medianPlaycountDeltaPerDay: round(medianPlaycount),
    listenerRelativeMad: listenerMad,
    playcountRelativeMad: playcountMad,
    positiveIntervalRatio,
    latestListenerDeltaPerDay: latestInterval?.listenerDeltaPerDay ?? 0,
    latestPlaycountDeltaPerDay: latestInterval?.playcountDeltaPerDay ?? 0,
    stabilityState,
    blockers: Object.freeze(blockers),
  });
}

export function buildLastfmHistoricalWindowModel(
  gate: LastfmIdentityQualityGateResult,
  historyCsv: string,
): LastfmHistoricalWindowModel {
  const reasons: string[] = [];
  if (gate.state !== 'eligible') reasons.push('identity-quality-gate-blocked');
  if (gate.effects.masterScoreWrites !== 0 || gate.effects.websiteWrites !== 0) {
    reasons.push('source-side-effects-not-read-only');
  }

  const history = parseHistory(historyCsv);
  const baseProfiles = gate.signals.map((signal) => buildProfile(signal, history, gate.snapshotDate));
  const normalizableProfiles = baseProfiles.filter((profile) => profile.stabilityState !== 'blocked');
  const listenerNormalized = logMinMax(
    normalizableProfiles.map((profile) => profile.medianListenerDeltaPerDay),
  );
  const playcountNormalized = logMinMax(
    normalizableProfiles.map((profile) => profile.medianPlaycountDeltaPerDay),
  );
  const normalizedByArtist = new Map<string, number>();
  normalizableProfiles.forEach((profile, index) => {
    normalizedByArtist.set(
      profile.artistId,
      round((listenerNormalized[index] + playcountNormalized[index]) / 2, 2),
    );
  });

  const signals = Object.freeze(
    baseProfiles.map((profile) =>
      Object.freeze({
        ...profile,
        historicalNormalizedPoint:
          profile.stabilityState === 'blocked'
            ? null
            : normalizedByArtist.get(profile.artistId) ?? null,
      }),
    ),
  );
  const blockedSignalCount = signals.filter((signal) => signal.stabilityState === 'blocked').length;
  const stableSignalCount = signals.filter((signal) => signal.stabilityState === 'stable').length;
  const variableSignalCount = signals.filter((signal) => signal.stabilityState === 'variable').length;
  if (signals.length !== gate.expectedSignalCount) reasons.push('historical-signal-count-mismatch');
  if (blockedSignalCount > 0) reasons.push('historical-window-blocked-signals');

  const state = reasons.length === 0 ? 'eligible' as const : 'blocked' as const;
  const digestPayload = {
    contractVersion: LASTFM_HISTORICAL_WINDOW_VERSION,
    sourceGateVersion: gate.contractVersion,
    snapshotDate: gate.snapshotDate,
    windowDays: LASTFM_HISTORICAL_WINDOW_DAYS,
    minimumIntervals: LASTFM_MINIMUM_WINDOW_INTERVALS,
    state,
    reasons,
    signals,
  };

  return Object.freeze({
    contractVersion: LASTFM_HISTORICAL_WINDOW_VERSION,
    sourceGateVersion: gate.contractVersion,
    snapshotDate: gate.snapshotDate,
    windowDays: LASTFM_HISTORICAL_WINDOW_DAYS,
    minimumIntervals: LASTFM_MINIMUM_WINDOW_INTERVALS,
    state,
    reasons: Object.freeze(reasons),
    signalCount: signals.length,
    stableSignalCount,
    variableSignalCount,
    blockedSignalCount,
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
