import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateNaverEvidenceBlobProvisioningReadiness,
  NAVER_EVIDENCE_BLOB_PROVISIONING_PLAN,
} from '../lib/server/storage/naverEvidenceBlobProvisioningReadiness';
import {
  resolveVercelBlobPrivateStoreConfig,
} from '../lib/server/storage/vercelBlobImmutableTextObjectStore';

test('unbound environment is ready only for explicit provisioning and binding', () => {
  const result =
    evaluateNaverEvidenceBlobProvisioningReadiness({});

  assert.equal(
    result.status,
    'ready-for-explicit-provisioning-and-binding',
  );
  if (result.status !== 'ready-for-explicit-provisioning-and-binding') {
    return;
  }

  assert.equal(result.provisioned, false);
  assert.equal(result.bound, false);
  assert.equal(
    result.requiredExplicitAction,
    'provision-private-vercel-blob-store-and-bind-production',
  );
  assert.deepEqual(result.plan, NAVER_EVIDENCE_BLOB_PROVISIONING_PLAN);
  assert.deepEqual(result.plan.allowedEnvironments, ['production']);
  assert.equal(result.plan.access, 'private');
  assert.equal(result.plan.region, 'iad1');
  assert.equal(result.plan.preferredAuthentication, 'oidc');
});

test('connected Vercel BLOB_STORE_ID is accepted for OIDC binding', () => {
  const environment = {
    VERCEL_OIDC_TOKEN: 'oidc-secret',
    BLOB_STORE_ID: 'store_123',
  };

  assert.deepEqual(resolveVercelBlobPrivateStoreConfig(environment), {
    token: null,
    oidcToken: 'oidc-secret',
    storeId: 'store_123',
  });

  const result =
    evaluateNaverEvidenceBlobProvisioningReadiness(environment);

  assert.equal(result.status, 'bound-config-detected');
  if (result.status !== 'bound-config-detected') return;

  assert.equal(result.bound, true);
  assert.equal(result.authMode, 'oidc');
  assert.equal(result.storeIdPresent, true);
  assert.equal(
    result.requiredNextGate,
    'verify-private-store-binding-before-live-mirror-write',
  );
});

test('FANDEX-specific store id overrides generic connected store id', () => {
  assert.deepEqual(
    resolveVercelBlobPrivateStoreConfig({
      VERCEL_OIDC_TOKEN: 'oidc-secret',
      BLOB_STORE_ID: 'store_generic',
      FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID: 'store_fandex',
    }),
    {
      token: null,
      oidcToken: 'oidc-secret',
      storeId: 'store_fandex',
    },
  );
});

test('static token binding remains an allowed fallback', () => {
  const result =
    evaluateNaverEvidenceBlobProvisioningReadiness({
      BLOB_READ_WRITE_TOKEN: 'token',
    });

  assert.equal(result.status, 'bound-config-detected');
  if (result.status !== 'bound-config-detected') return;
  assert.equal(result.authMode, 'static-token');
  assert.equal(result.storeIdPresent, false);
});

test('partial OIDC binding fails closed', () => {
  const result =
    evaluateNaverEvidenceBlobProvisioningReadiness({
      VERCEL_OIDC_TOKEN: 'oidc-secret',
    });

  assert.deepEqual(result, {
    contractVersion: 'naver-evidence-blob-provisioning-readiness-v1',
    status: 'data-issue',
    provisioned: 'unknown',
    bound: false,
    reason: 'partial-blob-binding-config',
    plan: NAVER_EVIDENCE_BLOB_PROVISIONING_PLAN,
  });
});
