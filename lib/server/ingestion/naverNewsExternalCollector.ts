import {
  buildNaverNewsJobIdentity,
  canonicalJson,
  type NaverNewsApiItem,
  type NaverNewsApiResponse,
  type NaverNewsCollection,
  type NaverNewsRequestContract,
} from './naverNewsContracts';
import type { NaverNewsCollector } from './naverNewsWorker';

export const NAVER_NEWS_EXTERNAL_ENDPOINT_ENV = 'FANDEX_NAVER_NEWS_API_ENDPOINT';
export const FANDEX_NAVER_NEWS_CLIENT_ID_ENV = 'FANDEX_NAVER_NEWS_CLIENT_ID';
export const FANDEX_NAVER_NEWS_CLIENT_SECRET_ENV = 'FANDEX_NAVER_NEWS_CLIENT_SECRET';
export const NAVER_NEWS_EXTERNAL_TIMEOUT_MILLISECONDS = 10_000;

const MAX_ENDPOINT_BYTES = 2_048;
const MAX_CREDENTIAL_BYTES = 1_024;
const MAX_RESPONSE_BYTES = 2_500_000;
const MAX_TITLE_BYTES = 2_048;
const MAX_DESCRIPTION_BYTES = 8_192;
const MAX_URL_BYTES = 4_096;
const MAX_DATE_BYTES = 256;
const MAX_RAW_PAYLOAD_BYTES = 24_576;
const RESPONSE_KEYS = Object.freeze(['lastBuildDate', 'total', 'start', 'display', 'items']);
const ITEM_KEYS = Object.freeze(['title', 'originallink', 'link', 'description', 'pubDate']);
const EXTERNAL_ERROR_CODES = new Set([
  'naver_news_external_request_failed',
  'naver_news_external_http_failed',
  'naver_news_external_response_invalid',
  'naver_news_external_clock_invalid',
]);

export type NaverNewsExternalFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type NaverNewsExternalCollectorOptions = Readonly<{
  environment?: Readonly<Record<string, string | undefined>>;
  fetch?: NaverNewsExternalFetch;
  now?: () => Date;
  timeoutMilliseconds?: number;
}>;

function fail(code: string): never {
  throw new Error(code);
}

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function requireConfigValue(value: string | undefined): string {
  if (!value || value !== value.trim() || byteLength(value) > MAX_CREDENTIAL_BYTES
      || /[\u0000-\u001f\u007f]/.test(value)) {
    return fail('naver_news_external_config_invalid');
  }
  return value;
}

function requireEndpoint(value: string | undefined): URL {
  if (!value || value !== value.trim() || byteLength(value) > MAX_ENDPOINT_BYTES) {
    return fail('naver_news_external_config_invalid');
  }
  let endpoint: URL;
  try {
    endpoint = new URL(value);
  } catch {
    return fail('naver_news_external_config_invalid');
  }
  if (endpoint.protocol !== 'https:' || endpoint.hostname.toLowerCase() !== 'openapi.naver.com'
      || endpoint.port || endpoint.username || endpoint.password || endpoint.hash
      || endpoint.pathname !== '/v1/search/news.json' || endpoint.search) {
    return fail('naver_news_external_config_invalid');
  }
  return endpoint;
}

export function validateNaverNewsExternalConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): void {
  requireEndpoint(environment[NAVER_NEWS_EXTERNAL_ENDPOINT_ENV]);
  requireConfigValue(environment[FANDEX_NAVER_NEWS_CLIENT_ID_ENV]);
  requireConfigValue(environment[FANDEX_NAVER_NEWS_CLIENT_SECRET_ENV]);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function requireBoundedString(value: unknown, maximumBytes: number): string {
  if (typeof value !== 'string' || byteLength(value) > maximumBytes) {
    return fail('naver_news_external_response_invalid');
  }
  return value;
}

function requireInteger(value: unknown, minimum: number, maximum: number): number {
  if (!Number.isInteger(value) || Number(value) < minimum || Number(value) > maximum) {
    return fail('naver_news_external_response_invalid');
  }
  return Number(value);
}

function validateItem(value: unknown): NaverNewsApiItem {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || Object.keys(value).some((key) => !ITEM_KEYS.includes(key))) {
    return fail('naver_news_external_response_invalid');
  }
  const item = value as Record<string, unknown>;
  const validated: Record<string, string> = {};
  for (const [key, maximumBytes] of [
    ['title', MAX_TITLE_BYTES],
    ['originallink', MAX_URL_BYTES],
    ['link', MAX_URL_BYTES],
    ['description', MAX_DESCRIPTION_BYTES],
    ['pubDate', MAX_DATE_BYTES],
  ] as const) {
    if (key in item) validated[key] = requireBoundedString(item[key], maximumBytes);
  }
  if (byteLength(canonicalJson(validated)) > MAX_RAW_PAYLOAD_BYTES) {
    return fail('naver_news_external_response_invalid');
  }
  return Object.freeze(validated);
}

function validateResponse(value: unknown, request: NaverNewsRequestContract): NaverNewsApiResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)
      || !hasExactKeys(value as Record<string, unknown>, RESPONSE_KEYS)) {
    return fail('naver_news_external_response_invalid');
  }
  const response = value as Record<string, unknown>;
  const lastBuildDate = requireBoundedString(response.lastBuildDate, MAX_DATE_BYTES);
  if (!lastBuildDate.trim() || !Number.isFinite(Date.parse(lastBuildDate))) {
    return fail('naver_news_external_response_invalid');
  }
  const total = requireInteger(response.total, 0, Number.MAX_SAFE_INTEGER);
  const start = requireInteger(response.start, 1, 1_000);
  const display = requireInteger(response.display, 0, 100);
  if (!Array.isArray(response.items) || start !== request.start || display > request.display
      || response.items.length > display || response.items.length > 100 || total < response.items.length) {
    return fail('naver_news_external_response_invalid');
  }
  const items = Object.freeze(response.items.map(validateItem));
  return Object.freeze({ lastBuildDate, total, start, display, items });
}

function validateRequest(request: NaverNewsRequestContract): void {
  try {
    if (canonicalJson(buildNaverNewsJobIdentity(request).request) !== canonicalJson(request)) {
      fail('naver_news_external_request_invalid');
    }
  } catch {
    fail('naver_news_external_request_invalid');
  }
}

function bestEffortCancelResponseBody(response: Response): void {
  try {
    const cancellation = response.body?.cancel();
    if (cancellation) void cancellation.catch(() => {});
  } catch {
    // Preserve the original bounded external error when cleanup itself fails.
  }
}

async function readBoundedBody(response: Response): Promise<string> {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null
      && (!/^\d+$/.test(declaredLength) || Number(declaredLength) > MAX_RESPONSE_BYTES)) {
    bestEffortCancelResponseBody(response);
    return fail('naver_news_external_response_invalid');
  }
  if (!response.body) return fail('naver_news_external_response_invalid');
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const chunks: string[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      return fail('naver_news_external_response_invalid');
    }
    chunks.push(decoder.decode(value, { stream: true }));
  }
  chunks.push(decoder.decode());
  return chunks.join('');
}

export function createNaverNewsExternalCollector(
  options: NaverNewsExternalCollectorOptions = {},
): NaverNewsCollector {
  const environment = options.environment ?? process.env;
  const endpoint = requireEndpoint(environment[NAVER_NEWS_EXTERNAL_ENDPOINT_ENV]);
  const clientId = requireConfigValue(environment[FANDEX_NAVER_NEWS_CLIENT_ID_ENV]);
  const clientSecret = requireConfigValue(environment[FANDEX_NAVER_NEWS_CLIENT_SECRET_ENV]);
  const fetchExternal = options.fetch ?? globalThis.fetch;
  const now = options.now ?? (() => new Date());
  const timeoutMilliseconds = options.timeoutMilliseconds ?? NAVER_NEWS_EXTERNAL_TIMEOUT_MILLISECONDS;
  if (!Number.isInteger(timeoutMilliseconds) || timeoutMilliseconds < 1 || timeoutMilliseconds > 30_000) {
    return fail('naver_news_external_config_invalid');
  }

  return Object.freeze({
    mode: 'external' as const,
    async collect(request: NaverNewsRequestContract): Promise<NaverNewsCollection> {
      validateRequest(request);
      const url = new URL(endpoint);
      url.searchParams.set('query', request.query);
      url.searchParams.set('display', String(request.display));
      url.searchParams.set('start', String(request.start));
      url.searchParams.set('sort', request.sort);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMilliseconds);
      try {
        let response: Response;
        try {
          response = await fetchExternal(url, {
            method: 'GET',
            headers: {
              'X-Naver-Client-Id': clientId,
              'X-Naver-Client-Secret': clientSecret,
            },
            cache: 'no-store',
            signal: controller.signal,
          });
        } catch {
          return fail('naver_news_external_request_failed');
        }
        if (!response.ok) {
          bestEffortCancelResponseBody(response);
          return fail('naver_news_external_http_failed');
        }
        const contentType = response.headers.get('content-type') ?? '';
        if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
          bestEffortCancelResponseBody(response);
          return fail('naver_news_external_response_invalid');
        }
        let unknownResponse: unknown;
        try {
          unknownResponse = JSON.parse(await readBoundedBody(response)) as unknown;
        } catch (error) {
          if (controller.signal.aborted) return fail('naver_news_external_request_failed');
          if (error instanceof Error && error.message === 'naver_news_external_response_invalid') throw error;
          return fail('naver_news_external_response_invalid');
        }
        const validated = validateResponse(unknownResponse, request);
        let collectedAt: Date;
        try {
          collectedAt = now();
        } catch {
          return fail('naver_news_external_clock_invalid');
        }
        if (!(collectedAt instanceof Date) || !Number.isFinite(collectedAt.getTime())) {
          return fail('naver_news_external_clock_invalid');
        }
        return Object.freeze({ fetchedAt: collectedAt.toISOString(), response: validated });
      } catch (error) {
        if (error instanceof Error && EXTERNAL_ERROR_CODES.has(error.message)) throw error;
        return fail(controller.signal.aborted
          ? 'naver_news_external_request_failed'
          : 'naver_news_external_response_invalid');
      } finally {
        clearTimeout(timeout);
      }
    },
  });
}
