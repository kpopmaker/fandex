import assert from 'node:assert/strict';
import test from 'node:test';

import {
  measureFandexProductRuntimeSourceRead,
  type FandexProductRuntimeSourceReadDiagnostic,
} from '../lib/product/runtime/fandexProductRuntimeSourceReadDiagnostics';

test('source timing preserves successful read result and emits metadata only', async () => {
  const sourceResult = Object.freeze({
    evidence: 'must-not-log-this-evidence',
    accessToken: 'must-not-log-this-secret',
  });
  const emitted: FandexProductRuntimeSourceReadDiagnostic[] = [];
  let tick = 100;

  const result = await measureFandexProductRuntimeSourceRead({
    source: 'newsIssuePoint',
    read: async () => sourceResult,
    now: () => {
      const value = tick;
      tick += 42;
      return value;
    },
    emit: (metadata) => emitted.push(metadata),
  });

  assert.equal(result, sourceResult);
  assert.deepEqual(emitted, [{
    source: 'newsIssuePoint',
    durationMs: 42,
    outcome: 'fulfilled',
  }]);
  assert.equal(JSON.stringify(emitted).includes(sourceResult.evidence), false);
  assert.equal(JSON.stringify(emitted).includes(sourceResult.accessToken), false);
});

test('source timing preserves rejected read and never logs error payload', async () => {
  const secretError = new Error('secret-provider-response-must-not-log');
  const emitted: FandexProductRuntimeSourceReadDiagnostic[] = [];

  await assert.rejects(
    measureFandexProductRuntimeSourceRead({
      source: 'growthMomentumPoint.readiness',
      read: async () => { throw secretError; },
      now: (() => {
        let tick = 200;
        return () => { const result = tick; tick += 7; return result; };
      })(),
      emit: (metadata) => emitted.push(metadata),
    }),
    (error) => error === secretError,
  );

  assert.deepEqual(emitted, [{
    source: 'growthMomentumPoint.readiness',
    durationMs: 7,
    outcome: 'rejected',
  }]);
  assert.doesNotMatch(JSON.stringify(emitted), /secret-provider-response/);
});

test('source timing also measures synchronous failures without swallowing them', async () => {
  const failure = new Error('provider-side-effect-not-performed');
  const emitted: FandexProductRuntimeSourceReadDiagnostic[] = [];

  await assert.rejects(
    measureFandexProductRuntimeSourceRead({
      source: 'brandFitPoint',
      read: () => { throw failure; },
      now: () => 10,
      emit: (metadata) => emitted.push(metadata),
    }),
    (error) => error === failure,
  );

  assert.deepEqual(emitted, [{
    source: 'brandFitPoint',
    durationMs: 0,
    outcome: 'rejected',
  }]);
});
