import {
  BRAND_FIT_DURABLE_STORAGE_WRITE_APPROVAL_MARKER,
  BRAND_FIT_DURABLE_STORAGE_WRITE_ISSUE,
  isBrandFitDurableStorageWriteAuthorizationMatching,
  parseBrandFitDurableStorageWriteAuthorizationComment,
} from './brandFitDurableStorageWriteAuthorization';

export const BRAND_FIT_DURABLE_STORAGE_WRITE_GATE_VERSION =
  'brand-fit-durable-storage-write-gate-v1' as const;

export type BrandFitDurableStorageIssueComment = Readonly<{
  id: number;
  body: string;
  authorLogin: string;
}>;

export type BrandFitDurableStorageWorkflowRun = Readonly<{
  id: number;
  conclusion: string | null;
  storageWriteStepSucceeded: boolean;
}>;

export type BrandFitDurableStorageWriteGateResult =
  | Readonly<{
      status: 'authorized';
      contractVersion:
        typeof BRAND_FIT_DURABLE_STORAGE_WRITE_GATE_VERSION;
      issueNumber: typeof BRAND_FIT_DURABLE_STORAGE_WRITE_ISSUE;
      authorizationCommentId: number;
      authorizationId: string;
      expectedMainSha: string;
      maximumWrites: 1;
    }>
  | Readonly<{
      status: 'blocked';
      contractVersion:
        typeof BRAND_FIT_DURABLE_STORAGE_WRITE_GATE_VERSION;
      reason:
        | 'authorization-comment-missing'
        | 'authorization-mismatch'
        | 'storage-write-already-consumed';
    }>;

function blocked(
  reason: Extract<
    BrandFitDurableStorageWriteGateResult,
    { status: 'blocked' }
  >['reason'],
): BrandFitDurableStorageWriteGateResult {
  return Object.freeze({
    status: 'blocked' as const,
    contractVersion: BRAND_FIT_DURABLE_STORAGE_WRITE_GATE_VERSION,
    reason,
  });
}

export function evaluateBrandFitDurableStorageWriteGate(input: Readonly<{
  authorizationId: string;
  expectedMainSha: string;
  currentRunId: number;
  issueComments: readonly BrandFitDurableStorageIssueComment[];
  workflowRuns: readonly BrandFitDurableStorageWorkflowRun[];
}>): BrandFitDurableStorageWriteGateResult {
  const ownerComments = input.issueComments
    .filter(
      (comment) =>
        comment.authorLogin === 'kpopmaker'
        && comment.body.includes(
          BRAND_FIT_DURABLE_STORAGE_WRITE_APPROVAL_MARKER,
        ),
    )
    .map((comment) => Object.freeze({
      comment,
      record:
        parseBrandFitDurableStorageWriteAuthorizationComment(
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
      && isBrandFitDurableStorageWriteAuthorizationMatching(
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
      && (
        run.conclusion === 'success'
        || run.storageWriteStepSucceeded
      ),
  );
  if (priorSuccess) {
    return blocked('storage-write-already-consumed');
  }

  return Object.freeze({
    status: 'authorized' as const,
    contractVersion: BRAND_FIT_DURABLE_STORAGE_WRITE_GATE_VERSION,
    issueNumber: BRAND_FIT_DURABLE_STORAGE_WRITE_ISSUE,
    authorizationCommentId: matching.comment.id,
    authorizationId: matching.record.authorizationId,
    expectedMainSha: matching.record.authorizedMainSha,
    maximumWrites: 1 as const,
  });
}
