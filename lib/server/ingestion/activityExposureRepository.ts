import type {
  ProductActivityExposureEvent,
  ProductActivityExposureEventFamily,
  ProductActivityExposureProvider,
  ProductActivityExposureProviderCoverage,
  ProductActivityExposureReadModelResult,
} from '../../product/contracts/productActivityExposure';
import {
  buildProductActivityExposureReadModel,
} from '../../product/adapters/activityExposureProductReadModel';
import {
  canonicalJson,
  isSha256,
  sha256Canonical,
} from '../../shared/canonicalDigest';
import {
  validateActivityExposureProviderObservation,
  type ActivityExposureProviderObservation,
} from './activityExposureContracts';

export const ACTIVITY_EXPOSURE_PERSISTENCE_CONTRACT_VERSION =
  'activity-exposure-event-v1' as const;

export type ActivityExposureNormalizationOutcome =
  | 'event_emitted'
  | 'missing_source_data'
  | 'identity_unresolved'
  | 'provider_unavailable'
  | 'invalid'
  | 'no_event';

export type ActivityExposurePersistenceObservation = Readonly<{
  observation: ActivityExposureProviderObservation;
  revisionId: string;
  normalizationOutcome: ActivityExposureNormalizationOutcome;
  rawPayloadCanonical: string | null;
}>;

export type ActivityExposurePersistenceInput = Readonly<{
  artistId: string;
  provider: ProductActivityExposureProvider;
  providerArtistId: string;
  eventFamily: ProductActivityExposureEventFamily;
  startedAt: string;
  completedAt: string;
  providerItemCount: number | null;
  boundedErrorMetadata?: Readonly<Record<string, unknown>> | null;
  providerCoverage: ProductActivityExposureProviderCoverage;
  observations: readonly ActivityExposurePersistenceObservation[];
  events: readonly ProductActivityExposureEvent[];
}>;

type QueryResultLike<T> = { rowCount: number | null; rows: T[] };
type Queryable = {
  query<T = Record<string, unknown>>(
    sql: string,
    values?: readonly unknown[],
  ): Promise<QueryResultLike<T>>;
};
type TransactionClient = Queryable & { release(): void };
export type ActivityExposurePersistencePool = Queryable & {
  connect(): Promise<TransactionClient>;
};

type CollectionRunRow = {
  provider: ProductActivityExposureProvider;
  provider_artist_id: string;
  collection_status: ProductActivityExposureProviderCoverage['collectionStatus'];
  coverage_state: ProductActivityExposureProviderCoverage['coverageState'];
  collected_at: string | Date | null;
};

type EventRow = {
  event_record_id: string;
  source_observation_id: string;
  event_id: string;
  revision_id: string;
  supersedes_revision_id: string | null;
  artist_id: string;
  event_family: ProductActivityExposureEventFamily;
  event_type: ProductActivityExposureEvent['eventType'];
  lifecycle_state: ProductActivityExposureEvent['lifecycleState'];
  announced_at: string | Date | null;
  scheduled_start_at: string | Date | null;
  scheduled_end_at: string | Date | null;
  occurred_at: string | null;
  occurred_at_precision: ProductActivityExposureEvent['occurredAtPrecision'];
  source_published_at: string | Date | null;
  collected_at: string | Date;
  source_provider: ProductActivityExposureProvider;
  source_entity_type: ProductActivityExposureEvent['sourceEntityType'];
  source_entity_id: string;
  canonical_family_id: string | null;
  provider_artist_id: string;
  provider_artist_credits: ProductActivityExposureEvent['providerArtistCredits'];
  evidence_ref: string;
  identity_state: string;
  missing_state: ProductActivityExposureEvent['missingState'];
  evidence_state: string;
  conflict_state: string;
  time_zone_state: string;
};

function exactIso(value: string, code: string): string {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(code);
  return new Date(parsed).toISOString();
}

function isoFromDatabase(value: string | Date | null): string | null {
  if (value === null) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error('activity_exposure_database_time_invalid');
  }
  return parsed.toISOString();
}

function boundedIdentifier(value: string, code: string) {
  if (
    value.length < 1
    || Buffer.byteLength(value, 'utf8') > 256
    || !/^[a-zA-Z0-9][a-zA-Z0-9._:@/+\-]*$/.test(value)
  ) {
    throw new Error(code);
  }
  return value;
}

function rawPayloadForDatabase(
  record: ActivityExposurePersistenceObservation,
): unknown | null {
  const state = record.observation.rawPayloadRetentionState;

  if (state === 'retained') {
    if (record.rawPayloadCanonical === null) {
      throw new Error('activity_exposure_retained_payload_missing');
    }
    if (
      sha256Canonical(record.rawPayloadCanonical)
      !== record.observation.rawPayloadDigest
    ) {
      throw new Error('activity_exposure_retained_payload_digest_mismatch');
    }
    try {
      return JSON.parse(record.rawPayloadCanonical) as unknown;
    } catch {
      throw new Error('activity_exposure_retained_payload_invalid');
    }
  }

  if (record.rawPayloadCanonical !== null) {
    throw new Error('activity_exposure_nonretained_payload_present');
  }

  return null;
}

function databaseRetentionState(
  observation: ActivityExposureProviderObservation,
): 'retained' | 'evicted' | 'not_retained' {
  if (observation.rawPayloadRetentionState === 'retained') return 'retained';
  if (observation.rawPayloadRetentionState === 'evicted') return 'evicted';
  return 'not_retained';
}

function sourceObservationForEvent(
  input: ActivityExposurePersistenceInput,
  event: ProductActivityExposureEvent,
) {
  const matches = input.observations.filter(({ observation }) =>
    observation.sourceProvider === event.sourceProvider
    && observation.sourceEntityType === event.sourceEntityType
    && observation.sourceEntityId === event.sourceEntityId
    && observation.normalizedEventIds.includes(event.eventId),
  );

  if (matches.length !== 1) {
    throw new Error('activity_exposure_event_observation_binding_invalid');
  }
  return matches[0];
}

export function buildActivityExposureEventRecordId(input: Readonly<{
  eventId: string;
  revisionId: string;
  sourceObservationId: string;
}>) {
  return sha256Canonical({
    contractVersion: ACTIVITY_EXPOSURE_PERSISTENCE_CONTRACT_VERSION,
    eventId: input.eventId,
    revisionId: input.revisionId,
    sourceObservationId: input.sourceObservationId,
  });
}

export function buildActivityExposurePersistenceRunId(
  input: ActivityExposurePersistenceInput,
) {
  return sha256Canonical({
    contractVersion: ACTIVITY_EXPOSURE_PERSISTENCE_CONTRACT_VERSION,
    artistId: input.artistId,
    provider: input.provider,
    providerArtistId: input.providerArtistId,
    eventFamily: input.eventFamily,
    startedAt: input.startedAt,
    completedAt: input.completedAt,
    providerItemCount: input.providerItemCount,
    boundedErrorMetadata: input.boundedErrorMetadata ?? null,
    providerCoverage: input.providerCoverage,
    observations: [...input.observations]
      .map((record) => ({
        observation: record.observation,
        revisionId: record.revisionId,
        normalizationOutcome: record.normalizationOutcome,
      }))
      .sort((left, right) =>
        left.observation.observationId.localeCompare(
          right.observation.observationId,
        ),
      ),
    events: [...input.events]
      .map((event) => ({
        eventId: event.eventId,
        revisionId: event.revisionId,
        sourceProvider: event.sourceProvider,
        sourceEntityType: event.sourceEntityType,
        sourceEntityId: event.sourceEntityId,
      }))
      .sort((left, right) =>
        `${left.eventId}:${left.revisionId}`.localeCompare(
          `${right.eventId}:${right.revisionId}`,
        ),
      ),
  });
}

function validatePersistenceInput(input: ActivityExposurePersistenceInput) {
  const startedAt = exactIso(
    input.startedAt,
    'activity_exposure_run_time_invalid',
  );
  const completedAt = exactIso(
    input.completedAt,
    'activity_exposure_run_time_invalid',
  );
  if (Date.parse(completedAt) < Date.parse(startedAt)) {
    throw new Error('activity_exposure_run_time_invalid');
  }
  if (
    input.providerItemCount !== null
    && (!Number.isInteger(input.providerItemCount) || input.providerItemCount < 0)
  ) {
    throw new Error('activity_exposure_provider_item_count_invalid');
  }
  if (
    input.providerCoverage.provider !== input.provider
    || input.providerCoverage.providerArtistId !== input.providerArtistId
    || input.providerCoverage.collectedAt === null
  ) {
    throw new Error('activity_exposure_provider_coverage_binding_invalid');
  }
  exactIso(
    input.providerCoverage.collectedAt,
    'activity_exposure_provider_coverage_time_invalid',
  );

  const observationIds = new Set<string>();
  for (const record of input.observations) {
    const observation = record.observation;
    if (
      observation.artistId !== input.artistId
      || observation.sourceProvider !== input.provider
      || observation.providerArtistId !== input.providerArtistId
    ) {
      throw new Error('activity_exposure_observation_binding_invalid');
    }
    if (observationIds.has(observation.observationId)) {
      throw new Error('activity_exposure_duplicate_observation');
    }
    observationIds.add(observation.observationId);
    if (!isSha256(observation.observationId)) {
      throw new Error('activity_exposure_observation_id_invalid');
    }
    boundedIdentifier(
      record.revisionId,
      'activity_exposure_observation_revision_invalid',
    );
    const issues = validateActivityExposureProviderObservation(observation);
    if (issues.length > 0) {
      throw new Error('activity_exposure_observation_contract_invalid');
    }
    rawPayloadForDatabase(record);
  }

  const eventKeys = new Set<string>();
  for (const event of input.events) {
    if (
      event.artistId !== input.artistId
      || event.sourceProvider !== input.provider
      || event.providerArtistId !== input.providerArtistId
      || event.eventFamily !== input.eventFamily
    ) {
      throw new Error('activity_exposure_event_binding_invalid');
    }
    boundedIdentifier(
      event.revisionId,
      'activity_exposure_event_revision_invalid',
    );
    const key = `${event.eventId}\u0000${event.revisionId}`;
    if (eventKeys.has(key)) {
      throw new Error('activity_exposure_duplicate_event_revision');
    }
    eventKeys.add(key);
    sourceObservationForEvent(input, event);
  }

  const boundedErrorMetadata = input.boundedErrorMetadata ?? null;
  if (
    boundedErrorMetadata !== null
    && Buffer.byteLength(canonicalJson(boundedErrorMetadata), 'utf8') > 4096
  ) {
    throw new Error('activity_exposure_bounded_error_metadata_invalid');
  }

  return { startedAt, completedAt, boundedErrorMetadata };
}

async function withTransaction<T>(
  pool: ActivityExposurePersistencePool,
  operation: (client: TransactionClient) => Promise<T>,
): Promise<T> {
  let client: TransactionClient;
  try {
    client = await pool.connect();
  } catch {
    throw new Error('activity_exposure_repository_operation_failed');
  }

  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Fail closed below.
    }
    if (
      error instanceof Error
      && /^activity_exposure_[a-z_]+$/.test(error.message)
    ) {
      throw error;
    }
    throw new Error('activity_exposure_repository_operation_failed');
  } finally {
    client.release();
  }
}

async function predecessorEventRecordId(
  client: Queryable,
  event: ProductActivityExposureEvent,
): Promise<string | null> {
  if (event.supersedesRevisionId === null) return null;

  const result = await client.query<{ event_record_id: string }>(
    `SELECT event_record_id
       FROM fandex.activity_exposure_events
      WHERE event_id = $1 AND revision_id = $2`,
    [event.eventId, event.supersedesRevisionId],
  );

  if (result.rows.length !== 1 || !isSha256(result.rows[0]?.event_record_id)) {
    throw new Error('activity_exposure_superseded_event_missing');
  }
  return result.rows[0].event_record_id;
}

export type PersistActivityExposureResult = Readonly<{
  status: 'applied' | 'idempotent';
  runId: string;
  observationCount: number;
  eventCount: number;
}>;

export async function persistActivityExposureCollection(
  input: ActivityExposurePersistenceInput,
  pool: ActivityExposurePersistencePool,
): Promise<PersistActivityExposureResult> {
  const validated = validatePersistenceInput(input);
  const runId = buildActivityExposurePersistenceRunId(input);

  return withTransaction(pool, async (client) => {
    const insertedRun = await client.query<{ run_id: string }>(
      `INSERT INTO fandex.activity_exposure_collection_runs
        (run_id, contract_version, artist_id, provider, provider_artist_id,
         event_family, collection_status, coverage_state, started_at,
         completed_at, provider_item_count, observation_count, event_count,
         bounded_error_metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
       ON CONFLICT (run_id) DO NOTHING
       RETURNING run_id`,
      [
        runId,
        ACTIVITY_EXPOSURE_PERSISTENCE_CONTRACT_VERSION,
        input.artistId,
        input.provider,
        input.providerArtistId,
        input.eventFamily,
        input.providerCoverage.collectionStatus,
        input.providerCoverage.coverageState,
        validated.startedAt,
        validated.completedAt,
        input.providerItemCount,
        input.observations.length,
        input.events.length,
        validated.boundedErrorMetadata === null
          ? null
          : JSON.stringify(validated.boundedErrorMetadata),
      ],
    );

    if (insertedRun.rowCount === 0) {
      return Object.freeze({
        status: 'idempotent' as const,
        runId,
        observationCount: input.observations.length,
        eventCount: input.events.length,
      });
    }

    for (const record of input.observations) {
      const observation = record.observation;
      await client.query(
        `INSERT INTO fandex.activity_exposure_provider_observations
          (observation_id, run_id, artist_id, provider, provider_artist_id,
           source_entity_type, source_entity_id, request_ref,
           response_captured_at, collected_at, source_published_at,
           provider_observed_at, evidence_ref, raw_payload_sha256,
           normalization_outcome, revision_id, supersedes_observation_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
        [
          observation.observationId,
          runId,
          input.artistId,
          input.provider,
          input.providerArtistId,
          observation.sourceEntityType,
          observation.sourceEntityId,
          observation.requestRef,
          exactIso(
            observation.responseCapturedAt,
            'activity_exposure_observation_time_invalid',
          ),
          exactIso(
            observation.collectedAt,
            'activity_exposure_observation_time_invalid',
          ),
          observation.sourcePublishedAt,
          observation.providerObservedAt,
          observation.evidenceRef,
          observation.rawPayloadDigest,
          record.normalizationOutcome,
          record.revisionId,
          observation.supersedesObservationId,
        ],
      );

      const rawPayload = rawPayloadForDatabase(record);
      await client.query(
        `INSERT INTO fandex.activity_exposure_raw_payloads
          (observation_id, provider, raw_payload, raw_payload_sha256,
           retention_state, retention_policy_version, retained_at,
           refresh_due_at, refreshed_at, evicted_at)
         VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7,$8,$9,$10)`,
        [
          observation.observationId,
          observation.sourceProvider,
          rawPayload === null ? null : JSON.stringify(rawPayload),
          observation.rawPayloadDigest,
          databaseRetentionState(observation),
          observation.retentionPolicyVersion,
          observation.retainedAt,
          observation.refreshDueAt,
          observation.refreshedAt,
          observation.evictedAt,
        ],
      );
    }

    for (const event of input.events) {
      const sourceObservation = sourceObservationForEvent(input, event);
      const sourceObservationId = sourceObservation.observation.observationId;
      const eventRecordId = buildActivityExposureEventRecordId({
        eventId: event.eventId,
        revisionId: event.revisionId,
        sourceObservationId,
      });
      const supersedesEventRecordId =
        await predecessorEventRecordId(client, event);

      await client.query(
        `INSERT INTO fandex.activity_exposure_events
          (event_record_id, event_id, revision_id, supersedes_event_record_id,
           source_observation_id, artist_id, event_family, event_type,
           lifecycle_state, announced_at, scheduled_start_at, scheduled_end_at,
           occurred_at, occurred_at_precision, source_published_at, collected_at,
           source_provider, source_entity_type, source_entity_id,
           canonical_family_id, provider_artist_id, provider_artist_credits,
           evidence_ref, identity_state, missing_state, evidence_state,
           conflict_state, time_zone_state)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
                 $17,$18,$19,$20,$21,$22::jsonb,$23,$24,$25,$26,$27,$28)`,
        [
          eventRecordId,
          event.eventId,
          event.revisionId,
          supersedesEventRecordId,
          sourceObservationId,
          event.artistId,
          event.eventFamily,
          event.eventType,
          event.lifecycleState,
          event.announcedAt,
          event.scheduledStartAt,
          event.scheduledEndAt,
          event.occurredAt,
          event.occurredAtPrecision,
          event.sourcePublishedAt,
          exactIso(event.collectedAt, 'activity_exposure_event_time_invalid'),
          event.sourceProvider,
          event.sourceEntityType,
          event.sourceEntityId,
          event.canonicalFamilyId,
          event.providerArtistId,
          JSON.stringify(event.providerArtistCredits),
          event.evidenceRef,
          event.identityState,
          event.missingState,
          event.evidenceState,
          event.conflictState,
          event.timeZoneState,
        ],
      );
    }

    return Object.freeze({
      status: 'applied' as const,
      runId,
      observationCount: input.observations.length,
      eventCount: input.events.length,
    });
  });
}

export async function readActivityExposureShadowProduct(
  artistIdInput: string,
  pool: Queryable,
): Promise<ProductActivityExposureReadModelResult> {
  const artistId = artistIdInput.trim();
  if (!artistId) throw new Error('activity_exposure_artist_id_invalid');

  try {
    const [coverageResult, eventResult] = await Promise.all([
      pool.query<CollectionRunRow>(
        `SELECT DISTINCT ON (runs.provider)
            runs.provider,
            runs.provider_artist_id,
            runs.collection_status,
            runs.coverage_state,
            runs.completed_at AS collected_at
         FROM fandex.activity_exposure_collection_runs runs
         WHERE runs.artist_id = $1
         ORDER BY runs.provider, runs.completed_at DESC, runs.run_id DESC`,
        [artistId],
      ),
      pool.query<EventRow>(
        `SELECT DISTINCT ON (events.event_id)
            events.event_record_id,
            events.source_observation_id,
            events.event_id,
            events.revision_id,
            superseded.revision_id AS supersedes_revision_id,
            events.artist_id,
            events.event_family,
            events.event_type,
            events.lifecycle_state,
            events.announced_at,
            events.scheduled_start_at,
            events.scheduled_end_at,
            events.occurred_at,
            events.occurred_at_precision,
            events.source_published_at,
            events.collected_at,
            events.source_provider,
            events.source_entity_type,
            events.source_entity_id,
            events.canonical_family_id,
            events.provider_artist_id,
            events.provider_artist_credits,
            events.evidence_ref,
            events.identity_state,
            events.missing_state,
            events.evidence_state,
            events.conflict_state,
            events.time_zone_state
         FROM fandex.activity_exposure_events events
         LEFT JOIN fandex.activity_exposure_events superseded
           ON superseded.event_record_id = events.supersedes_event_record_id
         WHERE events.artist_id = $1
         ORDER BY events.event_id, events.collected_at DESC, events.event_record_id DESC`,
        [artistId],
      ),
    ]);

    const providerCoverage = Object.freeze(
      coverageResult.rows.map((row) => Object.freeze({
        provider: row.provider,
        providerArtistId: row.provider_artist_id,
        collectionStatus: row.collection_status,
        coverageState: row.coverage_state,
        collectedAt: isoFromDatabase(row.collected_at),
      })),
    );

    const events = Object.freeze(
      eventResult.rows.map((row) => {
        const credits = Object.freeze(
          [...row.provider_artist_credits].map((credit) => Object.freeze({
            providerArtistId: credit.providerArtistId,
            creditedName: credit.creditedName,
            canonicalProviderName: credit.canonicalProviderName,
          })),
        );

        return Object.freeze({
          artistId: row.artist_id,
          eventId: row.event_id,
          eventFamily: row.event_family,
          eventType: row.event_type,
          lifecycleState: row.lifecycle_state,
          participationScope:
            credits.length > 1 ? 'collaboration' as const : 'solo' as const,
          announcedAt: isoFromDatabase(row.announced_at),
          scheduledStartAt: isoFromDatabase(row.scheduled_start_at),
          scheduledEndAt: isoFromDatabase(row.scheduled_end_at),
          occurredAt: row.occurred_at,
          occurredAtPrecision: row.occurred_at_precision,
          sourcePublishedAt: isoFromDatabase(row.source_published_at),
          collectedAt: isoFromDatabase(row.collected_at)!,
          sourceProvider: row.source_provider,
          sourceEntityType: row.source_entity_type,
          sourceEntityId: row.source_entity_id,
          canonicalFamilyId: row.canonical_family_id,
          providerArtistId: row.provider_artist_id,
          providerArtistCredits: credits,
          evidenceRef: row.evidence_ref,
          identityState: row.identity_state,
          missingState: row.missing_state,
          evidenceState: row.evidence_state,
          conflictState: row.conflict_state,
          timeZoneState: row.time_zone_state,
          revisionId: row.revision_id,
          supersedesRevisionId: row.supersedes_revision_id,
          storedEvidenceTrace: Object.freeze({
            eventRecordId: row.event_record_id,
            sourceObservationId: row.source_observation_id,
          }),
        }) satisfies ProductActivityExposureEvent;
      }),
    );

    return buildProductActivityExposureReadModel({
      artistId,
      events,
      providerCoverage,
      publication: 'shadow',
      presentation: 'standard',
    });
  } catch (error) {
    if (
      error instanceof Error
      && /^activity_exposure_[a-z_]+$/.test(error.message)
    ) {
      throw error;
    }
    throw new Error('activity_exposure_repository_operation_failed');
  }
}


export type ActivityExposureStoredEvidenceModel = Readonly<{
  artistId: string;
  eventRecordId: string;
  eventId: string;
  eventRevisionId: string;
  sourceObservationId: string;
  sourceProvider: ProductActivityExposureProvider;
  sourceEntityType: ProductActivityExposureEvent['sourceEntityType'];
  sourceEntityId: string;
  evidenceRef: string;
  observationRevisionId: string;
  normalizationOutcome: ActivityExposureNormalizationOutcome;
  responseCapturedAt: string;
  collectedAt: string;
  sourcePublishedAt: string | null;
  providerObservedAt: string | null;
  rawPayloadSha256: string;
  retentionState: 'retained' | 'evicted' | 'not_retained';
  retentionPolicyVersion: string;
  retainedAt: string | null;
  refreshDueAt: string | null;
  refreshedAt: string | null;
  evictedAt: string | null;
}>;

export type ActivityExposureStoredEvidenceReadResult =
  | Readonly<{
      status: 'ok';
      model: ActivityExposureStoredEvidenceModel;
    }>
  | Readonly<{
      status: 'not-found';
    }>
  | Readonly<{
      status: 'data-issue';
      reason: 'duplicate-record' | 'invalid-lineage' | 'runtime-read-failed';
    }>;

type StoredEvidenceRow = {
  event_record_id: string;
  event_id: string;
  event_revision_id: string;
  source_observation_id: string;
  source_provider: ProductActivityExposureProvider;
  source_entity_type: ProductActivityExposureEvent['sourceEntityType'];
  source_entity_id: string;
  evidence_ref: string;
  observation_revision_id: string;
  normalization_outcome: ActivityExposureNormalizationOutcome;
  response_captured_at: string | Date;
  observation_collected_at: string | Date;
  source_published_at: string | Date | null;
  provider_observed_at: string | null;
  raw_payload_sha256: string;
  retention_state: 'retained' | 'evicted' | 'not_retained';
  retention_policy_version: string;
  retained_at: string | Date | null;
  refresh_due_at: string | Date | null;
  refreshed_at: string | Date | null;
  evicted_at: string | Date | null;
};

export async function readActivityExposureStoredEvidence(
  input: Readonly<{
    artistId: string;
    eventRecordId: string;
  }>,
  pool: Queryable,
): Promise<ActivityExposureStoredEvidenceReadResult> {
  const artistId = input.artistId.trim();
  if (!artistId) {
    throw new Error('activity_exposure_artist_id_invalid');
  }
  if (!isSha256(input.eventRecordId)) {
    throw new Error('activity_exposure_event_record_id_invalid');
  }

  try {
    const result = await pool.query<StoredEvidenceRow>(
      `SELECT
          events.event_record_id,
          events.event_id,
          events.revision_id AS event_revision_id,
          events.source_observation_id,
          events.source_provider,
          events.source_entity_type,
          events.source_entity_id,
          events.evidence_ref,
          observations.revision_id AS observation_revision_id,
          observations.normalization_outcome,
          observations.response_captured_at,
          observations.collected_at AS observation_collected_at,
          observations.source_published_at,
          observations.provider_observed_at,
          observations.raw_payload_sha256,
          raw.retention_state,
          raw.retention_policy_version,
          raw.retained_at,
          raw.refresh_due_at,
          raw.refreshed_at,
          raw.evicted_at
       FROM fandex.activity_exposure_events events
       JOIN fandex.activity_exposure_provider_observations observations
         ON observations.observation_id = events.source_observation_id
       JOIN fandex.activity_exposure_raw_payloads raw
         ON raw.observation_id = observations.observation_id
       WHERE events.artist_id = $1
         AND events.event_record_id = $2`,
      [artistId, input.eventRecordId],
    );

    if (result.rows.length === 0) {
      return Object.freeze({ status: 'not-found' as const });
    }
    if (result.rows.length !== 1) {
      return Object.freeze({
        status: 'data-issue' as const,
        reason: 'duplicate-record' as const,
      });
    }

    const row = result.rows[0];
    if (
      row.event_record_id !== input.eventRecordId
      || !isSha256(row.event_record_id)
      || !isSha256(row.source_observation_id)
      || !isSha256(row.raw_payload_sha256)
    ) {
      return Object.freeze({
        status: 'data-issue' as const,
        reason: 'invalid-lineage' as const,
      });
    }

    return Object.freeze({
      status: 'ok' as const,
      model: Object.freeze({
        artistId,
        eventRecordId: row.event_record_id,
        eventId: row.event_id,
        eventRevisionId: row.event_revision_id,
        sourceObservationId: row.source_observation_id,
        sourceProvider: row.source_provider,
        sourceEntityType: row.source_entity_type,
        sourceEntityId: row.source_entity_id,
        evidenceRef: row.evidence_ref,
        observationRevisionId: row.observation_revision_id,
        normalizationOutcome: row.normalization_outcome,
        responseCapturedAt: isoFromDatabase(row.response_captured_at)!,
        collectedAt: isoFromDatabase(row.observation_collected_at)!,
        sourcePublishedAt: isoFromDatabase(row.source_published_at),
        providerObservedAt: row.provider_observed_at,
        rawPayloadSha256: row.raw_payload_sha256,
        retentionState: row.retention_state,
        retentionPolicyVersion: row.retention_policy_version,
        retainedAt: isoFromDatabase(row.retained_at),
        refreshDueAt: isoFromDatabase(row.refresh_due_at),
        refreshedAt: isoFromDatabase(row.refreshed_at),
        evictedAt: isoFromDatabase(row.evicted_at),
      }),
    });
  } catch {
    return Object.freeze({
      status: 'data-issue' as const,
      reason: 'runtime-read-failed' as const,
    });
  }
}
