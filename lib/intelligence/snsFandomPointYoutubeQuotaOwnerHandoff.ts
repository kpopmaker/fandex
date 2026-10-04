import {
  type SnsFandomYoutubeQuotaBatchingStrategy,
} from './snsFandomPointYoutubeQuotaWorksheet';

export const SNS_FANDOM_YOUTUBE_QUOTA_OWNER_HANDOFF_VERSION =
  'sns-fandom-youtube-quota-owner-handoff-v1' as const;

export type SnsFandomYoutubeQuotaOwnerHandoffInput = Readonly<{
  measurementWindowStart: string | null;
  measurementWindowEnd: string | null;
  reactionSnapshotRunsPerDay: number | null;
  cadenceEvidenceRef: string | null;
  measurementWindowComplete: boolean;
  observedThrough: string | null;
  measurementWindowCompletionEvidenceRef: string | null;
  measuredAt: string | null;
  uploadManifestPageCountPerReactionRun: number | null;
  videoCountPerReactionRun: number | null;
  measuredUsageEvidenceRef: string | null;
  requestBatchingStrategy: SnsFandomYoutubeQuotaBatchingStrategy | null;
  channelIdsPerCall: number | null;
  videoIdsPerCall: number | null;
  requestBatchingEvidenceRef: string | null;
  maxChannelIdsPerCall: number | null;
  maxVideoIdsPerCall: number | null;
  providerBatchLimitEvidenceRef: string | null;
}>;

export type SnsFandomYoutubeQuotaOwnerHandoffResult = Readonly<{
  contractVersion: typeof SNS_FANDOM_YOUTUBE_QUOTA_OWNER_HANDOFF_VERSION;
  state:
    | 'awaiting-owner-plan-evidence'
    | 'measurement-plan-ready'
    | 'quota-worksheet-input-ready';
  missingPlanFields: readonly string[];
  missingMeasurementFields: readonly string[];
  completionBlockers: readonly string[];
  invalidFields: readonly string[];
  measurementWindowStart: string | null;
  measurementWindowEnd: string | null;
  reactionSnapshotRunsPerDay: number | null;
  cadenceEvidenceRef: string | null;
  measurementWindowComplete: boolean;
  observedThrough: string | null;
  measurementWindowCompletionEvidenceRef: string | null;
  measuredAt: string | null;
  uploadManifestPageCountPerReactionRun: number | null;
  videoCountPerReactionRun: number | null;
  measuredUsageEvidenceRef: string | null;
  requestBatchingStrategy: SnsFandomYoutubeQuotaBatchingStrategy | null;
  channelIdsPerCall: number | null;
  videoIdsPerCall: number | null;
  requestBatchingEvidenceRef: string | null;
  maxChannelIdsPerCall: number | null;
  maxVideoIdsPerCall: number | null;
  providerBatchLimitEvidenceRef: string | null;
  automaticProviderCallAllowed: false;
  collectionExecutionAuthorized: false;
  schedulerMutationAllowed: false;
  deploymentAuthorized: false;
  providerSubmissionAuthorized: false;
  arbitraryCadenceApplied: false;
  arbitraryMeasurementWindowApplied: false;
  arbitraryProviderLimitApplied: false;
}>;

const PLAN_FIELDS = Object.freeze([
  'measurementWindowStart',
  'measurementWindowEnd',
  'reactionSnapshotRunsPerDay',
  'cadenceEvidenceRef',
] as const);

const MEASUREMENT_FIELDS = Object.freeze([
  'observedThrough',
  'measurementWindowCompletionEvidenceRef',
  'measuredAt',
  'uploadManifestPageCountPerReactionRun',
  'videoCountPerReactionRun',
  'measuredUsageEvidenceRef',
  'requestBatchingStrategy',
  'channelIdsPerCall',
  'videoIdsPerCall',
  'requestBatchingEvidenceRef',
] as const);

function present(value: string | null): value is string {
  return value !== null && value.trim().length > 0;
}

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function positiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function nonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function secretLike(value: string): boolean {
  if (/AIza[0-9A-Za-z_-]{10,}/.test(value)) return true;
  const normalized = value.toLowerCase();
  return [
    'password=',
    'access_token=',
    'refresh_token=',
    'client_secret=',
    'authorization: bearer ',
    'api_key=',
    'apikey=',
    'key=aiza',
  ].some((needle) => normalized.includes(needle));
}

export function evaluateSnsFandomYoutubeQuotaOwnerHandoff(
  input: SnsFandomYoutubeQuotaOwnerHandoffInput,
): SnsFandomYoutubeQuotaOwnerHandoffResult {
  const missingPlanFields: string[] = [];
  const missingMeasurementFields: string[] = [];
  const completionBlockers: string[] = [];
  const invalidFields: string[] = [];

  for (const field of PLAN_FIELDS) {
    const value = input[field];
    if (value === null || (typeof value === 'string' && !present(value))) {
      missingPlanFields.push(field);
    }
  }

  for (const field of MEASUREMENT_FIELDS) {
    const value = input[field];
    if (value === null || (typeof value === 'string' && !present(value))) {
      missingMeasurementFields.push(field);
    }
  }

  if (
    input.measurementWindowStart !== null
    && !validIso(input.measurementWindowStart)
  ) {
    invalidFields.push('measurementWindowStart');
  }
  if (
    input.measurementWindowEnd !== null
    && !validIso(input.measurementWindowEnd)
  ) {
    invalidFields.push('measurementWindowEnd');
  }
  if (
    input.measurementWindowStart !== null
    && input.measurementWindowEnd !== null
    && validIso(input.measurementWindowStart)
    && validIso(input.measurementWindowEnd)
    && Date.parse(input.measurementWindowStart) >= Date.parse(input.measurementWindowEnd)
  ) {
    invalidFields.push('measurementWindowOrder');
  }
  if (
    input.reactionSnapshotRunsPerDay !== null
    && !positiveSafeInteger(input.reactionSnapshotRunsPerDay)
  ) {
    invalidFields.push('reactionSnapshotRunsPerDay');
  }
  if (input.observedThrough !== null && !validIso(input.observedThrough)) {
    invalidFields.push('observedThrough');
  }
  if (input.measuredAt !== null && !validIso(input.measuredAt)) {
    invalidFields.push('measuredAt');
  }
  for (const field of [
    'uploadManifestPageCountPerReactionRun',
    'channelIdsPerCall',
    'videoIdsPerCall',
    'maxChannelIdsPerCall',
    'maxVideoIdsPerCall',
  ] as const) {
    const value = input[field];
    if (value !== null && !positiveSafeInteger(value)) {
      invalidFields.push(field);
    }
  }
  if (
    input.videoCountPerReactionRun !== null
    && !nonNegativeSafeInteger(input.videoCountPerReactionRun)
  ) {
    invalidFields.push('videoCountPerReactionRun');
  }

  if (!input.measurementWindowComplete) {
    completionBlockers.push('measurement-window-incomplete');
  } else {
    if (
      input.observedThrough !== null
      && input.measurementWindowEnd !== null
      && validIso(input.observedThrough)
      && validIso(input.measurementWindowEnd)
      && Date.parse(input.observedThrough) < Date.parse(input.measurementWindowEnd)
    ) {
      completionBlockers.push('measurement-window-observed-through-before-end');
    }
    if (!present(input.measurementWindowCompletionEvidenceRef)) {
      completionBlockers.push('measurement-window-completion-evidence-missing');
    }
  }

  for (const field of [
    'cadenceEvidenceRef',
    'measurementWindowCompletionEvidenceRef',
    'measuredUsageEvidenceRef',
    'requestBatchingEvidenceRef',
    'providerBatchLimitEvidenceRef',
  ] as const) {
    const value = input[field];
    if (value !== null && present(value) && secretLike(value)) {
      invalidFields.push(`${field}:secret-like`);
    }
  }

  if (
    input.requestBatchingStrategy === 'singleton-only-until-provider-batch-limit-evidence'
  ) {
    if (input.channelIdsPerCall !== 1 || input.videoIdsPerCall !== 1) {
      invalidFields.push('singletonRequestBatchSize');
    }
  } else if (input.requestBatchingStrategy === 'provider-limit-evidenced') {
    if (
      input.maxChannelIdsPerCall === null
      || !positiveSafeInteger(input.maxChannelIdsPerCall)
    ) {
      missingMeasurementFields.push('maxChannelIdsPerCall');
    }
    if (
      input.maxVideoIdsPerCall === null
      || !positiveSafeInteger(input.maxVideoIdsPerCall)
    ) {
      missingMeasurementFields.push('maxVideoIdsPerCall');
    }
    if (!present(input.providerBatchLimitEvidenceRef)) {
      missingMeasurementFields.push('providerBatchLimitEvidenceRef');
    }
    if (
      input.channelIdsPerCall !== null
      && input.maxChannelIdsPerCall !== null
      && positiveSafeInteger(input.channelIdsPerCall)
      && positiveSafeInteger(input.maxChannelIdsPerCall)
      && input.channelIdsPerCall > input.maxChannelIdsPerCall
    ) {
      invalidFields.push('channelIdsPerCallExceedsProviderLimit');
    }
    if (
      input.videoIdsPerCall !== null
      && input.maxVideoIdsPerCall !== null
      && positiveSafeInteger(input.videoIdsPerCall)
      && positiveSafeInteger(input.maxVideoIdsPerCall)
      && input.videoIdsPerCall > input.maxVideoIdsPerCall
    ) {
      invalidFields.push('videoIdsPerCallExceedsProviderLimit');
    }
  } else if (input.requestBatchingStrategy !== null) {
    invalidFields.push('requestBatchingStrategy');
  }

  const missingPlan = Object.freeze(
    Array.from(new Set(missingPlanFields)).sort(),
  );
  const missingMeasurement = Object.freeze(
    Array.from(new Set(missingMeasurementFields)).sort(),
  );
  const completion = Object.freeze(
    Array.from(new Set(completionBlockers)).sort(),
  );
  const invalid = Object.freeze(Array.from(new Set(invalidFields)).sort());

  const planReady = missingPlan.length === 0 && invalid.length === 0;
  const worksheetInputsReady =
    planReady
    && missingMeasurement.length === 0
    && completion.length === 0
    && invalid.length === 0;

  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_QUOTA_OWNER_HANDOFF_VERSION,
    state: worksheetInputsReady
      ? 'quota-worksheet-input-ready' as const
      : planReady
        ? 'measurement-plan-ready' as const
        : 'awaiting-owner-plan-evidence' as const,
    missingPlanFields: missingPlan,
    missingMeasurementFields: missingMeasurement,
    completionBlockers: completion,
    invalidFields: invalid,
    measurementWindowStart: planReady ? input.measurementWindowStart : null,
    measurementWindowEnd: planReady ? input.measurementWindowEnd : null,
    reactionSnapshotRunsPerDay:
      planReady ? input.reactionSnapshotRunsPerDay : null,
    cadenceEvidenceRef: planReady ? input.cadenceEvidenceRef : null,
    measurementWindowComplete: input.measurementWindowComplete,
    observedThrough: worksheetInputsReady ? input.observedThrough : null,
    measurementWindowCompletionEvidenceRef:
      worksheetInputsReady
        ? input.measurementWindowCompletionEvidenceRef
        : null,
    measuredAt: worksheetInputsReady ? input.measuredAt : null,
    uploadManifestPageCountPerReactionRun:
      worksheetInputsReady
        ? input.uploadManifestPageCountPerReactionRun
        : null,
    videoCountPerReactionRun:
      worksheetInputsReady ? input.videoCountPerReactionRun : null,
    measuredUsageEvidenceRef:
      worksheetInputsReady ? input.measuredUsageEvidenceRef : null,
    requestBatchingStrategy:
      planReady ? input.requestBatchingStrategy : null,
    channelIdsPerCall:
      planReady ? input.channelIdsPerCall : null,
    videoIdsPerCall:
      planReady ? input.videoIdsPerCall : null,
    requestBatchingEvidenceRef:
      planReady ? input.requestBatchingEvidenceRef : null,
    maxChannelIdsPerCall:
      planReady ? input.maxChannelIdsPerCall : null,
    maxVideoIdsPerCall:
      planReady ? input.maxVideoIdsPerCall : null,
    providerBatchLimitEvidenceRef:
      planReady ? input.providerBatchLimitEvidenceRef : null,
    automaticProviderCallAllowed: false as const,
    collectionExecutionAuthorized: false as const,
    schedulerMutationAllowed: false as const,
    deploymentAuthorized: false as const,
    providerSubmissionAuthorized: false as const,
    arbitraryCadenceApplied: false as const,
    arbitraryMeasurementWindowApplied: false as const,
    arbitraryProviderLimitApplied: false as const,
  });
}
