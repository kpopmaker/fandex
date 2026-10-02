import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  RiskAdjustmentUpstreamInput,
} from '../lib/intelligence/riskAdjustmentPointConstruct';
import {
  deriveRiskAdjustmentQualitySufficiencyWitness,
} from '../lib/intelligence/riskAdjustmentQualitySufficiencyWitness';
import {
  compareRiskAdjustmentQualitySufficiencyWitnesses,
} from '../lib/intelligence/riskAdjustmentQualitySufficiencyTransition';

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

function currentInputs(): readonly RiskAdjustmentUpstreamInput[] {
  return [
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
      coverageState: 'complete',
      freshnessState: 'unknown',
      conflictState: 'unknown',
      revisionState: 'unknown',
      volatilityState: 'unknown',
      historyState: 'unknown',
    }),
  ];
}

test('no producer quality change yields no-change', () => {
  const previous =
    deriveRiskAdjustmentQualitySufficiencyWitness(currentInputs());
  const current =
    deriveRiskAdjustmentQualitySufficiencyWitness(currentInputs());

  const transition =
    compareRiskAdjustmentQualitySufficiencyWitnesses(
      previous,
      current,
    );

  assert.equal(transition.status, 'no-change');
  assert.equal(transition.dependencySetChanged, false);
  assert.deepEqual(transition.resolvedRequiredDimensions, []);
  assert.deepEqual(transition.newlyUnresolvedRequiredDimensions, []);
  assert.equal(transition.previousReadyForCategoricalContract, false);
  assert.equal(transition.currentReadyForCategoricalContract, false);
});

test('resolving news quality blockers is reported as progress while Activity blockers remain unchanged', () => {
  const previous =
    deriveRiskAdjustmentQualitySufficiencyWitness(currentInputs());
  const current =
    deriveRiskAdjustmentQualitySufficiencyWitness([
      input('newsIssuePoint', {
        availabilityState: 'available-nonzero',
        confidenceState: 'moderate',
        coverageState: 'incomplete',
        freshnessState: 'stale',
        conflictState: 'detected',
        revisionState: 'unstable',
        volatilityState: 'unknown',
      }),
      currentInputs()[1]!,
    ]);

  const transition =
    compareRiskAdjustmentQualitySufficiencyWitnesses(
      previous,
      current,
    );

  assert.equal(transition.status, 'progress');
  assert.equal(transition.dependencySetChanged, false);
  assert.deepEqual(transition.resolvedRequiredDimensions, [
    'confidence',
    'conflict',
    'coverage',
    'freshness',
    'revision',
  ]);
  assert.deepEqual(transition.newlyUnresolvedRequiredDimensions, []);

  const news = transition.entries.find(
    (entry) => entry.variableId === 'newsIssuePoint',
  );
  assert.deepEqual(news?.resolvedRequiredDimensions, [
    'confidence',
    'conflict',
    'coverage',
    'freshness',
    'revision',
  ]);
  assert.deepEqual(news?.newlyUnresolvedRequiredDimensions, []);

  const activity = transition.entries.find(
    (entry) => entry.variableId === 'comebackActivityPoint',
  );
  assert.deepEqual(activity?.resolvedRequiredDimensions, []);
  assert.deepEqual(
    activity?.unchangedUnresolvedRequiredDimensions,
    ['confidence', 'conflict', 'freshness', 'history', 'revision'],
  );
});

test('explicit adverse states can resolve blockers and transition to categorical readiness', () => {
  const previous =
    deriveRiskAdjustmentQualitySufficiencyWitness([
      input('newsIssuePoint', {
        coverageState: 'unknown',
        freshnessState: 'unknown',
        conflictState: 'unknown',
        revisionState: 'unknown',
      }),
    ]);
  const current =
    deriveRiskAdjustmentQualitySufficiencyWitness([
      input('newsIssuePoint', {
        coverageState: 'incomplete',
        freshnessState: 'stale',
        conflictState: 'detected',
        revisionState: 'unstable',
      }),
    ]);

  const transition =
    compareRiskAdjustmentQualitySufficiencyWitnesses(
      previous,
      current,
    );

  assert.equal(transition.status, 'progress');
  assert.equal(transition.previousReadyForCategoricalContract, false);
  assert.equal(transition.currentReadyForCategoricalContract, true);
  assert.deepEqual(transition.resolvedRequiredDimensions, [
    'conflict',
    'coverage',
    'freshness',
    'revision',
  ]);
});

test('a newly unknown required dimension is a regression', () => {
  const previous =
    deriveRiskAdjustmentQualitySufficiencyWitness([
      input('newsIssuePoint'),
    ]);
  const current =
    deriveRiskAdjustmentQualitySufficiencyWitness([
      input('newsIssuePoint', {
        freshnessState: 'unknown',
      }),
    ]);

  const transition =
    compareRiskAdjustmentQualitySufficiencyWitnesses(
      previous,
      current,
    );

  assert.equal(transition.status, 'regression');
  assert.deepEqual(transition.resolvedRequiredDimensions, []);
  assert.deepEqual(
    transition.newlyUnresolvedRequiredDimensions,
    ['freshness'],
  );
  assert.equal(transition.previousReadyForCategoricalContract, true);
  assert.equal(transition.currentReadyForCategoricalContract, false);
});

test('simultaneous blocker resolution and regression is mixed', () => {
  const previous =
    deriveRiskAdjustmentQualitySufficiencyWitness([
      input('newsIssuePoint', {
        coverageState: 'unknown',
      }),
    ]);
  const current =
    deriveRiskAdjustmentQualitySufficiencyWitness([
      input('newsIssuePoint', {
        coverageState: 'complete',
        freshnessState: 'unknown',
      }),
    ]);

  const transition =
    compareRiskAdjustmentQualitySufficiencyWitnesses(
      previous,
      current,
    );

  assert.equal(transition.status, 'mixed');
  assert.deepEqual(
    transition.resolvedRequiredDimensions,
    ['coverage'],
  );
  assert.deepEqual(
    transition.newlyUnresolvedRequiredDimensions,
    ['freshness'],
  );
});

test('removed dependency is not misreported as quality progress', () => {
  const previous =
    deriveRiskAdjustmentQualitySufficiencyWitness(currentInputs());
  const current =
    deriveRiskAdjustmentQualitySufficiencyWitness([
      currentInputs()[0]!,
    ]);

  const transition =
    compareRiskAdjustmentQualitySufficiencyWitnesses(
      previous,
      current,
    );

  assert.equal(transition.status, 'dependency-set-changed');
  assert.equal(transition.dependencySetChanged, true);

  const removed = transition.entries.find(
    (entry) => entry.variableId === 'comebackActivityPoint',
  );
  assert.equal(removed?.dependencyChange, 'removed');
  assert.deepEqual(removed?.resolvedRequiredDimensions, []);
  assert.deepEqual(removed?.newlyUnresolvedRequiredDimensions, []);
});

test('added dependency is explicitly dependency-set-changed', () => {
  const previous =
    deriveRiskAdjustmentQualitySufficiencyWitness([
      currentInputs()[0]!,
    ]);
  const current =
    deriveRiskAdjustmentQualitySufficiencyWitness(currentInputs());

  const transition =
    compareRiskAdjustmentQualitySufficiencyWitnesses(
      previous,
      current,
    );

  assert.equal(transition.status, 'dependency-set-changed');
  assert.equal(transition.dependencySetChanged, true);

  const added = transition.entries.find(
    (entry) => entry.variableId === 'comebackActivityPoint',
  );
  assert.equal(added?.dependencyChange, 'added');
  assert.deepEqual(
    added?.newlyUnresolvedRequiredDimensions,
    ['confidence', 'conflict', 'freshness', 'history', 'revision'],
  );
});

test('transition remains nonnumeric and cannot authorize scoring', () => {
  const witness =
    deriveRiskAdjustmentQualitySufficiencyWitness(currentInputs());
  const transition =
    compareRiskAdjustmentQualitySufficiencyWitnesses(
      witness,
      witness,
    );

  assert.equal(transition.numericEligible, false);
  assert.equal(transition.score, null);
  assert.equal(transition.penalty, null);
  assert.equal(transition.weight, null);
});
