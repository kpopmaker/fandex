import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCanonicalNaverNewsObservationCandidate } from '../lib/server/ingestion/naverNewsObservationCandidate';
import { verifyNaverNewsArtistRelevance } from '../lib/server/ingestion/naverNewsArtistRelevance';
import { promoteCanonicalNaverNewsObservation } from '../lib/server/ingestion/naverNewsCanonicalObservation';
import { adaptCanonicalNaverNewsObservationToArtistReadEntry } from '../lib/server/intelligence/naverCanonicalArtistReadAdapter';
import type { NaverNewsNormalizedRecord } from '../lib/server/ingestion/naverNewsContracts';

function recordFor(artistId: string, title: string): NaverNewsNormalizedRecord {
  const sourceUrl = `https://example.com/${artistId}`;
  return {
    recordId: `record-${artistId}-${title}`,
    rawEvidenceId: `raw-${artistId}-${title}`,
    provider: 'naver-news',
    sourceType: 'news_article',
    sourceUrl,
    naverUrl: null,
    sourceHost: 'example.com',
    title,
    summary: '공식 활동 관련 기사',
    publishedAt: '2026-09-30T00:00:00.000Z',
    collectedAt: '2026-09-30T01:00:00.000Z',
    contentSha256: `content-${artistId}-${title}`,
    recordSha256: `record-sha-${artistId}-${title}`,
    normalizedPayload: {
      provider: 'naver-news',
      sourceType: 'news_article',
      sourceUrl,
      naverUrl: null,
      sourceHost: 'example.com',
      title,
      summary: '공식 활동 관련 기사',
      publishedAt: '2026-09-30T00:00:00.000Z',
    },
  };
}

const cases = [
  { artistId: 'shaun', koreanAlias: '숀', englishAlias: 'SHAUN' },
  { artistId: 'vvon', koreanAlias: '본', englishAlias: 'VVON' },
  { artistId: 'chen', koreanAlias: '첸', englishAlias: 'CHEN' },
] as const;

for (const item of cases) {
  test(`${item.artistId}: one-syllable Korean alias alone remains unknown`, () => {
    const candidate = buildCanonicalNaverNewsObservationCandidate(
      item.artistId,
      recordFor(item.artistId, `${item.koreanAlias} 활동 소식`),
    );
    const relevance = verifyNaverNewsArtistRelevance(candidate);
    assert.equal(relevance.status, 'unknown');
    assert.equal(relevance.reason, 'insufficient_identity_evidence');
    assert.equal(relevance.matchedEvidence, null);
  });

  test(`${item.artistId}: one-syllable Korean alias requires canonical English corroboration`, () => {
    const candidate = buildCanonicalNaverNewsObservationCandidate(
      item.artistId,
      recordFor(item.artistId, `${item.koreanAlias} ${item.englishAlias} 활동 소식`),
    );
    const relevance = verifyNaverNewsArtistRelevance(candidate);
    assert.equal(relevance.status, 'accepted');
    assert.equal(relevance.reason, 'canonical_short_korean_alias_with_english_alias_in_title');
    assert.deepEqual(relevance.matchedEvidence, { field: 'title', alias: item.koreanAlias });

    const observation = promoteCanonicalNaverNewsObservation(candidate, relevance);
    const entry = adaptCanonicalNaverNewsObservationToArtistReadEntry(observation);
    assert.equal(entry.artist.entityId, item.artistId);
    assert.equal(entry.relevance.status, 'accepted');
    assert.equal(entry.relevance.reason, 'canonical_short_korean_alias_with_english_alias_in_title');
  });
}
