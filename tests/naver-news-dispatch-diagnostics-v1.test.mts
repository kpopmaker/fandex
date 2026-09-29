import assert from 'node:assert/strict';
import test from 'node:test';
import { observeNaverNewsDispatchStage } from '../lib/server/ingestion/naverNewsDispatchDiagnostics';

test('sync and async failures preserve error identity and execute once without raw logs', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));
  const secret = new Error('postgresql://user:PRIVATE_TOKEN@host/db SQL RAW_PROVIDER_PAYLOAD');
  for (const asynchronous of [false, true]) {
    logs.length = 0;
    let calls = 0;
    await assert.rejects(observeNaverNewsDispatchStage('mirror_config', () => {
      calls += 1;
      if (asynchronous) return Promise.reject(secret);
      throw secret;
    }), (error: unknown) => error === secret);
    assert.equal(calls, 1);
    assert.deepEqual(logs, [['FANDEX_NAVER_DISPATCH_FAILED_STAGE=mirror_config']]);
  }
});

test('logger exceptions never replace the operational failure', async (t) => {
  t.mock.method(console, 'warn', () => { throw new Error('logger'); });
  const failure = new Error('operation');
  await assert.rejects(observeNaverNewsDispatchStage('pool_close', () => { throw failure; }),
    (error: unknown) => error === failure);
});

test('invalid runtime stage strings cannot enter logs', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const error = new Error('operation');
  await assert.rejects(observeNaverNewsDispatchStage('PRIVATE_TOKEN' as never,
    () => { throw error; }), (caught: unknown) => caught === error);
  assert.equal(warn.mock.callCount(), 0);
});

test('successful return values are preserved without a failure marker', async (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  const result = Object.freeze({ status: 'applied' });
  assert.equal(await observeNaverNewsDispatchStage('database_complete', () => result), result);
  assert.equal(warn.mock.callCount(), 0);
});
