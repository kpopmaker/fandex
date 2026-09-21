import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  NEWS_ISSUE_POINT_CANONICAL_SHADOW_VARIABLE,
} from '../lib/intelligence/variableRegistry';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL,
  NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE,
} from '../lib/product/promotion/newsIssuePointRealProductOperationsApproval';
import {
  NEWS_ISSUE_POINT_REAL_PROMOTION_REGISTRY_INTEGRATION,
} from '../lib/product/promotion/newsIssuePointRealPromotionRegistryIntegration';

test('registry integration is bound to the exact Product Operations approval', () => {
  const integration =
    NEWS_ISSUE_POINT_REAL_PROMOTION_REGISTRY_INTEGRATION;

  assert.equal(
    integration.sourceApproval.authorizationId,
    NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL.authorizationId,
  );
  assert.equal(
    integration.sourceApproval.authorizedAt,
    NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL.authorizedAt,
  );
  assert.equal(
    integration.sourceApproval.contractVersion,
    NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL.contractVersion,
  );
  assert.deepEqual(
    integration.sourceApproval.target,
    NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL.target,
  );
});

test('registry integration preserves the audited frozen Evidence boundary', () => {
  const integration =
    NEWS_ISSUE_POINT_REAL_PROMOTION_REGISTRY_INTEGRATION;
  const evidence =
    NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE;

  assert.equal(
    integration.evidenceAudit.throughSlotStart,
    evidence.throughSlotStart,
  );
  assert.equal(
    integration.evidenceAudit.latestJobId,
    evidence.latestJobId,
  );
  assert.equal(
    integration.evidenceAudit.baselineReadinessStatus,
    'replicated_cycle_history',
  );
  assert.equal(
    integration.evidenceAudit.normalizationType,
    'HISTORICAL_STRICT_EXCEEDANCE_SHARE',
  );
  assert.equal(
    integration.evidenceAudit.strictPublicationIntervalClaimAllowed,
    false,
  );
});

test('registry transition moves only the blocker and keeps lifecycle shadow', () => {
  const transition =
    NEWS_ISSUE_POINT_REAL_PROMOTION_REGISTRY_INTEGRATION
      .registryTransition;

  assert.deepEqual(transition, {
    fromBlocker: 'production-promotion-not-authorized',
    toBlocker: 'production-activation-not-authorized',
    lifecycleBefore: 'shadow',
    lifecycleAfter: 'shadow',
    directProductionContributionEligibleBefore: false,
    directProductionContributionEligibleAfter: false,
  });

  assert.equal(
    NEWS_ISSUE_POINT_CANONICAL_SHADOW_VARIABLE.lifecycle,
    'shadow',
  );
  assert.equal(
    NEWS_ISSUE_POINT_CANONICAL_SHADOW_VARIABLE
      .directProductionContributionEligible,
    false,
  );
  assert.deepEqual(
    NEWS_ISSUE_POINT_CANONICAL_SHADOW_VARIABLE.blockers,
    ['production-activation-not-authorized'],
  );
});

test('registry integration never authorizes activation, publication, or direct Production contribution', () => {
  const state =
    NEWS_ISSUE_POINT_REAL_PROMOTION_REGISTRY_INTEGRATION
      .activationState;

  assert.deepEqual(state, {
    activationAuthorized: false,
    publicRouteActivated: false,
    productScorePublished: false,
    directProductionContributionEligible: false,
    requiredNextGate:
      'explicit-production-activation-authorization',
  });
});

test('historical approval evidence remains immutable and records the gate that existed at approval time', () => {
  assert.equal(
    NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE
      .productDecision.requiredNextGate,
    'promotion-approval-registry-integration',
  );
});

test('registry integration does not wire the public legacy Product query', async () => {
  const source = await readFile(
    new URL(
      '../lib/product/queries/getArtistProductVariable.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.doesNotMatch(
    source,
    /newsIssuePointRealPromotionRegistryIntegration/,
  );
  assert.match(source, /dataOrigin:\s*'synthetic'/);
  assert.match(source, /presentation:\s*'preview'/);
});
