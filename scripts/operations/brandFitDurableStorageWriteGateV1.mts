import {
  evaluateBrandFitDurableStorageWriteGate,
  type BrandFitDurableStorageIssueComment,
  type BrandFitDurableStorageWorkflowRun,
} from '../../lib/intelligence/brandFitDurableStorageWriteGate';
import {
  BRAND_FIT_DURABLE_STORAGE_WRITE_ISSUE,
} from '../../lib/intelligence/brandFitDurableStorageWriteAuthorization';

const REPOSITORY = 'kpopmaker/fandex';
const WORKFLOW_FILE = 'write-brand-fit-durable-evidence-v1.yml';

function required(name: string): string {
  const value = process.env[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('required_environment_missing:' + name);
  }
  return value;
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
    throw new Error('github_storage_gate_request_failed:' + response.status);
  }
  return response.json();
}

function parseComments(
  value: unknown,
): readonly BrandFitDurableStorageIssueComment[] {
  if (!Array.isArray(value)) {
    throw new Error('github_storage_gate_comments_invalid');
  }
  return Object.freeze(value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('github_storage_gate_comments_invalid');
    }
    const row = item as Record<string, unknown>;
    const user = row.user;
    if (
      typeof row.id !== 'number'
      || typeof row.body !== 'string'
      || !user
      || typeof user !== 'object'
      || Array.isArray(user)
      || typeof (user as Record<string, unknown>).login !== 'string'
    ) {
      throw new Error('github_storage_gate_comments_invalid');
    }
    return Object.freeze({
      id: row.id,
      body: row.body,
      authorLogin:
        (user as Record<string, unknown>).login as string,
    });
  }));
}

type RawWorkflowRun = Readonly<{
  id: number;
  conclusion: string | null;
}>;

function parseWorkflowRuns(value: unknown): readonly RawWorkflowRun[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('github_storage_gate_runs_invalid');
  }
  const runs = (value as Record<string, unknown>).workflow_runs;
  if (!Array.isArray(runs)) {
    throw new Error('github_storage_gate_runs_invalid');
  }
  return Object.freeze(runs.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new Error('github_storage_gate_runs_invalid');
    }
    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== 'number'
      || (
        row.conclusion !== null
        && typeof row.conclusion !== 'string'
      )
    ) {
      throw new Error('github_storage_gate_runs_invalid');
    }
    return Object.freeze({
      id: row.id,
      conclusion: row.conclusion as string | null,
    });
  }));
}

async function hydrateWorkflowRuns(
  runs: readonly RawWorkflowRun[],
  token: string,
): Promise<readonly BrandFitDurableStorageWorkflowRun[]> {
  return Object.freeze(await Promise.all(runs.map(async (run) => {
    const jobsRaw = await githubJson(
      '/repos/' + REPOSITORY + '/actions/runs/' + run.id
        + '/jobs?per_page=100',
      token,
    );
    if (!jobsRaw || typeof jobsRaw !== 'object' || Array.isArray(jobsRaw)) {
      throw new Error('github_storage_gate_jobs_invalid');
    }
    const jobs = (jobsRaw as Record<string, unknown>).jobs;
    if (!Array.isArray(jobs)) {
      throw new Error('github_storage_gate_jobs_invalid');
    }

    let storageWriteStepSucceeded = false;
    for (const job of jobs) {
      if (!job || typeof job !== 'object' || Array.isArray(job)) {
        throw new Error('github_storage_gate_jobs_invalid');
      }
      const steps = (job as Record<string, unknown>).steps;
      if (!Array.isArray(steps)) continue;
      for (const step of steps) {
        if (!step || typeof step !== 'object' || Array.isArray(step)) {
          throw new Error('github_storage_gate_jobs_invalid');
        }
        const row = step as Record<string, unknown>;
        if (
          row.name
            === 'Write exactly one immutable Brand Fit durable evidence object'
          && row.conclusion === 'success'
        ) {
          storageWriteStepSucceeded = true;
        }
      }
    }

    return Object.freeze({
      id: run.id,
      conclusion: run.conclusion,
      storageWriteStepSucceeded,
    });
  })));
}

async function main(): Promise<void> {
  const githubToken = required('GITHUB_TOKEN');
  const expectedMainSha = required('EXPECTED_MAIN_SHA');
  const authorizationId = required('STORAGE_WRITE_AUTHORIZATION_ID');
  const currentRunId = Number(required('GITHUB_RUN_ID'));
  if (!Number.isSafeInteger(currentRunId) || currentRunId <= 0) {
    throw new Error('github_storage_gate_run_id_invalid');
  }

  const commentsRaw = await githubJson(
    '/repos/' + REPOSITORY + '/issues/'
      + BRAND_FIT_DURABLE_STORAGE_WRITE_ISSUE
      + '/comments?per_page=100',
    githubToken,
  );
  const runsRaw = await githubJson(
    '/repos/' + REPOSITORY + '/actions/workflows/'
      + WORKFLOW_FILE
      + '/runs?status=completed&per_page=100',
    githubToken,
  );

  const workflowRuns = await hydrateWorkflowRuns(
    parseWorkflowRuns(runsRaw),
    githubToken,
  );

  const result = evaluateBrandFitDurableStorageWriteGate({
    authorizationId,
    expectedMainSha,
    currentRunId,
    issueComments: parseComments(commentsRaw),
    workflowRuns,
  });

  if (result.status !== 'authorized') {
    throw new Error('brand_fit_storage_gate_blocked:' + result.reason);
  }

  process.stdout.write(JSON.stringify(result) + '\n');
}

main().catch((error) => {
  process.stderr.write(
    (
      error instanceof Error
        ? error.message
        : 'brand_fit_storage_gate_failed'
    ) + '\n',
  );
  process.exitCode = 1;
});
