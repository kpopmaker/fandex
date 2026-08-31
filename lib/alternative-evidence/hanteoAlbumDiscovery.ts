import { sha256Canonical } from '../shared/canonicalDigest';

export const HANTEO_ALBUM_DISCOVERY_CONTRACT_VERSION = 'hanteo-album-discovery-v1';
export const HANTEO_ALBUM_API_BASE = 'https://api.hanteochart.io';

export type HanteoAlbumCurrentTimeframe = 'day' | 'week' | 'month';
export type HanteoAlbumDiscoveryMode = 'current' | 'historical';

export type HanteoAlbumRequestPlan = Readonly<{
  contractVersion: typeof HANTEO_ALBUM_DISCOVERY_CONTRACT_VERSION;
  mode: HanteoAlbumDiscoveryMode;
  timeframe: HanteoAlbumCurrentTimeframe;
  method: 'GET';
  limit: number;
  endpointPath: string;
  url: string;
  endpointEvidenceState: 'direct-verified-current';
  historicalSelectorState: 'pending';
  networkAllowed: false;
}>;

export type HanteoAlbumRawDetail = Readonly<{
  artistGlobalName?: unknown;
  badge?: unknown;
  supplyPrice?: unknown;
  salesVolume?: unknown;
  entertainment?: unknown;
  artistIdx?: unknown;
  artistName?: unknown;
  saleDate?: unknown;
  [key: string]: unknown;
}>;

export type HanteoAlbumRawRow = Readonly<{
  genre?: unknown;
  rank?: unknown;
  rankDiff?: unknown;
  targetIdx?: unknown;
  targetImg?: unknown;
  targetName?: unknown;
  value?: unknown;
  isDeadLine?: unknown;
  detail?: HanteoAlbumRawDetail | unknown;
  regDate?: unknown;
  status?: unknown;
  [key: string]: unknown;
}>;

export type HanteoAlbumDecodedResponse = Readonly<{
  contractVersion: typeof HANTEO_ALBUM_DISCOVERY_CONTRACT_VERSION;
  providerCode: number | null;
  providerMessage: string | null;
  providerPeriodLabel: string | null;
  responseState: 'success' | 'provider-error' | 'schema-invalid';
  rows: readonly HanteoAlbumRawRow[];
  rawDigest: string;
}>;

export type HanteoAlbumQualifiedRow = Readonly<{
  rank: number | null;
  providerTargetId: string;
  providerArtistId: string | null;
  releaseRaw: string;
  artistRaw: string | null;
  albumIndex: number;
  salesCopies: number;
  unit: 'copies';
  quantitySemanticState: 'verified-physical-sales-copies';
  quantityEvidenceId: string;
  saleDateEpochMs: number | null;
  registeredAt: string | null;
}>;

const PATH_BY_TIMEFRAME: Readonly<Record<HanteoAlbumCurrentTimeframe, string>> = Object.freeze({
  day: '/v4/ranking/list/ALBUM/DAILY/BASIC',
  week: '/v4/ranking/list/ALBUM/WEEKLY/BASIC',
  month: '/v4/ranking/list/ALBUM/MONTHLY/BASIC',
});

export class HanteoHistoricalSelectorPendingError extends Error {
  constructor() {
    super('hanteo-historical-selector-pending');
    this.name = 'HanteoHistoricalSelectorPendingError';
  }
}

export function buildHanteoAlbumRequestPlan(input: Readonly<{
  timeframe: HanteoAlbumCurrentTimeframe;
  limit: number;
  mode?: HanteoAlbumDiscoveryMode;
}>): HanteoAlbumRequestPlan {
  if (!Number.isInteger(input.limit) || input.limit <= 0) {
    throw new Error('hanteo-limit-must-be-positive-integer');
  }
  const mode = input.mode ?? 'current';
  if (mode === 'historical') throw new HanteoHistoricalSelectorPendingError();
  const endpointPath = PATH_BY_TIMEFRAME[input.timeframe];
  const url = `${HANTEO_ALBUM_API_BASE}${endpointPath}?limit=${encodeURIComponent(String(input.limit))}`;
  return Object.freeze({
    contractVersion: HANTEO_ALBUM_DISCOVERY_CONTRACT_VERSION,
    mode,
    timeframe: input.timeframe,
    method: 'GET',
    limit: input.limit,
    endpointPath,
    url,
    endpointEvidenceState: 'direct-verified-current',
    historicalSelectorState: 'pending',
    networkAllowed: false,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asInteger(value: unknown): number | null {
  const number = asFiniteNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export function decodeHanteoAlbumResponse(raw: unknown): HanteoAlbumDecodedResponse {
  const rawDigest = sha256Canonical(raw);
  if (!isRecord(raw)) {
    return Object.freeze({
      contractVersion: HANTEO_ALBUM_DISCOVERY_CONTRACT_VERSION,
      providerCode: null,
      providerMessage: null,
      providerPeriodLabel: null,
      responseState: 'schema-invalid',
      rows: Object.freeze([]),
      rawDigest,
    });
  }

  const providerCode = asInteger(raw.code);
  const providerMessage = asNonEmptyString(raw.message);
  const resultData = isRecord(raw.resultData) ? raw.resultData : null;
  const providerPeriodLabel = resultData ? asNonEmptyString(resultData.resultDatetime) : null;

  if (providerCode !== 100) {
    return Object.freeze({
      contractVersion: HANTEO_ALBUM_DISCOVERY_CONTRACT_VERSION,
      providerCode,
      providerMessage,
      providerPeriodLabel,
      responseState: 'provider-error',
      rows: Object.freeze([]),
      rawDigest,
    });
  }

  if (!resultData || !Array.isArray(resultData.list)) {
    return Object.freeze({
      contractVersion: HANTEO_ALBUM_DISCOVERY_CONTRACT_VERSION,
      providerCode,
      providerMessage,
      providerPeriodLabel,
      responseState: 'schema-invalid',
      rows: Object.freeze([]),
      rawDigest,
    });
  }

  const rows = resultData.list.filter(isRecord).map((row) => Object.freeze({ ...row })) as HanteoAlbumRawRow[];
  return Object.freeze({
    contractVersion: HANTEO_ALBUM_DISCOVERY_CONTRACT_VERSION,
    providerCode,
    providerMessage,
    providerPeriodLabel,
    responseState: 'success',
    rows: Object.freeze(rows),
    rawDigest,
  });
}

export function qualifyHanteoAlbumRow(
  row: HanteoAlbumRawRow,
  input: Readonly<{ quantityEvidenceId: string }>,
): HanteoAlbumQualifiedRow {
  if (input.quantityEvidenceId.trim() === '') throw new Error('hanteo-quantity-evidence-id-required');

  const targetId = asNonEmptyString(row.targetIdx) ?? (asInteger(row.targetIdx)?.toString() ?? null);
  const releaseRaw = asNonEmptyString(row.targetName);
  const albumIndex = asFiniteNumber(row.value);
  const detail = isRecord(row.detail) ? row.detail : null;
  const salesCopies = detail ? asInteger(detail.salesVolume) : null;

  if (!targetId) throw new Error('hanteo-target-id-missing');
  if (!releaseRaw) throw new Error('hanteo-release-title-missing');
  if (albumIndex === null || albumIndex < 0) throw new Error('hanteo-album-index-invalid');
  if (salesCopies === null || salesCopies < 0) throw new Error('hanteo-sales-volume-invalid');

  const artistIdx = detail ? asInteger(detail.artistIdx) : null;
  const artistRaw = detail
    ? asNonEmptyString(detail.artistGlobalName) ?? asNonEmptyString(detail.artistName)
    : null;
  const rank = asInteger(row.rank);
  const saleDateEpochMs = detail ? asInteger(detail.saleDate) : null;

  return Object.freeze({
    rank: rank !== null && rank > 0 ? rank : null,
    providerTargetId: targetId,
    providerArtistId: artistIdx !== null ? String(artistIdx) : null,
    releaseRaw,
    artistRaw,
    albumIndex,
    salesCopies,
    unit: 'copies',
    quantitySemanticState: 'verified-physical-sales-copies',
    quantityEvidenceId: input.quantityEvidenceId,
    saleDateEpochMs,
    registeredAt: asNonEmptyString(row.regDate),
  });
}

export function hanteoAlbumIndexIsSalesCopies(): false {
  return false;
}
