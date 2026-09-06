import {
  NAVER_NEWS_CANONICAL_OBSERVATION_CONTRACT_VERSION,
  type CanonicalNaverNewsObservation,
} from '../ingestion/naverNewsCanonicalObservation';
import { NAVER_NEWS_PROVIDER } from '../ingestion/naverNewsContracts';

export const FANDEX_NAVER_CANONICAL_ARTIST_READ_ENTRY_CONTRACT_VERSION =
  'fandex-naver-canonical-artist-read-entry-v1' as const;

const NAVER_RELEVANCE_REASONS = Object.freeze([
  'canonical_korean_alias_in_title',
  'canonical_korean_alias_in_summary',
] as const);

export type CanonicalNaverNewsArtistReadEntryV1 = Readonly<{
  entryId: string;
  artist: Readonly<{ entityType: 'artist'; entityId: string }>;
  source: Readonly<{ providerId: string; sourceType: string; canonicalSourceUrl: string }>;
  canonicalObservation: Readonly<{ observationId: string; candidateId: string }>;
  time: Readonly<{ observedAt: string; collectedAt: string }>;
  content: Readonly<{ title: string; summary: string }>;
  evidence: Readonly<{
    sourceRecordIds: readonly string[];
    rawEvidenceIds: readonly string[];
  }>;
  relevance: Readonly<{
    status: 'accepted';
    reason: string;
    matchedEvidence: Readonly<{ field: 'title' | 'summary'; alias: string }> | null;
  }>;
  semantic: Readonly<{
    entryKind: 'canonical-evidence';
    family: 'media';
    variableId: null;
    metricId: null;
  }>;
  provenance: Readonly<{
    readEntryContractVersion: typeof FANDEX_NAVER_CANONICAL_ARTIST_READ_ENTRY_CONTRACT_VERSION;
    canonicalObservationContractVersion: typeof NAVER_NEWS_CANONICAL_OBSERVATION_CONTRACT_VERSION;
  }>;
  contractVersion: typeof FANDEX_NAVER_CANONICAL_ARTIST_READ_ENTRY_CONTRACT_VERSION;
}>;

function requiredString(value: unknown, code: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new Error(code);
  return value;
}

function timestamp(value: unknown, code: string): string {
  const result = requiredString(value, code);
  if (!Number.isFinite(Date.parse(result))) throw new Error(code);
  return result;
}

function stringArray(value: unknown, code: string): readonly string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.trim() === '')) {
    throw new Error(code);
  }
  return Object.freeze([...value]);
}

function matchedEvidence(value: unknown): Readonly<{ field: 'title' | 'summary'; alias: string }> | null {
  if (value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('naver_news_read_entry_matched_evidence_invalid');
  const input = value as Record<string, unknown>;
  if (input.field !== 'title' && input.field !== 'summary') throw new Error('naver_news_read_entry_matched_evidence_invalid');
  return Object.freeze({ field: input.field, alias: requiredString(input.alias, 'naver_news_read_entry_matched_evidence_invalid') });
}

function validateObservation(input: CanonicalNaverNewsObservation): void {
  requiredString(input.observationId, 'naver_news_read_entry_observation_id_invalid');
  requiredString(input.candidateId, 'naver_news_read_entry_candidate_id_invalid');
  requiredString(input.canonicalArtistId, 'naver_news_read_entry_artist_id_invalid');
  if (input.provider !== NAVER_NEWS_PROVIDER) throw new Error('naver_news_read_entry_provider_invalid');
  if (input.sourceType !== 'news_article') throw new Error('naver_news_read_entry_source_type_invalid');
  requiredString(input.canonicalSourceUrl, 'naver_news_read_entry_source_url_invalid');
  timestamp(input.observedAt, 'naver_news_read_entry_observed_at_invalid');
  timestamp(input.collectedAt, 'naver_news_read_entry_collected_at_invalid');
  requiredString(input.title, 'naver_news_read_entry_title_invalid');
  if (typeof input.summary !== 'string') throw new Error('naver_news_read_entry_summary_invalid');
  stringArray(input.sourceRecordIds, 'naver_news_read_entry_source_record_ids_invalid');
  stringArray(input.rawEvidenceIds, 'naver_news_read_entry_raw_evidence_ids_invalid');
  if (!input.relevanceVerification || input.relevanceVerification.status !== 'accepted') {
    throw new Error('naver_news_read_entry_relevance_not_accepted');
  }
  if (!NAVER_RELEVANCE_REASONS.includes(input.relevanceVerification.reason as typeof NAVER_RELEVANCE_REASONS[number])) {
    throw new Error('naver_news_read_entry_relevance_reason_invalid');
  }
  matchedEvidence(input.relevanceVerification.matchedEvidence);
}

export function adaptCanonicalNaverNewsObservationToArtistReadEntry(
  observation: CanonicalNaverNewsObservation,
): CanonicalNaverNewsArtistReadEntryV1 {
  validateObservation(observation);
  const entry = {
    entryId: observation.observationId,
    artist: Object.freeze({ entityType: 'artist' as const, entityId: observation.canonicalArtistId }),
    source: Object.freeze({ providerId: observation.provider, sourceType: observation.sourceType, canonicalSourceUrl: observation.canonicalSourceUrl }),
    canonicalObservation: Object.freeze({ observationId: observation.observationId, candidateId: observation.candidateId }),
    time: Object.freeze({ observedAt: observation.observedAt, collectedAt: observation.collectedAt }),
    content: Object.freeze({ title: observation.title, summary: observation.summary }),
    evidence: Object.freeze({
      sourceRecordIds: stringArray(observation.sourceRecordIds, 'naver_news_read_entry_source_record_ids_invalid'),
      rawEvidenceIds: stringArray(observation.rawEvidenceIds, 'naver_news_read_entry_raw_evidence_ids_invalid'),
    }),
    relevance: Object.freeze({
      status: 'accepted' as const,
      reason: observation.relevanceVerification.reason,
      matchedEvidence: matchedEvidence(observation.relevanceVerification.matchedEvidence),
    }),
    semantic: Object.freeze({ entryKind: 'canonical-evidence' as const, family: 'media' as const, variableId: null, metricId: null }),
    provenance: Object.freeze({
      readEntryContractVersion: FANDEX_NAVER_CANONICAL_ARTIST_READ_ENTRY_CONTRACT_VERSION,
      canonicalObservationContractVersion: NAVER_NEWS_CANONICAL_OBSERVATION_CONTRACT_VERSION,
    }),
    contractVersion: FANDEX_NAVER_CANONICAL_ARTIST_READ_ENTRY_CONTRACT_VERSION,
  };
  return Object.freeze(entry);
}
