import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { Pool } from 'pg';

import {
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

async function executionModuleAbsent(): Promise<boolean> {
  const url = new URL(
    '../../lib/product/activation/activityExposurePublicRouteCutoverExecution.ts',
    import.meta.url,
  );
  try {
    await access(url, constants.F_OK);
    return false;
  } catch {
    return true;
  }
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
      'activity_exposure_execution_readiness_runtime_authority_invalid',
    );

    const product = await readActivityExposureShadowProduct(
      'iu',
      repositoryPool,
    );
    assert(product.status === 'ok', 'activity_exposure_product_not_ok');
    if (product.status !== 'ok') return;

    const readiness = evaluateActivityExposureProductionReadiness(product);
    const authorization =
      authorizeActivityExposurePublicRouteCutoverWithApproval(readiness);

    assert(
      product.model.events.length === 656
        && product.model.providerCoverage.length === 2,
      'activity_exposure_execution_readiness_live_counts_invalid',
    );
    assert(
      product.model.events.every(
        (event) => event.storedEvidenceTrace !== undefined,
      ),
      'activity_exposure_execution_readiness_stored_evidence_incomplete',
    );
    assert(
      product.model.dataOrigin === 'observed'
        && product.model.publication === 'shadow'
        && product.model.presentation === 'standard',
      'activity_exposure_execution_readiness_truth_state_invalid',
    );
    assert(
      readiness.status === 'ready-for-activation-authorization'
        && Object.values(readiness.checks).every(Boolean),
      'activity_exposure_execution_readiness_readiness_invalid',
    );

    assert(
      authorization.status === 'authorized-for-route-cutover',
      'activity_exposure_execution_readiness_cutover_not_authorized',
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
      'activity_exposure_execution_readiness_gate_invalid',
    );

    assert(
      ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
        .authorizationEvidenceCommentId === 5842556962
        && ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
          .decision.cutoverAuthorized === true
        && ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
          .decision.publicRouteActivated === false
        && ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
          .decision.publication === 'shadow'
        && ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
          .decision.requiredNextGate
          === 'explicit-public-route-cutover-execution',
      'activity_exposure_execution_readiness_approval_evidence_invalid',
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
      !routeSource.includes('ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION')
        && !routeSource.includes('readActivityExposureReal'),
      'activity_exposure_execution_readiness_route_already_executed',
    );
    assert(
      !pageSource.includes('ActivityExposureEventStream')
        && !pageSource.includes('getActivityExposurePublicRoute'),
      'activity_exposure_execution_readiness_ui_already_executed',
    );
    assert(
      await executionModuleAbsent(),
      'activity_exposure_execution_module_exists_before_explicit_execution_authorization',
    );

    console.log('ACTIVITY_EXPOSURE_PUBLIC_ROUTE_EXECUTION_READINESS=PASS');
    console.log(JSON.stringify({
      eventCount: product.model.events.length,
      tracedEventCount: product.model.events.filter(
        (event) => event.storedEvidenceTrace !== undefined,
      ).length,
      providerCount: product.model.providerCoverage.length,
      cutoverAuthorized: authorization.cutoverAuthorized,
      publicRouteActivated: authorization.publicRouteActivated,
      publication: authorization.publication,
      directProductionContributionEligible:
        authorization.directProductionContributionEligible,
      requiredNextGate: authorization.requiredNextGate,
      executionModulePresent: false,
      publicRouteStillUnchanged: true,
    }));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'activity_exposure_public_route_execution_readiness_failed',
  );
  process.exitCode = 1;
});
