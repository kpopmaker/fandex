import type {
  ImmutableTextObjectStore,
} from '../../lib/server/storage/immutableTextObjectStore';
import type {
  SnsFandomYoutubeBoundedMeasurementResult,
} from '../../lib/intelligence/snsFandomPointYoutubeBoundedMeasurement';
import {
  evaluateSnsFandomYoutubeRecurringMeasurementPlan,
  type SnsFandomYoutubeRecurringMeasurementActivation,
} from '../../lib/intelligence/snsFandomPointYoutubeRecurringMeasurement';

export const SNS_FANDOM_YOUTUBE_RECURRING_RECEIPT_VERSION_V2 =
  'sns-fandom-youtube-recurring-receipt-v2' as const;

const ROOT = 'sns-fandom/youtube-audit/recurring/v2' as const;

export type SnsFandomYoutubeRecurringRunnerV2Input = Readonly<{
  currentRevisionSha: string;
  now: string;
  measurementWindowStart: string;
  measurementWindowEnd: string;
  reactionSnapshotRunsPerDay: number;
  activation: SnsFandomYoutubeRecurringMeasurementActivation;
}>;

export type SnsFandomYoutubeRecurringRunnerV2Dependencies = Readonly<{
  store: ImmutableTextObjectStore;
  executeMeasurement: (
    observationTime: string,
  ) => Promise<SnsFandomYoutubeBoundedMeasurementResult>;
  collectedAt?: () => string;
}>;

export type SnsFandomYoutubeRecurringCoverageV2 = Readonly<{
  receiptCount: number;
  firstSlotStart: string | null;
  lastSlotStart: string | null;
  totalProviderCallsObserved: number;
  totalQuotaUnitsObserved: number;
  trueZeroReceiptCount: number;
}>;

export type SnsFandomYoutubeRecurringRunnerV2Result = Readonly<{
  state:
    | 'disabled'
    | 'invalid'
    | 'before-window'
    | 'window-complete'
    | 'already-recorded'
    | 'slot-claimed'
    | 'completed';
  slotStart: string | null;
  receiptPath: string | null;
  providerCallsPerformed: boolean;
  coverage: SnsFandomYoutubeRecurringCoverageV2 | null;
  providerSubmissionAuthorized: false;
  productionCollectionAuthorized: false;
  productActivationAuthorized: false;
  blockers: readonly string[];
}>;

type SanitizedReceipt = Readonly<{
  version: typeof SNS_FANDOM_YOUTUBE_RECURRING_RECEIPT_VERSION_V2;
  state: 'completed';
  slotStart: string;
  observationTime: string;
  collectedAt: string;
  sourceMainSha: string;
  measurementWindowStart: string;
  measurementWindowEnd: string;
  observedThrough: string;
  measurementWindowComplete: boolean;
  uploadManifestPageCountPerReactionRun: number;
  videoCountPerReactionRun: number;
  trueZeroVideoCountObserved: boolean;
  providerCallsObserved: Readonly<{
    channelsList: number;
    playlistItemsList: number;
    videosList: number;
    total: number;
  }>;
  quotaUnitsObserved: number;
  rawVideoIdentifiersStored: false;
  rawStatisticsStored: false;
  secretMaterialStored: false;
  providerSubmissionAuthorized: false;
  productionCollectionAuthorized: false;
  schedulerMutationAuthorized: true;
  productActivationAuthorized: false;
}>;

function receiptPath(slotStart: string): string {
  const value = slotStart
    .replace(/[-:]/g, '')
    .replace('.000Z', 'Z');
  return ROOT + '/receipts/' + value + '.json';
}

function claimPath(slotStart: string): string {
  const value = slotStart
    .replace(/[-:]/g, '')
    .replace('.000Z', 'Z');
  return ROOT + '/claims/' + value + '.json';
}

function receiptPrefix(): string {
  return ROOT + '/receipts/';
}

function emptyCoverage(): SnsFandomYoutubeRecurringCoverageV2 {
  return Object.freeze({
    receiptCount: 0,
    firstSlotStart: null,
    lastSlotStart: null,
    totalProviderCallsObserved: 0,
    totalQuotaUnitsObserved: 0,
    trueZeroReceiptCount: 0,
  });
}

function parseReceipt(text: string): SanitizedReceipt {
  const value = JSON.parse(text) as Record<string, unknown>;
  if (
    value.version !== SNS_FANDOM_YOUTUBE_RECURRING_RECEIPT_VERSION_V2
    || value.state !== 'completed'
    || typeof value.slotStart !== 'string'
    || typeof value.providerCallsObserved !== 'object'
    || value.providerCallsObserved === null
    || typeof value.quotaUnitsObserved !== 'number'
    || typeof value.trueZeroVideoCountObserved !== 'boolean'
  ) {
    throw new Error('sns_fandom_recurring_v2_receipt_invalid');
  }
  return value as unknown as SanitizedReceipt;
}

async function buildCoverage(
  store: ImmutableTextObjectStore,
): Promise<SnsFandomYoutubeRecurringCoverageV2> {
  const paths = await store.listPathnames(receiptPrefix());
  if (paths.length === 0) return emptyCoverage();

  const receipts: SanitizedReceipt[] = [];
  for (const path of paths) {
    const text = await store.readText(path);
    if (text === null) {
      throw new Error('sns_fandom_recurring_v2_receipt_index_inconsistent');
    }
    receipts.push(parseReceipt(text));
  }
  receipts.sort((a, b) => a.slotStart.localeCompare(b.slotStart));

  return Object.freeze({
    receiptCount: receipts.length,
    firstSlotStart: receipts[0]?.slotStart ?? null,
    lastSlotStart: receipts.at(-1)?.slotStart ?? null,
    totalProviderCallsObserved: receipts.reduce(
      (sum, receipt) => sum + receipt.providerCallsObserved.total,
      0,
    ),
    totalQuotaUnitsObserved: receipts.reduce(
      (sum, receipt) => sum + receipt.quotaUnitsObserved,
      0,
    ),
    trueZeroReceiptCount: receipts.filter(
      (receipt) => receipt.trueZeroVideoCountObserved,
    ).length,
  });
}

function nonExecutingResult(
  state: Exclude<
    SnsFandomYoutubeRecurringRunnerV2Result['state'],
    'completed'
  >,
  slotStart: string | null,
  receipt: string | null,
  blockers: readonly string[],
  coverage: SnsFandomYoutubeRecurringCoverageV2 | null = null,
): SnsFandomYoutubeRecurringRunnerV2Result {
  return Object.freeze({
    state,
    slotStart,
    receiptPath: receipt,
    providerCallsPerformed: false,
    coverage,
    providerSubmissionAuthorized: false,
    productionCollectionAuthorized: false,
    productActivationAuthorized: false,
    blockers: Object.freeze([...blockers]),
  });
}

export async function runSnsFandomYoutubeRecurringMeasurementSlotV2(
  input: SnsFandomYoutubeRecurringRunnerV2Input,
  dependencies: SnsFandomYoutubeRecurringRunnerV2Dependencies,
): Promise<SnsFandomYoutubeRecurringRunnerV2Result> {
  const plan = evaluateSnsFandomYoutubeRecurringMeasurementPlan(input);
  if (plan.state !== 'slot-ready') {
    return nonExecutingResult(
      plan.state,
      plan.slotStart,
      null,
      plan.blockers,
    );
  }
  if (plan.slotStart === null) {
    throw new Error('sns_fandom_recurring_v2_slot_start_missing');
  }

  const path = receiptPath(plan.slotStart);
  const existing = await dependencies.store.readText(path);
  if (existing !== null) {
    parseReceipt(existing);
    return nonExecutingResult(
      'already-recorded',
      plan.slotStart,
      path,
      [],
      await buildCoverage(dependencies.store),
    );
  }

  const claim = claimPath(plan.slotStart);
  const claimBody = JSON.stringify({
    version: 'sns-fandom-youtube-recurring-slot-claim-v2',
    slotStart: plan.slotStart,
    sourceMainSha: input.currentRevisionSha,
    providerSubmissionAuthorized: false,
    productionCollectionAuthorized: false,
    productActivationAuthorized: false,
  });
  const claimed = await dependencies.store.putTextIfAbsent(
    claim,
    claimBody,
  );
  if (claimed.status !== 'created') {
    return nonExecutingResult(
      'slot-claimed',
      plan.slotStart,
      path,
      ['sns-fandom-recurring-slot-already-claimed'],
      await buildCoverage(dependencies.store),
    );
  }

  const observationTime = input.now;
  const measurement = await dependencies.executeMeasurement(
    observationTime,
  );
  if (
    measurement.state !== 'bounded-measurement-completed'
    || measurement.artistBindingManifestId
      !== 'sns-fandom-youtube-audit-cohort-v1'
    || measurement.artistChannelCount !== 5
    || measurement.reactionSnapshotRunsPerDay !== 24
    || measurement.requestBatchingStrategy
      !== 'singleton-only-until-provider-batch-limit-evidence'
    || measurement.productionCollectionAuthorized !== false
    || measurement.providerSubmissionAuthorized !== false
    || measurement.secretMaterialStored !== false
    || measurement.rawVideoIdentifiersStored !== false
    || measurement.rawStatisticsStored !== false
  ) {
    throw new Error(
      'sns_fandom_recurring_v2_measurement_result_outside_contract',
    );
  }

  const collectedAt =
    dependencies.collectedAt?.() ?? new Date().toISOString();
  const receipt: SanitizedReceipt = Object.freeze({
    version: SNS_FANDOM_YOUTUBE_RECURRING_RECEIPT_VERSION_V2,
    state: 'completed',
    slotStart: plan.slotStart,
    observationTime,
    collectedAt,
    sourceMainSha: input.currentRevisionSha,
    measurementWindowStart: measurement.measurementWindowStart,
    measurementWindowEnd: measurement.measurementWindowEnd,
    observedThrough: measurement.observedThrough,
    measurementWindowComplete: measurement.measurementWindowComplete,
    uploadManifestPageCountPerReactionRun:
      measurement.uploadManifestPageCountPerReactionRun,
    videoCountPerReactionRun:
      measurement.videoCountPerReactionRun,
    trueZeroVideoCountObserved:
      measurement.videoCountPerReactionRun === 0,
    providerCallsObserved: measurement.providerCallsObserved,
    quotaUnitsObserved: measurement.quotaUnitsObserved,
    rawVideoIdentifiersStored: false,
    rawStatisticsStored: false,
    secretMaterialStored: false,
    providerSubmissionAuthorized: false,
    productionCollectionAuthorized: false,
    schedulerMutationAuthorized: true,
    productActivationAuthorized: false,
  });

  const written = await dependencies.store.putTextIfAbsent(
    path,
    JSON.stringify(receipt),
  );
  if (written.status === 'conflict') {
    throw new Error('sns_fandom_recurring_v2_receipt_conflict');
  }

  return Object.freeze({
    state: 'completed' as const,
    slotStart: plan.slotStart,
    receiptPath: path,
    providerCallsPerformed: true,
    coverage: await buildCoverage(dependencies.store),
    providerSubmissionAuthorized: false as const,
    productionCollectionAuthorized: false as const,
    productActivationAuthorized: false as const,
    blockers: Object.freeze([]),
  });
}

export async function main(): Promise<void> {
  throw new Error(
    'sns_fandom_recurring_v2_runtime_not_activated_or_bound',
  );
}

if (import.meta.url === new URL(
  'file://' + process.argv[1],
).href) {
  main().catch((error) => {
    process.stderr.write(
      (
        error instanceof Error
          ? error.message
          : 'sns_fandom_recurring_v2_runner_failed_closed'
      ) + '\n',
    );
    process.exitCode = 1;
  });
}
