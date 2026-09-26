import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

import {
  ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL,
  ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE,
  authorizeActivityExposurePublicRouteCutoverWithApproval,
} from '../../lib/product/activation/activityExposurePublicRouteCutoverApproval';
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

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

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
    assert(
      authority.rows[0]?.exact_runtime_role === true
        && authority.rows[0]?.schema_create === false,
      'activity_exposure_cutover_approval_runtime_authority_invalid',
    );

    const product = await readActivityExposureShadowProduct(
      'iu',
      repositoryPool,
    );
    const readiness = evaluateActivityExposureProductionReadiness(product);
    const authorization =
      authorizeActivityExposurePublicRouteCutoverWithApproval(readiness);

    assert(product.status === 'ok', 'activity_exposure_product_not_ok');
    if (product.status !== 'ok') return;

    assert(
      product.model.events.length === 656
        && product.model.providerCoverage.length === 2,
      'activity_exposure_live_counts_invalid',
    );
    assert(
      product.model.events.every(
        (event) => event.storedEvidenceTrace !== undefined,
      ),
      'activity_exposure_stored_evidence_incomplete',
    );
    assert(
      product.model.dataOrigin === 'observed'
        && product.model.publication === 'shadow'
        && product.model.presentation === 'standard',
      'activity_exposure_live_truth_state_invalid',
    );

    assert(
      readiness.status === 'ready-for-activation-authorization'
        && Object.values(readiness.checks).every(Boolean),
      'activity_exposure_live_readiness_invalid',
    );

    assert(
      ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL
        .cutoverAuthorizationId
        === 'ops-cutover-activity-exposure-20260926t025517z-v1'
        && ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL.authorizedAt
          === '2026-09-26T02:55:17.000Z'
        && ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
          .authorizationEvidenceCommentId === 5842556962
        && ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
          .authorizedMain
          === 'fe1557b9f3801b5505359b9d433935e364f82a29',
      'activity_exposure_cutover_approval_evidence_binding_invalid',
    );

    assert(
      authorization.status === 'authorized-for-route-cutover',
      'activity_exposure_cutover_not_authorized',
    );
    if (authorization.status !== 'authorized-for-route-cutover') return;

    assert(
      authorization.activationAuthorized === true
        && authorization.cutoverAuthorized === true
        && authorization.publicRouteActivated === false
        && authorization.publication === 'shadow'
        && authorization.directProductionContributionEligible === false
        && authorization.requiredNextGate
          === 'explicit-public-route-cutover-execution',
      'activity_exposure_cutover_approval_boundary_invalid',
    );

    const routeSource = await readFile(
      new URL(
        '../../lib/product/queries/getArtistProductVariablePublicRoute.ts',
        import.meta.url,
      ),
      'utf8',
    );
    const pageSource = await readFile(
      new URL('../../app/artists/[artistId]/page.tsx', import.meta.url),
      'utf8',
    );

    assert(
      !routeSource.includes('ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL')
        && !routeSource.includes('activityExposure'),
      'activity_exposure_route_executed_before_execution_gate',
    );
    assert(
      !pageSource.includes('getActivityExposurePublicRoute')
        && !pageSource.includes('ActivityExposureEventStream'),
      'activity_exposure_ui_executed_before_execution_gate',
    );

    console.log('ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL=PASS');
    console.log(JSON.stringify({
      eventCount: product.model.events.length,
      tracedEventCount: product.model.events.filter(
        (event) => event.storedEvidenceTrace !== undefined,
      ).length,
      providerCount: product.model.providerCoverage.length,
      cutoverAuthorizationId:
        ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL
          .cutoverAuthorizationId,
      authorizationEvidenceCommentId:
        ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
          .authorizationEvidenceCommentId,
      authorizationStatus: authorization.status,
      activationAuthorized: authorization.activationAuthorized,
      cutoverAuthorized: authorization.cutoverAuthorized,
      publicRouteActivated: authorization.publicRouteActivated,
      publication: authorization.publication,
      directProductionContributionEligible:
        authorization.directProductionContributionEligible,
      requiredNextGate: authorization.requiredNextGate,
      routeStillUnchanged: true,
    }));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'activity_exposure_public_route_cutover_approval_failed',
  );
  process.exitCode = 1;
});
