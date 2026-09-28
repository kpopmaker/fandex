import {
  resolveVercelBlobPrivateStoreConfig,
  type VercelBlobPrivateStoreConfig,
} from './vercelBlobImmutableTextObjectStore';

export const NAVER_EVIDENCE_BLOB_PROVISIONING_READINESS_VERSION =
  'naver-evidence-blob-provisioning-readiness-v1' as const;

export const NAVER_EVIDENCE_BLOB_PROVISIONING_PLAN = Object.freeze({
  provider: 'vercel-blob' as const,
  storeName: 'fandex-naver-evidence' as const,
  access: 'private' as const,
  region: 'iad1' as const,
  projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const,
  allowedEnvironments: Object.freeze(['production'] as const),
  preferredAuthentication: 'oidc' as const,
  staticTokenFallbackAllowed: true,
  mirrorRoot: 'fandex/naver-news/stored-evidence-mirror/v1' as const,
});

export type NaverEvidenceBlobProvisioningReadiness =
  | Readonly<{
      contractVersion:
        typeof NAVER_EVIDENCE_BLOB_PROVISIONING_READINESS_VERSION;
      status: 'ready-for-explicit-provisioning-and-binding';
      provisioned: false;
      bound: false;
      plan: typeof NAVER_EVIDENCE_BLOB_PROVISIONING_PLAN;
      requiredExplicitAction:
        'provision-private-vercel-blob-store-and-bind-production';
    }>
  | Readonly<{
      contractVersion:
        typeof NAVER_EVIDENCE_BLOB_PROVISIONING_READINESS_VERSION;
      status: 'bound-config-detected';
      provisioned: 'unknown';
      bound: true;
      authMode: 'oidc' | 'static-token';
      storeIdPresent: boolean;
      plan: typeof NAVER_EVIDENCE_BLOB_PROVISIONING_PLAN;
      requiredNextGate:
        'verify-private-store-binding-before-live-mirror-write';
    }>
  | Readonly<{
      contractVersion:
        typeof NAVER_EVIDENCE_BLOB_PROVISIONING_READINESS_VERSION;
      status: 'data-issue';
      provisioned: 'unknown';
      bound: false;
      reason: 'partial-blob-binding-config';
      plan: typeof NAVER_EVIDENCE_BLOB_PROVISIONING_PLAN;
    }>;

function hasNonEmpty(
  environment: Readonly<Record<string, string | undefined>>,
  key: string,
): boolean {
  return typeof environment[key] === 'string'
    && environment[key]!.trim().length > 0;
}

function detectBoundConfig(
  environment: Readonly<Record<string, string | undefined>>,
): Readonly<{
  config: VercelBlobPrivateStoreConfig;
  authMode: 'oidc' | 'static-token';
}> | null {
  try {
    const config = resolveVercelBlobPrivateStoreConfig(environment);
    return Object.freeze({
      config,
      authMode: config.token ? 'static-token' : 'oidc',
    });
  } catch {
    return null;
  }
}

export function evaluateNaverEvidenceBlobProvisioningReadiness(
  environment: Readonly<Record<string, string | undefined>>,
): NaverEvidenceBlobProvisioningReadiness {
  const bound = detectBoundConfig(environment);
  if (bound) {
    return Object.freeze({
      contractVersion:
        NAVER_EVIDENCE_BLOB_PROVISIONING_READINESS_VERSION,
      status: 'bound-config-detected' as const,
      provisioned: 'unknown' as const,
      bound: true,
      authMode: bound.authMode,
      storeIdPresent: bound.config.storeId !== null,
      plan: NAVER_EVIDENCE_BLOB_PROVISIONING_PLAN,
      requiredNextGate:
        'verify-private-store-binding-before-live-mirror-write' as const,
    });
  }

  const anyBlobConfig =
    hasNonEmpty(environment, 'BLOB_READ_WRITE_TOKEN')
    || hasNonEmpty(environment, 'VERCEL_OIDC_TOKEN')
    || hasNonEmpty(environment, 'BLOB_STORE_ID')
    || hasNonEmpty(
      environment,
      'FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID',
    );

  if (anyBlobConfig) {
    return Object.freeze({
      contractVersion:
        NAVER_EVIDENCE_BLOB_PROVISIONING_READINESS_VERSION,
      status: 'data-issue' as const,
      provisioned: 'unknown' as const,
      bound: false,
      reason: 'partial-blob-binding-config' as const,
      plan: NAVER_EVIDENCE_BLOB_PROVISIONING_PLAN,
    });
  }

  return Object.freeze({
    contractVersion:
      NAVER_EVIDENCE_BLOB_PROVISIONING_READINESS_VERSION,
    status: 'ready-for-explicit-provisioning-and-binding' as const,
    provisioned: false,
    bound: false,
    plan: NAVER_EVIDENCE_BLOB_PROVISIONING_PLAN,
    requiredExplicitAction:
      'provision-private-vercel-blob-store-and-bind-production' as const,
  });
}
