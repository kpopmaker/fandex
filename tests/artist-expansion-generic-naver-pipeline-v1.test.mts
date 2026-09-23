import assert from 'node:assert/strict';
import test from 'node:test';

import { getArtistV4ById } from '../app/data/v4/artistUniverse';
import { bindCanonicalArtistToNaverNews } from '../lib/server/ingestion/naverNewsArtistBinding';
import { verifyNaverNewsArtistRelevance } from '../lib/server/ingestion/naverNewsArtistRelevance';
import { promoteCanonicalNaverNewsObservation } from '../lib/server/ingestion/naverNewsCanonicalObservation';
import { buildCanonicalNaverNewsObservationCandidate } from '../lib/server/ingestion/naverNewsObservationCandidate';
import type { NaverNewsNormalizedRecord } from '../lib/server/ingestion/naverNewsContracts';
import { adaptCanonicalNaverNewsObservationToArtistReadEntry } from '../lib/server/intelligence/naverCanonicalArtistReadAdapter';

function recordFor(alias: string, suffix: string): NaverNewsNormalizedRecord {
  const sourceUrl = `https://example.com/${suffix}`;
  return {
    recordId: `record-${suffix}`,
    rawEvidenceId: `raw-${suffix}`,
    provider: 'naver-news',
    sourceType: 'news_article',
    sourceUrl,
    naverUrl: null,
    sourceHost: 'example.com',
    title: `${alias} 활동 소식`,
    summary: 'artist expansion validation fixture',
    publishedAt: '2026-09-23T00:00:00.000Z',
    collectedAt: '2026-09-23T01:00:00.000Z',
    contentSha256: `content-${suffix}`,
    recordSha256: `record-sha-${suffix}`,
    normalizedPayload: {
      provider: 'naver-news',
      sourceType: 'news_article',
      sourceUrl,
      naverUrl: null,
      sourceHost: 'example.com',
      title: `${alias} 활동 소식`,
      summary: 'artist expansion validation fixture',
      publishedAt: '2026-09-23T00:00:00.000Z',
    },
  };
}

const representativeArtists = [
  ['iu', '아이유'],
  ['txt', '투모로우바이투게더'],
  ['gidle', '여자아이들'],
  ['nct127', '엔시티127'],
  ['jungkook', '정국'],
  ['jennie', '제니'],
] as const;

for (const [artistId, koreanAlias] of representativeArtists) {
  test(`${artistId}: canonical NAVER pipeline preserves artist ownership generically`, () => {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist);
    assert.ok(artist.profile.koreanAliases.includes(koreanAlias));

    const binding = bindCanonicalArtistToNaverNews(artistId);
    assert.equal(binding.canonicalArtistId, artistId);
    assert.equal(binding.provider, 'naver-news');
    assert.ok(binding.query.length > 0);

    const candidate = buildCanonicalNaverNewsObservationCandidate(
      artistId,
      recordFor(koreanAlias, artistId),
    );
    assert.equal(candidate.canonicalArtistId, artistId);

    const relevance = verifyNaverNewsArtistRelevance(candidate);
    assert.equal(relevance.status, 'accepted');
    assert.equal(relevance.canonicalArtistId, artistId);
    assert.deepEqual(relevance.matchedEvidence, { field: 'title', alias: koreanAlias });

    const observation = promoteCanonicalNaverNewsObservation(candidate, relevance);
    const readEntry = adaptCanonicalNaverNewsObservationToArtistReadEntry(observation);

    assert.equal(readEntry.artist.entityId, artistId);
    assert.equal(readEntry.source.providerId, 'naver-news');
    assert.equal(readEntry.time.observedAt, '2026-09-23T00:00:00.000Z');
    assert.equal(readEntry.time.collectedAt, '2026-09-23T01:00:00.000Z');
    assert.equal(readEntry.relevance.status, 'accepted');
    assert.equal(readEntry.semantic.variableId, null);
    assert.equal(readEntry.semantic.metricId, null);
  });
}

test('artist without canonical Korean aliases stays unresolved instead of becoming zero/stable evidence', () => {
  const artist = getArtistV4ById('aespa');
  assert.ok(artist);
  assert.deepEqual(artist.profile.koreanAliases, []);

  const binding = bindCanonicalArtistToNaverNews('aespa');
  assert.equal(binding.canonicalArtistId, 'aespa');
  assert.ok(binding.query.length > 0);

  const candidate = buildCanonicalNaverNewsObservationCandidate(
    'aespa',
    recordFor('aespa', 'aespa'),
  );
  const relevance = verifyNaverNewsArtistRelevance(candidate);

  assert.equal(relevance.status, 'unknown');
  assert.equal(relevance.reason, 'insufficient_identity_evidence');
  assert.equal(relevance.matchedEvidence, null);
  assert.throws(
    () => promoteCanonicalNaverNewsObservation(candidate, relevance),
    /naver_news_canonical_observation_verification_not_accepted/,
  );
});

test('unknown artist fails closed at provider binding', () => {
  assert.throws(
    () => bindCanonicalArtistToNaverNews('artist-does-not-exist'),
    /naver_news_artist_not_found/,
  );
});
