import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  RiskAdjustmentUpstreamInput,
} from '../lib/intelligence/riskAdjustmentPointConstruct';
import {
  deriveRiskAdjustmentQualitySufficiencyWitness,
  RISK_ADJUSTMENT_FAIL_CLOSED_DIMENSION_MAP,
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

test('fail-closed quality issues map only to required dimensions', () => {
  assert.deepEqual(RISK_ADJUSTMENT_FAIL_CLOSED_DIMENSION_MAP, {
    'availability-unresolved': 'availability',
    'identity-unresolved': 'identity',
    'identity-conflict': 'identity',
    'coverage-unknown': 'coverage',
    'freshness-unknown': 'freshness',
    'conflict-unknown': 'conflict',
    'revision-state-unknown': 'revision',
    'confidence-insufficient': 'confidence',
    'history-insufficient': 'history',
    'history-unknown': 'history',
  });
});

test('current Real quality pattern is split into deterministic owner blockers', () => {
  const witness = deriveRiskAdjustmentQualitySufficiencyWitness([
    input('newsIssuePoint', {
      confidenceState: 'insufficient',
      availabilityState: 'available-nonzero',
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

  assert.equal(witness.status, 'quality-sufficiency-blocked');
  assert.equal(witness.readyForCategoricalContract, false);
  assert.equal(witness.unresolvedOwnerCount, 2);
  assert.deepEqual(witness.unresolvedRequiredDimensions, [
    'confidence',
    'conflict',
    'coverage',
    'freshness',
    'history',
    'revision',
  ]);
  assert.deepEqual(witness.blockingQualityIssues, [
    'confidence-insufficient',
    'conflict-unknown',
    'coverage-unknown',
    'freshness-unknown',
    'history-unknown',
    'revision-state-unknown',
  ]);

  assert.deepEqual(
    witness.entries.map((entry) => ({
      variableId: entry.variableId,
      ownerScope: entry.ownerScope,
      unresolvedRequiredDimensions: entry.unresolvedRequiredDimensions,
      blockingQualityIssues: entry.blockingQualityIssues,
      nonBlockingQualityIssues: entry.nonBlockingQualityIssues,
      ready: entry.readyForCategoricalContract,
    })),
    [
      {
        variableId: 'comebackActivityPoint',
        ownerScope: 'activity-exposure-product-owner',
        unresolvedRequiredDimensions: [
          'confidence',
          'conflict',
          'freshness',
          'history',
          'revision',
        ],
        blockingQualityIssues: [
          'confidence-insufficient',
          'conflict-unknown',
          'freshness-unknown',
          'history-unknown',
          'revision-state-unknown',
        ],
        nonBlockingQualityIssues: ['volatility-unknown'],
        ready: false,
      },
      {
        variableId: 'newsIssuePoint',
        ownerScope: 'news-issue-product-owner',
        unresolvedRequiredDimensions: [
          'confidence',
          'conflict',
          'coverage',
          'freshness',
          'revision',
        ],
        blockingQualityIssues: [
          'confidence-insufficient',
          'conflict-unknown',
          'coverage-unknown',
          'freshness-unknown',
          'revision-state-unknown',
        ],
        nonBlockingQualityIssues: ['volatility-unknown'],
        ready: false,
      },
    ],
  );

  assert.equal(witness.numericEligible, false);
  assert.equal(witness.score, null);
  assert.equal(witness.penalty, null);
  assert.equal(witness.weight, null);
});

test('explicit source missing is evidence state, not a required-quality sufficiency blocker', () => {
  const witness = deriveRiskAdjustmentQualitySufficiencyWitness([
    input('newsIssuePoint', {
      availabilityState: 'source-missing',
    }),
  ]);

  assert.equal(witness.status, 'categorical-contract-ready');
  assert.equal(witness.readyForCategoricalContract, true);
  assert.equal(witness.unresolvedOwnerCount, 0);
  assert.deepEqual(witness.unresolvedRequiredDimensions, []);
  assert.deepEqual(witness.blockingQualityIssues, []);
  assert.deepEqual(
    witness.entries[0]?.nonBlockingQualityIssues,
    ['source-missing'],
  );
});

test('explicit provider unavailable remains nonblocking categorical evidence', () => {
  const witness = deriveRiskAdjustmentQualitySufficiencyWitness([
    input('comebackActivityPoint', {
      availabilityState: 'provider-unavailable',
    }),
  ]);

  assert.equal(witness.status, 'categorical-contract-ready');
  assert.equal(witness.readyForCategoricalContract, true);
  assert.deepEqual(witness.entries[0]?.blockingQualityIssues, []);
  assert.deepEqual(
    witness.entries[0]?.nonBlockingQualityIssues,
    ['provider-unavailable'],
  );
});

test('dependency boundary blockers remain distinct from quality sufficiency blockers', () => {
  const witness = deriveRiskAdjustmentQualitySufficiencyWitness([
    input('growthMomentumPoint', {
      lifecycleState: 'production-candidate',
      confidenceState: 'insufficient',
    }),
  ]);

  assert.equal(witness.status, 'dependency-blocked');
  assert.equal(witness.readyForCategoricalContract, false);
  assert.equal(witness.unresolvedOwnerCount, 1);
  assert.deepEqual(
    witness.entries[0]?.unresolvedRequiredDimensions,
    ['confidence'],
  );
  assert.equal(witness.entries[0]?.dependencyStatus, 'blocked');
});

test('no input is represented separately from quality insufficiency', () => {
  const witness = deriveRiskAdjustmentQualitySufficiencyWitness([]);

  assert.equal(witness.status, 'no-input');
  assert.equal(witness.readyForCategoricalContract, false);
  assert.equal(witness.unresolvedOwnerCount, 0);
  assert.deepEqual(witness.unresolvedRequiredDimensions, []);
  assert.deepEqual(witness.entries, []);
});

test('fully resolved required quality becomes categorical-contract-ready without numeric eligibility', () => {
  const witness = deriveRiskAdjustmentQualitySufficiencyWitness([
    input('newsIssuePoint'),
    input('comebackActivityPoint', {
      coverageState: 'incomplete',
      volatilityState: 'unusual',
    }),
  ]);

  assert.equal(witness.status, 'categorical-contract-ready');
  assert.equal(witness.readyForCategoricalContract, true);
  assert.equal(witness.unresolvedOwnerCount, 0);
  assert.deepEqual(witness.unresolvedRequiredDimensions, []);
  assert.deepEqual(witness.blockingQualityIssues, []);
  assert.deepEqual(
    witness.entries[0]?.nonBlockingQualityIssues,
    ['incomplete-coverage', 'unusual-volatility'],
  );
  assert.equal(witness.numericEligible, false);
});
