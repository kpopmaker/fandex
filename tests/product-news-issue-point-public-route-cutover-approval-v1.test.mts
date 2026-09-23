import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL,
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE,
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE_CONTRACT_VERSION,
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION,
} from '../lib/product/activation/newsIssuePointPublicRouteCutoverApproval';
import {
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION,
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION,
} from '../lib/product/activation/newsIssuePointPublicRouteCutoverAuthorization';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
} from '../lib/product/activation/newsIssuePointRealProductActivationApproval';
import {
  getFandexVariableDefinition,
} from '../lib/intelligence/variableRegistry';

test('cutover approval record is exact-bound to owner authorization evidence', () => {
  const approval = NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL;
  const evidence = NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE;

  assert.equal(
    approval.contractVersion,
    NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION,
  );
  assert.equal(approval.action, 'authorize-public-route-cutover');
  assert.equal(approval.authority, 'product-operations-owner');
  assert.equal(
    approval.cutoverAuthorizationId,
    'ops-cutover-newsissuepoint-20260923t014819z-v1',
  );
  assert.equal(approval.authorizedAt, '2026-09-23T01:48:19.000Z');
  assert.deepEqual(approval.target, {
    artistId: 'iu',
    variableId: 'newsIssuePoint',
  });

  assert.equal(
    approval.binding.activationAuthorizationId,
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
      .activationAuthorizationId,
  );
  assert.equal(
    approval.binding.activationApprovalContractVersion,
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL.contractVersion,
  );

  assert.equal(
    evidence.contractVersion,
    NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE_CONTRACT_VERSION,
  );
  assert.equal(evidence.authorizationEvidenceCommentId, 5787550830);
  assert.equal(
    evidence.authorizedMain,
    'f1c32a298fb7d7155f1cb8358a7afdb22db8c7e0',
  );
  assert.equal(evidence.approvedAt, '2026-09-23T01:48:19.000Z');
});

test('valid approval only authorizes route cutover and does not execute it', () => {
  const authorization =
    NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION;

  assert.equal(
    authorization.contractVersion,
    NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION,
  );
  assert.equal(authorization.status, 'authorized-for-route-cutover');
  assert.equal(authorization.activationAuthorized, true);
  assert.equal(authorization.cutoverAuthorized, true);
  assert.equal(authorization.publicRouteActivated, false);
  assert.equal(authorization.productScorePublished, false);
  assert.equal(
    authorization.directProductionContributionEligible,
    false,
  );
  assert.equal(
    authorization.strictPublicationIntervalClaimAllowed,
    false,
  );
  assert.equal(authorization.lifecycleState, 'shadow');
  assert.equal(
    authorization.requiredNextGate,
    'explicit-public-route-cutover-execution',
  );
});

test('approval evidence preserves the pre-execution Product boundary', () => {
  assert.deepEqual(
    NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE.decision,
    {
      activationAuthorized: true,
      cutoverAuthorized: true,
      publicRouteActivated: false,
      productScorePublished: false,
      directProductionContributionEligible: false,
      strictPublicationIntervalClaimAllowed: false,
      lifecycleState: 'shadow',
      requiredNextGate: 'explicit-public-route-cutover-execution',
    },
  );

  const definition = getFandexVariableDefinition('newsIssuePoint');
  assert.ok(definition);
  assert.equal(definition.lifecycle, 'shadow');
  assert.equal(definition.directProductionContributionEligible, false);
});

test('legacy public Product query remains untouched before execution authorization', async () => {
  const source = await readFile(
    new URL(
      '../lib/product/queries/getArtistProductVariable.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(
    source,
    /newsIssuePointPublicRouteCutoverApproval/,
  );
  assert.match(source, /presentation:\s*'preview'/);
  assert.match(source, /dataOrigin:\s*'synthetic'/);
});
