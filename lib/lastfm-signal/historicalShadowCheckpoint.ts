import { artistMonthlyMetricSeed } from '../../app/data/v4/metrics/artistMonthlyMetricSeed';
import type { ArtistMonthlyMetricPoint } from '../../app/data/v4/metrics/fandexMetricTypes';
import { sha256Canonical } from '../shared/canonicalDigest';
import {
  LASTFM_CLOUD_HISTORY_VERSION,
  LASTFM_CLOUD_SCORE_USAGE,
  type LastfmRealSignalSourceBundle,
} from './contracts';
import { parseCsvRows, requireCsvColumns } from './csv';
import {
  LASTFM_CANONICAL_IDENTITIES,
  applyLastfmIdentityQualityGate,
} from './identityQualityGate';
import { buildLastfmHistoricalWindowModel } from './historicalWindow';
import { buildLastfmRealSignalReadModel } from './readModel';
import {
  LASTFM_DEFAULT_REPEATED_SHADOW_READINESS_POLICY,
  evaluateLastfmRepeatedShadowReconciliationReadiness,
  type LastfmRepeatedShadowReadinessPolicy,
  type LastfmRepeatedShadowReconciliationReadiness,
} from './repeatedShadowReconciliation';
import {
  buildLastfmShadowScoringReconciliation,
  type LastfmShadowScoringReconciliation,
} from './shadowScoringReconciliation';
import { buildLastfmShadowVariableAdapter } from './shadowVariableAdapter';

export const LASTFM_HISTORICAL_SHADOW_CHECKPOINT_VERSION =
  'v137_lastfm_historical_shadow_checkpoint_v1' as const;

export const LASTFM_HISTORICAL_SHADOW_CHECKPOINT_DESCRIPTOR = Object.freeze({
  contractVersion: LASTFM_HISTORICAL_SHADOW_CHECKPOINT_VERSION,
  lifecycle: 'research' as const,
  evidenceMode: 'retrospective-replay-from-genuine-daily-history' as const,
  capturedContemporaneously: false as const,
  sourceProvider: 'lastfm' as const,
  targetVariable: 'momentum' as const,
  masterScoreApplied: false as const,
  metricRegistryModified: false as const,
  previewSeedModified: false as const,
  publicWebsiteApplied: false as const,
  productionEligible: false as const,
});

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

type RawHistoryRow = Readonly<{
  snapshotDate: string;
  artist: string;
  query: string;
  lastfmName: string;
  listeners: number;
  playcount: number;
  collectedAt: string;
  status: 'ok';
}>;

export type LastfmHistoricalReplayEvidencePoint = Readonly<{
  snapshotDate: string;
  sourceHistoryRowCount: number;
  sourceHistoryDigest: string;
  reconciliationState: LastfmShadowScoringReconciliation['state'];
  reconciliationDigest: string;
}>;

export type LastfmHistoricalShadowCheckpoint = Readonly<{
  contractVersion: typeof LASTFM_HISTORICAL_SHADOW_CHECKPOINT_VERSION;
  evidenceMode: 'retrospective-replay-from-genuine-daily-history';
  capturedContemporaneously: false;
  targetVariable: 'momentum';
  sourceDateCount: number;
  sourceRowCount: number;
  sourceDateRange: Readonly<{ startDate: string | null; endDate: string | null }>;
  previewSeedDigest: string;
  replayStartDate: string | null;
  replaySnapshotCount: number;
  replayEvidence: readonly LastfmHistoricalReplayEvidencePoint[];
  repeatedReadiness: LastfmRepeatedShadowReconciliationReadiness;
  state:
    | 'insufficient_replay_history'
    | 'replay_blocked'
    | 'replay_observe'
    | 'replay_evidence_candidate';
  reasons: readonly string[];
  digest: string;
  application: Readonly<{
    mode: 'research-replay-checkpoint-only';
    masterScoreApplied: false;
    metricRegistryModified: false;
    previewSeedModified: false;
    publicWebsiteApplied: false;
    productionApplied: false;
  }>;
  effects: Readonly<{
    externalCalls: 0;
    databaseReads: 0;
    databaseWrites: 0;
    masterScoreWrites: 0;
    websiteWrites: 0;
  }>;
}>;

function rejected(code: string): never {
  throw new Error(`lastfm_historical_shadow_checkpoint_rejected:${code}`);
}

function round(value: number, digits = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
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

function isoTimestamp(value: string, code: string): string {
  const normalized = value.normalize('NFC').trim();
  const parsed = Date.parse(normalized);
  if (!normalized || !Number.isFinite(parsed)) return rejected(code);
  return normalized;
}

function positiveInteger(value: string, code: string): number {
  if (!/^\d+$/.test(value.trim())) return rejected(code);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) return rejected(code);
  return parsed;
}

function parseHistory(historyCsv: string): readonly RawHistoryRow[] {
  const rows = parseCsvRows(historyCsv);
  requireCsvColumns(rows, HISTORY_COLUMNS);
  if (rows.length === 0) return Object.freeze([]);

  const seen = new Set<string>();
  const parsed = rows.map((row, index) => {
    if (row.status !== 'ok') return rejected(`history_status_${index}`);
    const snapshotDate = isoDate(row.snapshotDate, `history_date_${index}`);
    const artist = row.artist.normalize('NFC').trim();
    const query = row.query.normalize('NFC').trim();
    const lastfmName = row.lastfmName.normalize('NFC').trim();
    if (!artist || !query || !lastfmName) return rejected(`history_identity_${index}`);
    const key = `${snapshotDate}\u0000${artist}`;
    if (seen.has(key)) return rejected(`duplicate_history_${snapshotDate}_${artist}`);
    seen.add(key);
    return Object.freeze({
      snapshotDate,
      artist,
      query,
      lastfmName,
      listeners: positiveInteger(row.listeners, `history_listeners_${index}`),
      playcount: positiveInteger(row.playcount, `history_playcount_${index}`),
      collectedAt: isoTimestamp(row.collectedAt, `history_collected_at_${index}`),
      status: 'ok' as const,
    });
  });

  const expectedLabels = new Set(LASTFM_CANONICAL_IDENTITIES.map((identity) => identity.artistLabel));
  const byDate = new Map<string, RawHistoryRow[]>();
  for (const row of parsed) {
    const bucket = byDate.get(row.snapshotDate) ?? [];
    bucket.push(row);
    byDate.set(row.snapshotDate, bucket);
  }
  for (const [date, bucket] of byDate) {
    if (bucket.length !== LASTFM_CANONICAL_IDENTITIES.length) {
      return rejected(`incomplete_snapshot_${date}`);
    }
    const labels = new Set(bucket.map((row) => row.artist));
    if (labels.size !== expectedLabels.size || [...expectedLabels].some((label) => !labels.has(label))) {
      return rejected(`snapshot_artist_set_mismatch_${date}`);
    }
  }

  return Object.freeze(
    parsed.slice().sort((left, right) =>
      left.snapshotDate.localeCompare(right.snapshotDate) || left.artist.localeCompare(right.artist)),
  );
}

function csvEscape(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(headers: readonly string[], rows: readonly Readonly<Record<string, string | number>>[]): string {
  return [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? '')).join(',')),
  ].join('\n') + '\n';
}

function logMinMax(values: readonly number[]): readonly number[] {
  const logged = values.map((value) => Math.log1p(Math.max(0, value)));
  const low = Math.min(...logged);
  const high = Math.max(...logged);
  if (high === low) return Object.freeze(logged.map(() => 50));
  return Object.freeze(logged.map((value) => ((value - low) / (high - low)) * 100));
}

function daysBetween(left: string, right: string): number {
  return Math.round(
    (Date.parse(`${right}T00:00:00.000Z`) - Date.parse(`${left}T00:00:00.000Z`)) / 86_400_000,
  );
}

function buildReplayBundle(
  allRows: readonly RawHistoryRow[],
  cutoffDate: string,
): LastfmRealSignalSourceBundle {
  const rows = allRows.filter((row) => row.snapshotDate <= cutoffDate);
  const byArtist = new Map<string, RawHistoryRow[]>();
  for (const row of rows) {
    const bucket = byArtist.get(row.artist) ?? [];
    bucket.push(row);
    byArtist.set(row.artist, bucket);
  }

  const deltaRows: Array<Record<string, string | number>> = [];
  for (const identity of LASTFM_CANONICAL_IDENTITIES) {
    const points = (byArtist.get(identity.artistLabel) ?? [])
      .slice()
      .sort((left, right) => left.snapshotDate.localeCompare(right.snapshotDate));
    if (points.length < 2) {
      deltaRows.push({
        artist: identity.artistLabel,
        previousDate: '',
        latestDate: points.at(-1)?.snapshotDate ?? '',
        daysBetween: '',
        listenerDelta: '',
        playcountDelta: '',
        listenerDeltaPerDay: '',
        playcountDeltaPerDay: '',
        status: 'insufficient_history',
      });
      continue;
    }
    const previous = points.at(-2)!;
    const latest = points.at(-1)!;
    const intervalDays = daysBetween(previous.snapshotDate, latest.snapshotDate);
    if (intervalDays <= 0) return rejected(`invalid_interval_${identity.artistId}_${cutoffDate}`);
    const listenerDelta = latest.listeners - previous.listeners;
    const playcountDelta = latest.playcount - previous.playcount;
    const status = listenerDelta < 0 || playcountDelta < 0 ? 'needs_review' : 'delta_ready';
    deltaRows.push({
      artist: identity.artistLabel,
      previousDate: previous.snapshotDate,
      latestDate: latest.snapshotDate,
      daysBetween: intervalDays,
      listenerDelta,
      playcountDelta,
      listenerDeltaPerDay: round(listenerDelta / intervalDays),
      playcountDeltaPerDay: round(playcountDelta / intervalDays),
      status,
    });
  }

  const ready = deltaRows.filter((row) => row.status === 'delta_ready');
  const scoreRows: Array<Record<string, string | number>> = [];
  if (ready.length === LASTFM_CANONICAL_IDENTITIES.length) {
    const listenerNorm = logMinMax(ready.map((row) => Number(row.listenerDeltaPerDay)));
    const playcountNorm = logMinMax(ready.map((row) => Number(row.playcountDeltaPerDay)));
    ready.forEach((row, index) => {
      scoreRows.push({
        rank: 0,
        artist: row.artist,
        previousDate: row.previousDate,
        latestDate: row.latestDate,
        daysBetween: row.daysBetween,
        listenerDeltaPerDay: row.listenerDeltaPerDay,
        playcountDeltaPerDay: row.playcountDeltaPerDay,
        listenerLogNormalized: round(listenerNorm[index]),
        playcountLogNormalized: round(playcountNorm[index]),
        lastfmGlobalInterestPreviewPoint: round((listenerNorm[index] + playcountNorm[index]) / 2, 2),
        status: 'preview_ready',
      });
    });
    scoreRows.sort((left, right) =>
      Number(right.lastfmGlobalInterestPreviewPoint) - Number(left.lastfmGlobalInterestPreviewPoint)
      || Number(right.listenerDeltaPerDay) - Number(left.listenerDeltaPerDay)
      || Number(right.playcountDeltaPerDay) - Number(left.playcountDeltaPerDay));
    scoreRows.forEach((row, index) => { row.rank = index + 1; });
  }

  const dates = [...new Set(rows.map((row) => row.snapshotDate))].sort();
  const latestCollectedAt = rows
    .filter((row) => row.snapshotDate === cutoffDate)
    .map((row) => row.collectedAt)
    .sort()
    .at(-1);
  if (!latestCollectedAt) return rejected(`cutoff_snapshot_missing_${cutoffDate}`);

  const historyCsv = csv(
    HISTORY_COLUMNS,
    rows.map((row) => row as unknown as Record<string, string | number>),
  );
  const deltaCsv = csv(
    [
      'artist', 'previousDate', 'latestDate', 'daysBetween', 'listenerDelta', 'playcountDelta',
      'listenerDeltaPerDay', 'playcountDeltaPerDay', 'status',
    ],
    deltaRows,
  );
  const scoreCsv = csv(
    [
      'rank', 'artist', 'previousDate', 'latestDate', 'daysBetween', 'listenerDeltaPerDay',
      'playcountDeltaPerDay', 'listenerLogNormalized', 'playcountLogNormalized',
      'lastfmGlobalInterestPreviewPoint', 'status',
    ],
    scoreRows,
  );
  const statusJson = JSON.stringify({
    version: LASTFM_CLOUD_HISTORY_VERSION,
    createdAt: latestCollectedAt,
    snapshotDate: cutoffDate,
    snapshotAppended: true,
    historyRowCount: rows.length,
    snapshotDateCount: dates.length,
    deltaReadyCount: ready.length,
    needsReviewCount: deltaRows.filter((row) => row.status === 'needs_review').length,
    scorePreviewCount: scoreRows.length,
    scoreUsage: LASTFM_CLOUD_SCORE_USAGE,
    masterModified: false,
    websiteModified: false,
  });

  return Object.freeze({ historyCsv, deltaCsv, scoreCsv, statusJson });
}

export function buildLastfmHistoricalReplaySourceBundle(
  historyCsv: string,
  cutoffDate: string,
): LastfmRealSignalSourceBundle {
  const rows = parseHistory(historyCsv);
  return buildReplayBundle(rows, cutoffDate);
}

function checkpointState(
  readiness: LastfmRepeatedShadowReconciliationReadiness,
): LastfmHistoricalShadowCheckpoint['state'] {
  if (readiness.state === 'readiness_candidate') return 'replay_evidence_candidate';
  if (readiness.state === 'blocked') return 'replay_blocked';
  if (readiness.state === 'observe') return 'replay_observe';
  return 'insufficient_replay_history';
}

export function buildLastfmHistoricalShadowCheckpoint(
  historyCsv: string,
  metricPoints: readonly ArtistMonthlyMetricPoint[] = artistMonthlyMetricSeed,
  policy: LastfmRepeatedShadowReadinessPolicy = LASTFM_DEFAULT_REPEATED_SHADOW_READINESS_POLICY,
): LastfmHistoricalShadowCheckpoint {
  const rows = parseHistory(historyCsv);
  const dates = [...new Set(rows.map((row) => row.snapshotDate))].sort();
  const canonicalArtistIds = new Set(LASTFM_CANONICAL_IDENTITIES.map((identity) => identity.artistId));
  const previewSeedDigest = sha256Canonical(metricPoints);
  const snapshots: LastfmShadowScoringReconciliation[] = [];
  const replayEvidence: LastfmHistoricalReplayEvidencePoint[] = [];
  let replayStarted = false;

  for (const date of dates) {
    if (date === dates[0]) continue;
    const bundle = buildReplayBundle(rows, date);
    const readModel = buildLastfmRealSignalReadModel(bundle);
    const gate = applyLastfmIdentityQualityGate(readModel, canonicalArtistIds);
    const historical = buildLastfmHistoricalWindowModel(gate, bundle.historyCsv);

    if (!replayStarted && historical.state !== 'eligible') continue;
    if (!replayStarted) replayStarted = true;

    const adapter = buildLastfmShadowVariableAdapter(historical);
    const reconciliation = buildLastfmShadowScoringReconciliation(adapter, metricPoints);
    snapshots.push(reconciliation);

    const sourceRows = rows.filter((row) => row.snapshotDate <= date);
    replayEvidence.push(Object.freeze({
      snapshotDate: date,
      sourceHistoryRowCount: sourceRows.length,
      sourceHistoryDigest: sha256Canonical(sourceRows),
      reconciliationState: reconciliation.state,
      reconciliationDigest: reconciliation.digest,
    }));
  }

  const repeatedReadiness = evaluateLastfmRepeatedShadowReconciliationReadiness(
    Object.freeze(snapshots),
    policy,
  );
  const state = checkpointState(repeatedReadiness);
  const reasons = Object.freeze([
    'retrospective-replay-not-contemporaneous-capture',
    ...(state === 'replay_evidence_candidate'
      ? ['replay-evidence-does-not-authorize-production']
      : repeatedReadiness.reasons),
  ]);
  const payload = {
    contractVersion: LASTFM_HISTORICAL_SHADOW_CHECKPOINT_VERSION,
    evidenceMode: 'retrospective-replay-from-genuine-daily-history' as const,
    capturedContemporaneously: false as const,
    targetVariable: 'momentum' as const,
    sourceDateCount: dates.length,
    sourceRowCount: rows.length,
    sourceDateRange: {
      startDate: dates[0] ?? null,
      endDate: dates.at(-1) ?? null,
    },
    previewSeedDigest,
    replayStartDate: replayEvidence[0]?.snapshotDate ?? null,
    replaySnapshotCount: replayEvidence.length,
    replayEvidence: Object.freeze(replayEvidence),
    repeatedReadiness,
    state,
    reasons,
  };
  const digest = sha256Canonical(payload);

  return Object.freeze({
    ...payload,
    sourceDateRange: Object.freeze(payload.sourceDateRange),
    digest,
    application: Object.freeze({
      mode: 'research-replay-checkpoint-only' as const,
      masterScoreApplied: false as const,
      metricRegistryModified: false as const,
      previewSeedModified: false as const,
      publicWebsiteApplied: false as const,
      productionApplied: false as const,
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
