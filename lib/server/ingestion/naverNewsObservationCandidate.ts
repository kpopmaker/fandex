import { bindCanonicalArtistToNaverNews } from './naverNewsArtistBinding';
import {
  sha256Canonical,
  type NaverNewsNormalizedRecord,
} from './naverNewsContracts';

export type CanonicalNaverNewsObservationCandidate = Readonly<{
  candidateId: string;
  canonicalArtistId: string;
  provider: NaverNewsNormalizedRecord['provider'];
  sourceType: NaverNewsNormalizedRecord['sourceType'];
  canonicalSourceUrl: string;
  publishedAt: string;
  collectedAt: string;
  currentRecordId: string;
  currentRawEvidenceId: string;
  title: string;
  summary: string;
  sourceRecordIds: readonly string[];
  rawEvidenceIds: readonly string[];
}>;

function candidateIdFor(
  canonicalArtistId: string,
  provider: NaverNewsNormalizedRecord['provider'],
  canonicalSourceUrl: string,
): string {
  return sha256Canonical({ canonicalArtistId, provider, canonicalSourceUrl });
}

export function buildCanonicalNaverNewsObservationCandidate(
  canonicalArtistId: string,
  record: NaverNewsNormalizedRecord,
): CanonicalNaverNewsObservationCandidate {
  const binding = bindCanonicalArtistToNaverNews(canonicalArtistId);
  if (record.provider !== binding.provider) {
    throw new Error('naver_news_observation_candidate_provider_mismatch');
  }
  if (!record.sourceUrl) {
    throw new Error('naver_news_observation_candidate_source_url_invalid');
  }

  return Object.freeze({
    candidateId: candidateIdFor(binding.canonicalArtistId, record.provider, record.sourceUrl),
    canonicalArtistId: binding.canonicalArtistId,
    provider: record.provider,
    sourceType: record.sourceType,
    canonicalSourceUrl: record.sourceUrl,
    publishedAt: record.publishedAt,
    collectedAt: record.collectedAt,
    currentRecordId: record.recordId,
    currentRawEvidenceId: record.rawEvidenceId,
    title: record.title,
    summary: record.summary,
    sourceRecordIds: Object.freeze([record.recordId]),
    rawEvidenceIds: Object.freeze([record.rawEvidenceId]),
  });
}

function selectRepresentative(
  candidates: readonly CanonicalNaverNewsObservationCandidate[],
): CanonicalNaverNewsObservationCandidate {
  return candidates.reduce((latest, candidate) => (
    candidate.collectedAt > latest.collectedAt
    || (candidate.collectedAt === latest.collectedAt && candidate.currentRecordId > latest.currentRecordId)
      ? candidate
      : latest
  ));
}

function sortedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

export function collapseCanonicalNaverNewsObservationCandidates(
  canonicalArtistId: string,
  records: readonly NaverNewsNormalizedRecord[],
): readonly CanonicalNaverNewsObservationCandidate[] {
  const candidatesById = new Map<string, CanonicalNaverNewsObservationCandidate[]>();
  for (const record of records) {
    const candidate = buildCanonicalNaverNewsObservationCandidate(canonicalArtistId, record);
    const group = candidatesById.get(candidate.candidateId);
    if (group) group.push(candidate);
    else candidatesById.set(candidate.candidateId, [candidate]);
  }

  return Object.freeze([...candidatesById.values()]
    .map((candidates) => {
      const representative = selectRepresentative(candidates);
      return Object.freeze({
        ...representative,
        sourceRecordIds: sortedUnique(candidates.flatMap((candidate) => candidate.sourceRecordIds)),
        rawEvidenceIds: sortedUnique(candidates.flatMap((candidate) => candidate.rawEvidenceIds)),
      });
    })
    .sort((left, right) => left.candidateId.localeCompare(right.candidateId)));
}
