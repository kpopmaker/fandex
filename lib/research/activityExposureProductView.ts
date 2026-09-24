import type { ActivityExposureEvent } from './activityExposure';
import type { ActivityExposureRawObservation } from './activityExposureObservation';

export const ACTIVITY_EXPOSURE_PRODUCT_VIEW_CONTRACT_VERSION =
  'activity-exposure-product-view-v1-research' as const;

export type ActivityExposureProviderCoverageState =
  | 'complete'
  | 'partial'
  | 'provider_unavailable'
  | 'identity_unresolved'
  | 'invalid'
  | 'not_in_scope';

export type ActivityExposureProviderCoverage = Readonly<{
  provider: 'musicbrainz' | 'youtube';
  state: ActivityExposureProviderCoverageState;
  reason: string;
  observationStart: string | null;
  observationEnd: string | null;
  observationBasis:
    | 'provider_inventory'
    | 'provider_query'
    | 'stored_evidence'
    | 'not_available';
}>;

export type ActivityExposureProductAvailability =
  | 'available'
  | 'partial'
  | 'unavailable'
  | 'data_issue';

export type ActivityExposureStoredEvidenceState =
  | 'retained_payload'
  | 'digest_only'
  | 'unavailable';

export type ActivityExposureProductEvidenceTrace = Readonly<{
  observationId: string;
  sourceProvider: ActivityExposureRawObservation['sourceProvider'];
  sourceEntityType: string;
  sourceEntityId: string;
  evidenceRef: string;
  collectedAt: string;
  sourcePublishedAt: string | null;
  providerObservedAt: string | null;
  rawPayloadDigest: string;
  storedEvidenceState: ActivityExposureStoredEvidenceState;
  revisionState: ActivityExposureRawObservation['revisionState'];
}>;

export type ActivityExposureProductTimelineEntry = Readonly<{
  eventId: string;
  eventFamily: ActivityExposureEvent['eventFamily'];
  eventType: string;
  lifecycleState: ActivityExposureEvent['lifecycleState'];
  title: string | null;
  occurredAt: string | null;
  occurredAtPrecision: ActivityExposureEvent['occurredAtPrecision'];
  sourcePublishedAt: string | null;
  collectedAt: string;
  sourceProvider: ActivityExposureEvent['sourceProvider'];
  sourceEntityId: string;
  participationScope: 'solo' | 'collaboration' | null;
  missingState: ActivityExposureEvent['missingState'];
  evidenceState: string;
  conflictState: string;
  timeZoneState: string;
  evidenceTrace: readonly ActivityExposureProductEvidenceTrace[];
}>;

export type ActivityExposureProductView = Readonly<{
  contractVersion: typeof ACTIVITY_EXPOSURE_PRODUCT_VIEW_CONTRACT_VERSION;
  construct: 'Activity Exposure';
  artistId: string;
  availability: ActivityExposureProductAvailability;
  numericScore: null;
  numericScoreState: 'not_justified';
  coverage: readonly ActivityExposureProviderCoverage[];
  timeline: readonly ActivityExposureProductTimelineEntry[];
  truthSemantics: Readonly<{
    missingIsZero: false;
    missingIsInactive: false;
    observationTimeEqualsCollectionTime: false;
    crossFamilyRawAggregationAllowed: false;
  }>;
}>;

function storedEvidenceState(
  observation: ActivityExposureRawObservation,
): ActivityExposureStoredEvidenceState {
  if (
    observation.rawPayloadRetentionState === 'retained'
    && observation.rawPayloadCanonical !== null
  ) {
    return 'retained_payload';
  }
  if (observation.rawPayloadRetentionState === 'digest-only') {
    return 'digest_only';
  }
  return 'unavailable';
}

function overallAvailability(
  coverage: readonly ActivityExposureProviderCoverage[],
  events: readonly ActivityExposureEvent[],
): ActivityExposureProductAvailability {
  if (coverage.some((item) => item.state === 'invalid')) return 'data_issue';

  const usableCoverage = coverage.filter((item) => item.state !== 'not_in_scope');
  if (usableCoverage.length === 0) {
    return events.length > 0 ? 'partial' : 'unavailable';
  }

  if (usableCoverage.every((item) => item.state === 'complete')) {
    return events.length > 0 ? 'available' : 'partial';
  }

  if (
    usableCoverage.every(
      (item) =>
        item.state === 'provider_unavailable'
        || item.state === 'identity_unresolved',
    )
    && events.length === 0
  ) {
    return 'unavailable';
  }

  return 'partial';
}

function evidenceTraceForEvent(
  eventId: string,
  observations: readonly ActivityExposureRawObservation[],
): ActivityExposureProductEvidenceTrace[] {
  return observations
    .filter((observation) => observation.normalizedEventIds.includes(eventId))
    .map((observation) =>
      Object.freeze({
        observationId: observation.observationId,
        sourceProvider: observation.sourceProvider,
        sourceEntityType: observation.sourceEntityType,
        sourceEntityId: observation.sourceEntityId,
        evidenceRef: observation.evidenceRef,
        collectedAt: observation.collectedAt,
        sourcePublishedAt: observation.sourcePublishedAt,
        providerObservedAt: observation.providerObservedAt,
        rawPayloadDigest: observation.rawPayloadDigest,
        storedEvidenceState: storedEvidenceState(observation),
        revisionState: observation.revisionState,
      }),
    );
}

export function buildActivityExposureProductView(input: Readonly<{
  artistId: string;
  events: readonly ActivityExposureEvent[];
  observations: readonly ActivityExposureRawObservation[];
  coverage: readonly ActivityExposureProviderCoverage[];
}>): ActivityExposureProductView {
  const timeline = input.events.map((event) =>
    Object.freeze({
      eventId: event.eventId,
      eventFamily: event.eventFamily,
      eventType: event.eventType,
      lifecycleState: event.lifecycleState,
      title: typeof event.title === 'string' ? event.title : null,
      occurredAt: event.occurredAt,
      occurredAtPrecision: event.occurredAtPrecision,
      sourcePublishedAt: event.sourcePublishedAt,
      collectedAt: event.collectedAt,
      sourceProvider: event.sourceProvider,
      sourceEntityId: event.sourceEntityId,
      participationScope:
        event.participationScope === 'solo' || event.participationScope === 'collaboration'
          ? event.participationScope
          : null,
      missingState: event.missingState,
      evidenceState: event.evidenceState,
      conflictState: event.conflictState,
      timeZoneState: event.timeZoneState,
      evidenceTrace: Object.freeze(
        evidenceTraceForEvent(event.eventId, input.observations),
      ),
    }),
  );

  return Object.freeze({
    contractVersion: ACTIVITY_EXPOSURE_PRODUCT_VIEW_CONTRACT_VERSION,
    construct: 'Activity Exposure',
    artistId: input.artistId,
    availability: overallAvailability(input.coverage, input.events),
    numericScore: null,
    numericScoreState: 'not_justified',
    coverage: Object.freeze([...input.coverage]),
    timeline: Object.freeze(timeline),
    truthSemantics: Object.freeze({
      missingIsZero: false,
      missingIsInactive: false,
      observationTimeEqualsCollectionTime: false,
      crossFamilyRawAggregationAllowed: false,
    }),
  });
}
