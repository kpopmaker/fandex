import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  MOMENTUM_NATIVE_VERIFIER_PRODUCTION_EXECUTION_AUTHORIZATION,
  isMomentumProductionVerifierExecutionAuthorizationHeaderValid,
  isMomentumProductionVerifierExecutionRequestAuthorized,
  isMomentumProductionVerifierNativeExecutionAuthorized,
} from '../lib/server/ingestion/momentumNativeVerifierProductionExecutionAuthorization';
import {
  MOMENTUM_PRODUCTION_VERIFIER_ACTIVATION_APPROVAL,
} from '../lib/server/ingestion/momentumProductionVerifierActivationApproval';

const EXACT_REQUEST = Object.freeze({
  contractVersion:
    'v162_naver_news_momentum_native_verifier_execution_request_v1',
  purpose: 'momentum-native-verifier-read-only',
  canonicalArtistId: 'iu',
  throughSlotStart: '2026-09-21T12:00:00.000Z',
});

test('Production execution authorization is exact-bound to owner evidence', () => {
  const auth =
    MOMENTUM_NATIVE_VERIFIER_PRODUCTION_EXECUTION_AUTHORIZATION;

  assert.equal(
    auth.executionAuthorizationId,
    'ops-execution-momentum-verifier-20260926t082730z-v1',
  );
  assert.equal(auth.authorizedAt, '2026-09-26T08:27:30.000Z');
  assert.equal(auth.authorizationEvidenceCommentId, 5844602378);
  assert.equal(
    auth.authorizedMain,
    '4bc3671ef6390de42468c95deb46eb6907c2d069',
  );
  assert.equal(
    auth.productionDeployment.deploymentId,
    'dpl_EKqjERWSb6PTkV1xNGybZCN1Kn8T',
  );
  assert.equal(auth.target.canonicalArtistId, 'iu');
  assert.equal(
    auth.target.throughSlotStart,
    '2026-09-21T12:00:00.000Z',
  );
  assert.equal(auth.target.maximumExecutions, 1);
});

test('execution authorization is layered on the historical activation approval', () => {
  const auth =
    MOMENTUM_NATIVE_VERIFIER_PRODUCTION_EXECUTION_AUTHORIZATION;

  assert.equal(
    auth.activationBinding.activationAuthorizationId,
    MOMENTUM_PRODUCTION_VERIFIER_ACTIVATION_APPROVAL
      .activationAuthorizationId,
  );
  assert.equal(
    MOMENTUM_PRODUCTION_VERIFIER_ACTIVATION_APPROVAL
      .decision.activationAuthorized,
    true,
  );
  assert.equal(
    MOMENTUM_PRODUCTION_VERIFIER_ACTIVATION_APPROVAL
      .decision.nativeVerifierExecutionAuthorized,
    false,
  );
  assert.equal(auth.decision.nativeVerifierExecutionAuthorized, true);
  assert.equal(auth.decision.nativeVerifierExecutionPerformed, false);
  assert.equal(auth.decision.ledgerAdvancementAuthorized, false);
  assert.equal(auth.decision.productMetricPublicationAuthorized, false);
  assert.equal(auth.decision.registryMutationAuthorized, false);
});

test('only the exact artist and historical slot are execution-authorized', () => {
  assert.equal(isMomentumProductionVerifierNativeExecutionAuthorized(), true);
  assert.equal(
    isMomentumProductionVerifierExecutionRequestAuthorized(EXACT_REQUEST),
    true,
  );
  assert.equal(
    isMomentumProductionVerifierExecutionRequestAuthorized({
      ...EXACT_REQUEST,
      throughSlotStart: '2026-09-21T13:00:00.000Z',
    }),
    false,
  );
  assert.equal(
    isMomentumProductionVerifierExecutionRequestAuthorized({
      ...EXACT_REQUEST,
      canonicalArtistId: 'bts',
    }),
    false,
  );
});

test('route authorization header must match the exact execution id', () => {
  const id =
    MOMENTUM_NATIVE_VERIFIER_PRODUCTION_EXECUTION_AUTHORIZATION
      .executionAuthorizationId;
  assert.equal(
    isMomentumProductionVerifierExecutionAuthorizationHeaderValid(id),
    true,
  );
  assert.equal(
    isMomentumProductionVerifierExecutionAuthorizationHeaderValid(
      'ops-execution-momentum-verifier-wrong',
    ),
    false,
  );
});

test('Production route binds method, header, request and dedicated execution authorization', async () => {
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
    /isMomentumProductionVerifierExecutionAuthorizationHeaderValid/,
  );
  assert.match(
    source,
    /x-fandex-execution-authorization-id/,
  );
  assert.match(
    source,
    /isMomentumProductionVerifierExecutionRequestAuthorized/,
  );
});

test('one-shot executor is workflow-dispatched and does not persist dedicated secret', async () => {
  const source = await readFile(
    new URL(
      '../scripts/operations/momentumNativeVerifierProductionExecutionV1.mjs',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(source, /execution_authorization_already_consumed/);
  assert.match(source, /decrypt=true/);
  assert.match(source, /FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET/);
  assert.match(source, /MOMENTUM_NATIVE_VERIFIER_PRODUCTION_EXECUTION=SUCCESS/);
  assert.doesNotMatch(source, /writeFile|appendFile|createWriteStream/);
  assert.doesNotMatch(source, /console\.log\([^\n]*verifierSecret/);
});
