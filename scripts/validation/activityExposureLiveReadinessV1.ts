import { Pool } from 'pg';

import {
  evaluateActivityExposureProductionReadiness,
} from '../../lib/product/activation/activityExposureProductionReadiness';
import {
  readActivityExposureShadowProduct,
  readActivityExposureStoredEvidence,
  type ActivityExposurePersistencePool,
} from '../../lib/server/ingestion/activityExposureRepository';
import {
  requireRuntimeDatabaseUrl,
} from '../../lib/server/persistence/contracts';

async function main() {
  const connectionString = requireRuntimeDatabaseUrl(process.env);
  const pool = new Pool({
    connectionString,
    max: 2,
    connectionTimeoutMillis: 10_000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
    ssl: { rejectUnauthorized: true },
  });
  const repositoryPool = pool as unknown as ActivityExposurePersistencePool;

  try {
    const authority = await pool.query(`
      SELECT
        current_user = 'fandex_runtime' AS exact_runtime_role,
        has_schema_privilege(current_user, 'fandex', 'CREATE') AS schema_create
    `);
    if (
      authority.rows[0]?.exact_runtime_role !== true
      || authority.rows[0]?.schema_create !== false
    ) {
      throw new Error('activity_exposure_live_readiness_authority_invalid');
    }

    const result = await readActivityExposureShadowProduct(
      'iu',
      repositoryPool,
    );
    const readiness = evaluateActivityExposureProductionReadiness(result);
    if (readiness.status !== 'ready-for-activation-authorization') {
      throw new Error('activity_exposure_live_readiness_blocked');
    }
    if (result.status !== 'ok') {
      throw new Error('activity_exposure_live_read_model_data_issue');
    }

    const tracedEvents = result.model.events.filter(
      (event) => event.storedEvidenceTrace !== undefined,
    );
    if (tracedEvents.length !== result.model.events.length) {
      throw new Error('activity_exposure_live_stored_evidence_trace_missing');
    }

    const sample = result.model.events[0];
    if (!sample?.storedEvidenceTrace) {
      throw new Error('activity_exposure_live_sample_missing');
    }
    const storedEvidence = await readActivityExposureStoredEvidence(
      {
        artistId: 'iu',
        eventRecordId: sample.storedEvidenceTrace.eventRecordId,
      },
      repositoryPool,
    );
    if (
      storedEvidence.status !== 'ok'
      || storedEvidence.model.sourceObservationId
        !== sample.storedEvidenceTrace.sourceObservationId
    ) {
      throw new Error('activity_exposure_live_stored_evidence_round_trip_failed');
    }

    console.log('ACTIVITY_EXPOSURE_LIVE_READINESS=PASS');
    console.log(JSON.stringify({
      status: readiness.status,
      target: readiness.target,
      checks: readiness.checks,
      eventCount: readiness.eventCount,
      providerCount: readiness.providerCount,
      publication: result.model.publication,
      dataOrigin: result.model.dataOrigin,
      presentation: result.model.presentation,
      tracedEventCount: tracedEvents.length,
      sampleStoredEvidence: {
        sourceProvider: storedEvidence.model.sourceProvider,
        normalizationOutcome: storedEvidence.model.normalizationOutcome,
        retentionState: storedEvidence.model.retentionState,
        providerObservedAt: storedEvidence.model.providerObservedAt,
        rawPayloadExposed: 'rawPayload' in storedEvidence.model,
      },
    }));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'activity_exposure_live_readiness_failed',
  );
  process.exitCode = 1;
});
