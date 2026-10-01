import {
  BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_APPROVAL_MARKER,
  BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_ISSUE,
  isBrandFitYouTubeProductionExecutionAuthorizationMatching,
  parseBrandFitYouTubeProductionExecutionAuthorizationComment,
} from './brandFitYouTubeProductionExecutionAuthorization';

export const BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_GATE_VERSION =
  'brand-fit-youtube-production-execution-gate-v1' as const;

export type BrandFitExecutionIssueComment = Readonly<{
  id: number;
  body: string;
  authorLogin: string;
}>;

export type BrandFitExecutionWorkflowRun = Readonly<{
  id: number;
  conclusion: string | null;
}>;

export type BrandFitYouTubeProductionExecutionGateResult =
  | Readonly<{
      status: 'authorized';
      contractVersion:
        typeof BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_GATE_VERSION;
      issueNumber:
        typeof BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_ISSUE;
      authorizationCommentId: number;
      authorizationId: string;
      expectedMainSha: string;
      maximumExecutions: 1;
    }>
  | Readonly<{
      status: 'blocked';
      contractVersion:
        typeof BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_GATE_VERSION;
      reason:
        | 'authorization-comment-missing'
        | 'authorization-mismatch'
        | 'execution-already-consumed';
    }>;

function blocked(
  reason: Extract<
    BrandFitYouTubeProductionExecutionGateResult,
    { status: 'blocked' }
  >['reason'],
): BrandFitYouTubeProductionExecutionGateResult {
  return Object.freeze({
    status: 'blocked' as const,
    contractVersion: BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_GATE_VERSION,
    reason,
  });
}

export function evaluateBrandFitYouTubeProductionExecutionGate(input: Readonly<{
  authorizationId: string;
  expectedMainSha: string;
  currentRunId: number;
  issueComments: readonly BrandFitExecutionIssueComment[];
  workflowRuns: readonly BrandFitExecutionWorkflowRun[];
}>): BrandFitYouTubeProductionExecutionGateResult {
  const ownerComments = input.issueComments
    .filter(
      (comment) =>
        comment.authorLogin === 'kpopmaker'
        && comment.body.includes(
          BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_APPROVAL_MARKER,
        ),
    )
    .map((comment) => Object.freeze({
      comment,
      record:
        parseBrandFitYouTubeProductionExecutionAuthorizationComment(
          comment.body,
        ),
    }))
    .filter((item) => item.record !== null);

  if (ownerComments.length === 0) {
    return blocked('authorization-comment-missing');
  }

  const matching = ownerComments.find(
    (item) =>
      item.record
      && isBrandFitYouTubeProductionExecutionAuthorizationMatching(
        item.record,
        {
          authorizationId: input.authorizationId,
          expectedMainSha: input.expectedMainSha,
        },
      ),
  );
  if (!matching || !matching.record) {
    return blocked('authorization-mismatch');
  }

  const priorSuccess = input.workflowRuns.some(
    (run) =>
      run.id !== input.currentRunId
      && run.conclusion === 'success',
  );
  if (priorSuccess) {
    return blocked('execution-already-consumed');
  }

  return Object.freeze({
    status: 'authorized' as const,
    contractVersion: BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_GATE_VERSION,
    issueNumber: BRAND_FIT_YOUTUBE_PRODUCTION_EXECUTION_ISSUE,
    authorizationCommentId: matching.comment.id,
    authorizationId: matching.record.authorizationId,
    expectedMainSha: matching.record.authorizedMainSha,
    maximumExecutions: 1 as const,
  });
}
