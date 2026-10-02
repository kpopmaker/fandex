import assert from 'node:assert/strict';
import test from 'node:test';

import {
  deriveRiskAdjustmentAssessment,
  type RiskAdjustmentUpstreamInput,
} from '../lib/intelligence/riskAdjustmentPointConstruct';
import {
  deriveRiskAdjustmentCategoricalStates,
} from '../lib/intelligence/riskAdjustmentCategoricalStates';
import {
  createRiskAdjustmentProductContractCandidate,
} from '../lib/intelligence/riskAdjustmentProductContractCandidate';

function input(
  overrides: Partial<RiskAdjustmentUpstreamInput> = {},
): RiskAdjustmentUpstreamInput {
  return {
    variableId: 'newsIssuePoint',
    lifecycleState: 'production',
    materialClass: 'real',
    confidenceState: 'high',
    availabilityState: 'available-nonzero',
    identityState: 'resolved',
    coverageState: 'complete',
    freshnessState: 'current',
    conflictState: 'none',
    revisionState: 'stable',
    volatilityState: 'ordinary',
    historyState: 'sufficient',
    evidenceRefs: ['evidence:news:1'],
    ...overrides,
  };
}

test('clean categorical-ready evidence becomes no-adjustment-evidence without a score', () => {
  const state = deriveRiskAdjustmentCategoricalStates(
    deriveRiskAdjustmentAssessment([input()]),
  );

  assert.deepEqual(state.states, ['no-adjustment-evidence']);
  assert.equal(state.numericEligible, false);
});

test('true zero remains no-adjustment-evidence rather than becoming risk', () => {
  const state = deriveRiskAdjustmentCategoricalStates(
    deriveRiskAdjustmentAssessment([
      input({ availabilityState: 'true-zero' }),
    ]),
  );

  assert.deepEqual(state.states, ['no-adjustment-evidence']);
});

test('multiple explicit quality conditions remain a state set rather than one weighted risk label', () => {
  const state = deriveRiskAdjustmentCategoricalStates(
    deriveRiskAdjustmentAssessment([
      input({
        coverageState: 'incomplete',
        freshnessState: 'stale',
        conflictState: 'detected',
        revisionState: 'unstable',
        volatilityState: 'unusual',
      }),
    ]),
  );

  assert.deepEqual(state.states, [
    'conflicting-evidence',
    'coverage-limited',
    'revision-unstable',
    'source-stale',
    'volatility-observed',
  ]);
});

test('known missing evidence can coexist with insufficient-data without being converted to zero', () => {
  const state = deriveRiskAdjustmentCategoricalStates(
    deriveRiskAdjustmentAssessment([
      input({
        availabilityState: 'source-missing',
        confidenceState: 'insufficient',
      }),
    ]),
  );

  assert.deepEqual(state.states, [
    'insufficient-data',
    'source-missing',
  ]);
});

test('unknown required dimensions produce only insufficient-data unless explicit evidence states also exist', () => {
  const state = deriveRiskAdjustmentCategoricalStates(
    deriveRiskAdjustmentAssessment([
      input({
        coverageState: 'unknown',
        freshnessState: 'unknown',
        conflictState: 'unknown',
        revisionState: 'unknown',
        historyState: 'unknown',
        volatilityState: 'unknown',
      }),
    ]),
  );

  assert.deepEqual(state.states, ['insufficient-data']);
});

test('unsupported scope remains separate from missing and provider unavailable', () => {
  const state = deriveRiskAdjustmentCategoricalStates(
    deriveRiskAdjustmentAssessment([
      input({
        variableId: 'comebackActivityPoint',
        availabilityState: 'unsupported',
      }),
    ]),
  );

  assert.deepEqual(state.states, ['unsupported-scope']);
});

test('identity failure has a categorical state but unresolved required metadata still keeps readiness insufficient', () => {
  const state = deriveRiskAdjustmentCategoricalStates(
    deriveRiskAdjustmentAssessment([
      input({ identityState: 'unresolved' }),
    ]),
  );

  assert.deepEqual(state.states, [
    'identity-blocked',
    'insufficient-data',
  ]);
});

test('dependency blocker remains explicit and does not produce a numeric penalty', () => {
  const state = deriveRiskAdjustmentCategoricalStates(
    deriveRiskAdjustmentAssessment([
      input({
        lifecycleState: 'research',
        materialClass: 'preview',
        availabilityState: 'source-missing',
      }),
    ]),
  );

  assert.deepEqual(state.states, [
    'dependency-blocked',
    'source-missing',
  ]);
  assert.equal(state.numericEligible, false);
});

test('Product contract candidate exposes the categorical state contract directly', () => {
  const candidate = createRiskAdjustmentProductContractCandidate({
    artistId: 'iu',
    inputs: [
      input({
        coverageState: 'incomplete',
        freshnessState: 'stale',
      }),
    ],
  });

  assert.equal(
    candidate.categoricalState.contractVersion,
    'risk-adjustment-categorical-states-v1',
  );
  assert.deepEqual(candidate.categoricalState.states, [
    'coverage-limited',
    'source-stale',
  ]);
  assert.equal(candidate.score, null);
  assert.equal(candidate.penalty, null);
  assert.equal(candidate.weight, null);
});
