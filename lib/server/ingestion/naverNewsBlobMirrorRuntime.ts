import { get, list, put } from '@vercel/blob';

import {
  finalizeNaverNewsStoredEvidenceMirror,
  stageNaverNewsStoredEvidenceMirror,
} from './naverNewsStoredEvidenceMirror';
import type { NaverNewsAppliedEvidenceMirror } from './naverNewsWorker';
import {
  createVercelBlobImmutableTextObjectStore,
  createVercelBlobTextReadStore,
  resolveVercelBlobPrivateStoreConfig,
  type VercelBlobSdkPort,
} from '../storage/vercelBlobImmutableTextObjectStore';

export const NAVER_NEWS_BLOB_MIRROR_MODE_ENV =
  'FANDEX_NAVER_EVIDENCE_BLOB_MIRROR_MODE' as const;
export const NAVER_NEWS_BLOB_MIRROR_MODE_SHADOW_WRITE =
  'shadow-write-v1' as const;

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
      blobs: result.blobs.map((blob) => ({ pathname: blob.pathname })),
      ...(result.cursor ? { cursor: result.cursor } : {}),
      hasMore: result.hasMore,
    };
  },
  async put(pathname, body, options) {
    const result = await put(pathname, body, options);
    return { pathname: result.pathname };
  },
});

export function createProductionNaverNewsBlobEvidenceStore(
  environment: Readonly<Record<string, string | undefined>>,
  client: VercelBlobSdkPort = blobSdk,
) {
  const config = resolveVercelBlobPrivateStoreConfig(environment);
  return createVercelBlobImmutableTextObjectStore(client, config);
}

export function createProductionNaverNewsBlobEvidenceReadStore(
  environment: Readonly<Record<string, string | undefined>>,
  client: Pick<VercelBlobSdkPort, 'get' | 'list'> = blobSdk,
) {
  const config = resolveVercelBlobPrivateStoreConfig(environment);
  return createVercelBlobTextReadStore(client, config);
}

export function createProductionNaverNewsBlobEvidenceMirror(
  environment: Readonly<Record<string, string | undefined>>,
  client: VercelBlobSdkPort = blobSdk,
): NaverNewsAppliedEvidenceMirror | null {
  const mode = environment[NAVER_NEWS_BLOB_MIRROR_MODE_ENV]?.trim();
  if (!mode) return null;
  if (mode !== NAVER_NEWS_BLOB_MIRROR_MODE_SHADOW_WRITE) {
    throw new Error('naver_news_blob_mirror_mode_invalid');
  }

  const store = createProductionNaverNewsBlobEvidenceStore(
    environment,
    client,
  );

  return Object.freeze({
    async stage(plan) {
      await stageNaverNewsStoredEvidenceMirror(plan, store);
    },
    async finalize(identity, resultSha256) {
      await finalizeNaverNewsStoredEvidenceMirror(
        identity,
        resultSha256,
        store,
      );
    },
  });
}
