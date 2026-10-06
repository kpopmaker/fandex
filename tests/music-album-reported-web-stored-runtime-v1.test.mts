import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createProductionMusicAlbumReportedWebReadStore,
  getMusicAlbumReportedWebStoredEvidenceCurrentRuntimeForIU,
  resolveMusicAlbumReportedWebBlobConfig,
} from '../lib/server/product/musicAlbumReportedWebStoredEvidenceRuntime';
import type {
  VercelBlobSdkPort,
} from '../lib/server/storage/vercelBlobImmutableTextObjectStore';

const emptyClient: Pick<VercelBlobSdkPort, 'get' | 'list'> =
  Object.freeze({
    async get() {
      return null;
    },
    async list() {
      return {
        blobs: [],
        hasMore: false,
      };
    },
  });

test('music album reported-web runtime requires an explicit Production runtime marker', () => {
  assert.throws(
    () =>
      createProductionMusicAlbumReportedWebReadStore(
        {
          BLOB_READ_WRITE_TOKEN: 'test-token',
        },
        emptyClient,
      ),
    /runtime_not_production/,
  );
});

test('dedicated music album Blob store binding is preferred over generic store id', () => {
  const config = resolveMusicAlbumReportedWebBlobConfig({
    BLOB_READ_WRITE_TOKEN: 'test-token',
    FANDEX_MUSIC_ALBUM_EVIDENCE_BLOB_STORE_ID:
      'store-music-album',
    BLOB_STORE_ID: 'store-generic',
  });

  assert.equal(config.token, 'test-token');
  assert.equal(config.oidcToken, null);
  assert.equal(config.storeId, 'store-music-album');
});

test('Production runtime with no durable objects remains unavailable rather than returning an empty success', async () => {
  const result =
    await getMusicAlbumReportedWebStoredEvidenceCurrentRuntimeForIU(
      {
        FANDEX_PRODUCT_RUNTIME_ENV: 'production',
        BLOB_READ_WRITE_TOKEN: 'test-token',
        FANDEX_MUSIC_ALBUM_EVIDENCE_BLOB_STORE_ID:
          'store-music-album',
      },
      {
        client: emptyClient,
      },
    );

  assert.equal(result.status, 'unavailable');
  if (result.status !== 'unavailable') return;
  assert.equal(result.reason, 'durable-stored-evidence-not-found');
});

test('missing Production credentials fail closed as unavailable without falling back to repository research data', async () => {
  const result =
    await getMusicAlbumReportedWebStoredEvidenceCurrentRuntimeForIU(
      {
        FANDEX_PRODUCT_RUNTIME_ENV: 'production',
      },
      {
        client: emptyClient,
      },
    );

  assert.equal(result.status, 'unavailable');
  if (result.status !== 'unavailable') return;
  assert.equal(result.reason, 'stored-evidence-not-found');
});
