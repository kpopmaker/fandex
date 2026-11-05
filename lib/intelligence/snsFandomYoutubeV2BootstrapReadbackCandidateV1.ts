import type { ImmutableTextObjectStore } from '../server/storage/immutableTextObjectStore';
import {
  evaluateSnsFandomV2IncrementalCoverageCandidateV1,
} from './snsFandomYoutubeV2IncrementalCoverageCandidateV1';

export const SNS_FANDOM_V2_BOOTSTRAP_READBACK_CANDIDATE_VERSION =
  'sns-fandom-v2-bootstrap-readback-candidate-v1' as const;

const ROOT = 'sns-fandom/youtube-audit/recurring/v2';
const WINDOW_PATH = ROOT + '/canonical-window.json';
const RECEIPTS = ROOT + '/receipts/';
const CANDIDATES = ROOT + '/coverage-candidate/v1/checkpoints/';
const FIRST_SLOT = '2026-10-08T01:00:00.000Z';
const REVISION = '27a007c2afb4776cf2ae89c2e8bd4ba5f9a8f688';
const OWNER_EVIDENCE =
  'github-issue://kpopmaker/fandex/issues/509#issuecomment-6049459425';
const HOUR_MS = 3600000;
const TOTAL_SLOTS = 366 * 24;
type ReadStore = Pick<ImmutableTextObjectStore, 'readText' | 'listPathnames'>;

export type SnsFandomV2BootstrapReadbackCandidateInput = Readonly<{
  // Operator must corroborate against successful natural Render + Actions
  // events. This input alone is not scheduler attestation.
  throughObservedSlotStart: string;
}>;

export type SnsFandomV2BootstrapReadbackCandidateResult = Readonly<{
  version: typeof SNS_FANDOM_V2_BOOTSTRAP_READBACK_CANDIDATE_VERSION;
  state: 'bootstrap-candidate-complete' | 'blocked';
  evidenceSource: 'read-only-stored-receipt-replay';
  schedulerEvidenceSource: 'operator-supplied-unverified';
  firstSlotStart: typeof FIRST_SLOT;
  throughObservedSlotStart: string;
  expectedSlots: number;
  validatedReceiptBodies: number;
  validatedExistingCheckpointBodies: number;
  proposedCheckpointCount: number;
  missingReceiptSlotStarts: readonly string[];
  blockers: readonly string[];
  lastVerifiedSlotStart: string | null;
  lastProposedCheckpointPath: string | null;
  lastProposedCheckpointChainSha256: string | null;
  totalProviderCallsObserved: number;
  totalQuotaUnitsObserved: number;
  trueZeroReceiptCount: number;
  historicalBackfillPerformed: false;
  checkpointBodiesPersisted: 0;
  blobWrites: 0;
  providerCallsPerformed: false;
  providerSubmissionAuthorized: false;
  productionCollectionAuthorized: false;
  productActivationAuthorized: false;
}>;

function expectedPath(slot: string, prefix: string): string {
  return prefix + slot.replace(/[-:]/g, '').replace('.000Z', 'Z') + '.json';
}

function isUtcHour(value: string): boolean {
  return Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value
    && Date.parse(value) % HOUR_MS === 0;
}

function chainDigest(body: string): string | null {
  try {
    const value: unknown = JSON.parse(body);
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const digest = (value as Record<string, unknown>).chainSha256;
      if (typeof digest === 'string' && /^[0-9a-f]{64}$/.test(digest)) {
        return digest;
      }
    }
  } catch { /* fail closed */ }
  return null;
}

/**
 * READ-ONLY O(N) replay from actual stored v2 receipts.
 * Recomputes each candidate checkpoint from genesis and verifies
 * already-stored candidate checkpoints byte-for-byte if any exist.
 * No checkpoint body is returned for persistence and no write capability
 * is passed to this function.
 */
export async function verifySnsFandomV2BootstrapReadbackCandidate(
  store: ReadStore,
  input: SnsFandomV2BootstrapReadbackCandidateInput,
): Promise<SnsFandomV2BootstrapReadbackCandidateResult> {
  const blockers: string[] = [];
  const missingReceiptSlotStarts: string[] = [];
  let expectedSlots = 0;
  let validatedReceiptBodies = 0;
  let validatedExistingCheckpointBodies = 0;
  let lastVerifiedSlotStart: string | null = null;
  let lastProposedCheckpointPath: string | null = null;
  let lastProposedCheckpointChainSha256: string | null = null;
  let totalProviderCallsObserved = 0;
  let totalQuotaUnitsObserved = 0;
  let trueZeroReceiptCount = 0;

  function output(): SnsFandomV2BootstrapReadbackCandidateResult {
    const complete = blockers.length === 0
      && missingReceiptSlotStarts.length === 0
      && expectedSlots > 0
      && validatedReceiptBodies === expectedSlots;
    return Object.freeze({
      version: SNS_FANDOM_V2_BOOTSTRAP_READBACK_CANDIDATE_VERSION,
      state: complete ? 'bootstrap-candidate-complete' as const
        : 'blocked' as const,
      evidenceSource: 'read-only-stored-receipt-replay' as const,
      schedulerEvidenceSource: 'operator-supplied-unverified' as const,
      firstSlotStart: FIRST_SLOT,
      throughObservedSlotStart: input.throughObservedSlotStart,
      expectedSlots,
      validatedReceiptBodies,
      validatedExistingCheckpointBodies,
      proposedCheckpointCount: validatedReceiptBodies,
      missingReceiptSlotStarts: Object.freeze([...missingReceiptSlotStarts]),
      blockers: Object.freeze([...new Set(blockers)]),
      lastVerifiedSlotStart,
      lastProposedCheckpointPath,
      lastProposedCheckpointChainSha256,
      totalProviderCallsObserved,
      totalQuotaUnitsObserved,
      trueZeroReceiptCount,
      historicalBackfillPerformed: false as const,
      checkpointBodiesPersisted: 0 as const,
      blobWrites: 0 as const,
      providerCallsPerformed: false as const,
      providerSubmissionAuthorized: false as const,
      productionCollectionAuthorized: false as const,
      productActivationAuthorized: false as const,
    });
  }

  if (
    typeof input.throughObservedSlotStart !== 'string'
    || !isUtcHour(input.throughObservedSlotStart)
  ) {
    blockers.push('bootstrap-v2-invalid-observed-hour');
    return output();
  }
  const firstMs = Date.parse(FIRST_SLOT);
  const throughMs = Date.parse(input.throughObservedSlotStart);
  if (throughMs < firstMs || throughMs >= firstMs + TOTAL_SLOTS * HOUR_MS) {
    blockers.push('bootstrap-v2-horizon-outside-canonical');
    return output();
  }
  expectedSlots = Math.floor((throughMs - firstMs) / HOUR_MS) + 1;

  const canonicalText = await store.readText(WINDOW_PATH);
  if (canonicalText === null) {
    blockers.push('bootstrap-v2-canonical-missing');
    return output();
  }
  const [listedReceipts, listedCheckpoints] = await Promise.all([
    store.listPathnames(RECEIPTS),
    store.listPathnames(CANDIDATES),
  ]);
  const receiptPaths = new Set(listedReceipts);
  const checkpointPaths = new Set(listedCheckpoints);
  if (receiptPaths.size !== listedReceipts.length) {
    blockers.push('bootstrap-v2-duplicate-receipt-index');
  }
  if (checkpointPaths.size !== listedCheckpoints.length) {
    blockers.push('bootstrap-v2-duplicate-checkpoint-index');
  }

  const expectedCheckpointPaths = new Set<string>();
  for (let i = 0; i < expectedSlots; i += 1) {
    const slot = new Date(firstMs + i * HOUR_MS).toISOString();
    expectedCheckpointPaths.add(expectedPath(slot, CANDIDATES));
  }
  // Invalid pathnames and checkpoint objects outside the canonical fail closed.
  // Future *valid* receipts/checkpoints are not attested by a past horizon.
  for (const path of receiptPaths) {
    if (!/^sns-fandom\/youtube-audit\/recurring\/v2\/receipts\/\d{8}T\d{6}Z\.json$/.test(path)) {
      blockers.push('bootstrap-v2-unexpected-receipt-path');
      break;
    }
  }
  for (const path of checkpointPaths) {
    if (!/^sns-fandom\/youtube-audit\/recurring\/v2\/coverage-candidate\/v1\/checkpoints\/\d{8}T\d{6}Z\.json$/.test(path)) {
      blockers.push('bootstrap-v2-unexpected-checkpoint-path');
      break;
    }
    const stamp = path.slice(CANDIDATES.length, -5);
    const stampIso = stamp.slice(0, 4) + '-' + stamp.slice(4, 6) + '-'
      + stamp.slice(6, 8) + 'T' + stamp.slice(9, 11) + ':'
      + stamp.slice(11, 13) + ':' + stamp.slice(13, 15) + '.000Z';
    if (!isUtcHour(stampIso)
      || Date.parse(stampIso) < firstMs
      || Date.parse(stampIso) >= firstMs + TOTAL_SLOTS * HOUR_MS) {
      blockers.push('bootstrap-v2-orphan-checkpoint-path');
      break;
    }
  }
  if (blockers.length) return output();

  let previousCheckpointText: string | null = null;
  for (let i = 0; i < expectedSlots; i += 1) {
    const slot = new Date(firstMs + i * HOUR_MS).toISOString();
    const receiptPath = expectedPath(slot, RECEIPTS);
    const checkpointPath = expectedPath(slot, CANDIDATES);
    if (!receiptPaths.has(receiptPath)) {
      missingReceiptSlotStarts.push(slot);
      blockers.push('bootstrap-v2-missing-natural-slot');
      break;
    }
    const receiptText = await store.readText(receiptPath);
    if (receiptText === null) {
      blockers.push('bootstrap-v2-indexed-receipt-unreadable');
      break;
    }
    const existingNextCheckpointText = checkpointPaths.has(checkpointPath)
      ? await store.readText(checkpointPath) : null;
    if (checkpointPaths.has(checkpointPath)
      && existingNextCheckpointText === null) {
      blockers.push('bootstrap-v2-indexed-checkpoint-unreadable');
      break;
    }

    const evaluation = evaluateSnsFandomV2IncrementalCoverageCandidateV1({
      canonicalText, receiptText, previousCheckpointText,
      expectedAuthorizedRevisionSha: REVISION,
      expectedOwnerEvidenceRef: OWNER_EVIDENCE,
      existingNextCheckpointText,
    });
    if (evaluation.state === 'blocked'
      || evaluation.checkpointPath !== checkpointPath
      || evaluation.checkpointBody === null) {
      blockers.push('bootstrap-v2-incremental-candidate-blocked');
      blockers.push(...evaluation.blockers);
      break;
    }
    if (existingNextCheckpointText !== null
      && evaluation.state !== 'idempotent-existing') {
      blockers.push('bootstrap-v2-existing-checkpoint-not-identical');
      break;
    }
    if (existingNextCheckpointText === null
      && evaluation.state !== 'candidate-ready') {
      blockers.push('bootstrap-v2-unexpected-checkpoint-state');
      break;
    }
    const digest = chainDigest(evaluation.checkpointBody);
    if (digest === null) {
      blockers.push('bootstrap-v2-candidate-digest-missing');
      break;
    }
    previousCheckpointText = evaluation.checkpointBody;
    validatedReceiptBodies++;
    if (existingNextCheckpointText !== null) {
      validatedExistingCheckpointBodies++;
    }
    lastVerifiedSlotStart = slot;
    lastProposedCheckpointPath = checkpointPath;
    lastProposedCheckpointChainSha256 = digest;
    const cp = JSON.parse(evaluation.checkpointBody) as Record<string, number>;
    totalProviderCallsObserved = cp.totalProviderCallsObserved;
    totalQuotaUnitsObserved = cp.totalQuotaUnitsObserved;
    trueZeroReceiptCount = cp.trueZeroReceiptCount;
  }

  // A stored candidate checkpoint beyond the verified tip is an orphan,
  // even if a preceding receipt was missing or its body was corrupted.
  for (const path of checkpointPaths) {
    if (!expectedCheckpointPaths.has(path)) continue;
    if (lastVerifiedSlotStart === null
      || path > expectedPath(lastVerifiedSlotStart, CANDIDATES)) {
      blockers.push('bootstrap-v2-existing-checkpoint-past-verified-tip');
      break;
    }
  }
  return output();
}
