import type {
  ImmutableTextObjectStore,
} from '../server/storage/immutableTextObjectStore';

export const SNS_FANDOM_V2_FIRST_DAY_CONTINUITY_VERSION =
  'sns-fandom-youtube-v2-first-day-continuity-v1' as const;

const ROOT = 'sns-fandom/youtube-audit/recurring/v2' as const;
const WINDOW_PATH = ROOT + '/canonical-window.json';
const RECEIPT_PREFIX = ROOT + '/receipts/';
const HOUR_MS = 60 * 60 * 1_000;
const WINDOW_MS = 366 * 24 * HOUR_MS;
const FIRST_DAY_SLOT_COUNT = 24;

type ReadStore = Pick<ImmutableTextObjectStore, 'readText' | 'listPathnames'>;

export type SnsFandomV2FirstDayContinuityInput = Readonly<{
  expectedAuthorizedRevisionSha: string;
  expectedApprovalEvidenceRef: string;
  expectedFirstSlotStart: string;
}>;

export type SnsFandomV2FirstDayContinuityResult = Readonly<{
  version: typeof SNS_FANDOM_V2_FIRST_DAY_CONTINUITY_VERSION;
  state: 'first-day-complete' | 'awaiting-natural-slots' | 'blocked';
  evidenceSource: 'private-vercel-blob-readback';
  canonicalWindowPath: typeof WINDOW_PATH;
  expectedFirstSlotStart: string;
  requiredSlotCount: 24;
  completedSlotCount: number;
  lastVerifiedSlotStart: string | null;
  missingSlotStarts: readonly string[];
  totalProviderCallsObserved: number;
  totalQuotaUnitsObserved: number;
  trueZeroReceiptCount: number;
  blockers: readonly string[];
  blobWrites: 0;
  providerCallsPerformed: false;
  providerSubmissionAuthorized: false;
  productionCollectionAuthorized: false;
  productActivationAuthorized: false;
}>;

function exactIso(value: unknown): value is string {
  return typeof value === 'string'
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value;
}

function utcHour(value: unknown): value is string {
  return exactIso(value)
    && Date.parse(value) % HOUR_MS === 0;
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function count(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function slotPath(slotStart: string): string {
  return RECEIPT_PREFIX
    + slotStart.replace(/[-:]/g, '').replace('.000Z', 'Z')
    + '.json';
}

export async function verifySnsFandomV2FirstDayContinuityFromStore(
  store: ReadStore,
  input: SnsFandomV2FirstDayContinuityInput,
): Promise<SnsFandomV2FirstDayContinuityResult> {
  const blockers: string[] = [];
  const missingSlotStarts: string[] = [];
  let completedSlotCount = 0;
  let lastVerifiedSlotStart: string | null = null;
  let totalProviderCallsObserved = 0;
  let totalQuotaUnitsObserved = 0;
  let trueZeroReceiptCount = 0;

  function output(): SnsFandomV2FirstDayContinuityResult {
    const sortedBlockers = Object.freeze([...new Set(blockers)].sort());
    return Object.freeze({
      version: SNS_FANDOM_V2_FIRST_DAY_CONTINUITY_VERSION,
      state: sortedBlockers.length > 0
        ? 'blocked' as const
        : completedSlotCount === FIRST_DAY_SLOT_COUNT
          ? 'first-day-complete' as const
          : 'awaiting-natural-slots' as const,
      evidenceSource: 'private-vercel-blob-readback' as const,
      canonicalWindowPath: WINDOW_PATH,
      expectedFirstSlotStart: input.expectedFirstSlotStart,
      requiredSlotCount: 24 as const,
      completedSlotCount,
      lastVerifiedSlotStart,
      missingSlotStarts: Object.freeze([...missingSlotStarts]),
      totalProviderCallsObserved,
      totalQuotaUnitsObserved,
      trueZeroReceiptCount,
      blockers: sortedBlockers,
      blobWrites: 0 as const,
      providerCallsPerformed: false as const,
      providerSubmissionAuthorized: false as const,
      productionCollectionAuthorized: false as const,
      productActivationAuthorized: false as const,
    });
  }

  if (!/^[0-9a-f]{40}$/.test(input.expectedAuthorizedRevisionSha)) {
    blockers.push('sns-fandom-v2-first-day-revision-invalid');
  }
  if (
    !/^github-issue:\/\/kpopmaker\/fandex\/issues\/509#issuecomment-[1-9][0-9]*$/.test(
      input.expectedApprovalEvidenceRef,
    )
  ) {
    blockers.push('sns-fandom-v2-first-day-approval-ref-invalid');
  }
  if (!utcHour(input.expectedFirstSlotStart)) {
    blockers.push('sns-fandom-v2-first-day-start-invalid');
  }
  if (blockers.length > 0) return output();

  const windowText = await store.readText(WINDOW_PATH);
  if (windowText === null) {
    blockers.push('sns-fandom-v2-first-day-canonical-missing');
    return output();
  }

  let window: Record<string, unknown> | null = null;
  try {
    window = record(JSON.parse(windowText));
  } catch {
    // Invalid JSON is not missing data and must block qualification.
  }
  if (window === null) {
    blockers.push('sns-fandom-v2-first-day-canonical-invalid');
    return output();
  }

  const firstStart = input.expectedFirstSlotStart;
  const expectedWindowEnd = new Date(Date.parse(firstStart) + WINDOW_MS).toISOString();

  if (
    window.version !== 'sns-fandom-youtube-recurring-canonical-window-v2'
    || window.state !== 'active'
    || window.priorGeneration !== 'v1'
    || window.measurementWindowStart !== firstStart
    || window.firstSuccessfulSlotStart !== firstStart
    || window.measurementWindowEnd !== expectedWindowEnd
    || window.durationDays !== 366
    || window.reactionSnapshotRunsPerDay !== 24
    || window.authorizedRevisionSha !== input.expectedAuthorizedRevisionSha
    || window.cutoverApprovalEvidenceRef !== input.expectedApprovalEvidenceRef
    || window.historicalV1ReceiptsReinterpreted !== false
    || window.syntheticBackfillAllowed !== false
    || window.retrospectiveReceiptSynthesisAllowed !== false
    || window.retrospectiveProviderObservationAllowed !== false
  ) {
    blockers.push('sns-fandom-v2-first-day-canonical-contract-mismatch');
    return output();
  }

  const listedPaths = await store.listPathnames(RECEIPT_PREFIX);
  const pathSet = new Set(listedPaths);
  if (pathSet.size !== listedPaths.length) {
    blockers.push('sns-fandom-v2-first-day-receipt-index-duplicate');
  }

  let missingEarlierSlot = false;
  for (let slotIndex = 0; slotIndex < FIRST_DAY_SLOT_COUNT; slotIndex += 1) {
    const slotStart = new Date(
      Date.parse(firstStart) + slotIndex * HOUR_MS,
    ).toISOString();
    const pathname = slotPath(slotStart);

    if (!pathSet.has(pathname)) {
      missingSlotStarts.push(slotStart);
      missingEarlierSlot = true;
      continue;
    }

    if (missingEarlierSlot) {
      blockers.push('sns-fandom-v2-first-day-noncontiguous-gap');
    }

    const body = await store.readText(pathname);
    if (body === null) {
      blockers.push('sns-fandom-v2-first-day-listed-receipt-unreadable');
      continue;
    }

    let receipt: Record<string, unknown> | null = null;
    try {
      receipt = record(JSON.parse(body));
    } catch {
      // A malformed receipt is a blocker, never an inferred zero.
    }
    if (receipt === null) {
      blockers.push('sns-fandom-v2-first-day-receipt-json-invalid');
      continue;
    }

    const calls = record(receipt.providerCallsObserved);
    const withinObservationHour = exactIso(receipt.observationTime)
      && Date.parse(receipt.observationTime) >= Date.parse(slotStart)
      && Date.parse(receipt.observationTime) < Date.parse(slotStart) + HOUR_MS;
    const callsValid = calls !== null
      && count(calls.channelsList)
      && count(calls.playlistItemsList)
      && count(calls.videosList)
      && count(calls.total)
      && calls.total > 0
      && calls.total === calls.channelsList + calls.playlistItemsList
        + calls.videosList;

    if (
      receipt.version !== 'sns-fandom-youtube-recurring-receipt-v2'
      || receipt.state !== 'completed'
      || receipt.slotStart !== slotStart
      || receipt.sourceMainSha !== input.expectedAuthorizedRevisionSha
      || receipt.measurementWindowStart !== firstStart
      || receipt.measurementWindowEnd !== expectedWindowEnd
      || !withinObservationHour
      || !exactIso(receipt.collectedAt)
      || !callsValid
      || !count(receipt.quotaUnitsObserved)
      || receipt.quotaUnitsObserved !== calls?.total
      || !count(receipt.videoCountPerReactionRun)
      || typeof receipt.trueZeroVideoCountObserved !== 'boolean'
      || receipt.trueZeroVideoCountObserved
        !== (receipt.videoCountPerReactionRun === 0)
      || receipt.rawVideoIdentifiersStored !== false
      || receipt.rawStatisticsStored !== false
      || receipt.secretMaterialStored !== false
      || receipt.providerSubmissionAuthorized !== false
      || receipt.productionCollectionAuthorized !== false
      || receipt.productActivationAuthorized !== false
    ) {
      blockers.push('sns-fandom-v2-first-day-receipt-contract-mismatch');
      continue;
    }

    completedSlotCount += 1;
    lastVerifiedSlotStart = slotStart;
    totalProviderCallsObserved += calls!.total as number;
    totalQuotaUnitsObserved += receipt.quotaUnitsObserved as number;
    if (receipt.trueZeroVideoCountObserved) trueZeroReceiptCount += 1;
  }

  return output();
}
