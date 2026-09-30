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
  | 'canonical_short_korean_alias_with_corroboration_in_title'
  | 'canonical_short_korean_alias_with_corroboration_in_summary'
  | 'insufficient_identity_evidence';

export type NaverNewsArtistRelevanceEvidence = Readonly<{
  field: 'title' | 'summary';
  alias: string;
  corroboration?: string;
}>;

export type NaverNewsArtistRelevanceVerification = Readonly<{
  candidateId: string;
  canonicalArtistId: string;
  status: NaverNewsArtistRelevanceStatus;
  reason: NaverNewsArtistRelevanceReason;
  matchedEvidence: NaverNewsArtistRelevanceEvidence | null;
}>;

function canonicalIdentityEvidence(canonicalArtistId: string): Readonly<{
  strongKoreanAliases: readonly string[];
  shortKoreanAliases: readonly string[];
  corroborationTokens: readonly string[];
}> {
  const artist = getArtistV4ById(canonicalArtistId);
  if (!artist) throw new Error('naver_news_artist_not_found');

  const koreanAliases = [...new Set(
    artist.profile.koreanAliases
      .map((alias) => alias.trim())
      .filter(Boolean),
  )];
  const corroborationTokens = [...new Set(
    [
      ...artist.profile.englishAliases,
      ...artist.profile.disambiguationKeywords,
    ]
      .map((token) => token.trim())
      .filter((token) => [...token].length >= 2),
  )];

  return Object.freeze({
    strongKoreanAliases: Object.freeze(
      koreanAliases.filter((alias) => [...alias].length >= 2),
    ),
    shortKoreanAliases: Object.freeze(
      koreanAliases.filter((alias) => [...alias].length === 1),
    ),
    corroborationTokens: Object.freeze(corroborationTokens),
  });
}

function findKoreanAlias(
  content: string,
  aliases: readonly string[],
): string | null {
  return aliases.find((alias) => content.includes(alias)) ?? null;
}

function findCorroboration(
  content: string,
  tokens: readonly string[],
): string | null {
  const normalizedContent = content.toLowerCase();
  return tokens.find((token) => normalizedContent.includes(token.toLowerCase())) ?? null;
}

function accepted(
  candidate: CanonicalNaverNewsObservationCandidate,
  canonicalArtistId: string,
  field: 'title' | 'summary',
  alias: string,
  reason:
    | 'canonical_korean_alias_in_title'
    | 'canonical_korean_alias_in_summary'
    | 'canonical_short_korean_alias_with_corroboration_in_title'
    | 'canonical_short_korean_alias_with_corroboration_in_summary',
  corroboration?: string,
): NaverNewsArtistRelevanceVerification {
  return Object.freeze({
    candidateId: candidate.candidateId,
    canonicalArtistId,
    status: 'accepted',
    reason,
    matchedEvidence: Object.freeze({
      field,
      alias,
      ...(corroboration ? { corroboration } : {}),
    }),
  });
}

export function verifyNaverNewsArtistRelevance(
  candidate: CanonicalNaverNewsObservationCandidate,
): NaverNewsArtistRelevanceVerification {
  const binding = bindCanonicalArtistToNaverNews(candidate.canonicalArtistId);
  if (candidate.provider !== binding.provider) {
    throw new Error('naver_news_artist_relevance_provider_mismatch');
  }

  const evidence = canonicalIdentityEvidence(binding.canonicalArtistId);
  const titleAlias = findKoreanAlias(candidate.title, evidence.strongKoreanAliases);
  if (titleAlias) {
    return accepted(
      candidate,
      binding.canonicalArtistId,
      'title',
      titleAlias,
      'canonical_korean_alias_in_title',
    );
  }

  const summaryAlias = findKoreanAlias(candidate.summary, evidence.strongKoreanAliases);
  if (summaryAlias) {
    return accepted(
      candidate,
      binding.canonicalArtistId,
      'summary',
      summaryAlias,
      'canonical_korean_alias_in_summary',
    );
  }

  const combinedContent = `${candidate.title}\n${candidate.summary}`;
  const corroboration = findCorroboration(
    combinedContent,
    evidence.corroborationTokens,
  );
  if (corroboration) {
    const shortTitleAlias = findKoreanAlias(
      candidate.title,
      evidence.shortKoreanAliases,
    );
    if (shortTitleAlias) {
      return accepted(
        candidate,
        binding.canonicalArtistId,
        'title',
        shortTitleAlias,
        'canonical_short_korean_alias_with_corroboration_in_title',
        corroboration,
      );
    }

    const shortSummaryAlias = findKoreanAlias(
      candidate.summary,
      evidence.shortKoreanAliases,
    );
    if (shortSummaryAlias) {
      return accepted(
        candidate,
        binding.canonicalArtistId,
        'summary',
        shortSummaryAlias,
        'canonical_short_korean_alias_with_corroboration_in_summary',
        corroboration,
      );
    }
  }

  return Object.freeze({
    candidateId: candidate.candidateId,
    canonicalArtistId: binding.canonicalArtistId,
    status: 'unknown',
    reason: 'insufficient_identity_evidence',
    matchedEvidence: null,
  });
}
