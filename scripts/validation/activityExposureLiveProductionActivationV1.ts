import { Pool } from 'pg';

import {
  authorizeActivityExposureProductionActivationWithApproval,
} from '../../lib/product/activation/activityExposureProductionActivationApproval';
import {
  createActivityExposurePublicRouteCutoverCandidate,
} from '../../lib/product/activation/activityExposurePublicRouteCutoverCandidate';
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

    const product = await readActivityExposureShadowProduct(
      'iu',
      repositoryPool,
    );
    const readiness = evaluateActivityExposureProductionReadiness(product);
    const activation =
      authorizeActivityExposureProductionActivationWithApproval(readiness);
    const cutover =
      createActivityExposurePublicRouteCutoverCandidate(readiness);

    if (
      activation.status !== 'authorized-for-cutover'
      || activation.activationAuthorized !== true
      || activation.publicRouteActivated !== false
      || activation.publication !== 'shadow'
      || activation.directProductionContributionEligible !== false
      || activation.requiredNextGate !== 'explicit-public-route-cutover'
    ) {
      throw new Error('activity_exposure_live_activation_result_invalid');
    }

    if (
      cutover.status !== 'ready-for-owner-attestation'
      || cutover.pendingApproval.cutoverAuthorizationId !== null
      || cutover.pendingApproval.authorizedAt !== null
      || cutover.decision.activationAuthorized !== true
      || cutover.decision.cutoverAuthorized !== false
      || cutover.decision.publicRouteActivated !== false
      || cutover.decision.publication !== 'shadow'
      || cutover.authorizationWithoutApproval.status !== 'not-authorized'
      || cutover.authorizationWithoutApproval.reason
        !== 'cutover-approval-absent'
    ) {
      throw new Error('activity_exposure_live_cutover_boundary_invalid');
    }

    console.log('ACTIVITY_EXPOSURE_LIVE_PRODUCTION_ACTIVATION=PASS');
    console.log(JSON.stringify({
      readinessStatus: readiness.status,
      eventCount: readiness.eventCount,
      providerCount: readiness.providerCount,
      activation: {
        status: activation.status,
        authorizationId:
          activation.approval.activationAuthorizationId,
        authorizedAt: activation.approval.authorizedAt,
        activationAuthorized: activation.activationAuthorized,
        publicRouteActivated: activation.publicRouteActivated,
        publication: activation.publication,
        directProductionContributionEligible:
          activation.directProductionContributionEligible,
        requiredNextGate: activation.requiredNextGate,
      },
      cutoverCandidate: {
        status: cutover.status,
        cutoverAuthorizationId:
          cutover.pendingApproval.cutoverAuthorizationId,
        authorizedAt: cutover.pendingApproval.authorizedAt,
        cutoverAuthorized: cutover.decision.cutoverAuthorized,
        publicRouteActivated: cutover.decision.publicRouteActivated,
        publication: cutover.decision.publication,
        authorizationWithoutApproval: {
          status: cutover.authorizationWithoutApproval.status,
          reason:
            cutover.authorizationWithoutApproval.status === 'not-authorized'
              ? cutover.authorizationWithoutApproval.reason
              : null,
        },
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
      : 'activity_exposure_live_production_activation_failed',
  );
  process.exitCode = 1;
});
