import {
  evaluateNaverNewsMediaActivityDiurnalReadiness,
} from '../server/ingestion/naverNewsMediaActivityBaselineReadinessResearch';
import {
  NAVER_NEWS_SCHEDULER_CADENCE_MINUTES,
} from '../server/ingestion/naverNewsScheduler';

export const FANDEX_MOMENTUM_RECOVERY_CONTINUITY_GATE_VERSION =
  'momentum-recovery-continuity-gate-v1' as const;

const CADENCE_MS = NAVER_NEWS_SCHEDULER_CADENCE_MINUTES * 60_000;

function requiredAnalysisSlotCount(): number {
  for (let count = 0; count <= 24 * 365; count += 1) {
    if (
      evaluateNaverNewsMediaActivityDiurnalReadiness(count).status
        === 'replicated_cycle_history'
    ) {
      return count;
    }
  }
  throw new Error('momentum_recovery_continuity_baseline_unbounded');
}

export const FANDEX_MOMENTUM_RECOVERY_REQUIRED_ANALYSIS_SLOT_COUNT =
  requiredAnalysisSlotCount();

export const FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT =
  FANDEX_MOMENTUM_RECOVERY_REQUIRED_ANALYSIS_SLOT_COUNT + 1;

export type FandexMomentumRecoveryContinuityGateResult = Readonly<{
  contractVersion: typeof FANDEX_MOMENTUM_RECOVERY_CONTINUITY_GATE_VERSION;
  state:
    | 'no-recovery-evidence'
    | 'continuity-building'
    | 'continuity-qualified-candidate';
  candidateProtocolStart: string | null;
  latestSuccessfulSlotStart: string | null;
  contiguousSuccessfulSlotCount: number;
  requiredAnalysisSlotCount: number;
  requiredSeriesSlotCount: number;
  missingSlotsSynthesized: false;
  backfillAuthorized: false;
  activationAllowed: false;
  productionOperationsApprovalRequired: true;
  safety: Readonly<{
    databaseMode: 'read-only';
    databaseWrites: 0;
    historyWrites: 0;
    productMetricWrites: 0;
    registryMutations: 0;
    productionActivations: 0;
  }>;
}>;

const SAFETY = Object.freeze({
  databaseMode: 'read-only' as const,
  databaseWrites: 0 as const,
  historyWrites: 0 as const,
  productMetricWrites: 0 as const,
  registryMutations: 0 as const,
  productionActivations: 0 as const,
});

function exactSlot(value: string): number {
  const timestamp = Date.parse(value);
  if (
    !Number.isFinite(timestamp)
    || new Date(timestamp).toISOString() !== value
    || timestamp % CADENCE_MS !== 0
  ) {
    throw new Error('momentum_recovery_continuity_slot_invalid');
  }
  return timestamp;
}

export function evaluateFandexMomentumRecoveryContinuityGate(
  successfulSlotStarts: readonly string[],
): FandexMomentumRecoveryContinuityGateResult {
  const timestamps = successfulSlotStarts.map(exactSlot);
  if (new Set(timestamps).size !== timestamps.length) {
    throw new Error('momentum_recovery_continuity_duplicate_slot');
  }

  timestamps.sort((left, right) => left - right);
  if (timestamps.length === 0) {
    return Object.freeze({
      contractVersion: FANDEX_MOMENTUM_RECOVERY_CONTINUITY_GATE_VERSION,
      state: 'no-recovery-evidence' as const,
      candidateProtocolStart: null,
      latestSuccessfulSlotStart: null,
      contiguousSuccessfulSlotCount: 0,
      requiredAnalysisSlotCount:
        FANDEX_MOMENTUM_RECOVERY_REQUIRED_ANALYSIS_SLOT_COUNT,
      requiredSeriesSlotCount:
        FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
      missingSlotsSynthesized: false as const,
      backfillAuthorized: false as const,
      activationAllowed: false as const,
      productionOperationsApprovalRequired: true as const,
      safety: SAFETY,
    });
  }

  let startIndex = timestamps.length - 1;
  while (
    startIndex > 0
    && timestamps[startIndex] - timestamps[startIndex - 1] === CADENCE_MS
  ) {
    startIndex -= 1;
  }

  const run = timestamps.slice(startIndex);
  const qualified =
    run.length >= FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT;

  return Object.freeze({
    contractVersion: FANDEX_MOMENTUM_RECOVERY_CONTINUITY_GATE_VERSION,
    state: qualified
      ? 'continuity-qualified-candidate' as const
      : 'continuity-building' as const,
    candidateProtocolStart: new Date(run[0]).toISOString(),
    latestSuccessfulSlotStart:
      new Date(run[run.length - 1]).toISOString(),
    contiguousSuccessfulSlotCount: run.length,
    requiredAnalysisSlotCount:
      FANDEX_MOMENTUM_RECOVERY_REQUIRED_ANALYSIS_SLOT_COUNT,
    requiredSeriesSlotCount:
      FANDEX_MOMENTUM_RECOVERY_REQUIRED_SERIES_SLOT_COUNT,
    missingSlotsSynthesized: false as const,
    backfillAuthorized: false as const,
    activationAllowed: false as const,
    productionOperationsApprovalRequired: true as const,
    safety: SAFETY,
  });
}
