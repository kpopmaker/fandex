import { sha256Canonical } from '../shared/canonicalDigest';
import {
  LASTFM_CLOUD_HISTORY_VERSION,
  LASTFM_CLOUD_SCORE_USAGE,
  LASTFM_REAL_SIGNAL_READ_MODEL_VERSION,
  type LastfmCloudStatus,
  type LastfmDeltaRow,
  type LastfmHistoryRow,
  type LastfmPreviewScoreRow,
  type LastfmRealSignal,
  type LastfmRealSignalReadModel,
  type LastfmRealSignalSourceBundle,
} from './contracts';
import { parseCsvRows, requireCsvColumns } from './csv';

const HISTORY_COLUMNS = [
  'snapshotDate', 'artist', 'query', 'lastfmName', 'listeners', 'playcount', 'collectedAt', 'status',
] as const;
const DELTA_COLUMNS = [
  'artist', 'previousDate', 'latestDate', 'daysBetween', 'listenerDelta', 'playcountDelta',
  'listenerDeltaPerDay', 'playcountDeltaPerDay', 'status',
] as const;
const SCORE_COLUMNS = [
  'rank', 'artist', 'previousDate', 'latestDate', 'daysBetween', 'listenerDeltaPerDay',
  'playcountDeltaPerDay', 'listenerLogNormalized', 'playcountLogNormalized',
  'lastfmGlobalInterestPreviewPoint', 'status',
] as const;

function rejected(code: string): never {
  throw new Error(`lastfm_real_signal_read_model_rejected:${code}`);
}

function nonEmpty(value: unknown, code: string): string {
  if (typeof value !== 'string') return rejected(code);
  const normalized = value.normalize('NFC').trim();
  if (!normalized || Buffer.byteLength(normalized, 'utf8') > 1024) return rejected(code);
  return normalized;
}

function isoDate(value: unknown, code: string): string {
  const normalized = nonEmpty(value, code);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return rejected(code);
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) return rejected(code);
  return normalized;
}

function isoTimestamp(value: unknown, code: string): string {
  const normalized = nonEmpty(value, code);
  const parsed = new Date(normalized);
  if (!Number.isFinite(parsed.getTime())) return rejected(code);
  return normalized;
}

function finiteNumber(value: unknown, code: string): number {
  if (typeof value !== 'string' && typeof value !== 'number') return rejected(code);
  if (typeof value === 'string' && !value.trim()) return rejected(code);
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return rejected(code);
  return parsed;
}

function nonNegativeInteger(value: unknown, code: string): number {
  const parsed = finiteNumber(value, code);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return rejected(code);
  return parsed;
}

function positiveInteger(value: unknown, code: string): number {
  const parsed = nonNegativeInteger(value, code);
  if (parsed < 1) return rejected(code);
  return parsed;
}

function nullableNumber(value: string, code: string): number | null {
  return value.trim() === '' ? null : finiteNumber(value, code);
}

function nullableDate(value: string, code: string): string | null {
  return value.trim() === '' ? null : isoDate(value, code);
}

function parseStatus(statusJson: string): LastfmCloudStatus {
  let value: unknown;
  try {
    value = JSON.parse(statusJson);
  } catch {
    return rejected('status_json_invalid');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return rejected('status_shape_invalid');
  const raw = value as Record<string, unknown>;
  if (raw.version !== LASTFM_CLOUD_HISTORY_VERSION) return rejected('status_version_invalid');
  if (raw.scoreUsage !== LASTFM_CLOUD_SCORE_USAGE) return rejected('status_usage_invalid');
  if (raw.masterModified !== false) return rejected('master_score_must_remain_unmodified');
  if (raw.websiteModified !== false) return rejected('website_must_remain_unmodified');
  if (typeof raw.snapshotAppended !== 'boolean') return rejected('snapshot_appended_invalid');

  return Object.freeze({
    version: LASTFM_CLOUD_HISTORY_VERSION,
    createdAt: isoTimestamp(raw.createdAt, 'status_created_at_invalid'),
    snapshotDate: isoDate(raw.snapshotDate, 'status_snapshot_date_invalid'),
    snapshotAppended: raw.snapshotAppended,
    historyRowCount: nonNegativeInteger(raw.historyRowCount, 'history_row_count_invalid'),
    snapshotDateCount: nonNegativeInteger(raw.snapshotDateCount, 'snapshot_date_count_invalid'),
    deltaReadyCount: nonNegativeInteger(raw.deltaReadyCount, 'delta_ready_count_invalid'),
    needsReviewCount: nonNegativeInteger(raw.needsReviewCount, 'needs_review_count_invalid'),
    scorePreviewCount: nonNegativeInteger(raw.scorePreviewCount, 'score_preview_count_invalid'),
    scoreUsage: LASTFM_CLOUD_SCORE_USAGE,
    masterModified: false,
    websiteModified: false,
  });
}

function parseHistory(historyCsv: string): readonly LastfmHistoryRow[] {
  const rows = parseCsvRows(historyCsv);
  requireCsvColumns(rows, HISTORY_COLUMNS);
  return Object.freeze(rows.map((row, index) => {
    if (row.status !== 'ok') return rejected(`history_status_${index}`);
    return Object.freeze({
      snapshotDate: isoDate(row.snapshotDate, `history_snapshot_date_${index}`),
      artist: nonEmpty(row.artist, `history_artist_${index}`),
      query: nonEmpty(row.query, `history_query_${index}`),
      lastfmName: nonEmpty(row.lastfmName, `history_lastfm_name_${index}`),
      listeners: nonNegativeInteger(row.listeners, `history_listeners_${index}`),
      playcount: nonNegativeInteger(row.playcount, `history_playcount_${index}`),
      collectedAt: isoTimestamp(row.collectedAt, `history_collected_at_${index}`),
      status: 'ok' as const,
    });
  }));
}

function parseDelta(deltaCsv: string): readonly LastfmDeltaRow[] {
  const rows = parseCsvRows(deltaCsv);
  requireCsvColumns(rows, DELTA_COLUMNS);
  return Object.freeze(rows.map((row, index) => {
    if (!['delta_ready', 'needs_review', 'insufficient_history'].includes(row.status)) {
      return rejected(`delta_status_${index}`);
    }
    return Object.freeze({
      artist: nonEmpty(row.artist, `delta_artist_${index}`),
      previousDate: nullableDate(row.previousDate, `delta_previous_date_${index}`),
      latestDate: nullableDate(row.latestDate, `delta_latest_date_${index}`),
      daysBetween: nullableNumber(row.daysBetween, `delta_days_between_${index}`),
      listenerDelta: nullableNumber(row.listenerDelta, `delta_listener_delta_${index}`),
      playcountDelta: nullableNumber(row.playcountDelta, `delta_playcount_delta_${index}`),
      listenerDeltaPerDay: nullableNumber(row.listenerDeltaPerDay, `delta_listener_per_day_${index}`),
      playcountDeltaPerDay: nullableNumber(row.playcountDeltaPerDay, `delta_playcount_per_day_${index}`),
      status: row.status as LastfmDeltaRow['status'],
    });
  }));
}

function parseScores(scoreCsv: string): readonly LastfmPreviewScoreRow[] {
  const rows = parseCsvRows(scoreCsv);
  requireCsvColumns(rows, SCORE_COLUMNS);
  const parsed = rows.map((row, index) => {
    if (row.status !== 'preview_ready') return rejected(`score_status_${index}`);
    const listenerNormalized = finiteNumber(row.listenerLogNormalized, `score_listener_norm_${index}`);
    const playcountNormalized = finiteNumber(row.playcountLogNormalized, `score_playcount_norm_${index}`);
    const previewPoint = finiteNumber(row.lastfmGlobalInterestPreviewPoint, `score_preview_point_${index}`);
    if (listenerNormalized < 0 || listenerNormalized > 100
        || playcountNormalized < 0 || playcountNormalized > 100
        || previewPoint < 0 || previewPoint > 100) {
      return rejected(`score_normalized_range_${index}`);
    }
    return Object.freeze({
      rank: positiveInteger(row.rank, `score_rank_${index}`),
      artist: nonEmpty(row.artist, `score_artist_${index}`),
      previousDate: isoDate(row.previousDate, `score_previous_date_${index}`),
      latestDate: isoDate(row.latestDate, `score_latest_date_${index}`),
      daysBetween: positiveInteger(row.daysBetween, `score_days_between_${index}`),
      listenerDeltaPerDay: finiteNumber(row.listenerDeltaPerDay, `score_listener_per_day_${index}`),
      playcountDeltaPerDay: finiteNumber(row.playcountDeltaPerDay, `score_playcount_per_day_${index}`),
      listenerLogNormalized: listenerNormalized,
      playcountLogNormalized: playcountNormalized,
      lastfmGlobalInterestPreviewPoint: previewPoint,
      status: 'preview_ready' as const,
    });
  });
  const ranks = new Set(parsed.map((row) => row.rank));
  const artists = new Set(parsed.map((row) => row.artist));
  if (ranks.size !== parsed.length) return rejected('duplicate_score_rank');
  if (artists.size !== parsed.length) return rejected('duplicate_score_artist');
  return Object.freeze(parsed.sort((left, right) => left.rank - right.rank));
}

function historyKey(artist: string, snapshotDate: string): string {
  return `${artist}\u0000${snapshotDate}`;
}

function equalWithinPrecision(left: number, right: number): boolean {
  return Math.abs(left - right) <= 0.0001;
}

function signalFromRows(
  score: LastfmPreviewScoreRow,
  delta: LastfmDeltaRow,
  latest: LastfmHistoryRow,
): LastfmRealSignal {
  if (delta.status !== 'delta_ready'
      || delta.previousDate !== score.previousDate
      || delta.latestDate !== score.latestDate
      || delta.daysBetween !== score.daysBetween
      || delta.listenerDelta === null
      || delta.playcountDelta === null
      || delta.listenerDeltaPerDay === null
      || delta.playcountDeltaPerDay === null
      || !equalWithinPrecision(delta.listenerDeltaPerDay, score.listenerDeltaPerDay)
      || !equalWithinPrecision(delta.playcountDeltaPerDay, score.playcountDeltaPerDay)) {
    return rejected(`score_delta_mismatch_${score.artist}`);
  }
  if (latest.snapshotDate !== score.latestDate) return rejected(`latest_history_mismatch_${score.artist}`);

  return Object.freeze({
    artistLabel: score.artist,
    query: latest.query,
    resolvedLastfmName: latest.lastfmName,
    previousDate: score.previousDate,
    latestDate: score.latestDate,
    collectedAt: latest.collectedAt,
    listeners: latest.listeners,
    playcount: latest.playcount,
    listenerDelta: delta.listenerDelta,
    playcountDelta: delta.playcountDelta,
    listenerDeltaPerDay: delta.listenerDeltaPerDay,
    playcountDeltaPerDay: delta.playcountDeltaPerDay,
    listenerLogNormalized: score.listenerLogNormalized,
    playcountLogNormalized: score.playcountLogNormalized,
    previewPoint: score.lastfmGlobalInterestPreviewPoint,
    sourceRank: score.rank,
    sourceStatus: 'preview_ready' as const,
  });
}

export function buildLastfmRealSignalReadModel(
  bundle: LastfmRealSignalSourceBundle,
): LastfmRealSignalReadModel {
  const status = parseStatus(bundle.statusJson);
  const history = parseHistory(bundle.historyCsv);
  const deltas = parseDelta(bundle.deltaCsv);
  const scores = parseScores(bundle.scoreCsv);

  const historyMap = new Map<string, LastfmHistoryRow>();
  for (const row of history) {
    const key = historyKey(row.artist, row.snapshotDate);
    if (historyMap.has(key)) return rejected(`duplicate_history_${row.artist}_${row.snapshotDate}`);
    historyMap.set(key, row);
  }
  const deltaMap = new Map<string, LastfmDeltaRow>();
  for (const row of deltas) {
    if (deltaMap.has(row.artist)) return rejected(`duplicate_delta_${row.artist}`);
    deltaMap.set(row.artist, row);
  }

  const reasons: string[] = [];
  if (history.length !== status.historyRowCount) reasons.push('history-row-count-mismatch');
  if (deltas.filter((row) => row.status === 'delta_ready').length !== status.deltaReadyCount) {
    reasons.push('delta-ready-count-mismatch');
  }
  if (deltas.filter((row) => row.status === 'needs_review').length !== status.needsReviewCount) {
    reasons.push('needs-review-count-mismatch');
  }
  if (scores.length !== status.scorePreviewCount) reasons.push('score-preview-count-mismatch');
  if (status.needsReviewCount > 0) reasons.push('source-needs-review');

  const signals = Object.freeze(scores.map((score) => {
    if (score.latestDate !== status.snapshotDate) return rejected(`score_snapshot_mismatch_${score.artist}`);
    const delta = deltaMap.get(score.artist);
    if (!delta) return rejected(`missing_delta_${score.artist}`);
    const latest = historyMap.get(historyKey(score.artist, score.latestDate));
    const previous = historyMap.get(historyKey(score.artist, score.previousDate));
    if (!latest || !previous) return rejected(`missing_history_pair_${score.artist}`);
    return signalFromRows(score, delta, latest);
  }));

  if (signals.length === 0) reasons.push('no-preview-signals');
  if (status.deltaReadyCount !== status.scorePreviewCount) reasons.push('delta-score-count-mismatch');

  const digestPayload = {
    contractVersion: LASTFM_REAL_SIGNAL_READ_MODEL_VERSION,
    sourceVersion: LASTFM_CLOUD_HISTORY_VERSION,
    sourceUsage: LASTFM_CLOUD_SCORE_USAGE,
    sourceCreatedAt: status.createdAt,
    snapshotDate: status.snapshotDate,
    signals,
  };

  return Object.freeze({
    contractVersion: LASTFM_REAL_SIGNAL_READ_MODEL_VERSION,
    sourceVersion: LASTFM_CLOUD_HISTORY_VERSION,
    sourceUsage: LASTFM_CLOUD_SCORE_USAGE,
    sourceCreatedAt: status.createdAt,
    snapshotDate: status.snapshotDate,
    readiness: Object.freeze({
      state: reasons.length === 0 ? 'ready' as const : 'blocked' as const,
      reasons: Object.freeze([...reasons]),
      signalCount: signals.length,
      deltaReadyCount: status.deltaReadyCount,
      needsReviewCount: status.needsReviewCount,
    }),
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
