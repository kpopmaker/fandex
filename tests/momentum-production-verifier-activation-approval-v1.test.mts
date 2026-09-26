import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  MOMENTUM_PRODUCTION_VERIFIER_ACTIVATION_APPROVAL,
  isMomentumProductionVerifierNativeExecutionAuthorized,
} from '../lib/server/ingestion/momentumProductionVerifierActivationApproval';

test('Momentum verifier activation approval is exact-bound to owner evidence and deployed main', () => {
  const approval = MOMENTUM_PRODUCTION_VERIFIER_ACTIVATION_APPROVAL;

  assert.equal(
    approval.contractVersion,
    'momentum-production-verifier-activation-approval-v1',
  );
  assert.equal(
    approval.activationAuthorizationId,
    'ops-activation-momentum-verifier-20260926t075504z-v1',
  );
  assert.equal(approval.authorizedAt, '2026-09-26T07:55:04.000Z');
  assert.equal(approval.authorizationEvidenceCommentId, 5844415594);
  assert.equal(
    approval.authorizedMain,
    '7a38ceb1b23d75e950b8108ae8b680ab347d1686',
  );
  assert.equal(
    approval.productionDeployment.deploymentId,
    'dpl_DtozPHB1ZUrafrzaj7mm5QeYpz1c',
  );
  assert.equal(
    approval.productionDeployment.deploymentCommit,
    approval.authorizedMain,
  );
  assert.equal(approval.productionDeployment.readyState, 'READY');
});

test('activation readiness lineage remains bound and activation is authorized', () => {
  const approval = MOMENTUM_PRODUCTION_VERIFIER_ACTIVATION_APPROVAL;

  assert.equal(approval.readiness.v163State, 'activation-readiness-pass');
  assert.equal(approval.readiness.readyForSeparateActivationDecision, true);
  assert.equal(
    approval.readiness.v163Digest,
    '7501f921012528bd8b3bd45a24b03363466fee2b90223418a0eb67ccee749149',
  );
  assert.equal(approval.readiness.v164State, 'configuration-evidence-ready');
  assert.equal(
    approval.readiness.v164Digest,
    '0941fbca89b5cdbf51d562987267ca5ed1129ea9c181739968dda28763a6f502',
  );
  assert.equal(approval.readiness.v166ConfigurationMutationCompleted, true);
  assert.equal(approval.decision.activationAuthorized, true);
  assert.equal(approval.decision.activationRecorded, true);
});

test('activation does not authorize native verifier execution or Product mutation', () => {
  const decision = MOMENTUM_PRODUCTION_VERIFIER_ACTIVATION_APPROVAL.decision;

  assert.equal(decision.nativeVerifierExecutionAuthorized, false);
  assert.equal(decision.nativeVerifierExecutionPerformed, false);
  assert.equal(decision.ledgerAdvancementAuthorized, false);
  assert.equal(decision.productMetricPublicationAuthorized, false);
  assert.equal(decision.registryMutationAuthorized, false);
  assert.equal(decision.publicRoutePublicationAuthorized, false);
  assert.equal(
    decision.requiredNextGate,
    'explicit-native-verifier-production-execution',
  );
  assert.equal(isMomentumProductionVerifierNativeExecutionAuthorized(), false);

  assert.deepEqual(
    MOMENTUM_PRODUCTION_VERIFIER_ACTIVATION_APPROVAL.effects,
    {
      databaseWrites: 0,
      productMetricWrites: 0,
      registryMutations: 0,
      verifierExecutions: 0,
      ledgerWrites: 0,
      environmentMutations: 0,
    },
  );
});

test('Production route is wired to fail closed until separate execution authorization', async () => {
  const source = await readFile(
    new URL(
      '../app/api/internal/naver-news/momentum-verifier/route.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(
    source,
    /isMomentumProductionVerifierNativeExecutionAuthorized/,
  );
  assert.match(
    source,
    /request\.method !== 'POST'[\s\S]*!isMomentumProductionVerifierNativeExecutionAuthorized\(\)/,
  );
  assert.match(
    source,
    /naver_news_momentum_verifier_execution_channel_rejected/,
  );
});
