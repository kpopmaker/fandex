import { bindCanonicalArtistToNaverNews } from './naverNewsArtistBinding';
import type { CanonicalNaverNewsObservation } from './naverNewsCanonicalObservation';
import type { NaverNewsCollectionCompletenessReadResult } from './naverNewsCollectionCompletenessReadModel';
import {
  buildNaverNewsJobIdentity,
  canonicalJson,
  isSha256,
  NAVER_NEWS_PROVIDER,
  type NaverNewsRequestContract,
} from './naverNewsContracts';
import type { CanonicalObservationSetCoverage } from './naverNewsObservationSetCoverage';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_CADENCE_MINUTES,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  NAVER_NEWS_SCHEDULER_VERSION,
} from './naverNewsScheduler';

export const NAVER_NEWS_SHADOW_FIRST_SEEN_ACTIVITY_CONTRACT_VERSION =
  'v1_naver_news_shadow_first_seen_activity' as const;

export const NAVER_NEWS_SHADOW_FIRST_SEEN_ACTIVITY_METRIC_KEY =
  'naverNewsShadowFirstSeenActivity' as const;

export type NaverNewsShadowFirstSeenActivitySnapshot = Readonly<{
  canonicalArtistId: string;
  jobId: string;
  slotStart: string;
  request: NaverNewsRequestContract;
  completeness: NaverNewsCollectionCompletenessReadResult;
  observationSetCoverage: CanonicalObservationSetCoverage;
  observations: readonly CanonicalNaverNewsObservation[];
}>;

export type NaverNewsShadowFirstSeenActivitySlot = Readonly<{
  slotStart: string;
  jobId: string;
  collectionCompleteness: 'complete' | 'truncated' | 'unknown';
  observedObservationCount: number;
  firstSeenObservationCount: number | null;
  firstSeenObservationIds: readonly string[];
  bootstrap: boolean;
}>;

export type NaverNewsShadowFirstSeenActivityResult = Readonly<{
  contractVersion: typeof NAVER_NEWS_SHADOW_FIRST_SEEN_ACTIVITY_CONTRACT_VERSION;
  metricKey: typeof NAVER_NEWS_SHADOW_FIRST_SEEN_ACTIVITY_METRIC_KEY;
  lifecycle: 'shadow';
  directProductContributionEligible: false;
  canonicalArtistId: string;
  protocolStart: string;
  protocol: Readonly<{
    provider: typeof NAVER_NEWS_PROVIDER;
    schedulerVersion: typeof NAVER_NEWS_SCHEDULER_VERSION;
    cadenceMinutes: typeof NAVER_NEWS_SCHEDULER_CADENCE_MINUTES;
    start: 1;
    display: typeof NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY;
    sort: 'date';
    completeCollectionRequired: false;
    observationSetCoverageRequired: 'proven';
  }>;
  status: 'available' | 'bootstrap' | 'unavailable';
  reason:
    | 'shadow_series_available'
    | 'bootstrap_only'
    | 'snapshot_history_unavailable'
    | 'protocol_history_incomplete'
    | 'protocol_slot_gap'
    | 'collection_evidence_unavailable'
    | 'observation_set_coverage_unproven';
  slots: readonly NaverNewsShadowFirstSeenActivitySlot[];
  unavailableAtSlotStart: string | null;
}>;

const PROTOCOL = Object.freeze({
  provider: NAVER_NEWS_PROVIDER,
  schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
  cadenceMinutes: NAVER_NEWS_SCHEDULER_CADENCE_MINUTES,
  start: 1 as const,
  display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  sort: 'date' as const,
  completeCollectionRequired: false as const,
  observationSetCoverageRequired: 'proven' as const,
});

function parseCanonicalIso(value: string, errorCode: string): number {
  if (typeof value !== 'string') throw new Error(errorCode);
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString() !== value) {
    throw new Error(errorCode);
  }
  return timestamp;
}

function unavailable(
  canonicalArtistId: string,
  protocolStart: string,
  reason: Extract<NaverNewsShadowFirstSeenActivityResult['reason'],
    | 'snapshot_history_unavailable'
    | 'protocol_history_incomplete'
    | 'protocol_slot_gap'
    | 'collection_evidence_unavailable'
    | 'observation_set_coverage_unproven'>,
  slots: readonly NaverNewsShadowFirstSeenActivitySlot[],
  unavailableAtSlotStart: string | null,
): NaverNewsShadowFirstSeenActivityResult {
  return Object.freeze({
    contractVersion: NAVER_NEWS_SHADOW_FIRST_SEEN_ACTIVITY_CONTRACT_VERSION,
    metricKey: NAVER_NEWS_SHADOW_FIRST_SEEN_ACTIVITY_METRIC_KEY,
    lifecycle: 'shadow' as const,
    directProductContributionEligible: false as const,
    canonicalArtistId,
    protocolStart,
    protocol: PROTOCOL,
    status: 'unavailable' as const,
    reason,
    slots: Object.freeze([...slots]),
    unavailableAtSlotStart,
  });
}

function validateSnapshotScope(
  snapshot: NaverNewsShadowFirstSeenActivitySnapshot,
  canonicalArtistId: string,
  query: string,
): Readonly<{ slotTimestamp: number; nextSlotTimestamp: number }> {
  if (!isSha256(snapshot.jobId) || snapshot.canonicalArtistId !== canonicalArtistId) {
    throw new Error('naver_news_shadow_first_seen_snapshot_invalid');
  }

  const slotTimestamp = parseCanonicalIso(
    snapshot.slotStart,
    'naver_news_shadow_first_seen_snapshot_invalid',
  );
  const plan = buildNaverNewsSchedulerPlan({
    query,
    at: snapshot.slotStart,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  if (plan.slotStart !== snapshot.slotStart) {
    throw new Error('naver_news_shadow_first_seen_protocol_mismatch');
  }
  const expectedRequest = buildNaverNewsJobIdentity(plan.command).request;
  if (canonicalJson(snapshot.request) !== canonicalJson(expectedRequest)) {
    throw new Error('naver_news_shadow_first_seen_protocol_mismatch');
  }

  if (snapshot.observationSetCoverage.canonicalArtistId !== canonicalArtistId
      || snapshot.observationSetCoverage.jobId !== snapshot.jobId) {
    throw new Error('naver_news_shadow_first_seen_snapshot_invalid');
  }

  if (snapshot.completeness.status === 'available') {
    const readModel = snapshot.completeness.readModel;
    if (readModel.jobId !== snapshot.jobId || readModel.provider !== NAVER_NEWS_PROVIDER
        || canonicalJson(readModel.request) !== canonicalJson(snapshot.request)) {
      throw new Error('naver_news_shadow_first_seen_snapshot_invalid');
    }
  }

  const nextSlotTimestamp = slotTimestamp + NAVER_NEWS_SCHEDULER_CADENCE_MINUTES * 60_000;
  const observationIds = new Set<string>();
  for (const observation of snapshot.observations) {
    if (!isSha256(observation.observationId) || observationIds.has(observation.observationId)
        || observation.canonicalArtistId !== canonicalArtistId || observation.provider !== NAVER_NEWS_PROVIDER) {
      throw new Error('naver_news_shadow_first_seen_observation_invalid');
    }
    const collectedAt = parseCanonicalIso(
      observation.collectedAt,
      'naver_news_shadow_first_seen_observation_invalid',
    );
    parseCanonicalIso(
      observation.observedAt,
      'naver_news_shadow_first_seen_observation_invalid',
    );
    if (collectedAt < slotTimestamp || collectedAt >= nextSlotTimestamp) {
      throw new Error('naver_news_shadow_first_seen_observation_invalid');
    }
    observationIds.add(observation.observationId);
  }

  return Object.freeze({ slotTimestamp, nextSlotTimestamp });
}

export function evaluateNaverNewsShadowFirstSeenActivity(input: Readonly<{
  canonicalArtistId: string;
  protocolStart: string;
  snapshots: readonly NaverNewsShadowFirstSeenActivitySnapshot[];
}>): NaverNewsShadowFirstSeenActivityResult {
  if (input.canonicalArtistId.trim().length === 0) {
    throw new Error('naver_news_shadow_first_seen_input_invalid');
  }
  const binding = bindCanonicalArtistToNaverNews(input.canonicalArtistId);
  const protocolStartTimestamp = parseCanonicalIso(
    input.protocolStart,
    'naver_news_shadow_first_seen_input_invalid',
  );
  const protocolStartPlan = buildNaverNewsSchedulerPlan({
    query: binding.query,
    at: input.protocolStart,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  if (protocolStartPlan.slotStart !== input.protocolStart) {
    throw new Error('naver_news_shadow_first_seen_input_invalid');
  }

  if (input.snapshots.length === 0) {
    return unavailable(
      binding.canonicalArtistId,
      input.protocolStart,
      'snapshot_history_unavailable',
      [],
      null,
    );
  }

  const validated = input.snapshots.map((snapshot) => Object.freeze({
    snapshot,
    ...validateSnapshotScope(snapshot, binding.canonicalArtistId, binding.query),
  })).sort((left, right) => left.slotTimestamp - right.slotTimestamp);

  const jobIds = new Set<string>();
  const slotStarts = new Set<string>();
  for (const item of validated) {
    if (jobIds.has(item.snapshot.jobId) || slotStarts.has(item.snapshot.slotStart)) {
      throw new Error('naver_news_shadow_first_seen_snapshot_duplicate');
    }
    jobIds.add(item.snapshot.jobId);
    slotStarts.add(item.snapshot.slotStart);
  }

  if (validated[0].slotTimestamp < protocolStartTimestamp) {
    throw new Error('naver_news_shadow_first_seen_protocol_mismatch');
  }
  if (validated[0].slotTimestamp !== protocolStartTimestamp) {
    return unavailable(
      binding.canonicalArtistId,
      input.protocolStart,
      'protocol_history_incomplete',
      [],
      validated[0].snapshot.slotStart,
    );
  }

  const seenObservationIds = new Set<string>();
  const slots: NaverNewsShadowFirstSeenActivitySlot[] = [];
  let expectedSlotTimestamp = protocolStartTimestamp;

  for (const item of validated) {
    if (item.slotTimestamp !== expectedSlotTimestamp) {
      return unavailable(
        binding.canonicalArtistId,
        input.protocolStart,
        'protocol_slot_gap',
        slots,
        new Date(expectedSlotTimestamp).toISOString(),
      );
    }
    const { snapshot } = item;
    if (snapshot.completeness.status !== 'available') {
      return unavailable(
        binding.canonicalArtistId,
        input.protocolStart,
        'collection_evidence_unavailable',
        slots,
        snapshot.slotStart,
      );
    }
    if (snapshot.observationSetCoverage.status !== 'proven') {
      return unavailable(
        binding.canonicalArtistId,
        input.protocolStart,
        'observation_set_coverage_unproven',
        slots,
        snapshot.slotStart,
      );
    }

    const observationIds = [...new Set(snapshot.observations.map((observation) => observation.observationId))].sort();
    const bootstrap = slots.length === 0;
    const firstSeenObservationIds = bootstrap
      ? []
      : observationIds.filter((observationId) => !seenObservationIds.has(observationId));
    observationIds.forEach((observationId) => seenObservationIds.add(observationId));

    slots.push(Object.freeze({
      slotStart: snapshot.slotStart,
      jobId: snapshot.jobId,
      collectionCompleteness: snapshot.completeness.readModel.completeness.status,
      observedObservationCount: observationIds.length,
      firstSeenObservationCount: bootstrap ? null : firstSeenObservationIds.length,
      firstSeenObservationIds: Object.freeze(firstSeenObservationIds),
      bootstrap,
    }));
    expectedSlotTimestamp = item.nextSlotTimestamp;
  }

  return Object.freeze({
    contractVersion: NAVER_NEWS_SHADOW_FIRST_SEEN_ACTIVITY_CONTRACT_VERSION,
    metricKey: NAVER_NEWS_SHADOW_FIRST_SEEN_ACTIVITY_METRIC_KEY,
    lifecycle: 'shadow' as const,
    directProductContributionEligible: false as const,
    canonicalArtistId: binding.canonicalArtistId,
    protocolStart: input.protocolStart,
    protocol: PROTOCOL,
    status: slots.length === 1 ? 'bootstrap' as const : 'available' as const,
    reason: slots.length === 1 ? 'bootstrap_only' as const : 'shadow_series_available' as const,
    slots: Object.freeze(slots),
    unavailableAtSlotStart: null,
  });
}
