import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  RiskAdjustmentUpstreamInput,
} from '../lib/intelligence/riskAdjustmentPointConstruct';
import {
  buildRiskAdjustmentCurrentReadinessReport,
} from '../lib/intelligence/riskAdjustmentCurrentReadinessReport';
import {
  deriveRiskAdjustmentCloseoutGate,
} from '../lib/intelligence/riskAdjustmentCloseoutGate';
import {
  deriveRiskAdjustmentQualitySufficiencyWitness,
} from '../lib/intelligence/riskAdjustmentQualitySufficiencyWitness';

function input(
  variableId: RiskAdjustmentUpstreamInput['variableId'],
  overrides: Partial<RiskAdjustmentUpstreamInput> = {},
): RiskAdjustmentUpstreamInput {
  return {
    variableId,
    lifecycleState: 'production',
    materialClass: 'real',
    confidenceState: 'high',
    availabilityState: 'available',
    identityState: 'resolved',
    coverageState: 'complete',
    freshnessState: 'current',
    conflictState: 'none',
    revisionState: 'stable',
    volatilityState: 'ordinary',
    historyState: 'sufficient',
    evidenceRefs: [`evidence:${variableId}:1`],
    ...overrides,
  };
}

test('current Risk state closes internal contract work while preserving upstream blockers', () => {
  const witness =
    deriveRiskAdjustmentQualitySufficiencyWitness([
      input('newsIssuePoint', {
        availabilityState: 'available-nonzero',
        confidenceState: 'insufficient',
        coverageState: 'unknown',
        freshnessState: 'unknown',
        conflictState: 'unknown',
        revisionState: 'unknown',
        volatilityState: 'unknown',
      }),
      input('comebackActivityPoint', {
        confidenceState: 'insufficient',
        freshnessState: 'unknown',
        conflictState: 'unknown',
        revisionState: 'unknown',
        volatilityState: 'unknown',
        historyState: 'unknown',
      }),
    ]);

  const readiness =
    buildRiskAdjustmentCurrentReadinessReport(witness);
  const closeout = deriveRiskAdjustmentCloseoutGate(readiness);

  assert.equal(
    closeout.status,
    'contract-complete-awaiting-upstream',
  );
  assert.equal(closeout.riskOwnedContractComplete, true);
  assert.equal(
    closeout.currentProductReadyForCategoricalContract,
    false,
  );
  assert.equal(closeout.upstreamQualityBlocked, true);
  assert.equal(closeout.upstreamUniverseIncomplete, true);
  assert.equal(closeout.mergeAuthorized, false);
  assert.equal(closeout.activationAuthorized, false);
  assert.equal(closeout.publicationAuthorized, false);
  assert.equal(closeout.publicRouteAuthorized, false);
  assert.equal(closeout.numericEligible, false);
  assert.equal(closeout.score, null);
  assert.equal(closeout.penalty, null);
  assert.equal(closeout.weight, null);
});

test('resolved current quality changes closeout status without authorizing Product actions', () => {
  const witness =
    deriveRiskAdjustmentQualitySufficiencyWitness([
      input('newsIssuePoint', {
        availabilityState: 'available-nonzero',
        coverageState: 'incomplete',
        freshnessState: 'stale',
        conflictState: 'detected',
        revisionState: 'unstable',
      }),
      input('comebackActivityPoint', {
        freshnessState: 'stale',
        conflictState: 'detected',
        revisionState: 'revised-stable',
        historyState: 'sufficient',
      }),
    ]);

  const readiness =
    buildRiskAdjustmentCurrentReadinessReport(witness);
  const closeout = deriveRiskAdjustmentCloseoutGate(readiness);

  assert.equal(
    closeout.status,
    'categorical-contract-ready-awaiting-product-authorization',
  );
  assert.equal(closeout.riskOwnedContractComplete, true);
  assert.equal(
    closeout.currentProductReadyForCategoricalContract,
    true,
  );
  assert.equal(closeout.upstreamQualityBlocked, false);
  assert.equal(closeout.upstreamUniverseIncomplete, true);
  assert.equal(closeout.mergeAuthorized, false);
  assert.equal(closeout.activationAuthorized, false);
  assert.equal(closeout.publicationAuthorized, false);
  assert.equal(closeout.publicRouteAuthorized, false);
  assert.equal(closeout.numericEligible, false);
});

test('closeout never converts partial upstream universe coverage into a Product authorization', () => {
  const witness =
    deriveRiskAdjustmentQualitySufficiencyWitness([
      input('newsIssuePoint'),
      input('comebackActivityPoint'),
    ]);

  const readiness =
    buildRiskAdjustmentCurrentReadinessReport(witness);
  const closeout = deriveRiskAdjustmentCloseoutGate(readiness);

  assert.equal(closeout.upstreamUniverseIncomplete, true);
  assert.equal(closeout.mergeAuthorized, false);
  assert.equal(closeout.activationAuthorized, false);
  assert.equal(closeout.publicationAuthorized, false);
  assert.equal(closeout.publicRouteAuthorized, false);
});
