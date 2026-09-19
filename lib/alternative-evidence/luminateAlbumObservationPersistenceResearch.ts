import type { Queryable } from '../server/persistence/contracts';
import {
  ALBUM_DIRECT_OBSERVATION_RESEARCH_RECORD_VERSION,
  type LuminateAlbumObservationStoredRow,
} from './luminateAlbumObservationIntakeResearch';

export const LUMINATE_ALBUM_OBSERVATION_PERSISTENCE_RESEARCH_VERSION =
  'luminate-album-observation-persistence-research-v1' as const;

export const LUMINATE_ALBUM_OBSERVATION_PERSISTENCE_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: LUMINATE_ALBUM_OBSERVATION_PERSISTENCE_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  table: 'fandex.album_research_observation_records' as const,
  appendOnly: true as const,
  allowedSqlMutations: Object.freeze(['insert'] as const),
  updateAllowed: false as const,
  deleteAllowed: false as const,
  runtimePrivilegesRequired: Object.freeze(['select', 'insert'] as const),
  externalProviderCallIncluded: false as const,
  productionWritePath: false as const,
  exactReplayIdempotent: true as const,
  conflictingObservationReplayRejected: true as const,
  revisionRequiresStoredPredecessor: true as const,
});

export type LuminateAlbumObservationPersistenceStatus =
  | 'applied'
  | 'idempotent-existing'
  | 'rejected-conflict'
  | 'rejected-missing-predecessor'
  | 'rejected-predecessor-lineage-mismatch';

export type LuminateAlbumObservationPersistenceResult = Readonly<{
  status: LuminateAlbumObservationPersistenceStatus;
  recordId: string;
  observationId: string;
}>;

type ExistingObservationRow = Readonly<{
  record_id: string;
  observation_id: string;
  payload_digest: string;
  intake_plan_digest: string;
  write_grant_digest: string;
  source_entity_id: string;
  provider: string;
  fandex_artist_id: string;
  fandex_release_id: string;
  record_state: string;
  supersedes_record_id: string | null;
}>;

type InsertedRow = Readonly<{ record_id: string }>;

const HEX64_RE = /^[0-9a-f]{64}$/;

function assertStoredRowShape(row: LuminateAlbumObservationStoredRow): void {
  if (row.record_version !== ALBUM_DIRECT_OBSERVATION_RESEARCH_RECORD_VERSION) {
    throw new Error('luminate_album_observation_record_version_mismatch');
  }
  if (row.provider !== 'luminate-music') throw new Error('luminate_album_observation_provider_mismatch');
  for (const digest of [
    row.record_id,
    row.source_entity_id,
    row.source_record_id,
    row.observation_id,
    row.payload_digest,
    row.intake_plan_digest,
    row.write_grant_digest,
  ]) {
    if (!HEX64_RE.test(digest)) throw new Error('luminate_album_observation_digest_invalid');
  }
  if (row.record_state === 'original') {
    if (row.supersedes_record_id !== null || row.revision_observed_at !== null) {
      throw new Error('luminate_album_observation_original_lineage_invalid');
    }
  } else if (row.record_state === 'revised') {
    if (!row.supersedes_record_id || !HEX64_RE.test(row.supersedes_record_id) || !row.revision_observed_at) {
      throw new Error('luminate_album_observation_revision_lineage_invalid');
    }
  } else {
    throw new Error('luminate_album_observation_record_state_invalid');
  }
}

function sameStoredEvidence(existing: ExistingObservationRow, candidate: LuminateAlbumObservationStoredRow): boolean {
  return existing.record_id === candidate.record_id
    && existing.observation_id === candidate.observation_id
    && existing.payload_digest === candidate.payload_digest
    && existing.intake_plan_digest === candidate.intake_plan_digest
    && existing.write_grant_digest === candidate.write_grant_digest
    && existing.source_entity_id === candidate.source_entity_id
    && existing.provider === candidate.provider
    && existing.fandex_artist_id === candidate.fandex_artist_id
    && existing.fandex_release_id === candidate.fandex_release_id
    && existing.record_state === candidate.record_state
    && existing.supersedes_record_id === candidate.supersedes_record_id;
}

async function findExistingByIdentity(
  db: Queryable,
  row: LuminateAlbumObservationStoredRow,
): Promise<readonly ExistingObservationRow[]> {
  const result = await db.query<ExistingObservationRow>(
    `SELECT record_id, observation_id, payload_digest, intake_plan_digest, write_grant_digest,
            source_entity_id, provider, fandex_artist_id, fandex_release_id, record_state, supersedes_record_id
       FROM fandex.album_research_observation_records
      WHERE record_id = $1 OR observation_id = $2
      ORDER BY record_id`,
    [row.record_id, row.observation_id],
  );
  return result.rows;
}

async function assessExistingReplay(
  db: Queryable,
  row: LuminateAlbumObservationStoredRow,
): Promise<LuminateAlbumObservationPersistenceResult | null> {
  const existing = await findExistingByIdentity(db, row);
  if (existing.length === 0) return null;
  if (existing.length === 1 && sameStoredEvidence(existing[0], row)) {
    return Object.freeze({
      status: 'idempotent-existing' as const,
      recordId: row.record_id,
      observationId: row.observation_id,
    });
  }
  return Object.freeze({
    status: 'rejected-conflict' as const,
    recordId: row.record_id,
    observationId: row.observation_id,
  });
}

async function assessRevisionPredecessor(
  db: Queryable,
  row: LuminateAlbumObservationStoredRow,
): Promise<LuminateAlbumObservationPersistenceResult | null> {
  if (row.record_state !== 'revised' || !row.supersedes_record_id) return null;
  const result = await db.query<ExistingObservationRow>(
    `SELECT record_id, observation_id, payload_digest, intake_plan_digest, write_grant_digest,
            source_entity_id, provider, fandex_artist_id, fandex_release_id, record_state, supersedes_record_id
       FROM fandex.album_research_observation_records
      WHERE record_id = $1`,
    [row.supersedes_record_id],
  );
  if (result.rows.length !== 1) {
    return Object.freeze({
      status: 'rejected-missing-predecessor' as const,
      recordId: row.record_id,
      observationId: row.observation_id,
    });
  }
  const predecessor = result.rows[0];
  if (predecessor.provider !== row.provider
      || predecessor.source_entity_id !== row.source_entity_id
      || predecessor.fandex_artist_id !== row.fandex_artist_id
      || predecessor.fandex_release_id !== row.fandex_release_id) {
    return Object.freeze({
      status: 'rejected-predecessor-lineage-mismatch' as const,
      recordId: row.record_id,
      observationId: row.observation_id,
    });
  }
  return null;
}

export async function persistLuminateAlbumObservationStoredRow(
  db: Queryable,
  row: LuminateAlbumObservationStoredRow,
): Promise<LuminateAlbumObservationPersistenceResult> {
  assertStoredRowShape(row);

  const replay = await assessExistingReplay(db, row);
  if (replay) return replay;

  const predecessor = await assessRevisionPredecessor(db, row);
  if (predecessor) return predecessor;

  const insert = await db.query<InsertedRow>(
    `INSERT INTO fandex.album_research_observation_records (
       record_id, record_version, provider, source_entity_id, source_record_id,
       observation_id, payload_digest, fandex_artist_id, fandex_release_id, provider_period,
       record_state, supersedes_record_id, intake_plan_digest, write_grant_digest,
       authorization_snapshot, observation_payload, observed_at, collected_at, revision_observed_at
     ) VALUES (
       $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,$16::jsonb,$17,$18,$19
     )
     ON CONFLICT DO NOTHING
     RETURNING record_id`,
    [
      row.record_id,
      row.record_version,
      row.provider,
      row.source_entity_id,
      row.source_record_id,
      row.observation_id,
      row.payload_digest,
      row.fandex_artist_id,
      row.fandex_release_id,
      row.provider_period,
      row.record_state,
      row.supersedes_record_id,
      row.intake_plan_digest,
      row.write_grant_digest,
      JSON.stringify(row.authorization_snapshot),
      JSON.stringify(row.observation_payload),
      row.observed_at,
      row.collected_at,
      row.revision_observed_at,
    ],
  );

  if (insert.rowCount === 1 && insert.rows[0]?.record_id === row.record_id) {
    return Object.freeze({
      status: 'applied' as const,
      recordId: row.record_id,
      observationId: row.observation_id,
    });
  }

  const racedReplay = await assessExistingReplay(db, row);
  if (racedReplay) return racedReplay;
  return Object.freeze({
    status: 'rejected-conflict' as const,
    recordId: row.record_id,
    observationId: row.observation_id,
  });
}
