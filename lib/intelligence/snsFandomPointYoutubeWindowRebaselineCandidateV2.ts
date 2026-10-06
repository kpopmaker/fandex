export const SNS_FANDOM_YOUTUBE_WINDOW_REBASELINE_CANDIDATE_V2 =
  'sns-fandom-youtube-window-rebaseline-candidate-v2' as const;

export const SNS_FANDOM_YOUTUBE_CURRENT_MATERIALIZED_WINDOW_START =
  '2026-10-05T22:00:00.000Z' as const;

export const SNS_FANDOM_YOUTUBE_CURRENT_MATERIALIZED_WINDOW_END =
  '2027-10-06T22:00:00.000Z' as const;

export const SNS_FANDOM_YOUTUBE_RENDER_RELIABLE_BOUNDARY =
  '2026-10-06T15:00:00.000Z' as const;

export const SNS_FANDOM_YOUTUBE_RENDER_CONTINUITY_OBSERVED_THROUGH =
  '2026-10-06T23:00:00.000Z' as const;

export const SNS_FANDOM_YOUTUBE_RENDER_SERVICE_ID =
  'crn-db2ekl6i0phs73ederu0' as const;

export const SNS_FANDOM_YOUTUBE_RENDER_SCHEDULE = '7 * * * *' as const;

export const SNS_FANDOM_YOUTUBE_AUTHORIZED_PROVIDER_RUNTIME_SHA =
  'f030eaf54be5a08d517a7712dafb1596cb541ba6' as const;

export const SNS_FANDOM_YOUTUBE_REBASELINE_EVIDENCE_REF =
  'github-issue://kpopmaker/fandex/issues/509#issuecomment-6027539700' as const;

export const SNS_FANDOM_YOUTUBE_WINDOW_DURATION_DAYS_V2 = 366 as const;
export const SNS_FANDOM_YOUTUBE_REACTION_SNAPSHOT_RUNS_PER_DAY_V2 = 24 as const;

const HOUR_MS = 60 * 60 * 1_000;
const DAY_MS = 24 * HOUR_MS;

export type SnsFandomYoutubeWindowRebaselineCandidateV2Input = Readonly<{
  currentMaterializedWindowStart: string;
  currentMaterializedWindowEnd: string;
  renderServiceId: string;
  renderSchedule: string;
  authorizedProviderRuntimeSha: string;
  continuityEvidenceRef: string;
  observedFirstSlotStart: string;
  observedLastSlotStart: string;
  observedConsecutiveSlotCount: number;
  rebaselineAuthorized: boolean;
  canonicalMutationPerformed: boolean;
}>;

export type SnsFandomYoutubeWindowRebaselineCandidateV2 = Readonly<{
  priorMeasurementWindowStart:
    typeof SNS_FANDOM_YOUTUBE_CURRENT_MATERIALIZED_WINDOW_START;
  priorMeasurementWindowEnd:
    typeof SNS_FANDOM_YOUTUBE_CURRENT_MATERIALIZED_WINDOW_END;
  priorWindowState: 'materialized-with-observed-continuity-gaps';
  measurementWindowStart: string;
  measurementWindowEnd: string;
  durationDays: typeof SNS_FANDOM_YOUTUBE_WINDOW_DURATION_DAYS_V2;
  reactionSnapshotRunsPerDay:
    typeof SNS_FANDOM_YOUTUBE_REACTION_SNAPSHOT_RUNS_PER_DAY_V2;
  schedulerAuthority: 'render-cron-to-github-workflow-dispatch';
  renderServiceId: typeof SNS_FANDOM_YOUTUBE_RENDER_SERVICE_ID;
  renderSchedule: typeof SNS_FANDOM_YOUTUBE_RENDER_SCHEDULE;
  authorizedProviderRuntimeSha:
    typeof SNS_FANDOM_YOUTUBE_AUTHORIZED_PROVIDER_RUNTIME_SHA;
  continuityEvidenceRef: typeof SNS_FANDOM_YOUTUBE_REBASELINE_EVIDENCE_REF;
  observedFirstSlotStart: string;
  observedLastSlotStart: string;
  observedConsecutiveSlotCount: number;
  syntheticBackfillAllowed: false;
  retrospectiveReceiptSynthesisAllowed: false;
  retrospectiveProviderObservationAllowed: false;
}>;

export type SnsFandomYoutubeWindowRebaselineCandidateV2Result = Readonly<{
  contractVersion: typeof SNS_FANDOM_YOUTUBE_WINDOW_REBASELINE_CANDIDATE_V2;
  state:
    | 'candidate-ready-owner-approval-required'
    | 'authorized-candidate-ready'
    | 'blocked';
  blockers: readonly string[];
  candidate: SnsFandomYoutubeWindowRebaselineCandidateV2 | null;
  rebaselineAuthorized: boolean;
  canonicalMutationPerformed: boolean;
  schedulerMutationAuthorizedByCandidate: false;
  recurringProviderExecutionAuthorizedByCandidate: false;
  providerSubmissionAuthorized: false;
  productionCollectionAuthorized: false;
  productActivationAuthorized: false;
}>;

function exactIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function exactUtcHour(value: string): boolean {
  if (!exactIso(value)) return false;
  const d = new Date(value);
  return d.getUTCMinutes() === 0
    && d.getUTCSeconds() === 0
    && d.getUTCMilliseconds() === 0;
}

function validSha(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

function result(
  state: SnsFandomYoutubeWindowRebaselineCandidateV2Result['state'],
  blockers: readonly string[],
  input: SnsFandomYoutubeWindowRebaselineCandidateV2Input,
  candidate: SnsFandomYoutubeWindowRebaselineCandidateV2 | null,
): SnsFandomYoutubeWindowRebaselineCandidateV2Result {
  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_WINDOW_REBASELINE_CANDIDATE_V2,
    state,
    blockers: Object.freeze(Array.from(new Set(blockers)).sort()),
    candidate,
    rebaselineAuthorized: input.rebaselineAuthorized,
    canonicalMutationPerformed: input.canonicalMutationPerformed,
    schedulerMutationAuthorizedByCandidate: false as const,
    recurringProviderExecutionAuthorizedByCandidate: false as const,
    providerSubmissionAuthorized: false as const,
    productionCollectionAuthorized: false as const,
    productActivationAuthorized: false as const,
  });
}

export function evaluateSnsFandomYoutubeWindowRebaselineCandidateV2(
  input: SnsFandomYoutubeWindowRebaselineCandidateV2Input,
): SnsFandomYoutubeWindowRebaselineCandidateV2Result {
  const blockers: string[] = [];

  if (
    input.currentMaterializedWindowStart
      !== SNS_FANDOM_YOUTUBE_CURRENT_MATERIALIZED_WINDOW_START
    || input.currentMaterializedWindowEnd
      !== SNS_FANDOM_YOUTUBE_CURRENT_MATERIALIZED_WINDOW_END
  ) {
    blockers.push('youtube-window-rebaseline-current-window-drift');
  }

  if (input.renderServiceId !== SNS_FANDOM_YOUTUBE_RENDER_SERVICE_ID) {
    blockers.push('youtube-window-rebaseline-render-service-drift');
  }

  if (input.renderSchedule !== SNS_FANDOM_YOUTUBE_RENDER_SCHEDULE) {
    blockers.push('youtube-window-rebaseline-render-schedule-drift');
  }

  if (
    input.authorizedProviderRuntimeSha
      !== SNS_FANDOM_YOUTUBE_AUTHORIZED_PROVIDER_RUNTIME_SHA
    || !validSha(input.authorizedProviderRuntimeSha)
  ) {
    blockers.push('youtube-window-rebaseline-provider-runtime-drift');
  }

  if (
    input.continuityEvidenceRef
      !== SNS_FANDOM_YOUTUBE_REBASELINE_EVIDENCE_REF
  ) {
    blockers.push('youtube-window-rebaseline-continuity-evidence-invalid');
  }

  if (
    !exactUtcHour(input.observedFirstSlotStart)
    || !exactUtcHour(input.observedLastSlotStart)
  ) {
    blockers.push('youtube-window-rebaseline-observed-slot-invalid');
  }

  const firstMs = Date.parse(input.observedFirstSlotStart);
  const lastMs = Date.parse(input.observedLastSlotStart);

  if (
    Number.isFinite(firstMs)
    && Number.isFinite(lastMs)
    && lastMs >= firstMs
  ) {
    const derivedConsecutiveSlotCount = ((lastMs - firstMs) / HOUR_MS) + 1;
    if (!Number.isInteger(derivedConsecutiveSlotCount)) {
      blockers.push('youtube-window-rebaseline-observed-slot-span-invalid');
    } else if (
      input.observedConsecutiveSlotCount !== derivedConsecutiveSlotCount
    ) {
      blockers.push('youtube-window-rebaseline-consecutive-count-drift');
    }
  } else {
    blockers.push('youtube-window-rebaseline-observed-slot-order-invalid');
  }

  if (
    input.observedFirstSlotStart
      !== SNS_FANDOM_YOUTUBE_RENDER_RELIABLE_BOUNDARY
  ) {
    blockers.push('youtube-window-rebaseline-first-render-slot-drift');
  }

  if (
    input.observedLastSlotStart
      !== SNS_FANDOM_YOUTUBE_RENDER_CONTINUITY_OBSERVED_THROUGH
  ) {
    blockers.push('youtube-window-rebaseline-observed-through-drift');
  }

  if (input.canonicalMutationPerformed && !input.rebaselineAuthorized) {
    blockers.push('youtube-window-rebaseline-mutation-without-authorization');
  }

  if (blockers.length > 0) {
    return result('blocked', blockers, input, null);
  }

  const measurementWindowStart = input.observedFirstSlotStart;
  const measurementWindowEnd = new Date(
    Date.parse(measurementWindowStart)
      + SNS_FANDOM_YOUTUBE_WINDOW_DURATION_DAYS_V2 * DAY_MS,
  ).toISOString();

  const candidate = Object.freeze({
    priorMeasurementWindowStart:
      SNS_FANDOM_YOUTUBE_CURRENT_MATERIALIZED_WINDOW_START,
    priorMeasurementWindowEnd:
      SNS_FANDOM_YOUTUBE_CURRENT_MATERIALIZED_WINDOW_END,
    priorWindowState: 'materialized-with-observed-continuity-gaps' as const,
    measurementWindowStart,
    measurementWindowEnd,
    durationDays: SNS_FANDOM_YOUTUBE_WINDOW_DURATION_DAYS_V2,
    reactionSnapshotRunsPerDay:
      SNS_FANDOM_YOUTUBE_REACTION_SNAPSHOT_RUNS_PER_DAY_V2,
    schedulerAuthority:
      'render-cron-to-github-workflow-dispatch' as const,
    renderServiceId: SNS_FANDOM_YOUTUBE_RENDER_SERVICE_ID,
    renderSchedule: SNS_FANDOM_YOUTUBE_RENDER_SCHEDULE,
    authorizedProviderRuntimeSha:
      SNS_FANDOM_YOUTUBE_AUTHORIZED_PROVIDER_RUNTIME_SHA,
    continuityEvidenceRef: SNS_FANDOM_YOUTUBE_REBASELINE_EVIDENCE_REF,
    observedFirstSlotStart: input.observedFirstSlotStart,
    observedLastSlotStart: input.observedLastSlotStart,
    observedConsecutiveSlotCount: input.observedConsecutiveSlotCount,
    syntheticBackfillAllowed: false as const,
    retrospectiveReceiptSynthesisAllowed: false as const,
    retrospectiveProviderObservationAllowed: false as const,
  });

  return result(
    input.rebaselineAuthorized
      ? 'authorized-candidate-ready'
      : 'candidate-ready-owner-approval-required',
    [],
    input,
    candidate,
  );
}
