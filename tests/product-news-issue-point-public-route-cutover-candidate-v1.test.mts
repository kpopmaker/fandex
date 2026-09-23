import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION,
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION,
} from '../lib/product/activation/newsIssuePointPublicRouteCutoverAuthorization';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE,
} from '../lib/product/activation/newsIssuePointRealProductActivationApproval';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_ACTION,
  NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE,
  NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE_CONTRACT_VERSION,
} from '../lib/product/activation/newsIssuePointRealProductPublicRouteCutoverCandidate';
import {
  getFandexVariableDefinition,
} from '../lib/intelligence/variableRegistry';

test('public-route cutover candidate is exact-bound to activation approval and cutover contracts', () => {
  const candidate =
    NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE;

  assert.equal(
    candidate.contractVersion,
    NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE_CONTRACT_VERSION,
  );
  assert.equal(
    candidate.action,
    NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_ACTION,
  );
  assert.equal(candidate.action, 'authorize-public-route-cutover');
  assert.equal(candidate.authority, 'product-operations-owner');
  assert.equal(candidate.status, 'ready-for-owner-attestation');

  assert.deepEqual(candidate.target, {
    artistId: 'iu',
    variableId: 'newsIssuePoint',
  });

  assert.equal(
    candidate.binding.authoritativeMainWithActivationApproval,
    '91d310a25bc43ff32de741012f6649c95b827e88',
  );
  assert.equal(
    candidate.binding.cutoverAuthorizationContractVersion,
    NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION,
  );
  assert.equal(
    candidate.binding.cutoverApprovalContractVersion,
    NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION,
  );
  assert.equal(
    candidate.binding.activationApprovalContractVersion,
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL.contractVersion,
  );
  assert.equal(
    candidate.binding.activationAuthorizationId,
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL.activationAuthorizationId,
  );
  assert.equal(
    candidate.binding.activationAuthorizedAt,
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL.authorizedAt,
  );
  assert.equal(
    candidate.binding.activationAuthorizationEvidenceCommentId,
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE
      .authorizationEvidenceCommentId,
  );
  assert.equal(
    candidate.binding.promotionAuthorizationId,
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
      .binding.promotionAuthorizationId,
  );
});

test('candidate deliberately carries no public-route cutover authorization', () => {
  const candidate =
    NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE;

  assert.equal(candidate.cutoverAuthorizationId, null);
  assert.equal(candidate.authorizedAt, null);
  assert.deepEqual(candidate.decision, {
    activationAuthorized: true,
    cutoverAuthorized: false,
    publicRouteActivated: false,
    productScorePublished: false,
    directProductionContributionEligible: false,
    strictPublicationIntervalClaimAllowed: false,
    lifecycleState: 'shadow',
    requiredNextGate: 'explicit-public-route-cutover',
  });
});

test('canonical registry remains shadow and non-contributing before cutover authorization', () => {
  const definition = getFandexVariableDefinition('newsIssuePoint');

  assert.ok(definition);
  assert.equal(definition.lifecycle, 'shadow');
  assert.equal(definition.directProductionContributionEligible, false);
  assert.deepEqual(definition.blockers, []);
});

test('legacy public Product query remains untouched and Synthetic Preview', async () => {
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

test('cutover candidate cannot be mistaken for Product publication', () => {
  const candidate =
    NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE;

  assert.equal(candidate.decision.publicRouteActivated, false);
  assert.equal(candidate.decision.productScorePublished, false);
  assert.equal(
    candidate.decision.directProductionContributionEligible,
    false,
  );
  assert.equal(
    candidate.decision.strictPublicationIntervalClaimAllowed,
    false,
  );
});
