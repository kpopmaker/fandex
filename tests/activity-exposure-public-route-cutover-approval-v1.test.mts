import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL,
  ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE,
  authorizeActivityExposurePublicRouteCutoverWithApproval,
} from '../lib/product/activation/activityExposurePublicRouteCutoverApproval';
import type {
  ActivityExposureProductionReadiness,
} from '../lib/product/activation/activityExposureProductionReadiness';

function readiness(): ActivityExposureProductionReadiness {
  return Object.freeze({
    contractVersion: 'activity-exposure-production-readiness-v1' as const,
    target: Object.freeze({
      artistId: 'iu' as const,
      legacyVariableId: 'comebackActivityPoint' as const,
      constructId: 'activityExposure' as const,
    }),
    status: 'ready-for-activation-authorization' as const,
    checks: Object.freeze({
      'target-identity': true,
      'observed-data-origin': true,
      'shadow-publication': true,
      'standard-presentation': true,
      'provider-coverage': true,
      'provider-availability': true,
      'stored-evidence-trace': true,
      'non-numeric-contract': true,
    }),
    eventCount: 656,
    providerCount: 2,
  });
}

test('owner public-route cutover approval is exact-bound to GitHub evidence and main', () => {
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL.cutoverAuthorizationId,
    'ops-cutover-activity-exposure-20260926t025517z-v1',
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL.authorizedAt,
    '2026-09-26T02:55:17.000Z',
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
      .authorizationEvidenceCommentId,
    5842556962,
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE.authorizedMain,
    'fe1557b9f3801b5505359b9d433935e364f82a29',
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE
      .candidateContractVersion,
    'activity-exposure-public-route-cutover-candidate-v1',
  );
});

test('cutover approval authorizes only execution review and does not publish', () => {
  const result =
    authorizeActivityExposurePublicRouteCutoverWithApproval(readiness());

  assert.equal(result.status, 'authorized-for-route-cutover');
  if (result.status !== 'authorized-for-route-cutover') return;

  assert.equal(result.activationAuthorized, true);
  assert.equal(result.cutoverAuthorized, true);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.publication, 'shadow');
  assert.equal(result.directProductionContributionEligible, false);
  assert.equal(
    result.requiredNextGate,
    'explicit-public-route-cutover-execution',
  );
});

test('approval evidence preserves event-stream-only no-numeric semantics', () => {
  assert.deepEqual(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL.target,
    {
      artistId: 'iu',
      legacyVariableId: 'comebackActivityPoint',
      constructId: 'activityExposure',
    },
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL
      .binding.productContractVersion,
    'product-activity-exposure-v1',
  );
  assert.equal(
    ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL.binding.claimScope,
    'event-stream-only-no-numeric-score',
  );
});

test('public route and UI remain unchanged until explicit cutover execution', async () => {
  const routeSource = await readFile(
    new URL(
      '../lib/product/queries/getArtistProductVariablePublicRoute.ts',
      import.meta.url,
    ),
    'utf8',
  );
  const pageSource = await readFile(
    new URL('../app/artists/[artistId]/page.tsx', import.meta.url),
    'utf8',
  );

  assert.doesNotMatch(
    routeSource,
    /activityExposure|ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL/,
  );
  assert.doesNotMatch(
    pageSource,
    /getActivityExposurePublicRoute|ActivityExposureEventStream/,
  );
  assert.match(
    pageSource,
    /profile\.artistId === 'iu' && variableId === 'newsIssuePoint'/,
  );
});
