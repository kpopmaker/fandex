export const BRAND_FIT_DURABLE_STORAGE_WRITE_AUTHORIZATION_VERSION =
  'brand-fit-durable-storage-write-authorization-v1' as const;

export const BRAND_FIT_DURABLE_STORAGE_WRITE_ISSUE = 367 as const;

export const BRAND_FIT_DURABLE_STORAGE_WRITE_APPROVAL_MARKER =
  'BRAND_FIT_DURABLE_STORAGE_WRITE_AUTHORIZED' as const;

export const BRAND_FIT_DURABLE_STORAGE_SOURCE_RUN_ID = 37318243229 as const;
export const BRAND_FIT_DURABLE_STORAGE_EVIDENCE_DIGEST =
  'd597ee9e419cb8c5cd71a2206cc2b33b11652caa20bea3ff1f0fed3b68f91f96' as const;
export const BRAND_FIT_DURABLE_STORAGE_PAYLOAD_DIGEST =
  'b67c9146257a8022cd3be1b70156c9a21e33ef156e459f77789959704ef46d0b' as const;
export const BRAND_FIT_DURABLE_STORAGE_PATHNAME =
  'fandex/brand-fit/stored-evidence/v1/iu/estee-lauder/'
  + BRAND_FIT_DURABLE_STORAGE_EVIDENCE_DIGEST
  + '.json' as const;

export type BrandFitDurableStorageWriteAuthorizationRecord = Readonly<{
  marker: typeof BRAND_FIT_DURABLE_STORAGE_WRITE_APPROVAL_MARKER;
  authorizationId: string;
  authorizedMainSha: string;
  sourceRunId: typeof BRAND_FIT_DURABLE_STORAGE_SOURCE_RUN_ID;
  maximumWrites: 1;
  evidenceDigest: typeof BRAND_FIT_DURABLE_STORAGE_EVIDENCE_DIGEST;
  payloadDigest: typeof BRAND_FIT_DURABLE_STORAGE_PAYLOAD_DIGEST;
  pathname: typeof BRAND_FIT_DURABLE_STORAGE_PATHNAME;
}>;

const SHA = /^[0-9a-f]{40}$/;
const AUTH_ID =
  /^brand-fit-storage-write-[0-9]{8}t[0-9]{6}z-v1$/;

export function parseBrandFitDurableStorageWriteAuthorizationComment(
  body: string,
): BrandFitDurableStorageWriteAuthorizationRecord | null {
  const lines = body.split(/\r?\n/).map((line) => line.trim());
  if (
    !lines.some(
      (line) => line === BRAND_FIT_DURABLE_STORAGE_WRITE_APPROVAL_MARKER,
    )
  ) {
    return null;
  }

  const values = new Map<string, string>();
  for (const line of lines) {
    const index = line.indexOf(':');
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (key && value) values.set(key, value);
  }

  const authorizationId = values.get('authorizationId') ?? '';
  const authorizedMainSha = values.get('authorizedMainSha') ?? '';

  if (!AUTH_ID.test(authorizationId)) return null;
  if (!SHA.test(authorizedMainSha)) return null;
  if (
    values.get('sourceRunId')
      !== String(BRAND_FIT_DURABLE_STORAGE_SOURCE_RUN_ID)
    || values.get('maximumWrites') !== '1'
    || values.get('evidenceDigest')
      !== BRAND_FIT_DURABLE_STORAGE_EVIDENCE_DIGEST
    || values.get('payloadDigest')
      !== BRAND_FIT_DURABLE_STORAGE_PAYLOAD_DIGEST
    || values.get('pathname')
      !== BRAND_FIT_DURABLE_STORAGE_PATHNAME
  ) {
    return null;
  }

  return Object.freeze({
    marker: BRAND_FIT_DURABLE_STORAGE_WRITE_APPROVAL_MARKER,
    authorizationId,
    authorizedMainSha,
    sourceRunId: BRAND_FIT_DURABLE_STORAGE_SOURCE_RUN_ID,
    maximumWrites: 1 as const,
    evidenceDigest: BRAND_FIT_DURABLE_STORAGE_EVIDENCE_DIGEST,
    payloadDigest: BRAND_FIT_DURABLE_STORAGE_PAYLOAD_DIGEST,
    pathname: BRAND_FIT_DURABLE_STORAGE_PATHNAME,
  });
}

export function isBrandFitDurableStorageWriteAuthorizationMatching(
  record: BrandFitDurableStorageWriteAuthorizationRecord,
  input: Readonly<{
    authorizationId: string;
    expectedMainSha: string;
  }>,
): boolean {
  return (
    record.authorizationId === input.authorizationId
    && record.authorizedMainSha === input.expectedMainSha
    && record.sourceRunId === BRAND_FIT_DURABLE_STORAGE_SOURCE_RUN_ID
    && record.maximumWrites === 1
  );
}
