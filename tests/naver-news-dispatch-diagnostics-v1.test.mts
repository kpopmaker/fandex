import assert from 'node:assert/strict';
import test from 'node:test';
import { observeNaverNewsDatabaseOperation, observeNaverNewsDispatchStage } from '../lib/server/ingestion/naverNewsDispatchDiagnostics';

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

test('database SQLSTATE is reduced to a fixed safe class without logging raw error content', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));
  const cases = [
    ['42P01', 'undefined_table'],
    ['42501', 'insufficient_privilege'],
    ['3F000', 'invalid_schema'],
    ['42703', 'undefined_column'],
    ['28P01', 'authentication_failed'],
    ['08006', 'connection_exception'],
    ['PRIVATE_TOKEN', 'other_database_error'],
  ] as const;
  for (const [code, expected] of cases) {
    logs.length = 0;
    const failure = Object.assign(
      new Error('postgresql://secret@example.test/neondb SQL RAW_PROVIDER_PAYLOAD'),
      { code },
    );
    await assert.rejects(
      observeNaverNewsDatabaseOperation('job_insert', () => { throw failure; }),
      (error: unknown) => error === failure,
    );
    assert.deepEqual(logs, [[`FANDEX_NAVER_DATABASE_FAILED_OPERATION=job_insert`], [`FANDEX_NAVER_DATABASE_ERROR_CLASS=${expected}`]]);
    assert.equal(JSON.stringify(logs).includes('secret'), false);
    assert.equal(JSON.stringify(logs).includes('RAW_PROVIDER_PAYLOAD'), false);
    assert.equal(JSON.stringify(logs).includes(code), false);
  }
});

test('database diagnostic logger failure preserves the original database error', async (t) => {
  t.mock.method(console, 'warn', () => { throw new Error('logger unavailable'); });
  const failure = Object.assign(new Error('database raw detail'), { code: '42P01' });
  await assert.rejects(
    observeNaverNewsDatabaseOperation('connect', () => Promise.reject(failure)),
    (error: unknown) => error === failure,
  );
});

test('database node connection codes are reduced to safe classes and operation names', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));
  const cases = [
    ['ENOTFOUND', 'dns_failure'],
    ['ECONNREFUSED', 'connection_refused'],
    ['ETIMEDOUT', 'connection_timeout'],
    ['ECONNRESET', 'connection_reset'],
    ['SELF_SIGNED_CERT_IN_CHAIN', 'tls_failure'],
  ] as const;
  for (const [code, expected] of cases) {
    logs.length = 0;
    const failure = Object.assign(new Error('PRIVATE_DATABASE_DETAIL'), { code });
    await assert.rejects(
      observeNaverNewsDatabaseOperation('connect', () => Promise.reject(failure)),
      (error: unknown) => error === failure,
    );
    assert.deepEqual(logs, [
      ['FANDEX_NAVER_DATABASE_FAILED_OPERATION=connect'],
      [`FANDEX_NAVER_DATABASE_ERROR_CLASS=${expected}`],
    ]);
  }
});

test('invalid runtime database operation names cannot enter logs', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));
  const failure = Object.assign(new Error('PRIVATE_DATABASE_DETAIL'), { code: '42P01' });
  await assert.rejects(
    observeNaverNewsDatabaseOperation('PRIVATE_OPERATION' as never, () => { throw failure; }),
    (error: unknown) => error === failure,
  );
  assert.deepEqual(logs, [['FANDEX_NAVER_DATABASE_ERROR_CLASS=undefined_table']]);
});
