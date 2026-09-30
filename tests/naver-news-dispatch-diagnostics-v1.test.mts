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
    assert.deepEqual(logs, [
      [`FANDEX_NAVER_DATABASE_FAILED_OPERATION=job_insert`],
      [`FANDEX_NAVER_DATABASE_ERROR_CLASS=${expected}`],
      ...(expected === 'other_database_error' ? [
        ['FANDEX_NAVER_DATABASE_ERROR_ROOT=error'],
        ['FANDEX_NAVER_DATABASE_ERROR_CODE_SHAPE=string'],
        ['FANDEX_NAVER_DATABASE_ERROR_CODE_FAMILY_SHAPE=upper_token_like'],
        ['FANDEX_NAVER_DATABASE_ERROR_MESSAGE_SHAPE=string'],
        ['FANDEX_NAVER_DATABASE_ERROR_CAUSE_SHAPE=absent'],
        ['FANDEX_NAVER_DATABASE_ERROR_ERRORS_SHAPE=absent'],
      ] : []),
    ]);
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

test('nested aggregate and cause database codes are classified without exposing nested error text', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));

  const nestedTimeout = Object.assign(new Error('PRIVATE_NESTED_TIMEOUT_DETAIL'), {
    code: 'ERR_SOCKET_CONNECTION_TIMEOUT',
  });
  const aggregate = new AggregateError(
    [new Error('PRIVATE_OUTER_DETAIL'), nestedTimeout],
    'PRIVATE_AGGREGATE_DETAIL',
  );

  await assert.rejects(
    observeNaverNewsDatabaseOperation('connect', () => Promise.reject(aggregate)),
    (error: unknown) => error === aggregate,
  );
  assert.deepEqual(logs, [
    ['FANDEX_NAVER_DATABASE_FAILED_OPERATION=connect'],
    ['FANDEX_NAVER_DATABASE_ERROR_CLASS=connection_timeout'],
  ]);
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_/);

  logs.length = 0;
  const cause = Object.assign(new Error('PRIVATE_TLS_DETAIL'), {
    code: 'ERR_TLS_CERT_ALTNAME_INVALID',
  });
  const outer = Object.assign(new Error('PRIVATE_WRAPPER_DETAIL'), { cause });

  await assert.rejects(
    observeNaverNewsDatabaseOperation('connect', () => { throw outer; }),
    (error: unknown) => error === outer,
  );
  assert.deepEqual(logs, [
    ['FANDEX_NAVER_DATABASE_FAILED_OPERATION=connect'],
    ['FANDEX_NAVER_DATABASE_ERROR_CLASS=tls_failure'],
  ]);
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_/);
});

test('database error graph traversal is bounded and cycle-safe', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));
  const cyclic: { cause?: unknown; errors?: unknown[] } = {};
  cyclic.cause = cyclic;
  cyclic.errors = [cyclic];

  await assert.rejects(
    observeNaverNewsDatabaseOperation('connect', () => { throw cyclic; }),
    (error: unknown) => error === cyclic,
  );
  assert.deepEqual(logs, [
    ['FANDEX_NAVER_DATABASE_FAILED_OPERATION=connect'],
    ['FANDEX_NAVER_DATABASE_ERROR_CLASS=other_database_error'],
    ['FANDEX_NAVER_DATABASE_ERROR_ROOT=object'],
    ['FANDEX_NAVER_DATABASE_ERROR_CODE_SHAPE=absent'],
    ['FANDEX_NAVER_DATABASE_ERROR_CODE_FAMILY_SHAPE=absent'],
    ['FANDEX_NAVER_DATABASE_ERROR_MESSAGE_SHAPE=absent'],
    ['FANDEX_NAVER_DATABASE_ERROR_CAUSE_SHAPE=present'],
    ['FANDEX_NAVER_DATABASE_ERROR_ERRORS_SHAPE=array'],
  ]);
});

test('extended verifier-safe connection codes remain bounded classes', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));
  const cases = [
    ['EAI_AGAIN', 'dns_failure'],
    ['EPIPE', 'connection_reset'],
    ['ERR_TLS_HANDSHAKE_TIMEOUT', 'tls_failure'],
    ['ERR_TLS_CERT_ALTNAME_INVALID', 'tls_failure'],
    ['DEPTH_ZERO_SELF_SIGNED_CERT', 'tls_failure'],
    ['57P03', 'server_unavailable'],
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

test('known pg pool code-less connect messages map to bounded classes without logging raw messages', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));
  const cases = [
    ['timeout exceeded when trying to connect', 'connection_timeout'],
    ['Connection terminated due to connection timeout', 'connection_timeout'],
    ['Connection terminated unexpectedly', 'connection_reset'],
  ] as const;

  for (const [message, expected] of cases) {
    logs.length = 0;
    const failure = new Error(message);
    await assert.rejects(
      observeNaverNewsDatabaseOperation('connect', () => Promise.reject(failure)),
      (error: unknown) => error === failure,
    );
    assert.deepEqual(logs, [
      ['FANDEX_NAVER_DATABASE_FAILED_OPERATION=connect'],
      [`FANDEX_NAVER_DATABASE_ERROR_CLASS=${expected}`],
    ]);
    assert.equal(JSON.stringify(logs).includes(message), false);
  }
});

test('unknown code-less database messages remain other_database_error and are never logged', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));
  const secretMessage = 'postgresql://fandex_runtime:PRIVATE_SECRET@private.example/neondb';
  const failure = new Error(secretMessage);
  await assert.rejects(
    observeNaverNewsDatabaseOperation('connect', () => { throw failure; }),
    (error: unknown) => error === failure,
  );
  assert.deepEqual(logs, [
    ['FANDEX_NAVER_DATABASE_FAILED_OPERATION=connect'],
    ['FANDEX_NAVER_DATABASE_ERROR_CLASS=other_database_error'],
    ['FANDEX_NAVER_DATABASE_ERROR_ROOT=error'],
    ['FANDEX_NAVER_DATABASE_ERROR_CODE_SHAPE=absent'],
    ['FANDEX_NAVER_DATABASE_ERROR_CODE_FAMILY_SHAPE=absent'],
    ['FANDEX_NAVER_DATABASE_ERROR_MESSAGE_SHAPE=string'],
    ['FANDEX_NAVER_DATABASE_ERROR_CAUSE_SHAPE=absent'],
    ['FANDEX_NAVER_DATABASE_ERROR_ERRORS_SHAPE=absent'],
  ]);
  assert.equal(JSON.stringify(logs).includes(secretMessage), false);
});

test('known pg connect error families map to bounded classes without logging raw messages', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));

  const cases = [
    ['SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string', 'sasl_failure'],
    ['SASL: SCRAM-SERVER-FINAL-MESSAGE: server signature does not match', 'sasl_failure'],
    ['The server does not support SSL connections', 'tls_failure'],
    ['There was an error establishing an SSL connection', 'tls_failure'],
    ['Invalid sslnegotiation value: "PRIVATE_VALUE". Valid values are "postgres" and "direct".', 'ssl_negotiation_invalid'],
    ['sslnegotiation=direct requires SSL to be enabled', 'ssl_negotiation_invalid'],
    ['Password must be a string', 'credential_material_invalid'],
    ['timeout expired', 'connection_timeout'],
    ['Connection terminated', 'connection_reset'],
  ] as const;

  for (const [message, expected] of cases) {
    logs.length = 0;
    const failure = new Error(message);
    await assert.rejects(
      observeNaverNewsDatabaseOperation('connect', () => Promise.reject(failure)),
      (error: unknown) => error === failure,
    );
    assert.deepEqual(logs, [
      ['FANDEX_NAVER_DATABASE_FAILED_OPERATION=connect'],
      [`FANDEX_NAVER_DATABASE_ERROR_CLASS=${expected}`],
    ]);
    assert.equal(JSON.stringify(logs).includes(message), false);
    assert.equal(JSON.stringify(logs).includes('PRIVATE_VALUE'), false);
  }
});

test('unknown pg connect messages remain other_database_error', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));
  const failure = new Error('PRIVATE_UNCLASSIFIED_CONNECT_DETAIL');

  await assert.rejects(
    observeNaverNewsDatabaseOperation('connect', () => Promise.reject(failure)),
    (error: unknown) => error === failure,
  );
  assert.deepEqual(logs, [
    ['FANDEX_NAVER_DATABASE_FAILED_OPERATION=connect'],
    ['FANDEX_NAVER_DATABASE_ERROR_CLASS=other_database_error'],
    ['FANDEX_NAVER_DATABASE_ERROR_ROOT=error'],
    ['FANDEX_NAVER_DATABASE_ERROR_CODE_SHAPE=absent'],
    ['FANDEX_NAVER_DATABASE_ERROR_CODE_FAMILY_SHAPE=absent'],
    ['FANDEX_NAVER_DATABASE_ERROR_MESSAGE_SHAPE=string'],
    ['FANDEX_NAVER_DATABASE_ERROR_CAUSE_SHAPE=absent'],
    ['FANDEX_NAVER_DATABASE_ERROR_ERRORS_SHAPE=absent'],
  ]);
  assert.equal(JSON.stringify(logs).includes('PRIVATE_UNCLASSIFIED_CONNECT_DETAIL'), false);
});

test('bounded unknown database error shape never emits raw values', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));
  const nested = new Error('PRIVATE_NESTED_MESSAGE');
  const failure = Object.assign(new TypeError('PRIVATE_ROOT_MESSAGE'), {
    code: 12345,
    cause: nested,
    errors: 'PRIVATE_NOT_ARRAY',
  });

  await assert.rejects(
    observeNaverNewsDatabaseOperation('connect', () => Promise.reject(failure)),
    (error: unknown) => error === failure,
  );

  assert.deepEqual(logs, [
    ['FANDEX_NAVER_DATABASE_FAILED_OPERATION=connect'],
    ['FANDEX_NAVER_DATABASE_ERROR_CLASS=other_database_error'],
    ['FANDEX_NAVER_DATABASE_ERROR_ROOT=type_error'],
    ['FANDEX_NAVER_DATABASE_ERROR_CODE_SHAPE=other'],
    ['FANDEX_NAVER_DATABASE_ERROR_CODE_FAMILY_SHAPE=other'],
    ['FANDEX_NAVER_DATABASE_ERROR_MESSAGE_SHAPE=string'],
    ['FANDEX_NAVER_DATABASE_ERROR_CAUSE_SHAPE=present'],
    ['FANDEX_NAVER_DATABASE_ERROR_ERRORS_SHAPE=other'],
  ]);
  assert.doesNotMatch(JSON.stringify(logs), /PRIVATE_/);
});

test('standard SQLSTATE classes and Node network errors map to bounded connect classes', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));
  const cases = [
    ['28000', 'authentication_failed'],
    ['08005', 'connection_exception'],
    ['ENETUNREACH', 'network_unreachable'],
    ['EHOSTUNREACH', 'host_unreachable'],
    ['EHOSTDOWN', 'host_unreachable'],
    ['ENETDOWN', 'network_unavailable'],
    ['EADDRNOTAVAIL', 'address_unavailable'],
    ['ENETRESET', 'connection_reset'],
    ['ECONNABORTED', 'connection_aborted'],
    ['ERR_SSL_WRONG_VERSION_NUMBER', 'tls_failure'],
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
    assert.equal(JSON.stringify(logs).includes(code), false);
    assert.equal(JSON.stringify(logs).includes('PRIVATE_DATABASE_DETAIL'), false);
  }
});

test('arbitrary lookalike codes do not enter SQLSTATE or TLS families', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));
  const cases = [
    ['08PRIVATE', 'other_string'],
    ['28_SECRET', 'other_string'],
    ['ERR_PRIVATE_TLS', 'node_error_like'],
  ] as const;
  for (const [code, family] of cases) {
    logs.length = 0;
    const failure = Object.assign(new Error('PRIVATE_DATABASE_DETAIL'), { code });
    await assert.rejects(
      observeNaverNewsDatabaseOperation('connect', () => { throw failure; }),
      (error: unknown) => error === failure,
    );
    assert.deepEqual(logs, [
      ['FANDEX_NAVER_DATABASE_FAILED_OPERATION=connect'],
      ['FANDEX_NAVER_DATABASE_ERROR_CLASS=other_database_error'],
      ['FANDEX_NAVER_DATABASE_ERROR_ROOT=error'],
      ['FANDEX_NAVER_DATABASE_ERROR_CODE_SHAPE=string'],
      [`FANDEX_NAVER_DATABASE_ERROR_CODE_FAMILY_SHAPE=${family}`],
      ['FANDEX_NAVER_DATABASE_ERROR_MESSAGE_SHAPE=string'],
      ['FANDEX_NAVER_DATABASE_ERROR_CAUSE_SHAPE=absent'],
      ['FANDEX_NAVER_DATABASE_ERROR_ERRORS_SHAPE=absent'],
    ]);
  }
});

test('unknown string database codes emit only bounded family shapes', async (t) => {
  const logs: unknown[][] = [];
  t.mock.method(console, 'warn', (...args: unknown[]) => logs.push(args));
  const cases = [
    ['53300', 'sqlstate_like'],
    ['ERR_TLS_PRIVATE_DETAIL', 'node_tls_like'],
    ['ERR_OSSL_PRIVATE_DETAIL', 'node_ossl_like'],
    ['ERR_PRIVATE_DETAIL', 'node_error_like'],
    ['EPROTO', 'node_errno_like'],
    ['CERT_PRIVATE_DETAIL', 'upper_token_like'],
    ['private-code', 'other_string'],
  ] as const;

  for (const [code, family] of cases) {
    logs.length = 0;
    const failure = Object.assign(new Error('PRIVATE_DATABASE_DETAIL'), { code });
    await assert.rejects(
      observeNaverNewsDatabaseOperation('connect', () => Promise.reject(failure)),
      (error: unknown) => error === failure,
    );
    assert.deepEqual(logs, [
      ['FANDEX_NAVER_DATABASE_FAILED_OPERATION=connect'],
      ['FANDEX_NAVER_DATABASE_ERROR_CLASS=other_database_error'],
      ['FANDEX_NAVER_DATABASE_ERROR_ROOT=error'],
      ['FANDEX_NAVER_DATABASE_ERROR_CODE_SHAPE=string'],
      [`FANDEX_NAVER_DATABASE_ERROR_CODE_FAMILY_SHAPE=${family}`],
      ['FANDEX_NAVER_DATABASE_ERROR_MESSAGE_SHAPE=string'],
      ['FANDEX_NAVER_DATABASE_ERROR_CAUSE_SHAPE=absent'],
      ['FANDEX_NAVER_DATABASE_ERROR_ERRORS_SHAPE=absent'],
    ]);
    assert.equal(JSON.stringify(logs).includes(code), false);
    assert.equal(JSON.stringify(logs).includes('PRIVATE_DATABASE_DETAIL'), false);
  }
});

