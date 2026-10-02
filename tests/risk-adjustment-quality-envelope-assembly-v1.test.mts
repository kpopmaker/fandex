import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assembleRiskAdjustmentFromQualityEnvelopes,
} from '../lib/intelligence/riskAdjustmentQualityEnvelopeAssembly';
import type {
  RiskAdjustmentUpstreamQualityEnvelope,
} from '../lib/intelligence/riskAdjustmentUpstreamQualityEnvelope';

const defaultStateByDimension: Readonly<Record<string, string>> = {
  availability: 'available',
  identity: 'resolved',
  confidence: 'high',
  coverage: 'complete',
  freshness: 'current',
  conflict: 'none',
  revision: 'stable',
  history: 'sufficient',
  volatility: 'unknown',
};

const semantic = (
  prefix: string,
  dimension: string,
  stateValue = defaultStateByDimension[dimension],
) => ({
  semanticId: prefix + ':' + dimension,
  semanticVersion: 'v1',
  stateValue,
  evidenceRefs: ['contract:' + prefix + ':' + dimension],
});

function envelope(input: Readonly<{
  variableId: 'newsIssuePoint' | 'comebackActivityPoint';
  complete?: boolean;
  confidenceState?: 'high' | 'moderate' | 'low' | 'insufficient';
}>): RiskAdjustmentUpstreamQualityEnvelope {
  const prefix =
    input.variableId === 'newsIssuePoint' ? 'news' : 'activity';
  const requiredDimensionSemantics = {
    availability: semantic(
      prefix,
      'availability',
      input.variableId === 'newsIssuePoint'
        ? 'available-nonzero'
        : 'available',
    ),
    identity: semantic(prefix, 'identity'),
    confidence: semantic(
      prefix,
      'confidence',
      input.confidenceState ?? 'high',
    ),
    coverage: semantic(prefix, 'coverage'),
    freshness: semantic(prefix, 'freshness'),
    conflict: semantic(prefix, 'conflict'),
    revision: semantic(prefix, 'revision'),
    ...(input.complete === false
      ? {}
      : { history: semantic(prefix, 'history') }),
  };

  return {
    contractVersion: 'risk-adjustment-upstream-quality-envelope-v1',
    producerContractVersion: prefix + '-quality-v1',
    variableId: input.variableId,
    lifecycleState: 'production',
    materialClass: 'real',
    input: {
      variableId: input.variableId,
      lifecycleState: 'production',
      materialClass: 'real',
      confidenceState: input.confidenceState ?? 'high',
      availabilityState:
        input.variableId === 'newsIssuePoint'
          ? 'available-nonzero'
          : 'available',
      identityState: 'resolved',
      coverageState: 'complete',
      freshnessState: 'current',
      conflictState: 'none',
      revisionState: 'stable',
      volatilityState: 'unknown',
      historyState: 'sufficient',
      evidenceRefs: [prefix + ':evidence:1'],
    },
    requiredDimensionSemantics,
    optionalDimensionSemantics: {},
  };
}

test('accepted envelope flows directly into Product dependency assembly', () => {
  const result = assembleRiskAdjustmentFromQualityEnvelopes({
    artistId: 'iu',
    envelopes: [envelope({ variableId: 'newsIssuePoint' })],
  });

  assert.deepEqual(result.envelopes, [{
    variableId: 'newsIssuePoint',
    envelopeStatus: 'accepted',
    consumed: true,
  }]);
  assert.deepEqual(
    result.productDependencyAssembly.consumedVariableIds,
    ['newsIssuePoint'],
  );
  assert.deepEqual(
    result.productDependencyAssembly.blockedVariableIds,
    [],
  );
  assert.equal(
    result.productDependencyAssembly.productCandidate.readinessState,
    'categorical-contract-ready',
  );
  assert.equal(
    result.productDependencyAssembly.productCandidate.numericEligible,
    false,
  );
});

test('metadata-blocked envelope is visible but not consumed', () => {
  const result = assembleRiskAdjustmentFromQualityEnvelopes({
    artistId: 'iu',
    envelopes: [
      envelope({
        variableId: 'comebackActivityPoint',
        complete: false,
      }),
    ],
  });

  assert.deepEqual(result.envelopes, [{
    variableId: 'comebackActivityPoint',
    envelopeStatus: 'required-metadata-blocked',
    consumed: false,
  }]);
  assert.deepEqual(
    result.productDependencyAssembly.consumedVariableIds,
    [],
  );
  assert.deepEqual(
    result.productDependencyAssembly.blockedVariableIds,
    ['comebackActivityPoint'],
  );
  assert.equal(
    result.productDependencyAssembly.productCandidate.readinessState,
    'insufficient-data',
  );
});

test('accepted and blocked envelopes can coexist without contamination', () => {
  const result = assembleRiskAdjustmentFromQualityEnvelopes({
    artistId: 'iu',
    envelopes: [
      envelope({
        variableId: 'comebackActivityPoint',
        complete: false,
      }),
      envelope({ variableId: 'newsIssuePoint' }),
    ],
  });

  assert.deepEqual(
    result.productDependencyAssembly.consumedVariableIds,
    ['newsIssuePoint'],
  );
  assert.deepEqual(
    result.productDependencyAssembly.blockedVariableIds,
    ['comebackActivityPoint'],
  );
});

test('explicit insufficient confidence is consumed but keeps Product insufficient', () => {
  const result = assembleRiskAdjustmentFromQualityEnvelopes({
    artistId: 'iu',
    envelopes: [
      envelope({
        variableId: 'newsIssuePoint',
        confidenceState: 'insufficient',
      }),
    ],
  });

  assert.deepEqual(
    result.productDependencyAssembly.consumedVariableIds,
    ['newsIssuePoint'],
  );
  assert.equal(
    result.productDependencyAssembly.productCandidate.readinessState,
    'insufficient-data',
  );
  assert.equal(
    result.productDependencyAssembly.productCandidate
      .assessment.qualityIssues.includes('confidence-insufficient'),
    true,
  );
});

test('invalid quality envelope fails before Product assembly', () => {
  const invalid = {
    ...envelope({ variableId: 'newsIssuePoint' }),
    producerContractVersion: '',
  };

  assert.throws(
    () => assembleRiskAdjustmentFromQualityEnvelopes({
      artistId: 'iu',
      envelopes: [invalid],
    }),
    /risk_adjustment_quality_envelope_invalid:producer-contract-version-invalid/,
  );
});

test('duplicate variable envelopes fail deterministically', () => {
  assert.throws(
    () => assembleRiskAdjustmentFromQualityEnvelopes({
      artistId: 'iu',
      envelopes: [
        envelope({ variableId: 'newsIssuePoint' }),
        envelope({ variableId: 'newsIssuePoint' }),
      ],
    }),
    /risk_adjustment_quality_envelope_duplicate/,
  );
});
