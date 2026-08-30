import { buildNaverNewsSchedulerPlan } from './naverNewsScheduler';
import { readNaverNewsRecurringConfig } from './naverNewsRecurringSchedulerContracts';

export const NAVER_NEWS_RECURRING_ACTIVATION_READINESS_VERSION = 'v129a_naver_news_recurring_activation_readiness_v1' as const;

export type NaverNewsRecurringPlatformCapabilities = Readonly<{
  requestMethod: 'post' | 'get' | 'unknown';
  authentication: 'bearer' | 'trusted-adapter' | 'unknown';
  hourlySchedule: 'verified' | 'unverified';
  duplicateDelivery: 'possible' | 'not_documented';
  retryBehavior: 'none' | 'possible' | 'unknown';
  timeoutBehavior: 'verified' | 'unknown';
}>;

export type NaverNewsRecurringActivationReadinessInput = Readonly<{
  environment: Readonly<Record<string, string | undefined>>;
  platform: NaverNewsRecurringPlatformCapabilities;
  previewIsolation: 'verified' | 'unverified';
  monitoringPolicyReady: boolean;
}>;

export type NaverNewsRecurringActivationReadiness = Readonly<{
  version: typeof NAVER_NEWS_RECURRING_ACTIVATION_READINESS_VERSION;
  ready: boolean;
  blockers: readonly string[];
  runtime: Readonly<{
    recurring: Readonly<Record<'enabled' | 'deployment' | 'secret' | 'query' | 'display', boolean>>;
    operational: Readonly<Record<'endpoint' | 'clientId' | 'clientSecret' | 'databaseUrl', boolean>>;
  }>;
  platform: Readonly<{
    requestMethod: NaverNewsRecurringPlatformCapabilities['requestMethod'];
    authentication: NaverNewsRecurringPlatformCapabilities['authentication'];
    hourlySchedule: NaverNewsRecurringPlatformCapabilities['hourlySchedule'];
    duplicateDelivery: NaverNewsRecurringPlatformCapabilities['duplicateDelivery'];
    retryBehavior: NaverNewsRecurringPlatformCapabilities['retryBehavior'];
    timeoutBehavior: NaverNewsRecurringPlatformCapabilities['timeoutBehavior'];
    previewIsolation: 'verified' | 'unverified';
  }>;
}>;

const RECURRING_KEYS = {
  enabled: 'FANDEX_NAVER_NEWS_RECURRING_ENABLED', deployment: 'FANDEX_NAVER_NEWS_RECURRING_DEPLOYMENT',
  secret: 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET', query: 'FANDEX_NAVER_NEWS_RECURRING_QUERY', display: 'FANDEX_NAVER_NEWS_RECURRING_DISPLAY',
} as const;
const OPERATIONAL_KEYS = {
  endpoint: 'FANDEX_NAVER_NEWS_API_ENDPOINT', clientId: 'FANDEX_NAVER_NEWS_CLIENT_ID',
  clientSecret: 'FANDEX_NAVER_NEWS_CLIENT_SECRET', databaseUrl: 'FANDEX_RUNTIME_DATABASE_URL',
} as const;

function present(environment: Readonly<Record<string, string | undefined>>, key: string): boolean {
  const value = environment[key];
  return typeof value === 'string' && value.length > 0;
}

function validEndpoint(value: string | undefined): boolean {
  if (!value || Buffer.byteLength(value, 'utf8') > 2048) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.hash; } catch { return false; }
}

function validDatabaseUrl(value: string | undefined): boolean {
  return typeof value === 'string' && value.length > 0 && Buffer.byteLength(value, 'utf8') <= 4096 && /^postgres(?:ql)?:\/\/[^\s]+$/.test(value);
}

function runtimeReadiness(environment: Readonly<Record<string, string | undefined>>) {
  const recurring = Object.freeze({
    enabled: present(environment, RECURRING_KEYS.enabled), deployment: present(environment, RECURRING_KEYS.deployment),
    secret: present(environment, RECURRING_KEYS.secret), query: present(environment, RECURRING_KEYS.query), display: present(environment, RECURRING_KEYS.display),
  });
  const operational = Object.freeze({
    endpoint: validEndpoint(environment[OPERATIONAL_KEYS.endpoint]), clientId: present(environment, OPERATIONAL_KEYS.clientId),
    clientSecret: present(environment, OPERATIONAL_KEYS.clientSecret), databaseUrl: validDatabaseUrl(environment[OPERATIONAL_KEYS.databaseUrl]),
  });
  return { recurring, operational };
}

export function evaluateNaverNewsRecurringActivationReadiness(
  input: NaverNewsRecurringActivationReadinessInput,
): NaverNewsRecurringActivationReadiness {
  const blockers: string[] = [];
  const runtime = runtimeReadiness(input.environment);
  try { readNaverNewsRecurringConfig(input.environment); } catch { blockers.push('recurring_environment_incomplete'); }
  if (!Object.values(runtime.operational).every(Boolean)) blockers.push('operational_environment_incomplete');
  if (input.platform.requestMethod === 'unknown') blockers.push('platform_request_method_unverified');
  else if (input.platform.requestMethod !== 'post') blockers.push('platform_method_incompatible');
  if (input.platform.authentication === 'unknown') blockers.push('platform_authentication_unverified');
  else if (input.platform.authentication !== 'bearer') blockers.push('platform_authentication_incompatible');
  if (input.platform.hourlySchedule !== 'verified') blockers.push('hourly_schedule_unverified');
  if (input.platform.duplicateDelivery === 'not_documented') blockers.push('duplicate_delivery_unverified');
  if (input.platform.retryBehavior === 'unknown') blockers.push('retry_behavior_unverified');
  if (input.platform.timeoutBehavior !== 'verified') blockers.push('timeout_behavior_unverified');
  if (input.previewIsolation !== 'verified') blockers.push('preview_isolation_unverified');
  if (!input.monitoringPolicyReady) blockers.push('monitoring_policy_not_ready');
  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  return Object.freeze({
    version: NAVER_NEWS_RECURRING_ACTIVATION_READINESS_VERSION,
    ready: uniqueBlockers.length === 0,
    blockers: uniqueBlockers,
    runtime: Object.freeze(runtime),
    platform: Object.freeze({ ...input.platform, previewIsolation: input.previewIsolation }),
  });
}

export type NaverNewsRecurringExpectedSlots = Readonly<{
  currentSlotStart: string;
  currentCollectionKey: string;
  previousSlotStart: string;
  previousCollectionKey: string;
}>;

export function buildNaverNewsRecurringExpectedSlots(input: Readonly<{ observedAt: string | Date; query: string; display?: number }>): NaverNewsRecurringExpectedSlots {
  const current = buildNaverNewsSchedulerPlan({ query: input.query, display: input.display, at: input.observedAt });
  const previous = buildNaverNewsSchedulerPlan({ ...input, at: new Date(Date.parse(current.slotStart) - 60 * 60 * 1000) });
  return Object.freeze({ currentSlotStart: current.slotStart, currentCollectionKey: current.collectionKey, previousSlotStart: previous.slotStart, previousCollectionKey: previous.collectionKey });
}
