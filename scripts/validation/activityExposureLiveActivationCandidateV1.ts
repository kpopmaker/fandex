import { Pool } from 'pg';

import {
  createActivityExposureProductionActivationApprovalCandidate,
} from '../../lib/product/activation/activityExposureProductionActivationApprovalCandidate';
import {
  evaluateActivityExposureProductionReadiness,
} from '../../lib/product/activation/activityExposureProductionReadiness';
import {
  readActivityExposureShadowProduct,
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
      throw new Error('activity_exposure_live_activation_authority_invalid');
    }

    const result = await readActivityExposureShadowProduct(
      'iu',
      repositoryPool,
    );
    const readiness = evaluateActivityExposureProductionReadiness(result);
    const candidate =
      createActivityExposureProductionActivationApprovalCandidate(readiness);

    if (candidate.status !== 'ready-for-owner-attestation') {
      throw new Error('activity_exposure_live_activation_candidate_blocked');
    }
    if (
      candidate.approval.activationAuthorizationId !== null
      || candidate.approval.authorizedAt !== null
      || candidate.activationAuthorized !== false
      || candidate.publicRouteActivated !== false
      || candidate.publication !== 'shadow'
      || candidate.authorizationWithoutApproval.status !== 'not-authorized'
      || candidate.authorizationWithoutApproval.reason
        !== 'activation-approval-absent'
    ) {
      throw new Error('activity_exposure_live_activation_candidate_not_fail_closed');
    }

    console.log('ACTIVITY_EXPOSURE_LIVE_ACTIVATION_CANDIDATE=PASS');
    console.log(JSON.stringify({
      readinessStatus: readiness.status,
      candidateStatus: candidate.status,
      target: candidate.approval.target,
      binding: candidate.approval.binding,
      activationAuthorizationId:
        candidate.approval.activationAuthorizationId,
      authorizedAt: candidate.approval.authorizedAt,
      activationAuthorized: candidate.activationAuthorized,
      publicRouteActivated: candidate.publicRouteActivated,
      publication: candidate.publication,
      authorizationWithoutApproval: {
        status: candidate.authorizationWithoutApproval.status,
        reason:
          candidate.authorizationWithoutApproval.status === 'not-authorized'
            ? candidate.authorizationWithoutApproval.reason
            : null,
      },
      eventCount: readiness.eventCount,
      providerCount: readiness.providerCount,
    }));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'activity_exposure_live_activation_candidate_failed',
  );
  process.exitCode = 1;
});
