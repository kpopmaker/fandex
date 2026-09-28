import { get, list, put } from '@vercel/blob';

import {
  finalizeNaverNewsStoredEvidenceMirror,
  stageNaverNewsStoredEvidenceMirror,
} from './naverNewsStoredEvidenceMirror';
import type { NaverNewsAppliedEvidenceMirror } from './naverNewsWorker';
import {
  createVercelBlobImmutableTextObjectStore,
  resolveVercelBlobPrivateStoreConfig,
  type VercelBlobSdkPort,
} from '../storage/vercelBlobImmutableTextObjectStore';

export const NAVER_NEWS_BLOB_MIRROR_MODE_ENV =
  'FANDEX_NAVER_EVIDENCE_BLOB_MIRROR_MODE' as const;
export const NAVER_NEWS_BLOB_MIRROR_MODE_SHADOW_WRITE =
  'shadow-write-v1' as const;

const blobSdk: VercelBlobSdkPort = Object.freeze({
  get,
  list,
  put,
});

export function createProductionNaverNewsBlobEvidenceMirror(
  environment: Readonly<Record<string, string | undefined>>,
  client: VercelBlobSdkPort = blobSdk,
): NaverNewsAppliedEvidenceMirror | null {
  const mode = environment[NAVER_NEWS_BLOB_MIRROR_MODE_ENV]?.trim();
  if (!mode) return null;
  if (mode !== NAVER_NEWS_BLOB_MIRROR_MODE_SHADOW_WRITE) {
    throw new Error('naver_news_blob_mirror_mode_invalid');
  }

  const config = resolveVercelBlobPrivateStoreConfig(environment);
  const store = createVercelBlobImmutableTextObjectStore(client, config);

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
