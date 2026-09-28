import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createVercelBlobImmutableTextObjectStore,
  resolveVercelBlobPrivateStoreConfig,
  type VercelBlobSdkPort,
} from '../lib/server/storage/vercelBlobImmutableTextObjectStore';

function streamOf(value: string): ReadableStream<Uint8Array> {
  const encoded = new TextEncoder().encode(value);
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoded);
      controller.close();
    },
  });
}

function fakeClient() {
  const values = new Map<string, string>();
  const getCalls: unknown[] = [];
  const listCalls: unknown[] = [];
  const putCalls: unknown[] = [];

  const client: VercelBlobSdkPort = {
    async get(pathname, options) {
      getCalls.push({ pathname, options });
      const body = values.get(pathname);
      return body === undefined ? null : { stream: streamOf(body) };
    },
    async list(options) {
      listCalls.push(options);
      const all = [...values.keys()]
        .filter((pathname) => pathname.startsWith(options.prefix))
        .sort();
      const start = options.cursor ? Number(options.cursor) : 0;
      const page = all.slice(start, start + 2);
      const next = start + page.length;
      return {
        blobs: page.map((pathname) => ({ pathname })),
        hasMore: next < all.length,
        ...(next < all.length ? { cursor: String(next) } : {}),
      };
    },
    async put(pathname, body, options) {
      putCalls.push({ pathname, body, options });
      if (values.has(pathname)) {
        throw new Error('blob_already_exists');
      }
      values.set(pathname, body);
      return { pathname };
    },
  };

  return { client, values, getCalls, listCalls, putCalls };
}

test('static Blob token config is accepted without exposing token semantics', () => {
  const config = resolveVercelBlobPrivateStoreConfig({
    BLOB_READ_WRITE_TOKEN: 'secret-token',
    FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID: 'store_123',
  });

  assert.deepEqual(config, {
    token: 'secret-token',
    oidcToken: null,
    storeId: 'store_123',
  });
});

test('OIDC config requires an explicit Blob store id', () => {
  assert.throws(
    () => resolveVercelBlobPrivateStoreConfig({
      VERCEL_OIDC_TOKEN: 'oidc-secret',
    }),
    /naver_evidence_blob_credentials_missing/,
  );

  assert.deepEqual(
    resolveVercelBlobPrivateStoreConfig({
      VERCEL_OIDC_TOKEN: 'oidc-secret',
      FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID: 'store_123',
    }),
    {
      token: null,
      oidcToken: 'oidc-secret',
      storeId: 'store_123',
    },
  );
});

test('private read bypasses cache and returns exact text', async () => {
  const fake = fakeClient();
  fake.values.set('fandex/naver/a.json', '{"a":1}');
  const store = createVercelBlobImmutableTextObjectStore(
    fake.client,
    {
      token: 'secret-token',
      oidcToken: null,
      storeId: 'store_123',
    },
  );

  assert.equal(
    await store.readText('fandex/naver/a.json'),
    '{"a":1}',
  );
  assert.deepEqual(fake.getCalls[0], {
    pathname: 'fandex/naver/a.json',
    options: {
      access: 'private',
      token: 'secret-token',
      storeId: 'store_123',
      useCache: false,
    },
  });
});

test('list paginates all private Blob objects under the exact prefix', async () => {
  const fake = fakeClient();
  for (const pathname of [
    'fandex/naver/a.json',
    'fandex/naver/b.json',
    'fandex/naver/c.json',
    'fandex/other/d.json',
  ]) {
    fake.values.set(pathname, pathname);
  }

  const store = createVercelBlobImmutableTextObjectStore(
    fake.client,
    {
      token: 'secret-token',
      oidcToken: null,
      storeId: null,
    },
  );

  assert.deepEqual(
    await store.listPathnames('fandex/naver/'),
    [
      'fandex/naver/a.json',
      'fandex/naver/b.json',
      'fandex/naver/c.json',
    ],
  );
  assert.equal(fake.listCalls.length, 2);
});

test('put is private, deterministic, and overwrite-disabled', async () => {
  const fake = fakeClient();
  const store = createVercelBlobImmutableTextObjectStore(
    fake.client,
    {
      token: 'secret-token',
      oidcToken: null,
      storeId: 'store_123',
    },
  );

  assert.deepEqual(
    await store.putTextIfAbsent(
      'fandex/naver/a.json',
      '{"a":1}',
    ),
    { status: 'created', pathname: 'fandex/naver/a.json' },
  );

  assert.deepEqual(fake.putCalls[0], {
    pathname: 'fandex/naver/a.json',
    body: '{"a":1}',
    options: {
      access: 'private',
      token: 'secret-token',
      storeId: 'store_123',
      addRandomSuffix: false,
      allowOverwrite: false,
      contentType: 'application/json; charset=utf-8',
    },
  });

  assert.deepEqual(
    await store.putTextIfAbsent(
      'fandex/naver/a.json',
      '{"a":1}',
    ),
    { status: 'idempotent-existing', pathname: 'fandex/naver/a.json' },
  );
  assert.equal(fake.putCalls.length, 1);

  assert.deepEqual(
    await store.putTextIfAbsent(
      'fandex/naver/a.json',
      '{"a":2}',
    ),
    { status: 'conflict', pathname: 'fandex/naver/a.json' },
  );
  assert.equal(fake.putCalls.length, 1);
});

test('concurrent identical writer is classified idempotently after put failure', async () => {
  const fake = fakeClient();
  let firstPut = true;
  const client: VercelBlobSdkPort = {
    ...fake.client,
    async put(pathname, body) {
      if (firstPut) {
        firstPut = false;
        fake.values.set(pathname, body);
        throw new Error('concurrent_write');
      }
      throw new Error('unexpected_second_put');
    },
  };

  const store = createVercelBlobImmutableTextObjectStore(
    client,
    {
      token: 'secret-token',
      oidcToken: null,
      storeId: null,
    },
  );

  assert.deepEqual(
    await store.putTextIfAbsent(
      'fandex/naver/race.json',
      '{"race":true}',
    ),
    {
      status: 'idempotent-existing',
      pathname: 'fandex/naver/race.json',
    },
  );
});

test('invalid path and missing credentials fail closed before remote writes', async () => {
  assert.throws(
    () => createVercelBlobImmutableTextObjectStore(
      fakeClient().client,
      { token: null, oidcToken: null, storeId: null },
    ),
    /naver_evidence_blob_credentials_missing/,
  );

  const fake = fakeClient();
  const store = createVercelBlobImmutableTextObjectStore(
    fake.client,
    {
      token: 'secret-token',
      oidcToken: null,
      storeId: null,
    },
  );

  await assert.rejects(
    () => store.putTextIfAbsent('../escape.json', '{}'),
    /naver_evidence_blob_pathname_invalid/,
  );
  assert.equal(fake.putCalls.length, 0);
});
