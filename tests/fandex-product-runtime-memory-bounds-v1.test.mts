import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  FANDEX_RUNTIME_SOURCE_READ_MAX_CONCURRENCY,
  settleRuntimeSourceReads,
  singleFlightRuntimeRead,
} from '../lib/server/product/boundedRuntimeSourceReads';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('seven source reads use no more than two concurrent jobs', async () => {
  assert.equal(FANDEX_RUNTIME_SOURCE_READ_MAX_CONCURRENCY, 2);
  const gates = Array.from({ length: 7 }, () => deferred<number>());
  let active = 0;
  let peak = 0;
  const started: number[] = [];

  const reads = gates.map((gate, index) => async () => {
    started.push(index);
    active++;
    peak = Math.max(peak, active);
    try {
      return await gate.promise;
    } finally {
      active--;
    }
  });

  const result = settleRuntimeSourceReads(reads);
  await Promise.resolve();
  assert.deepEqual(started, [0, 1]);

  gates[0]!.resolve(10);
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(started, [0, 1, 2]);
  gates[2]!.resolve(30);
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(started, [0, 1, 2, 3]);

  for (const i of [1, 3, 4, 5, 6]) {
    gates[i]!.resolve(i * 10);
  }
  const settled = await result;
  assert.equal(peak, 2);
  assert.deepEqual(started, [0, 1, 2, 3, 4, 5, 6]);
  assert.deepEqual(
    settled.map(entry => entry.status === 'fulfilled' ? entry.value : null),
    [10, 10, 30, 30, 40, 50, 60],
  );
});

test('bounded reads preserve rejected sources and still read other sources', async () => {
  const reasons = ['ok-1', new Error('source-down'), 'ok-3'] as const;
  const settled = await settleRuntimeSourceReads([
    async () => reasons[0],
    async () => { throw reasons[1]; },
    async () => reasons[2],
  ] as const, 1);

  assert.deepEqual(settled[0], { status: 'fulfilled', value: 'ok-1' });
  assert.deepEqual(settled[1], { status: 'rejected', reason: reasons[1] });
  assert.deepEqual(settled[2], { status: 'fulfilled', value: 'ok-3' });
  assert.equal((await settleRuntimeSourceReads([])).length, 0);

  await assert.rejects(
    settleRuntimeSourceReads([async () => 42], 0),
    /concurrency_invalid/,
  );
});

test('overlapping requests share only the in-flight source read', async () => {
  let calls = 0;
  const first = deferred<string>();
  const second = deferred<string>();
  const read = singleFlightRuntimeRead(() => {
    calls++;
    return calls === 1 ? first.promise : second.promise;
  });

  const a = read();
  const b = read();
  assert.equal(a, b);
  await Promise.resolve();
  assert.equal(calls, 1);

  first.resolve('first-evidence');
  assert.equal(await a, 'first-evidence');
  await Promise.resolve();

  const c = read();
  assert.notEqual(a, c);
  await Promise.resolve();
  assert.equal(calls, 2);
  second.resolve('fresh-evidence');
  assert.equal(await c, 'fresh-evidence');
});

test('single-flight failures are not retained for subsequent requests', async () => {
  let count = 0;
  const read = singleFlightRuntimeRead(async () => {
    count++;
    if (count === 1) throw new Error('temporary-read-failure');
    return { fresh: true };
  });
  await assert.rejects(read(), /temporary-read-failure/);
  assert.deepEqual(await read(), { fresh: true });
  assert.equal(count, 2);
});

test('IU runtime keeps individualized generatedAt and single shared Momentum shadow', () => {
  const runtime = readFileSync(
    new URL('../lib/server/product/fandexCurrentRuntimeAssemblyReadiness.ts', import.meta.url),
    'utf8',
  );
  const readiness = readFileSync(
    new URL('../lib/server/product/momentumLiveShadowProductReadiness.ts', import.meta.url),
    'utf8',
  );
  assert.match(runtime, /singleFlightRuntimeRead\(async \(\) =>/);
  assert.match(runtime, /settleRuntimeSourceReads\(\[/);
  assert.match(runtime, /getMomentumLiveShadowProductReadinessForIU\(\s*readMomentumShadowOnce\(\)/);
  assert.match(runtime, /generatedAt:\s*input\.generatedAt \?\? new Date\(\)\.toISOString\(\)/);
  assert.match(readiness, /runtimeShadowRead: Promise<ProductMomentumEvidenceConsensusReadModelResult>/);
  assert.match(readiness, /\[\s*runtimeShadow,\s*sourceAudit,/);
  assert.match(readiness, /\[\s*runtimeShadowRead,\s*readSourceAudit\(\),/);
});
