import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
  new URL(
    '../lib/server/product/musicAlbumReportedWebStoredEvidenceRuntime.ts',
    import.meta.url,
  ),
  'utf8',
);

test('music album reported-web server reader is Production-only and never falls back to repository research', () => {
  assert.match(source, /import 'server-only'/);
  assert.match(source, /FANDEX_PRODUCT_RUNTIME_ENV/);
  assert.match(source, /VERCEL_ENV/);
  assert.match(source, /production/);
  assert.match(
    source,
    /music_album_reported_web_runtime_not_production/,
  );
  assert.match(
    source,
    /durable-stored-evidence-runtime-unavailable/,
  );
  assert.doesNotMatch(
    source,
    /reported_album_sales_web_seed_v1\.json/,
  );
});

test('dedicated music album Blob binding is explicit and supports token or OIDC read credentials', () => {
  assert.match(
    source,
    /FANDEX_MUSIC_ALBUM_EVIDENCE_BLOB_STORE_ID/,
  );
  assert.match(source, /BLOB_READ_WRITE_TOKEN/);
  assert.match(source, /VERCEL_OIDC_TOKEN/);
  assert.match(source, /BLOB_STORE_ID/);
  assert.match(
    source,
    /createVercelBlobTextReadStore/,
  );
  assert.match(
    source,
    /resolveMusicAlbumReportedWebBlobConfig/,
  );
});

test('server reader is read-only and preserves missing evidence separately from runtime unavailability', () => {
  assert.match(
    source,
    /readReportedAlbumSalesStoredEvidenceRuntime/,
  );
  assert.match(
    source,
    /durable-stored-evidence-not-found/,
  );
  assert.match(
    source,
    /durable-stored-evidence-runtime-unavailable/,
  );
  assert.doesNotMatch(source, /putTextIfAbsent/);
  assert.doesNotMatch(
    source,
    /from '@vercel\/blob';[\s\S]*\bput\b/,
  );
});
