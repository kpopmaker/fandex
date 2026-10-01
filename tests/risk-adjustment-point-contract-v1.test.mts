import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RISK_ADJUSTMENT_POINT_CONSTRUCT,
  assessRiskAdjustmentDependency,
  deriveRiskAdjustmentAssessment,
  type RiskAdjustmentUpstreamInput,
} from '../lib/intelligence/riskAdjustmentPointConstruct';

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

test('risk adjustment v1 is categorical and has no numeric eligibility', () => {
  assert.equal(
    RISK_ADJUSTMENT_POINT_CONSTRUCT.productForm,
    'categorical-adjustment-state',
  );
  assert.equal(RISK_ADJUSTMENT_POINT_CONSTRUCT.numericEligible, false);
});

test('only production real upstream Product truth is usable', () => {
  assert.equal(assessRiskAdjustmentDependency(input()).status, 'usable');

  const research = assessRiskAdjustmentDependency(
    input({ lifecycleState: 'research' }),
  );
  assert.equal(research.status, 'blocked');
  assert.deepEqual(research.blockers, ['upstream-not-production']);

  const synthetic = assessRiskAdjustmentDependency(
    input({ materialClass: 'synthetic' }),
  );
  assert.equal(synthetic.status, 'blocked');
  assert.deepEqual(synthetic.blockers, ['upstream-not-real']);
});

test('missing does not become zero and zero does not become a quality issue', () => {
  const missing = assessRiskAdjustmentDependency(
    input({ availabilityState: 'source-missing' }),
  );
  assert.equal(missing.trueZeroObserved, false);
  assert.deepEqual(missing.qualityIssues, ['source-missing']);

  const zero = assessRiskAdjustmentDependency(
    input({ availabilityState: 'true-zero' }),
  );
  assert.equal(zero.trueZeroObserved, true);
  assert.deepEqual(zero.qualityIssues, []);
});

test('provider unavailable remains distinct from missing', () => {
  const unavailable = assessRiskAdjustmentDependency(
    input({ availabilityState: 'provider-unavailable' }),
  );
  assert.deepEqual(unavailable.qualityIssues, ['provider-unavailable']);
  assert.equal(unavailable.qualityIssues.includes('source-missing'), false);
});

test('identity, coverage, freshness, conflict and revision issues remain distinct', () => {
  const dependency = assessRiskAdjustmentDependency(
    input({
      identityState: 'unresolved',
      coverageState: 'incomplete',
      freshnessState: 'stale',
      conflictState: 'detected',
      revisionState: 'unstable',
    }),
  );
  assert.deepEqual(dependency.qualityIssues, [
    'data-conflict',
    'identity-unresolved',
    'incomplete-coverage',
    'revision-instability',
    'stale-evidence',
  ]);
});

test('unusual volatility is evidence state, not an automatic numeric penalty', () => {
  const assessment = deriveRiskAdjustmentAssessment([
    input({ volatilityState: 'unusual' }),
  ]);
  assert.equal(assessment.status, 'categorical_ready');
  assert.deepEqual(assessment.qualityIssues, ['unusual-volatility']);
  assert.equal(assessment.score, null);
  assert.equal(assessment.penalty, null);
  assert.equal(assessment.weight, null);
});

test('insufficient history keeps the adjustment result insufficient_data', () => {
  const assessment = deriveRiskAdjustmentAssessment([
    input({ historyState: 'insufficient' }),
  ]);
  assert.equal(assessment.status, 'insufficient_data');
  assert.deepEqual(assessment.qualityIssues, ['history-insufficient']);
  assert.equal(assessment.numericEligible, false);
});

test('insufficient confidence keeps the result insufficient_data', () => {
  const assessment = deriveRiskAdjustmentAssessment([
    input({ confidenceState: 'insufficient' }),
  ]);
  assert.equal(assessment.status, 'insufficient_data');
  assert.deepEqual(assessment.qualityIssues, ['confidence-insufficient']);
});

test('preview, synthetic, shadow and research inputs cannot become real adjustment inputs', () => {
  const assessment = deriveRiskAdjustmentAssessment([
    input({
      variableId: 'musicAlbumPoint',
      lifecycleState: 'shadow',
      materialClass: 'preview',
    }),
    input({
      variableId: 'snsFandomPoint',
      lifecycleState: 'research',
      materialClass: 'synthetic',
    }),
  ]);
  assert.equal(assessment.status, 'dependency_blocked');
  assert.deepEqual(assessment.blockedUpstreamVariables, [
    'musicAlbumPoint',
    'snsFandomPoint',
  ]);
  assert.equal(assessment.numericEligible, false);
});

test('caller chooses consumed upstream variables; unused candidates are not fabricated', () => {
  const assessment = deriveRiskAdjustmentAssessment([input()]);
  assert.equal(assessment.dependencies.length, 1);
  assert.equal(assessment.dependencies[0].variableId, 'newsIssuePoint');
  assert.deepEqual(assessment.blockedUpstreamVariables, []);
});

test('true zero is retained explicitly without implying low performance or high risk', () => {
  const assessment = deriveRiskAdjustmentAssessment([
    input({
      variableId: 'newsIssuePoint',
      availabilityState: 'true-zero',
    }),
  ]);
  assert.equal(assessment.status, 'categorical_ready');
  assert.deepEqual(assessment.trueZeroVariables, ['newsIssuePoint']);
  assert.deepEqual(assessment.qualityIssues, []);
  assert.equal(assessment.score, null);
});

test('duplicate upstream variables fail closed', () => {
  assert.throws(
    () => deriveRiskAdjustmentAssessment([input(), input()]),
    /upstream_variable_duplicate/,
  );
});

test('invalid evidence refs fail closed rather than silently dropping lineage', () => {
  assert.throws(
    () => assessRiskAdjustmentDependency(input({ evidenceRefs: [''] })),
    /evidence_ref_invalid/,
  );
});

test('no validated upstream input remains insufficient_data', () => {
  const assessment = deriveRiskAdjustmentAssessment([]);
  assert.equal(assessment.status, 'insufficient_data');
  assert.deepEqual(assessment.dependencies, []);
  assert.equal(assessment.score, null);
});
