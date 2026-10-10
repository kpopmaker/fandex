import { createHash } from 'node:crypto';

export const SNS_FANDOM_V2_INCREMENTAL_COVERAGE_CANDIDATE_VERSION =
  'sns-fandom-v2-incremental-coverage-candidate-v1' as const;

const ROOT = 'sns-fandom/youtube-audit/recurring/v2' as const;
const CANONICAL_PATH =
  'sns-fandom/youtube-audit/recurring/v2/canonical-window.json' as const;
const RECEIPT_PREFIX = ROOT + '/receipts/';
const CHECKPOINT_PREFIX = ROOT + '/coverage-candidate/v1/checkpoints/';
const HOUR_MS = 60 * 60 * 1_000;
const TOTAL_SLOTS = 366 * 24;
// This candidate binds ONLY the already-approved existing v2 evidence lineage.
const EXACT_SOURCE_SHA = '27a007c2afb4776cf2ae89c2e8bd4ba5f9a8f688';
const EXACT_OWNER_EVIDENCE =
  'github-issue://kpopmaker/fandex/issues/509#issuecomment-6049459425';

type RecordValue = Record<string, unknown>;

export type SnsFandomV2IncrementalCoverageCheckpointV1 = Readonly<{
  version: typeof SNS_FANDOM_V2_INCREMENTAL_COVERAGE_CANDIDATE_VERSION;
  canonicalWindowPath: typeof CANONICAL_PATH;
  windowStart: string;
  windowEnd: string;
  authorizedRevisionSha: string;
  ownerEvidenceRef: string;
  completedSlotCount: number;
  lastSlotStart: string;
  lastReceiptPath: string;
  lastReceiptSha256: string;
  previousChainSha256: string | null;
  chainSha256: string;
  totalProviderCallsObserved: number;
  totalQuotaUnitsObserved: number;
  trueZeroReceiptCount: number;
  providerSubmissionAuthorized: false;
  productionCollectionAuthorized: false;
  productActivationAuthorized: false;
}>;

export type SnsFandomV2IncrementalCoverageCandidateInputV1 = Readonly<{
  canonicalText: string;
  receiptText: string;
  previousCheckpointText: string | null;
  // The candidate must use the exact v2-approved revision, not the current main.
  expectedAuthorizedRevisionSha: string;
  expectedOwnerEvidenceRef: string;
  // Optional exact-body readback of immutable checkpoint path for conflict
  // classification. The evaluator NEVER writes this candidate checkpoint.
  existingNextCheckpointText?: string | null;
}>;

export type SnsFandomV2IncrementalCoverageCandidateResultV1 = Readonly<{
  version: typeof SNS_FANDOM_V2_INCREMENTAL_COVERAGE_CANDIDATE_VERSION;
  state: 'candidate-ready' | 'idempotent-existing' | 'blocked';
  checkpointPath: string | null;
  checkpointBody: string | null;
  blockers: readonly string[];
  receiptBodiesRequiredForNextStep: 1;
  previousCheckpointBodiesRequiredForNextStep: 1;
  canonicalBodiesRequiredForNextStep: 1;
  historicalReceiptBodiesRevalidated: false;
  blobWrites: 0;
  providerCallsPerformed: false;
  historicalBackfillPerformed: false;
  schedulerMutationPerformed: false;
  providerSubmissionAuthorized: false;
  productionCollectionAuthorized: false;
  productActivationAuthorized: false;
}>;

function object(value: unknown): RecordValue | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as RecordValue : null;
}
function parseObject(text: string | null): RecordValue | null {
  if (text === null) return null;
  try { return object(JSON.parse(text)); } catch { return null; }
}
function iso(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
    && new Date(value).toISOString() === value;
}
function utcHour(value: unknown): value is string {
  return iso(value) && Date.parse(value) % HOUR_MS === 0;
}
function count(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0;
}
function sha(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}
function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}
function receiptPath(slot: string): string {
  return RECEIPT_PREFIX
    + slot.replace(/[-:]/g, '').replace('.000Z', 'Z') + '.json';
}
function checkpointPath(slot: string): string {
  return CHECKPOINT_PREFIX
    + slot.replace(/[-:]/g, '').replace('.000Z', 'Z') + '.json';
}
function digestCheckpoint(
  checkpoint: Omit<SnsFandomV2IncrementalCoverageCheckpointV1, 'chainSha256'>,
): string {
  // Explicit, fixed key order: deterministic chain binding for the version.
  return sha256(JSON.stringify(checkpoint));
}
function safeAdd(a: number, b: number): number | null {
  const result = a + b;
  return Number.isSafeInteger(result) ? result : null;
}

export function evaluateSnsFandomV2IncrementalCoverageCandidateV1(
  input: SnsFandomV2IncrementalCoverageCandidateInputV1,
): SnsFandomV2IncrementalCoverageCandidateResultV1 {
  const blockers: string[] = [];
  let checkpointPathResult: string | null = null;
  let checkpointBody: string | null = null;
  let state: SnsFandomV2IncrementalCoverageCandidateResultV1['state'] =
    'blocked';

  function result(): SnsFandomV2IncrementalCoverageCandidateResultV1 {
    return Object.freeze({
      version: SNS_FANDOM_V2_INCREMENTAL_COVERAGE_CANDIDATE_VERSION,
      state: blockers.length ? 'blocked' as const : state,
      checkpointPath: blockers.length ? null : checkpointPathResult,
      checkpointBody: blockers.length ? null : checkpointBody,
      blockers: Object.freeze([...new Set(blockers)]),
      receiptBodiesRequiredForNextStep: 1 as const,
      previousCheckpointBodiesRequiredForNextStep: 1 as const,
      canonicalBodiesRequiredForNextStep: 1 as const,
      historicalReceiptBodiesRevalidated: false as const,
      blobWrites: 0 as const,
      providerCallsPerformed: false as const,
      historicalBackfillPerformed: false as const,
      schedulerMutationPerformed: false as const,
      providerSubmissionAuthorized: false as const,
      productionCollectionAuthorized: false as const,
      productActivationAuthorized: false as const,
    });
  }

  if (input.expectedAuthorizedRevisionSha !== EXACT_SOURCE_SHA) {
    blockers.push('incremental-v2-invalid-authorized-revision');
  }
  if (input.expectedOwnerEvidenceRef !== EXACT_OWNER_EVIDENCE) {
    blockers.push('incremental-v2-invalid-owner-evidence');
  }
  const canonical = parseObject(input.canonicalText);
  if (!canonical) {
    blockers.push('incremental-v2-invalid-canonical-json');
    return result();
  }
  const firstSlot = canonical.firstSuccessfulSlotStart;
  const end = canonical.measurementWindowEnd;
  const canonicalValid =
    canonical.version === 'sns-fandom-youtube-recurring-canonical-window-v2'
    && canonical.state === 'active'
    && canonical.priorGeneration === 'v1'
    && utcHour(firstSlot)
    && canonical.measurementWindowStart === firstSlot
    && iso(end)
    && Date.parse(end) === Date.parse(firstSlot) + TOTAL_SLOTS * HOUR_MS
    && canonical.durationDays === 366
    && canonical.reactionSnapshotRunsPerDay === 24
    && canonical.authorizedRevisionSha === input.expectedAuthorizedRevisionSha
    && canonical.cutoverApprovalEvidenceRef === input.expectedOwnerEvidenceRef
    && canonical.historicalV1ReceiptsReinterpreted === false
    && canonical.syntheticBackfillAllowed === false
    && canonical.retrospectiveReceiptSynthesisAllowed === false
    && canonical.retrospectiveProviderObservationAllowed === false;
  if (!canonicalValid) blockers.push('incremental-v2-canonical-contract-mismatch');
  if (blockers.length || !utcHour(firstSlot) || !iso(end)) return result();

  let previous: SnsFandomV2IncrementalCoverageCheckpointV1 | null = null;
  if (input.previousCheckpointText !== null) {
    const p = parseObject(input.previousCheckpointText);
    const valid = p
      && p.version === SNS_FANDOM_V2_INCREMENTAL_COVERAGE_CANDIDATE_VERSION
      && p.canonicalWindowPath === CANONICAL_PATH
      && p.windowStart === firstSlot && p.windowEnd === end
      && p.authorizedRevisionSha === input.expectedAuthorizedRevisionSha
      && p.ownerEvidenceRef === input.expectedOwnerEvidenceRef
      && count(p.completedSlotCount) && p.completedSlotCount >= 1
      && p.completedSlotCount < TOTAL_SLOTS
      && utcHour(p.lastSlotStart)
      && p.lastSlotStart === new Date(
        Date.parse(firstSlot) + (p.completedSlotCount - 1) * HOUR_MS
      ).toISOString()
      && p.lastReceiptPath === receiptPath(p.lastSlotStart)
      && sha(p.lastReceiptSha256)
      && (p.completedSlotCount === 1
        ? p.previousChainSha256 === null
        : sha(p.previousChainSha256))
      && sha(p.chainSha256)
      && count(p.totalProviderCallsObserved)
      && count(p.totalQuotaUnitsObserved)
      && p.totalProviderCallsObserved === p.totalQuotaUnitsObserved
      && count(p.trueZeroReceiptCount)
      && p.trueZeroReceiptCount <= p.completedSlotCount
      && p.providerSubmissionAuthorized === false
      && p.productionCollectionAuthorized === false
      && p.productActivationAuthorized === false;
    if (!valid) {
      blockers.push('incremental-v2-previous-checkpoint-invalid');
      return result();
    }
    const { chainSha256, ...data } = p!;
    if (digestCheckpoint(
      data as Omit<SnsFandomV2IncrementalCoverageCheckpointV1, 'chainSha256'>,
    ) !== chainSha256) {
      blockers.push('incremental-v2-previous-checkpoint-digest-mismatch');
      return result();
    }
    previous = p as unknown as SnsFandomV2IncrementalCoverageCheckpointV1;
  }

  const nextCount = (previous?.completedSlotCount ?? 0) + 1;
  const nextSlot = new Date(Date.parse(firstSlot)
    + (nextCount - 1) * HOUR_MS).toISOString();
  const receipt = parseObject(input.receiptText);
  if (!receipt) {
    blockers.push('incremental-v2-receipt-json-invalid');
    return result();
  }
  const calls = object(receipt.providerCallsObserved);
  const callsValid = calls
    && count(calls.channelsList)
    && count(calls.playlistItemsList)
    && count(calls.videosList)
    && count(calls.total)
    && calls.total > 0
    && calls.total === calls.channelsList + calls.playlistItemsList
      + calls.videosList;
  const observationValid = iso(receipt.observationTime)
    && Date.parse(receipt.observationTime) >= Date.parse(nextSlot)
    && Date.parse(receipt.observationTime) < Date.parse(nextSlot) + HOUR_MS;
  const receiptValid =
    receipt.version === 'sns-fandom-youtube-recurring-receipt-v2'
    && receipt.state === 'completed'
    && receipt.slotStart === nextSlot
    && receipt.sourceMainSha === input.expectedAuthorizedRevisionSha
    && receipt.measurementWindowStart === firstSlot
    && receipt.measurementWindowEnd === end
    && observationValid
    && iso(receipt.collectedAt)
    && callsValid
    && count(receipt.quotaUnitsObserved)
    && receipt.quotaUnitsObserved === calls?.total
    && count(receipt.videoCountPerReactionRun)
    && typeof receipt.trueZeroVideoCountObserved === 'boolean'
    && receipt.trueZeroVideoCountObserved
      === (receipt.videoCountPerReactionRun === 0)
    && receipt.rawVideoIdentifiersStored === false
    && receipt.rawStatisticsStored === false
    && receipt.secretMaterialStored === false
    && receipt.providerSubmissionAuthorized === false
    && receipt.productionCollectionAuthorized === false
    && receipt.productActivationAuthorized === false;
  if (!receiptValid) {
    blockers.push('incremental-v2-receipt-invalid-or-noncontiguous');
    return result();
  }

  const providerTotal = safeAdd(
    previous?.totalProviderCallsObserved ?? 0, calls!.total as number
  );
  const quotaTotal = safeAdd(
    previous?.totalQuotaUnitsObserved ?? 0,
    receipt.quotaUnitsObserved as number
  );
  const zeros = safeAdd(
    previous?.trueZeroReceiptCount ?? 0,
    receipt.trueZeroVideoCountObserved ? 1 : 0
  );
  if (providerTotal === null || quotaTotal === null || zeros === null) {
    blockers.push('incremental-v2-cumulative-counter-overflow');
    return result();
  }

  const draft: Omit<SnsFandomV2IncrementalCoverageCheckpointV1, 'chainSha256'> = {
    version: SNS_FANDOM_V2_INCREMENTAL_COVERAGE_CANDIDATE_VERSION,
    canonicalWindowPath: CANONICAL_PATH,
    windowStart: firstSlot,
    windowEnd: end,
    authorizedRevisionSha: input.expectedAuthorizedRevisionSha,
    ownerEvidenceRef: input.expectedOwnerEvidenceRef,
    completedSlotCount: nextCount,
    lastSlotStart: nextSlot,
    lastReceiptPath: receiptPath(nextSlot),
    lastReceiptSha256: sha256(input.receiptText),
    previousChainSha256: previous?.chainSha256 ?? null,
    totalProviderCallsObserved: providerTotal,
    totalQuotaUnitsObserved: quotaTotal,
    trueZeroReceiptCount: zeros,
    providerSubmissionAuthorized: false,
    productionCollectionAuthorized: false,
    productActivationAuthorized: false,
  };
  const checkpoint: SnsFandomV2IncrementalCoverageCheckpointV1 = {
    ...draft,
    chainSha256: digestCheckpoint(draft),
  };
  checkpointPathResult = checkpointPath(nextSlot);
  checkpointBody = JSON.stringify(checkpoint);
  if (input.existingNextCheckpointText != null) {
    if (input.existingNextCheckpointText !== checkpointBody) {
      blockers.push('incremental-v2-immutable-checkpoint-conflict');
      return result();
    }
    state = 'idempotent-existing';
  } else {
    state = 'candidate-ready';
  }
  return result();
}
