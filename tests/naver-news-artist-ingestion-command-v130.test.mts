import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  buildNaverNewsIngestionCommandFromCanonicalArtist,
} from '../lib/server/ingestion/naverNewsArtistIngestionCommand';
import {
  buildNaverNewsJobIdentity,
  NAVER_NEWS_PROVIDER,
  type NaverNewsIngestionCommand,
} from '../lib/server/ingestion/naverNewsContracts';

const iuInput = Object.freeze({
  canonicalArtistId: 'iu',
  collectionKey: 'test-iu-collection',
  display: 100,
  start: 1,
  sort: 'date' as const,
});

test('IU canonical artist input produces the existing NAVER ingestion command shape', () => {
  assert.deepEqual(buildNaverNewsIngestionCommandFromCanonicalArtist(iuInput), {
    provider: NAVER_NEWS_PROVIDER,
    collectionKey: 'test-iu-collection',
    query: '아이유 IU',
    display: 100,
    start: 1,
    sort: 'date',
  });
});

test('the command adapter reuses the canonical binding path', async () => {
  const adapterPath = new URL('../lib/server/ingestion/naverNewsArtistIngestionCommand.ts', import.meta.url);
  const adapter = await readFile(adapterPath, 'utf8');

  assert.match(adapter, /import \{ bindCanonicalArtistToNaverNews \}/);
  assert.match(adapter, /bindCanonicalArtistToNaverNews\(input\.canonicalArtistId\)/);
  assert.doesNotMatch(adapter, /getArtistV4ById|buildArtistNewsQuery|아이유 IU/);
});

test('unknown canonical artists fail closed without producing an ingestion command', () => {
  assert.throws(
    () => buildNaverNewsIngestionCommandFromCanonicalArtist({ ...iuInput, canonicalArtistId: 'unknown-artist' }),
    /naver_news_artist_not_found/,
  );
});

test('canonical adapter commands preserve the legacy job identity exactly', () => {
  const adapterCommand = buildNaverNewsIngestionCommandFromCanonicalArtist(iuInput);
  const legacyCommand: NaverNewsIngestionCommand = Object.freeze({
    provider: NAVER_NEWS_PROVIDER,
    collectionKey: 'test-iu-collection',
    query: '아이유 IU',
    display: 100,
    start: 1,
    sort: 'date',
  });

  const adapterIdentity = buildNaverNewsJobIdentity(adapterCommand);
  const legacyIdentity = buildNaverNewsJobIdentity(legacyCommand);

  assert.equal(adapterIdentity.jobId, legacyIdentity.jobId);
  assert.equal(adapterIdentity.idempotencyKey, legacyIdentity.idempotencyKey);
  assert.equal(adapterIdentity.requestSha256, legacyIdentity.requestSha256);
  assert.deepEqual(adapterIdentity.request, legacyIdentity.request);
});
