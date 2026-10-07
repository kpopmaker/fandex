export const SNS_FANDOM_YOUTUBE_V2_CUTOVER_ACTIVATION_CANDIDATE_V1 =
  'sns-fandom-youtube-v2-cutover-activation-candidate-v1' as const;

export const SNS_FANDOM_YOUTUBE_V2_RENDER_SERVICE_ID =
  'crn-db2ekl6i0phs73ederu0' as const;
export const SNS_FANDOM_YOUTUBE_V2_RENDER_SCHEDULE = '7 * * * *' as const;
export const SNS_FANDOM_YOUTUBE_V1_GITHUB_FALLBACK_CRONS =
  Object.freeze(['17 * * * *', '47 * * * *'] as const);
export const SNS_FANDOM_YOUTUBE_V2_WORKFLOW_PATH =
  '.github/workflows/execute-sns-fandom-youtube-v2-render-trigger-v1.yml'
  as const;
export const SNS_FANDOM_YOUTUBE_V1_WORKFLOW_PATH =
  '.github/workflows/execute-sns-fandom-youtube-recurring-measurement-v1.yml'
  as const;

export type SnsFandomYoutubeV2CutoverActivationCandidateV1Input = Readonly<{
  activationRevisionSha: string | null;
  cutoverApprovalEvidenceRef: string | null;
  canonicalRebaselineAuthorized: boolean;
  newGenerationProviderExecutionAuthorized: boolean;
  schedulerCutoverAuthorized: boolean;
  v1FallbackSuppressionPrepared: boolean;
  v1FallbackSuppressionApplied: boolean;
  renderV2DispatchMutationPrepared: boolean;
  renderV2DispatchMutationApplied: boolean;
  v2RuntimeBound: boolean;
  v2EvidenceStoreBound: boolean;
  crossGenerationFirstSlotGuardBound: boolean;
}>;

export type SnsFandomYoutubeV2CutoverActivationCandidateV1Result =
  Readonly<{
    contractVersion:
      typeof SNS_FANDOM_YOUTUBE_V2_CUTOVER_ACTIVATION_CANDIDATE_V1;
    state:
      | 'prepared-owner-approval-required'
      | 'activation-ready-candidate'
      | 'blocked';
    blockers: readonly string[];
    activationRevisionSha: string | null;
    cutoverApprovalEvidenceRef: string | null;
    liveMutationPerformed: boolean;
    providerCallPerformed: false;
    providerSubmissionAuthorized: false;
    productionCollectionAuthorized: false;
    productActivationAuthorized: false;
  }>;

function validSha(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

function durableApprovalRef(value: string): boolean {
  return /^github-issue:\/\/kpopmaker\/fandex\/issues\/509#issuecomment-[1-9][0-9]*$/.test(
    value,
  );
}

export function evaluateSnsFandomYoutubeV2CutoverActivationCandidateV1(
  input: SnsFandomYoutubeV2CutoverActivationCandidateV1Input,
): SnsFandomYoutubeV2CutoverActivationCandidateV1Result {
  const blockers: string[] = [];
  const anyAuthority =
    input.canonicalRebaselineAuthorized
    || input.newGenerationProviderExecutionAuthorized
    || input.schedulerCutoverAuthorized;

  if (!input.v1FallbackSuppressionPrepared) {
    blockers.push('sns-fandom-v2-cutover-v1-fallback-suppression-not-prepared');
  }
  if (!input.renderV2DispatchMutationPrepared) {
    blockers.push('sns-fandom-v2-cutover-render-mutation-not-prepared');
  }
  if (!input.v2RuntimeBound) {
    blockers.push('sns-fandom-v2-cutover-runtime-not-bound');
  }
  if (!input.v2EvidenceStoreBound) {
    blockers.push('sns-fandom-v2-cutover-evidence-store-not-bound');
  }
  if (!input.crossGenerationFirstSlotGuardBound) {
    blockers.push('sns-fandom-v2-cutover-cross-generation-guard-not-bound');
  }

  if (
    input.v1FallbackSuppressionApplied
    || input.renderV2DispatchMutationApplied
  ) {
    blockers.push('sns-fandom-v2-cutover-live-mutation-before-activation');
  }

  if (!anyAuthority) {
    if (
      input.activationRevisionSha !== null
      || input.cutoverApprovalEvidenceRef !== null
    ) {
      blockers.push(
        'sns-fandom-v2-cutover-preapproval-exact-authority-must-be-null',
      );
    }
    if (blockers.length > 0) {
      return Object.freeze({
        contractVersion:
          SNS_FANDOM_YOUTUBE_V2_CUTOVER_ACTIVATION_CANDIDATE_V1,
        state: 'blocked' as const,
        blockers: Object.freeze(Array.from(new Set(blockers)).sort()),
        activationRevisionSha: input.activationRevisionSha,
        cutoverApprovalEvidenceRef: input.cutoverApprovalEvidenceRef,
        liveMutationPerformed: false,
        providerCallPerformed: false as const,
        providerSubmissionAuthorized: false as const,
        productionCollectionAuthorized: false as const,
        productActivationAuthorized: false as const,
      });
    }

    return Object.freeze({
      contractVersion:
        SNS_FANDOM_YOUTUBE_V2_CUTOVER_ACTIVATION_CANDIDATE_V1,
      state: 'prepared-owner-approval-required' as const,
      blockers: Object.freeze([]),
      activationRevisionSha: null,
      cutoverApprovalEvidenceRef: null,
      liveMutationPerformed: false,
      providerCallPerformed: false as const,
      providerSubmissionAuthorized: false as const,
      productionCollectionAuthorized: false as const,
      productActivationAuthorized: false as const,
    });
  }

  if (!input.canonicalRebaselineAuthorized) {
    blockers.push('sns-fandom-v2-cutover-rebaseline-not-authorized');
  }
  if (!input.newGenerationProviderExecutionAuthorized) {
    blockers.push('sns-fandom-v2-cutover-provider-execution-not-authorized');
  }
  if (!input.schedulerCutoverAuthorized) {
    blockers.push('sns-fandom-v2-cutover-scheduler-cutover-not-authorized');
  }
  if (
    input.activationRevisionSha === null
    || !validSha(input.activationRevisionSha)
  ) {
    blockers.push('sns-fandom-v2-cutover-activation-revision-invalid');
  }
  if (
    input.cutoverApprovalEvidenceRef === null
    || !durableApprovalRef(input.cutoverApprovalEvidenceRef)
  ) {
    blockers.push('sns-fandom-v2-cutover-approval-evidence-invalid');
  }

  if (blockers.length > 0) {
    return Object.freeze({
      contractVersion:
        SNS_FANDOM_YOUTUBE_V2_CUTOVER_ACTIVATION_CANDIDATE_V1,
      state: 'blocked' as const,
      blockers: Object.freeze(Array.from(new Set(blockers)).sort()),
      activationRevisionSha: input.activationRevisionSha,
      cutoverApprovalEvidenceRef: input.cutoverApprovalEvidenceRef,
      liveMutationPerformed: false,
      providerCallPerformed: false as const,
      providerSubmissionAuthorized: false as const,
      productionCollectionAuthorized: false as const,
      productActivationAuthorized: false as const,
    });
  }

  return Object.freeze({
    contractVersion:
      SNS_FANDOM_YOUTUBE_V2_CUTOVER_ACTIVATION_CANDIDATE_V1,
    state: 'activation-ready-candidate' as const,
    blockers: Object.freeze([]),
    activationRevisionSha: input.activationRevisionSha,
    cutoverApprovalEvidenceRef: input.cutoverApprovalEvidenceRef,
    liveMutationPerformed: false,
    providerCallPerformed: false as const,
    providerSubmissionAuthorized: false as const,
    productionCollectionAuthorized: false as const,
    productActivationAuthorized: false as const,
  });
}
