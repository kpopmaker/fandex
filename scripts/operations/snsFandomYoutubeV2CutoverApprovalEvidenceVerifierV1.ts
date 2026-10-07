import { pathToFileURL } from 'node:url';

import {
  evaluateSnsFandomYoutubeV2CutoverOwnerApprovalEvidenceV1,
  parseSnsFandomYoutubeV2CutoverApprovalEvidenceRefV1,
} from '../../lib/intelligence/snsFandomPointYoutubeV2CutoverApprovalEvidenceV1';

const EVIDENCE_ENV =
  'FANDEX_SNS_FANDOM_RECURRING_V2_CUTOVER_EVIDENCE_REF' as const;
const REVISION_ENV =
  'FANDEX_SNS_FANDOM_RECURRING_V2_AUTHORIZED_REVISION_SHA' as const;

type GithubIssueCommentPayload = Readonly<{
  issue_url?: unknown;
  html_url?: unknown;
  author_association?: unknown;
  body?: unknown;
  user?: Readonly<{ login?: unknown }> | null;
}>;

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export async function main(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): Promise<void> {
  const evidenceRef = environment[EVIDENCE_ENV]?.trim() ?? '';
  const authorizedRevisionSha = environment[REVISION_ENV]?.trim() ?? '';
  const githubToken = environment.GITHUB_TOKEN?.trim() ?? '';

  if (githubToken.length === 0) {
    throw new Error('sns_fandom_v2_cutover_owner_approval_github_token_missing');
  }

  const commentId =
    parseSnsFandomYoutubeV2CutoverApprovalEvidenceRefV1(evidenceRef);
  const response = await fetch(
    'https://api.github.com/repos/kpopmaker/fandex/issues/comments/'
      + String(commentId),
    {
      headers: {
        Authorization: 'Bearer ' + githubToken,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    },
  );

  if (!response.ok) {
    throw new Error(
      'sns_fandom_v2_cutover_owner_approval_fetch_failed:http_'
      + String(response.status),
    );
  }

  const payload = await response.json() as GithubIssueCommentPayload;
  const evaluated = evaluateSnsFandomYoutubeV2CutoverOwnerApprovalEvidenceV1({
    evidenceRef,
    authorizedRevisionSha,
    comment: {
      issueUrl: stringOrNull(payload.issue_url),
      htmlUrl: stringOrNull(payload.html_url),
      userLogin: stringOrNull(payload.user?.login),
      authorAssociation: stringOrNull(payload.author_association),
      body: stringOrNull(payload.body),
    },
  });

  if (evaluated.state !== 'accepted') {
    throw new Error(
      'sns_fandom_v2_cutover_owner_approval_blocked:'
      + evaluated.blockers.join(','),
    );
  }

  process.stdout.write(JSON.stringify({
    contractVersion: evaluated.contractVersion,
    state: evaluated.state,
    evidenceRef: evaluated.evidenceRef,
    authorizedRevisionSha: evaluated.authorizedRevisionSha,
    commentId: evaluated.commentId,
    canonicalRebaselineAuthorized: evaluated.canonicalRebaselineAuthorized,
    newGenerationProviderExecutionAuthorized:
      evaluated.newGenerationProviderExecutionAuthorized,
    schedulerCutoverAuthorized: evaluated.schedulerCutoverAuthorized,
    providerSubmissionAuthorized: evaluated.providerSubmissionAuthorized,
    productionCollectionAuthorized: evaluated.productionCollectionAuthorized,
    productActivationAuthorized: evaluated.productActivationAuthorized,
  }) + '\n');
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    process.stderr.write(
      (
        error instanceof Error
          ? error.message
          : 'sns_fandom_v2_cutover_owner_approval_verification_failed'
      ) + '\n',
    );
    process.exitCode = 1;
  });
}
