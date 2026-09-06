import {
  sha256Canonical,
  type NaverNewsNormalizedRecord,
} from './naverNewsContracts';
import type { NaverNewsArtistRelevanceVerification } from './naverNewsArtistRelevance';
import type { CanonicalNaverNewsObservationCandidate } from './naverNewsObservationCandidate';

export const NAVER_NEWS_CANONICAL_OBSERVATION_CONTRACT_VERSION = 'v1_canonical_naver_news_observation';

export type CanonicalNaverNewsObservation = Readonly<{
  observationId: string;
  candidateId: string;
  canonicalArtistId: string;
  provider: NaverNewsNormalizedRecord['provider'];
  sourceType: NaverNewsNormalizedRecord['sourceType'];
  canonicalSourceUrl: string;
  observedAt: string;
  collectedAt: string;
  title: string;
  summary: string;
  sourceRecordIds: readonly string[];
  rawEvidenceIds: readonly string[];
  relevanceVerification: Readonly<{
    status: 'accepted';
    reason: NaverNewsArtistRelevanceVerification['reason'];
    matchedEvidence: NaverNewsArtistRelevanceVerification['matchedEvidence'];
  }>;
}>;

function observationIdFor(candidateId: string): string {
  return sha256Canonical({ contractVersion: NAVER_NEWS_CANONICAL_OBSERVATION_CONTRACT_VERSION, candidateId });
}

export function promoteCanonicalNaverNewsObservation(
  candidate: CanonicalNaverNewsObservationCandidate,
  verification: NaverNewsArtistRelevanceVerification,
): CanonicalNaverNewsObservation {
  if (verification.candidateId !== candidate.candidateId) {
    throw new Error('naver_news_canonical_observation_candidate_mismatch');
  }
  if (verification.canonicalArtistId !== candidate.canonicalArtistId) {
    throw new Error('naver_news_canonical_observation_artist_mismatch');
  }
  if (verification.status !== 'accepted') {
    throw new Error('naver_news_canonical_observation_verification_not_accepted');
  }

  return Object.freeze({
    observationId: observationIdFor(candidate.candidateId),
    candidateId: candidate.candidateId,
    canonicalArtistId: candidate.canonicalArtistId,
    provider: candidate.provider,
    sourceType: candidate.sourceType,
    canonicalSourceUrl: candidate.canonicalSourceUrl,
    observedAt: candidate.publishedAt,
    collectedAt: candidate.collectedAt,
    title: candidate.title,
    summary: candidate.summary,
    sourceRecordIds: Object.freeze([...candidate.sourceRecordIds]),
    rawEvidenceIds: Object.freeze([...candidate.rawEvidenceIds]),
    relevanceVerification: Object.freeze({
      status: verification.status,
      reason: verification.reason,
      matchedEvidence: verification.matchedEvidence === null
        ? null
        : Object.freeze({ ...verification.matchedEvidence }),
    }),
  });
}
