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
      throw new Error('activity_exposure_postmerge_runtime_authority_invalid');
    }

    const result = await readActivityExposureShadowProduct('iu', repositoryPool);
    const readiness = evaluateActivityExposureProductionReadiness(result);
    const candidate =
      createActivityExposureProductionActivationApprovalCandidate(readiness);

    if (
      readiness.status !== 'ready-for-activation-authorization'
      || candidate.status !== 'ready-for-owner-attestation'
    ) {
      throw new Error('activity_exposure_postmerge_activation_candidate_blocked');
    }

    if (
      candidate.approval.activationAuthorizationId !== null
      || candidate.approval.authorizedAt !== null
      || candidate.activationAuthorized !== false
      || candidate.publicRouteActivated !== false
      || candidate.publication !== 'shadow'
      || candidate.directProductionContributionEligible !== false
      || candidate.authorizationWithoutApproval.status !== 'not-authorized'
      || candidate.authorizationWithoutApproval.reason
        !== 'activation-approval-absent'
    ) {
      throw new Error('activity_exposure_postmerge_activation_boundary_invalid');
    }

    console.log('ACTIVITY_EXPOSURE_POSTMERGE_ACTIVATION_CANDIDATE=PASS');
    console.log(JSON.stringify({
      mainSha: process.env.GITHUB_SHA ?? null,
      readinessStatus: readiness.status,
      checks: readiness.checks,
      candidateStatus: candidate.status,
      target: candidate.approval.target,
      binding: candidate.approval.binding,
      eventCount: readiness.eventCount,
      providerCount: readiness.providerCount,
      activationAuthorizationId: candidate.approval.activationAuthorizationId,
      authorizedAt: candidate.approval.authorizedAt,
      activationAuthorized: candidate.activationAuthorized,
      publicRouteActivated: candidate.publicRouteActivated,
      publication: candidate.publication,
      directProductionContributionEligible:
        candidate.directProductionContributionEligible,
      authorizationWithoutApproval: {
        status: candidate.authorizationWithoutApproval.status,
        reason:
          candidate.authorizationWithoutApproval.status === 'not-authorized'
            ? candidate.authorizationWithoutApproval.reason
            : null,
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
      : 'activity_exposure_postmerge_activation_candidate_failed',
  );
  process.exitCode = 1;
});
