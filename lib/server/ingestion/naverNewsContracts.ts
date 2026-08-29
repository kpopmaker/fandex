import { createHash } from 'node:crypto';

export const NAVER_NEWS_INGESTION_CONTRACT_VERSION = 'v121_naver_news_ingestion_v1';
export const NAVER_NEWS_PROVIDER = 'naver-news';
export const NAVER_NEWS_JOB_MAX_ATTEMPTS = 8;
export const NAVER_NEWS_CLAIM_LEASE_SECONDS = 60;

const MAX_QUERY_BYTES = 512;
const MAX_COLLECTION_KEY_BYTES = 128;
const MAX_TITLE_BYTES = 2_048;
const MAX_DESCRIPTION_BYTES = 8_192;
const MAX_URL_BYTES = 4_096;
const MAX_DATE_BYTES = 256;
const MAX_RAW_PAYLOAD_BYTES = 24_576;
const MAX_NORMALIZED_PAYLOAD_BYTES = 16_384;
const MAX_AUDIT_PAYLOAD_BYTES = 4_096;

export type NaverNewsSort = 'date' | 'sim';

export type NaverNewsIngestionCommand = Readonly<{
  provider: typeof NAVER_NEWS_PROVIDER;
  collectionKey: string;
  query: string;
  display: number;
  start: number;
  sort: NaverNewsSort;
}>;

export type NaverNewsRequestContract = Readonly<{
  contractVersion: typeof NAVER_NEWS_INGESTION_CONTRACT_VERSION;
  provider: typeof NAVER_NEWS_PROVIDER;
  collectionKey: string;
  query: string;
  display: number;
  start: number;
  sort: NaverNewsSort;
}>;

export type NaverNewsJobIdentity = Readonly<{
  jobId: string;
  idempotencyKey: string;
  requestSha256: string;
  request: NaverNewsRequestContract;
}>;

export type NaverNewsApiItem = Readonly<{
  title?: string;
  originallink?: string;
  link?: string;
  description?: string;
  pubDate?: string;
}>;

export type NaverNewsApiResponse = Readonly<{
  lastBuildDate: string;
  total: number;
  start: number;
  display: number;
  items: readonly NaverNewsApiItem[];
}>;

export type NaverNewsCollection = Readonly<{
  fetchedAt: string;
  response: NaverNewsApiResponse;
}>;

export type NaverNewsRawPayload = Readonly<{
  title: string | null;
  originallink: string | null;
  link: string | null;
  description: string | null;
  pubDate: string | null;
}>;

export type NaverNewsRawEvidence = Readonly<{
  evidenceId: string;
  jobId: string;
  itemIndex: number;
  observedAt: string;
  rawPayload: NaverNewsRawPayload;
  rawPayloadSha256: string;
  normalizationOutcome: 'normalized' | 'duplicate' | 'rejected';
  normalizedRecordId: string | null;
  rejectionCode: 'missing_title' | 'missing_source_url' | 'invalid_published_at' | null;
}>;

export type NaverNewsNormalizedRecord = Readonly<{
  recordId: string;
  rawEvidenceId: string;
  provider: typeof NAVER_NEWS_PROVIDER;
  sourceType: 'news_article';
  sourceUrl: string;
  naverUrl: string | null;
  sourceHost: string;
  title: string;
  summary: string;
  publishedAt: string;
  collectedAt: string;
  contentSha256: string;
  recordSha256: string;
  normalizedPayload: Readonly<{
    provider: typeof NAVER_NEWS_PROVIDER;
    sourceType: 'news_article';
    sourceUrl: string;
    naverUrl: string | null;
    sourceHost: string;
    title: string;
    summary: string;
    publishedAt: string;
  }>;
}>;

export type NaverNewsAuditDescriptor = Readonly<{
  eventType: 'collection_received' | 'raw_evidence_prepared' | 'normalization_prepared' | 'job_succeeded';
  eventSha256: string;
  boundedPayload: Readonly<Record<string, string | number>>;
}>;

export type NaverNewsIngestionWritePlan = Readonly<{
  contractVersion: typeof NAVER_NEWS_INGESTION_CONTRACT_VERSION;
  identity: NaverNewsJobIdentity;
  fetchedAt: string;
  providerBuildAt: string;
  providerTotal: number;
  rawEvidence: readonly NaverNewsRawEvidence[];
  normalizedRecords: readonly NaverNewsNormalizedRecord[];
  audit: readonly NaverNewsAuditDescriptor[];
  counts: Readonly<{
    received: number;
    rawEvidence: number;
    normalizedRecords: number;
    duplicateRecords: number;
    rejectedItems: number;
  }>;
  resultSha256: string;
  planSha256: string;
}>;

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export function sha256Canonical(value: unknown): string {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

export function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function requireBoundedString(
  value: unknown,
  maximumBytes: number,
  errorCode: string,
  allowEmpty = false,
): string {
  if (typeof value !== 'string' || byteLength(value) > maximumBytes
      || (!allowEmpty && value.trim().length === 0)) {
    throw new Error(errorCode);
  }
  return value;
}

function requireInteger(value: unknown, minimum: number, maximum: number, errorCode: string): number {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) throw new Error(errorCode);
  return Number(value);
}

function normalizeWhitespace(value: string): string {
  return value.normalize('NFC').replace(/\s+/g, ' ').trim();
}

function normalizeIsoDate(value: string, errorCode: string): string {
  requireBoundedString(value, MAX_DATE_BYTES, errorCode);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(errorCode);
  return new Date(timestamp).toISOString();
}

function optionalRawString(value: unknown, maximumBytes: number): string | null {
  if (value === undefined || value === null) return null;
  return requireBoundedString(value, maximumBytes, 'naver_news_raw_item_invalid', true);
}

function decodeNumericEntity(token: string, original: string): string {
  const hexadecimal = token[0]?.toLowerCase() === 'x';
  const digits = hexadecimal ? token.slice(1) : token;
  const codePoint = Number.parseInt(digits, hexadecimal ? 16 : 10);
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff
      || (codePoint >= 0xd800 && codePoint <= 0xdfff)) return original;
  return String.fromCodePoint(codePoint);
}

export function normalizeNaverNewsText(value: string): string {
  const decoded = value
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(x?[0-9a-f]+);/gi, (original, token: string) => decodeNumericEntity(token, original));
  return normalizeWhitespace(decoded.replace(/<[^>]*>/g, ' '));
}

function normalizeHttpUrl(value: string | null): string | null {
  if (!value || value.trim().length === 0) return null;
  if (value !== value.trim() || byteLength(value) > MAX_URL_BYTES) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.hash) return null;
  return parsed.toString();
}

export function buildNaverNewsJobIdentity(command: NaverNewsIngestionCommand): NaverNewsJobIdentity {
  if (!command || typeof command !== 'object' || command.provider !== NAVER_NEWS_PROVIDER) {
    throw new Error('naver_news_command_invalid');
  }
  const collectionKey = requireBoundedString(
    command.collectionKey,
    MAX_COLLECTION_KEY_BYTES,
    'naver_news_collection_key_invalid',
  );
  if (!/^[a-z0-9][a-z0-9._:-]*$/.test(collectionKey)) throw new Error('naver_news_collection_key_invalid');
  const query = normalizeWhitespace(requireBoundedString(command.query, MAX_QUERY_BYTES, 'naver_news_query_invalid'));
  if (!query) throw new Error('naver_news_query_invalid');
  const request = Object.freeze({
    contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
    provider: NAVER_NEWS_PROVIDER,
    collectionKey,
    query,
    display: requireInteger(command.display, 1, 100, 'naver_news_display_invalid'),
    start: requireInteger(command.start, 1, 1000, 'naver_news_start_invalid'),
    sort: command.sort === 'date' || command.sort === 'sim' ? command.sort : (() => { throw new Error('naver_news_sort_invalid'); })(),
  } satisfies NaverNewsRequestContract);
  const jobId = sha256Canonical({
    contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
    provider: NAVER_NEWS_PROVIDER,
    collectionKey: request.collectionKey,
  });
  const requestSha256 = sha256Canonical(request);
  const idempotencyKey = sha256Canonical({
    contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
    jobId,
    requestSha256,
  });
  return Object.freeze({ jobId, idempotencyKey, requestSha256, request });
}

function sanitizeRawItem(item: unknown): NaverNewsRawPayload {
  if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('naver_news_raw_item_invalid');
  const row = item as Record<string, unknown>;
  return Object.freeze({
    title: optionalRawString(row.title, MAX_TITLE_BYTES),
    originallink: optionalRawString(row.originallink, MAX_URL_BYTES),
    link: optionalRawString(row.link, MAX_URL_BYTES),
    description: optionalRawString(row.description, MAX_DESCRIPTION_BYTES),
    pubDate: optionalRawString(row.pubDate, MAX_DATE_BYTES),
  });
}

function normalizeItem(
  evidenceId: string,
  raw: NaverNewsRawPayload,
  collectedAt: string,
): { record: NaverNewsNormalizedRecord | null; rejectionCode: NaverNewsRawEvidence['rejectionCode'] } {
  const title = normalizeNaverNewsText(raw.title ?? '');
  if (!title) return { record: null, rejectionCode: 'missing_title' };
  const originalUrl = normalizeHttpUrl(raw.originallink);
  const naverUrl = normalizeHttpUrl(raw.link);
  const sourceUrl = originalUrl ?? naverUrl;
  if (!sourceUrl) return { record: null, rejectionCode: 'missing_source_url' };
  let publishedAt: string;
  try {
    publishedAt = normalizeIsoDate(raw.pubDate ?? '', 'naver_news_published_at_invalid');
  } catch {
    return { record: null, rejectionCode: 'invalid_published_at' };
  }
  const summary = normalizeNaverNewsText(raw.description ?? '');
  const sourceHost = new URL(sourceUrl).hostname.toLowerCase();
  const normalizedPayload = Object.freeze({
    provider: NAVER_NEWS_PROVIDER,
    sourceType: 'news_article' as const,
    sourceUrl,
    naverUrl,
    sourceHost,
    title,
    summary,
    publishedAt,
  });
  if (byteLength(canonicalJson(normalizedPayload)) > MAX_NORMALIZED_PAYLOAD_BYTES) {
    throw new Error('naver_news_normalized_payload_too_large');
  }
  const contentSha256 = sha256Canonical({ title, summary, sourceUrl, naverUrl, publishedAt });
  const recordSha256 = sha256Canonical(normalizedPayload);
  const recordId = sha256Canonical({
    contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
    provider: NAVER_NEWS_PROVIDER,
    recordSha256,
  });
  return {
    record: Object.freeze({
      recordId,
      rawEvidenceId: evidenceId,
      provider: NAVER_NEWS_PROVIDER,
      sourceType: 'news_article',
      sourceUrl,
      naverUrl,
      sourceHost,
      title,
      summary,
      publishedAt,
      collectedAt,
      contentSha256,
      recordSha256,
      normalizedPayload,
    }),
    rejectionCode: null,
  };
}

function auditDescriptor(
  eventType: NaverNewsAuditDescriptor['eventType'],
  boundedPayload: NaverNewsAuditDescriptor['boundedPayload'],
): NaverNewsAuditDescriptor {
  if (byteLength(canonicalJson(boundedPayload)) > MAX_AUDIT_PAYLOAD_BYTES) throw new Error('naver_news_audit_payload_too_large');
  return Object.freeze({
    eventType,
    boundedPayload: Object.freeze({ ...boundedPayload }),
    eventSha256: sha256Canonical({ eventType, boundedPayload }),
  });
}

export function buildNaverNewsIngestionWritePlan(
  identity: NaverNewsJobIdentity,
  collection: NaverNewsCollection,
): NaverNewsIngestionWritePlan {
  if (!identity || !isSha256(identity.jobId) || !isSha256(identity.idempotencyKey)
      || !isSha256(identity.requestSha256)
      || canonicalJson(buildNaverNewsJobIdentity(identity.request)) !== canonicalJson(identity)) {
    throw new Error('naver_news_identity_invalid');
  }
  if (!collection || typeof collection !== 'object' || !collection.response || typeof collection.response !== 'object') {
    throw new Error('naver_news_collection_invalid');
  }
  const fetchedAt = normalizeIsoDate(collection.fetchedAt, 'naver_news_fetched_at_invalid');
  const response = collection.response;
  const providerBuildAt = normalizeIsoDate(response.lastBuildDate, 'naver_news_provider_build_at_invalid');
  const total = requireInteger(response.total, 0, Number.MAX_SAFE_INTEGER, 'naver_news_total_invalid');
  const start = requireInteger(response.start, 1, 1000, 'naver_news_response_start_invalid');
  const display = requireInteger(response.display, 0, 100, 'naver_news_response_display_invalid');
  if (start !== identity.request.start || display > identity.request.display || !Array.isArray(response.items)
      || response.items.length > display || response.items.length > 100 || total < response.items.length) {
    throw new Error('naver_news_response_contract_mismatch');
  }

  const mutableEvidence: Array<Omit<NaverNewsRawEvidence, 'normalizationOutcome' | 'rejectionCode'> & {
    normalizationOutcome: NaverNewsRawEvidence['normalizationOutcome'];
    rejectionCode: NaverNewsRawEvidence['rejectionCode'];
  }> = [];
  const normalizedById = new Map<string, NaverNewsNormalizedRecord>();
  let duplicateRecords = 0;
  let rejectedItems = 0;

  for (let itemIndex = 0; itemIndex < response.items.length; itemIndex += 1) {
    const rawPayload = sanitizeRawItem(response.items[itemIndex]);
    const rawJson = canonicalJson(rawPayload);
    if (byteLength(rawJson) > MAX_RAW_PAYLOAD_BYTES) throw new Error('naver_news_raw_payload_too_large');
    const rawPayloadSha256 = sha256Canonical(rawPayload);
    const evidenceId = sha256Canonical({
      contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
      jobId: identity.jobId,
      itemIndex,
      rawPayloadSha256,
    });
    const normalized = normalizeItem(evidenceId, rawPayload, fetchedAt);
    let normalizationOutcome: NaverNewsRawEvidence['normalizationOutcome'] = 'rejected';
    if (normalized.record) {
      if (normalizedById.has(normalized.record.recordId)) {
        normalizationOutcome = 'duplicate';
        duplicateRecords += 1;
      } else {
        normalizationOutcome = 'normalized';
        normalizedById.set(normalized.record.recordId, normalized.record);
      }
    } else {
      rejectedItems += 1;
    }
    mutableEvidence.push({
      evidenceId,
      jobId: identity.jobId,
      itemIndex,
      observedAt: fetchedAt,
      rawPayload,
      rawPayloadSha256,
      normalizationOutcome,
      normalizedRecordId: normalized.record?.recordId ?? null,
      rejectionCode: normalized.rejectionCode,
    });
  }

  const rawEvidence = Object.freeze(mutableEvidence.map((row) => Object.freeze({ ...row })));
  const normalizedRecords = Object.freeze([...normalizedById.values()]);
  const counts = Object.freeze({
    received: response.items.length,
    rawEvidence: rawEvidence.length,
    normalizedRecords: normalizedRecords.length,
    duplicateRecords,
    rejectedItems,
  });
  const resultSha256 = sha256Canonical({
    jobId: identity.jobId,
    requestSha256: identity.requestSha256,
    fetchedAt,
    providerBuildAt,
    providerTotal: total,
    evidenceIds: rawEvidence.map((row) => row.evidenceId),
    normalizedRecordIds: normalizedRecords.map((row) => row.recordId),
    counts,
  });
  const audit = Object.freeze([
    auditDescriptor('collection_received', {
      providerTotal: total,
      received: counts.received,
      responseSha256: sha256Canonical({ providerBuildAt, total, start, display, items: rawEvidence.map((row) => row.rawPayloadSha256) }),
    }),
    auditDescriptor('raw_evidence_prepared', {
      rawEvidence: counts.rawEvidence,
      evidenceSetSha256: sha256Canonical(rawEvidence.map((row) => row.evidenceId)),
    }),
    auditDescriptor('normalization_prepared', {
      normalizedRecords: counts.normalizedRecords,
      duplicateRecords: counts.duplicateRecords,
      rejectedItems: counts.rejectedItems,
      normalizedSetSha256: sha256Canonical(normalizedRecords.map((row) => row.recordId)),
    }),
    auditDescriptor('job_succeeded', { resultSha256 }),
  ]);
  const planBody: Omit<NaverNewsIngestionWritePlan, 'planSha256'> = {
    contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
    identity,
    fetchedAt,
    providerBuildAt,
    providerTotal: total,
    rawEvidence,
    normalizedRecords,
    audit,
    counts,
    resultSha256,
  };
  return Object.freeze({ ...planBody, planSha256: sha256Canonical(planBody) });
}

export function validateNaverNewsIngestionWritePlan(plan: NaverNewsIngestionWritePlan): { valid: true } {
  if (!plan || plan.contractVersion !== NAVER_NEWS_INGESTION_CONTRACT_VERSION
      || canonicalJson(buildNaverNewsJobIdentity(plan.identity.request)) !== canonicalJson(plan.identity)
      || !isSha256(plan.resultSha256) || !isSha256(plan.planSha256)) {
    throw new Error('naver_news_write_plan_invalid');
  }
  const evidenceIds = new Set<string>();
  const recordIds = new Set<string>();
  for (const record of plan.normalizedRecords) {
    if (!isSha256(record.recordId) || !isSha256(record.rawEvidenceId) || !isSha256(record.contentSha256)
        || !isSha256(record.recordSha256) || record.provider !== NAVER_NEWS_PROVIDER
        || record.sourceType !== 'news_article' || record.recordSha256 !== sha256Canonical(record.normalizedPayload)
        || record.recordId !== sha256Canonical({
          contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
          provider: NAVER_NEWS_PROVIDER,
          recordSha256: record.recordSha256,
        })) {
      throw new Error('naver_news_write_plan_invalid');
    }
    if (recordIds.has(record.recordId)) throw new Error('naver_news_write_plan_invalid');
    recordIds.add(record.recordId);
  }
  for (const evidence of plan.rawEvidence) {
    const expectedEvidenceId = sha256Canonical({
      contractVersion: NAVER_NEWS_INGESTION_CONTRACT_VERSION,
      jobId: plan.identity.jobId,
      itemIndex: evidence.itemIndex,
      rawPayloadSha256: evidence.rawPayloadSha256,
    });
    const rejected = evidence.normalizationOutcome === 'rejected';
    if (evidence.jobId !== plan.identity.jobId || !Number.isInteger(evidence.itemIndex)
        || evidence.itemIndex < 0 || evidence.itemIndex >= 100
        || evidence.rawPayloadSha256 !== sha256Canonical(evidence.rawPayload)
        || evidence.evidenceId !== expectedEvidenceId || evidenceIds.has(evidence.evidenceId)
        || rejected !== (evidence.rejectionCode !== null)
        || rejected !== (evidence.normalizedRecordId === null)
        || (evidence.normalizedRecordId !== null && !recordIds.has(evidence.normalizedRecordId))) {
      throw new Error('naver_news_write_plan_invalid');
    }
    evidenceIds.add(evidence.evidenceId);
  }
  if (plan.normalizedRecords.some((record) => !evidenceIds.has(record.rawEvidenceId))) {
    throw new Error('naver_news_write_plan_invalid');
  }
  const expectedCounts = {
    received: plan.rawEvidence.length,
    rawEvidence: plan.rawEvidence.length,
    normalizedRecords: plan.normalizedRecords.length,
    duplicateRecords: plan.rawEvidence.filter((row) => row.normalizationOutcome === 'duplicate').length,
    rejectedItems: plan.rawEvidence.filter((row) => row.normalizationOutcome === 'rejected').length,
  };
  if (canonicalJson(plan.counts) !== canonicalJson(expectedCounts)) throw new Error('naver_news_write_plan_invalid');
  const expectedResultSha256 = sha256Canonical({
    jobId: plan.identity.jobId,
    requestSha256: plan.identity.requestSha256,
    fetchedAt: plan.fetchedAt,
    providerBuildAt: plan.providerBuildAt,
    providerTotal: plan.providerTotal,
    evidenceIds: plan.rawEvidence.map((row) => row.evidenceId),
    normalizedRecordIds: plan.normalizedRecords.map((row) => row.recordId),
    counts: plan.counts,
  });
  if (plan.resultSha256 !== expectedResultSha256
      || plan.audit.some((event) => event.eventSha256 !== sha256Canonical({
        eventType: event.eventType,
        boundedPayload: event.boundedPayload,
      }))) {
    throw new Error('naver_news_write_plan_invalid');
  }
  const { planSha256: ignoredPlanSha256, ...planBody } = plan;
  void ignoredPlanSha256;
  if (plan.planSha256 !== sha256Canonical(planBody)) throw new Error('naver_news_write_plan_invalid');
  return { valid: true };
}
