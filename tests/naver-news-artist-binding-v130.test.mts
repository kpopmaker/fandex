import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { getArtistV4ById } from '../app/data/v4/artistUniverse';
import { buildArtistNewsQuery } from '../lib/services/naverNews';
import {
  bindCanonicalArtistToNaverNews,
} from '../lib/server/ingestion/naverNewsArtistBinding';
import { NAVER_NEWS_PROVIDER } from '../lib/server/ingestion/naverNewsContracts';

test('IU canonical artist binding derives the NAVER News query from the existing artist contracts', () => {
  const artist = getArtistV4ById('iu');
  assert.ok(artist);

  const binding = bindCanonicalArtistToNaverNews('iu');
  assert.deepEqual(binding, {
    canonicalArtistId: artist.id,
    provider: NAVER_NEWS_PROVIDER,
    query: buildArtistNewsQuery(artist),
  });
  assert.equal(artist.ticker, 'IU');
  assert.equal(binding.query, '아이유 IU');
});

test('the existing query builder preserves explicit and fallback query semantics', () => {
  const iu = getArtistV4ById('iu');
  const blackpink = getArtistV4ById('blackpink');
  assert.ok(iu);
  assert.ok(blackpink);

  assert.equal(buildArtistNewsQuery(iu), '아이유 IU');
  assert.equal(buildArtistNewsQuery(blackpink), 'BLACKPINK YG Entertainment');
  assert.equal(
    bindCanonicalArtistToNaverNews('blackpink').query,
    buildArtistNewsQuery(blackpink),
  );
});

test('an unknown canonical artist fails closed without a query fallback', () => {
  assert.throws(
    () => bindCanonicalArtistToNaverNews('unknown-artist'),
    /naver_news_artist_not_found/,
  );
});

test('the ingestion request and command contracts retain their query-driven fields', async () => {
  const contractsPath = new URL('../lib/server/ingestion/naverNewsContracts.ts', import.meta.url);
  const contracts = await readFile(contractsPath, 'utf8');

  for (const typeName of ['NaverNewsIngestionCommand', 'NaverNewsRequestContract']) {
    const declaration = contracts.match(new RegExp(`export type ${typeName} = Readonly<\\{([\\s\\S]*?)\\}>;`));
    assert.ok(declaration);
    assert.match(declaration[1], /provider:/);
    assert.match(declaration[1], /collectionKey:/);
    assert.match(declaration[1], /query:/);
    assert.match(declaration[1], /display:/);
    assert.match(declaration[1], /start:/);
    assert.match(declaration[1], /sort:/);
    assert.doesNotMatch(declaration[1], /artistId:/);
  }
});
