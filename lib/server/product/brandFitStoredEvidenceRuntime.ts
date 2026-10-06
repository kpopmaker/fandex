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

export function createProductionBrandFitStoredEvidenceReadStore(
  environment: Readonly<Record<string, string | undefined>>,
  client: Pick<VercelBlobSdkPort, 'get' | 'list'> = blobSdk,
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
  client: Pick<VercelBlobSdkPort, 'get' | 'list'> = blobSdk,
): Promise<FandexCurrentRuntimeBrandFitSource> {
  let store;
  try {
    store = createProductionBrandFitStoredEvidenceReadStore(
      environment,
      client,
    );
  } catch {
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
