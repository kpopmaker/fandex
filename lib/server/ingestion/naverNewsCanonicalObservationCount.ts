import {
  type CanonicalNaverNewsObservation,
} from './naverNewsCanonicalObservation';
import type { NaverNewsCollectionCompleteness } from './naverNewsCollectionCompleteness';
import type { CanonicalObservationSetCoverage } from './naverNewsObservationSetCoverage';
import { NAVER_NEWS_PROVIDER } from './naverNewsContracts';

export const CANONICAL_NEWS_OBSERVATION_COUNT_METRIC_KEY = 'canonicalNewsObservationCount';

export type CanonicalNewsObservationInterval = Readonly<{
  startInclusive: string;
  endExclusive: string;
}>;

type CanonicalNewsObservationCountMetricBase = Readonly<{
  metricKey: typeof CANONICAL_NEWS_OBSERVATION_COUNT_METRIC_KEY;
  canonicalArtistId: string;
  interval: CanonicalNewsObservationInterval;
  observedSubsetCount: number;
  collectionCompleteness: NaverNewsCollectionCompleteness;
}>;

export type CanonicalNewsObservationCountMetric = CanonicalNewsObservationCountMetricBase & (
  | Readonly<{
    value: number;
    productEligible: true;
    observationSetCoverage: 'proven';
    eligibilityReason: 'complete_observation_set';
  }>
  | Readonly<{
    value: null;
    productEligible: false;
    observationSetCoverage: CanonicalObservationSetCoverage['status'];
    eligibilityReason:
      | 'collection_truncated'
      | 'collection_completeness_unknown'
      | 'observation_set_incomplete'
      | 'observation_set_unknown';
  }>
);

export type CanonicalNewsObservationCountInput = Readonly<{
  canonicalArtistId: string;
  interval: CanonicalNewsObservationInterval;
  observations: readonly CanonicalNaverNewsObservation[];
  collectionCompleteness: NaverNewsCollectionCompleteness;
  observationSetCoverage: CanonicalObservationSetCoverage;
}>;

function parseTimestamp(value: string, errorCode: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(errorCode);
  return timestamp;
}

function eligibilityReason(
  completeness: NaverNewsCollectionCompleteness,
  coverage: CanonicalObservationSetCoverage,
): Exclude<CanonicalNewsObservationCountMetric, { productEligible: true }>['eligibilityReason'] | 'complete_observation_set' {
  if (completeness.status === 'truncated') return 'collection_truncated';
  if (completeness.status === 'unknown') return 'collection_completeness_unknown';
  if (coverage.status === 'incomplete') return 'observation_set_incomplete';
  if (coverage.status === 'unknown') return 'observation_set_unknown';
  return 'complete_observation_set';
}

export function evaluateCanonicalNewsObservationCount(
  input: CanonicalNewsObservationCountInput,
): CanonicalNewsObservationCountMetric {
  const startInclusive = parseTimestamp(input.interval.startInclusive, 'naver_news_observation_count_interval_invalid');
  const endExclusive = parseTimestamp(input.interval.endExclusive, 'naver_news_observation_count_interval_invalid');
  if (startInclusive >= endExclusive) throw new Error('naver_news_observation_count_interval_invalid');
  if (input.observationSetCoverage.canonicalArtistId !== input.canonicalArtistId) {
    throw new Error('naver_news_observation_count_coverage_artist_mismatch');
  }

  const observationIds = new Set<string>();
  for (const observation of input.observations) {
    if (observation.canonicalArtistId !== input.canonicalArtistId) {
      throw new Error('naver_news_observation_count_artist_mismatch');
    }
    if (observation.provider !== NAVER_NEWS_PROVIDER) {
      throw new Error('naver_news_observation_count_provider_mismatch');
    }
    const observedAt = parseTimestamp(observation.observedAt, 'naver_news_observation_count_observed_at_invalid');
    if (observedAt >= startInclusive && observedAt < endExclusive) observationIds.add(observation.observationId);
  }

  const metricBase = {
    metricKey: CANONICAL_NEWS_OBSERVATION_COUNT_METRIC_KEY,
    canonicalArtistId: input.canonicalArtistId,
    interval: Object.freeze({ ...input.interval }),
    observedSubsetCount: observationIds.size,
    collectionCompleteness: input.collectionCompleteness,
  } as const;
  const reason = eligibilityReason(input.collectionCompleteness, input.observationSetCoverage);
  if (reason === 'complete_observation_set') {
    return Object.freeze({ ...metricBase, value: metricBase.observedSubsetCount, productEligible: true, observationSetCoverage: 'proven', eligibilityReason: reason });
  }
  return Object.freeze({ ...metricBase, value: null, productEligible: false, observationSetCoverage: input.observationSetCoverage.status, eligibilityReason: reason });
}
