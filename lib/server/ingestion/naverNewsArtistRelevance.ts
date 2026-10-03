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
  | 'canonical_short_korean_alias_with_english_alias_in_title'
  | 'canonical_short_korean_alias_with_english_alias_in_summary'
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

type CanonicalIdentityAliases = Readonly<{
  strongKoreanAliases: readonly string[];
  shortKoreanAliases: readonly string[];
  englishAliases: readonly string[];
}>;

function canonicalIdentityAliases(canonicalArtistId: string): CanonicalIdentityAliases {
  const artist = getArtistV4ById(canonicalArtistId);
  if (!artist) throw new Error('naver_news_artist_not_found');

  const koreanAliases = [...new Set(
    artist.profile.koreanAliases
      .map((alias) => alias.trim())
      .filter(Boolean),
  )];

  return Object.freeze({
    strongKoreanAliases: Object.freeze(koreanAliases.filter((alias) => [...alias].length >= 2)),
    shortKoreanAliases: Object.freeze(koreanAliases.filter((alias) => [...alias].length === 1)),
    englishAliases: Object.freeze([...new Set(
      artist.profile.englishAliases
        .map((alias) => alias.trim())
        .filter((alias) => [...alias].length >= 2),
    )]),
  });
}

function findAlias(
  content: string,
  aliases: readonly string[],
): string | null {
  return aliases.find((alias) => content.includes(alias)) ?? null;
}

function findEnglishAlias(
  content: string,
  aliases: readonly string[],
): string | null {
  const normalizedContent = content.toLowerCase();
  return aliases.find((alias) => normalizedContent.includes(alias.toLowerCase())) ?? null;
}

function findCorroboratedShortKoreanAlias(
  content: string,
  shortKoreanAliases: readonly string[],
  englishAliases: readonly string[],
): string | null {
  const shortAlias = findAlias(content, shortKoreanAliases);
  if (!shortAlias) return null;
  return findEnglishAlias(content, englishAliases) ? shortAlias : null;
}

export function verifyNaverNewsArtistRelevance(
  candidate: CanonicalNaverNewsObservationCandidate,
): NaverNewsArtistRelevanceVerification {
  const binding = bindCanonicalArtistToNaverNews(candidate.canonicalArtistId);
  if (candidate.provider !== binding.provider) {
    throw new Error('naver_news_artist_relevance_provider_mismatch');
  }
  const aliases = canonicalIdentityAliases(binding.canonicalArtistId);
  const titleAlias = findAlias(candidate.title, aliases.strongKoreanAliases);
  if (titleAlias) {
    return Object.freeze({
      candidateId: candidate.candidateId,
      canonicalArtistId: binding.canonicalArtistId,
      status: 'accepted',
      reason: 'canonical_korean_alias_in_title',
      matchedEvidence: Object.freeze({ field: 'title', alias: titleAlias }),
    });
  }
  const summaryAlias = findAlias(candidate.summary, aliases.strongKoreanAliases);
  if (summaryAlias) {
    return Object.freeze({
      candidateId: candidate.candidateId,
      canonicalArtistId: binding.canonicalArtistId,
      status: 'accepted',
      reason: 'canonical_korean_alias_in_summary',
      matchedEvidence: Object.freeze({ field: 'summary', alias: summaryAlias }),
    });
  }

  const corroboratedTitleAlias = findCorroboratedShortKoreanAlias(
    candidate.title,
    aliases.shortKoreanAliases,
    aliases.englishAliases,
  );
  if (corroboratedTitleAlias) {
    return Object.freeze({
      candidateId: candidate.candidateId,
      canonicalArtistId: binding.canonicalArtistId,
      status: 'accepted',
      reason: 'canonical_short_korean_alias_with_english_alias_in_title',
      matchedEvidence: Object.freeze({ field: 'title', alias: corroboratedTitleAlias }),
    });
  }

  const corroboratedSummaryAlias = findCorroboratedShortKoreanAlias(
    candidate.summary,
    aliases.shortKoreanAliases,
    aliases.englishAliases,
  );
  if (corroboratedSummaryAlias) {
    return Object.freeze({
      candidateId: candidate.candidateId,
      canonicalArtistId: binding.canonicalArtistId,
      status: 'accepted',
      reason: 'canonical_short_korean_alias_with_english_alias_in_summary',
      matchedEvidence: Object.freeze({ field: 'summary', alias: corroboratedSummaryAlias }),
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
