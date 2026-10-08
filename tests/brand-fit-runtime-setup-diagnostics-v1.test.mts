import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  classifyBrandFitRuntimeSetupFailure,
} from '../lib/server/product/brandFitRuntimeSetupDiagnostics';

test('Brand Fit setup failures are categorized without secret leakage', () => {
  const cases = [
    ['brand_fit_stored_evidence_blob_store_missing', 'blob-store-id-missing'],
    ['brand_fit_stored_evidence_vercel_project_binding_invalid', 'vercel-project-binding-invalid'],
    ['brand_fit_stored_evidence_vercel_team_binding_invalid', 'vercel-team-binding-invalid'],
    ['brand_fit_stored_evidence_project_oidc_missing', 'project-oidc-token-missing'],
    ['brand_fit_stored_evidence_project_oidc_response_invalid', 'project-oidc-response-invalid'],
    ['brand_fit_stored_evidence_blob_credentials_missing', 'blob-credentials-missing'],
    ['brand_fit_stored_evidence_runtime_not_production', 'not-production-runtime'],
    ['brand_fit_stored_evidence_project_oidc_mint_failed:401', 'project-oidc-mint-http-401'],
    ['brand_fit_stored_evidence_project_oidc_mint_failed:503', 'project-oidc-mint-http-503'],
  ] as const;

  for (const [message, category] of cases) {
    assert.equal(
      classifyBrandFitRuntimeSetupFailure(new Error(message)),
      category,
    );
  }
});

test('unexpected exceptions cannot echo tokens, URLs, or arbitrary strings', () => {
  const secret = 'Bearer_very_sensitive_token_abc123';
  const response = classifyBrandFitRuntimeSetupFailure(
    new Error(`request failed: ${secret}`),
  );
  assert.equal(response, 'runtime-setup-unclassified');
  assert.equal(response.includes(secret), false);
  assert.equal(
    classifyBrandFitRuntimeSetupFailure(`token=${secret}`),
    'runtime-setup-unclassified',
  );
  assert.equal(
    classifyBrandFitRuntimeSetupFailure(new Error(
      'brand_fit_stored_evidence_project_oidc_mint_failed:401;token=BAD',
    )),
    'runtime-setup-unclassified',
  );
});

test('Brand Fit unavailable state stays fail-closed and logs only sanitized category', () => {
  const runtimeSource = readFileSync(
    new URL(
      '../lib/server/product/brandFitStoredEvidenceRuntime.ts',
      import.meta.url,
    ),
    'utf8',
  );
  assert.match(
    runtimeSource,
    /classifyBrandFitRuntimeSetupFailure\(error\)/,
  );
  assert.match(
    runtimeSource,
    /FANDEX_BRAND_FIT_RUNTIME_DIAGNOSTIC=/,
  );
  assert.match(
    runtimeSource,
    /'durable-stored-evidence-runtime-unavailable'/,
  );
  assert.doesNotMatch(runtimeSource, /console\.warn\(error\)/);
  assert.doesNotMatch(runtimeSource, /console\.error\(error\)/);
});
