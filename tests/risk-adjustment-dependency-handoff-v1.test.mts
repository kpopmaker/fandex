import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BLOCKED_NON_PRODUCTION_RISK_HANDOFFS,
  COMEBACK_ACTIVITY_RISK_DEPENDENCY_HANDOFF,
  NEWS_ISSUE_POINT_RISK_DEPENDENCY_HANDOFF,
  listActiveRiskAdjustmentDependencyHandoffs,
} from '../lib/intelligence/riskAdjustmentDependencyHandoff';

test('active Risk dependency handoffs target only current Production upstreams', () => {
  assert.deepEqual(
    listActiveRiskAdjustmentDependencyHandoffs().map(
      (handoff) => handoff.upstreamVariableId,
    ),
    ['newsIssuePoint', 'comebackActivityPoint'],
  );
});

test('newsIssuePoint dependency asks only for currently missing required dimensions', () => {
  assert.deepEqual(
    NEWS_ISSUE_POINT_RISK_DEPENDENCY_HANDOFF.requestedRequiredDimensions,
    ['confidence', 'coverage', 'freshness', 'conflict', 'revision'],
  );
  assert.equal(
    NEWS_ISSUE_POINT_RISK_DEPENDENCY_HANDOFF
      .acceptanceBoundary.arbitraryThresholdAllowed,
    false,
  );
  assert.equal(
    NEWS_ISSUE_POINT_RISK_DEPENDENCY_HANDOFF
      .acceptanceBoundary.missingToZeroAllowed,
    false,
  );
});

test('Activity Exposure dependency does not re-request coverage/conflict already exposed', () => {
  assert.deepEqual(
    COMEBACK_ACTIVITY_RISK_DEPENDENCY_HANDOFF.requestedRequiredDimensions,
    ['confidence', 'freshness', 'revision', 'history'],
  );
});

test('deterministic projections are accepted only from explicit upstream fields', () => {
  for (const handoff of listActiveRiskAdjustmentDependencyHandoffs()) {
    assert.deepEqual(handoff.acceptedEvidenceForms, [
      'explicit-upstream-product-field',
      'deterministic-projection-from-explicit-upstream-fields',
    ]);
    assert.equal(
      handoff.acceptanceBoundary.deterministicProjectionAllowed,
      true,
    );
    assert.equal(
      handoff.acceptanceBoundary.previewFallbackAllowed,
      false,
    );
  }
});

test('non-Production upstreams do not receive active metadata requests', () => {
  assert.deepEqual(
    BLOCKED_NON_PRODUCTION_RISK_HANDOFFS.map(
      (handoff) => handoff.upstreamVariableId,
    ),
    [
      'growthMomentumPoint',
      'musicAlbumPoint',
      'snsFandomPoint',
      'brandFitPoint',
    ],
  );
  for (const handoff of BLOCKED_NON_PRODUCTION_RISK_HANDOFFS) {
    assert.equal(handoff.dependencyStatus, 'blocked-until-production');
    assert.deepEqual(handoff.requestedRequiredDimensions, []);
  }
});

test('Risk cannot ask upstream owners to adopt Risk-local weights or thresholds', () => {
  for (const handoff of [
    ...listActiveRiskAdjustmentDependencyHandoffs(),
    ...BLOCKED_NON_PRODUCTION_RISK_HANDOFFS,
  ]) {
    assert.equal(
      handoff.acceptanceBoundary.arbitraryThresholdAllowed,
      false,
    );
    assert.equal(
      handoff.acceptanceBoundary.arbitraryWeightAllowed,
      false,
    );
  }
});
