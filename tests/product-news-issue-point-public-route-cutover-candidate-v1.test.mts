import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE,
  NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE_CONTRACT_VERSION,
} from '../lib/product/activation/newsIssuePointRealProductPublicRouteCutoverCandidate';
import {
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION,
} from '../lib/product/activation/newsIssuePointPublicRouteCutoverAuthorization';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE,
} from '../lib/product/activation/newsIssuePointRealProductActivationApproval';
import {
  getFandexVariableDefinition,
} from '../lib/intelligence/variableRegistry';

test('cutover candidate is derived from the authoritative cutover approval contract', () => {
  const candidate =
    NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE;
  const pending = candidate.pendingApproval;

  assert.equal(
    candidate.contractVersion,
    NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE_CONTRACT_VERSION,
  );
  assert.equal(
    candidate.authoritativeMainWithCutoverAuthorizationContract,
    '66b4a253c6cc049b7b25c7650b8c121e610e8629',
  );
  assert.equal(
    candidate.activationAuthorizationEvidenceCommentId,
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE
      .authorizationEvidenceCommentId,
  );

  assert.equal(
    pending.contractVersion,
    NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION,
  );
  assert.equal(pending.action, 'authorize-public-route-cutover');
  assert.equal(pending.authority, 'product-operations-owner');
  assert.deepEqual(pending.target, {
    artistId: 'iu',
    variableId: 'newsIssuePoint',
  });
  assert.equal(
    pending.binding.activationAuthorizationId,
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
      .activationAuthorizationId,
  );
  assert.equal(
    pending.binding.activationApprovalContractVersion,
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL.contractVersion,
  );
  assert.equal(
    pending.binding.activationAuthorizationContractVersion,
    'v1_news_issue_point_real_product_activation_authorization',
  );
});

test('candidate carries no cutover approval and authorization stays fail-closed', () => {
  const candidate =
    NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE;

  assert.equal(candidate.status, 'ready-for-owner-attestation');
  assert.equal(candidate.pendingApproval.cutoverAuthorizationId, null);
  assert.equal(candidate.pendingApproval.authorizedAt, null);

  assert.deepEqual(candidate.authorizationWithoutApproval, {
    contractVersion:
      'v1_news_issue_point_public_route_cutover_authorization',
    status: 'not-authorized',
    activationAuthorized: true,
    cutoverAuthorized: false,
    publicRouteActivated: false,
    productScorePublished: false,
    directProductionContributionEligible: false,
    strictPublicationIntervalClaimAllowed: false,
    lifecycleState: 'shadow',
    reason: 'cutover-approval-absent',
  });
});

test('candidate preserves the pre-cutover Product state', () => {
  assert.deepEqual(
    NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE.decision,
    {
      activationAuthorized: true,
      cutoverAuthorized: false,
      publicRouteActivated: false,
      productScorePublished: false,
      directProductionContributionEligible: false,
      strictPublicationIntervalClaimAllowed: false,
      lifecycleState: 'shadow',
      requiredNextGate: 'explicit-public-route-cutover',
    },
  );

  const definition = getFandexVariableDefinition('newsIssuePoint');
  assert.ok(definition);
  assert.equal(definition.lifecycle, 'shadow');
  assert.equal(definition.directProductionContributionEligible, false);
});

test('legacy public Product query remains untouched before explicit cutover execution', async () => {
  const source = await readFile(
    new URL(
      '../lib/product/queries/getArtistProductVariable.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(
    source,
    /newsIssuePointRealProductPublicRouteCutoverCandidate/,
  );
  assert.match(source, /presentation:\s*'preview'/);
  assert.match(source, /dataOrigin:\s*'synthetic'/);
});
