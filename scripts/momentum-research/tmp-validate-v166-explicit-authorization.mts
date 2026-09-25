import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  evaluateFandexMomentumVerifierConfigurationMutationAuthorization,
  type FandexMomentumVerifierConfigurationMutationAuthorizationRecord,
} from '../../lib/intelligence/fandexMomentumVerifierConfigurationMutationAuthorizationResearch';
import {
  evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard,
} from '../../lib/intelligence/fandexMomentumVerifierConfigurationMutationExecutionGuardResearch';

const record = JSON.parse(readFileSync(
  'data/momentum-research/pr127_v166_configuration_mutation_authorization_record.json',
  'utf8',
)) as FandexMomentumVerifierConfigurationMutationAuthorizationRecord;

const v166 = evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
  evaluatedAt: '2026-09-25T14:20:00.000Z',
  requestIntent: 'explicit-configuration-mutation-authorization',
  upstreamV165Digest: 'f75d091666f2f8e9109918e8857cb0e0941c1a641cac8dd86660ba45cb10734f',
  upstreamV165State: 'provisioning-plan-ready',
  record,
});

assert.equal(v166.state, 'configuration-mutation-authorized');
assert.equal(v166.configurationMutationAuthorized, true);
assert.deepEqual(v166.blockers, []);
assert.equal(v166.productionDeploymentAuthorized, false);
assert.equal(v166.verifierActivationAuthorized, false);
assert.equal(v166.nativeVerifierExecutionAuthorized, false);
assert.equal(v166.ledgerAdvanceAuthorized, false);
assert.match(v166.recordDigest ?? '', /^[0-9a-f]{64}$/);

const v167 = evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard({
  authorization: v166,
  expectedV165PlanDigest: 'f75d091666f2f8e9109918e8857cb0e0941c1a641cac8dd86660ba45cb10734f',
  expectedAuthorizationRecordDigest: v166.recordDigest,
  secretHandleAttestation: null,
});

assert.equal(v167.state, 'mutation-envelope-blocked');
assert.equal(v167.mutationEnvelopeReady, false);
assert.deepEqual(v167.blockers, ['trusted-secret-handle-attestation-missing-or-invalid']);
assert.equal(v167.effects.vercelCalls, 0);
assert.equal(v167.effects.environmentMutations, 0);
assert.equal(v167.effects.secretWrites, 0);

console.log(JSON.stringify({
  v166: {
    state: v166.state,
    configurationMutationAuthorized: v166.configurationMutationAuthorized,
    recordDigest: v166.recordDigest,
    resultDigest: v166.digest,
    blockers: v166.blockers,
    downstream: {
      productionDeploymentAuthorized: v166.productionDeploymentAuthorized,
      verifierActivationAuthorized: v166.verifierActivationAuthorized,
      nativeVerifierExecutionAuthorized: v166.nativeVerifierExecutionAuthorized,
      ledgerAdvanceAuthorized: v166.ledgerAdvanceAuthorized,
    },
  },
  v167: {
    state: v167.state,
    mutationEnvelopeReady: v167.mutationEnvelopeReady,
    blockers: v167.blockers,
    digest: v167.digest,
  },
  effects: {
    vercelCalls: 0,
    environmentMutations: 0,
    secretWrites: 0,
  },
  productBoundary: {
    productMomentumScore: null,
    productionEligible: false,
    productProductionActual: '1/7',
  },
}, null, 2));
