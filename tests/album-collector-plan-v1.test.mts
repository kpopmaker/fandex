import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAlbumCollectorPlan,
} from '../lib/server/ingestion/albumCollectorPlan';
import {
  buildAlbumCollectorPlanReport,
  parseAlbumCollectorPlanCommand,
} from '../scripts/ingestion/plan-album-collector-v1';

test('primary current daily plan targets Circle Retail only and remains plan-only', () => {
  const plan = buildAlbumCollectorPlan({
    timeframe: 'day',
    at: '2026-09-01T00:00:00Z',
  });

  assert.equal(plan.runMode, 'plan-only');
  assert.equal(plan.activation, 'disabled');
  assert.equal(plan.providerSelection, 'primary');
  assert.equal(plan.requests.length, 1);
  assert.equal(plan.requests[0].provider, 'circle-retail');
  assert.equal(plan.requests[0].requestContract.method, 'POST');
  assert.equal(plan.requests[0].requestContract.endpoint, '/data/api/chart/retail_list');
  assert.equal(plan.requests[0].quantityContract.field, 'rowSum');
  assert.equal(plan.requests[0].executionAuthorized, false);
  assert.deepEqual(plan.effects, {
    externalCalls: 0,
    databaseReads: 0,
    databaseWrites: 0,
    scheduleMutation: 0,
    environmentMutation: 0,
  });
});

test('secondary current weekly plan uses Hanteo salesVolume and never Album Index', () => {
  const plan = buildAlbumCollectorPlan({
    providerSelection: 'secondary',
    timeframe: 'week',
    at: '2026-09-01T00:00:00Z',
  });
  const request = plan.requests[0];

  assert.equal(request.provider, 'hanteo');
  assert.equal(request.requestContract.method, 'GET');
  assert.equal(request.requestContract.endpoint, '/v4/ranking/list/ALBUM/WEEKLY/BASIC');
  assert.deepEqual(request.requestContract.parameterNames, ['limit']);
  assert.equal(request.quantityContract.field, 'detail.salesVolume');
  assert.ok(request.quantityContract.forbiddenFallbacks.includes('value(Album Index)'));
});

test('both current daily plans preserve two provider observations without blending', () => {
  const plan = buildAlbumCollectorPlan({
    providerSelection: 'both',
    timeframe: 'day',
    at: '2026-09-01T00:00:00Z',
  });

  assert.deepEqual(plan.requests.map((request) => request.provider), ['circle-retail', 'hanteo']);
  assert.deepEqual(plan.requests.map((request) => request.quantityContract.field), ['rowSum', 'detail.salesVolume']);
  assert.equal(plan.requests.some((request) => request.quantityContract.field.includes('+')), false);
});

test('Circle historical plan requires an explicit bounded provider period key', () => {
  assert.throws(
    () => buildAlbumCollectorPlan({ timeframe: 'day', periodMode: 'historical', at: '2026-09-01T00:00:00Z' }),
    /historical_period_key_required/,
  );

  const plan = buildAlbumCollectorPlan({
    timeframe: 'month',
    periodMode: 'historical',
    providerPeriodKey: '202608',
    at: '2026-09-01T00:00:00Z',
  });
  assert.equal(plan.requests[0].providerPeriodKey, '202608');
  assert.equal(plan.requests[0].periodMode, 'historical');
});

test('Hanteo historical exact copies remain fail-closed', () => {
  assert.throws(
    () => buildAlbumCollectorPlan({
      providerSelection: 'secondary',
      timeframe: 'week',
      periodMode: 'historical',
      providerPeriodKey: '2026-W30',
      at: '2026-09-01T00:00:00Z',
    }),
    /hanteo_historical_exact_copies_unverified/,
  );
});

test('current plan rejects an invented provider period key', () => {
  assert.throws(
    () => buildAlbumCollectorPlan({
      timeframe: 'day',
      providerPeriodKey: '20260831',
      at: '2026-09-01T00:00:00Z',
    }),
    /current_period_key_forbidden/,
  );
});

test('timeframe eligibility is provider-specific', () => {
  const primaryHour = buildAlbumCollectorPlan({ timeframe: 'hour', at: '2026-09-01T00:00:00Z' });
  assert.equal(primaryHour.requests[0].requestContract.endpoint, '/data/api/chart/retail_hour');

  assert.throws(
    () => buildAlbumCollectorPlan({ providerSelection: 'secondary', timeframe: 'hour', at: '2026-09-01T00:00:00Z' }),
    /hanteo_timeframe_unqualified/,
  );
  assert.throws(
    () => buildAlbumCollectorPlan({ providerSelection: 'both', timeframe: 'year', at: '2026-09-01T00:00:00Z' }),
    /hanteo_timeframe_unqualified/,
  );
});

test('planner digest is deterministic for the same normalized input', () => {
  const left = buildAlbumCollectorPlan({ timeframe: 'day', at: new Date('2026-09-01T00:00:00Z') });
  const right = buildAlbumCollectorPlan({ timeframe: 'day', at: '2026-09-01T00:00:00.000Z' });
  assert.equal(left.planDigest, right.planDigest);
  assert.match(left.planDigest, /^[0-9a-f]{64}$/);
});

test('planner rejects invalid clocks and malformed period keys', () => {
  assert.throws(() => buildAlbumCollectorPlan({ timeframe: 'day', at: 'not-a-date' }), /time_invalid/);
  assert.throws(
    () => buildAlbumCollectorPlan({
      timeframe: 'day',
      periodMode: 'historical',
      providerPeriodKey: '   ',
      at: '2026-09-01T00:00:00Z',
    }),
    /period_key_invalid/,
  );
});

test('plan-only CLI defaults to primary/current and has no side effects', () => {
  const parsed = parseAlbumCollectorPlanCommand(
    ['--timeframe', 'day'],
    () => new Date('2026-09-01T00:00:00Z'),
  );
  assert.deepEqual(parsed, {
    providerSelection: 'primary',
    timeframe: 'day',
    periodMode: 'current',
    at: '2026-09-01T00:00:00.000Z',
  });

  const report = buildAlbumCollectorPlanReport(parsed);
  assert.equal(report.mode, 'album-collector-plan');
  assert.equal(report.activation, 'disabled');
  assert.equal(report.effects.externalCalls, 0);
  assert.equal(report.effects.databaseReads, 0);
  assert.equal(report.effects.databaseWrites, 0);
  assert.equal(report.effects.scheduleMutation, 0);
  assert.equal(report.effects.environmentMutation, 0);
});

test('plan-only CLI separates syntax validation from provider qualification', () => {
  assert.throws(() => parseAlbumCollectorPlanCommand([], () => new Date()), /argument_invalid/);
  assert.throws(() => parseAlbumCollectorPlanCommand(['--timeframe', 'day', '--timeframe', 'week']), /argument_invalid/);
  assert.throws(() => parseAlbumCollectorPlanCommand(['--timeframe', 'day', '--unknown', 'x']), /argument_invalid/);
  assert.throws(() => parseAlbumCollectorPlanCommand(['--timeframe', 'day', '--period', '20260831']), /argument_invalid/);
  assert.throws(() => parseAlbumCollectorPlanCommand(['--timeframe', 'day', '--period-mode', 'historical']), /argument_invalid/);

  const unsupported = parseAlbumCollectorPlanCommand([
    '--provider', 'secondary',
    '--timeframe', 'hour',
    '--at', '2026-09-01T00:00:00Z',
  ]);
  assert.throws(() => buildAlbumCollectorPlanReport(unsupported), /hanteo_timeframe_unqualified/);
});
