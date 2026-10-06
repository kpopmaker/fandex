import 'server-only';

import { get, list } from '@vercel/blob';

import {
  readReportedAlbumSalesStoredEvidenceRuntime,
  type ReportedAlbumSalesStoredEvidenceRuntimeReadResult,
} from '../../product/runtime/reportedAlbumSalesStoredEvidenceRuntime';
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

export const FANDEX_MUSIC_ALBUM_EVIDENCE_BLOB_STORE_ID_ENV =
  'FANDEX_MUSIC_ALBUM_EVIDENCE_BLOB_STORE_ID' as const;

export const FANDEX_MUSIC_ALBUM_PRODUCT_RUNTIME_ENV =
  'FANDEX_PRODUCT_RUNTIME_ENV' as const;

type ReadOnlyBlobSdk = Pick<VercelBlobSdkPort, 'get' | 'list'>;

export type MusicAlbumReportedWebStoredEvidenceRuntimeDependencies =
  Readonly<{
    client?: ReadOnlyBlobSdk;
  }>;

function clean(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function isProductionRuntime(
  environment: Readonly<Record<string, string | undefined>>,
): boolean {
  return (
    environment[FANDEX_MUSIC_ALBUM_PRODUCT_RUNTIME_ENV]?.trim()
      === 'production'
    || environment.VERCEL_ENV?.trim() === 'production'
  );
}

export function resolveMusicAlbumReportedWebBlobConfig(
  environment: Readonly<Record<string, string | undefined>>,
): VercelBlobPrivateStoreConfig {
  const token = clean(environment.BLOB_READ_WRITE_TOKEN);
  const oidcToken = clean(environment.VERCEL_OIDC_TOKEN);
  const storeId =
    clean(environment[FANDEX_MUSIC_ALBUM_EVIDENCE_BLOB_STORE_ID_ENV])
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
    'music_album_reported_web_blob_credentials_missing',
  );
}

export function createProductionMusicAlbumReportedWebReadStore(
  environment: Readonly<Record<string, string | undefined>>,
  client: ReadOnlyBlobSdk = blobSdk,
) {
  if (!isProductionRuntime(environment)) {
    throw new Error(
      'music_album_reported_web_runtime_not_production',
    );
  }

  return createVercelBlobTextReadStore(
    client,
    resolveMusicAlbumReportedWebBlobConfig(environment),
  );
}

export async function getMusicAlbumReportedWebStoredEvidenceCurrentRuntimeForIU(
  environment: Readonly<Record<string, string | undefined>> =
    process.env,
  dependencies:
    MusicAlbumReportedWebStoredEvidenceRuntimeDependencies = {},
): Promise<ReportedAlbumSalesStoredEvidenceRuntimeReadResult> {
  let store;
  try {
    store = createProductionMusicAlbumReportedWebReadStore(
      environment,
      dependencies.client ?? blobSdk,
    );
  } catch {
    return Object.freeze({
      status: 'unavailable' as const,
      contractVersion:
        'reported-album-sales-stored-evidence-runtime-v1' as const,
      reason: 'stored-evidence-not-found' as const,
    });
  }

  return readReportedAlbumSalesStoredEvidenceRuntime({
    canonicalArtistId: 'iu',
    store,
  });
}
