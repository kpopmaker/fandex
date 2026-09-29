import 'server-only';
import { get, list } from '@vercel/blob';
import { createVercelBlobTextReadStore } from '../storage/vercelBlobImmutableTextObjectStore';
import type { BlobVerificationReader, BlobReadMetadata } from './naverNewsBlobReadVerification';

export function createProductionBlobVerificationReader(
  environment: Readonly<Record<string, string | undefined>>,
): BlobVerificationReader {
  const oidcToken = environment.VERCEL_OIDC_TOKEN?.trim();
  const storeId = environment.BLOB_STORE_ID?.trim();
  if (environment.VERCEL_ENV !== 'production' || !oidcToken || !storeId) throw new Error('runtime_unavailable');
  const abortSignal = AbortSignal.timeout(15_000);
  const metadata = new Map<string, BlobReadMetadata>();
  let pages = 0;
  let reads = 0;
  const adapter = createVercelBlobTextReadStore({
    async list(options) {
      if (++pages > 8) throw new Error('read_limit');
      const result = await list({ ...options, abortSignal });
      for (const blob of result.blobs) metadata.set(blob.pathname, {
        pathname: blob.pathname, uploadedAt: blob.uploadedAt.getTime(),
      });
      return result;
    },
    async get(path, options) {
      if (++reads > 3) throw new Error('read_limit');
      const result = await get(path, { ...options, abortSignal });
      if (!result?.stream) return null;
      const reader = result.stream.getReader();
      let bytes = 0;
      const stream = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            abortSignal.throwIfAborted();
            const chunk = await reader.read();
            if (chunk.done) { reader.releaseLock(); controller.close(); return; }
            bytes += chunk.value.byteLength;
            if (bytes > 2 * 1024 * 1024) throw new Error('read_limit');
            controller.enqueue(chunk.value);
          } catch {
            await reader.cancel().catch(() => undefined);
            controller.error(new Error('read_failed'));
          }
        },
        cancel() { return reader.cancel(); },
      });
      return { stream };
    },
  }, { token: null, oidcToken, storeId });
  return Object.freeze({
    async list(prefix: string) {
      const paths = await adapter.listPathnames(prefix);
      return paths.map((path) => metadata.get(path)!);
    },
    readText: adapter.readText,
  });
}
