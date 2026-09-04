import {
  type CanonicalNaverNewsObservation,
} from './naverNewsCanonicalObservation';
import type { NaverNewsCollectionCompleteness } from './naverNewsCollectionCompleteness';
import { NAVER_NEWS_PROVIDER } from './naverNewsContracts';

export const CANONICAL_NEWS_OBSERVATION_COUNT_METRIC_KEY = 'canonicalNewsObservationCount';

export type CanonicalNewsObservationInterval = Readonly<{
  startInclusive: string;
  endExclusive: string;
}>;

export type CanonicalNewsObservationCountMetric = Readonly<{
  metricKey: typeof CANONICAL_NEWS_OBSERVATION_COUNT_METRIC_KEY;
  canonicalArtistId: string;
  interval: CanonicalNewsObservationInterval;
  observedSubsetCount: number;
  value: null;
  productEligible: false;
  collectionCompleteness: NaverNewsCollectionCompleteness;
  observationSetCoverage: 'unproven';
  unavailabilityReason:
    | 'collection_truncated'
    | 'collection_completeness_unknown'
    | 'observation_set_coverage_unproven';
}>;

export type CanonicalNewsObservationCountInput = Readonly<{
  canonicalArtistId: string;
  interval: CanonicalNewsObservationInterval;
  observations: readonly CanonicalNaverNewsObservation[];
  collectionCompleteness: NaverNewsCollectionCompleteness;
}>;

function parseTimestamp(value: string, errorCode: string): number {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new Error(errorCode);
  return timestamp;
}

function unavailabilityReason(
  completeness: NaverNewsCollectionCompleteness,
): CanonicalNewsObservationCountMetric['unavailabilityReason'] {
  if (completeness.status === 'truncated') return 'collection_truncated';
  if (completeness.status === 'unknown') return 'collection_completeness_unknown';
  return 'observation_set_coverage_unproven';
}

export function evaluateCanonicalNewsObservationCount(
  input: CanonicalNewsObservationCountInput,
): CanonicalNewsObservationCountMetric {
  const startInclusive = parseTimestamp(input.interval.startInclusive, 'naver_news_observation_count_interval_invalid');
  const endExclusive = parseTimestamp(input.interval.endExclusive, 'naver_news_observation_count_interval_invalid');
  if (startInclusive >= endExclusive) throw new Error('naver_news_observation_count_interval_invalid');

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

  return Object.freeze({
    metricKey: CANONICAL_NEWS_OBSERVATION_COUNT_METRIC_KEY,
    canonicalArtistId: input.canonicalArtistId,
    interval: Object.freeze({ ...input.interval }),
    observedSubsetCount: observationIds.size,
    value: null,
    productEligible: false,
    collectionCompleteness: input.collectionCompleteness,
    observationSetCoverage: 'unproven',
    unavailabilityReason: unavailabilityReason(input.collectionCompleteness),
  });
}
