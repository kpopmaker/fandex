import {
  get,
  list,
  put,
} from '@vercel/blob';

import {
  createVercelBlobImmutableTextObjectStore,
  type VercelBlobPrivateStoreConfig,
  type VercelBlobSdkPort,
} from './vercelBlobImmutableTextObjectStore';

const blobSdk: VercelBlobSdkPort = Object.freeze({
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
  async put(pathname, body, options) {
    const result = await put(pathname, body, options);
    return { pathname: result.pathname };
  },
});

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveBrandFitStoredEvidenceWriteBlobConfig(
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
    'brand_fit_stored_evidence_write_blob_credentials_missing',
  );
}

export function createProductionBrandFitStoredEvidenceWriteStore(
  environment: Readonly<Record<string, string | undefined>>,
  client: VercelBlobSdkPort = blobSdk,
) {
  return createVercelBlobImmutableTextObjectStore(
    client,
    resolveBrandFitStoredEvidenceWriteBlobConfig(environment),
  );
}
