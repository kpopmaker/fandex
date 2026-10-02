const DEFAULT_ENDPOINT =
  'https://fandex-eta.vercel.app/api/internal/naver-news/vercel-cron-fallback';
const CANONICAL_SCHEDULE = '17 * * * *';
const EXPECTED_MODE = 'naver-news-vercel-cron-blob-only-fallback-v2';

function requiredSecret(environment) {
  const value = environment.FANDEX_NAVER_EXTERNAL_SCHEDULER_SECRET?.trim();
  if (!value) throw new Error('naver_external_scheduler_secret_required');
  return value;
}

function endpoint(environment) {
  const value = environment.FANDEX_NAVER_EXTERNAL_SCHEDULER_ENDPOINT?.trim();
  return value || DEFAULT_ENDPOINT;
}

function validateSummary(summary) {
  if (!summary || typeof summary !== 'object') {
    throw new Error('naver_external_scheduler_response_invalid');
  }
  const validRunStatus =
    (summary.runStatus === 'collected-and-finalized'
      && summary.providerCalls === 1)
    || (summary.runStatus === 'already-finalized'
      && summary.providerCalls === 0);

  if (
    summary.ok !== true
    || summary.mode !== EXPECTED_MODE
    || summary.schedule !== CANONICAL_SCHEDULE
    || !validRunStatus
    || summary.databaseWrites !== 0
    || summary.schedulerManifestFinalized !== true
  ) {
    throw new Error('naver_external_scheduler_response_invalid');
  }

  return Object.freeze({
    mode: summary.mode,
    runStatus: summary.runStatus,
    slotStart: summary.slotStart ?? null,
    collectionKey: summary.collectionKey ?? null,
    providerCalls: summary.providerCalls,
    databaseWrites: 0,
    schedulerManifestFinalized: true,
  });
}

export async function runExternalNaverTrigger(
  environment = process.env,
  dependencies = {},
) {
  const secret = requiredSecret(environment);
  const target = endpoint(environment);
  const fetchImpl = dependencies.fetchImpl ?? fetch;

  let response;
  try {
    response = await fetchImpl(target, {
      method: 'GET',
      headers: {
        authorization: `Bearer ${secret}`,
        'x-vercel-cron-schedule': CANONICAL_SCHEDULE,
        'user-agent': 'fandex-external-hourly-trigger-v1',
      },
      redirect: 'error',
      signal: dependencies.signal ?? AbortSignal.timeout(120_000),
    });
  } catch {
    throw new Error('naver_external_scheduler_request_failed');
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('naver_external_scheduler_response_invalid');
  }

  if (!response.ok) {
    throw new Error('naver_external_scheduler_request_rejected');
  }

  return validateSummary(payload);
}

export async function main() {
  const summary = await runExternalNaverTrigger();
  process.stdout.write(`${JSON.stringify(summary)}\n`);
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch(() => {
    console.error(
      'FANDEX NAVER external trigger failed closed. No secret, endpoint detail, provider payload, or database detail was logged.',
    );
    process.exitCode = 1;
  });
}
