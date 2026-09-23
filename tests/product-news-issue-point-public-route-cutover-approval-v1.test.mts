import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL,
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE,
} from '../lib/product/activation/newsIssuePointPublicRouteCutoverApproval';
import {
  authorizeNewsIssuePointPublicRouteCutover,
} from '../lib/product/activation/newsIssuePointPublicRouteCutoverAuthorization';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
} from '../lib/product/activation/newsIssuePointRealProductActivationApproval';

test('explicit owner cutover approval is exact-bound to the authoritative activation approval', () => {
  const approval = NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL;

  assert.equal(
    approval.contractVersion,
    'v1_news_issue_point_public_route_cutover_approval',
  );
  assert.equal(approval.action, 'authorize-public-route-cutover');
  assert.equal(approval.authority, 'product-operations-owner');
  assert.equal(
    approval.cutoverAuthorizationId,
    'ops-cutover-newsissuepoint-20260923t014812z-v1',
  );
  assert.equal(approval.authorizedAt, '2026-09-23T01:48:12.000Z');
  assert.deepEqual(approval.target, {
    artistId: 'iu',
    variableId: 'newsIssuePoint',
  });
  assert.equal(
    approval.binding.activationAuthorizationId,
    'ops-activation-newsissuepoint-20260922t083554z-v2',
  );
  assert.equal(
    approval.binding.activationApprovalContractVersion,
    'v1_news_issue_point_real_product_activation_approval',
  );
  assert.equal(
    approval.binding.activationAuthorizationContractVersion,
    'v1_news_issue_point_real_product_activation_authorization',
  );
  assert.equal(
    approval.binding.methodologyVersion,
    'v1_naver_news_issue_point_real_methodology',
  );
  assert.equal(
    approval.binding.protocolStart,
    '2026-09-15T16:00:00.000Z',
  );
  assert.equal(approval.binding.selectedWindowSlotCount, 8);
  assert.equal(
    approval.binding.normalizationType,
    'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
  );
  assert.equal(
    approval.binding.claimScope,
    'protocol-conditioned-first-seen-only',
  );
});

test('approval evaluates only to authorized-for-route-cutover and does not execute public activation', () => {
  const result = authorizeNewsIssuePointPublicRouteCutover({
    activationAuthorization: {
      contractVersion:
        'v1_news_issue_point_real_product_activation_authorization',
      status: 'authorized-for-cutover',
      activationAuthorized: true,
      publicRouteActivated: false,
      productScorePublished: false,
      directProductionContributionEligible: false,
      strictPublicationIntervalClaimAllowed: false,
      lifecycleState: 'shadow',
      requiredNextGate: 'explicit-public-route-cutover',
      approval:
        NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
    },
    approval: NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL,
  });

  assert.equal(result.status, 'authorized-for-route-cutover');
  if (result.status !== 'authorized-for-route-cutover') return;

  assert.equal(result.activationAuthorized, true);
  assert.equal(result.cutoverAuthorized, true);
  assert.equal(result.publicRouteActivated, false);
  assert.equal(result.productScorePublished, false);
  assert.equal(result.directProductionContributionEligible, false);
  assert.equal(result.strictPublicationIntervalClaimAllowed, false);
  assert.equal(result.lifecycleState, 'shadow');
  assert.equal(
    result.requiredNextGate,
    'explicit-public-route-cutover-execution',
  );
});

test('approval evidence preserves exact owner authorization provenance', () => {
  assert.deepEqual(
    NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_EVIDENCE,
    {
      contractVersion:
        'v1_news_issue_point_public_route_cutover_approval_evidence',
      approvedAt: '2026-09-23T01:48:12.000Z',
      authority: 'product-operations-owner',
      authorizationEvidenceCommentId: 5787561580,
      authorizedMain: 'f1c32a298fb7d7155f1cb8358a7afdb22db8c7e0',
      candidateContractVersion:
        'v2_news_issue_point_real_product_public_route_cutover_candidate',
      cutoverAuthorizationId:
        'ops-cutover-newsissuepoint-20260923t014812z-v1',
      activationAuthorizationId:
        'ops-activation-newsissuepoint-20260922t083554z-v2',
      target: {
        artistId: 'iu',
        variableId: 'newsIssuePoint',
      },
      decision: {
        activationAuthorized: true,
        cutoverAuthorized: true,
        publicRouteActivated: false,
        productScorePublished: false,
        directProductionContributionEligible: false,
        strictPublicationIntervalClaimAllowed: false,
        lifecycleState: 'shadow',
        requiredNextGate:
          'explicit-public-route-cutover-execution',
      },
    },
  );
});

test('cutover approval record cannot itself wire public route or mutate production state', async () => {
  const source = await readFile(
    new URL(
      '../lib/product/activation/newsIssuePointPublicRouteCutoverApproval.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(source, /publicRouteActivated:\s*true/);
  assert.doesNotMatch(source, /productScorePublished:\s*true/);
  assert.doesNotMatch(
    source,
    /directProductionContributionEligible:\s*true/,
  );
  assert.doesNotMatch(
    source,
    /strictPublicationIntervalClaimAllowed:\s*true/,
  );
  assert.doesNotMatch(source, /lifecycleState:\s*'production'/);
  assert.doesNotMatch(source, /getArtistProductVariable/);
  assert.doesNotMatch(source, /variableRegistry/);
});
