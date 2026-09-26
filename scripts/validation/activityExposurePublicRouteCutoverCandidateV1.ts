import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

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
      'activity_exposure_cutover_candidate_runtime_authority_invalid',
    );

    const product = await readActivityExposureShadowProduct(
      'iu',
      repositoryPool,
    );
    const readiness = evaluateActivityExposureProductionReadiness(product);
    const candidate = createActivityExposurePublicRouteCutoverCandidate(
      readiness,
    );

    assert(product.status === 'ok', 'activity_exposure_live_product_not_ok');
    if (product.status !== 'ok') return;

    assert(
      product.model.identity.sourceArtistId === 'iu'
        && product.model.identity.constructId === 'activityExposure',
      'activity_exposure_identity_invalid',
    );
    assert(
      product.model.dataOrigin === 'observed'
        && product.model.publication === 'shadow'
        && product.model.presentation === 'standard',
      'activity_exposure_truth_state_invalid',
    );
    assert(
      product.model.events.length === 656,
      'activity_exposure_event_count_invalid',
    );
    assert(
      product.model.providerCoverage.length === 2,
      'activity_exposure_provider_count_invalid',
    );
    assert(
      product.model.events.every(
        (event) =>
          event.storedEvidenceTrace?.eventRecordId
          && event.storedEvidenceTrace.sourceObservationId
          && !('score' in event)
          && !('value' in event)
          && !('fact' in event),
      ),
      'activity_exposure_event_truth_contract_invalid',
    );

    assert(
      readiness.status === 'ready-for-activation-authorization'
        && readiness.eventCount === 656
        && readiness.providerCount === 2
        && Object.values(readiness.checks).every(Boolean),
      'activity_exposure_readiness_invalid',
    );

    assert(
      candidate.status === 'ready-for-owner-attestation',
      'activity_exposure_cutover_candidate_not_ready',
    );
    if (candidate.status !== 'ready-for-owner-attestation') return;

    assert(
      candidate.activationAuthorizationId
        === 'ops-activation-activity-exposure-20260926t010041z-v1',
      'activity_exposure_activation_binding_invalid',
    );
    assert(
      candidate.pendingApproval.cutoverAuthorizationId === null
        && candidate.pendingApproval.authorizedAt === null,
      'activity_exposure_cutover_candidate_not_pending',
    );
    assert(
      candidate.authorizationWithoutApproval.status === 'not-authorized'
        && candidate.authorizationWithoutApproval.reason
          === 'cutover-approval-absent',
      'activity_exposure_cutover_candidate_not_fail_closed',
    );
    assert(
      candidate.decision.activationAuthorized === true
        && candidate.decision.cutoverAuthorized === false
        && candidate.decision.publicRouteActivated === false
        && candidate.decision.publication === 'shadow'
        && candidate.decision.directProductionContributionEligible === false
        && candidate.decision.lifecycleState === 'shadow'
        && candidate.decision.requiredNextGate
          === 'explicit-public-route-cutover',
      'activity_exposure_cutover_candidate_decision_invalid',
    );

    const publicRouteSource = await readFile(
      new URL(
        '../../lib/product/queries/getArtistProductVariablePublicRoute.ts',
        import.meta.url,
      ),
      'utf8',
    );
    const artistPageSource = await readFile(
      new URL('../../app/artists/[artistId]/page.tsx', import.meta.url),
      'utf8',
    );

    assert(
      !publicRouteSource.includes('activityExposure')
        && !publicRouteSource.includes('comebackActivityPoint'),
      'activity_exposure_public_route_changed_before_approval',
    );
    assert(
      !artistPageSource.includes('getActivityExposurePublicRoute')
        && artistPageSource.includes(
          "profile.artistId === 'iu' && variableId === 'newsIssuePoint'",
        ),
      'activity_exposure_artist_route_changed_before_approval',
    );

    console.log('ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_CANDIDATE=PASS');
    console.log(JSON.stringify({
      readinessStatus: readiness.status,
      eventCount: readiness.eventCount,
      tracedEventCount: product.model.events.filter(
        (event) => event.storedEvidenceTrace !== undefined,
      ).length,
      providerCount: readiness.providerCount,
      activationAuthorizationId: candidate.activationAuthorizationId,
      candidateStatus: candidate.status,
      cutoverAuthorizationId: candidate.pendingApproval.cutoverAuthorizationId,
      cutoverAuthorized: candidate.decision.cutoverAuthorized,
      publicRouteActivated: candidate.decision.publicRouteActivated,
      publication: candidate.decision.publication,
      directProductionContributionEligible:
        candidate.decision.directProductionContributionEligible,
      requiredNextGate: candidate.decision.requiredNextGate,
      authorizationWithoutApproval: {
        status: candidate.authorizationWithoutApproval.status,
        reason: candidate.authorizationWithoutApproval.reason,
      },
      publicRouteStillNewsIssuePointOnly: true,
    }));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'activity_exposure_public_route_cutover_candidate_failed',
  );
  process.exitCode = 1;
});
