/**
 * Static, provider-free work model for the currently approved v2 collector.
 *
 * Source contract (immutable approved revision):
 * scripts/operations/snsFandomYoutubeRecurringMeasurementRunnerV2.ts
 *   completed slot -> buildCoverage(store) -> list all receipts
 *   -> readText(path) for every stored receipt.
 *
 * This counts logical receipt-body read operations only. It does not
 * measure actual Vercel billing, throughput, latency, retries or provider quota.
 * It makes no claims about an approved runtime change.
 */
export const SNS_FANDOM_V2_RECEIPT_SCAN_WORK_MODEL_VERSION =
  'sns-fandom-v2-receipt-scan-work-model-v1' as const;

export const SNS_FANDOM_V2_CANONICAL_DAYS = 366 as const;
export const SNS_FANDOM_V2_NATURAL_SLOTS_PER_DAY = 24 as const;
export const SNS_FANDOM_V2_TOTAL_PLANNED_SLOTS =
  SNS_FANDOM_V2_CANONICAL_DAYS * SNS_FANDOM_V2_NATURAL_SLOTS_PER_DAY;

export type SnsFandomV2ReceiptScanWorkV1 = Readonly<{
  version: typeof SNS_FANDOM_V2_RECEIPT_SCAN_WORK_MODEL_VERSION;
  completedNaturalSlots: number;
  expectedReceiptBodiesReadOnFinalCompletedSlot: number;
  cumulativeReceiptBodiesReadThroughCompletedSlots: number;
  linearOneReadPerSuccessfulSlotReference: number;
  amplificationRelativeToOneReadPerSlot: number | null;
  calculationScope: 'completed-new-slot-buildCoverage-only';
  productionVercelOperationsMeasured: false;
  youtubeApiCallsCounted: false;
  providerQuotaUnitsCounted: false;
  blobWritesPerformed: false;
  providerCallsPerformed: false;
  authorizedRuntimeChanged: false;
}>;

/**
 * Exact arithmetic for *one clean successful* new slot each hour.
 * Other branches, missing-window recovery, retries and list pagination
 * are excluded. Actual amount billed and execution duration are unknown.
 */
export function modelSnsFandomV2ReceiptScanWorkV1(
  completedNaturalSlots: number,
): SnsFandomV2ReceiptScanWorkV1 {
  if (
    !Number.isSafeInteger(completedNaturalSlots)
    || completedNaturalSlots < 0
    || completedNaturalSlots > SNS_FANDOM_V2_TOTAL_PLANNED_SLOTS
  ) {
    throw new Error('sns_fandom_v2_receipt_scan_slot_count_outside_canonical');
  }

  const cumulativeReceiptBodiesReadThroughCompletedSlots =
    completedNaturalSlots * (completedNaturalSlots + 1) / 2;

  return Object.freeze({
    version: SNS_FANDOM_V2_RECEIPT_SCAN_WORK_MODEL_VERSION,
    completedNaturalSlots,
    expectedReceiptBodiesReadOnFinalCompletedSlot: completedNaturalSlots,
    cumulativeReceiptBodiesReadThroughCompletedSlots,
    linearOneReadPerSuccessfulSlotReference: completedNaturalSlots,
    amplificationRelativeToOneReadPerSlot:
      completedNaturalSlots === 0
        ? null
        : cumulativeReceiptBodiesReadThroughCompletedSlots
          / completedNaturalSlots,
    calculationScope: 'completed-new-slot-buildCoverage-only' as const,
    productionVercelOperationsMeasured: false as const,
    youtubeApiCallsCounted: false as const,
    providerQuotaUnitsCounted: false as const,
    blobWritesPerformed: false as const,
    providerCallsPerformed: false as const,
    authorizedRuntimeChanged: false as const,
  });
}
