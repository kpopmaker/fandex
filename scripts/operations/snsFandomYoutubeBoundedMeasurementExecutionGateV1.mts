import { readFile } from 'node:fs/promises';

const REPOSITORY = 'kpopmaker/fandex';
const OWNER_LOGIN = 'kpopmaker';
const ISSUE_NUMBER = 424;
const AUTHORIZATION_VERSION =
  'sns_fandom_youtube_bounded_measurement_execution_authorization_v1';
const EXECUTION_SCOPE =
  'five-audit-cohort-reaction-endpoints-singleton-one-shot';

type ExecutionRequest = Readonly<{
  expectedMainSha: string;
  executionAuthorizationCommentId: number;
  executionAuthorizationEvidenceRef: string;
  maximumExecutions: 1;
  confirm: string;
}>;

function required(name: string): string {
  const value = process.env[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('required_environment_missing:' + name);
  }
  return value;
}

function object(value: unknown, reason: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(reason);
  }
  return value as Record<string, unknown>;
}

function request(value: unknown): ExecutionRequest {
  const row = object(value, 'execution_request_invalid');
  if (
    typeof row.expectedMainSha !== 'string'
    || !/^[0-9a-f]{40}$/.test(row.expectedMainSha)
    || !Number.isSafeInteger(row.executionAuthorizationCommentId)
    || (row.executionAuthorizationCommentId as number) <= 0
    || typeof row.executionAuthorizationEvidenceRef !== 'string'
    || row.maximumExecutions !== 1
    || row.confirm !== 'execute-sns-fandom-youtube-bounded-measurement-v1'
  ) {
    throw new Error('execution_request_invalid');
  }
  return row as unknown as ExecutionRequest;
}

async function githubJson(path: string, token: string): Promise<unknown> {
  const response = await fetch('https://api.github.com' + path, {
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!response.ok) {
    throw new Error(
      'github_execution_authorization_request_failed:'
      + String(response.status),
    );
  }
  return response.json();
}

async function main(): Promise<void> {
  if (
    process.argv.length !== 4
    || process.argv[2] !== '--request'
  ) {
    throw new Error('execution_request_path_required');
  }

  const githubToken = required('GITHUB_TOKEN');
  const runAttempt = Number(required('GITHUB_RUN_ATTEMPT'));
  if (runAttempt !== 1) {
    throw new Error('execution_rerun_not_authorized');
  }

  const executionRequest = request(JSON.parse(
    await readFile(process.argv[3], 'utf8'),
  ));
  const expectedBranch =
    'execute/sns-fandom-phase-c-bounded-measurement-v1-'
    + String(executionRequest.executionAuthorizationCommentId);
  if (required('GITHUB_REF_NAME') !== expectedBranch) {
    throw new Error('execution_branch_mismatch');
  }

  const expectedEvidenceRef =
    'github-issue://kpopmaker/fandex/issues/424#issuecomment-'
    + String(executionRequest.executionAuthorizationCommentId);
  if (
    executionRequest.executionAuthorizationEvidenceRef
    !== expectedEvidenceRef
  ) {
    throw new Error('execution_authorization_evidence_ref_mismatch');
  }

  const rawComment = object(
    await githubJson(
      '/repos/'
      + REPOSITORY
      + '/issues/comments/'
      + executionRequest.executionAuthorizationCommentId,
      githubToken,
    ),
    'execution_authorization_comment_invalid',
  );
  const user = object(
    rawComment.user,
    'execution_authorization_comment_user_invalid',
  );
  if (user.login !== OWNER_LOGIN) {
    throw new Error('execution_authorization_owner_mismatch');
  }
  if (rawComment.issue_url !== (
    'https://api.github.com/repos/'
    + REPOSITORY
    + '/issues/'
    + ISSUE_NUMBER
  )) {
    throw new Error('execution_authorization_issue_mismatch');
  }
  if (typeof rawComment.body !== 'string') {
    throw new Error('execution_authorization_comment_body_invalid');
  }

  const requiredLines = [
    'PHASE C BOUNDED YOUTUBE MEASUREMENT EXECUTION AUTHORIZED',
    'authorizationVersion: ' + AUTHORIZATION_VERSION,
    'expectedMainSha: ' + executionRequest.expectedMainSha,
    'executionScope: ' + EXECUTION_SCOPE,
    'maximumExecutions: 1',
    'auditManifestId: sns-fandom-youtube-audit-cohort-v1',
    'artistChannelCount: 5',
    'requestedEndpoints: youtube.channels.list,youtube.playlistItems.list,youtube.videos.list',
    'requestBatchingStrategy: singleton-only-until-provider-batch-limit-evidence',
    'commentEndpointsAllowed: false',
    'productionCollectionAuthorized: false',
    'providerSubmissionAuthorized: false',
    'schedulerMutationAuthorized: false',
  ];
  for (const line of requiredLines) {
    if (!rawComment.body.includes(line)) {
      throw new Error(
        'execution_authorization_comment_missing_required_line',
      );
    }
  }

  process.stdout.write(JSON.stringify({
    state: 'authorized',
    authorizationVersion: AUTHORIZATION_VERSION,
    executionScope: EXECUTION_SCOPE,
    expectedMainSha: executionRequest.expectedMainSha,
    authorizationCommentId:
      executionRequest.executionAuthorizationCommentId,
    maximumExecutions: 1,
  }) + '\n');
}

main().catch((error) => {
  process.stderr.write(
    (
      error instanceof Error
        ? error.message
        : 'sns_fandom_bounded_measurement_execution_gate_failed'
    ) + '\n',
  );
  process.exitCode = 1;
});
