import {
  evaluateNaverNewsMediaActivityDiurnalReadiness,
} from '../server/ingestion/naverNewsMediaActivityBaselineReadinessResearch';
import {
  bindCanonicalArtistToNaverNews,
} from '../server/ingestion/naverNewsArtistBinding';
import {
  buildNaverNewsJobIdentity,
  canonicalJson,
} from '../server/ingestion/naverNewsContracts';
import type {
  NaverNewsLatestOfficialShadowSlotReadRepository,
  NaverNewsSucceededSchedulerJob,
} from '../server/ingestion/naverNewsLatestOfficialShadowSlot';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_CADENCE_MINUTES,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
} from '../server/ingestion/naverNewsScheduler';

export const FANDEX_MOMENTUM_RECOVERY_CONTINUITY_GATE_VERSION =
  'momentum-recovery-continuity-gate-v1' as const;

const CADENCE_MS = NAVER_NEWS_SCHEDULER_CADENCE_MINUTES * 60_000;
const COLLECTION_KEY_PATTERN =
  /^sched-v125-naver-news-(\d{8})t(\d{6})z-[0-9a-f]{12}$/;

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

function slotFromCollectionKey(value: string): string {
  const match = COLLECTION_KEY_PATTERN.exec(value);
  if (!match) {
    throw new Error('momentum_recovery_collection_key_invalid');
  }
  const date = match[1];
  const time = match[2];
  const slotStart = (
    date.slice(0, 4) + '-' + date.slice(4, 6) + '-' + date.slice(6, 8)
    + 'T' + time.slice(0, 2) + ':' + time.slice(2, 4) + ':'
    + time.slice(4, 6) + '.000Z'
  );
  exactSlot(slotStart);
  return slotStart;
}

function exactOfficialSlot(
  job: NaverNewsSucceededSchedulerJob,
): string | null {
  const slotStart = slotFromCollectionKey(job.collectionKey);
  const binding = bindCanonicalArtistToNaverNews('iu');
  const plan = buildNaverNewsSchedulerPlan({
    query: binding.query,
    at: slotStart,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  const identity = buildNaverNewsJobIdentity(plan.command);

  if (
    plan.slotStart !== slotStart
    || plan.collectionKey !== job.collectionKey
    || identity.jobId !== job.jobId
    || canonicalJson(identity.request)
      !== canonicalJson(job.requestContract)
  ) {
    return null;
  }

  return slotStart;
}

export async function evaluateFandexMomentumRecoveryContinuityFromRepository(
  repository: NaverNewsLatestOfficialShadowSlotReadRepository,
): Promise<FandexMomentumRecoveryContinuityGateResult> {
  const jobs = await repository.readSucceededSchedulerJobs();
  const slots: string[] = [];

  for (const job of jobs) {
    const slot = exactOfficialSlot(job);
    if (slot !== null) slots.push(slot);
  }

  return evaluateFandexMomentumRecoveryContinuityGate(slots);
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
