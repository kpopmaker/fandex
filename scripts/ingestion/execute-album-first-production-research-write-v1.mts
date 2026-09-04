import { Pool } from 'pg';
import { artistUniverseV4 } from '../../app/data/v4/artistUniverse';
import { buildAlbumReviewedIdentityRegistry } from '../../lib/server/ingestion/albumReviewedIdentityMappingPacket';
import { normalizeCircleReviewedSubsetDay } from '../../lib/server/ingestion/albumReviewedSubsetNormalizer';
import { validateAlbumBoundedProductionResearchWriteRecoveryReacquisition } from '../../lib/server/ingestion/albumBoundedProductionResearchWriteRecoveryGate';
import {
  createAlbumResearchObservationIntakeGrant,
  planAlbumResearchObservationIntake,
} from '../../lib/server/ingestion/albumResearchObservationIntake';
import {
  createAlbumResearchPersistenceWriteGrant,
  executeAlbumResearchPersistenceWrite,
} from '../../lib/server/ingestion/albumResearchPersistenceWriter';

const EXECUTION_VERSION = 'album-first-production-research-write-execution-v1' as const;
const EXPECTED_HOST = 'ep-quiet-salad-azzz8o0b.c-3.ap-southeast-1.aws.neon.tech';
const EXPECTED_DATABASE = 'neondb';
const EXPECTED_ROLE = 'fandex_runtime';
const EXPECTED_TABLE_OWNER = 'fandex_migrator';
const EXPECTED_TRIGGER = 'album_research_observation_records_append_only';
const EXPECTED_PAYLOAD_DIGEST = 'd21ba4cb22b58ee014b1cdfc1f899f9860408b927c21ef387b0ba473de5f2236';
const APPROVAL_EVIDENCE_IDS = Object.freeze([
  'jm-user-explicit-reauthorization-2026-09-04:circle-one-reacquisition',
  'jm-user-explicit-reauthorization-2026-09-04:three-bounded-research-writes',
  'album-bounded-production-research-write-recovery-gate-v1:stable-id-required',
]);

const databaseUrl = process.env.FANDEX_RUNTIME_DATABASE_URL?.trim();
if (!databaseUrl) throw new Error('album_first_write_runtime_database_url_missing');

let parsedUrl: URL;
try {
  parsedUrl = new URL(databaseUrl);
} catch {
  throw new Error('album_first_write_runtime_database_url_invalid');
}

if (!['postgres:', 'postgresql:'].includes(parsedUrl.protocol)) {
  throw new Error('album_first_write_runtime_database_protocol_invalid');
}
if (decodeURIComponent(parsedUrl.username) !== EXPECTED_ROLE) {
  throw new Error('album_first_write_runtime_url_role_mismatch');
}
if (parsedUrl.hostname !== EXPECTED_HOST || parsedUrl.hostname.includes('-pooler.')) {
  throw new Error('album_first_write_runtime_host_mismatch');
}
if (decodeURIComponent(parsedUrl.pathname.replace(/^\//, '')) !== EXPECTED_DATABASE) {
  throw new Error('album_first_write_runtime_database_mismatch');
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  connectionTimeoutMillis: 10_000,
  idleTimeoutMillis: 5_000,
});

let providerRequests = 0;
let databaseWrites = 0;
let stableObservationIds: readonly string[] = Object.freeze([]);
let reacquisitionDigest: string | null = null;

try {
  const identity = await pool.query<{
    current_user: string;
    session_user: string;
    current_database: string;
  }>(`SELECT current_user, session_user, current_database()`);
  const identityRow = identity.rows[0];
  if (!identityRow
    || identityRow.current_user !== EXPECTED_ROLE
    || identityRow.session_user !== EXPECTED_ROLE
    || identityRow.current_database !== EXPECTED_DATABASE) {
    throw new Error('album_first_write_runtime_session_identity_mismatch');
  }

  const privileges = await pool.query<{
    runtime_select: boolean;
    runtime_insert: boolean;
    runtime_update: boolean;
    runtime_delete: boolean;
    row_count: number;
  }>(`
    SELECT
      has_table_privilege(current_user, 'fandex.album_research_observation_records', 'SELECT') AS runtime_select,
      has_table_privilege(current_user, 'fandex.album_research_observation_records', 'INSERT') AS runtime_insert,
      has_table_privilege(current_user, 'fandex.album_research_observation_records', 'UPDATE') AS runtime_update,
      has_table_privilege(current_user, 'fandex.album_research_observation_records', 'DELETE') AS runtime_delete,
      (SELECT count(*)::int FROM fandex.album_research_observation_records) AS row_count
  `);
  const privilegeRow = privileges.rows[0];
  if (!privilegeRow
    || !privilegeRow.runtime_select
    || !privilegeRow.runtime_insert
    || privilegeRow.runtime_update
    || privilegeRow.runtime_delete) {
    throw new Error('album_first_write_runtime_privileges_invalid');
  }
  if (privilegeRow.row_count !== 0) {
    throw new Error('album_first_write_table_must_be_empty');
  }

  const structural = await pool.query<{
    table_owner: string;
    trigger_name: string | null;
    trigger_enabled: string | null;
  }>(`
    SELECT pg_get_userbyid(c.relowner) AS table_owner,
           t.tgname AS trigger_name,
           t.tgenabled AS trigger_enabled
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_trigger t
        ON t.tgrelid = c.oid
       AND NOT t.tgisinternal
       AND t.tgname = $1
     WHERE n.nspname = 'fandex'
       AND c.relname = 'album_research_observation_records'
  `, [EXPECTED_TRIGGER]);
  const structuralRow = structural.rows[0];
  if (!structuralRow
    || structuralRow.table_owner !== EXPECTED_TABLE_OWNER
    || structuralRow.trigger_name !== EXPECTED_TRIGGER
    || structuralRow.trigger_enabled !== 'O') {
    throw new Error('album_first_write_table_structure_invalid');
  }

  // Provider request authorization is consumed only after every runtime/database preflight passes.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    providerRequests += 1;
    response = await fetch('https://circlechart.kr/data/api/chart/retail_list', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
      body: new URLSearchParams({ termGbn: 'day', yyyymmdd: '20260831' }).toString(),
      redirect: 'error',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (response.status !== 200) throw new Error(`album_first_write_circle_http_status_${response.status}`);
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error('album_first_write_circle_content_type_invalid');
  }
  const text = await response.text();
  let rawResponse: unknown;
  try {
    rawResponse = JSON.parse(text);
  } catch {
    throw new Error('album_first_write_circle_json_invalid');
  }

  const instant = new Date().toISOString();
  const reviewed = normalizeCircleReviewedSubsetDay({
    rawResponse,
    yyyymmdd: '20260831',
    observedAt: instant,
    collectedAt: instant,
    endpointEvidenceIds: Object.freeze(['circle-retail-direct-response-v1:retail-list']),
    quantityEvidenceIds: Object.freeze(['circle-retail-direct-response-v1:rowSum-period-sales']),
    registry: buildAlbumReviewedIdentityRegistry(artistUniverseV4),
  });

  if (reviewed.sourcePayloadDigest !== EXPECTED_PAYLOAD_DIGEST) {
    throw new Error('album_first_write_circle_payload_digest_mismatch');
  }

  const recovery = validateAlbumBoundedProductionResearchWriteRecoveryReacquisition({
    sourcePayloadDigest: reviewed.sourcePayloadDigest,
    status: reviewed.status,
    acceptedObservationCount: reviewed.acceptedObservationCount,
    identityPendingRowCount: reviewed.identityPendingRowCount,
    nonIdentityRejectedRowCount: reviewed.nonIdentityRejectedRowCount,
    observations: reviewed.observations.map(observation => Object.freeze({
      observationId: observation.observationId,
      providerId: observation.providerId,
      providerSkuId: observation.providerSkuId,
      fandexArtistId: observation.fandexArtistId,
      fandexReleaseId: observation.fandexReleaseId,
      providerPeriod: observation.providerPeriod,
      semantic: observation.semantic,
      unit: observation.unit,
      syntheticFixture: observation.syntheticFixture,
      valueIsNonNegativeSafeInteger:
        Number.isSafeInteger(observation.value) && observation.value !== null && observation.value >= 0,
    })),
  });
  if (!recovery.valid) {
    throw new Error(`album_first_write_recovery_gate_blocked:${recovery.issues.join(',')}`);
  }
  stableObservationIds = recovery.stableObservationIds;
  reacquisitionDigest = recovery.reacquisitionDigest;

  const existing = await pool.query<{ observation_id: string }>(
    `SELECT observation_id
       FROM fandex.album_research_observation_records
      WHERE observation_id = ANY($1::text[])`,
    [stableObservationIds],
  );
  if (existing.rows.length !== 0) {
    throw new Error('album_first_write_stable_observation_already_present');
  }

  const intakeGrant = createAlbumResearchObservationIntakeGrant({
    observations: reviewed.observations,
    authorizationEvidenceIds: APPROVAL_EVIDENCE_IDS,
  });
  const intake = planAlbumResearchObservationIntake({
    observations: reviewed.observations,
    existingRecords: Object.freeze([]),
    grant: intakeGrant,
  });
  if (intake.status !== 'planned'
    || intake.records.length !== 3
    || !intake.persistencePlan
    || intake.persistencePlan.actions.length !== 3
    || intake.persistencePlan.actions.some(action => action.action !== 'append')) {
    throw new Error('album_first_write_intake_plan_invalid');
  }

  const writeGrant = createAlbumResearchPersistenceWriteGrant({
    intakeResult: intake,
    authorizationEvidenceIds: Object.freeze([
      ...APPROVAL_EVIDENCE_IDS,
      `album-first-production-research-write-execution-v1:reacquisition:${recovery.reacquisitionDigest}`,
    ]),
  });

  const writeSummary = await executeAlbumResearchPersistenceWrite({
    intakeResult: intake,
    grant: writeGrant,
    pool,
  });
  databaseWrites = writeSummary.databaseWrites;
  if (writeSummary.status !== 'applied'
    || writeSummary.candidateRecordCount !== 3
    || writeSummary.insertedRecordCount !== 3
    || writeSummary.databaseWrites !== 3
    || writeSummary.duplicateVerifiedCount !== 0
    || writeSummary.revisionInsertedCount !== 0) {
    throw new Error('album_first_write_persistence_summary_invalid');
  }

  const post = await pool.query<{
    row_count: number;
    matched_count: number;
    provider_count: number;
    period_count: number;
  }>(`
    SELECT
      count(*)::int AS row_count,
      count(*) FILTER (WHERE observation_id = ANY($1::text[]))::int AS matched_count,
      count(*) FILTER (WHERE provider = 'circle-chart')::int AS provider_count,
      count(*) FILTER (WHERE provider_period = 'day:20260831')::int AS period_count
      FROM fandex.album_research_observation_records
  `, [stableObservationIds]);
  const postRow = post.rows[0];
  if (!postRow
    || postRow.row_count !== 3
    || postRow.matched_count !== 3
    || postRow.provider_count !== 3
    || postRow.period_count !== 3) {
    throw new Error('album_first_write_postcondition_invalid');
  }

  console.log(JSON.stringify({
    contractVersion: EXECUTION_VERSION,
    runtimePreflight: 'pass',
    productionTarget: {
      projectId: 'wild-tree-38937656',
      branchId: 'br-old-term-azv3tpra',
      branchName: 'main',
      databaseName: EXPECTED_DATABASE,
      role: EXPECTED_ROLE,
      host: EXPECTED_HOST,
      connectionMode: 'unpooled',
    },
    providerRequests,
    provider: 'circle-retail',
    providerPeriod: 'day:20260831',
    sourcePayloadDigest: reviewed.sourcePayloadDigest,
    sourceRowCount: reviewed.sourceRowCount,
    acceptedObservationCount: reviewed.acceptedObservationCount,
    identityPendingRowCount: reviewed.identityPendingRowCount,
    nonIdentityRejectedRowCount: reviewed.nonIdentityRejectedRowCount,
    stableObservationIds,
    reacquisitionDigest,
    candidateRecordCount: writeSummary.candidateRecordCount,
    insertedRecordCount: writeSummary.insertedRecordCount,
    databaseWrites,
    finalRowCount: postRow.row_count,
    rawBodyPersisted: false,
    rawBodyEmitted: false,
    salesValuesEmitted: false,
    publicationAuthorized: false,
    schedulerActivated: false,
    hanteoRequests: 0,
    commercialRightsCleared: false,
  }, null, 2));
} finally {
  await pool.end();
}
