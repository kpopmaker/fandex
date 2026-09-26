const TEAM_ID = 'team_OrRPxuBxMwCYU3kk0r76AfOs';
const PROJECT_ID = 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
const PRODUCTION_URL = 'https://fandex-eta.vercel.app';
const ROUTE = '/api/internal/naver-news/momentum-verifier';
const ENV_KEY = 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET';
const AUTHORIZATION_ID =
  'ops-execution-momentum-verifier-20260926t082730z-v1';
const CONFIRM =
  'EXECUTE_ONE_MOMENTUM_NATIVE_VERIFIER_PRODUCTION_READ_ONLY';
const TARGET = Object.freeze({
  contractVersion:
    'v162_naver_news_momentum_native_verifier_execution_request_v1',
  purpose: 'momentum-native-verifier-read-only',
  canonicalArtistId: 'iu',
  throughSlotStart: '2026-09-21T12:00:00.000Z',
});

function required(name) {
  const value = process.env[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('required_environment_missing:' + name);
  }
  return value;
}

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

async function vercelJson(path, token) {
  const response = await fetch('https://api.vercel.com' + path, {
    headers: { Authorization: 'Bearer ' + token },
  });
  assert(response.ok, 'vercel_api_request_failed:' + response.status);
  return response.json();
}

async function assertNoPriorSuccessfulExecution(githubToken) {
  const workflowFile =
    'execute-momentum-native-verifier-production-v1.yml';
  const url =
    'https://api.github.com/repos/kpopmaker/fandex/actions/workflows/'
    + workflowFile
    + '/runs?event=workflow_dispatch&status=completed&per_page=100';
  const response = await fetch(url, {
    headers: {
      Authorization: 'Bearer ' + githubToken,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  assert(response.ok, 'github_execution_history_read_failed');
  const data = await response.json();
  const priorSuccess = Array.isArray(data.workflow_runs)
    && data.workflow_runs.some(
      (run) =>
        run.conclusion === 'success'
        && run.id !== Number(process.env.GITHUB_RUN_ID),
    );
  assert(!priorSuccess, 'execution_authorization_already_consumed');
}

async function main() {
  const vercelToken = required('VERCEL_TOKEN');
  const githubToken = required('GITHUB_TOKEN');
  const githubSha = required('GITHUB_SHA');
  const expectedMainSha = required('EXPECTED_MAIN_SHA');
  const expectedDeploymentId = required('EXPECTED_DEPLOYMENT_ID');
  const authorizationId = required('EXECUTION_AUTHORIZATION_ID');
  const confirm = required('EXECUTION_CONFIRM');

  assert(githubSha === expectedMainSha, 'workflow_sha_not_expected_main');
  assert(
    authorizationId === AUTHORIZATION_ID,
    'execution_authorization_id_invalid',
  );
  assert(confirm === CONFIRM, 'execution_confirmation_invalid');

  await assertNoPriorSuccessfulExecution(githubToken);

  const deployment = await vercelJson(
    '/v13/deployments/'
      + encodeURIComponent(expectedDeploymentId)
      + '?teamId='
      + encodeURIComponent(TEAM_ID),
    vercelToken,
  );

  assert(
    deployment?.meta?.githubCommitSha === expectedMainSha,
    'production_deployment_commit_mismatch',
  );
  assert(deployment?.target === 'production', 'deployment_not_production');
  assert(
    deployment?.readyState === 'READY' || deployment?.state === 'READY',
    'production_deployment_not_ready',
  );

  const inventory = await vercelJson(
    '/v10/projects/'
      + encodeURIComponent(PROJECT_ID)
      + '/env?decrypt=true&teamId='
      + encodeURIComponent(TEAM_ID),
    vercelToken,
  );
  const envs = Array.isArray(inventory?.envs) ? inventory.envs : [];
  const matches = envs.filter((row) => {
    if (row?.key !== ENV_KEY) return false;
    const target = row?.target;
    return Array.isArray(target)
      ? target.includes('production')
      : target === 'production';
  });
  assert(matches.length === 1, 'dedicated_verifier_secret_not_exactly_one');
  const verifierSecret = matches[0]?.value;
  assert(
    typeof verifierSecret === 'string'
      && verifierSecret.length >= 24
      && Buffer.byteLength(verifierSecret, 'utf8') <= 512,
    'dedicated_verifier_secret_invalid',
  );

  const response = await fetch(PRODUCTION_URL + ROUTE, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + verifierSecret,
      'Content-Type': 'application/json',
      'X-Fandex-Execution-Authorization-Id': AUTHORIZATION_ID,
    },
    body: JSON.stringify(TARGET),
  });
  const payload = await response.json();

  assert(response.status === 200, 'production_verifier_http_failed');
  assert(payload?.ok === true, 'production_verifier_response_not_ok');
  assert(
    payload?.contractVersion
      === 'v162_naver_news_momentum_native_verifier_execution_channel_v1',
    'production_verifier_contract_invalid',
  );
  assert(payload?.state === 'executed', 'production_verifier_not_executed');
  assert(
    payload?.canonicalArtistId === TARGET.canonicalArtistId,
    'production_verifier_artist_mismatch',
  );
  assert(
    payload?.source?.naverThroughSlotStart === TARGET.throughSlotStart,
    'production_verifier_slot_mismatch',
  );
  assert(
    payload?.nativeVerifier?.databaseReadOnly === true
      && payload?.nativeVerifier?.databaseWritesObserved === 0,
    'production_verifier_database_boundary_invalid',
  );
  assert(
    payload?.v160?.state === 'attestation-adapted'
      && payload?.v160?.verifierOutputAccepted === true,
    'production_verifier_attestation_invalid',
  );
  assert(
    payload?.effects?.databaseWrites === 0
      && payload?.effects?.productMetricReads === 0
      && payload?.effects?.productMetricWrites === 0
      && payload?.effects?.registryMutations === 0
      && payload?.effects?.productionActivations === 0,
    'production_verifier_effect_boundary_invalid',
  );

  const serialized = JSON.stringify(payload);
  assert(!serialized.includes(verifierSecret), 'secret_exposed_in_response');
  assert(!serialized.includes('"rawPayload":'), 'raw_payload_exposed');
  assert(
    !serialized.includes('"normalizedPayload":'),
    'normalized_payload_exposed',
  );

  console.log('MOMENTUM_NATIVE_VERIFIER_PRODUCTION_EXECUTION=SUCCESS');
  console.log(JSON.stringify({
    executionAuthorizationId: AUTHORIZATION_ID,
    expectedMainSha,
    expectedDeploymentId,
    canonicalArtistId: payload.canonicalArtistId,
    throughSlotStart: payload.source.naverThroughSlotStart,
    executionId: payload.nativeVerifier.executionId,
    executedAt: payload.nativeVerifier.executedAt,
    evidenceRows: payload.nativeVerifier.evidenceRows,
    normalizedRecords: payload.nativeVerifier.distinctNormalizedRecords,
    databaseReadOnly: payload.nativeVerifier.databaseReadOnly,
    databaseWritesObserved:
      payload.nativeVerifier.databaseWritesObserved,
    attestationState: payload.v160.state,
    verifierOutputAccepted: payload.v160.verifierOutputAccepted,
    effects: payload.effects,
  }));
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'momentum_native_verifier_production_execution_failed',
  );
  process.exitCode = 1;
});
