import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FANDEX_RUNTIME_SOURCE_READ_TIMING_VERSION,
  observeFandexRuntimeSourceRead,
} from '../lib/server/product/fandexRuntimeSourceReadTimings';

test('timing disabled preserves original promise and produces no logging', async () => {
  const original = Promise.resolve('original-evidence');
  const messages: string[] = [];
  const result = observeFandexRuntimeSourceRead(
    'newsIssuePoint',
    original,
    { enabled: false, log: (line) => messages.push(line) },
  );

  assert.equal(result, original);
  assert.equal(await result, 'original-evidence');
  assert.deepEqual(messages, []);
});

test('enabled timing records allowlisted metadata for a successful read', async () => {
  const messages: string[] = [];
  let clock = 10;
  let resolveRead: (value: string) => void = () => {
    throw new Error('not initialized');
  };
  const read = new Promise<string>((resolve) => { resolveRead = resolve; });
  const timed = observeFandexRuntimeSourceRead('brandFitPoint', read, {
    enabled: true,
    now: () => clock,
    log: (line) => messages.push(line),
  });

  clock = 145.5;
  resolveRead('non-public evidence should remain private');
  assert.equal(await timed, 'non-public evidence should remain private');
  assert.equal(messages.length, 1);

  const prefix = 'FANDEX_PRODUCT_RUNTIME_READ_TIMING=';
  assert.ok(messages[0].startsWith(prefix));
  assert.deepEqual(JSON.parse(messages[0].slice(prefix.length)), {
    contractVersion: FANDEX_RUNTIME_SOURCE_READ_TIMING_VERSION,
    source: 'brandFitPoint',
    outcome: 'fulfilled',
    durationMs: 136,
  });
  assert.equal(messages[0].includes('non-public evidence'), false);
});

test('rejected source read remains rejected and does not leak exception details', async () => {
  const secretError = new Error('private provider token must not be logged');
  const messages: string[] = [];
  const settled = await Promise.allSettled([
    observeFandexRuntimeSourceRead(
      'musicAlbumPoint',
      Promise.reject(secretError),
      { enabled: true, now: () => 3, log: (line) => messages.push(line) },
    ),
    observeFandexRuntimeSourceRead(
      'snsFandomPoint',
      Promise.resolve(null),
      { enabled: true, now: () => 3, log: (line) => messages.push(line) },
    ),
  ]);

  assert.equal(settled[0].status, 'rejected');
  if (settled[0].status === 'rejected') {
    assert.equal(settled[0].reason, secretError);
  }
  assert.deepEqual(settled[1], { status: 'fulfilled', value: null });
  assert.equal(messages.length, 2);
  assert.ok(messages.some((m) => m.includes('"outcome":"rejected"')));
  assert.ok(messages.every((m) => !m.includes('private provider token')));
  assert.ok(messages.every((m) => !m.includes('stack')));
});

test('diagnostic logger failure cannot change fulfilled or rejected Product reads', async () => {
  const loggingFailure = () => { throw new Error('logger failed'); };
  assert.equal(
    await observeFandexRuntimeSourceRead(
      'comebackActivityPoint',
      Promise.resolve(42),
      { enabled: true, log: loggingFailure },
    ),
    42,
  );
  const original = new Error('upstream-unavailable');
  await assert.rejects(
    observeFandexRuntimeSourceRead(
      'growthMomentumReadiness',
      Promise.reject(original),
      { enabled: true, log: loggingFailure },
    ),
    (error) => error === original,
  );
});

test('unexpected clock values never produce invalid JSON or extra failures', async () => {
  const messages: string[] = [];
  await observeFandexRuntimeSourceRead(
    'growthMomentumPoint',
    Promise.resolve(undefined),
    {
      enabled: true,
      now: () => Number.NaN,
      log: (line) => messages.push(line),
    },
  );
  const prefix = 'FANDEX_PRODUCT_RUNTIME_READ_TIMING=';
  assert.equal(JSON.parse(messages[0].slice(prefix.length)).durationMs, null);
});
