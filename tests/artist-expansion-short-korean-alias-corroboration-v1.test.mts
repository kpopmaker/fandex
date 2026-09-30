import assert from 'node:assert/strict';
import test from 'node:test';

import { getArtistV4ById } from '../app/data/v4/artistUniverse';
import { buildCanonicalNaverNewsObservationCandidate } from '../lib/server/ingestion/naverNewsObservationCandidate';
import { verifyNaverNewsArtistRelevance } from '../lib/server/ingestion/naverNewsArtistRelevance';
import type { NaverNewsNormalizedRecord } from '../lib/server/ingestion/naverNewsContracts';

function recordFor(
  artistId: string,
  title: string,
  summary: string,
): NaverNewsNormalizedRecord {
  const sourceUrl = `https://example.com/short-alias/${artistId}/${encodeURIComponent(title)}`;
  return {
    recordId: `record-${artistId}-${title}`,
    rawEvidenceId: `raw-${artistId}-${title}`,
    provider: 'naver-news',
    sourceType: 'news_article',
    sourceUrl,
    naverUrl: null,
    sourceHost: 'example.com',
    title,
    summary,
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
      summary,
      publishedAt: '2026-09-30T00:00:00.000Z',
    },
  };
}

for (const artistId of ['shaun', 'vvon', 'chen'] as const) {
  test(`${artistId}: one-character Korean alias remains unknown without corroboration`, () => {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist);

    const alias = artist.profile.koreanAliases.find(
      (value) => [...value.trim()].length === 1,
    );
    assert.ok(alias);

    const candidate = buildCanonicalNaverNewsObservationCandidate(
      artistId,
      recordFor(artistId, `${alias} 활동 소식`, `${alias} 공식 활동 관련 기사`),
    );
    const relevance = verifyNaverNewsArtistRelevance(candidate);

    assert.equal(relevance.status, 'unknown');
    assert.equal(relevance.reason, 'insufficient_identity_evidence');
    assert.equal(relevance.matchedEvidence, null);
  });

  test(`${artistId}: one-character Korean alias is accepted with canonical corroboration`, () => {
    const artist = getArtistV4ById(artistId);
    assert.ok(artist);

    const alias = artist.profile.koreanAliases.find(
      (value) => [...value.trim()].length === 1,
    );
    const corroboration =
      artist.profile.englishAliases.find((value) => [...value.trim()].length >= 2)
      ?? artist.profile.disambiguationKeywords.find(
        (value) => [...value.trim()].length >= 2,
      );
    assert.ok(alias);
    assert.ok(corroboration);

    const candidate = buildCanonicalNaverNewsObservationCandidate(
      artistId,
      recordFor(
        artistId,
        `${alias} ${corroboration} 활동 소식`,
        `${alias} 공식 활동 관련 기사`,
      ),
    );
    const relevance = verifyNaverNewsArtistRelevance(candidate);

    assert.equal(relevance.status, 'accepted');
    assert.equal(relevance.canonicalArtistId, artistId);
    assert.equal(
      relevance.reason,
      'canonical_short_korean_alias_with_corroboration_in_title',
    );
    assert.equal(relevance.matchedEvidence?.alias, alias);
    assert.equal(relevance.matchedEvidence?.corroboration, corroboration);
  });
}
