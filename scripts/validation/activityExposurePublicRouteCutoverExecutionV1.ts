import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

import {
  ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION,
} from '../../lib/product/activation/activityExposurePublicRouteCutoverExecution';
import {
  getActivityExposurePublicRoute,
} from '../../lib/product/queries/getActivityExposurePublicRoute';
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
      'activity_exposure_execution_runtime_authority_invalid',
    );

    const result = await getActivityExposurePublicRoute({
      readActivityExposureReal: () =>
        readActivityExposureShadowProduct('iu', repositoryPool),
    });

    assert(result.status === 'ok', 'activity_exposure_public_route_not_ok');
    if (result.status !== 'ok') return;

    assert(
      result.model.events.length === 656
        && result.model.providerCoverage.length === 2,
      'activity_exposure_execution_live_counts_invalid',
    );
    assert(
      result.model.events.every(
        (event) => event.storedEvidenceTrace !== undefined,
      ),
      'activity_exposure_execution_stored_evidence_incomplete',
    );
    assert(
      result.model.dataOrigin === 'observed'
        && result.model.publication === 'production'
        && result.model.presentation === 'standard',
      'activity_exposure_execution_public_truth_invalid',
    );
    assert(
      result.model.events.every(
        (event) =>
          !('score' in event)
          && !('value' in event)
          && !('fact' in event),
      ),
      'activity_exposure_execution_numeric_coercion_detected',
    );

    const execution = ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION;
    assert(
      execution.authorizationEvidenceCommentId === 5842819597
        && execution.authorizedMain
          === 'defc8f3a61328a80192b5380ad95ab7fc7d8be5b'
        && execution.decision.publicRouteActivated === true
        && execution.decision.publication === 'production'
        && execution.decision.directProductionContributionEligible === true
        && execution.binding.claimScope === 'event-stream-only-no-numeric-score',
      'activity_exposure_execution_binding_invalid',
    );

    const artistPage = await readFile(
      new URL('../../app/artists/[artistId]/page.tsx', import.meta.url),
      'utf8',
    );
    const evidencePage = await readFile(
      new URL(
        '../../app/artists/[artistId]/evidence/[evidenceId]/page.tsx',
        import.meta.url,
      ),
      'utf8',
    );
    const component = await readFile(
      new URL(
        '../../app/components/product/ArtistActivityExposureDetail.tsx',
        import.meta.url,
      ),
      'utf8',
    );

    assert(
      artistPage.includes('getActivityExposurePublicRouteForIU')
        && artistPage.includes('ArtistActivityExposureDetail')
        && artistPage.includes("variableId !== 'comebackActivityPoint'"),
      'activity_exposure_execution_artist_route_not_wired',
    );
    assert(
      evidencePage.includes("evidenceKind === 'activity-exposure'")
        && evidencePage.includes('getActivityExposureStoredEvidenceForIU'),
      'activity_exposure_execution_evidence_route_not_wired',
    );
    assert(
      component.includes('Non-numeric')
        && component.includes('Stored Evidence 확인')
        && !component.includes('comeback score'),
      'activity_exposure_execution_ui_truth_invalid',
    );

    console.log('ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION=PASS');
    console.log(JSON.stringify({
      eventCount: result.model.events.length,
      tracedEventCount: result.model.events.filter(
        (event) => event.storedEvidenceTrace !== undefined,
      ).length,
      providerCount: result.model.providerCoverage.length,
      publication: result.model.publication,
      publicRouteActivated: execution.decision.publicRouteActivated,
      directProductionContributionEligible:
        execution.decision.directProductionContributionEligible,
      executionAuthorizationId:
        execution.cutoverExecutionAuthorizationId,
      authorizationEvidenceCommentId:
        execution.authorizationEvidenceCommentId,
      authorizedMain: execution.authorizedMain,
      claimScope: execution.binding.claimScope,
    }));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'activity_exposure_public_route_cutover_execution_failed',
  );
  process.exitCode = 1;
});
