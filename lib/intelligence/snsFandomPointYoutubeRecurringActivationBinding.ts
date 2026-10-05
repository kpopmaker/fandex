export const SNS_FANDOM_YOUTUBE_RECURRING_ACTIVATION_BINDING_VERSION =
  'sns-fandom-youtube-recurring-activation-binding-v1' as const;

export const SNS_FANDOM_YOUTUBE_RECURRING_DURATION_DAYS = 366 as const;
export const SNS_FANDOM_YOUTUBE_RECURRING_RUNS_PER_DAY = 24 as const;

const DAY_MS = 24 * 60 * 60 * 1_000;

export type SnsFandomYoutubeRecurringActivationBindingInput = Readonly<{
  currentRevisionSha: string;
  now: string;
  enabled: boolean;
  recurringExecutionAuthorized: boolean;
  schedulerMutationAuthorized: boolean;
  activationAuthorizationEvidenceRef: string | null;
  authorizedRevisionSha: string | null;
  runtimeBound: boolean;
  evidenceStoreBound: boolean;
  evidenceStoreCredentialLocatorRef: string | null;
}>;

export type SnsFandomYoutubeRecurringActivationBindingResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_YOUTUBE_RECURRING_ACTIVATION_BINDING_VERSION;
  state:
    | 'owner-authorized-awaiting-bindings'
    | 'activation-invalid'
    | 'activation-candidate-ready';
  activationBoundary: string | null;
  measurementWindowStart: string | null;
  measurementWindowEnd: string | null;
  durationDays: 366;
  reactionSnapshotRunsPerDay: 24;
  activationAuthorizationEvidenceRef: string | null;
  authorizedRevisionSha: string | null;
  evidenceStoreCredentialLocatorRef: string | null;
  schedulerActivationCandidate: boolean;
  recurringProviderExecutionCandidate: boolean;
  retrospectiveBackfillAllowed: false;
  providerSubmissionAuthorized: false;
  productionCollectionAuthorized: false;
  productActivationAuthorized: false;
  blockers: readonly string[];
}>;

function validSha(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
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

function durableActivationAuthorizationRef(value: string): boolean {
  return /^github-issue:\/\/kpopmaker\/fandex\/issues\/498#issuecomment-[1-9][0-9]*$/.test(
    value,
  );
}

function safeCredentialLocator(value: string): boolean {
  return /^github-actions-secret:\/\/[A-Z0-9_]+$/.test(value)
    && !secretLike(value);
}

function floorUtcHour(value: string): string {
  const date = new Date(value);
  date.setUTCMinutes(0, 0, 0);
  return date.toISOString();
}

function result(
  input: SnsFandomYoutubeRecurringActivationBindingInput,
  state: SnsFandomYoutubeRecurringActivationBindingResult['state'],
  blockers: readonly string[],
  boundary: string | null = null,
): SnsFandomYoutubeRecurringActivationBindingResult {
  const ready = state === 'activation-candidate-ready';
  const end = ready && boundary !== null
    ? new Date(
        Date.parse(boundary)
          + SNS_FANDOM_YOUTUBE_RECURRING_DURATION_DAYS * DAY_MS,
      ).toISOString()
    : null;

  return Object.freeze({
    contractVersion:
      SNS_FANDOM_YOUTUBE_RECURRING_ACTIVATION_BINDING_VERSION,
    state,
    activationBoundary: ready ? boundary : null,
    measurementWindowStart: ready ? boundary : null,
    measurementWindowEnd: end,
    durationDays: SNS_FANDOM_YOUTUBE_RECURRING_DURATION_DAYS,
    reactionSnapshotRunsPerDay:
      SNS_FANDOM_YOUTUBE_RECURRING_RUNS_PER_DAY,
    activationAuthorizationEvidenceRef:
      present(input.activationAuthorizationEvidenceRef)
        ? input.activationAuthorizationEvidenceRef
        : null,
    authorizedRevisionSha:
      present(input.authorizedRevisionSha)
        ? input.authorizedRevisionSha
        : null,
    evidenceStoreCredentialLocatorRef:
      present(input.evidenceStoreCredentialLocatorRef)
        ? input.evidenceStoreCredentialLocatorRef
        : null,
    schedulerActivationCandidate: ready,
    recurringProviderExecutionCandidate: ready,
    retrospectiveBackfillAllowed: false,
    providerSubmissionAuthorized: false,
    productionCollectionAuthorized: false,
    productActivationAuthorized: false,
    blockers: Object.freeze(Array.from(new Set(blockers)).sort()),
  });
}

export function evaluateSnsFandomYoutubeRecurringActivationBinding(
  input: SnsFandomYoutubeRecurringActivationBindingInput,
): SnsFandomYoutubeRecurringActivationBindingResult {
  const blockers: string[] = [];

  if (!input.recurringExecutionAuthorized) {
    blockers.push('sns-fandom-recurring-execution-owner-authorization-missing');
  }
  if (!input.schedulerMutationAuthorized) {
    blockers.push('sns-fandom-recurring-scheduler-owner-authorization-missing');
  }
  if (!present(input.activationAuthorizationEvidenceRef)) {
    blockers.push('sns-fandom-recurring-activation-authorization-evidence-missing');
  } else if (
    !durableActivationAuthorizationRef(
      input.activationAuthorizationEvidenceRef,
    )
    || secretLike(input.activationAuthorizationEvidenceRef)
  ) {
    blockers.push('sns-fandom-recurring-activation-authorization-evidence-invalid');
  }

  if (blockers.length > 0) {
    return result(input, 'activation-invalid', blockers);
  }

  const bindingMissing =
    !input.enabled
    || !present(input.authorizedRevisionSha)
    || !input.runtimeBound
    || !input.evidenceStoreBound
    || !present(input.evidenceStoreCredentialLocatorRef);

  if (bindingMissing) {
    return result(
      input,
      'owner-authorized-awaiting-bindings',
      ['sns-fandom-recurring-activation-bindings-incomplete'],
    );
  }

  if (!validSha(input.currentRevisionSha)) {
    blockers.push('sns-fandom-recurring-current-revision-invalid');
  }
  if (!validSha(input.authorizedRevisionSha as string)) {
    blockers.push('sns-fandom-recurring-authorized-revision-invalid');
  } else if (input.authorizedRevisionSha !== input.currentRevisionSha) {
    blockers.push('sns-fandom-recurring-authorized-revision-stale');
  }

  if (
    !safeCredentialLocator(
      input.evidenceStoreCredentialLocatorRef as string,
    )
  ) {
    blockers.push('sns-fandom-recurring-evidence-store-locator-invalid');
  }

  if (!validIso(input.now)) {
    blockers.push('sns-fandom-recurring-activation-time-invalid');
  }

  if (blockers.length > 0) {
    return result(input, 'activation-invalid', blockers);
  }

  const boundary = floorUtcHour(input.now);
  return result(input, 'activation-candidate-ready', [], boundary);
}
