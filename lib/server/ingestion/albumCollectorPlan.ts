import { sha256Canonical } from '../../shared/canonicalDigest';

export const ALBUM_COLLECTOR_PLAN_VERSION = 'album-collector-plan-v1' as const;
export const ALBUM_COLLECTOR_CONTRACT_VERSION = 'album-production-collector-contract-v1' as const;

export type AlbumCollectorProvider = 'circle-retail' | 'hanteo';
export type AlbumCollectorProviderSelection = 'primary' | 'secondary' | 'both';
export type AlbumCollectorTimeframe = 'hour' | 'day' | 'week' | 'month' | 'year';
export type AlbumCollectorPeriodMode = 'current' | 'historical';

export type AlbumCollectorPlanInput = Readonly<{
  providerSelection?: AlbumCollectorProviderSelection;
  timeframe: AlbumCollectorTimeframe;
  periodMode?: AlbumCollectorPeriodMode;
  providerPeriodKey?: string;
  at: string | Date;
}>;

export type AlbumCollectorPlannedRequest = Readonly<{
  provider: AlbumCollectorProvider;
  providerRole: 'primary' | 'secondary-verification';
  timeframe: AlbumCollectorTimeframe;
  periodMode: AlbumCollectorPeriodMode;
  providerPeriodKey: string | null;
  requestContract: Readonly<{
    method: 'GET' | 'POST';
    endpoint: string;
    parameterNames: readonly string[];
  }>;
  quantityContract: Readonly<{
    field: string;
    semantic: 'period-sale';
    unit: 'physical-units';
    forbiddenFallbacks: readonly string[];
  }>;
  throttling: Readonly<{
    maxConcurrency: 1;
    minimumIntervalMs: 3000;
    providerHardLimit: 'unknown';
  }>;
  executionAuthorized: false;
}>;

export type AlbumCollectorPlan = Readonly<{
  plannerVersion: typeof ALBUM_COLLECTOR_PLAN_VERSION;
  collectorContractVersion: typeof ALBUM_COLLECTOR_CONTRACT_VERSION;
  runMode: 'plan-only';
  activation: 'disabled';
  generatedAt: string;
  providerSelection: AlbumCollectorProviderSelection;
  requests: readonly AlbumCollectorPlannedRequest[];
  planDigest: string;
  safety: Readonly<{
    globalKillSwitchDefault: false;
    circleKillSwitchDefault: false;
    hanteoKillSwitchDefault: false;
    productionRuntimeCollectionAuthorized: false;
    productionPersistenceAuthorized: false;
    productionPublicationAuthorized: false;
  }>;
  effects: Readonly<{
    externalCalls: 0;
    databaseReads: 0;
    databaseWrites: 0;
    scheduleMutation: 0;
    environmentMutation: 0;
  }>;
}>;

const CIRCLE_TIMEFRAMES = new Set<AlbumCollectorTimeframe>(['hour', 'day', 'week', 'month', 'year']);
const HANTEO_TIMEFRAMES = new Set<AlbumCollectorTimeframe>(['day', 'week', 'month']);

function parseInstant(value: string | Date): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('album_collector_plan_time_invalid');
  return date;
}

function normalizeProviderPeriodKey(value: string | undefined): string | null {
  if (value === undefined) return null;
  if (typeof value !== 'string') throw new Error('album_collector_plan_period_key_invalid');
  const normalized = value.normalize('NFC').trim();
  if (!normalized || normalized.length > 64 || /[\u0000-\u001f]/.test(normalized)) {
    throw new Error('album_collector_plan_period_key_invalid');
  }
  return normalized;
}

function selectedProviders(selection: AlbumCollectorProviderSelection): readonly AlbumCollectorProvider[] {
  if (selection === 'primary') return Object.freeze(['circle-retail']);
  if (selection === 'secondary') return Object.freeze(['hanteo']);
  if (selection === 'both') return Object.freeze(['circle-retail', 'hanteo']);
  throw new Error('album_collector_plan_provider_selection_invalid');
}

function validatePeriodMode(mode: AlbumCollectorPeriodMode, providerPeriodKey: string | null): void {
  if (mode === 'current' && providerPeriodKey !== null) {
    throw new Error('album_collector_plan_current_period_key_forbidden');
  }
  if (mode === 'historical' && providerPeriodKey === null) {
    throw new Error('album_collector_plan_historical_period_key_required');
  }
}

function circleRequest(timeframe: AlbumCollectorTimeframe, mode: AlbumCollectorPeriodMode, providerPeriodKey: string | null): AlbumCollectorPlannedRequest {
  if (!CIRCLE_TIMEFRAMES.has(timeframe)) throw new Error('album_collector_plan_circle_timeframe_unqualified');

  const requestContract = timeframe === 'hour'
    ? Object.freeze({
        method: 'POST' as const,
        endpoint: '/data/api/chart/retail_hour',
        parameterNames: Object.freeze(['yyyymmdd', 'HourRange', 'ListType', 'thisHour']),
      })
    : Object.freeze({
        method: 'POST' as const,
        endpoint: '/data/api/chart/retail_list',
        parameterNames: Object.freeze(['termGbn', 'yyyymmdd']),
      });

  return Object.freeze({
    provider: 'circle-retail' as const,
    providerRole: 'primary' as const,
    timeframe,
    periodMode: mode,
    providerPeriodKey,
    requestContract,
    quantityContract: Object.freeze({
      field: 'rowSum',
      semantic: 'period-sale' as const,
      unit: 'physical-units' as const,
      forbiddenFallbacks: Object.freeze(['rank', 'KSum+ESum', 'index', 'missing->0']),
    }),
    throttling: Object.freeze({
      maxConcurrency: 1 as const,
      minimumIntervalMs: 3000 as const,
      providerHardLimit: 'unknown' as const,
    }),
    executionAuthorized: false as const,
  });
}

function hanteoRequest(timeframe: AlbumCollectorTimeframe, mode: AlbumCollectorPeriodMode, providerPeriodKey: string | null): AlbumCollectorPlannedRequest {
  if (!HANTEO_TIMEFRAMES.has(timeframe)) throw new Error('album_collector_plan_hanteo_timeframe_unqualified');
  if (mode === 'historical') throw new Error('album_collector_plan_hanteo_historical_exact_copies_unverified');

  const term = timeframe === 'day' ? 'DAILY' : timeframe === 'week' ? 'WEEKLY' : 'MONTHLY';

  return Object.freeze({
    provider: 'hanteo' as const,
    providerRole: 'secondary-verification' as const,
    timeframe,
    periodMode: mode,
    providerPeriodKey,
    requestContract: Object.freeze({
      method: 'GET' as const,
      endpoint: `/v4/ranking/list/ALBUM/${term}/BASIC`,
      parameterNames: Object.freeze(['limit']),
    }),
    quantityContract: Object.freeze({
      field: 'detail.salesVolume',
      semantic: 'period-sale' as const,
      unit: 'physical-units' as const,
      forbiddenFallbacks: Object.freeze(['value(Album Index)', 'rank', 'missing->0']),
    }),
    throttling: Object.freeze({
      maxConcurrency: 1 as const,
      minimumIntervalMs: 3000 as const,
      providerHardLimit: 'unknown' as const,
    }),
    executionAuthorized: false as const,
  });
}

function buildRequest(provider: AlbumCollectorProvider, timeframe: AlbumCollectorTimeframe, mode: AlbumCollectorPeriodMode, providerPeriodKey: string | null): AlbumCollectorPlannedRequest {
  return provider === 'circle-retail'
    ? circleRequest(timeframe, mode, providerPeriodKey)
    : hanteoRequest(timeframe, mode, providerPeriodKey);
}

export function buildAlbumCollectorPlan(input: AlbumCollectorPlanInput): AlbumCollectorPlan {
  const providerSelection = input.providerSelection ?? 'primary';
  const periodMode = input.periodMode ?? 'current';
  const providerPeriodKey = normalizeProviderPeriodKey(input.providerPeriodKey);
  validatePeriodMode(periodMode, providerPeriodKey);
  const generatedAt = parseInstant(input.at).toISOString();
  const providers = selectedProviders(providerSelection);
  const requests = Object.freeze(providers.map((provider) => buildRequest(provider, input.timeframe, periodMode, providerPeriodKey)));

  const digestInput = {
    plannerVersion: ALBUM_COLLECTOR_PLAN_VERSION,
    collectorContractVersion: ALBUM_COLLECTOR_CONTRACT_VERSION,
    runMode: 'plan-only',
    generatedAt,
    providerSelection,
    requests,
  };

  return Object.freeze({
    plannerVersion: ALBUM_COLLECTOR_PLAN_VERSION,
    collectorContractVersion: ALBUM_COLLECTOR_CONTRACT_VERSION,
    runMode: 'plan-only' as const,
    activation: 'disabled' as const,
    generatedAt,
    providerSelection,
    requests,
    planDigest: sha256Canonical(digestInput),
    safety: Object.freeze({
      globalKillSwitchDefault: false as const,
      circleKillSwitchDefault: false as const,
      hanteoKillSwitchDefault: false as const,
      productionRuntimeCollectionAuthorized: false as const,
      productionPersistenceAuthorized: false as const,
      productionPublicationAuthorized: false as const,
    }),
    effects: Object.freeze({
      externalCalls: 0 as const,
      databaseReads: 0 as const,
      databaseWrites: 0 as const,
      scheduleMutation: 0 as const,
      environmentMutation: 0 as const,
    }),
  });
}
