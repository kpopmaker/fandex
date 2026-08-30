import { timingSafeEqual } from 'node:crypto';

export const NAVER_NEWS_RECURRING_SCHEDULER_VERSION = 'v128_naver_news_recurring_scheduler_v1' as const;
export const NAVER_NEWS_RECURRING_ENABLED_ENV = 'FANDEX_NAVER_NEWS_RECURRING_ENABLED' as const;
export const NAVER_NEWS_RECURRING_ENABLED_VALUE = 'approved-v128-recurring-foundation' as const;
export const NAVER_NEWS_RECURRING_DEPLOYMENT_ENV = 'FANDEX_NAVER_NEWS_RECURRING_DEPLOYMENT' as const;
export const NAVER_NEWS_RECURRING_DEPLOYMENT_VALUE = 'production' as const;
export const NAVER_NEWS_SCHEDULER_SECRET_ENV = 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET' as const;
export const NAVER_NEWS_RECURRING_QUERY_ENV = 'FANDEX_NAVER_NEWS_RECURRING_QUERY' as const;
export const NAVER_NEWS_RECURRING_DISPLAY_ENV = 'FANDEX_NAVER_NEWS_RECURRING_DISPLAY' as const;

const MAX_QUERY_BYTES = 512;

export type NaverNewsRecurringConfig = Readonly<{ query: string; display: number; secret: string }>;

function invalid(): never { throw new Error('naver_news_recurring_scheduler_rejected'); }
function normalizeQuery(value: unknown): string {
  if (typeof value !== 'string') return invalid();
  const result = value.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!result || Buffer.byteLength(result, 'utf8') > MAX_QUERY_BYTES) return invalid();
  return result;
}
function parseDisplay(value: unknown): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return invalid();
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 1 || result > 100) return invalid();
  return result;
}
function secret(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 512) return invalid();
  return value;
}
export function readNaverNewsRecurringConfig(
  environment: Readonly<Record<string, string | undefined>>,
): NaverNewsRecurringConfig {
  if (environment[NAVER_NEWS_RECURRING_ENABLED_ENV] !== NAVER_NEWS_RECURRING_ENABLED_VALUE
      || environment[NAVER_NEWS_RECURRING_DEPLOYMENT_ENV] !== NAVER_NEWS_RECURRING_DEPLOYMENT_VALUE) return invalid();
  return Object.freeze({
    query: normalizeQuery(environment[NAVER_NEWS_RECURRING_QUERY_ENV]),
    display: parseDisplay(environment[NAVER_NEWS_RECURRING_DISPLAY_ENV]),
    secret: secret(environment[NAVER_NEWS_SCHEDULER_SECRET_ENV]),
  });
}

export function isNaverNewsRecurringAuthorizationValid(header: unknown, configuredSecret: string): boolean {
  if (typeof header !== 'string' || !/^Bearer [^,\s]+$/.test(header)) return false;
  const supplied = header.slice('Bearer '.length);
  const expected = Buffer.from(configuredSecret, 'utf8');
  const actual = Buffer.from(supplied, 'utf8');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
