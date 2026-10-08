import type {
  ImmutableTextObjectStore,
} from '../server/storage/immutableTextObjectStore';

export const SNS_FANDOM_V2_ROLLING_RECEIPT_MONITOR_VERSION =
  'sns-fandom-youtube-v2-rolling-receipt-monitor-v1' as const;

const ROOT = 'sns-fandom/youtube-audit/recurring/v2' as const;
const WINDOW_PATH = ROOT + '/canonical-window.json';
const RECEIPTS = ROOT + '/receipts/';
const HOUR_MS = 60 * 60 * 1_000;
const DURATION_HOURS = 366 * 24;

type ReadStore = Pick<ImmutableTextObjectStore, 'readText' | 'listPathnames'>;

export type SnsFandomV2RollingMonitorInput = Readonly<{
  authorizedRevisionSha: string;
  ownerEvidenceRef: string;
  firstSuccessfulSlotStart: string;
  // Obtained from independent, real Render/GitHub run inspection by the operator.
  // This gate does not attest the scheduler event's authenticity.
  throughObservedSlotStart: string;
}>;

export type SnsFandomV2RollingMonitorResult = Readonly<{
  version: typeof SNS_FANDOM_V2_ROLLING_RECEIPT_MONITOR_VERSION;
  state: 'continuous-to-operator-horizon' | 'trailing-evidence-unconfirmed'
    | 'confirmed-internal-gap' | 'blocked';
  evidenceSource: 'immutable-private-blob-readback';
  horizonSource: 'operator-supplied-requires-scheduler-corroboration';
  canonicalWindowPath: typeof WINDOW_PATH;
  firstSuccessfulSlotStart: string;
  throughObservedSlotStart: string;
  expectedSlots: number;
  verifiedReceipts: number;
  lastVerifiedSlotStart: string | null;
  missingSlotStarts: readonly string[];
  blockers: readonly string[];
  observedProviderCalls: number;
  observedQuotaUnits: number;
  trueZeroReceipts: number;
  blobWrites: 0;
  providerCallsPerformed: false;
  historicalBackfillPerformed: false;
  productionCollectionAuthorized: false;
  providerSubmissionAuthorized: false;
  productActivationAuthorized: false;
}>;

function validIso(value: unknown): value is string {
  return typeof value === 'string'
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}
function utcHour(value: unknown): value is string {
  return validIso(value) && Date.parse(value) % HOUR_MS === 0;
}
function object(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : null;
}
function nonnegativeInteger(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0;
}
function expectedReceiptPath(slot: string): string {
  return RECEIPTS + slot.replace(/[-:]/g, '').replace('.000Z', 'Z') + '.json';
}

export async function evaluateSnsFandomV2RollingReceiptMonitor(
  store: ReadStore,
  input: SnsFandomV2RollingMonitorInput,
): Promise<SnsFandomV2RollingMonitorResult> {
  const blockers: string[] = [];
  const missingSlotStarts: string[] = [];
  let verifiedReceipts = 0;
  let expectedSlots = 0;
  let observedProviderCalls = 0;
  let observedQuotaUnits = 0;
  let trueZeroReceipts = 0;
  let lastVerifiedSlotStart: string | null = null;
  let internalGap = false;

  function output(): SnsFandomV2RollingMonitorResult {
    const state = blockers.length > 0 ? 'blocked' as const
      : internalGap ? 'confirmed-internal-gap' as const
        : missingSlotStarts.length > 0 ? 'trailing-evidence-unconfirmed' as const
          : 'continuous-to-operator-horizon' as const;
    return Object.freeze({
      version: SNS_FANDOM_V2_ROLLING_RECEIPT_MONITOR_VERSION,
      state,
      evidenceSource: 'immutable-private-blob-readback' as const,
      horizonSource: 'operator-supplied-requires-scheduler-corroboration' as const,
      canonicalWindowPath: WINDOW_PATH,
      firstSuccessfulSlotStart: input.firstSuccessfulSlotStart,
      throughObservedSlotStart: input.throughObservedSlotStart,
      expectedSlots,
      verifiedReceipts,
      lastVerifiedSlotStart,
      missingSlotStarts: Object.freeze([...missingSlotStarts]),
      blockers: Object.freeze([...new Set(blockers)].sort()),
      observedProviderCalls,
      observedQuotaUnits,
      trueZeroReceipts,
      blobWrites: 0 as const,
      providerCallsPerformed: false as const,
      historicalBackfillPerformed: false as const,
      productionCollectionAuthorized: false as const,
      providerSubmissionAuthorized: false as const,
      productActivationAuthorized: false as const,
    });
  }

  if (!/^[0-9a-f]{40}$/.test(input.authorizedRevisionSha)) {
    blockers.push('sns-fandom-rolling-v2-invalid-approved-revision');
  }
  if (
    !/^github-issue:\/\/kpopmaker\/fandex\/issues\/509#issuecomment-[1-9][0-9]*$/
      .test(input.ownerEvidenceRef)
  ) {
    blockers.push('sns-fandom-rolling-v2-invalid-owner-evidence');
  }
  if (!utcHour(input.firstSuccessfulSlotStart)
    || !utcHour(input.throughObservedSlotStart)) {
    blockers.push('sns-fandom-rolling-v2-invalid-hour-inputs');
  }
  if (blockers.length > 0) return output();

  const startMs = Date.parse(input.firstSuccessfulSlotStart);
  const throughMs = Date.parse(input.throughObservedSlotStart);
  const endMs = startMs + DURATION_HOURS * HOUR_MS;
  if (throughMs < startMs || throughMs >= endMs) {
    blockers.push('sns-fandom-rolling-v2-horizon-outside-canonical');
    return output();
  }
  expectedSlots = Math.floor((throughMs - startMs) / HOUR_MS) + 1;

  const text = await store.readText(WINDOW_PATH);
  if (text === null) {
    blockers.push('sns-fandom-rolling-v2-canonical-missing');
    return output();
  }
  let canonical: Record<string, unknown> | null = null;
  try { canonical = object(JSON.parse(text)); } catch { /* invalid */ }
  if (!canonical) {
    blockers.push('sns-fandom-rolling-v2-canonical-json-invalid');
    return output();
  }
  if (
    canonical.version !== 'sns-fandom-youtube-recurring-canonical-window-v2'
    || canonical.state !== 'active'
    || canonical.priorGeneration !== 'v1'
    || canonical.measurementWindowStart !== input.firstSuccessfulSlotStart
    || canonical.firstSuccessfulSlotStart !== input.firstSuccessfulSlotStart
    || canonical.measurementWindowEnd !== new Date(endMs).toISOString()
    || canonical.durationDays !== 366
    || canonical.reactionSnapshotRunsPerDay !== 24
    || canonical.authorizedRevisionSha !== input.authorizedRevisionSha
    || canonical.cutoverApprovalEvidenceRef !== input.ownerEvidenceRef
    || canonical.historicalV1ReceiptsReinterpreted !== false
    || canonical.syntheticBackfillAllowed !== false
    || canonical.retrospectiveReceiptSynthesisAllowed !== false
    || canonical.retrospectiveProviderObservationAllowed !== false
  ) {
    blockers.push('sns-fandom-rolling-v2-canonical-contract-mismatch');
    return output();
  }

  const listed = await store.listPathnames(RECEIPTS);
  const paths = new Set(listed);
  if (listed.length !== paths.size) {
    blockers.push('sns-fandom-rolling-v2-receipt-index-duplicates');
  }
  const missingIndices: number[] = [];
  let latestPresentIndex = -1;

  for (let index = 0; index < expectedSlots; index += 1) {
    const slot = new Date(startMs + index * HOUR_MS).toISOString();
    if (!paths.has(expectedReceiptPath(slot))) {
      missingIndices.push(index);
      missingSlotStarts.push(slot);
      continue;
    }
    latestPresentIndex = index;
    const receiptText = await store.readText(expectedReceiptPath(slot));
    if (receiptText === null) {
      blockers.push('sns-fandom-rolling-v2-listed-receipt-unreadable');
      continue;
    }
    let receipt: Record<string, unknown> | null = null;
    try { receipt = object(JSON.parse(receiptText)); } catch { /* invalid */ }
    if (!receipt) {
      blockers.push('sns-fandom-rolling-v2-receipt-json-invalid');
      continue;
    }
    const calls = object(receipt.providerCallsObserved);
    const callsValid = calls
      && nonnegativeInteger(calls.channelsList)
      && nonnegativeInteger(calls.playlistItemsList)
      && nonnegativeInteger(calls.videosList)
      && nonnegativeInteger(calls.total)
      && calls.total > 0
      && calls.total === calls.channelsList + calls.playlistItemsList
        + calls.videosList;
    const observationValid = validIso(receipt.observationTime)
      && Date.parse(receipt.observationTime) >= Date.parse(slot)
      && Date.parse(receipt.observationTime) < Date.parse(slot) + HOUR_MS;
    if (
      receipt.version !== 'sns-fandom-youtube-recurring-receipt-v2'
      || receipt.state !== 'completed'
      || receipt.slotStart !== slot
      || receipt.sourceMainSha !== input.authorizedRevisionSha
      || receipt.measurementWindowStart !== input.firstSuccessfulSlotStart
      || receipt.measurementWindowEnd !== new Date(endMs).toISOString()
      || !observationValid
      || !validIso(receipt.collectedAt)
      || !callsValid
      || !nonnegativeInteger(receipt.quotaUnitsObserved)
      || receipt.quotaUnitsObserved !== calls?.total
      || !nonnegativeInteger(receipt.videoCountPerReactionRun)
      || receipt.trueZeroVideoCountObserved
        !== (receipt.videoCountPerReactionRun === 0)
      || receipt.rawVideoIdentifiersStored !== false
      || receipt.rawStatisticsStored !== false
      || receipt.secretMaterialStored !== false
      || receipt.providerSubmissionAuthorized !== false
      || receipt.productionCollectionAuthorized !== false
      || receipt.productActivationAuthorized !== false
    ) {
      blockers.push('sns-fandom-rolling-v2-receipt-contract-mismatch');
      continue;
    }
    verifiedReceipts++;
    lastVerifiedSlotStart = slot;
    observedProviderCalls += calls!.total as number;
    observedQuotaUnits += receipt.quotaUnitsObserved as number;
    if (receipt.trueZeroVideoCountObserved) trueZeroReceipts++;
  }

  internalGap = missingIndices.some((index) => index < latestPresentIndex);
  return output();
}
