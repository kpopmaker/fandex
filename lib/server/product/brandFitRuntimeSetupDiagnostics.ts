export const BRAND_FIT_RUNTIME_SETUP_DIAGNOSTIC_VERSION =
  'brand-fit-runtime-setup-diagnostic-v1' as const;

export type BrandFitRuntimeSetupFailureCategory =
  | 'blob-store-id-missing'
  | 'vercel-project-binding-invalid'
  | 'vercel-team-binding-invalid'
  | 'project-oidc-token-missing'
  | 'project-oidc-response-invalid'
  | 'blob-credentials-missing'
  | 'not-production-runtime'
  | `project-oidc-mint-http-${number}`
  | 'runtime-setup-unclassified';

export function classifyBrandFitRuntimeSetupFailure(
  error: unknown,
): BrandFitRuntimeSetupFailureCategory {
  const code = error instanceof Error ? error.message : '';

  switch (code) {
    case 'brand_fit_stored_evidence_blob_store_missing':
      return 'blob-store-id-missing';
    case 'brand_fit_stored_evidence_vercel_project_binding_invalid':
      return 'vercel-project-binding-invalid';
    case 'brand_fit_stored_evidence_vercel_team_binding_invalid':
      return 'vercel-team-binding-invalid';
    case 'brand_fit_stored_evidence_project_oidc_missing':
      return 'project-oidc-token-missing';
    case 'brand_fit_stored_evidence_project_oidc_response_invalid':
      return 'project-oidc-response-invalid';
    case 'brand_fit_stored_evidence_blob_credentials_missing':
      return 'blob-credentials-missing';
    case 'brand_fit_stored_evidence_runtime_not_production':
      return 'not-production-runtime';
  }

  const mintHttpStatus =
    /^brand_fit_stored_evidence_project_oidc_mint_failed:([1-5][0-9]{2})$/
      .exec(code)?.[1];
  if (mintHttpStatus !== undefined) {
    return `project-oidc-mint-http-${Number(mintHttpStatus)}`;
  }

  // Never log raw exception messages, credential strings, or stack traces.
  return 'runtime-setup-unclassified';
}
