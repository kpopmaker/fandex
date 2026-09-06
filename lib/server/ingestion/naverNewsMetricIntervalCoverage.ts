import { bindCanonicalArtistToNaverNews } from './naverNewsArtistBinding';
import type { NaverNewsCollectionCompletenessReadResult } from './naverNewsCollectionCompletenessReadModel';
import type { NaverNewsRequestContract } from './naverNewsContracts';
import type { CanonicalObservationSetCoverage } from './naverNewsObservationSetCoverage';
import { NAVER_NEWS_PROVIDER } from './naverNewsContracts';

export type NaverNewsMetricInterval = Readonly<{
  startInclusive: string;
  endExclusive: string;
}>;

export type NaverNewsMetricIntervalCoverageJob = Readonly<{
  jobId: string;
  canonicalArtistId: string;
  provider: string;
  request: NaverNewsRequestContract;
  completeness: NaverNewsCollectionCompletenessReadResult;
  observationSetCoverage: Pick<CanonicalObservationSetCoverage, 'status'>;
}>;

type NaverNewsMetricIntervalCoverageBase = Readonly<{
  canonicalArtistId: string;
  interval: NaverNewsMetricInterval;
  contributingJobIds: readonly string[];
  evidenceAsOf: null;
}>;

export type NaverNewsMetricIntervalCoverage = NaverNewsMetricIntervalCoverageBase & (
  | Readonly<{ status: 'proven'; reason: 'acquisition_interval_covered' }>
  | Readonly<{ status: 'incomplete'; reason: 'interval_uncovered' }>
  | Readonly<{ status: 'unknown'; reason: 'acquisition_interval_coverage_unproven' }>
);

function parseTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error('naver_news_metric_interval_invalid');
  return timestamp;
}

export function evaluateNaverNewsMetricIntervalCoverage(input: Readonly<{
  canonicalArtistId: string;
  interval: NaverNewsMetricInterval;
  jobs: readonly NaverNewsMetricIntervalCoverageJob[];
}>): NaverNewsMetricIntervalCoverage {
  const startInclusive = parseTimestamp(input.interval.startInclusive);
  const endExclusive = parseTimestamp(input.interval.endExclusive);
  if (startInclusive >= endExclusive || input.canonicalArtistId.trim().length === 0) {
    throw new Error('naver_news_metric_interval_invalid');
  }
  const binding = bindCanonicalArtistToNaverNews(input.canonicalArtistId);
  const jobsById = new Map<string, NaverNewsMetricIntervalCoverageJob>();
  for (const job of input.jobs) {
    if (job.canonicalArtistId !== input.canonicalArtistId || job.provider !== NAVER_NEWS_PROVIDER
        || job.request.provider !== binding.provider || job.request.query !== binding.query) {
      throw new Error('naver_news_metric_interval_job_scope_invalid');
    }
    if (jobsById.has(job.jobId)) continue;
    jobsById.set(job.jobId, job);
  }

  return Object.freeze({
    canonicalArtistId: input.canonicalArtistId,
    interval: Object.freeze({ ...input.interval }),
    status: 'unknown',
    reason: 'acquisition_interval_coverage_unproven',
    contributingJobIds: Object.freeze([...jobsById.keys()].sort()),
    evidenceAsOf: null,
  });
}
