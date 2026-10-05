import { readFile } from 'node:fs/promises';

import {
  BRAND_FIT_DURABLE_STORAGE_EVIDENCE_DIGEST,
  BRAND_FIT_DURABLE_STORAGE_PATHNAME,
  BRAND_FIT_DURABLE_STORAGE_PAYLOAD_DIGEST,
  BRAND_FIT_DURABLE_STORAGE_SOURCE_RUN_ID,
} from '../../lib/intelligence/brandFitDurableStorageWriteAuthorization';
import {
  validateBrandFitProductionObservationReceipt,
} from '../../lib/intelligence/brandFitProductionObservationReceipt';
import {
  writeBrandFitStoredEvidenceReceipt,
} from '../../lib/intelligence/brandFitStoredEvidenceWrite';
import {
  createProductionBrandFitStoredEvidenceWriteStore,
} from '../../lib/server/storage/brandFitStoredEvidenceBlobRuntime';

const RECEIPT_PATH =
  'brand-fit-receipt/brand-fit-observation-receipt.json';

function required(name: string): string {
  const value = process.env[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('required_environment_missing:' + name);
  }
  return value;
}

async function main(): Promise<void> {
  const sourceRunId = Number(required('BRAND_FIT_SOURCE_RUN_ID'));
  if (sourceRunId !== BRAND_FIT_DURABLE_STORAGE_SOURCE_RUN_ID) {
    throw new Error('brand_fit_storage_source_run_invalid');
  }

  const receiptBody = await readFile(RECEIPT_PATH, 'utf8');
  const receipt = validateBrandFitProductionObservationReceipt(receiptBody);
  if (receipt.status !== 'accepted-receipt') {
    throw new Error(
      'brand_fit_storage_receipt_invalid:' + receipt.reason,
    );
  }
  if (
    receipt.evidenceDigest !== BRAND_FIT_DURABLE_STORAGE_EVIDENCE_DIGEST
    || receipt.payloadDigest !== BRAND_FIT_DURABLE_STORAGE_PAYLOAD_DIGEST
    || receipt.pathname !== BRAND_FIT_DURABLE_STORAGE_PATHNAME
  ) {
    throw new Error('brand_fit_storage_receipt_binding_mismatch');
  }

  const store =
    createProductionBrandFitStoredEvidenceWriteStore(process.env);
  const result = await writeBrandFitStoredEvidenceReceipt({
    receiptBody,
    store,
  });

  process.stdout.write(JSON.stringify({
    ...result,
    sourceRunId,
  }) + '\n');
}

main().catch((error) => {
  process.stderr.write(
    (
      error instanceof Error
        ? error.message
        : 'brand_fit_durable_storage_write_failed'
    ) + '\n',
  );
  process.exitCode = 1;
});
