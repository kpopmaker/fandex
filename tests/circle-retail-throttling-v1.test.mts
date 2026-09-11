import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CIRCLE_RETAIL_THROTTLING,
  canStartCircleRetailBoundedRequest,
  decideCircleRetailThrottle,
} from '../lib/alternative-evidence/circleRetailThrottling';

test('bounded direct evidence never becomes a claimed provider hard limit', () => {
  assert.equal(CIRCLE_RETAIL_THROTTLING.providerHardLimitState, 'unknown');
  assert.equal(CIRCLE_RETAIL_THROTTLING.explicitRateLimitHeadersObserved, false);
  assert.equal(CIRCLE_RETAIL_THROTTLING.retryAfterObserved, false);
  assert.equal(CIRCLE_RETAIL_THROTTLING.observed429, false);
  assert.deepEqual(CIRCLE_RETAIL_THROTTLING.boundedEvidence, {
    workflowRunId: '33422703085',
    requestCount: 2,
    observedIntervalMs: 3000,
    allHttp200: true,
    allProviderStatusOk: true,
    allPublishedTop50: true,
  });
});

test('FANDEX self-imposes single concurrency and a 3-second minimum interval', () => {
  assert.equal(CIRCLE_RETAIL_THROTTLING.selfImposedPolicy.maxConcurrency, 1);
  assert.equal(CIRCLE_RETAIL_THROTTLING.selfImposedPolicy.minimumIntervalMs, 3000);
  assert.equal(CIRCLE_RETAIL_THROTTLING.selfImposedPolicy.maxRequestsPerBoundedRun, 20);
  assert.equal(canStartCircleRetailBoundedRequest({ inFlightRequests: 0, requestsAlreadyMade: 0 }), true);
  assert.equal(canStartCircleRetailBoundedRequest({ inFlightRequests: 1, requestsAlreadyMade: 0 }), false);
  assert.equal(canStartCircleRetailBoundedRequest({ inFlightRequests: 0, requestsAlreadyMade: 20 }), false);
});

test('successful requests proceed only after the self-imposed interval', () => {
  assert.deepEqual(decideCircleRetailThrottle({ httpStatus: 200 }), {
    action: 'proceed-after-interval',
    waitMs: 3000,
    retryAttempt: 0,
    reason: 'self-imposed-low-frequency-interval',
  });
});

test('429 halts the current run and honors Retry-After without automatic pressure', () => {
  assert.deepEqual(decideCircleRetailThrottle({ httpStatus: 429, retryAfterHeader: '120' }), {
    action: 'halt-rate-limited',
    waitMs: 120000,
    retryAttempt: 0,
    reason: 'provider-rate-limit-observed-stop-current-run',
  });
  assert.equal(decideCircleRetailThrottle({ httpStatus: 429 }).waitMs, 60000);
});

test('403 halts immediately instead of attempting bypass or retry', () => {
  assert.deepEqual(decideCircleRetailThrottle({ httpStatus: 403 }), {
    action: 'halt-access-blocked',
    waitMs: null,
    retryAttempt: 0,
    reason: 'provider-access-blocked-stop-current-run',
  });
});

test('5xx retries are bounded and then halt', () => {
  assert.equal(decideCircleRetailThrottle({ httpStatus: 503, retryAttempt: 0 }).waitMs, 10000);
  assert.equal(decideCircleRetailThrottle({ httpStatus: 503, retryAttempt: 1 }).waitMs, 30000);
  assert.deepEqual(decideCircleRetailThrottle({ httpStatus: 503, retryAttempt: 2 }), {
    action: 'halt-retries-exhausted',
    waitMs: null,
    retryAttempt: 2,
    reason: 'bounded-server-error-retries-exhausted',
  });
});

test('throttling qualification does not authorize live or production collection', () => {
  assert.equal(CIRCLE_RETAIL_THROTTLING.liveEligible, false);
  assert.equal(CIRCLE_RETAIL_THROTTLING.productionEligible, false);
});
