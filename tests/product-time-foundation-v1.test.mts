import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  ProductObservationTime,
  ProductProviderPeriod,
  ProductTimeContext,
} from '../lib/product/contracts/productTime';

test('Product observation supports instant, period, and unknown semantics', () => {
  const instant = {
    kind: 'instant',
    observedAt: '2026-08-30T00:00:00Z',
  } as const satisfies ProductObservationTime;
  const period = {
    kind: 'period',
    start: '2026-08-24',
    end: '2026-08-30',
  } as const satisfies ProductObservationTime;
  const unknown = { kind: 'unknown' } as const satisfies ProductObservationTime;

  assert.equal(instant.kind, 'instant');
  assert.equal(period.kind, 'period');
  assert.equal(period.start, '2026-08-24');
  assert.equal(period.end, '2026-08-30');
  assert.deepEqual(unknown, { kind: 'unknown' });
});

test('Product time keeps observation, collection, revision, and generation independent', () => {
  const context = {
    observationTime: {
      kind: 'instant',
      observedAt: '2026-08-30T00:00:00Z',
    },
    providerPeriod: null,
    collectionTime: { collectedAt: '2026-08-31T04:02:00Z' },
    revisionTime: { revisionObservedAt: '2026-09-01T01:00:00Z' },
    generatedTime: { generatedAt: '2026-09-01T06:00:00Z' },
  } as const satisfies ProductTimeContext;

  assert.notEqual(
    context.observationTime.observedAt,
    context.collectionTime.collectedAt,
  );
  assert.notEqual(
    context.revisionTime.revisionObservedAt,
    context.observationTime.observedAt,
  );
  assert.equal(context.generatedTime.generatedAt, '2026-09-01T06:00:00Z');
});

test('provider period remains independent from the observation period', () => {
  const providerPeriod = {
    kind: 'parsed',
    rawLabel: '2026-08-24/2026-08-30',
    start: '2026-08-24',
    end: '2026-08-30',
  } as const satisfies ProductProviderPeriod;
  const context = {
    observationTime: { kind: 'unknown' },
    providerPeriod,
    collectionTime: null,
    revisionTime: null,
    generatedTime: null,
  } as const satisfies ProductTimeContext;

  assert.equal(context.observationTime.kind, 'unknown');
  assert.equal(context.providerPeriod.kind, 'parsed');
  assert.equal(context.providerPeriod.start, '2026-08-24');
});

test('provider-native range labels do not fabricate observation dates', () => {
  const providerPeriod = {
    kind: 'raw',
    rawLabel: 'Aug 24-30',
    start: null,
    end: null,
  } as const satisfies ProductProviderPeriod;
  const context = {
    observationTime: { kind: 'unknown' },
    providerPeriod,
    collectionTime: null,
    revisionTime: null,
    generatedTime: null,
  } as const satisfies ProductTimeContext;

  assert.equal(context.observationTime.kind, 'unknown');
  assert.equal(context.providerPeriod.rawLabel, 'Aug 24-30');
  assert.equal(context.providerPeriod.start, null);
  assert.equal(context.providerPeriod.end, null);
});
