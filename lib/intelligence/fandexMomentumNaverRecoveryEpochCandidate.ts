import { sha256Canonical } from '../shared/canonicalDigest';
import { bindCanonicalArtistToNaverNews } from '../server/ingestion/naverNewsArtistBinding';
import { getOfficialNaverNewsShadowEpoch } from '../server/ingestion/naverNewsShadowEpoch';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
} from '../server/ingestion/naverNewsScheduler';

export const FANDEX_MOMENTUM_NAVER_RECOVERY_EPOCH_CANDIDATE_VERSION =
  'momentum-naver-recovery-epoch-candidate-v1' as const;

export type MomentumNaverRecoveryEpochEvidence = Readonly<{
  canonicalArtistId: string;
  lastSucceededBeforeGapSlotStart: string;
  firstMissingSlotStart: string;
  firstRecoveredSucceededSlotStart: string;
  successfulSlotStartsStrictlyBetweenGapAndRecovery: readonly string[];
  recoveredJob: Readonly<{
    jobId: string;
    collectionKey: string;
    status: 'succeeded';
    rawEvidenceCount: number;
    normalizedRecordCount: number;
    duplicateRecordCount: number;
    rejectedItemCount: number;
  }>;
}>;

export type FandexMomentumNaverRecoveryEpochCandidate = Readonly<{
  contractVersion:
    typeof FANDEX_MOMENTUM_NAVER_RECOVERY_EPOCH_CANDIDATE_VERSION;
  state: 'recovery-epoch-candidate' | 'blocked';
  canonicalArtistId: string;
  currentOfficialEpoch: Readonly<{
    protocolStart: string;
    backfillAllowed: false;
  }>;
  outageBoundary: Readonly<{
    lastSucceededBeforeGapSlotStart: string;
    firstMissingSlotStart: string;
    firstRecoveredSucceededSlotStart: string;
    successfulSlotStartsStrictlyBetweenGapAndRecovery: readonly string[];
  }>;
  candidateEpoch: Readonly<{
    protocolStart: string | null;
    triggerMode: 'github-actions-hourly-v1' | null;
    historicalDataBeforeProtocolStart:
      | 'outside_recovery_epoch'
      | null;
    backfillAllowed: false;
  }>;
  recoveredEvidence: MomentumNaverRecoveryEpochEvidence['recoveredJob'];
  decision: Readonly<{
    officialEpochMutationPerformed: false;
    activationAllowed: false;
    backfillAuthorized: false;
    productionOperationsApprovalRequired: true;
    frozenMethodologyMigrationRequired: true;
  }>;
  blockers: readonly string[];
  digest: string;
  effects: Readonly<{
    databaseReads: 0;
    databaseWrites: 0;
    historyWrites: 0;
    registryMutations: 0;
    productionActivations: 0;
  }>;
}>;

function canonicalSlot(
  canonicalArtistId: string,
  value: string,
): string {
  const binding = bindCanonicalArtistToNaverNews(canonicalArtistId);
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed) || new Date(parsed).toISOString() !== value) {
    throw new Error('momentum_recovery_epoch_timestamp_invalid');
  }
  const plan = buildNaverNewsSchedulerPlan({
    query: binding.query,
    at: value,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  if (plan.slotStart !== value) {
    throw new Error('momentum_recovery_epoch_slot_invalid');
  }
  return plan.slotStart;
}

function validSha256(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export function buildFandexMomentumNaverRecoveryEpochCandidate(
  evidence: MomentumNaverRecoveryEpochEvidence,
): FandexMomentumNaverRecoveryEpochCandidate {
  const official = getOfficialNaverNewsShadowEpoch(
    evidence.canonicalArtistId,
  );

  const lastSucceeded = canonicalSlot(
    evidence.canonicalArtistId,
    evidence.lastSucceededBeforeGapSlotStart,
  );
  const firstMissing = canonicalSlot(
    evidence.canonicalArtistId,
    evidence.firstMissingSlotStart,
  );
  const firstRecovered = canonicalSlot(
    evidence.canonicalArtistId,
    evidence.firstRecoveredSucceededSlotStart,
  );

  const officialStartMs = Date.parse(official.protocolStart);
  const lastSucceededMs = Date.parse(lastSucceeded);
  const firstMissingMs = Date.parse(firstMissing);
  const firstRecoveredMs = Date.parse(firstRecovered);
  const blockers: string[] = [];

  if (
    lastSucceededMs < officialStartMs
    || firstMissingMs - lastSucceededMs !== 60 * 60 * 1_000
    || firstRecoveredMs <= firstMissingMs
  ) {
    blockers.push('outage-boundary-invalid');
  }

  const between = evidence.successfulSlotStartsStrictlyBetweenGapAndRecovery;
  for (const slot of between) {
    canonicalSlot(evidence.canonicalArtistId, slot);
    const timestamp = Date.parse(slot);
    if (timestamp <= firstMissingMs || timestamp >= firstRecoveredMs) {
      blockers.push('between-gap-success-slot-outside-boundary');
      break;
    }
  }
  if (between.length > 0) {
    blockers.push('earlier-recovered-success-exists');
  }

  const job = evidence.recoveredJob;
  if (
    !validSha256(job.jobId)
    || job.collectionKey.length === 0
    || job.status !== 'succeeded'
    || job.rawEvidenceCount !== NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY
    || job.normalizedRecordCount !== NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY
    || job.duplicateRecordCount !== 0
    || job.rejectedItemCount !== 0
  ) {
    blockers.push('recovered-stored-evidence-invalid');
  }

  const valid = blockers.length === 0;
  const persistentBlockers = Object.freeze([
    ...blockers,
    ...(valid
      ? [
          'separate-official-epoch-approval-required',
          'frozen-methodology-migration-required',
        ]
      : []),
  ]);

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_NAVER_RECOVERY_EPOCH_CANDIDATE_VERSION,
    state: valid
      ? 'recovery-epoch-candidate' as const
      : 'blocked' as const,
    canonicalArtistId: evidence.canonicalArtistId,
    currentOfficialEpoch: {
      protocolStart: official.protocolStart,
      backfillAllowed: false as const,
    },
    outageBoundary: {
      lastSucceededBeforeGapSlotStart: lastSucceeded,
      firstMissingSlotStart: firstMissing,
      firstRecoveredSucceededSlotStart: firstRecovered,
      successfulSlotStartsStrictlyBetweenGapAndRecovery:
        Object.freeze([...between]),
    },
    candidateEpoch: {
      protocolStart: valid ? firstRecovered : null,
      triggerMode: valid ? 'github-actions-hourly-v1' as const : null,
      historicalDataBeforeProtocolStart: valid
        ? 'outside_recovery_epoch' as const
        : null,
      backfillAllowed: false as const,
    },
    recoveredEvidence: Object.freeze({ ...job }),
    decision: {
      officialEpochMutationPerformed: false as const,
      activationAllowed: false as const,
      backfillAuthorized: false as const,
      productionOperationsApprovalRequired: true as const,
      frozenMethodologyMigrationRequired: true as const,
    },
    blockers: persistentBlockers,
  };

  return Object.freeze({
    ...payload,
    currentOfficialEpoch: Object.freeze(payload.currentOfficialEpoch),
    outageBoundary: Object.freeze(payload.outageBoundary),
    candidateEpoch: Object.freeze(payload.candidateEpoch),
    decision: Object.freeze(payload.decision),
    digest: sha256Canonical(payload),
    effects: Object.freeze({
      databaseReads: 0 as const,
      databaseWrites: 0 as const,
      historyWrites: 0 as const,
      registryMutations: 0 as const,
      productionActivations: 0 as const,
    }),
  });
}
