import 'server-only';

import { get, list } from '@vercel/blob';

import {
  readBrandFitStoredEvidenceRuntime,
} from '../../product/runtime/brandFitStoredEvidenceRuntime';
import type {
  FandexCurrentRuntimeBrandFitSource,
} from '../../product/runtime/fandexCurrentRuntimeAssemblyReadiness';
import {
  createVercelBlobTextReadStore,
  type VercelBlobPrivateStoreConfig,
  type VercelBlobSdkPort,
} from '../storage/vercelBlobImmutableTextObjectStore';

import {
  classifyBrandFitRuntimeSetupFailure,
} from './brandFitRuntimeSetupDiagnostics';

const blobSdk: Pick<VercelBlobSdkPort, 'get' | 'list'> =
  Object.freeze({
    async get(urlOrPathname, options) {
      const result = await get(urlOrPathname, options);
      return result === null || result.stream === null
        ? null
        : { stream: result.stream };
    },
    async list(options) {
      const result = await list(options);
      return {
        blobs: result.blobs.map((blob) => ({
          pathname: blob.pathname,
        })),
        ...(result.cursor ? { cursor: result.cursor } : {}),
        hasMore: result.hasMore,
      };
    },
  });

export const FANDEX_PRODUCT_RUNTIME_ENV =
  'FANDEX_PRODUCT_RUNTIME_ENV' as const;

export const FANDEX_BRAND_FIT_VERCEL_PROJECT_ID =
  'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const;
export const FANDEX_BRAND_FIT_VERCEL_TEAM_ID =
  'team_OrRPxuBxMwCYU3kk0r76AfOs' as const;

function isProductionRuntime(
  environment: Readonly<Record<string, string | undefined>>,
): boolean {
  return (
    environment[FANDEX_PRODUCT_RUNTIME_ENV]?.trim() === 'production'
    || environment.VERCEL_ENV?.trim() === 'production'
  );
}

function clean(
  value: string | undefined,
): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

type ReadOnlyBlobSdk = Pick<VercelBlobSdkPort, 'get' | 'list'>;

type ProjectOidcResolver = (
  environment: Readonly<Record<string, string | undefined>>,
) => Promise<string | undefined>;

export type BrandFitStoredEvidenceRuntimeDependencies =
  Readonly<{
    client?: ReadOnlyBlobSdk;
    resolveProjectOidcToken?: ProjectOidcResolver;
  }>;

let cachedProjectOidc:
  | Readonly<{
      token: string;
      expiresAtMs: number;
    }>
  | null = null;

function jwtExpiryMs(token: string): number | null {
  try {
    const segments = token.split('.');
    if (segments.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(segments[1] ?? '', 'base64url').toString('utf8'),
    ) as { exp?: unknown };
    return typeof payload.exp === 'number'
      && Number.isFinite(payload.exp)
      ? payload.exp * 1000
      : null;
  } catch {
    return null;
  }
}

function resolveExactVercelBinding(
  environment: Readonly<Record<string, string | undefined>>,
): Readonly<{
  projectId: typeof FANDEX_BRAND_FIT_VERCEL_PROJECT_ID;
  teamId: typeof FANDEX_BRAND_FIT_VERCEL_TEAM_ID;
}> {
  const projectId =
    clean(environment.FANDEX_VERCEL_PROJECT_ID)
    ?? clean(environment.VERCEL_PROJECT_ID)
    ?? FANDEX_BRAND_FIT_VERCEL_PROJECT_ID;
  const teamId =
    clean(environment.FANDEX_VERCEL_TEAM_ID)
    ?? clean(environment.VERCEL_TEAM_ID)
    ?? FANDEX_BRAND_FIT_VERCEL_TEAM_ID;

  if (projectId !== FANDEX_BRAND_FIT_VERCEL_PROJECT_ID) {
    throw new Error(
      'brand_fit_stored_evidence_vercel_project_binding_invalid',
    );
  }
  if (teamId !== FANDEX_BRAND_FIT_VERCEL_TEAM_ID) {
    throw new Error(
      'brand_fit_stored_evidence_vercel_team_binding_invalid',
    );
  }

  return Object.freeze({
    projectId: FANDEX_BRAND_FIT_VERCEL_PROJECT_ID,
    teamId: FANDEX_BRAND_FIT_VERCEL_TEAM_ID,
  });
}

export async function mintBrandFitVercelProjectOidcToken(
  environment: Readonly<Record<string, string | undefined>>,
): Promise<string | undefined> {
  const accessToken = clean(environment.VERCEL_TOKEN);
  if (!accessToken) return undefined;

  const now = Date.now();
  if (
    cachedProjectOidc
    && cachedProjectOidc.expiresAtMs > now + 60_000
  ) {
    return cachedProjectOidc.token;
  }

  const { projectId, teamId } =
    resolveExactVercelBinding(environment);
  const url = new URL(
    `https://api.vercel.com/v1/projects/${encodeURIComponent(
      projectId,
    )}/token`,
  );
  url.searchParams.set('teamId', teamId);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: 'fandex:brand-fit-product-runtime-read-v1',
    }),
  });

  if (!response.ok) {
    throw new Error(
      `brand_fit_stored_evidence_project_oidc_mint_failed:${response.status}`,
    );
  }

  const payload = await response.json() as { token?: unknown };
  const token =
    typeof payload.token === 'string'
      ? payload.token.trim()
      : '';

  if (token.length < 32 || /\s/.test(token)) {
    throw new Error(
      'brand_fit_stored_evidence_project_oidc_response_invalid',
    );
  }

  cachedProjectOidc = Object.freeze({
    token,
    expiresAtMs:
      jwtExpiryMs(token) ?? (now + 5 * 60_000),
  });

  return token;
}

export function resolveBrandFitStoredEvidenceBlobConfig(
  environment: Readonly<Record<string, string | undefined>>,
): VercelBlobPrivateStoreConfig {
  const token = clean(environment.BLOB_READ_WRITE_TOKEN);
  const oidcToken = clean(environment.VERCEL_OIDC_TOKEN);
  const storeId =
    clean(environment.FANDEX_BRAND_FIT_EVIDENCE_BLOB_STORE_ID)
    ?? clean(environment.BLOB_STORE_ID);

  if (token) {
    return Object.freeze({
      token,
      oidcToken: null,
      storeId,
    });
  }

  if (oidcToken && storeId) {
    return Object.freeze({
      token: null,
      oidcToken,
      storeId,
    });
  }

  throw new Error(
    'brand_fit_stored_evidence_blob_credentials_missing',
  );
}

export async function resolveBrandFitStoredEvidenceRuntimeEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
  resolveProjectOidcToken: ProjectOidcResolver =
    mintBrandFitVercelProjectOidcToken,
): Promise<Readonly<Record<string, string | undefined>>> {
  if (clean(environment.BLOB_READ_WRITE_TOKEN)) {
    return environment;
  }

  const storeId =
    clean(environment.FANDEX_BRAND_FIT_EVIDENCE_BLOB_STORE_ID)
    ?? clean(environment.BLOB_STORE_ID);
  if (!storeId) {
    throw new Error(
      'brand_fit_stored_evidence_blob_store_missing',
    );
  }

  const existingOidc = clean(environment.VERCEL_OIDC_TOKEN);
  if (existingOidc) {
    return Object.freeze({
      ...environment,
      BLOB_STORE_ID: storeId,
      VERCEL_OIDC_TOKEN: existingOidc,
    });
  }

  const oidcToken =
    (await resolveProjectOidcToken(environment))?.trim() ?? '';
  if (!oidcToken) {
    throw new Error(
      'brand_fit_stored_evidence_project_oidc_missing',
    );
  }

  return Object.freeze({
    ...environment,
    BLOB_STORE_ID: storeId,
    VERCEL_OIDC_TOKEN: oidcToken,
  });
}

export function createProductionBrandFitStoredEvidenceReadStore(
  environment: Readonly<Record<string, string | undefined>>,
  client: ReadOnlyBlobSdk = blobSdk,
) {
  if (!isProductionRuntime(environment)) {
    throw new Error(
      'brand_fit_stored_evidence_runtime_not_production',
    );
  }

  return createVercelBlobTextReadStore(
    client,
    resolveBrandFitStoredEvidenceBlobConfig(environment),
  );
}

export async function getBrandFitStoredEvidenceCurrentRuntimeForIU(
  environment: Readonly<Record<string, string | undefined>> =
    process.env,
  dependencies: BrandFitStoredEvidenceRuntimeDependencies = {},
): Promise<FandexCurrentRuntimeBrandFitSource> {
  let store;
  try {
    const resolvedEnvironment =
      await resolveBrandFitStoredEvidenceRuntimeEnvironment(
        environment,
        dependencies.resolveProjectOidcToken
          ?? mintBrandFitVercelProjectOidcToken,
      );
    store = createProductionBrandFitStoredEvidenceReadStore(
      resolvedEnvironment,
      dependencies.client ?? blobSdk,
    );
  } catch (error) {
    console.warn(
      `FANDEX_BRAND_FIT_RUNTIME_DIAGNOSTIC=${classifyBrandFitRuntimeSetupFailure(error)}`,
    );
    return Object.freeze({
      status: 'unavailable' as const,
      reason:
        'durable-stored-evidence-runtime-unavailable' as const,
    });
  }

  const result = await readBrandFitStoredEvidenceRuntime({
    canonicalArtistId: 'iu',
    store,
  });

  if (result.status === 'ok') {
    return Object.freeze({
      status: 'ok' as const,
      evidence: result.evidence,
    });
  }

  if (result.status === 'unavailable') {
    return Object.freeze({
      status: 'unavailable' as const,
      reason: 'durable-stored-evidence-not-found' as const,
    });
  }

  return Object.freeze({
    status: 'data-issue' as const,
    reason: `brand-fit-stored-evidence:${result.reason}`,
  });
}
