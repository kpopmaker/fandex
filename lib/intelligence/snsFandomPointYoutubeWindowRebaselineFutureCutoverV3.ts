export const SNS_FANDOM_YOUTUBE_WINDOW_REBASELINE_FUTURE_CUTOVER_V3 =
  'sns-fandom-youtube-window-rebaseline-future-cutover-v3' as const;

export const SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_START =
  '2026-10-05T22:00:00.000Z' as const;
export const SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_END =
  '2027-10-06T22:00:00.000Z' as const;
export const SNS_FANDOM_YOUTUBE_NEXT_GENERATION_ROOT =
  'sns-fandom/youtube-audit/recurring/v2' as const;
export const SNS_FANDOM_YOUTUBE_REBASELINE_CORRECTION_EVIDENCE_REF =
  'github-issue://kpopmaker/fandex/issues/509#issuecomment-6027895747' as const;

const WINDOW_DURATION_MS = 366 * 24 * 60 * 60 * 1_000;

export type SnsFandomYoutubeWindowRebaselineFutureCutoverV3Input = Readonly<{
  currentMeasurementWindowStart: string;
  currentMeasurementWindowEnd: string;
  nextGenerationRoot: string;
  correctionEvidenceRef: string;
  canonicalRebaselineAuthorized: boolean;
  newGenerationProviderExecutionAuthorized: boolean;
  schedulerCutoverAuthorized: boolean;
  newGenerationRuntimeBound: boolean;
  newGenerationEvidenceStoreBound: boolean;
  firstSuccessfulNewGenerationSlotStart: string | null;
  firstSuccessfulNewGenerationReceiptRef: string | null;
  canonicalMutationPerformed: boolean;
}>;

export type SnsFandomYoutubeWindowRebaselineFutureCutoverV3Result = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_YOUTUBE_WINDOW_REBASELINE_FUTURE_CUTOVER_V3;
  state:
    | 'prepared-awaiting-owner-authorization'
    | 'authorized-awaiting-first-successful-new-generation-slot'
    | 'cutover-materialization-ready'
    | 'blocked';
  blockers: readonly string[];
  nextGenerationRoot: typeof SNS_FANDOM_YOUTUBE_NEXT_GENERATION_ROOT;
  measurementWindowStart: string | null;
  measurementWindowEnd: string | null;
  canonicalRebaselineAuthorized: boolean;
  canonicalMutationPerformed: boolean;
  historicalV1ReceiptsReinterpreted: false;
  syntheticBackfillAllowed: false;
  retrospectiveReceiptSynthesisAllowed: false;
  retrospectiveProviderObservationAllowed: false;
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

function result(
  state: SnsFandomYoutubeWindowRebaselineFutureCutoverV3Result['state'],
  blockers: readonly string[],
  input: SnsFandomYoutubeWindowRebaselineFutureCutoverV3Input,
  measurementWindowStart: string | null = null,
): SnsFandomYoutubeWindowRebaselineFutureCutoverV3Result {
  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_WINDOW_REBASELINE_FUTURE_CUTOVER_V3,
    state,
    blockers: Object.freeze(Array.from(new Set(blockers)).sort()),
    nextGenerationRoot: SNS_FANDOM_YOUTUBE_NEXT_GENERATION_ROOT,
    measurementWindowStart,
    measurementWindowEnd:
      measurementWindowStart === null
        ? null
        : new Date(
            Date.parse(measurementWindowStart) + WINDOW_DURATION_MS,
          ).toISOString(),
    canonicalRebaselineAuthorized: input.canonicalRebaselineAuthorized,
    canonicalMutationPerformed: input.canonicalMutationPerformed,
    historicalV1ReceiptsReinterpreted: false as const,
    syntheticBackfillAllowed: false as const,
    retrospectiveReceiptSynthesisAllowed: false as const,
    retrospectiveProviderObservationAllowed: false as const,
    providerSubmissionAuthorized: false as const,
    productionCollectionAuthorized: false as const,
    productActivationAuthorized: false as const,
  });
}

export function evaluateSnsFandomYoutubeWindowRebaselineFutureCutoverV3(
  input: SnsFandomYoutubeWindowRebaselineFutureCutoverV3Input,
): SnsFandomYoutubeWindowRebaselineFutureCutoverV3Result {
  const blockers: string[] = [];

  if (
    input.currentMeasurementWindowStart
      !== SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_START
    || input.currentMeasurementWindowEnd
      !== SNS_FANDOM_YOUTUBE_ACTIVE_V1_WINDOW_END
  ) {
    blockers.push('youtube-window-cutover-current-window-drift');
  }
  if (input.nextGenerationRoot !== SNS_FANDOM_YOUTUBE_NEXT_GENERATION_ROOT) {
    blockers.push('youtube-window-cutover-generation-root-drift');
  }
  if (
    input.correctionEvidenceRef
      !== SNS_FANDOM_YOUTUBE_REBASELINE_CORRECTION_EVIDENCE_REF
  ) {
    blockers.push('youtube-window-cutover-correction-evidence-invalid');
  }

  const noAuthorities =
    !input.canonicalRebaselineAuthorized
    && !input.newGenerationProviderExecutionAuthorized
    && !input.schedulerCutoverAuthorized;

  if (input.canonicalMutationPerformed && !input.canonicalRebaselineAuthorized) {
    blockers.push('youtube-window-cutover-mutation-without-rebaseline-authorization');
  }

  if (blockers.length > 0) {
    return result('blocked', blockers, input);
  }

  if (noAuthorities) {
    if (
      input.firstSuccessfulNewGenerationSlotStart !== null
      || input.firstSuccessfulNewGenerationReceiptRef !== null
      || input.canonicalMutationPerformed
    ) {
      return result(
        'blocked',
        ['youtube-window-cutover-preauthorization-evidence-must-be-null'],
        input,
      );
    }
    return result('prepared-awaiting-owner-authorization', [], input);
  }

  const authorityBlockers: string[] = [];
  if (!input.canonicalRebaselineAuthorized) {
    authorityBlockers.push('youtube-window-cutover-rebaseline-not-authorized');
  }
  if (!input.newGenerationProviderExecutionAuthorized) {
    authorityBlockers.push(
      'youtube-window-cutover-new-generation-provider-execution-not-authorized',
    );
  }
  if (!input.schedulerCutoverAuthorized) {
    authorityBlockers.push('youtube-window-cutover-scheduler-cutover-not-authorized');
  }
  if (!input.newGenerationRuntimeBound) {
    authorityBlockers.push('youtube-window-cutover-new-generation-runtime-not-bound');
  }
  if (!input.newGenerationEvidenceStoreBound) {
    authorityBlockers.push(
      'youtube-window-cutover-new-generation-evidence-store-not-bound',
    );
  }

  if (authorityBlockers.length > 0) {
    return result('blocked', authorityBlockers, input);
  }

  if (
    input.firstSuccessfulNewGenerationSlotStart === null
    && input.firstSuccessfulNewGenerationReceiptRef === null
  ) {
    return result(
      'authorized-awaiting-first-successful-new-generation-slot',
      [],
      input,
    );
  }

  if (
    input.firstSuccessfulNewGenerationSlotStart === null
    || !exactUtcHour(input.firstSuccessfulNewGenerationSlotStart)
  ) {
    return result(
      'blocked',
      ['youtube-window-cutover-first-successful-slot-invalid'],
      input,
    );
  }

  if (
    input.firstSuccessfulNewGenerationReceiptRef === null
    || !new RegExp(
      '^blob://sns-fandom/youtube-audit/recurring/v2/receipts/[0-9]{8}T[0-9]{6}Z\\.json$',
    ).test(input.firstSuccessfulNewGenerationReceiptRef)
  ) {
    return result(
      'blocked',
      ['youtube-window-cutover-first-successful-receipt-invalid'],
      input,
    );
  }

  if (input.canonicalMutationPerformed) {
    return result(
      'blocked',
      ['youtube-window-cutover-canonical-mutation-must-follow-materialization-ready'],
      input,
    );
  }

  return result(
    'cutover-materialization-ready',
    [],
    input,
    input.firstSuccessfulNewGenerationSlotStart,
  );
}
