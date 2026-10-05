export const SNS_FANDOM_YOUTUBE_RECURRING_MEASUREMENT_VERSION =
  'sns-fandom-youtube-recurring-measurement-v1' as const;

export const SNS_FANDOM_YOUTUBE_RECURRING_AUDIT_MANIFEST_ID =
  'sns-fandom-youtube-audit-cohort-v1' as const;

export const SNS_FANDOM_YOUTUBE_RECURRING_ENDPOINTS = Object.freeze([
  'youtube.channels.list',
  'youtube.playlistItems.list',
  'youtube.videos.list',
] as const);

export type SnsFandomYoutubeRecurringMeasurementActivation = Readonly<{
  enabled: boolean;
  recurringExecutionAuthorized: boolean;
  schedulerMutationAuthorized: boolean;
  activationEvidenceRef: string | null;
  authorizedRevisionSha: string | null;
}>;

export type SnsFandomYoutubeRecurringMeasurementPlanInput = Readonly<{
  currentRevisionSha: string;
  now: string;
  measurementWindowStart: string;
  measurementWindowEnd: string;
  reactionSnapshotRunsPerDay: number;
  activation: SnsFandomYoutubeRecurringMeasurementActivation;
}>;

export type SnsFandomYoutubeRecurringMeasurementPlan = Readonly<{
  contractVersion: typeof SNS_FANDOM_YOUTUBE_RECURRING_MEASUREMENT_VERSION;
  state:
    | 'disabled'
    | 'invalid'
    | 'before-window'
    | 'window-complete'
    | 'slot-ready';
  slotStart: string | null;
  measurementWindowStart: string;
  measurementWindowEnd: string;
  reactionSnapshotRunsPerDay: 24 | null;
  auditManifestId:
    | typeof SNS_FANDOM_YOUTUBE_RECURRING_AUDIT_MANIFEST_ID
    | null;
  requestedEndpoints:
    | typeof SNS_FANDOM_YOUTUBE_RECURRING_ENDPOINTS
    | null;
  requestBatchingStrategy:
    | 'singleton-only-until-provider-batch-limit-evidence'
    | null;
  channelIdsPerCall: 1 | null;
  videoIdsPerCall: 1 | null;
  commentEndpointsAllowed: false;
  providerQuotaUnitsPerCall:
    | Readonly<{
      channelsList: 1;
      playlistItemsList: 1;
      videosList: 1;
    }>
    | null;
  providerSubmissionAuthorized: false;
  productionCollectionAuthorized: false;
  productActivationAuthorized: false;
  blockers: readonly string[];
}>;

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function validSha(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

function present(value: string | null): value is string {
  return value !== null && value.trim().length > 0;
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

function durableActivationRef(value: string): boolean {
  return /^github-issue:\/\/kpopmaker\/fandex\/issues\/489#issuecomment-[1-9][0-9]*$/.test(
    value,
  );
}

function floorUtcHour(value: string): string {
  const date = new Date(value);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function baseResult(
  input: SnsFandomYoutubeRecurringMeasurementPlanInput,
  state: SnsFandomYoutubeRecurringMeasurementPlan['state'],
  blockers: readonly string[],
  slotStart: string | null = null,
): SnsFandomYoutubeRecurringMeasurementPlan {
  const ready = state === 'slot-ready';
  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_RECURRING_MEASUREMENT_VERSION,
    state,
    slotStart,
    measurementWindowStart: input.measurementWindowStart,
    measurementWindowEnd: input.measurementWindowEnd,
    reactionSnapshotRunsPerDay:
      input.reactionSnapshotRunsPerDay === 24 ? 24 : null,
    auditManifestId: ready
      ? SNS_FANDOM_YOUTUBE_RECURRING_AUDIT_MANIFEST_ID
      : null,
    requestedEndpoints: ready
      ? SNS_FANDOM_YOUTUBE_RECURRING_ENDPOINTS
      : null,
    requestBatchingStrategy: ready
      ? 'singleton-only-until-provider-batch-limit-evidence'
      : null,
    channelIdsPerCall: ready ? 1 : null,
    videoIdsPerCall: ready ? 1 : null,
    commentEndpointsAllowed: false,
    providerQuotaUnitsPerCall: ready
      ? Object.freeze({
        channelsList: 1 as const,
        playlistItemsList: 1 as const,
        videosList: 1 as const,
      })
      : null,
    providerSubmissionAuthorized: false,
    productionCollectionAuthorized: false,
    productActivationAuthorized: false,
    blockers: Object.freeze(Array.from(new Set(blockers)).sort()),
  });
}

export function evaluateSnsFandomYoutubeRecurringMeasurementPlan(
  input: SnsFandomYoutubeRecurringMeasurementPlanInput,
): SnsFandomYoutubeRecurringMeasurementPlan {
  const blockers: string[] = [];

  if (!validSha(input.currentRevisionSha)) {
    blockers.push('sns-fandom-recurring-current-revision-invalid');
  }
  if (!validIso(input.now)) {
    blockers.push('sns-fandom-recurring-now-invalid');
  }
  if (!validIso(input.measurementWindowStart)) {
    blockers.push('sns-fandom-recurring-window-start-invalid');
  }
  if (!validIso(input.measurementWindowEnd)) {
    blockers.push('sns-fandom-recurring-window-end-invalid');
  }
  if (
    validIso(input.measurementWindowStart)
    && validIso(input.measurementWindowEnd)
    && Date.parse(input.measurementWindowStart)
      >= Date.parse(input.measurementWindowEnd)
  ) {
    blockers.push('sns-fandom-recurring-window-order-invalid');
  }
  if (input.reactionSnapshotRunsPerDay !== 24) {
    blockers.push('sns-fandom-recurring-cadence-not-24-per-day');
  }

  if (blockers.length > 0) {
    return baseResult(input, 'invalid', blockers);
  }

  const activation = input.activation;
  if (
    !activation.enabled
    || !activation.recurringExecutionAuthorized
    || !activation.schedulerMutationAuthorized
  ) {
    return baseResult(
      input,
      'disabled',
      ['sns-fandom-recurring-explicit-activation-required'],
    );
  }

  if (!present(activation.activationEvidenceRef)) {
    blockers.push('sns-fandom-recurring-activation-evidence-missing');
  } else {
    if (!durableActivationRef(activation.activationEvidenceRef)) {
      blockers.push('sns-fandom-recurring-activation-evidence-invalid');
    }
    if (secretLike(activation.activationEvidenceRef)) {
      blockers.push('sns-fandom-recurring-activation-evidence-secret-like');
    }
  }

  if (!present(activation.authorizedRevisionSha)) {
    blockers.push('sns-fandom-recurring-authorized-revision-missing');
  } else if (!validSha(activation.authorizedRevisionSha)) {
    blockers.push('sns-fandom-recurring-authorized-revision-invalid');
  } else if (activation.authorizedRevisionSha !== input.currentRevisionSha) {
    blockers.push('sns-fandom-recurring-authorized-revision-stale');
  }

  if (blockers.length > 0) {
    return baseResult(input, 'invalid', blockers);
  }

  const nowMs = Date.parse(input.now);
  const startMs = Date.parse(input.measurementWindowStart);
  const endMs = Date.parse(input.measurementWindowEnd);

  if (nowMs < startMs) {
    return baseResult(input, 'before-window', []);
  }
  if (nowMs >= endMs) {
    return baseResult(input, 'window-complete', []);
  }

  const slotStart = floorUtcHour(input.now);
  if (
    Date.parse(slotStart) < startMs
    || Date.parse(slotStart) >= endMs
  ) {
    return baseResult(
      input,
      'invalid',
      ['sns-fandom-recurring-slot-outside-window'],
    );
  }

  return baseResult(input, 'slot-ready', [], slotStart);
}
