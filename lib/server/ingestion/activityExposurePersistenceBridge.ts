import type {
  ProductActivityExposureEvent,
  ProductActivityExposureProvider,
} from '../../product/contracts/productActivityExposure';
import { sha256Canonical } from '../../shared/canonicalDigest';
import type {
  ActivityExposureProviderObservation,
} from './activityExposureContracts';
import type {
  MusicBrainzActivityExposureCollection,
} from './activityExposureMusicBrainzCollector';
import type {
  YouTubeActivityExposureCollection,
} from './activityExposureYouTubeCollector';
import {
  persistActivityExposureCollection,
  type ActivityExposureNormalizationOutcome,
  type ActivityExposurePersistenceInput,
  type ActivityExposurePersistenceObservation,
  type ActivityExposurePersistencePool,
  type PersistActivityExposureResult,
} from './activityExposureRepository';

export const ACTIVITY_EXPOSURE_PERSISTENCE_BRIDGE_CONTRACT_VERSION =
  'activity-exposure-persistence-bridge-v1' as const;

type PriorObservationRow = {
  observation_id: string;
  source_entity_type: string;
  source_entity_id: string;
  revision_id: string;
};

type PriorEventRow = {
  event_id: string;
  revision_id: string;
};

type PriorState = Readonly<{
  observations: ReadonlyMap<string, Readonly<{
    observationId: string;
    revisionId: string;
  }>>;
  events: ReadonlyMap<string, string>;
}>;

function observationKey(
  observation: Pick<
    ActivityExposureProviderObservation,
    'sourceEntityType' | 'sourceEntityId'
  >,
) {
  return `${observation.sourceEntityType}\u0000${observation.sourceEntityId}`;
}

function eventSemanticProjection(event: ProductActivityExposureEvent) {
  return Object.freeze({
    artistId: event.artistId,
    eventId: event.eventId,
    eventFamily: event.eventFamily,
    eventType: event.eventType,
    lifecycleState: event.lifecycleState,
    participationScope: event.participationScope,
    announcedAt: event.announcedAt,
    scheduledStartAt: event.scheduledStartAt,
    scheduledEndAt: event.scheduledEndAt,
    occurredAt: event.occurredAt,
    occurredAtPrecision: event.occurredAtPrecision,
    sourcePublishedAt: event.sourcePublishedAt,
    sourceProvider: event.sourceProvider,
    sourceEntityType: event.sourceEntityType,
    sourceEntityId: event.sourceEntityId,
    canonicalFamilyId: event.canonicalFamilyId,
    providerArtistId: event.providerArtistId,
    providerArtistCredits: event.providerArtistCredits,
    evidenceRef: event.evidenceRef,
    identityState: event.identityState,
    missingState: event.missingState,
    evidenceState: event.evidenceState,
    conflictState: event.conflictState,
    timeZoneState: event.timeZoneState,
  });
}

export function buildActivityExposureEventSemanticRevisionId(
  event: ProductActivityExposureEvent,
) {
  return `event-revision:${sha256Canonical(eventSemanticProjection(event))}`;
}

function buildObservationSemanticRevisionId(input: Readonly<{
  observation: ActivityExposureProviderObservation;
  normalizationOutcome: ActivityExposureNormalizationOutcome;
  eventRevisionIds: readonly string[];
}>) {
  return `provider-revision:${sha256Canonical({
    sourceProvider: input.observation.sourceProvider,
    providerArtistId: input.observation.providerArtistId,
    sourceEntityType: input.observation.sourceEntityType,
    sourceEntityId: input.observation.sourceEntityId,
    rawPayloadDigest: input.observation.rawPayloadDigest,
    normalizationOutcome: input.normalizationOutcome,
    eventRevisionIds: [...input.eventRevisionIds].sort(),
  })}`;
}

async function readPriorState(
  artistId: string,
  provider: ProductActivityExposureProvider,
  pool: ActivityExposurePersistencePool,
): Promise<PriorState> {
  const [observationResult, eventResult] = await Promise.all([
    pool.query<PriorObservationRow>(
      `SELECT DISTINCT ON (source_entity_type, source_entity_id)
          observation_id, source_entity_type, source_entity_id, revision_id
       FROM fandex.activity_exposure_provider_observations
       WHERE artist_id = $1 AND provider = $2
       ORDER BY source_entity_type, source_entity_id, collected_at DESC, observation_id DESC`,
      [artistId, provider],
    ),
    pool.query<PriorEventRow>(
      `SELECT DISTINCT ON (event_id)
          event_id, revision_id
       FROM fandex.activity_exposure_events
       WHERE artist_id = $1 AND source_provider = $2
       ORDER BY event_id, collected_at DESC, event_record_id DESC`,
      [artistId, provider],
    ),
  ]);

  return Object.freeze({
    observations: new Map(
      observationResult.rows.map((row) => [
        `${row.source_entity_type}\u0000${row.source_entity_id}`,
        Object.freeze({
          observationId: row.observation_id,
          revisionId: row.revision_id,
        }),
      ]),
    ),
    events: new Map(
      eventResult.rows.map((row) => [row.event_id, row.revision_id]),
    ),
  });
}

function musicBrainzOutcome(
  collection: MusicBrainzActivityExposureCollection,
  observation: ActivityExposureProviderObservation,
): ActivityExposureNormalizationOutcome {
  if (observation.normalizedEventIds.length > 0) return 'event_emitted';
  if (
    observation.sourceEntityType === 'release-group'
    && collection.missingSourceDataReleaseGroupIds.includes(
      observation.sourceEntityId,
    )
  ) {
    return 'missing_source_data';
  }
  if (
    observation.sourceEntityType === 'release-group'
    && collection.identityUnresolvedReleaseGroupIds.includes(
      observation.sourceEntityId,
    )
  ) {
    return 'identity_unresolved';
  }
  return 'no_event';
}

function youtubeOutcome(
  collection: YouTubeActivityExposureCollection,
  observation: ActivityExposureProviderObservation,
): ActivityExposureNormalizationOutcome {
  if (observation.normalizedEventIds.length > 0) return 'event_emitted';
  if (
    observation.sourceEntityType === 'video'
    && collection.unavailableVideoIds.includes(observation.sourceEntityId)
  ) {
    return 'provider_unavailable';
  }
  if (
    observation.sourceEntityType === 'video'
    && collection.channelMismatchVideoIds.includes(observation.sourceEntityId)
  ) {
    return 'identity_unresolved';
  }
  return 'no_event';
}

function buildPlan(input: Readonly<{
  artistId: string;
  provider: ProductActivityExposureProvider;
  providerArtistId: string;
  eventFamily: 'release' | 'official_content';
  startedAt: string;
  completedAt: string;
  providerItemCount: number;
  providerCoverage:
    | MusicBrainzActivityExposureCollection['providerCoverage']
    | YouTubeActivityExposureCollection['providerCoverage'];
  rawObservations: readonly ActivityExposureProviderObservation[];
  events: readonly ProductActivityExposureEvent[];
  outcome: (
    observation: ActivityExposureProviderObservation,
  ) => ActivityExposureNormalizationOutcome;
  prior: PriorState;
}>): ActivityExposurePersistenceInput {
  const currentEvents = new Map(
    input.events.map((event) => {
      const revisionId = buildActivityExposureEventSemanticRevisionId(event);
      const priorRevisionId = input.prior.events.get(event.eventId) ?? null;
      return [
        event.eventId,
        Object.freeze({
          revisionId,
          event: Object.freeze({
            ...event,
            revisionId,
            supersedesRevisionId:
              priorRevisionId === revisionId ? null : priorRevisionId,
          }) satisfies ProductActivityExposureEvent,
        }),
      ];
    }),
  );

  const observations: ActivityExposurePersistenceObservation[] = [];
  for (const observation of input.rawObservations) {
    const normalizationOutcome = input.outcome(observation);
    const eventRevisionIds = observation.normalizedEventIds.map((eventId) => {
      const current = currentEvents.get(eventId);
      if (!current) {
        throw new Error('activity_exposure_bridge_event_binding_invalid');
      }
      return current.revisionId;
    });
    const revisionId = buildObservationSemanticRevisionId({
      observation,
      normalizationOutcome,
      eventRevisionIds,
    });
    const prior = input.prior.observations.get(observationKey(observation));
    if (prior?.revisionId === revisionId) continue;

    observations.push(Object.freeze({
      observation: Object.freeze({
        ...observation,
        priorObservationId: prior?.observationId ?? null,
        supersedesObservationId: prior?.observationId ?? null,
        revisionState: prior ? 'changed' as const : 'original' as const,
      }),
      revisionId,
      normalizationOutcome,
      rawPayloadCanonical: null,
    }));
  }

  const events = Object.freeze(
    input.events.flatMap((event) => {
      const current = currentEvents.get(event.eventId);
      if (!current) return [];
      if (input.prior.events.get(event.eventId) === current.revisionId) {
        return [];
      }
      return [current.event];
    }),
  );

  return Object.freeze({
    artistId: input.artistId,
    provider: input.provider,
    providerArtistId: input.providerArtistId,
    eventFamily: input.eventFamily,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    providerItemCount: input.providerItemCount,
    boundedErrorMetadata: null,
    providerCoverage: input.providerCoverage,
    observations: Object.freeze(observations),
    events,
  });
}

export async function persistMusicBrainzActivityExposureShadow(input: Readonly<{
  collection: MusicBrainzActivityExposureCollection;
  startedAt: string;
  completedAt: string;
  pool: ActivityExposurePersistencePool;
}>): Promise<PersistActivityExposureResult> {
  const prior = await readPriorState(
    input.collection.artistId,
    'musicbrainz',
    input.pool,
  );
  const plan = buildPlan({
    artistId: input.collection.artistId,
    provider: 'musicbrainz',
    providerArtistId: input.collection.providerArtistId,
    eventFamily: 'release',
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    providerItemCount: input.collection.providerReleaseGroupCount,
    providerCoverage: input.collection.providerCoverage,
    rawObservations: input.collection.rawObservations,
    events: input.collection.events,
    outcome: (observation) => musicBrainzOutcome(input.collection, observation),
    prior,
  });
  return persistActivityExposureCollection(plan, input.pool);
}

export async function persistYouTubeActivityExposureShadow(input: Readonly<{
  collection: YouTubeActivityExposureCollection;
  startedAt: string;
  completedAt: string;
  pool: ActivityExposurePersistencePool;
}>): Promise<PersistActivityExposureResult> {
  const prior = await readPriorState(
    input.collection.artistId,
    'youtube',
    input.pool,
  );
  const plan = buildPlan({
    artistId: input.collection.artistId,
    provider: 'youtube',
    providerArtistId: input.collection.providerArtistId,
    eventFamily: 'official_content',
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    providerItemCount: input.collection.playlistVideoIds.length,
    providerCoverage: input.collection.providerCoverage,
    rawObservations: input.collection.rawObservations,
    events: input.collection.events,
    outcome: (observation) => youtubeOutcome(input.collection, observation),
    prior,
  });
  return persistActivityExposureCollection(plan, input.pool);
}
