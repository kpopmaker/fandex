import { bindCanonicalArtistToNaverNews } from './naverNewsArtistBinding';
import type { NaverNewsRequestContract } from './naverNewsContracts';

export const NAVER_NEWS_PUBLICATION_ACQUISITION_INTENT_VERSION =
  'v1_naver_news_publication_acquisition_intent';

export type NaverNewsPublicationInterval = Readonly<{
  startInclusive: string;
  endExclusive: string;
}>;

export type NaverNewsPublicationAcquisitionIntent = Readonly<{
  contractVersion: typeof NAVER_NEWS_PUBLICATION_ACQUISITION_INTENT_VERSION;
  canonicalArtistId: string;
  provider: 'naver-news';
  query: string;
  interval: NaverNewsPublicationInterval;
}>;

/**
 * Requirements for a future provider acquisition that could prove an interval.
 * They are deliberately descriptive only: the current NAVER contract does not
 * provide these guarantees and therefore cannot emit a proven result.
 */
export type NaverNewsPublicationAcquisitionProofRequirements = Readonly<{
  explicitPublicationRange: true;
  dateSortedContiguousPages: true;
  startsAtFirstPage: true;
  publicationStartBoundaryReached: true;
  providerResultExhaustionOrBoundary: true;
  immutableSnapshot: true;
}>;

export const NAVER_NEWS_PUBLICATION_ACQUISITION_PROOF_REQUIREMENTS:
  NaverNewsPublicationAcquisitionProofRequirements = Object.freeze({
    explicitPublicationRange: true,
    dateSortedContiguousPages: true,
    startsAtFirstPage: true,
    publicationStartBoundaryReached: true,
    providerResultExhaustionOrBoundary: true,
    immutableSnapshot: true,
  });

export type NaverNewsPublicationAcquisitionPageWindow = Readonly<{
  start: number;
  display: number;
  received: number;
}>;

export type NaverNewsPublicationAcquisitionJobEvidence = Readonly<{
  jobId: string;
  request: NaverNewsRequestContract;
  collectionCompleteness: 'complete' | 'truncated' | 'unknown';
  providerTotal?: number | null;
  snapshotAt?: string | null;
  snapshotConsistency?: 'proven' | 'unproven';
  pageWindows?: readonly NaverNewsPublicationAcquisitionPageWindow[];
}>;

export type NaverNewsPublicationAcquisitionProofReason =
  | 'acquisition_evidence_unavailable'
  | 'legacy_job_has_no_range_intent'
  | 'future_interval_unobservable'
  | 'page_sequence_incomplete'
  | 'publication_start_boundary_unreached'
  | 'provider_result_limit_reached'
  | 'snapshot_consistency_unproven';

export type NaverNewsPublicationAcquisitionProof = Readonly<{
  canonicalArtistId: string;
  interval: NaverNewsPublicationInterval;
  status: 'proven' | 'incomplete' | 'unknown';
  reason: NaverNewsPublicationAcquisitionProofReason;
  contributingJobIds: readonly string[];
  evidenceAsOf: string | null;
  requirements: NaverNewsPublicationAcquisitionProofRequirements;
}>;

function parseTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error('naver_news_publication_interval_invalid');
  return timestamp;
}

function validateInterval(interval: NaverNewsPublicationInterval): void {
  if (parseTimestamp(interval.startInclusive) >= parseTimestamp(interval.endExclusive)) {
    throw new Error('naver_news_publication_interval_invalid');
  }
}

export function buildNaverNewsPublicationAcquisitionIntent(input: Readonly<{
  canonicalArtistId: string;
  interval: NaverNewsPublicationInterval;
}>): NaverNewsPublicationAcquisitionIntent {
  if (input.canonicalArtistId.trim().length === 0) {
    throw new Error('naver_news_artist_not_found');
  }
  validateInterval(input.interval);
  const binding = bindCanonicalArtistToNaverNews(input.canonicalArtistId);
  return Object.freeze({
    contractVersion: NAVER_NEWS_PUBLICATION_ACQUISITION_INTENT_VERSION,
    canonicalArtistId: binding.canonicalArtistId,
    provider: binding.provider,
    query: binding.query,
    interval: Object.freeze({ ...input.interval }),
  });
}

function pageSequenceHasGap(windows: readonly NaverNewsPublicationAcquisitionPageWindow[]): boolean {
  if (windows.length < 2) return false;
  const ordered = [...windows].sort((left, right) => left.start - right.start);
  if (ordered[0].start !== 1) return true;
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    if (ordered[index].start !== previous.start + previous.display) return true;
  }
  return false;
}

/**
 * Evaluates currently available acquisition evidence conservatively. Legacy
 * NAVER jobs have no publication-range intent or immutable snapshot guarantee,
 * so this evaluator intentionally has no positive path yet.
 */
export function evaluateNaverNewsPublicationAcquisitionProof(input: Readonly<{
  intent: NaverNewsPublicationAcquisitionIntent;
  jobs: readonly NaverNewsPublicationAcquisitionJobEvidence[];
}>): NaverNewsPublicationAcquisitionProof {
  validateInterval(input.intent.interval);
  const binding = bindCanonicalArtistToNaverNews(input.intent.canonicalArtistId);
  const jobsById = new Map<string, NaverNewsPublicationAcquisitionJobEvidence>();
  for (const job of input.jobs) {
    if (job.jobId.trim().length === 0 || job.request.provider !== binding.provider
        || job.request.query !== binding.query) {
      throw new Error('naver_news_publication_acquisition_scope_invalid');
    }
    if (jobsById.has(job.jobId)) continue;
    jobsById.set(job.jobId, job);
  }

  let reason: NaverNewsPublicationAcquisitionProofReason =
    jobsById.size === 0 ? 'acquisition_evidence_unavailable' : 'legacy_job_has_no_range_intent';
  const endExclusive = parseTimestamp(input.intent.interval.endExclusive);
  for (const job of jobsById.values()) {
    if (job.snapshotAt !== undefined && job.snapshotAt !== null) {
      if (parseTimestamp(job.snapshotAt) < endExclusive) reason = 'future_interval_unobservable';
    }
    if (job.pageWindows && pageSequenceHasGap(job.pageWindows)) reason = 'page_sequence_incomplete';
    if (job.request.start > 1) reason = 'publication_start_boundary_unreached';
    if (job.providerTotal !== undefined && job.providerTotal !== null && job.providerTotal > 1_000) {
      reason = 'provider_result_limit_reached';
    }
    if ((job.snapshotConsistency ?? 'unproven') !== 'proven') reason = 'snapshot_consistency_unproven';
  }

  return Object.freeze({
    canonicalArtistId: input.intent.canonicalArtistId,
    interval: Object.freeze({ ...input.intent.interval }),
    status: 'unknown',
    reason,
    contributingJobIds: Object.freeze([...jobsById.keys()].sort()),
    evidenceAsOf: null,
    requirements: NAVER_NEWS_PUBLICATION_ACQUISITION_PROOF_REQUIREMENTS,
  });
}
