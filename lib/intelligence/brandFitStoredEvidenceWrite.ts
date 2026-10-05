import {
  validateBrandFitProductionObservationReceipt,
} from './brandFitProductionObservationReceipt';
import {
  decodeBrandFitImmutableEvidenceEnvelope,
} from './brandFitImmutableEvidenceRecord';
import type {
  ImmutableTextObjectStore,
  ImmutableTextObjectPutResult,
} from '../server/storage/immutableTextObjectStore';

export const BRAND_FIT_STORED_EVIDENCE_WRITE_VERSION =
  'brand-fit-stored-evidence-write-v1' as const;

export type BrandFitStoredEvidenceWriteResult = Readonly<{
  status: 'stored';
  contractVersion: typeof BRAND_FIT_STORED_EVIDENCE_WRITE_VERSION;
  objectStatus: Exclude<
    ImmutableTextObjectPutResult['status'],
    'conflict'
  >;
  pathname: string;
  evidenceDigest: string;
  payloadDigest: string;
  databaseWritePerformed: false;
  durableObjectWritePerformed: true;
  productActivationPerformed: false;
  publicPublicationPerformed: false;
}>;

function parseReceiptObject(body: string): Readonly<{
  pathname: string;
  immutableBody: string;
}> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error('brand_fit_stored_evidence_write_receipt_invalid');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('brand_fit_stored_evidence_write_receipt_invalid');
  }

  const immutable = (parsed as Record<string, unknown>)
    .immutableEvidenceObject;
  if (!immutable || typeof immutable !== 'object' || Array.isArray(immutable)) {
    throw new Error('brand_fit_stored_evidence_write_receipt_invalid');
  }
  const row = immutable as Record<string, unknown>;
  if (
    typeof row.pathname !== 'string'
    || typeof row.body !== 'string'
  ) {
    throw new Error('brand_fit_stored_evidence_write_receipt_invalid');
  }

  return Object.freeze({
    pathname: row.pathname,
    immutableBody: row.body,
  });
}

export async function writeBrandFitStoredEvidenceReceipt(input: Readonly<{
  receiptBody: string;
  store: Pick<
    ImmutableTextObjectStore,
    'readText' | 'putTextIfAbsent'
  >;
}>): Promise<BrandFitStoredEvidenceWriteResult> {
  const receipt = validateBrandFitProductionObservationReceipt(
    input.receiptBody,
  );
  if (receipt.status !== 'accepted-receipt') {
    throw new Error(
      'brand_fit_stored_evidence_write_receipt_invalid:'
        + receipt.reason,
    );
  }

  const candidate = parseReceiptObject(input.receiptBody);
  if (candidate.pathname !== receipt.pathname) {
    throw new Error('brand_fit_stored_evidence_write_path_mismatch');
  }

  const decoded = decodeBrandFitImmutableEvidenceEnvelope(
    candidate.immutableBody,
  );
  if (
    decoded.evidenceDigest !== receipt.evidenceDigest
    || decoded.payloadDigest !== receipt.payloadDigest
  ) {
    throw new Error('brand_fit_stored_evidence_write_digest_mismatch');
  }

  const written = await input.store.putTextIfAbsent(
    candidate.pathname,
    candidate.immutableBody,
  );
  if (written.status === 'conflict') {
    throw new Error('brand_fit_stored_evidence_write_conflict');
  }

  const readBack = await input.store.readText(candidate.pathname);
  if (readBack !== candidate.immutableBody) {
    throw new Error('brand_fit_stored_evidence_write_readback_mismatch');
  }

  const verified = decodeBrandFitImmutableEvidenceEnvelope(readBack);
  if (
    verified.evidenceDigest !== receipt.evidenceDigest
    || verified.payloadDigest !== receipt.payloadDigest
  ) {
    throw new Error('brand_fit_stored_evidence_write_readback_invalid');
  }

  return Object.freeze({
    status: 'stored' as const,
    contractVersion: BRAND_FIT_STORED_EVIDENCE_WRITE_VERSION,
    objectStatus: written.status,
    pathname: receipt.pathname,
    evidenceDigest: receipt.evidenceDigest,
    payloadDigest: receipt.payloadDigest,
    databaseWritePerformed: false as const,
    durableObjectWritePerformed: true as const,
    productActivationPerformed: false as const,
    publicPublicationPerformed: false as const,
  });
}
