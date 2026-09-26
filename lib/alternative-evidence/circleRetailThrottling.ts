export const CIRCLE_RETAIL_THROTTLING_CONTRACT_VERSION = 'circle-retail-throttling-v1' as const;

export type CircleRetailThrottleAction =
  | 'proceed-after-interval'
  | 'retry-server-error'
  | 'halt-rate-limited'
  | 'halt-access-blocked'
  | 'halt-client-error'
  | 'halt-retries-exhausted';

export type CircleRetailThrottleDecision = Readonly<{
  action: CircleRetailThrottleAction;
  waitMs: number | null;
  retryAttempt: number;
  reason: string;
}>;

export type CircleRetailThrottlingContract = Readonly<{
  contractVersion: typeof CIRCLE_RETAIL_THROTTLING_CONTRACT_VERSION;
  providerId: 'circle-chart';
  providerHardLimitState: 'unknown';
  explicitRateLimitHeadersObserved: false;
  retryAfterObserved: false;
  observed429: false;
  boundedEvidence: Readonly<{
    workflowRunId: '33422703085';
    requestCount: 2;
    observedIntervalMs: 3000;
    allHttp200: true;
    allProviderStatusOk: true;
    allPublishedTop50: true;
  }>;
  selfImposedPolicy: Readonly<{
    maxConcurrency: 1;
    minimumIntervalMs: 3000;
    maxRequestsPerBoundedRun: 20;
    maxServerErrorRetries: 2;
    serverErrorBackoffMs: readonly [10000, 30000];
    fallbackRetryAfterMs: 60000;
    on429: 'halt-current-run';
    on403: 'halt-current-run';
    honorRetryAfterHeader: true;
  }>;
  liveEligible: false;
  productionEligible: false;
}>;

export const CIRCLE_RETAIL_THROTTLING: CircleRetailThrottlingContract = Object.freeze({
  contractVersion: CIRCLE_RETAIL_THROTTLING_CONTRACT_VERSION,
  providerId: 'circle-chart',
  providerHardLimitState: 'unknown',
  explicitRateLimitHeadersObserved: false,
  retryAfterObserved: false,
  observed429: false,
  boundedEvidence: Object.freeze({
    workflowRunId: '33422703085',
    requestCount: 2,
    observedIntervalMs: 3000,
    allHttp200: true,
    allProviderStatusOk: true,
    allPublishedTop50: true,
  }),
  selfImposedPolicy: Object.freeze({
    maxConcurrency: 1,
    minimumIntervalMs: 3000,
    maxRequestsPerBoundedRun: 20,
    maxServerErrorRetries: 2,
    serverErrorBackoffMs: Object.freeze([10000, 30000] as const),
    fallbackRetryAfterMs: 60000,
    on429: 'halt-current-run',
    on403: 'halt-current-run',
    honorRetryAfterHeader: true,
  }),
  liveEligible: false,
  productionEligible: false,
});

function parseRetryAfterMs(value: string | null | undefined, nowMs: number): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, timestamp - nowMs);
}

export function decideCircleRetailThrottle(input: Readonly<{
  httpStatus: number;
  retryAttempt?: number;
  retryAfterHeader?: string | null;
  nowMs?: number;
}>): CircleRetailThrottleDecision {
  const retryAttempt = input.retryAttempt ?? 0;
  const nowMs = input.nowMs ?? Date.now();

  if (input.httpStatus === 429) {
    const retryAfterMs = parseRetryAfterMs(input.retryAfterHeader, nowMs)
      ?? CIRCLE_RETAIL_THROTTLING.selfImposedPolicy.fallbackRetryAfterMs;
    return Object.freeze({
      action: 'halt-rate-limited',
      waitMs: retryAfterMs,
      retryAttempt,
      reason: 'provider-rate-limit-observed-stop-current-run',
    });
  }

  if (input.httpStatus === 403) {
    return Object.freeze({
      action: 'halt-access-blocked',
      waitMs: null,
      retryAttempt,
      reason: 'provider-access-blocked-stop-current-run',
    });
  }

  if (input.httpStatus >= 500 && input.httpStatus <= 599) {
    const backoffs = CIRCLE_RETAIL_THROTTLING.selfImposedPolicy.serverErrorBackoffMs;
    if (retryAttempt < CIRCLE_RETAIL_THROTTLING.selfImposedPolicy.maxServerErrorRetries) {
      return Object.freeze({
        action: 'retry-server-error',
        waitMs: backoffs[retryAttempt],
        retryAttempt,
        reason: 'bounded-server-error-retry',
      });
    }
    return Object.freeze({
      action: 'halt-retries-exhausted',
      waitMs: null,
      retryAttempt,
      reason: 'bounded-server-error-retries-exhausted',
    });
  }

  if (input.httpStatus >= 400 && input.httpStatus <= 499) {
    return Object.freeze({
      action: 'halt-client-error',
      waitMs: null,
      retryAttempt,
      reason: 'unexpected-client-error-stop-current-run',
    });
  }

  return Object.freeze({
    action: 'proceed-after-interval',
    waitMs: CIRCLE_RETAIL_THROTTLING.selfImposedPolicy.minimumIntervalMs,
    retryAttempt,
    reason: 'self-imposed-low-frequency-interval',
  });
}

export function canStartCircleRetailBoundedRequest(input: Readonly<{
  inFlightRequests: number;
  requestsAlreadyMade: number;
}>): boolean {
  return input.inFlightRequests < CIRCLE_RETAIL_THROTTLING.selfImposedPolicy.maxConcurrency
    && input.requestsAlreadyMade < CIRCLE_RETAIL_THROTTLING.selfImposedPolicy.maxRequestsPerBoundedRun;
}
