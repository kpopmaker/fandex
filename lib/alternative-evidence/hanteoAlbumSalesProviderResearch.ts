export const HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_CONTRACT_VERSION =
  'hanteo-album-sales-provider-research-v1' as const;

export const HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  providerId: 'hanteo-chart' as const,
  providerName: 'Hanteo Chart' as const,
  sourceFamily: 'direct-album-provider-research' as const,
  providerSemantics: 'physical-album-sales-chart' as const,
  directProductContributionEligible: false as const,
  productScorePublished: false as const,
  productMethodologyFrozen: false as const,
  productionEligible: false as const,
  rawPayloadStorageAllowed: false as const,
  normalizedObservationStorageAllowed: false as const,
  manualSchemaProbeAllowed: true as const,
  recurringPollingAllowed: false as const,
  automaticRetryAllowed: false as const,
  databaseWriteAllowed: false as const,
  salesUnitSemanticsVerified: false as const,
  historicalQuerySemanticsVerified: false as const,
  revisionSemanticsVerified: false as const,
  acquisitionRightsState: 'review-required' as const,
  storageRightsState: 'review-required' as const,
  publicationRightsState: 'review-required' as const,
  semantics: 'one-shot-provider-schema-availability-research' as const,
});

export const HANTEO_ALBUM_WEEKLY_RESEARCH_ENDPOINT =
  'https://api.hanteochart.io/v4/ranking/list/ALBUM/WEEKLY/BASIC' as const;

export function buildHanteoAlbumWeeklyResearchUrl(limit = 1): string {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error('hanteo_album_weekly_limit_invalid');
  }
  const url = new URL(HANTEO_ALBUM_WEEKLY_RESEARCH_ENDPOINT);
  url.searchParams.set('limit', String(limit));
  return url.toString();
}

export type HanteoAlbumSchemaProbeState =
  | 'schema-observed'
  | 'provider-unavailable'
  | 'rate-limited'
  | 'access-restricted'
  | 'request-rejected'
  | 'transport-timeout'
  | 'transport-failure'
  | 'provider-data-issue';

export type HanteoAlbumSchemaProbePlan = Readonly<{
  contractVersion: typeof HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_CONTRACT_VERSION;
  method: 'GET';
  url: string;
  headers: Readonly<Record<string, string>>;
  requestCount: 1;
  automaticRetryAllowed: false;
  persistRawPayload: false;
  databaseWriteAllowed: false;
}>;

export type HanteoAlbumSchemaSummary = Readonly<{
  topLevelType: 'object' | 'array' | 'primitive';
  topLevelKeys: readonly string[];
  candidateArrayPaths: readonly string[];
  sampleObjectPath: string | null;
  sampleObjectKeys: readonly string[];
  numericLikeKeys: readonly string[];
  salesLikeKeys: readonly string[];
  salesUnitSemanticsVerified: false;
  rawPayloadRetained: false;
}>;

export type HanteoAlbumSchemaProbeResult = Readonly<{
  contractVersion: typeof HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_CONTRACT_VERSION;
  state: HanteoAlbumSchemaProbeState;
  httpStatus: number | null;
  providerCode: string | number | null;
  providerMessage: string | null;
  attemptedRequests: 1;
  retryPerformed: false;
  providerObservationPublished: false;
  productContributionPublished: false;
  databaseWrites: 0;
  rawPayloadRetained: false;
  schema: HanteoAlbumSchemaSummary | null;
  errorClass: string | null;
}>;

export interface HanteoAlbumResearchTransport {
  execute(plan: HanteoAlbumSchemaProbePlan): Promise<Readonly<{
    status: number;
    body: unknown;
  }>>;
}

const sortedUnique = (values: readonly string[]) =>
  Object.freeze([...new Set(values)].sort());

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const numericLike = (value: unknown): boolean =>
  typeof value === 'number'
  || (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value.replaceAll(',', ''))));

const SALES_KEY = /(sale|sales|qty|quantity|volume|sold|physical|count|amount)/i;

function providerMetadata(body: unknown): Readonly<{
  code: string | number | null;
  message: string | null;
  resultData: unknown;
}> {
  if (!isRecord(body)) return Object.freeze({ code: null, message: null, resultData: undefined });
  const code = typeof body.code === 'string' || typeof body.code === 'number' ? body.code : null;
  const message = typeof body.message === 'string' ? body.message : null;
  return Object.freeze({ code, message, resultData: body.resultData });
}

function providerNativeRequestError(body: unknown): Readonly<{ error: boolean; code: string | number | null; message: string | null }> {
  const metadata = providerMetadata(body);
  const numericCode = typeof metadata.code === 'number'
    ? metadata.code
    : typeof metadata.code === 'string' && /^\d+$/.test(metadata.code)
      ? Number(metadata.code)
      : null;
  const explicitError = numericCode !== null && numericCode >= 400;
  const messageError = metadata.message !== null && /\[ERROR[_\]]|ERROR_NO_PARAM|MissingServletRequestParameterException/i.test(metadata.message);
  return Object.freeze({ error: explicitError || messageError, code: metadata.code, message: metadata.message });
}

export function buildHanteoAlbumWeeklySchemaProbePlan(): HanteoAlbumSchemaProbePlan {
  return Object.freeze({
    contractVersion: HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_CONTRACT_VERSION,
    method: 'GET' as const,
    url: buildHanteoAlbumWeeklyResearchUrl(1),
    headers: Object.freeze({
      accept: 'application/json',
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': 'FANDEXResearch/0.1 (https://github.com/kpopmaker/fandex)',
    }),
    requestCount: 1 as const,
    automaticRetryAllowed: false as const,
    persistRawPayload: false as const,
    databaseWriteAllowed: false as const,
  });
}

function collectArrays(
  value: unknown,
  path: string,
  depth: number,
  out: Array<Readonly<{ path: string; value: readonly unknown[] }>>,
): void {
  if (depth > 4) return;
  if (Array.isArray(value)) {
    out.push(Object.freeze({ path, value }));
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, child] of Object.entries(value)) {
    collectArrays(child, path ? `${path}.${key}` : key, depth + 1, out);
  }
}

export function summarizeHanteoAlbumSchema(body: unknown): HanteoAlbumSchemaSummary {
  const topLevelType: HanteoAlbumSchemaSummary['topLevelType'] = Array.isArray(body)
    ? 'array'
    : isRecord(body)
      ? 'object'
      : 'primitive';
  const topLevelKeys = isRecord(body) ? sortedUnique(Object.keys(body)) : Object.freeze([] as string[]);
  const arrays: Array<Readonly<{ path: string; value: readonly unknown[] }>> = [];
  collectArrays(body, '', 0, arrays);
  const objectArray = arrays.find((entry) => entry.value.some((item) => isRecord(item))) ?? null;
  const sample = objectArray?.value.find((item) => isRecord(item));
  const sampleRecord = isRecord(sample) ? sample : null;
  const sampleObjectKeys = sampleRecord ? sortedUnique(Object.keys(sampleRecord)) : Object.freeze([] as string[]);
  const numericLikeKeys = sampleRecord
    ? sortedUnique(Object.entries(sampleRecord).filter(([, value]) => numericLike(value)).map(([key]) => key))
    : Object.freeze([] as string[]);
  const salesLikeKeys = sampleRecord
    ? sortedUnique(Object.keys(sampleRecord).filter((key) => SALES_KEY.test(key)))
    : Object.freeze([] as string[]);
  return Object.freeze({
    topLevelType,
    topLevelKeys,
    candidateArrayPaths: sortedUnique(arrays.map((entry) => entry.path || '$')),
    sampleObjectPath: objectArray?.path || null,
    sampleObjectKeys,
    numericLikeKeys,
    salesLikeKeys,
    salesUnitSemanticsVerified: false as const,
    rawPayloadRetained: false as const,
  });
}

function result(
  state: HanteoAlbumSchemaProbeState,
  httpStatus: number | null,
  schema: HanteoAlbumSchemaSummary | null,
  errorClass: string | null,
  providerCode: string | number | null = null,
  providerMessage: string | null = null,
): HanteoAlbumSchemaProbeResult {
  return Object.freeze({
    contractVersion: HANTEO_ALBUM_SALES_PROVIDER_RESEARCH_CONTRACT_VERSION,
    state,
    httpStatus,
    providerCode,
    providerMessage,
    attemptedRequests: 1 as const,
    retryPerformed: false as const,
    providerObservationPublished: false as const,
    productContributionPublished: false as const,
    databaseWrites: 0 as const,
    rawPayloadRetained: false as const,
    schema,
    errorClass,
  });
}

export async function executeHanteoAlbumWeeklySchemaProbe(
  transport: HanteoAlbumResearchTransport,
): Promise<HanteoAlbumSchemaProbeResult> {
  const plan = buildHanteoAlbumWeeklySchemaProbePlan();
  try {
    const response = await transport.execute(plan);
    const metadata = providerMetadata(response.body);
    if (response.status === 429) return result('rate-limited', response.status, null, 'http-429', metadata.code, metadata.message);
    if (response.status === 401 || response.status === 403) {
      return result('access-restricted', response.status, null, `http-${response.status}`, metadata.code, metadata.message);
    }
    if (response.status >= 500) return result('provider-unavailable', response.status, null, `http-${response.status}`, metadata.code, metadata.message);
    if (response.status < 200 || response.status >= 300) {
      return result('request-rejected', response.status, null, `http-${response.status}`, metadata.code, metadata.message);
    }
    const schema = summarizeHanteoAlbumSchema(response.body);
    const nativeError = providerNativeRequestError(response.body);
    if (nativeError.error) {
      return result(
        'request-rejected',
        response.status,
        schema,
        nativeError.code === null ? 'provider-request-error' : `provider-code-${String(nativeError.code)}`,
        nativeError.code,
        nativeError.message,
      );
    }
    if (schema.topLevelType === 'primitive') {
      return result('provider-data-issue', response.status, schema, 'unexpected-primitive-payload', metadata.code, metadata.message);
    }
    return result('schema-observed', response.status, schema, null, metadata.code, metadata.message);
  } catch (error) {
    const name = error instanceof Error ? error.name : 'unknown-error';
    if (name === 'AbortError' || name === 'TimeoutError') {
      return result('transport-timeout', null, null, name);
    }
    return result('transport-failure', null, null, name);
  }
}
