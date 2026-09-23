import assert from 'node:assert/strict';
import test from 'node:test';

import { artistUniverseV4 } from '../app/data/v4/artistUniverse';
import { buildCanonicalNaverNewsObservationCandidate } from '../lib/server/ingestion/naverNewsObservationCandidate';
import { verifyNaverNewsArtistRelevance } from '../lib/server/ingestion/naverNewsArtistRelevance';
import { promoteCanonicalNaverNewsObservation } from '../lib/server/ingestion/naverNewsCanonicalObservation';
import { adaptCanonicalNaverNewsObservationToArtistReadEntry } from '../lib/server/intelligence/naverCanonicalArtistReadAdapter';
import type { NaverNewsNormalizedRecord } from '../lib/server/ingestion/naverNewsContracts';

function recordFor(artistId: string, alias: string): NaverNewsNormalizedRecord {
  const sourceUrl = `https://example.com/${artistId}`;
  return {
    recordId: `record-${artistId}`,
    rawEvidenceId: `raw-${artistId}`,
    provider: 'naver-news',
    sourceType: 'news_article',
    sourceUrl,
    naverUrl: null,
    sourceHost: 'example.com',
    title: `${alias} 활동 소식`,
    summary: `${alias} 공식 활동 관련 기사`,
    publishedAt: '2026-09-23T00:00:00.000Z',
    collectedAt: '2026-09-23T01:00:00.000Z',
    contentSha256: `content-${artistId}`,
    recordSha256: `record-sha-${artistId}`,
    normalizedPayload: {
      provider: 'naver-news',
      sourceType: 'news_article',
      sourceUrl,
      naverUrl: null,
      sourceHost: 'example.com',
      title: `${alias} 활동 소식`,
      summary: `${alias} 공식 활동 관련 기사`,
      publishedAt: '2026-09-23T00:00:00.000Z',
    },
  };
}

for (const artist of artistUniverseV4) {
  test(`${artist.id}: full generic NAVER artist pipeline preserves canonical identity`, () => {
    const alias = artist.profile.koreanAliases.find((value) => [...value].length >= 2);
    assert.ok(alias, `${artist.id} missing canonical Korean alias`);
    assert.ok(artist.profile.naverNewsQuery?.trim(), `${artist.id} missing explicit NAVER query`);

    const candidate = buildCanonicalNaverNewsObservationCandidate(
      artist.id,
      recordFor(artist.id, alias),
    );
    const relevance = verifyNaverNewsArtistRelevance(candidate);
    assert.equal(relevance.status, 'accepted');
    assert.equal(relevance.canonicalArtistId, artist.id);

    const observation = promoteCanonicalNaverNewsObservation(candidate, relevance);
    const entry = adaptCanonicalNaverNewsObservationToArtistReadEntry(observation);

    assert.equal(entry.artist.entityId, artist.id);
    assert.equal(entry.source.providerId, 'naver-news');
    assert.equal(entry.relevance.status, 'accepted');
    assert.equal(entry.semantic.variableId, null);
    assert.equal(entry.semantic.metricId, null);
  });
}
