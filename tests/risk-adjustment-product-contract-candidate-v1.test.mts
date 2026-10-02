import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  RiskAdjustmentUpstreamInput,
} from '../lib/intelligence/riskAdjustmentPointConstruct';
import {
  createRiskAdjustmentProductContractCandidate,
} from '../lib/intelligence/riskAdjustmentProductContractCandidate';

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

test('no validated upstream data remains an insufficient nonnumeric candidate', () => {
  const candidate = createRiskAdjustmentProductContractCandidate({
    artistId: 'iu',
    inputs: [],
  });

  assert.equal(candidate.readinessState, 'insufficient-data');
  assert.equal(candidate.numericEligible, false);
  assert.equal(candidate.score, null);
  assert.equal(candidate.penalty, null);
  assert.equal(candidate.weight, null);
  assert.equal(candidate.activationAuthorized, false);
  assert.equal(candidate.publicationAuthorized, false);
  assert.equal(candidate.publicRouteAuthorized, false);
});

test('current Real upstream metadata gaps keep Product candidate insufficient', () => {
  const candidate = createRiskAdjustmentProductContractCandidate({
    artistId: 'iu',
    inputs: [
      input('newsIssuePoint', {
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
    ],
  });

  assert.equal(candidate.readinessState, 'insufficient-data');
  assert.equal(candidate.assessment.status, 'insufficient_data');
  assert.equal(candidate.numericEligible, false);
});

test('fully explicit categorical evidence can make the contract ready without authorizing activation', () => {
  const candidate = createRiskAdjustmentProductContractCandidate({
    artistId: 'iu',
    inputs: [
      input('newsIssuePoint', { freshnessState: 'stale' }),
      input('comebackActivityPoint', { coverageState: 'incomplete' }),
    ],
  });

  assert.equal(candidate.readinessState, 'categorical-contract-ready');
  assert.equal(candidate.assessment.status, 'categorical_ready');
  assert.deepEqual(candidate.assessment.qualityIssues, [
    'incomplete-coverage',
    'stale-evidence',
  ]);
  assert.equal(candidate.activationAuthorized, false);
  assert.equal(candidate.publicationAuthorized, false);
  assert.equal(candidate.publicRouteAuthorized, false);
  assert.equal(candidate.score, null);
});

test('non-Production dependency blocks the Product contract candidate', () => {
  const candidate = createRiskAdjustmentProductContractCandidate({
    artistId: 'iu',
    inputs: [
      input('growthMomentumPoint', {
        lifecycleState: 'production-candidate',
      }),
    ],
  });

  assert.equal(candidate.readinessState, 'dependency-blocked');
  assert.deepEqual(
    candidate.assessment.blockedUpstreamVariables,
    ['growthMomentumPoint'],
  );
});

test('blank artist identity fails closed', () => {
  assert.throws(
    () =>
      createRiskAdjustmentProductContractCandidate({
        artistId: '   ',
        inputs: [],
      }),
    /artist_id_invalid/,
  );
});
