import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  RiskAdjustmentUpstreamInput,
} from '../lib/intelligence/riskAdjustmentPointConstruct';
import {
  evaluateRiskAdjustmentRequiredQualityResolution,
  isRiskAdjustmentRequiredQualityResolved,
  RISK_ADJUSTMENT_RESOLVED_REQUIRED_QUALITY_STATES,
} from '../lib/intelligence/riskAdjustmentQualitySufficiencyAcceptance';
import {
  deriveRiskAdjustmentQualitySufficiencyWitness,
} from '../lib/intelligence/riskAdjustmentQualitySufficiencyWitness';

function input(
  overrides: Partial<RiskAdjustmentUpstreamInput> = {},
): RiskAdjustmentUpstreamInput {
  return {
    variableId: 'newsIssuePoint',
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
    evidenceRefs: ['evidence:news:1'],
    ...overrides,
  };
}

test('resolved state contract does not require optimistic quality', () => {
  assert.deepEqual(RISK_ADJUSTMENT_RESOLVED_REQUIRED_QUALITY_STATES, {
    availability: [
      'available',
      'available-nonzero',
      'true-zero',
      'source-missing',
      'provider-unavailable',
      'not-tracked',
      'not-ranked',
      'unsupported',
    ],
    identity: ['resolved'],
    confidence: ['high', 'moderate', 'low'],
    coverage: ['complete', 'incomplete'],
    freshness: ['current', 'stale'],
    conflict: ['none', 'detected'],
    revision: ['stable', 'revised-stable', 'unstable'],
    history: ['sufficient'],
  });
});

test('explicit adverse or limited states are still resolved semantics', () => {
  assert.equal(
    isRiskAdjustmentRequiredQualityResolved('coverage', 'incomplete'),
    true,
  );
  assert.equal(
    isRiskAdjustmentRequiredQualityResolved('freshness', 'stale'),
    true,
  );
  assert.equal(
    isRiskAdjustmentRequiredQualityResolved('conflict', 'detected'),
    true,
  );
  assert.equal(
    isRiskAdjustmentRequiredQualityResolved('revision', 'unstable'),
    true,
  );
  assert.equal(
    isRiskAdjustmentRequiredQualityResolved(
      'availability',
      'source-missing',
    ),
    true,
  );
  assert.equal(
    isRiskAdjustmentRequiredQualityResolved(
      'availability',
      'provider-unavailable',
    ),
    true,
  );
});

test('fail-closed unresolved states are not accepted as sufficient', () => {
  for (const [dimension, state] of [
    ['availability', 'upstream-unavailable-ambiguous'],
    ['identity', 'unresolved'],
    ['identity', 'conflict'],
    ['confidence', 'insufficient'],
    ['coverage', 'unknown'],
    ['freshness', 'unknown'],
    ['conflict', 'unknown'],
    ['revision', 'unknown'],
    ['history', 'insufficient'],
    ['history', 'unknown'],
  ] as const) {
    assert.equal(
      isRiskAdjustmentRequiredQualityResolved(dimension, state),
      false,
      dimension + ':' + state,
    );
  }
});

test('resolution evaluation returns one deterministic row per required dimension', () => {
  assert.deepEqual(
    evaluateRiskAdjustmentRequiredQualityResolution(input()).map(
      (row) => ({
        dimension: row.dimension,
        stateValue: row.stateValue,
        resolved: row.resolved,
      }),
    ),
    [
      { dimension: 'availability', stateValue: 'available', resolved: true },
      { dimension: 'confidence', stateValue: 'high', resolved: true },
      { dimension: 'conflict', stateValue: 'none', resolved: true },
      { dimension: 'coverage', stateValue: 'complete', resolved: true },
      { dimension: 'freshness', stateValue: 'current', resolved: true },
      { dimension: 'history', stateValue: 'sufficient', resolved: true },
      { dimension: 'identity', stateValue: 'resolved', resolved: true },
      { dimension: 'revision', stateValue: 'stable', resolved: true },
    ],
  );
});

test('current news producer unresolved dimensions match the sufficiency witness', () => {
  const current = input({
    confidenceState: 'insufficient',
    availabilityState: 'available-nonzero',
    coverageState: 'unknown',
    freshnessState: 'unknown',
    conflictState: 'unknown',
    revisionState: 'unknown',
    volatilityState: 'unknown',
  });

  const unresolved = evaluateRiskAdjustmentRequiredQualityResolution(current)
    .filter((row) => !row.resolved)
    .map((row) => row.dimension);

  const witness =
    deriveRiskAdjustmentQualitySufficiencyWitness([current]);

  assert.deepEqual(unresolved, [
    'confidence',
    'conflict',
    'coverage',
    'freshness',
    'revision',
  ]);
  assert.deepEqual(
    unresolved,
    witness.entries[0]?.unresolvedRequiredDimensions,
  );
});

test('current Activity Exposure unresolved dimensions match the sufficiency witness', () => {
  const current: RiskAdjustmentUpstreamInput = {
    ...input(),
    variableId: 'comebackActivityPoint',
    availabilityState: 'available',
    confidenceState: 'insufficient',
    coverageState: 'complete',
    freshnessState: 'unknown',
    conflictState: 'unknown',
    revisionState: 'unknown',
    historyState: 'unknown',
    volatilityState: 'unknown',
    evidenceRefs: ['evidence:activity:1'],
  };

  const unresolved = evaluateRiskAdjustmentRequiredQualityResolution(current)
    .filter((row) => !row.resolved)
    .map((row) => row.dimension);

  const witness =
    deriveRiskAdjustmentQualitySufficiencyWitness([current]);

  assert.deepEqual(unresolved, [
    'confidence',
    'conflict',
    'freshness',
    'history',
    'revision',
  ]);
  assert.deepEqual(
    unresolved,
    witness.entries[0]?.unresolvedRequiredDimensions,
  );
});
