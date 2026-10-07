export const SNS_FANDOM_YOUTUBE_V2_CUTOVER_OWNER_APPROVAL_V1 =
  'sns_fandom_youtube_v2_cutover_owner_approval_v1' as const;

const EVIDENCE_REF_RE =
  /^github-issue:\/\/kpopmaker\/fandex\/issues\/509#issuecomment-([1-9][0-9]*)$/;

export type SnsFandomYoutubeV2CutoverOwnerApprovalCommentV1 = Readonly<{
  issueUrl: string | null;
  htmlUrl: string | null;
  userLogin: string | null;
  authorAssociation: string | null;
  body: string | null;
}>;

export type SnsFandomYoutubeV2CutoverOwnerApprovalEvidenceV1Input = Readonly<{
  evidenceRef: string;
  authorizedRevisionSha: string;
  comment: SnsFandomYoutubeV2CutoverOwnerApprovalCommentV1;
}>;

export type SnsFandomYoutubeV2CutoverOwnerApprovalEvidenceV1Result =
  Readonly<{
    contractVersion:
      typeof SNS_FANDOM_YOUTUBE_V2_CUTOVER_OWNER_APPROVAL_V1;
    state: 'accepted' | 'blocked';
    blockers: readonly string[];
    evidenceRef: string;
    authorizedRevisionSha: string;
    commentId: number | null;
    canonicalRebaselineAuthorized: boolean;
    newGenerationProviderExecutionAuthorized: boolean;
    schedulerCutoverAuthorized: boolean;
    providerSubmissionAuthorized: false;
    productionCollectionAuthorized: false;
    productActivationAuthorized: false;
  }>;

function validSha(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value);
}

export function parseSnsFandomYoutubeV2CutoverApprovalEvidenceRefV1(
  evidenceRef: string,
): number {
  const match = evidenceRef.match(EVIDENCE_REF_RE);
  if (!match?.[1]) {
    throw new Error('sns_fandom_v2_cutover_owner_approval_ref_invalid');
  }
  return Number(match[1]);
}

function normalizedLines(body: string): ReadonlySet<string> {
  return new Set(
    body
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const withoutBullet = line.startsWith('- ') ? line.slice(2).trim() : line;
        if (
          withoutBullet.length >= 2
          && withoutBullet.startsWith('`')
          && withoutBullet.endsWith('`')
        ) {
          return withoutBullet.slice(1, -1);
        }
        return withoutBullet;
      }),
  );
}

export function evaluateSnsFandomYoutubeV2CutoverOwnerApprovalEvidenceV1(
  input: SnsFandomYoutubeV2CutoverOwnerApprovalEvidenceV1Input,
): SnsFandomYoutubeV2CutoverOwnerApprovalEvidenceV1Result {
  const blockers: string[] = [];
  let commentId: number | null = null;

  if (!validSha(input.authorizedRevisionSha)) {
    blockers.push('sns-fandom-v2-cutover-owner-approval-revision-invalid');
  }

  try {
    commentId = parseSnsFandomYoutubeV2CutoverApprovalEvidenceRefV1(
      input.evidenceRef,
    );
  } catch {
    blockers.push('sns-fandom-v2-cutover-owner-approval-ref-invalid');
  }

  if (
    input.comment.issueUrl
      !== 'https://api.github.com/repos/kpopmaker/fandex/issues/509'
  ) {
    blockers.push('sns-fandom-v2-cutover-owner-approval-issue-mismatch');
  }

  if (
    commentId !== null
    && input.comment.htmlUrl
      !== 'https://github.com/kpopmaker/fandex/issues/509#issuecomment-'
        + String(commentId)
  ) {
    blockers.push('sns-fandom-v2-cutover-owner-approval-comment-mismatch');
  }

  if (input.comment.userLogin !== 'kpopmaker') {
    blockers.push('sns-fandom-v2-cutover-owner-approval-user-mismatch');
  }

  if (input.comment.authorAssociation !== 'OWNER') {
    blockers.push('sns-fandom-v2-cutover-owner-approval-association-mismatch');
  }

  const body = input.comment.body ?? '';
  const lines = normalizedLines(body);
  const requiredLines = [
    'approvalVersion=' + SNS_FANDOM_YOUTUBE_V2_CUTOVER_OWNER_APPROVAL_V1,
    'authorizedRevisionSha=' + input.authorizedRevisionSha,
    'canonicalRebaselineAuthorized=true',
    'newGenerationProviderExecutionAuthorized=true',
    'schedulerCutoverAuthorized=true',
    'providerSubmissionAuthorized=false',
    'productionCollectionAuthorized=false',
    'productActivationAuthorized=false',
    'historicalBackfillAuthorized=false',
    'retrospectiveProviderObservationAuthorized=false',
    'retrospectiveReceiptSynthesisAuthorized=false',
  ] as const;

  for (const line of requiredLines) {
    if (!lines.has(line)) {
      blockers.push(
        'sns-fandom-v2-cutover-owner-approval-body-missing:' + line.split('=')[0],
      );
    }
  }

  const unique = Object.freeze(Array.from(new Set(blockers)).sort());
  const accepted = unique.length === 0;

  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_V2_CUTOVER_OWNER_APPROVAL_V1,
    state: accepted ? 'accepted' as const : 'blocked' as const,
    blockers: unique,
    evidenceRef: input.evidenceRef,
    authorizedRevisionSha: input.authorizedRevisionSha,
    commentId,
    canonicalRebaselineAuthorized: accepted,
    newGenerationProviderExecutionAuthorized: accepted,
    schedulerCutoverAuthorized: accepted,
    providerSubmissionAuthorized: false as const,
    productionCollectionAuthorized: false as const,
    productActivationAuthorized: false as const,
  });
}
