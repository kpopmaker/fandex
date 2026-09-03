import { canonicalJson, isSha256, sha256Canonical } from '../../shared/canonicalDigest';
import type { PersistenceAction } from '../../alternative-evidence/persistenceContracts';
import type {
  AlbumResearchObservationIntakeResult,
  AlbumResearchObservationRecord,
} from './albumResearchObservationIntake';

export const ALBUM_RESEARCH_PERSISTENCE_WRITER_VERSION =
  'album-research-persistence-writer-v1' as const;
export const ALBUM_RESEARCH_PERSISTENCE_WRITE_GRANT_VERSION =
  'album-research-persistence-write-grant-v1' as const;

export type AlbumResearchPersistenceWriteGrant = Readonly<{
  grantVersion: typeof ALBUM_RESEARCH_PERSISTENCE_WRITE_GRANT_VERSION;
  scope: 'research';
  intakeResultDigest: string;
  persistencePlanDigest: string;
  recordIds: readonly string[];
  authorizationEvidenceIds: readonly string[];
  databaseWriteExecutionAuthorized: true;
  productionPersistenceAuthorized: false;
  rawBodyStorageAuthorized: false;
  publicationAuthorized: false;
  commercialUseAuthorized: false;
  rightsCleared: false;
  grantDigest: string;
}>;

export type AlbumResearchPersistenceWriteStatus =
  | 'applied'
  | 'idempotent-succeeded'
  | 'blocked'
  | 'failed';

export type AlbumResearchPersistenceWriteSummary = Readonly<{
  contractVersion: typeof ALBUM_RESEARCH_PERSISTENCE_WRITER_VERSION;
  status: AlbumResearchPersistenceWriteStatus;
  intakeResultDigest: string;
  persistencePlanDigest: string;
  writeGrantDigest: string | null;
  candidateRecordCount: number;
  insertedRecordCount: number;
  duplicateVerifiedCount: number;
  revisionInsertedCount: number;
  databaseReads: number;
  databaseWrites: number;
  productionPersistenceAuthorized: false;
  publicationAuthorized: false;
  commercialUseAuthorized: false;
  rightsCleared: false;
  resultDigest: string;
}>;

type QueryResultLike<T> = Readonly<{ rowCount: number | null; rows: T[] }>;
type Queryable = Readonly<{
  query<T = Record<string, unknown>>(sql: string, values?: readonly unknown[]): Promise<QueryResultLike<T>>;
}>;
type TransactionClient = Queryable & Readonly<{ release(): void }>;
export type AlbumResearchPersistencePool = Readonly<{ connect(): Promise<TransactionClient> }>;

type ExistingRow = Readonly<{
  record_id: string;
  source_entity_id: string;
  observation_id: string;
  payload_digest: string;
  record_state: 'original' | 'revised';
  supersedes_record_id: string | null;
  observation_payload: unknown;
}>;

function uniqueSorted(values: readonly string[]): readonly string[] {
  return Object.freeze([...new Set(values)].sort());
}

function grantDigestInput(grant: Omit<AlbumResearchPersistenceWriteGrant, 'grantDigest'>) {
  return {
    grantVersion: grant.grantVersion,
    scope: grant.scope,
    intakeResultDigest: grant.intakeResultDigest,
    persistencePlanDigest: grant.persistencePlanDigest,
    recordIds: grant.recordIds,
    authorizationEvidenceIds: grant.authorizationEvidenceIds,
    databaseWriteExecutionAuthorized: grant.databaseWriteExecutionAuthorized,
    productionPersistenceAuthorized: grant.productionPersistenceAuthorized,
    rawBodyStorageAuthorized: grant.rawBodyStorageAuthorized,
    publicationAuthorized: grant.publicationAuthorized,
    commercialUseAuthorized: grant.commercialUseAuthorized,
    rightsCleared: grant.rightsCleared,
  };
}

function safePlanActions(intake: AlbumResearchObservationIntakeResult): boolean {
  const actions = intake.persistencePlan?.actions ?? [];
  return actions.every(action =>
    action.action === 'append'
    || action.action === 'duplicate-noop'
    || action.action === 'revision-append',
  );
}

export function createAlbumResearchPersistenceWriteGrant(input: Readonly<{
  intakeResult: AlbumResearchObservationIntakeResult;
  authorizationEvidenceIds: readonly string[];
}>): AlbumResearchPersistenceWriteGrant {
  const intake = input.intakeResult;
  if (intake.status !== 'planned' || !intake.persistencePlan || !safePlanActions(intake)) {
    throw new Error('album_research_writer_intake_not_eligible');
  }
  if (intake.records.length === 0) throw new Error('album_research_writer_records_required');
  if (input.authorizationEvidenceIds.length === 0
    || input.authorizationEvidenceIds.some(id => !id.trim())) {
    throw new Error('album_research_writer_authorization_evidence_required');
  }
  const recordIds = uniqueSorted(intake.records.map(record => record.recordId));
  if (recordIds.length !== intake.records.length) {
    throw new Error('album_research_writer_duplicate_record_id');
  }
  const base = Object.freeze({
    grantVersion: ALBUM_RESEARCH_PERSISTENCE_WRITE_GRANT_VERSION,
    scope: 'research' as const,
    intakeResultDigest: intake.resultDigest,
    persistencePlanDigest: intake.persistencePlan.planDigest,
    recordIds,
    authorizationEvidenceIds: uniqueSorted(input.authorizationEvidenceIds),
    databaseWriteExecutionAuthorized: true as const,
    productionPersistenceAuthorized: false as const,
    rawBodyStorageAuthorized: false as const,
    publicationAuthorized: false as const,
    commercialUseAuthorized: false as const,
    rightsCleared: false as const,
  });
  return Object.freeze({
    ...base,
    grantDigest: sha256Canonical(grantDigestInput(base)),
  });
}

function validateWriteGrant(
  grant: AlbumResearchPersistenceWriteGrant | null,
  intake: AlbumResearchObservationIntakeResult,
): readonly string[] {
  if (!grant) return Object.freeze(['album-research-write-grant-required']);
  const reasons: string[] = [];
  if (grant.grantVersion !== ALBUM_RESEARCH_PERSISTENCE_WRITE_GRANT_VERSION) reasons.push('write-grant-version-invalid');
  if (grant.scope !== 'research') reasons.push('write-grant-scope-invalid');
  if (!grant.databaseWriteExecutionAuthorized) reasons.push('database-write-not-authorized');
  if (grant.productionPersistenceAuthorized !== false) reasons.push('production-persistence-must-remain-disabled');
  if (grant.rawBodyStorageAuthorized !== false) reasons.push('raw-body-storage-must-remain-disabled');
  if (grant.publicationAuthorized !== false) reasons.push('publication-must-remain-disabled');
  if (grant.commercialUseAuthorized !== false) reasons.push('commercial-use-must-remain-disabled');
  if (grant.rightsCleared !== false) reasons.push('rights-clearance-must-not-be-implied');
  if (!isSha256(grant.grantDigest)) reasons.push('write-grant-digest-invalid');
  if (grant.authorizationEvidenceIds.length === 0 || grant.authorizationEvidenceIds.some(id => !id.trim())) {
    reasons.push('write-grant-evidence-required');
  }
  const expected = sha256Canonical(grantDigestInput({
    grantVersion: grant.grantVersion,
    scope: grant.scope,
    intakeResultDigest: grant.intakeResultDigest,
    persistencePlanDigest: grant.persistencePlanDigest,
    recordIds: grant.recordIds,
    authorizationEvidenceIds: grant.authorizationEvidenceIds,
    databaseWriteExecutionAuthorized: grant.databaseWriteExecutionAuthorized,
    productionPersistenceAuthorized: grant.productionPersistenceAuthorized,
    rawBodyStorageAuthorized: grant.rawBodyStorageAuthorized,
    publicationAuthorized: grant.publicationAuthorized,
    commercialUseAuthorized: grant.commercialUseAuthorized,
    rightsCleared: grant.rightsCleared,
  }));
  if (expected !== grant.grantDigest) reasons.push('write-grant-digest-mismatch');
  if (grant.intakeResultDigest !== intake.resultDigest) reasons.push('write-grant-intake-result-mismatch');
  if (grant.persistencePlanDigest !== intake.persistencePlan?.planDigest) reasons.push('write-grant-plan-mismatch');
  if (canonicalJson(grant.recordIds) !== canonicalJson(uniqueSorted(intake.records.map(record => record.recordId)))) {
    reasons.push('write-grant-record-set-mismatch');
  }
  return uniqueSorted(reasons);
}

function summary(input: Omit<AlbumResearchPersistenceWriteSummary, 'resultDigest'>): AlbumResearchPersistenceWriteSummary {
  return Object.freeze({ ...input, resultDigest: sha256Canonical(input) });
}

async function selectRecord(client: Queryable, recordId: string): Promise<ExistingRow | null> {
  const result = await client.query<ExistingRow>(
    `SELECT record_id, source_entity_id, observation_id, payload_digest, record_state,
            supersedes_record_id, observation_payload
       FROM fandex.album_research_observation_records
      WHERE record_id = $1`,
    [recordId],
  );
  if (result.rows.length > 1) throw new Error('album_research_writer_record_identity_collision');
  return result.rows[0] ?? null;
}

function exactExistingMatch(existing: ExistingRow, record: AlbumResearchObservationRecord): boolean {
  return existing.record_id === record.recordId
    && existing.source_entity_id === record.sourceEntityId
    && existing.observation_id === record.payload.observationId
    && existing.payload_digest === record.payloadDigest
    && existing.record_state === record.recordState
    && existing.supersedes_record_id === record.supersedesRecordId
    && canonicalJson(existing.observation_payload) === canonicalJson(record.payload);
}

async function insertRecord(
  client: Queryable,
  record: AlbumResearchObservationRecord,
  intakePlanDigest: string,
  grantDigest: string,
): Promise<boolean> {
  const inserted = await client.query<{ record_id: string }>(
    `INSERT INTO fandex.album_research_observation_records
      (record_id, record_version, provider, source_entity_id, source_record_id,
       observation_id, payload_digest, fandex_artist_id, fandex_release_id, provider_period,
       record_state, supersedes_record_id, intake_plan_digest, write_grant_digest,
       authorization_snapshot, observation_payload, observed_at, collected_at, revision_observed_at)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
       $15::jsonb, $16::jsonb, $17, $18, $19)
     ON CONFLICT (record_id) DO NOTHING
     RETURNING record_id`,
    [
      record.recordId,
      record.recordVersion,
      record.payload.providerId,
      record.sourceEntityId,
      record.sourceRecordId,
      record.payload.observationId,
      record.payloadDigest,
      record.payload.fandexArtistId,
      record.payload.fandexReleaseId,
      record.effectivePeriod,
      record.recordState,
      record.supersedesRecordId,
      intakePlanDigest,
      grantDigest,
      JSON.stringify(record.authorizationSnapshot),
      JSON.stringify(record.payload),
      record.observedAt,
      record.collectedAt,
      record.revisionObservedAt,
    ],
  );
  return inserted.rowCount === 1;
}

function actionByRecord(intake: AlbumResearchObservationIntakeResult): ReadonlyMap<string, PersistenceAction> {
  return new Map((intake.persistencePlan?.actions ?? []).map(action => [action.recordId, action.action]));
}

export async function executeAlbumResearchPersistenceWrite(input: Readonly<{
  intakeResult: AlbumResearchObservationIntakeResult;
  grant: AlbumResearchPersistenceWriteGrant | null;
  pool: AlbumResearchPersistencePool;
}>): Promise<AlbumResearchPersistenceWriteSummary> {
  const intake = input.intakeResult;
  const reasons = validateWriteGrant(input.grant, intake);
  if (intake.status !== 'planned' || !intake.persistencePlan || !safePlanActions(intake)) {
    return summary({
      contractVersion: ALBUM_RESEARCH_PERSISTENCE_WRITER_VERSION,
      status: 'blocked',
      intakeResultDigest: intake.resultDigest,
      persistencePlanDigest: intake.persistencePlan?.planDigest ?? '0'.repeat(64),
      writeGrantDigest: input.grant?.grantDigest ?? null,
      candidateRecordCount: intake.records.length,
      insertedRecordCount: 0,
      duplicateVerifiedCount: 0,
      revisionInsertedCount: 0,
      databaseReads: 0,
      databaseWrites: 0,
      productionPersistenceAuthorized: false,
      publicationAuthorized: false,
      commercialUseAuthorized: false,
      rightsCleared: false,
    });
  }
  if (reasons.length > 0 || !input.grant) {
    return summary({
      contractVersion: ALBUM_RESEARCH_PERSISTENCE_WRITER_VERSION,
      status: 'blocked',
      intakeResultDigest: intake.resultDigest,
      persistencePlanDigest: intake.persistencePlan.planDigest,
      writeGrantDigest: input.grant?.grantDigest ?? null,
      candidateRecordCount: intake.records.length,
      insertedRecordCount: 0,
      duplicateVerifiedCount: 0,
      revisionInsertedCount: 0,
      databaseReads: 0,
      databaseWrites: 0,
      productionPersistenceAuthorized: false,
      publicationAuthorized: false,
      commercialUseAuthorized: false,
      rightsCleared: false,
    });
  }

  const client = await input.pool.connect().catch(() => {
    throw new Error('album_research_writer_database_unavailable');
  });
  let databaseReads = 0;
  let databaseWrites = 0;
  let insertedRecordCount = 0;
  let duplicateVerifiedCount = 0;
  let revisionInsertedCount = 0;
  try {
    await client.query('BEGIN');
    const actions = actionByRecord(intake);
    for (const record of intake.records) {
      const action = actions.get(record.recordId);
      if (!action || (action !== 'append' && action !== 'duplicate-noop' && action !== 'revision-append')) {
        throw new Error('album_research_writer_action_not_executable');
      }
      if (action === 'revision-append') {
        if (!record.supersedesRecordId || record.recordState !== 'revised') {
          throw new Error('album_research_writer_revision_metadata_invalid');
        }
        const prior = await selectRecord(client, record.supersedesRecordId);
        databaseReads += 1;
        if (!prior || prior.source_entity_id !== record.sourceEntityId) {
          throw new Error('album_research_writer_revision_target_invalid');
        }
      }

      if (action === 'duplicate-noop') {
        const existing = await selectRecord(client, record.recordId);
        databaseReads += 1;
        if (!existing || !exactExistingMatch(existing, record)) {
          throw new Error('album_research_writer_duplicate_conflict');
        }
        duplicateVerifiedCount += 1;
        continue;
      }

      const inserted = await insertRecord(client, record, intake.persistencePlan.planDigest, input.grant.grantDigest);
      if (inserted) {
        databaseWrites += 1;
        insertedRecordCount += 1;
        if (action === 'revision-append') revisionInsertedCount += 1;
        continue;
      }
      const existing = await selectRecord(client, record.recordId);
      databaseReads += 1;
      if (!existing || !exactExistingMatch(existing, record)) {
        throw new Error('album_research_writer_insert_conflict');
      }
      duplicateVerifiedCount += 1;
    }
    await client.query('COMMIT');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* fail closed */ }
    if (error instanceof Error && /^album_research_writer_[a-z_]+$/.test(error.message)) throw error;
    throw new Error('album_research_writer_operation_failed');
  } finally {
    client.release();
  }

  return summary({
    contractVersion: ALBUM_RESEARCH_PERSISTENCE_WRITER_VERSION,
    status: insertedRecordCount > 0 ? 'applied' : 'idempotent-succeeded',
    intakeResultDigest: intake.resultDigest,
    persistencePlanDigest: intake.persistencePlan.planDigest,
    writeGrantDigest: input.grant.grantDigest,
    candidateRecordCount: intake.records.length,
    insertedRecordCount,
    duplicateVerifiedCount,
    revisionInsertedCount,
    databaseReads,
    databaseWrites,
    productionPersistenceAuthorized: false,
    publicationAuthorized: false,
    commercialUseAuthorized: false,
    rightsCleared: false,
  });
}
