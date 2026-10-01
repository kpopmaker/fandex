import assert from 'node:assert/strict';
import test from 'node:test';

import {
  COMEBACK_ACTIVITY_CURRENT_RISK_METADATA_GAP,
  NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_GAP,
  RISK_ADJUSTMENT_REQUIRED_QUALITY_DIMENSIONS,
  evaluateRiskAdjustmentUpstreamMetadataGap,
} from '../lib/intelligence/riskAdjustmentUpstreamMetadataRequirements';

test('risk adjustment required metadata dimensions are explicit and deterministic', () => {
  assert.deepEqual(RISK_ADJUSTMENT_REQUIRED_QUALITY_DIMENSIONS, [
    'availability',
    'identity',
    'confidence',
    'coverage',
    'freshness',
    'conflict',
    'revision',
    'history',
  ]);
});

test('current newsIssuePoint contract is blocked by missing explicit risk metadata', () => {
  assert.equal(NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_GAP.status, 'blocked');
  assert.deepEqual(
    NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_GAP.missingRequiredDimensions,
    ['confidence', 'conflict', 'coverage', 'freshness', 'revision'],
  );
  assert.deepEqual(
    NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_GAP.unknownRequiredDimensions,
    [],
  );
  assert.deepEqual(
    NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_GAP.absentOptionalDimensions,
    ['volatility'],
  );
  assert.deepEqual(
    NEWS_ISSUE_POINT_CURRENT_RISK_METADATA_GAP.blockers,
    ['required-quality-metadata-absent'],
  );
});

test('unknown is not treated as explicit metadata', () => {
  const gap = evaluateRiskAdjustmentUpstreamMetadataGap({
    variableId: 'newsIssuePoint',
    lifecycleExposed: true,
    materialClassExposed: true,
    qualityDimensions: {
      availability: 'explicit',
      identity: 'explicit',
      confidence: 'unknown',
      coverage: 'explicit',
      freshness: 'explicit',
      conflict: 'explicit',
      revision: 'explicit',
      history: 'explicit',
      volatility: 'unknown',
    },
  });

  assert.equal(gap.status, 'blocked');
  assert.deepEqual(gap.unknownRequiredDimensions, ['confidence']);
  assert.deepEqual(gap.blockers, ['required-quality-metadata-unknown']);
  assert.deepEqual(gap.absentOptionalDimensions, ['volatility']);
});

test('volatility is optional and cannot block an otherwise complete upstream contract', () => {
  const gap = evaluateRiskAdjustmentUpstreamMetadataGap({
    variableId: 'newsIssuePoint',
    lifecycleExposed: true,
    materialClassExposed: true,
    qualityDimensions: {
      availability: 'explicit',
      identity: 'explicit',
      confidence: 'explicit',
      coverage: 'explicit',
      freshness: 'explicit',
      conflict: 'explicit',
      revision: 'explicit',
      history: 'explicit',
      volatility: 'absent',
    },
  });

  assert.equal(gap.status, 'ready');
  assert.deepEqual(gap.blockers, []);
  assert.deepEqual(gap.absentOptionalDimensions, ['volatility']);
});

test('lifecycle and material class are mandatory dependency boundary metadata', () => {
  const gap = evaluateRiskAdjustmentUpstreamMetadataGap({
    variableId: 'newsIssuePoint',
    lifecycleExposed: false,
    materialClassExposed: false,
    qualityDimensions: {
      availability: 'explicit',
      identity: 'explicit',
      confidence: 'explicit',
      coverage: 'explicit',
      freshness: 'explicit',
      conflict: 'explicit',
      revision: 'explicit',
      history: 'explicit',
      volatility: 'explicit',
    },
  });

  assert.equal(gap.status, 'blocked');
  assert.deepEqual(gap.blockers, [
    'upstream-lifecycle-state-not-exposed',
    'upstream-material-class-not-exposed',
  ]);
});


test('Activity Exposure exposes coverage/conflict but not confidence/freshness/revision/history', () => {
  assert.equal(
    COMEBACK_ACTIVITY_CURRENT_RISK_METADATA_GAP.status,
    'blocked',
  );
  assert.deepEqual(
    COMEBACK_ACTIVITY_CURRENT_RISK_METADATA_GAP.missingRequiredDimensions,
    ['confidence', 'freshness', 'history', 'revision'],
  );
  assert.deepEqual(
    COMEBACK_ACTIVITY_CURRENT_RISK_METADATA_GAP.unknownRequiredDimensions,
    [],
  );
  assert.deepEqual(
    COMEBACK_ACTIVITY_CURRENT_RISK_METADATA_GAP.absentOptionalDimensions,
    ['volatility'],
  );
  assert.deepEqual(
    COMEBACK_ACTIVITY_CURRENT_RISK_METADATA_GAP.blockers,
    ['required-quality-metadata-absent'],
  );
});
