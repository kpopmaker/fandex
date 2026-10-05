import { get, list, put } from '@vercel/blob';

import {
  createVercelBlobImmutableTextObjectStore,
  resolveVercelBlobPrivateStoreConfig,
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

export function createProductionVercelBlobImmutableTextObjectStore(
  environment: Readonly<Record<string, string | undefined>>,
  client: VercelBlobSdkPort = blobSdk,
) {
  const config = resolveVercelBlobPrivateStoreConfig(environment);
  return createVercelBlobImmutableTextObjectStore(client, config);
}
