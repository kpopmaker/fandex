import { sha256Canonical } from '../../shared/canonicalDigest';
import {
  CIRCLE_PROVIDER_DESCRIPTOR,
  HANTEO_PROVIDER_DESCRIPTOR,
  knownCapability,
  type DirectAlbumProviderDescriptor,
} from '../../alternative-evidence/directAlbumProvider';
import type {
  AlbumCollectorPlan,
  AlbumCollectorPlannedRequest,
  AlbumCollectorProvider,
} from './albumCollectorPlan';
import {
  runAlbumBoundedResearch,
  type AlbumBoundedResearchAuthorization,
  type AlbumBoundedResearchExecutor,
  type AlbumBoundedResearchExecutorResult,
  type AlbumBoundedResearchReport,
} from './albumBoundedResearchOrchestrator';
import {
  executeAlbumProviderPacket,
  type CircleRetailFixturePacket,
  type HanteoFixturePacket,
} from './albumProviderExecutorBinding';

export const ALBUM_ONE_SHOT_NETWORK_GATE_VERSION = 'album-one-shot-network-gate-v1' as const;
export const ALBUM_ONE_SHOT_NETWORK_GRANT_VERSION = 'album-one-shot-network-grant-v1' as const;
export const ALBUM_ONE_SHOT_MAX_REQUESTS = 2 as const;
export const ALBUM_ONE_SHOT_MAX_TTL_MS = 15 * 60 * 1000;
export const ALBUM_ONE_SHOT_HTTP_TIMEOUT_MS = 10_000;

export type AlbumOneShotNetworkGrant = Readonly<{
  grantVersion: typeof ALBUM_ONE_SHOT_NETWORK_GRANT_VERSION;
  planDigest: string;
  providerSequence: readonly AlbumCollectorProvider[];
  maxRequests: number;
  issuedAt: string;
  expiresAt: string;
  authorizationEvidenceIds: readonly string[];
  singleUseScope: 'process-local';
  grantDigest: string;
}>;

export type CircleOneShotNetworkBinding = Readonly<Omit<
  CircleRetailFixturePacket,
  'rawResponse' | 'observedAt' | 'collectedAt'
>>;

export type HanteoOneShotNetworkBinding = Readonly<Omit<
  HanteoFixturePacket,
  'rawResponse' | 'observedAt' | 'collectedAt'
>>;

export type AlbumOneShotNetworkBinding = CircleOneShotNetworkBinding | HanteoOneShotNetworkBinding;

export type AlbumOneShotTransportRequest = Readonly<{
  provider: AlbumCollectorProvider;
  method: 'GET' | 'POST';
  url: string;
  headers: Readonly<Record<string, string>>;
  body: string | null;
  timeoutMs: number;
}>;

export type AlbumOneShotTransportResponse = Readonly<{
  status: number;
  headers: Readonly<Record<string, string>>;
  rawBody: unknown;
}>;

export type AlbumOneShotNetworkTransport = Readonly<{
  send(request: AlbumOneShotTransportRequest): Promise<AlbumOneShotTransportResponse>;
}>;

export type AlbumOneShotNetworkRunResult = Readonly<{
  gateVersion: typeof ALBUM_ONE_SHOT_NETWORK_GATE_VERSION;
  grantDigest: string;
  report: AlbumBoundedResearchReport;
  persistenceAuthorized: false;
  scheduleMutationAuthorized: false;
  environmentMutationAuthorized: false;
  publicationAuthorized: false;
}>;

const CONSUMED_GRANTS = new Set<string>();

const CIRCLE_ONE_SHOT_DESCRIPTOR: DirectAlbumProviderDescriptor = Object.freeze({
  ...CIRCLE_PROVIDER_DESCRIPTOR,
  capabilities: Object.freeze({
    ...CIRCLE_PROVIDER_DESCRIPTOR.capabilities,
    supportsNativePeriodSales: knownCapability('true', [
      'circle-retail-direct-response-v1:rowSum-period-sales',
    ]),
  }),
});

const HANTEO_ONE_SHOT_DESCRIPTOR: DirectAlbumProviderDescriptor = Object.freeze({
  ...HANTEO_PROVIDER_DESCRIPTOR,
  capabilities: Object.freeze({
    ...HANTEO_PROVIDER_DESCRIPTOR.capabilities,
    supportsNativePeriodSales: knownCapability('true', [
      'hanteo-direct-response-v1:current-day-week-month-salesVolume',
    ]),
    supportsArtistIdentity: knownCapability('true', [
      'hanteo-direct-response-v1:artistIdx-provider-identity',
    ]),
  }),
});

function isoInstant(value: string, errorCode: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error(errorCode);
  return date.toISOString();
}

function grantDigestInput(grant: Omit<AlbumOneShotNetworkGrant, 'grantDigest'>) {
  return {
    grantVersion: grant.grantVersion,
    planDigest: grant.planDigest,
    providerSequence: grant.providerSequence,
    maxRequests: grant.maxRequests,
    issuedAt: grant.issuedAt,
    expiresAt: grant.expiresAt,
    authorizationEvidenceIds: grant.authorizationEvidenceIds,
    singleUseScope: grant.singleUseScope,
  };
}

export function createAlbumOneShotNetworkGrant(input: Readonly<{
  plan: AlbumCollectorPlan;
  issuedAt: string;
  expiresAt: string;
  authorizationEvidenceIds: readonly string[];
}>): AlbumOneShotNetworkGrant {
  if (input.plan.requests.length < 1 || input.plan.requests.length > ALBUM_ONE_SHOT_MAX_REQUESTS) {
    throw new Error('album_one_shot_request_count_invalid');
  }
  if (input.authorizationEvidenceIds.length === 0 || input.authorizationEvidenceIds.some(id => !id.trim())) {
    throw new Error('album_one_shot_authorization_evidence_required');
  }
  const issuedAt = isoInstant(input.issuedAt, 'album_one_shot_issued_at_invalid');
  const expiresAt = isoInstant(input.expiresAt, 'album_one_shot_expires_at_invalid');
  const issuedMs = Date.parse(issuedAt);
  const expiresMs = Date.parse(expiresAt);
  if (expiresMs <= issuedMs || expiresMs - issuedMs > ALBUM_ONE_SHOT_MAX_TTL_MS) {
    throw new Error('album_one_shot_ttl_invalid');
  }

  const base = Object.freeze({
    grantVersion: ALBUM_ONE_SHOT_NETWORK_GRANT_VERSION,
    planDigest: input.plan.planDigest,
    providerSequence: Object.freeze(input.plan.requests.map(request => request.provider)),
    maxRequests: input.plan.requests.length,
    issuedAt,
    expiresAt,
    authorizationEvidenceIds: Object.freeze([...input.authorizationEvidenceIds]),
    singleUseScope: 'process-local' as const,
  });
  return Object.freeze({
    ...base,
    grantDigest: sha256Canonical(grantDigestInput(base)),
  });
}

function validateGrant(plan: AlbumCollectorPlan, grant: AlbumOneShotNetworkGrant, nowMs: number): void {
  if (grant.grantVersion !== ALBUM_ONE_SHOT_NETWORK_GRANT_VERSION) {
    throw new Error('album_one_shot_grant_version_invalid');
  }
  if (grant.planDigest !== plan.planDigest) throw new Error('album_one_shot_plan_digest_mismatch');
  if (grant.maxRequests !== plan.requests.length || grant.maxRequests > ALBUM_ONE_SHOT_MAX_REQUESTS) {
    throw new Error('album_one_shot_grant_request_budget_mismatch');
  }
  if (grant.providerSequence.length !== plan.requests.length
    || grant.providerSequence.some((provider, index) => provider !== plan.requests[index].provider)) {
    throw new Error('album_one_shot_provider_sequence_mismatch');
  }
  const expected = sha256Canonical(grantDigestInput({
    grantVersion: grant.grantVersion,
    planDigest: grant.planDigest,
    providerSequence: grant.providerSequence,
    maxRequests: grant.maxRequests,
    issuedAt: grant.issuedAt,
    expiresAt: grant.expiresAt,
    authorizationEvidenceIds: grant.authorizationEvidenceIds,
    singleUseScope: grant.singleUseScope,
  }));
  if (expected !== grant.grantDigest) throw new Error('album_one_shot_grant_digest_invalid');
  if (nowMs < Date.parse(grant.issuedAt)) throw new Error('album_one_shot_grant_not_yet_valid');
  if (nowMs >= Date.parse(grant.expiresAt)) throw new Error('album_one_shot_grant_expired');
  if (CONSUMED_GRANTS.has(grant.grantDigest)) throw new Error('album_one_shot_grant_already_consumed');
}

function assertBindingMatchesRequest(
  request: AlbumCollectorPlannedRequest,
  binding: AlbumOneShotNetworkBinding,
): void {
  if (binding.provider !== request.provider) throw new Error('album_one_shot_binding_provider_mismatch');
  if (binding.timeframe !== request.timeframe) throw new Error('album_one_shot_binding_timeframe_mismatch');
}

function buildCircleTransportRequest(
  request: AlbumCollectorPlannedRequest,
  binding: CircleOneShotNetworkBinding,
): AlbumOneShotTransportRequest {
  if (request.requestContract.method !== 'POST') throw new Error('album_one_shot_circle_method_mismatch');
  const required = request.requestContract.parameterNames;
  const keys = Object.keys(binding.requestParams);
  if (required.some(name => !binding.requestParams[name]?.trim())) {
    throw new Error('album_one_shot_circle_required_param_missing');
  }
  if (keys.some(key => !required.includes(key))) throw new Error('album_one_shot_circle_unexpected_param');
  if (request.timeframe !== 'hour' && binding.requestParams.termGbn !== request.timeframe) {
    throw new Error('album_one_shot_circle_term_mismatch');
  }
  if (request.periodMode === 'historical' && request.providerPeriodKey
    && binding.requestParams.yyyymmdd !== request.providerPeriodKey) {
    throw new Error('album_one_shot_circle_historical_period_mismatch');
  }
  const body = new URLSearchParams();
  for (const name of required) body.set(name, binding.requestParams[name]);
  return Object.freeze({
    provider: 'circle-retail' as const,
    method: 'POST' as const,
    url: `https://circlechart.kr${request.requestContract.endpoint}`,
    headers: Object.freeze({
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
    }),
    body: body.toString(),
    timeoutMs: ALBUM_ONE_SHOT_HTTP_TIMEOUT_MS,
  });
}

function buildHanteoTransportRequest(
  request: AlbumCollectorPlannedRequest,
  binding: HanteoOneShotNetworkBinding,
): AlbumOneShotTransportRequest {
  if (request.requestContract.method !== 'GET') throw new Error('album_one_shot_hanteo_method_mismatch');
  const limit = binding.limit;
  if (!Number.isInteger(limit) || limit! < 1 || limit! > 100) {
    throw new Error('album_one_shot_hanteo_limit_invalid');
  }
  return Object.freeze({
    provider: 'hanteo' as const,
    method: 'GET' as const,
    url: `https://api.hanteochart.io${request.requestContract.endpoint}?limit=${encodeURIComponent(String(limit))}`,
    headers: Object.freeze({ accept: 'application/json' }),
    body: null,
    timeoutMs: ALBUM_ONE_SHOT_HTTP_TIMEOUT_MS,
  });
}

function buildTransportRequest(
  request: AlbumCollectorPlannedRequest,
  binding: AlbumOneShotNetworkBinding,
): AlbumOneShotTransportRequest {
  assertBindingMatchesRequest(request, binding);
  return binding.provider === 'circle-retail'
    ? buildCircleTransportRequest(request, binding)
    : buildHanteoTransportRequest(request, binding);
}

function enabledProviders(plan: AlbumCollectorPlan): Readonly<Record<AlbumCollectorProvider, boolean>> {
  return Object.freeze({
    'circle-retail': plan.requests.some(request => request.provider === 'circle-retail'),
    hanteo: plan.requests.some(request => request.provider === 'hanteo'),
  });
}

function liveAuthorization(plan: AlbumCollectorPlan, grant: AlbumOneShotNetworkGrant): AlbumBoundedResearchAuthorization {
  return Object.freeze({
    boundedResearchImplementationAuthorized: true,
    fixtureExecutionAuthorized: false,
    liveNetworkExecutionAuthorized: true,
    liveNetworkGrantDigest: grant.grantDigest,
    globalEnabled: true,
    providerEnabled: enabledProviders(plan),
    persistenceAuthorized: false,
    scheduleMutationAuthorized: false,
    environmentMutationAuthorized: false,
  });
}

function payloadDigest(rawBody: unknown): string {
  return sha256Canonical(rawBody);
}

function createOneShotExecutor(input: Readonly<{
  grant: AlbumOneShotNetworkGrant;
  bindings: readonly AlbumOneShotNetworkBinding[];
  transport: AlbumOneShotNetworkTransport;
  nowMs: () => number;
  sleep: (ms: number) => Promise<void>;
}>): AlbumBoundedResearchExecutor {
  let cursor = 0;
  let lastRequestStartedAt: number | null = null;

  return Object.freeze({
    kind: 'live-network' as const,
    authorizationDigest: input.grant.grantDigest,
    async execute(request): Promise<AlbumBoundedResearchExecutorResult> {
      if (cursor >= input.grant.maxRequests) throw new Error('album_one_shot_executor_budget_exhausted');
      const binding = input.bindings[cursor];
      if (!binding) throw new Error('album_one_shot_binding_missing');
      const spec = buildTransportRequest(request, binding);

      if (lastRequestStartedAt !== null) {
        const elapsed = input.nowMs() - lastRequestStartedAt;
        const waitMs = Math.max(0, request.throttling.minimumIntervalMs - elapsed);
        if (waitMs > 0) await input.sleep(waitMs);
      }
      lastRequestStartedAt = input.nowMs();
      cursor += 1;

      const response = await input.transport.send(spec);
      if (!Number.isInteger(response.status) || response.status < 100 || response.status > 599) {
        return Object.freeze({ status: 'schema-drift' as const });
      }
      if (response.status < 200 || response.status >= 300) {
        return Object.freeze({
          status: 'http-error' as const,
          httpStatus: response.status,
          payloadDigest: payloadDigest(response.rawBody),
        });
      }

      const instant = new Date(input.nowMs()).toISOString();
      const packet = binding.provider === 'circle-retail'
        ? Object.freeze({
            ...binding,
            rawResponse: response.rawBody,
            observedAt: instant,
            collectedAt: instant,
          }) as CircleRetailFixturePacket
        : Object.freeze({
            ...binding,
            rawResponse: response.rawBody,
            observedAt: instant,
            collectedAt: instant,
          }) as HanteoFixturePacket;

      const normalized = await executeAlbumProviderPacket(request, packet, {
        syntheticFixture: false,
        circleDescriptor: CIRCLE_ONE_SHOT_DESCRIPTOR,
        hanteoDescriptor: HANTEO_ONE_SHOT_DESCRIPTOR,
      });
      return Object.freeze({ ...normalized, httpStatus: response.status });
    },
  });
}

export const DEFAULT_ALBUM_ONE_SHOT_NETWORK_TRANSPORT: AlbumOneShotNetworkTransport = Object.freeze({
  async send(request): Promise<AlbumOneShotTransportResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), request.timeoutMs);
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        signal: controller.signal,
        redirect: 'error',
      });
      const text = await response.text();
      let rawBody: unknown = text;
      try {
        rawBody = text === '' ? null : JSON.parse(text);
      } catch {
        rawBody = text;
      }
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });
      return Object.freeze({
        status: response.status,
        headers: Object.freeze(headers),
        rawBody,
      });
    } finally {
      clearTimeout(timeout);
    }
  },
});

export async function runAlbumOneShotNetworkResearch(input: Readonly<{
  plan: AlbumCollectorPlan;
  grant: AlbumOneShotNetworkGrant;
  bindings: readonly AlbumOneShotNetworkBinding[];
  transport?: AlbumOneShotNetworkTransport;
  nowMs?: () => number;
  sleep?: (ms: number) => Promise<void>;
}>): Promise<AlbumOneShotNetworkRunResult> {
  const nowMs = input.nowMs ?? (() => Date.now());
  const sleep = input.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  validateGrant(input.plan, input.grant, nowMs());
  if (input.bindings.length !== input.plan.requests.length) {
    throw new Error('album_one_shot_binding_count_mismatch');
  }
  input.plan.requests.forEach((request, index) => assertBindingMatchesRequest(request, input.bindings[index]));

  CONSUMED_GRANTS.add(input.grant.grantDigest);
  const executor = createOneShotExecutor({
    grant: input.grant,
    bindings: input.bindings,
    transport: input.transport ?? DEFAULT_ALBUM_ONE_SHOT_NETWORK_TRANSPORT,
    nowMs,
    sleep,
  });
  const report = await runAlbumBoundedResearch({
    plan: input.plan,
    executor,
    authorization: liveAuthorization(input.plan, input.grant),
    maxRequests: input.grant.maxRequests,
  });

  return Object.freeze({
    gateVersion: ALBUM_ONE_SHOT_NETWORK_GATE_VERSION,
    grantDigest: input.grant.grantDigest,
    report,
    persistenceAuthorized: false as const,
    scheduleMutationAuthorized: false as const,
    environmentMutationAuthorized: false as const,
    publicationAuthorized: false as const,
  });
}
