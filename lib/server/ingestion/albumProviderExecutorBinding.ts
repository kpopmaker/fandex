import type {
  AlbumCollectorPlannedRequest,
  AlbumCollectorProvider,
} from './albumCollectorPlan';
import type {
  AlbumBoundedResearchExecutor,
  AlbumBoundedResearchExecutorResult,
} from './albumBoundedResearchOrchestrator';
import type { DirectAlbumProviderDescriptor } from '../../alternative-evidence/directAlbumProvider';
import {
  adaptCircleRetailQualifiedResponse,
  validateCircleRetailNormalizedObservations,
  type CircleRetailIdentityResolver,
} from '../../alternative-evidence/circleRetailAdapter';
import {
  buildCircleRetailDiscoveryRequestPlan,
  captureCircleRetailDiscovery,
  verifyCircleRetailCandidateEndpoint,
  verifyCircleRetailQuantitySemantic,
} from '../../alternative-evidence/circleRetailDiscovery';
import {
  adaptHanteoCurrentAlbumResponse,
  validateHanteoCurrentObservations,
  type HanteoAlbumIdentityResolver,
} from '../../alternative-evidence/hanteoAlbumAdapter';
import {
  buildHanteoAlbumRequestPlan,
  decodeHanteoAlbumResponse,
} from '../../alternative-evidence/hanteoAlbumDiscovery';

export const ALBUM_PROVIDER_EXECUTOR_BINDING_VERSION = 'album-provider-executor-binding-v1' as const;

export type CircleRetailFixturePacket = Readonly<{
  provider: 'circle-retail';
  timeframe: AlbumCollectorPlannedRequest['timeframe'];
  rawResponse: unknown;
  observedAt: string;
  collectedAt: string;
  requestParams: Readonly<Record<string, string>>;
  endpointEvidenceIds: readonly string[];
  quantityEvidenceIds: readonly string[];
  resolveIdentity: CircleRetailIdentityResolver;
}>;

export type HanteoFixturePacket = Readonly<{
  provider: 'hanteo';
  timeframe: 'day' | 'week' | 'month';
  rawResponse: unknown;
  observedAt: string;
  collectedAt: string;
  limit?: number;
  quantityEvidenceId: string;
  resolveIdentity: HanteoAlbumIdentityResolver;
}>;

export type AlbumProviderFixturePacket = CircleRetailFixturePacket | HanteoFixturePacket;

export type AlbumProviderPacketExecutionOptions = Readonly<{
  syntheticFixture: boolean;
  circleDescriptor?: DirectAlbumProviderDescriptor;
  hanteoDescriptor?: DirectAlbumProviderDescriptor;
}>;

function result(
  status: AlbumBoundedResearchExecutorResult['status'],
  input: Readonly<{
    httpStatus?: number;
    providerResultCode?: string | number | null;
    rowCount?: number | null;
    payloadDigest?: string | null;
    evidenceIds?: readonly string[];
  }> = {},
): AlbumBoundedResearchExecutorResult {
  return Object.freeze({ status, ...input });
}

function compactDate(value: string): string | null {
  if (!/^\d{8}$/.test(value)) return null;
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
}

function circlePacketMatchesRequest(
  request: AlbumCollectorPlannedRequest,
  packet: CircleRetailFixturePacket,
): boolean {
  if (request.provider !== 'circle-retail' || request.timeframe !== packet.timeframe) return false;
  const expectedEndpoint = request.timeframe === 'hour'
    ? '/data/api/chart/retail_hour'
    : '/data/api/chart/retail_list';
  return request.requestContract.method === 'POST' && request.requestContract.endpoint === expectedEndpoint;
}

function circleFailure(error: unknown): AlbumBoundedResearchExecutorResult {
  const message = error instanceof Error ? error.message : String(error);
  if (/quantity|rowSum|row_path/i.test(message)) return result('quantity-field-missing');
  if (/shape|schema|payload_digest|request_contract|period_invalid/i.test(message)) return result('schema-drift');
  return result('provider-semantic-conflict');
}

function rejectionStatus(rejections: readonly Readonly<{ reasons: readonly string[] }>[]): AlbumBoundedResearchExecutorResult['status'] | null {
  const reasons = rejections.flatMap(rejection => rejection.reasons);
  if (reasons.some(reason => reason.includes('quantity'))) return 'quantity-field-missing';
  if (reasons.some(reason => reason.includes('source-row') || reason.includes('sku-identity'))) return 'schema-drift';
  if (reasons.length > 0) return 'provider-semantic-conflict';
  return null;
}

async function executeCirclePacket(
  request: AlbumCollectorPlannedRequest,
  packet: CircleRetailFixturePacket,
  options: AlbumProviderPacketExecutionOptions,
): Promise<AlbumBoundedResearchExecutorResult> {
  if (!circlePacketMatchesRequest(request, packet)) return result('provider-semantic-conflict');
  if (packet.endpointEvidenceIds.length === 0 || packet.quantityEvidenceIds.length === 0) {
    return result('provider-semantic-conflict');
  }

  try {
    const yyyymmdd = packet.requestParams.yyyymmdd ?? '';
    const isHour = request.timeframe === 'hour';
    const date = isHour || request.timeframe === 'day' ? compactDate(yyyymmdd) : null;
    if ((isHour || request.timeframe === 'day') && !date) return result('schema-drift');

    const thisHour = isHour ? Number(packet.requestParams.thisHour) : null;
    if (isHour && (!Number.isInteger(thisHour) || thisHour! < 0 || thisHour! > 23)) {
      return result('schema-drift');
    }

    const discoveryPlan = buildCircleRetailDiscoveryRequestPlan({
      timeframe: request.timeframe,
      date,
      hour: isHour ? thisHour : null,
      providerPeriodKey: isHour
        ? `${yyyymmdd}-${String(thisHour).padStart(2, '0')}`
        : yyyymmdd || null,
      candidate: {
        kind: isHour ? 'retail-hour' : 'retail-list',
        params: packet.requestParams,
      },
    });
    const verifiedPlan = verifyCircleRetailCandidateEndpoint(discoveryPlan, packet.endpointEvidenceIds);
    const capture = captureCircleRetailDiscovery({
      plan: verifiedPlan,
      rawResponse: packet.rawResponse,
      status: 200,
      contentType: 'application/json',
      observedAt: packet.observedAt,
    });

    if (capture.schemaState !== 'structured-response') return result('schema-drift');
    if (capture.response.providerStatus !== 'OK') {
      return result('provider-semantic-conflict', { providerResultCode: capture.response.providerStatus });
    }

    const qualifiedCapture = verifyCircleRetailQuantitySemantic(capture, {
      quantitySemanticState: 'verified-retail-copies',
      quantityField: 'rowSum',
      rowPath: '$.List{values}',
      evidenceIds: packet.quantityEvidenceIds,
    });

    const adapted = adaptCircleRetailQualifiedResponse({
      capture: qualifiedCapture,
      rawResponse: packet.rawResponse,
      collectedAt: packet.collectedAt,
      resolveIdentity: packet.resolveIdentity,
      syntheticFixture: options.syntheticFixture,
    });

    const rejectedAs = rejectionStatus(adapted.rejections);
    if (rejectedAs) return result(rejectedAs, { payloadDigest: qualifiedCapture.payloadDigest });
    if (adapted.observations.length === 0) {
      return result('provider-semantic-conflict', { payloadDigest: qualifiedCapture.payloadDigest });
    }

    const validation = validateCircleRetailNormalizedObservations(
      adapted.observations,
      options.circleDescriptor,
    );
    if (!validation.valid) {
      return result('provider-semantic-conflict', {
        payloadDigest: qualifiedCapture.payloadDigest,
        evidenceIds: validation.issues,
      });
    }

    return result('ok', {
      httpStatus: 200,
      providerResultCode: 'OK',
      rowCount: adapted.observations.length,
      payloadDigest: qualifiedCapture.payloadDigest,
      evidenceIds: packet.quantityEvidenceIds,
    });
  } catch (error) {
    return circleFailure(error);
  }
}

function hanteoPacketMatchesRequest(
  request: AlbumCollectorPlannedRequest,
  packet: HanteoFixturePacket,
): boolean {
  return request.provider === 'hanteo'
    && request.timeframe === packet.timeframe
    && request.periodMode === 'current'
    && request.requestContract.method === 'GET';
}

function hanteoRawQuantityPresent(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const resultData = (raw as Record<string, unknown>).resultData;
  if (!resultData || typeof resultData !== 'object' || Array.isArray(resultData)) return false;
  const list = (resultData as Record<string, unknown>).list;
  if (!Array.isArray(list) || list.length === 0) return false;
  return list.every(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
    const detail = (row as Record<string, unknown>).detail;
    if (!detail || typeof detail !== 'object' || Array.isArray(detail)) return false;
    const salesVolume = (detail as Record<string, unknown>).salesVolume;
    const number = typeof salesVolume === 'number' ? salesVolume : Number(salesVolume);
    return Number.isSafeInteger(number) && number >= 0;
  });
}

async function executeHanteoPacket(
  request: AlbumCollectorPlannedRequest,
  packet: HanteoFixturePacket,
  options: AlbumProviderPacketExecutionOptions,
): Promise<AlbumBoundedResearchExecutorResult> {
  if (!hanteoPacketMatchesRequest(request, packet)) return result('provider-semantic-conflict');
  if (!packet.quantityEvidenceId.trim()) return result('provider-semantic-conflict');

  try {
    const providerPlan = buildHanteoAlbumRequestPlan({
      timeframe: packet.timeframe,
      limit: packet.limit ?? 20,
      mode: 'current',
    });
    if (providerPlan.endpointPath !== request.requestContract.endpoint) {
      return result('provider-semantic-conflict');
    }

    const decoded = decodeHanteoAlbumResponse(packet.rawResponse);
    if (decoded.responseState === 'schema-invalid') {
      return result('schema-drift', { payloadDigest: decoded.rawDigest });
    }
    if (decoded.responseState === 'provider-error') {
      return result('provider-semantic-conflict', {
        providerResultCode: decoded.providerCode,
        payloadDigest: decoded.rawDigest,
      });
    }
    if (!hanteoRawQuantityPresent(packet.rawResponse)) {
      return result('quantity-field-missing', { payloadDigest: decoded.rawDigest });
    }

    const adapted = adaptHanteoCurrentAlbumResponse({
      decoded,
      timeframe: packet.timeframe,
      observedAt: packet.observedAt,
      collectedAt: packet.collectedAt,
      quantityEvidenceId: packet.quantityEvidenceId,
      resolveIdentity: packet.resolveIdentity,
      syntheticFixture: options.syntheticFixture,
    });

    const rejectedAs = rejectionStatus(adapted.rejections);
    if (rejectedAs) return result(rejectedAs, { payloadDigest: decoded.rawDigest });
    if (adapted.observations.length === 0) {
      return result('provider-semantic-conflict', { payloadDigest: decoded.rawDigest });
    }

    const validation = validateHanteoCurrentObservations(
      adapted.observations,
      options.hanteoDescriptor,
    );
    if (!validation.valid) {
      return result('provider-semantic-conflict', {
        payloadDigest: decoded.rawDigest,
        evidenceIds: validation.issues,
      });
    }

    return result('ok', {
      httpStatus: 200,
      providerResultCode: decoded.providerCode,
      rowCount: adapted.observations.length,
      payloadDigest: decoded.rawDigest,
      evidenceIds: Object.freeze([packet.quantityEvidenceId]),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/sales-volume|quantity/i.test(message)) return result('quantity-field-missing');
    if (/schema|response-not-success/i.test(message)) return result('schema-drift');
    return result('provider-semantic-conflict');
  }
}

export async function executeAlbumProviderPacket(
  request: AlbumCollectorPlannedRequest,
  packet: AlbumProviderFixturePacket,
  options: AlbumProviderPacketExecutionOptions,
): Promise<AlbumBoundedResearchExecutorResult> {
  if (packet.provider !== request.provider) return result('provider-semantic-conflict');
  return packet.provider === 'circle-retail'
    ? executeCirclePacket(request, packet, options)
    : executeHanteoPacket(request, packet, options);
}

export function createAlbumProviderFixtureExecutor(
  packets: readonly AlbumProviderFixturePacket[],
): AlbumBoundedResearchExecutor {
  const queue = [...packets];
  let cursor = 0;

  return Object.freeze({
    kind: 'fixture' as const,
    async execute(request: AlbumCollectorPlannedRequest): Promise<AlbumBoundedResearchExecutorResult> {
      const packet = queue[cursor++];
      if (!packet) return result('provider-semantic-conflict');
      return executeAlbumProviderPacket(request, packet, { syntheticFixture: true });
    },
  });
}

export function providerFixturePacketCountByProvider(
  packets: readonly AlbumProviderFixturePacket[],
): Readonly<Record<AlbumCollectorProvider, number>> {
  return Object.freeze({
    'circle-retail': packets.filter(packet => packet.provider === 'circle-retail').length,
    hanteo: packets.filter(packet => packet.provider === 'hanteo').length,
  });
}
