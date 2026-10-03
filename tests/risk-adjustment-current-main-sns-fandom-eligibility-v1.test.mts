import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomPointReadiness,
  SNS_FANDOM_POINT_CONTRACT_VERSION,
  SNS_FANDOM_PROVIDER_QUALIFICATIONS,
} from '../lib/intelligence/snsFandomPointContracts';
import {
  RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_HANDOFFS,
  RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_READINESS,
} from '../lib/intelligence/riskAdjustmentUpstreamHandoff';

test('merged snsFandom Production contract boundary is not a current Real Risk dependency', () => {
  assert.equal(
    SNS_FANDOM_POINT_CONTRACT_VERSION,
    'sns-fandom-point-production-contract-v1',
  );

  assert.equal(
    SNS_FANDOM_PROVIDER_QUALIFICATIONS.some(
      (qualification) => qualification.state === 'production-ready',
    ),
    false,
  );

  const readiness = evaluateSnsFandomPointReadiness({
    canonicalArtistId: 'iu',
    observations: [],
  });

  assert.equal(readiness.state, 'provider-rights-blocked');
  assert.deepEqual(readiness.productionReadyProviders, []);
  assert.equal(readiness.snsFandomPoint, null);
  assert.equal(readiness.numericProductEligible, false);
  assert.equal(readiness.productActivationReady, false);
  assert.equal(readiness.productPublicationReady, false);

  assert.deepEqual(
    RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_HANDOFFS.map(
      (handoff) => handoff.variableId,
    ),
    ['newsIssuePoint', 'comebackActivityPoint'],
  );
  assert.equal(
    RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_HANDOFFS.some(
      (handoff) => handoff.variableId === 'snsFandomPoint',
    ),
    false,
  );
  assert.deepEqual(RISK_ADJUSTMENT_CURRENT_REAL_UPSTREAM_READINESS, {
    candidateCount: 2,
    acceptedCount: 2,
    metadataBlockedCount: 0,
    notProductionEligibleCount: 0,
  });
});
