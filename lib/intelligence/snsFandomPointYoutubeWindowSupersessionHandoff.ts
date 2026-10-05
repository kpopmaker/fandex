export const SNS_FANDOM_YOUTUBE_WINDOW_SUPERSESSION_HANDOFF_VERSION =
  'sns-fandom-youtube-window-supersession-handoff-v1' as const;

export const SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_START =
  '2026-10-03T15:00:00.000Z' as const;

export const SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_END =
  '2027-10-04T15:00:00.000Z' as const;

export const SNS_FANDOM_YOUTUBE_WINDOW_DURATION_DAYS = 366 as const;
export const SNS_FANDOM_YOUTUBE_REACTION_SNAPSHOT_RUNS_PER_DAY = 24 as const;

export const SNS_FANDOM_YOUTUBE_WINDOW_SUPERSESSION_REASON =
  'initial-recurring-coverage-gap-no-retrospective-receipt-contract' as const;

const DAY_MS = 24 * 60 * 60 * 1_000;

export type SnsFandomYoutubeWindowSupersessionActivation = Readonly<{
  enabled: boolean;
  recurringExecutionAuthorized: boolean;
  schedulerMutationAuthorized: boolean;
  activationEvidenceRef: string | null;
  authorizedRevisionSha: string | null;
  activationBoundary: string | null;
  runtimeBound: boolean;
  evidenceStoreBound: boolean;
}>;

export type SnsFandomYoutubeWindowSupersessionHandoffInput = Readonly<{
  currentRevisionSha: string;
  historicalMeasurementWindowStart: string;
  historicalMeasurementWindowEnd: string;
  reactionSnapshotRunsPerDay: number;
  cadenceEvidenceRef: string;
  policyApprovalEvidenceRef: string;
  activation: SnsFandomYoutubeWindowSupersessionActivation;
}>;

export type SnsFandomYoutubeWindowSupersessionCandidate = Readonly<{
  priorMeasurementWindowStart:
    typeof SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_START;
  priorMeasurementWindowEnd:
    typeof SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_END;
  priorWindowState: 'historical-owner-intent-only';
  measurementWindowStart: string;
  measurementWindowEnd: string;
  durationDays: typeof SNS_FANDOM_YOUTUBE_WINDOW_DURATION_DAYS;
  reactionSnapshotRunsPerDay:
    typeof SNS_FANDOM_YOUTUBE_REACTION_SNAPSHOT_RUNS_PER_DAY;
  cadenceEvidenceRef: string;
  supersessionReason:
    typeof SNS_FANDOM_YOUTUBE_WINDOW_SUPERSESSION_REASON;
  policyApprovalEvidenceRef: string;
  recurringActivationEvidenceRef: string;
  authorizedRevisionSha: string;
  syntheticBackfillAllowed: false;
  retrospectiveReceiptSynthesisAllowed: false;
}>;

export type SnsFandomYoutubeWindowSupersessionHandoffResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_YOUTUBE_WINDOW_SUPERSESSION_HANDOFF_VERSION;
  state:
    | 'policy-approved-awaiting-recurring-activation'
    | 'supersession-candidate-ready'
    | 'blocked';
  blockers: readonly string[];
  historicalWindow: Readonly<{
    measurementWindowStart:
      typeof SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_START;
    measurementWindowEnd:
      typeof SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_END;
    state: 'historical-owner-intent-only';
  }>;
  candidate: SnsFandomYoutubeWindowSupersessionCandidate | null;
  supersessionPolicyApproved: boolean;
  syntheticBackfillAllowed: false;
  retrospectiveProviderObservationAllowed: false;
  schedulerMutationAuthorizedBySupersession: false;
  recurringProviderExecutionAuthorizedBySupersession: false;
  productionCollectionAuthorizedBySupersession: false;
  providerSubmissionAuthorized: false;
  productActivationAuthorized: false;
}>;

function validSha(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

function exactIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function exactUtcHour(value: string): boolean {
  if (!exactIso(value)) return false;
  const date = new Date(value);
  return date.getUTCMinutes() === 0
    && date.getUTCSeconds() === 0
    && date.getUTCMilliseconds() === 0;
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

function durablePolicyApprovalRef(value: string): boolean {
  return /^github-issue:\/\/kpopmaker\/fandex\/issues\/495#issuecomment-[1-9][0-9]*$/.test(
    value,
  );
}

function durableRecurringActivationRef(value: string): boolean {
  return /^github-issue:\/\/kpopmaker\/fandex\/issues\/489#issuecomment-[1-9][0-9]*$/.test(
    value,
  );
}

function historicalWindow() {
  return Object.freeze({
    measurementWindowStart: SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_START,
    measurementWindowEnd: SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_END,
    state: 'historical-owner-intent-only' as const,
  });
}

function result(
  state: SnsFandomYoutubeWindowSupersessionHandoffResult['state'],
  blockers: readonly string[],
  supersessionPolicyApproved: boolean,
  candidate: SnsFandomYoutubeWindowSupersessionCandidate | null = null,
): SnsFandomYoutubeWindowSupersessionHandoffResult {
  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_WINDOW_SUPERSESSION_HANDOFF_VERSION,
    state,
    blockers: Object.freeze(Array.from(new Set(blockers)).sort()),
    historicalWindow: historicalWindow(),
    candidate,
    supersessionPolicyApproved,
    syntheticBackfillAllowed: false as const,
    retrospectiveProviderObservationAllowed: false as const,
    schedulerMutationAuthorizedBySupersession: false as const,
    recurringProviderExecutionAuthorizedBySupersession: false as const,
    productionCollectionAuthorizedBySupersession: false as const,
    providerSubmissionAuthorized: false as const,
    productActivationAuthorized: false as const,
  });
}

export function evaluateSnsFandomYoutubeWindowSupersessionHandoff(
  input: SnsFandomYoutubeWindowSupersessionHandoffInput,
): SnsFandomYoutubeWindowSupersessionHandoffResult {
  const policyBlockers: string[] = [];

  if (!validSha(input.currentRevisionSha)) {
    policyBlockers.push('youtube-window-supersession-current-revision-invalid');
  }
  if (
    input.historicalMeasurementWindowStart
      !== SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_START
    || input.historicalMeasurementWindowEnd
      !== SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_END
  ) {
    policyBlockers.push('youtube-window-supersession-historical-window-drift');
  }
  if (
    input.reactionSnapshotRunsPerDay
      !== SNS_FANDOM_YOUTUBE_REACTION_SNAPSHOT_RUNS_PER_DAY
  ) {
    policyBlockers.push('youtube-window-supersession-cadence-drift');
  }
  if (
    !durablePolicyApprovalRef(input.policyApprovalEvidenceRef)
    || secretLike(input.policyApprovalEvidenceRef)
  ) {
    policyBlockers.push('youtube-window-supersession-policy-approval-invalid');
  }
  if (
    input.cadenceEvidenceRef.trim().length === 0
    || secretLike(input.cadenceEvidenceRef)
  ) {
    policyBlockers.push('youtube-window-supersession-cadence-evidence-invalid');
  }

  if (policyBlockers.length > 0) {
    return result('blocked', policyBlockers, false);
  }

  const activation = input.activation;
  const completelyInactive =
    activation.enabled === false
    && activation.recurringExecutionAuthorized === false
    && activation.schedulerMutationAuthorized === false
    && activation.activationEvidenceRef === null
    && activation.authorizedRevisionSha === null
    && activation.activationBoundary === null
    && activation.runtimeBound === false
    && activation.evidenceStoreBound === false;

  if (completelyInactive) {
    return result(
      'policy-approved-awaiting-recurring-activation',
      [],
      true,
    );
  }

  const activationBlockers: string[] = [];

  if (!activation.enabled) {
    activationBlockers.push('youtube-window-supersession-recurring-runner-disabled');
  }
  if (!activation.recurringExecutionAuthorized) {
    activationBlockers.push(
      'youtube-window-supersession-recurring-execution-not-authorized',
    );
  }
  if (!activation.schedulerMutationAuthorized) {
    activationBlockers.push(
      'youtube-window-supersession-scheduler-mutation-not-authorized',
    );
  }
  if (!activation.runtimeBound) {
    activationBlockers.push('youtube-window-supersession-runtime-not-bound');
  }
  if (!activation.evidenceStoreBound) {
    activationBlockers.push(
      'youtube-window-supersession-evidence-store-not-bound',
    );
  }

  if (
    activation.activationEvidenceRef === null
    || !durableRecurringActivationRef(activation.activationEvidenceRef)
    || secretLike(activation.activationEvidenceRef)
  ) {
    activationBlockers.push(
      'youtube-window-supersession-activation-evidence-invalid',
    );
  }

  if (
    activation.authorizedRevisionSha === null
    || !validSha(activation.authorizedRevisionSha)
  ) {
    activationBlockers.push(
      'youtube-window-supersession-authorized-revision-invalid',
    );
  } else if (activation.authorizedRevisionSha !== input.currentRevisionSha) {
    activationBlockers.push(
      'youtube-window-supersession-authorized-revision-stale',
    );
  }

  if (
    activation.activationBoundary === null
    || !exactUtcHour(activation.activationBoundary)
  ) {
    activationBlockers.push(
      'youtube-window-supersession-activation-boundary-invalid',
    );
  } else if (
    Date.parse(activation.activationBoundary)
      <= Date.parse(SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_START)
  ) {
    activationBlockers.push(
      'youtube-window-supersession-activation-boundary-not-after-historical-start',
    );
  }

  if (activationBlockers.length > 0) {
    return result('blocked', activationBlockers, true);
  }

  const measurementWindowStart = activation.activationBoundary as string;
  const measurementWindowEnd = new Date(
    Date.parse(measurementWindowStart)
      + SNS_FANDOM_YOUTUBE_WINDOW_DURATION_DAYS * DAY_MS,
  ).toISOString();

  const candidate = Object.freeze({
    priorMeasurementWindowStart: SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_START,
    priorMeasurementWindowEnd: SNS_FANDOM_YOUTUBE_HISTORICAL_WINDOW_END,
    priorWindowState: 'historical-owner-intent-only' as const,
    measurementWindowStart,
    measurementWindowEnd,
    durationDays: SNS_FANDOM_YOUTUBE_WINDOW_DURATION_DAYS,
    reactionSnapshotRunsPerDay:
      SNS_FANDOM_YOUTUBE_REACTION_SNAPSHOT_RUNS_PER_DAY,
    cadenceEvidenceRef: input.cadenceEvidenceRef,
    supersessionReason: SNS_FANDOM_YOUTUBE_WINDOW_SUPERSESSION_REASON,
    policyApprovalEvidenceRef: input.policyApprovalEvidenceRef,
    recurringActivationEvidenceRef:
      activation.activationEvidenceRef as string,
    authorizedRevisionSha: activation.authorizedRevisionSha as string,
    syntheticBackfillAllowed: false as const,
    retrospectiveReceiptSynthesisAllowed: false as const,
  });

  return result(
    'supersession-candidate-ready',
    [],
    true,
    candidate,
  );
}
