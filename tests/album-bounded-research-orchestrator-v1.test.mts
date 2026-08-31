import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAlbumCollectorPlan } from '../lib/server/ingestion/albumCollectorPlan';
import {
  runAlbumBoundedResearch,
  type AlbumBoundedResearchAuthorization,
  type AlbumBoundedResearchExecutor,
  type AlbumBoundedResearchExecutorResult,
} from '../lib/server/ingestion/albumBoundedResearchOrchestrator';

function enabledAuthorization(): AlbumBoundedResearchAuthorization {
  return Object.freeze({
    boundedResearchImplementationAuthorized: true,
    fixtureExecutionAuthorized: true,
    liveNetworkExecutionAuthorized: false,
    globalEnabled: true,
    providerEnabled: Object.freeze({
      'circle-retail': true,
      hanteo: true,
    }),
    persistenceAuthorized: false,
    scheduleMutationAuthorized: false,
    environmentMutationAuthorized: false,
  });
}

function fixtureExecutor(results: readonly AlbumBoundedResearchExecutorResult[], calls: string[]): AlbumBoundedResearchExecutor {
  let index = 0;
  return Object.freeze({
    kind: 'fixture' as const,
    async execute(request) {
      calls.push(request.provider);
      const result = results[index++];
      if (!result) throw new Error('fixture_result_missing');
      return result;
    },
  });
}

test('default authorization blocks execution before the fixture executor is called', async () => {
  const plan = buildAlbumCollectorPlan({ timeframe: 'day', at: '2026-09-01T00:00:00Z' });
  const calls: string[] = [];
  const executor = fixtureExecutor([{ status: 'ok', httpStatus: 200, rowCount: 50 }], calls);

  const report = await runAlbumBoundedResearch({ plan, executor });

  assert.equal(report.status, 'authorization-blocked');
  assert.equal(report.haltReason, 'global-kill-switch-disabled');
  assert.deepEqual(calls, []);
  assert.equal(report.effects.fixtureExecutorCalls, 0);
  assert.equal(report.effects.externalCalls, 0);
});

test('enabled fixture orchestration executes Circle and Hanteo separately within one bounded run', async () => {
  const plan = buildAlbumCollectorPlan({
    providerSelection: 'both',
    timeframe: 'day',
    at: '2026-09-01T00:00:00Z',
  });
  const calls: string[] = [];
  const executor = fixtureExecutor([
    { status: 'ok', httpStatus: 200, rowCount: 50, payloadDigest: 'a'.repeat(64) },
    { status: 'ok', httpStatus: 200, rowCount: 20, payloadDigest: 'b'.repeat(64) },
  ], calls);

  const report = await runAlbumBoundedResearch({
    plan,
    executor,
    authorization: enabledAuthorization(),
    maxRequests: 2,
  });

  assert.equal(report.status, 'completed');
  assert.equal(report.haltReason, null);
  assert.deepEqual(calls, ['circle-retail', 'hanteo']);
  assert.equal(report.attempts.length, 2);
  assert.equal(report.attempts[0].rowCount, 50);
  assert.equal(report.attempts[1].rowCount, 20);
  assert.equal(report.requestBudget.executedRequests, 2);
  assert.equal(report.requestBudget.remainingRequests, 0);
  assert.equal(report.effects.fixtureExecutorCalls, 2);
  assert.equal(report.effects.externalCalls, 0);
  assert.equal(report.effects.databaseWrites, 0);
});

test('429 halts the bounded run immediately and never executes the next provider request', async () => {
  const plan = buildAlbumCollectorPlan({
    providerSelection: 'both',
    timeframe: 'day',
    at: '2026-09-01T00:00:00Z',
  });
  const calls: string[] = [];
  const executor = fixtureExecutor([
    { status: 'http-error', httpStatus: 429 },
    { status: 'ok', httpStatus: 200, rowCount: 20 },
  ], calls);

  const report = await runAlbumBoundedResearch({
    plan,
    executor,
    authorization: enabledAuthorization(),
  });

  assert.equal(report.status, 'halted');
  assert.equal(report.haltReason, 'http-429-halt');
  assert.deepEqual(calls, ['circle-retail']);
  assert.equal(report.requestBudget.executedRequests, 1);
});

test('403, schema drift, and missing quantity are fail-closed halt conditions', async () => {
  const plan = buildAlbumCollectorPlan({ timeframe: 'day', at: '2026-09-01T00:00:00Z' });

  for (const [result, reason] of [
    [{ status: 'http-error', httpStatus: 403 }, 'http-403-halt-no-bypass'],
    [{ status: 'schema-drift' }, 'schema-drift'],
    [{ status: 'quantity-field-missing' }, 'quantity-field-missing'],
  ] as const) {
    const report = await runAlbumBoundedResearch({
      plan,
      authorization: enabledAuthorization(),
      executor: fixtureExecutor([result], []),
    });
    assert.equal(report.status, 'halted');
    assert.equal(report.haltReason, reason);
  }
});

test('live-network executor is blocked in v1 before its execute method can run', async () => {
  const plan = buildAlbumCollectorPlan({ timeframe: 'day', at: '2026-09-01T00:00:00Z' });
  let called = false;
  const executor: AlbumBoundedResearchExecutor = Object.freeze({
    kind: 'live-network',
    async execute() {
      called = true;
      return { status: 'ok', httpStatus: 200, rowCount: 50 };
    },
  });

  const report = await runAlbumBoundedResearch({
    plan,
    executor,
    authorization: enabledAuthorization(),
  });

  assert.equal(report.status, 'authorization-blocked');
  assert.equal(report.haltReason, 'live-network-execution-not-authorized-v1');
  assert.equal(called, false);
  assert.equal(report.effects.externalCalls, 0);
});

test('request budget is bounded to 20 and rejects a plan larger than the selected budget', async () => {
  const plan = buildAlbumCollectorPlan({
    providerSelection: 'both',
    timeframe: 'day',
    at: '2026-09-01T00:00:00Z',
  });

  await assert.rejects(
    () => runAlbumBoundedResearch({
      plan,
      authorization: enabledAuthorization(),
      executor: fixtureExecutor([{ status: 'ok' }, { status: 'ok' }], []),
      maxRequests: 1,
    }),
    /plan_exceeds_request_budget/,
  );

  await assert.rejects(
    () => runAlbumBoundedResearch({
      plan: buildAlbumCollectorPlan({ timeframe: 'day', at: '2026-09-01T00:00:00Z' }),
      authorization: enabledAuthorization(),
      executor: fixtureExecutor([{ status: 'ok' }], []),
      maxRequests: 21,
    }),
    /request_budget_invalid/,
  );
});

test('executor exceptions halt fail-closed and never continue to the next request', async () => {
  const plan = buildAlbumCollectorPlan({
    providerSelection: 'both',
    timeframe: 'day',
    at: '2026-09-01T00:00:00Z',
  });
  let calls = 0;
  const executor: AlbumBoundedResearchExecutor = Object.freeze({
    kind: 'fixture',
    async execute() {
      calls += 1;
      throw new Error('fixture_boom');
    },
  });

  const report = await runAlbumBoundedResearch({
    plan,
    executor,
    authorization: enabledAuthorization(),
  });

  assert.equal(report.status, 'halted');
  assert.equal(report.haltReason, 'executor-threw-fail-closed');
  assert.equal(calls, 1);
  assert.equal(report.attempts.length, 1);
});
