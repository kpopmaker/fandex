import type { NaverNewsArtistRelevanceVerification } from './naverNewsArtistRelevance';
import type { CanonicalNaverNewsObservation } from './naverNewsCanonicalObservation';
import type { CanonicalNaverNewsObservationCandidate } from './naverNewsObservationCandidate';
import { isSha256, NAVER_NEWS_PROVIDER } from './naverNewsContracts';

export type NaverNewsEligibleNormalizedRecord = Readonly<{
  recordId: string;
  rawEvidenceId: string;
  jobId: string;
  provider: typeof NAVER_NEWS_PROVIDER;
  sourceType: 'news_article';
}>;

export type NaverNewsEligibleNormalizedRecordSet =
  | Readonly<{ status: 'available'; records: readonly NaverNewsEligibleNormalizedRecord[] }>
  | Readonly<{ status: 'unavailable' }>;

export type CanonicalObservationSetCoverage = Readonly<{
  status: 'proven' | 'incomplete' | 'unknown';
  reason:
    | 'all_eligible_records_disposed'
    | 'eligible_records_missing_disposition'
    | 'eligible_input_set_unavailable';
  canonicalArtistId: string;
  jobId: string;
  eligibleRecordCount: number;
  coveredRecordCount: number;
  missingRecordIds: readonly string[];
  acceptedCandidateCount: number;
  unknownCandidateCount: number;
  rejectedCandidateCount: number;
}>;

export type CanonicalObservationSetCoverageInput = Readonly<{
  canonicalArtistId: string;
  jobId: string;
  eligibleNormalizedRecords: NaverNewsEligibleNormalizedRecordSet;
  candidates: readonly CanonicalNaverNewsObservationCandidate[];
  verifications: readonly NaverNewsArtistRelevanceVerification[];
  observations: readonly CanonicalNaverNewsObservation[];
}>;

function sorted(values: Iterable<string>): readonly string[] {
  return Object.freeze([...values].sort());
}

function unknown(input: CanonicalObservationSetCoverageInput): CanonicalObservationSetCoverage {
  return Object.freeze({
    status: 'unknown',
    reason: 'eligible_input_set_unavailable',
    canonicalArtistId: input.canonicalArtistId,
    jobId: input.jobId,
    eligibleRecordCount: 0,
    coveredRecordCount: 0,
    missingRecordIds: Object.freeze([]),
    acceptedCandidateCount: 0,
    unknownCandidateCount: 0,
    rejectedCandidateCount: 0,
  });
}

export function evaluateCanonicalObservationSetCoverage(
  input: CanonicalObservationSetCoverageInput,
): CanonicalObservationSetCoverage {
  if (!isSha256(input.jobId) || input.canonicalArtistId.trim().length === 0) {
    throw new Error('naver_news_observation_set_coverage_input_invalid');
  }
  if (input.eligibleNormalizedRecords.status === 'unavailable') return unknown(input);

  const eligibleById = new Map<string, NaverNewsEligibleNormalizedRecord>();
  const eligibleEvidenceIds = new Set<string>();
  for (const record of input.eligibleNormalizedRecords.records) {
    if (!isSha256(record.recordId) || !isSha256(record.rawEvidenceId) || record.jobId !== input.jobId
        || record.provider !== NAVER_NEWS_PROVIDER || record.sourceType !== 'news_article'
        || eligibleById.has(record.recordId) || eligibleEvidenceIds.has(record.rawEvidenceId)) {
      throw new Error('naver_news_observation_set_coverage_eligible_lineage_invalid');
    }
    eligibleById.set(record.recordId, record);
    eligibleEvidenceIds.add(record.rawEvidenceId);
  }

  const candidatesById = new Map<string, CanonicalNaverNewsObservationCandidate>();
  const candidateByRecordId = new Map<string, string>();
  for (const candidate of input.candidates) {
    if (candidate.canonicalArtistId !== input.canonicalArtistId || candidate.provider !== NAVER_NEWS_PROVIDER
        || candidatesById.has(candidate.candidateId) || candidate.sourceRecordIds.length === 0
        || candidate.sourceRecordIds.length !== candidate.rawEvidenceIds.length) {
      throw new Error('naver_news_observation_set_coverage_candidate_lineage_invalid');
    }
    for (const recordId of candidate.sourceRecordIds) {
      if (!eligibleById.has(recordId) || candidateByRecordId.has(recordId)) {
        throw new Error('naver_news_observation_set_coverage_candidate_lineage_invalid');
      }
      candidateByRecordId.set(recordId, candidate.candidateId);
    }
    const expectedEvidenceIds = new Set(candidate.sourceRecordIds.map((recordId) => eligibleById.get(recordId)!.rawEvidenceId));
    if (expectedEvidenceIds.size !== candidate.rawEvidenceIds.length
        || candidate.rawEvidenceIds.some((rawEvidenceId) => !expectedEvidenceIds.has(rawEvidenceId))) {
      throw new Error('naver_news_observation_set_coverage_candidate_lineage_invalid');
    }
    candidatesById.set(candidate.candidateId, candidate);
  }

  const verificationByCandidateId = new Map<string, NaverNewsArtistRelevanceVerification>();
  for (const verification of input.verifications) {
    const candidate = candidatesById.get(verification.candidateId);
    if (!candidate || verification.canonicalArtistId !== input.canonicalArtistId
        || verification.canonicalArtistId !== candidate.canonicalArtistId
        || verificationByCandidateId.has(verification.candidateId)) {
      throw new Error('naver_news_observation_set_coverage_verification_conflict');
    }
    verificationByCandidateId.set(verification.candidateId, verification);
  }

  const observationIdsByCandidateId = new Map<string, Set<string>>();
  for (const observation of input.observations) {
    if (observation.canonicalArtistId !== input.canonicalArtistId || observation.provider !== NAVER_NEWS_PROVIDER
        || !candidatesById.has(observation.candidateId)) {
      throw new Error('naver_news_observation_set_coverage_observation_lineage_invalid');
    }
    const ids = observationIdsByCandidateId.get(observation.candidateId) ?? new Set<string>();
    ids.add(observation.observationId);
    observationIdsByCandidateId.set(observation.candidateId, ids);
  }

  const coveredRecordIds = new Set<string>();
  let acceptedCandidateCount = 0;
  let unknownCandidateCount = 0;
  let rejectedCandidateCount = 0;
  for (const candidate of input.candidates) {
    const verification = verificationByCandidateId.get(candidate.candidateId);
    if (!verification) continue;
    const observationCount = observationIdsByCandidateId.get(candidate.candidateId)?.size ?? 0;
    const processed = verification.status === 'accepted'
      ? observationCount === 1
      : observationCount === 0;
    if (!processed) {
      if (verification.status !== 'accepted' && observationCount > 0) {
        throw new Error('naver_news_observation_set_coverage_disposition_conflict');
      }
      continue;
    }
    if (verification.status === 'accepted') acceptedCandidateCount += 1;
    else if (verification.status === 'unknown') unknownCandidateCount += 1;
    else rejectedCandidateCount += 1;
    candidate.sourceRecordIds.forEach((recordId) => coveredRecordIds.add(recordId));
  }

  const missingRecordIds = sorted([...eligibleById.keys()].filter((recordId) => !coveredRecordIds.has(recordId)));
  return Object.freeze({
    status: missingRecordIds.length === 0 ? 'proven' : 'incomplete',
    reason: missingRecordIds.length === 0 ? 'all_eligible_records_disposed' : 'eligible_records_missing_disposition',
    canonicalArtistId: input.canonicalArtistId,
    jobId: input.jobId,
    eligibleRecordCount: eligibleById.size,
    coveredRecordCount: coveredRecordIds.size,
    missingRecordIds,
    acceptedCandidateCount,
    unknownCandidateCount,
    rejectedCandidateCount,
  });
}
