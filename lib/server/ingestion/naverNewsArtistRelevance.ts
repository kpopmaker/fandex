import { getArtistV4ById } from '@/app/data/v4/artistUniverse';

import { bindCanonicalArtistToNaverNews } from './naverNewsArtistBinding';
import type { CanonicalNaverNewsObservationCandidate } from './naverNewsObservationCandidate';

export type NaverNewsArtistRelevanceStatus =
  | 'accepted'
  | 'rejected'
  | 'unknown';

export type NaverNewsArtistRelevanceReason =
  | 'canonical_korean_alias_in_title'
  | 'canonical_korean_alias_in_summary'
  | 'insufficient_identity_evidence';

export type NaverNewsArtistRelevanceEvidence = Readonly<{
  field: 'title' | 'summary';
  alias: string;
}>;

export type NaverNewsArtistRelevanceVerification = Readonly<{
  candidateId: string;
  canonicalArtistId: string;
  status: NaverNewsArtistRelevanceStatus;
  reason: NaverNewsArtistRelevanceReason;
  matchedEvidence: NaverNewsArtistRelevanceEvidence | null;
}>;

function canonicalKoreanAliases(canonicalArtistId: string): readonly string[] {
  const artist = getArtistV4ById(canonicalArtistId);
  if (!artist) throw new Error('naver_news_artist_not_found');

  return Object.freeze([...new Set(artist.profile.koreanAliases.filter((alias) => [...alias].length >= 2))]);
}

function findKoreanAlias(
  content: string,
  aliases: readonly string[],
): string | null {
  return aliases.find((alias) => content.includes(alias)) ?? null;
}

export function verifyNaverNewsArtistRelevance(
  candidate: CanonicalNaverNewsObservationCandidate,
): NaverNewsArtistRelevanceVerification {
  const binding = bindCanonicalArtistToNaverNews(candidate.canonicalArtistId);
  if (candidate.provider !== binding.provider) {
    throw new Error('naver_news_artist_relevance_provider_mismatch');
  }
  const aliases = canonicalKoreanAliases(binding.canonicalArtistId);
  const titleAlias = findKoreanAlias(candidate.title, aliases);
  if (titleAlias) {
    return Object.freeze({
      candidateId: candidate.candidateId,
      canonicalArtistId: binding.canonicalArtistId,
      status: 'accepted',
      reason: 'canonical_korean_alias_in_title',
      matchedEvidence: Object.freeze({ field: 'title', alias: titleAlias }),
    });
  }
  const summaryAlias = findKoreanAlias(candidate.summary, aliases);
  if (summaryAlias) {
    return Object.freeze({
      candidateId: candidate.candidateId,
      canonicalArtistId: binding.canonicalArtistId,
      status: 'accepted',
      reason: 'canonical_korean_alias_in_summary',
      matchedEvidence: Object.freeze({ field: 'summary', alias: summaryAlias }),
    });
  }

  return Object.freeze({
    candidateId: candidate.candidateId,
    canonicalArtistId: binding.canonicalArtistId,
    status: 'unknown',
    reason: 'insufficient_identity_evidence',
    matchedEvidence: null,
  });
}
