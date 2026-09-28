import type {
  ImmutableTextObjectPutResult,
  ImmutableTextObjectStore,
} from './immutableTextObjectStore';

export const NAVER_EVIDENCE_VERCEL_BLOB_ADAPTER_VERSION =
  'naver-evidence-vercel-blob-adapter-v1' as const;

const JSON_CONTENT_TYPE = 'application/json; charset=utf-8' as const;
const LIST_LIMIT = 1000 as const;

export type VercelBlobPrivateStoreConfig = Readonly<{
  token: string | null;
  oidcToken: string | null;
  storeId: string | null;
}>;

export type VercelBlobSdkGetResult =
  | null
  | Readonly<{ stream: ReadableStream<Uint8Array> }>;

export type VercelBlobSdkListResult = Readonly<{
  blobs: readonly Readonly<{ pathname: string }>[];
  cursor?: string;
  hasMore: boolean;
}>;

export type VercelBlobSdkPort = Readonly<{
  get(
    urlOrPathname: string,
    options: Readonly<{
      access: 'private';
      token?: string;
      oidcToken?: string;
      storeId?: string;
      useCache: false;
    }>,
  ): Promise<VercelBlobSdkGetResult>;
  list(
    options: Readonly<{
      token?: string;
      oidcToken?: string;
      storeId?: string;
      limit: typeof LIST_LIMIT;
      prefix: string;
      cursor?: string;
      mode: 'expanded';
    }>,
  ): Promise<VercelBlobSdkListResult>;
  put(
    pathname: string,
    body: string,
    options: Readonly<{
      access: 'private';
      token?: string;
      oidcToken?: string;
      storeId?: string;
      addRandomSuffix: false;
      allowOverwrite: false;
      contentType: typeof JSON_CONTENT_TYPE;
    }>,
  ): Promise<Readonly<{ pathname: string }>>;
}>;

function cleanOptional(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function resolveVercelBlobPrivateStoreConfig(
  environment: Readonly<Record<string, string | undefined>>,
): VercelBlobPrivateStoreConfig {
  const token = cleanOptional(environment.BLOB_READ_WRITE_TOKEN);
  const oidcToken = cleanOptional(environment.VERCEL_OIDC_TOKEN);
  const storeId = cleanOptional(
    environment.FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID,
  );

  if (token) {
    return Object.freeze({ token, oidcToken: null, storeId });
  }
  if (oidcToken && storeId) {
    return Object.freeze({ token: null, oidcToken, storeId });
  }

  throw new Error('naver_evidence_blob_credentials_missing');
}

function validatePathname(pathname: string, errorCode: string): string {
  if (
    typeof pathname !== 'string'
    || pathname.length < 1
    || pathname.length > 1024
    || pathname !== pathname.trim()
    || pathname.startsWith('/')
    || pathname.endsWith('/')
    || pathname.includes('\\')
    || pathname.includes('//')
    || pathname.split('/').some((segment) =>
      segment.length === 0 || segment === '.' || segment === '..')
  ) {
    throw new Error(errorCode);
  }
  return pathname;
}

function validatePrefix(prefix: string): string {
  if (
    typeof prefix !== 'string'
    || prefix.length < 1
    || prefix.length > 1024
    || prefix !== prefix.trim()
    || prefix.startsWith('/')
    || prefix.includes('\\')
    || prefix.includes('//')
    || prefix.split('/').some((segment) =>
      segment.length === 0 || segment === '.' || segment === '..')
  ) {
    throw new Error('naver_evidence_blob_prefix_invalid');
  }
  return prefix;
}

function authOptions(config: VercelBlobPrivateStoreConfig): Readonly<{
  token?: string;
  oidcToken?: string;
  storeId?: string;
}> {
  if (config.token) {
    return Object.freeze({
      token: config.token,
      ...(config.storeId ? { storeId: config.storeId } : {}),
    });
  }
  if (config.oidcToken && config.storeId) {
    return Object.freeze({
      oidcToken: config.oidcToken,
      storeId: config.storeId,
    });
  }
  throw new Error('naver_evidence_blob_credentials_missing');
}

async function streamToText(
  stream: ReadableStream<Uint8Array>,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let text = '';
  try {
    while (true) {
      const result = await reader.read();
      if (result.done) break;
      text += decoder.decode(result.value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

export function createVercelBlobImmutableTextObjectStore(
  client: VercelBlobSdkPort,
  config: VercelBlobPrivateStoreConfig,
): ImmutableTextObjectStore {
  const auth = authOptions(config);

  async function readText(pathname: string): Promise<string | null> {
    const validPathname = validatePathname(
      pathname,
      'naver_evidence_blob_pathname_invalid',
    );
    try {
      const result = await client.get(validPathname, {
        access: 'private',
        ...auth,
        useCache: false,
      });
      return result === null ? null : await streamToText(result.stream);
    } catch (error) {
      if (
        error instanceof Error
        && error.message === 'naver_evidence_blob_pathname_invalid'
      ) {
        throw error;
      }
      throw new Error('naver_evidence_blob_read_failed');
    }
  }

  async function listPathnames(prefix: string): Promise<readonly string[]> {
    const validPrefix = validatePrefix(prefix);
    const pathnames: string[] = [];
    let cursor: string | undefined;

    try {
      do {
        const result = await client.list({
          ...auth,
          limit: LIST_LIMIT,
          prefix: validPrefix,
          ...(cursor ? { cursor } : {}),
          mode: 'expanded',
        });

        for (const blob of result.blobs) {
          const pathname = validatePathname(
            blob.pathname,
            'naver_evidence_blob_list_payload_invalid',
          );
          if (!pathname.startsWith(validPrefix)) {
            throw new Error('naver_evidence_blob_list_payload_invalid');
          }
          pathnames.push(pathname);
        }

        if (!result.hasMore) {
          cursor = undefined;
          break;
        }
        if (
          typeof result.cursor !== 'string'
          || result.cursor.length === 0
          || result.cursor === cursor
        ) {
          throw new Error('naver_evidence_blob_list_payload_invalid');
        }
        cursor = result.cursor;
      } while (cursor);

      return Object.freeze([...new Set(pathnames)].sort());
    } catch (error) {
      if (
        error instanceof Error
        && (
          error.message === 'naver_evidence_blob_prefix_invalid'
          || error.message === 'naver_evidence_blob_list_payload_invalid'
        )
      ) {
        throw error;
      }
      throw new Error('naver_evidence_blob_list_failed');
    }
  }

  async function putTextIfAbsent(
    pathname: string,
    body: string,
  ): Promise<ImmutableTextObjectPutResult> {
    const validPathname = validatePathname(
      pathname,
      'naver_evidence_blob_pathname_invalid',
    );
    if (typeof body !== 'string') {
      throw new Error('naver_evidence_blob_body_invalid');
    }

    const existing = await readText(validPathname);
    if (existing !== null) {
      return Object.freeze({
        status: existing === body ? 'idempotent-existing' : 'conflict',
        pathname: validPathname,
      });
    }

    try {
      const created = await client.put(validPathname, body, {
        access: 'private',
        ...auth,
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType: JSON_CONTENT_TYPE,
      });
      if (created.pathname !== validPathname) {
        throw new Error('naver_evidence_blob_put_payload_invalid');
      }
      return Object.freeze({
        status: 'created',
        pathname: validPathname,
      });
    } catch {
      // allowOverwrite:false makes a concurrent writer fail. Re-read to
      // classify an exact idempotent race separately from a real conflict.
      const raced = await readText(validPathname);
      if (raced !== null) {
        return Object.freeze({
          status: raced === body ? 'idempotent-existing' : 'conflict',
          pathname: validPathname,
        });
      }
      throw new Error('naver_evidence_blob_put_failed');
    }
  }

  return Object.freeze({
    readText,
    listPathnames,
    putTextIfAbsent,
  });
}
