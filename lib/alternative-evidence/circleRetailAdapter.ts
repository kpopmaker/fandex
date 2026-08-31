import { sha256Canonical } from '../shared/canonicalDigest';
import {
  buildDirectAlbumObservation,
  validateDirectAlbumObservation,
  type DirectAlbumObservation,
  type DirectAlbumProviderDescriptor,
} from './directAlbumProvider';
import { CIRCLE_EVIDENCE_DESCRIPTOR } from './directProviderEvidence';
import {
  canPromoteCircleRetailDiscovery,
  type CircleRetailDiscoveryCapture,
} from './circleRetailDiscovery';
import {
  isResolved,
  type IdentityResolutionState,
  type IdentityReviewState,
} from './identityFoundation';

export const CIRCLE_RETAIL_ADAPTER_CONTRACT_VERSION = 'circle-retail-adapter-v1' as const;
export const CIRCLE_RETAIL_LIST_ENDPOINT = '/data/api/chart/retail_list' as const;

export type CircleRetailQualifiedTimeframe = 'day' | 'week' | 'month';

export type CircleRetailRawRow = Readonly<{
  Album: string;
  Artist: string;
  Barcode: string;
  rowSum: string;
  KSum: string | null;
  ESum: string | null;
  RankInt: string | null;
  RankOrder: string | null;
  YYYYMMDD: string | null;
  YYYYMM: string | null;
  raw: Readonly<Record<string, unknown>>;
}>;

export type CircleRetailIdentityResolution = Readonly<{
  fandexArtistId: string | null;
  fandexReleaseId: string | null;
  fandexReleaseFamilyId: string | null;
  artistResolutionState: IdentityResolutionState;
  artistReviewState: IdentityReviewState;
  releaseResolutionState: IdentityResolutionState;
  releaseReviewState: IdentityReviewState;
  evidenceIds: readonly string[];
}>;

export type CircleRetailAdapterRejectionCode =
  | 'source-row-invalid'
  | 'sku-identity-missing'
  | 'quantity-invalid'
  | 'provider-period-mismatch'
  | 'artist-identity-unresolved'
  | 'release-identity-unresolved'
  | 'identity-evidence-missing';

export type CircleRetailAdapterRejection = Readonly<{
  rowIndex: number;
  barcode: string | null;
  artistRaw: string | null;
  albumRaw: string | null;
  reasons: readonly CircleRetailAdapterRejectionCode[];
}>;

export type CircleRetailAdapterResult = Readonly<{
  contractVersion: typeof CIRCLE_RETAIL_ADAPTER_CONTRACT_VERSION;
  providerId: 'circle-chart';
  timeframe: CircleRetailQualifiedTimeframe;
  providerPeriod: string;
  payloadDigest: string;
  observations: readonly DirectAlbumObservation[];
  rejections: readonly CircleRetailAdapterRejection[];
  quantityEvidenceIds: readonly string[];
  liveEligible: false;
  featureBridgeEligible: false;
  adapterDigest: string;
}>;

export type CircleRetailIdentityResolver = (
  row: CircleRetailRawRow,
  rowIndex: number,
) => CircleRetailIdentityResolution | null;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function optionalString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new Error(`circle_retail_${key}_type_invalid`);
  return value;
}

function requiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`circle_retail_${key}_missing`);
  }
  return value;
}

function numericObjectRows(value: unknown): readonly Record<string, unknown>[] {
  if (!isRecord(value)) throw new Error('circle_retail_list_shape_invalid');
  const entries = Object.entries(value);
  if (entries.length === 0) return Object.freeze([]);
  if (!entries.every(([key, child]) => /^\d+$/.test(key) && isRecord(child))) {
    throw new Error('circle_retail_list_shape_invalid');
  }
  return Object.freeze(
    entries
      .sort(([left], [right]) => Number(left) - Number(right))
      .map(([, child]) => child as Record<string, unknown>),
  );
}

function decodeRow(raw: Record<string, unknown>): CircleRetailRawRow {
  return Object.freeze({
    Album: requiredString(raw, 'Album'),
    Artist: requiredString(raw, 'Artist'),
    Barcode: requiredString(raw, 'Barcode'),
    rowSum: requiredString(raw, 'rowSum'),
    KSum: optionalString(raw, 'KSum'),
    ESum: optionalString(raw, 'ESum'),
    RankInt: optionalString(raw, 'RankInt'),
    RankOrder: optionalString(raw, 'RankOrder'),
    YYYYMMDD: optionalString(raw, 'YYYYMMDD'),
    YYYYMM: optionalString(raw, 'YYYYMM'),
    raw: Object.freeze({ ...raw }),
  });
}

function integerQuantity(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) return null;
  return parsed;
}

function requestContract(capture: CircleRetailDiscoveryCapture): Readonly<{
  timeframe: CircleRetailQualifiedTimeframe;
  providerPeriodKey: string;
  providerPeriod: string;
}> {
  if (!canPromoteCircleRetailDiscovery(capture)) {
    throw new Error('circle_retail_adapter_capture_not_promotable');
  }
  if (capture.request.method !== 'POST' || capture.request.url !== CIRCLE_RETAIL_LIST_ENDPOINT) {
    throw new Error('circle_retail_adapter_request_contract_mismatch');
  }
  if (capture.verifiedQuantityField !== 'rowSum' || capture.verifiedRowPath !== '$.List{values}') {
    throw new Error('circle_retail_adapter_quantity_contract_mismatch');
  }
  if (capture.response.providerStatus !== 'OK') {
    throw new Error('circle_retail_adapter_provider_status_not_ok');
  }
  const timeframe = capture.request.params.termGbn;
  if (timeframe !== 'day' && timeframe !== 'week' && timeframe !== 'month') {
    throw new Error('circle_retail_adapter_timeframe_not_qualified');
  }
  const providerPeriodKey = capture.request.params.yyyymmdd;
  if (!providerPeriodKey || !/^\d{6}(\d{2})?$/.test(providerPeriodKey)) {
    throw new Error('circle_retail_adapter_provider_period_invalid');
  }
  return Object.freeze({
    timeframe,
    providerPeriodKey,
    providerPeriod: `${timeframe}:${providerPeriodKey}`,
  });
}

function periodMatchesRow(
  timeframe: CircleRetailQualifiedTimeframe,
  providerPeriodKey: string,
  row: CircleRetailRawRow,
): boolean {
  if (timeframe === 'month') return row.YYYYMM === providerPeriodKey;
  return row.YYYYMMDD === providerPeriodKey;
}

function rejection(
  rowIndex: number,
  raw: Record<string, unknown> | null,
  reasons: readonly CircleRetailAdapterRejectionCode[],
): CircleRetailAdapterRejection {
  return Object.freeze({
    rowIndex,
    barcode: raw && typeof raw.Barcode === 'string' ? raw.Barcode : null,
    artistRaw: raw && typeof raw.Artist === 'string' ? raw.Artist : null,
    albumRaw: raw && typeof raw.Album === 'string' ? raw.Album : null,
    reasons: Object.freeze([...new Set(reasons)]),
  });
}

function isStrongIdentityResolution(identity: CircleRetailIdentityResolution): Readonly<{
  artistResolved: boolean;
  releaseResolved: boolean;
}> {
  return Object.freeze({
    artistResolved: isResolved(
      identity.artistResolutionState,
      identity.fandexArtistId,
      identity.artistReviewState,
    ),
    releaseResolved: isResolved(
      identity.releaseResolutionState,
      identity.fandexReleaseId,
      identity.releaseReviewState,
    ),
  });
}

export function adaptCircleRetailQualifiedResponse(input: Readonly<{
  capture: CircleRetailDiscoveryCapture;
  rawResponse: unknown;
  collectedAt: string;
  resolveIdentity: CircleRetailIdentityResolver;
  syntheticFixture?: boolean;
}>): CircleRetailAdapterResult {
  if (Number.isNaN(Date.parse(input.collectedAt))) {
    throw new Error('circle_retail_adapter_collected_at_invalid');
  }
  if (sha256Canonical(input.rawResponse) !== input.capture.payloadDigest) {
    throw new Error('circle_retail_adapter_payload_digest_mismatch');
  }
  if (!isRecord(input.rawResponse) || input.rawResponse.ResultStatus !== 'OK') {
    throw new Error('circle_retail_adapter_response_shape_invalid');
  }

  const contract = requestContract(input.capture);
  const rawRows = numericObjectRows(input.rawResponse.List);
  const observations: DirectAlbumObservation[] = [];
  const rejections: CircleRetailAdapterRejection[] = [];

  rawRows.forEach((raw, rowIndex) => {
    let row: CircleRetailRawRow;
    try {
      row = decodeRow(raw);
    } catch {
      const reasons: CircleRetailAdapterRejectionCode[] = ['source-row-invalid'];
      if (typeof raw.Barcode !== 'string' || raw.Barcode.trim() === '') reasons.push('sku-identity-missing');
      if (typeof raw.rowSum !== 'string' || integerQuantity(raw.rowSum) === null) reasons.push('quantity-invalid');
      rejections.push(rejection(rowIndex, raw, reasons));
      return;
    }

    const reasons: CircleRetailAdapterRejectionCode[] = [];
    const quantity = integerQuantity(row.rowSum);
    if (quantity === null) reasons.push('quantity-invalid');
    if (row.Barcode.trim() === '') reasons.push('sku-identity-missing');
    if (!periodMatchesRow(contract.timeframe, contract.providerPeriodKey, row)) {
      reasons.push('provider-period-mismatch');
    }

    const identity = input.resolveIdentity(row, rowIndex);
    if (!identity) {
      reasons.push('artist-identity-unresolved', 'release-identity-unresolved', 'identity-evidence-missing');
    } else {
      const resolved = isStrongIdentityResolution(identity);
      if (!resolved.artistResolved) reasons.push('artist-identity-unresolved');
      if (!resolved.releaseResolved) reasons.push('release-identity-unresolved');
      if (identity.evidenceIds.length === 0) reasons.push('identity-evidence-missing');
    }

    if (reasons.length > 0 || quantity === null || !identity) {
      rejections.push(rejection(rowIndex, raw, reasons));
      return;
    }

    observations.push(buildDirectAlbumObservation({
      contractVersion: 'direct-album-observation-v1',
      providerId: 'circle-chart',
      providerObservationId: null,
      providerArtistId: null,
      providerReleaseId: null,
      providerEditionId: null,
      providerSkuId: row.Barcode,
      fandexArtistId: identity.fandexArtistId,
      fandexReleaseId: identity.fandexReleaseId,
      fandexReleaseFamilyId: identity.fandexReleaseFamilyId,
      semantic: 'period-sale',
      value: quantity,
      unit: 'physical-units',
      territory: null,
      format: null,
      providerPeriod: contract.providerPeriod,
      providerPublishedAt: null,
      observedAt: input.capture.observedAt,
      collectedAt: input.collectedAt,
      revisionId: null,
      revisionObservedAt: null,
      supersedesObservationId: null,
      knowledgeMode: 'current-research',
      scopeRole: 'standalone',
      parentObservationId: null,
      syntheticFixture: input.syntheticFixture ?? false,
    }));
  });

  const digestShape = {
    contractVersion: CIRCLE_RETAIL_ADAPTER_CONTRACT_VERSION,
    providerId: 'circle-chart' as const,
    timeframe: contract.timeframe,
    providerPeriod: contract.providerPeriod,
    payloadDigest: input.capture.payloadDigest,
    observationIds: observations.map((observation) => observation.observationId),
    rejections,
    quantityEvidenceIds: input.capture.quantityVerificationEvidenceIds,
    liveEligible: false as const,
    featureBridgeEligible: false as const,
  };

  return Object.freeze({
    ...digestShape,
    observations: Object.freeze(observations),
    rejections: Object.freeze(rejections),
    quantityEvidenceIds: Object.freeze([...input.capture.quantityVerificationEvidenceIds]),
    adapterDigest: sha256Canonical(digestShape),
  });
}

export function validateCircleRetailNormalizedObservations(
  observations: readonly DirectAlbumObservation[],
  descriptor: DirectAlbumProviderDescriptor = CIRCLE_EVIDENCE_DESCRIPTOR,
): Readonly<{ valid: boolean; issues: readonly string[] }> {
  const issues = observations.flatMap((observation) =>
    validateDirectAlbumObservation(observation, descriptor, {
      allowSyntheticUnknownCapabilities: observation.syntheticFixture,
    }).issues,
  );
  return Object.freeze({
    valid: issues.length === 0,
    issues: Object.freeze([...new Set(issues)].sort()),
  });
}

export class CircleRetailLiveGateError extends Error {
  readonly code = 'circle-retail-live-calls-disabled' as const;
  constructor() {
    super('circle_retail_live_calls_disabled');
    this.name = 'CircleRetailLiveGateError';
  }
}

export type CircleRetailAdapter = Readonly<{
  descriptor: DirectAlbumProviderDescriptor;
  normalizeQualifiedResponse: typeof adaptCircleRetailQualifiedResponse;
  executeLive: () => Promise<never>;
}>;

export const CIRCLE_RETAIL_ADAPTER: CircleRetailAdapter = Object.freeze({
  descriptor: CIRCLE_EVIDENCE_DESCRIPTOR,
  normalizeQualifiedResponse: adaptCircleRetailQualifiedResponse,
  executeLive: async (): Promise<never> => {
    throw new CircleRetailLiveGateError();
  },
});
