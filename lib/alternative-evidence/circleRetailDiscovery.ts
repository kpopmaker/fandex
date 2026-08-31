import { sha256Canonical } from '../shared/canonicalDigest';

export const CIRCLE_RETAIL_DISCOVERY_CONTRACT_VERSION = 'circle-retail-discovery-v1' as const;
export const CIRCLE_RETAIL_PUBLIC_PAGE_URL = 'https://circlechart.kr/page_chart/retail.circle' as const;

export type CircleRetailDiscoveryTimeframe = 'hour' | 'day' | 'week' | 'month' | 'year';
export type CircleRetailCandidateEvidenceState = 'reported-public-unverified' | 'verified-public-endpoint';
export type CircleRetailDiscoverySchemaState =
  | 'unverified'
  | 'structured-response'
  | 'html-response'
  | 'empty-response'
  | 'invalid-response'
  | 'schema-changed';
export type CircleRetailQuantitySemanticState = 'unverified' | 'verified-retail-copies';
export type CircleRetailDiscoveryMissingState =
  | 'response-present'
  | 'response-empty'
  | 'period-not-published'
  | 'fetch-failed'
  | 'schema-invalid';

export type CircleRetailDiscoveryPeriod = Readonly<{
  date: string | null;
  hour: number | null;
  providerPeriodKey: string | null;
}>;

export type CircleRetailDiscoveryCandidate = Readonly<{
  method: 'GET' | 'POST';
  url: string;
  params: Readonly<Record<string, string>>;
  evidenceState: CircleRetailCandidateEvidenceState;
  evidenceIds: readonly string[];
}>;

export type CircleRetailDiscoveryRequestPlan = Readonly<{
  contractVersion: typeof CIRCLE_RETAIL_DISCOVERY_CONTRACT_VERSION;
  providerId: 'circle-chart';
  timeframe: CircleRetailDiscoveryTimeframe;
  period: CircleRetailDiscoveryPeriod;
  publicPageUrl: typeof CIRCLE_RETAIL_PUBLIC_PAGE_URL;
  candidate: CircleRetailDiscoveryCandidate | null;
  networkAllowed: false;
  planDigest: string;
}>;

export type CircleRetailDiscoveryResponseSummary = Readonly<{
  status: number | null;
  contentType: string | null;
  rootType: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null' | 'unknown';
  rootKeys: readonly string[];
  rowPath: string | null;
  rowCount: number | null;
  sampleRowKeys: readonly string[];
  quantityCandidateFields: readonly string[];
  identityCandidateFields: readonly string[];
}>;

export type CircleRetailDiscoveryCapture = Readonly<{
  contractVersion: typeof CIRCLE_RETAIL_DISCOVERY_CONTRACT_VERSION;
  providerId: 'circle-chart';
  request: Readonly<{
    method: 'GET' | 'POST' | null;
    url: string;
    params: Readonly<Record<string, string>>;
  }>;
  response: CircleRetailDiscoveryResponseSummary;
  observedAt: string;
  payloadDigest: string;
  responseDigest: string;
  schemaState: CircleRetailDiscoverySchemaState;
  missingState: CircleRetailDiscoveryMissingState;
  quantitySemanticState: CircleRetailQuantitySemanticState;
  verifiedQuantityField: string | null;
  verifiedRowPath: string | null;
  quantityVerificationEvidenceIds: readonly string[];
}>;

export type CircleRetailQuantityVerification = Readonly<{
  quantitySemanticState: 'verified-retail-copies';
  quantityField: string;
  rowPath: string;
  evidenceIds: readonly string[];
}>;

const CANDIDATE_URLS: Readonly<Record<'default-value' | 'hour-time', string>> = Object.freeze({
  'default-value': '/data/api/chart_func/retail/default_value',
  'hour-time': '/data/api/chart_func/retail/hour_time',
});

function assertIsoDate(value: string | null): void {
  if (value !== null && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('circle_retail_discovery_date_invalid');
  }
}

function assertPeriodInput(timeframe: CircleRetailDiscoveryTimeframe, period: CircleRetailDiscoveryPeriod): void {
  assertIsoDate(period.date);
  if (period.providerPeriodKey !== null && period.providerPeriodKey.trim() === '') {
    throw new Error('circle_retail_discovery_provider_period_key_invalid');
  }
  if (period.hour !== null && (!Number.isInteger(period.hour) || period.hour < 0 || period.hour > 23)) {
    throw new Error('circle_retail_discovery_hour_invalid');
  }
  if (timeframe === 'hour' && (period.date === null || period.hour === null)) {
    throw new Error('circle_retail_discovery_hour_period_incomplete');
  }
  if (timeframe !== 'hour' && period.hour !== null) {
    throw new Error('circle_retail_discovery_hour_only_for_hour_timeframe');
  }
  if (timeframe === 'day' && period.date === null) {
    throw new Error('circle_retail_discovery_day_date_required');
  }
}

export function buildCircleRetailDiscoveryRequestPlan(input: Readonly<{
  timeframe: CircleRetailDiscoveryTimeframe;
  date?: string | null;
  hour?: number | null;
  providerPeriodKey?: string | null;
  candidate?: Readonly<{
    kind: 'default-value' | 'hour-time';
    method?: 'GET' | 'POST';
    params?: Readonly<Record<string, string>>;
  }> | null;
}>): CircleRetailDiscoveryRequestPlan {
  const period: CircleRetailDiscoveryPeriod = Object.freeze({
    date: input.date ?? null,
    hour: input.hour ?? null,
    providerPeriodKey: input.providerPeriodKey ?? null,
  });
  assertPeriodInput(input.timeframe, period);

  const candidate: CircleRetailDiscoveryCandidate | null = input.candidate
    ? Object.freeze({
        method: input.candidate.method ?? 'GET',
        url: CANDIDATE_URLS[input.candidate.kind],
        params: Object.freeze({ ...(input.candidate.params ?? {}) }),
        evidenceState: 'reported-public-unverified',
        evidenceIds: Object.freeze([]),
      })
    : null;

  const shape = {
    contractVersion: CIRCLE_RETAIL_DISCOVERY_CONTRACT_VERSION,
    providerId: 'circle-chart' as const,
    timeframe: input.timeframe,
    period,
    publicPageUrl: CIRCLE_RETAIL_PUBLIC_PAGE_URL,
    candidate,
    networkAllowed: false as const,
  };
  return Object.freeze({ ...shape, planDigest: sha256Canonical(shape) });
}

export function verifyCircleRetailCandidateEndpoint(
  plan: CircleRetailDiscoveryRequestPlan,
  evidenceIds: readonly string[],
): CircleRetailDiscoveryRequestPlan {
  if (!plan.candidate) throw new Error('circle_retail_discovery_candidate_missing');
  if (evidenceIds.length === 0) throw new Error('circle_retail_discovery_candidate_evidence_required');
  const candidate: CircleRetailDiscoveryCandidate = Object.freeze({
    ...plan.candidate,
    evidenceState: 'verified-public-endpoint',
    evidenceIds: Object.freeze([...evidenceIds]),
  });
  const shape = {
    contractVersion: plan.contractVersion,
    providerId: plan.providerId,
    timeframe: plan.timeframe,
    period: plan.period,
    publicPageUrl: plan.publicPageUrl,
    candidate,
    networkAllowed: false as const,
  };
  return Object.freeze({ ...shape, planDigest: sha256Canonical(shape) });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rootTypeOf(value: unknown): CircleRetailDiscoveryResponseSummary['rootType'] {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (isRecord(value)) return 'object';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'unknown';
}

function findRows(value: unknown): Readonly<{ rowPath: string | null; rows: readonly Record<string, unknown>[] }> {
  if (Array.isArray(value) && value.length > 0 && value.every(isRecord)) {
    return Object.freeze({ rowPath: '$', rows: Object.freeze(value) });
  }
  if (!isRecord(value)) return Object.freeze({ rowPath: null, rows: Object.freeze([]) });
  const queue: Array<{ path: string; value: unknown; depth: number }> = Object.entries(value).map(([key, child]) => ({
    path: `$.${key}`,
    value: child,
    depth: 1,
  }));
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (Array.isArray(current.value) && current.value.length > 0 && current.value.every(isRecord)) {
      return Object.freeze({ rowPath: current.path, rows: Object.freeze(current.value) });
    }
    if (current.depth < 3 && isRecord(current.value)) {
      for (const [key, child] of Object.entries(current.value)) {
        queue.push({ path: `${current.path}.${key}`, value: child, depth: current.depth + 1 });
      }
    }
  }
  return Object.freeze({ rowPath: null, rows: Object.freeze([]) });
}

function candidateFields(rows: readonly Record<string, unknown>[]): Readonly<{
  quantity: readonly string[];
  identity: readonly string[];
}> {
  if (rows.length === 0) return Object.freeze({ quantity: Object.freeze([]), identity: Object.freeze([]) });
  const sample = rows.slice(0, 5);
  const keys = [...new Set(sample.flatMap((row) => Object.keys(row)))].sort();
  return Object.freeze({
    quantity: Object.freeze(keys.filter((key) => sample.some((row) => typeof row[key] === 'number'))),
    identity: Object.freeze(keys.filter((key) => sample.some((row) => typeof row[key] === 'string'))),
  });
}

export function captureCircleRetailDiscovery(input: Readonly<{
  plan: CircleRetailDiscoveryRequestPlan;
  rawResponse: unknown;
  status?: number | null;
  contentType?: string | null;
  observedAt: string;
  fetchFailed?: boolean;
  periodNotPublished?: boolean;
}>): CircleRetailDiscoveryCapture {
  if (input.plan.contractVersion !== CIRCLE_RETAIL_DISCOVERY_CONTRACT_VERSION) {
    throw new Error('circle_retail_discovery_plan_contract_invalid');
  }
  if (Number.isNaN(Date.parse(input.observedAt))) throw new Error('circle_retail_discovery_observed_at_invalid');

  const rootType = rootTypeOf(input.rawResponse);
  const rootKeys = isRecord(input.rawResponse) ? Object.keys(input.rawResponse).sort() : [];
  const found = findRows(input.rawResponse);
  const fields = candidateFields(found.rows);
  const contentType = input.contentType ?? null;
  const html = typeof input.rawResponse === 'string'
    && (contentType?.toLowerCase().includes('text/html') || /<html[\s>]/i.test(input.rawResponse));
  const empty = input.rawResponse === null
    || input.rawResponse === ''
    || (Array.isArray(input.rawResponse) && input.rawResponse.length === 0)
    || (isRecord(input.rawResponse) && Object.keys(input.rawResponse).length === 0);

  let schemaState: CircleRetailDiscoverySchemaState = 'unverified';
  let missingState: CircleRetailDiscoveryMissingState = 'response-present';
  if (input.fetchFailed) {
    schemaState = 'invalid-response';
    missingState = 'fetch-failed';
  } else if (input.periodNotPublished) {
    schemaState = empty ? 'empty-response' : 'unverified';
    missingState = 'period-not-published';
  } else if (html) {
    schemaState = 'html-response';
    missingState = 'schema-invalid';
  } else if (empty) {
    schemaState = 'empty-response';
    missingState = 'response-empty';
  } else if (rootType === 'object' || rootType === 'array') {
    schemaState = 'structured-response';
  } else {
    schemaState = 'invalid-response';
    missingState = 'schema-invalid';
  }

  const response: CircleRetailDiscoveryResponseSummary = Object.freeze({
    status: input.status ?? null,
    contentType,
    rootType,
    rootKeys: Object.freeze(rootKeys),
    rowPath: found.rowPath,
    rowCount: found.rowPath === null ? null : found.rows.length,
    sampleRowKeys: Object.freeze(found.rows.length === 0 ? [] : Object.keys(found.rows[0]).sort()),
    quantityCandidateFields: fields.quantity,
    identityCandidateFields: fields.identity,
  });
  const request = Object.freeze({
    method: input.plan.candidate?.method ?? null,
    url: input.plan.candidate?.url ?? input.plan.publicPageUrl,
    params: Object.freeze({ ...(input.plan.candidate?.params ?? {}) }),
  });
  const payloadDigest = sha256Canonical(input.rawResponse);
  const digestShape = {
    contractVersion: CIRCLE_RETAIL_DISCOVERY_CONTRACT_VERSION,
    planDigest: input.plan.planDigest,
    request,
    response,
    observedAt: input.observedAt,
    payloadDigest,
    schemaState,
    missingState,
  };

  return Object.freeze({
    contractVersion: CIRCLE_RETAIL_DISCOVERY_CONTRACT_VERSION,
    providerId: 'circle-chart',
    request,
    response,
    observedAt: input.observedAt,
    payloadDigest,
    responseDigest: sha256Canonical(digestShape),
    schemaState,
    missingState,
    quantitySemanticState: 'unverified',
    verifiedQuantityField: null,
    verifiedRowPath: null,
    quantityVerificationEvidenceIds: Object.freeze([]),
  });
}

export function verifyCircleRetailQuantitySemantic(
  capture: CircleRetailDiscoveryCapture,
  verification: CircleRetailQuantityVerification,
): CircleRetailDiscoveryCapture {
  if (capture.schemaState !== 'structured-response' || capture.missingState !== 'response-present') {
    throw new Error('circle_retail_discovery_quantity_verification_requires_structured_response');
  }
  if (!verification.quantityField.trim() || !verification.rowPath.trim()) {
    throw new Error('circle_retail_discovery_quantity_verification_invalid');
  }
  if (verification.evidenceIds.length === 0) {
    throw new Error('circle_retail_discovery_quantity_verification_evidence_required');
  }
  if (!capture.response.quantityCandidateFields.includes(verification.quantityField)) {
    throw new Error('circle_retail_discovery_quantity_field_not_observed');
  }
  if (capture.response.rowPath !== verification.rowPath) {
    throw new Error('circle_retail_discovery_row_path_mismatch');
  }
  return Object.freeze({
    ...capture,
    quantitySemanticState: 'verified-retail-copies',
    verifiedQuantityField: verification.quantityField,
    verifiedRowPath: verification.rowPath,
    quantityVerificationEvidenceIds: Object.freeze([...verification.evidenceIds]),
  });
}

export function canPromoteCircleRetailDiscovery(capture: CircleRetailDiscoveryCapture): boolean {
  return capture.schemaState === 'structured-response'
    && capture.missingState === 'response-present'
    && capture.quantitySemanticState === 'verified-retail-copies'
    && capture.verifiedQuantityField !== null
    && capture.verifiedRowPath !== null
    && capture.quantityVerificationEvidenceIds.length > 0;
}
