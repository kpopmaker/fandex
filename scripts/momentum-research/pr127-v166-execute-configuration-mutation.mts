import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

import {
  evaluateFandexMomentumVerifierConfigurationMutationAuthorization,
  type FandexMomentumVerifierConfigurationMutationAuthorizationRecord,
} from '../../lib/intelligence/fandexMomentumVerifierConfigurationMutationAuthorizationResearch';
import {
  evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard,
  type FandexMomentumVerifierTrustedSecretHandleAttestation,
} from '../../lib/intelligence/fandexMomentumVerifierConfigurationMutationExecutionGuardResearch';
import {
  buildFandexMomentumVerifierVercelMutationDryRun,
} from '../../lib/intelligence/fandexMomentumVerifierVercelMutationDryRunResearch';

const RESULT_PATH =
  process.env.MOMENTUM_V166_RESULT_PATH
  ?? 'operator-result/pr127_v166_configuration_mutation_result.json';

const TEAM_ID = 'team_OrRPxuBxMwCYU3kk0r76AfOs';
const PROJECT_ID = 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
const V165_DIGEST =
  'f75d091666f2f8e9109918e8857cb0e0941c1a641cac8dd86660ba45cb10734f';
const V169_DIGEST =
  'eb567c5347320f58b0e47990d45800c401e6db092b329bed03d7dfd7ef7b96e2';

const expectedKeys = [
  'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
  'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
  'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
] as const;

type SanitizedCreatedRow = {
  id: string;
  key: string;
  type: string | null;
  target: string[];
};

function writeResult(value: unknown) {
  mkdirSync(RESULT_PATH.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  writeFileSync(RESULT_PATH, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function createdRowsFrom(body: unknown): SanitizedCreatedRow[] {
  const root = asObject(body);
  const raw = root?.created;
  const rows = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return rows.flatMap((item): SanitizedCreatedRow[] => {
    const row = asObject(item);
    if (!row) return [];
    const id = typeof row.id === 'string' ? row.id : null;
    const key = typeof row.key === 'string' ? row.key : null;
    if (!id || !key) return [];
    const target = Array.isArray(row.target)
      ? row.target.filter((v): v is string => typeof v === 'string')
      : [];
    return [{
      id,
      key,
      type: typeof row.type === 'string' ? row.type : null,
      target,
    }];
  });
}

function failedCountFrom(body: unknown): number {
  const root = asObject(body);
  return Array.isArray(root?.failed) ? root!.failed.length : 0;
}

async function rollbackCreated(
  token: string,
  rows: SanitizedCreatedRow[],
): Promise<Array<{ id: string; key: string; status: number; ok: boolean }>> {
  const results: Array<{ id: string; key: string; status: number; ok: boolean }> = [];
  for (const row of rows) {
    const url =
      'https://api.vercel.com/v9/projects/'
      + encodeURIComponent(PROJECT_ID)
      + '/env/'
      + encodeURIComponent(row.id)
      + '?teamId='
      + encodeURIComponent(TEAM_ID);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
    });
    results.push({ id: row.id, key: row.key, status: response.status, ok: response.ok });
  }
  return results;
}

async function main() {
  const token = process.env.VERCEL_TOKEN ?? '';
  const schedulerSecret = process.env.FANDEX_NAVER_NEWS_SCHEDULER_SECRET ?? '';
  const runId = process.env.GITHUB_RUN_ID ?? 'unknown-run';
  const sha = process.env.GITHUB_SHA ?? 'unknown-sha';

  if (!token || !schedulerSecret) {
    writeResult({
      state: 'configuration-mutation-precondition-blocked',
      blocker: !token ? 'vercel-token-unavailable' : 'scheduler-secret-unavailable',
      providerCalls: 0,
      rawSecretValuesPersisted: false,
    });
    process.exitCode = 1;
    return;
  }

  const authRecord = JSON.parse(readFileSync(
    'data/momentum-research/pr127_v166_configuration_mutation_authorization_record.json',
    'utf8',
  )) as FandexMomentumVerifierConfigurationMutationAuthorizationRecord;

  const evaluatedAt = new Date().toISOString();
  const v166 = evaluateFandexMomentumVerifierConfigurationMutationAuthorization({
    evaluatedAt,
    requestIntent: 'explicit-configuration-mutation-authorization',
    upstreamV165Digest: V165_DIGEST,
    upstreamV165State: 'provisioning-plan-ready',
    record: authRecord,
  });

  if (v166.state !== 'configuration-mutation-authorized' || !v166.recordDigest) {
    writeResult({
      state: 'configuration-mutation-precondition-blocked',
      blocker: 'v166-authorization-not-effective',
      evaluatedAt,
      v166: {
        state: v166.state,
        blockers: v166.blockers,
        digest: v166.digest,
      },
      providerCalls: 0,
      rawSecretValuesPersisted: false,
    });
    process.exitCode = 1;
    return;
  }

  const reconciliation = JSON.parse(readFileSync(
    'data/momentum-research/pr127_external_inventory_success_post_read_reconciliation_20260925T212433KST.json',
    'utf8',
  ));
  assert.equal(reconciliation.configurationEvidence.v169.state, 'rollback-readiness-ready');
  assert.equal(reconciliation.configurationEvidence.v169.rollbackReady, true);
  assert.equal(reconciliation.configurationEvidence.v169.digest, V169_DIGEST);

  // Generated only inside this trusted runner. Never print or persist the value.
  const verifierSecret = randomBytes(32).toString('base64url');
  const bytes = Buffer.byteLength(verifierSecret, 'utf8');
  const contractSatisfied =
    verifierSecret.length >= 24
    && bytes <= 512
    && !/[\s\u0000-\u001f\u007f]/.test(verifierSecret);
  const differsFromScheduler = verifierSecret !== schedulerSecret;

  if (!contractSatisfied || !differsFromScheduler) {
    writeResult({
      state: 'configuration-mutation-precondition-blocked',
      blocker: !contractSatisfied
        ? 'generated-verifier-secret-contract-invalid'
        : 'generated-verifier-secret-equals-scheduler-secret',
      providerCalls: 0,
      rawSecretValuesPersisted: false,
    });
    process.exitCode = 1;
    return;
  }

  const handleId = 'github-actions-ephemeral:v167:' + runId;
  const attestation: FandexMomentumVerifierTrustedSecretHandleAttestation = {
    handleId,
    key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
    target: 'production',
    valueExposed: false,
    secretContractSatisfied: true,
    minimumUtf8BytesSatisfied: true,
    maximumUtf8BytesSatisfied: true,
    whitespaceOrControlCharactersAbsent: true,
    differsFromSchedulerCredential: true,
    schedulerCredentialKey: 'FANDEX_NAVER_NEWS_SCHEDULER_SECRET',
    attestationMethod:
      'trusted-environment-non-equality-attestation-without-secret-output',
  };

  const v167 = evaluateFandexMomentumVerifierConfigurationMutationExecutionGuard({
    authorization: v166,
    expectedV165PlanDigest: V165_DIGEST,
    expectedAuthorizationRecordDigest: v166.recordDigest,
    secretHandleAttestation: attestation,
  });
  if (v167.state !== 'mutation-envelope-ready' || !v167.envelope) {
    writeResult({
      state: 'configuration-mutation-precondition-blocked',
      blocker: 'v167-mutation-envelope-not-ready',
      v166: { state: v166.state, digest: v166.digest, recordDigest: v166.recordDigest },
      v167: { state: v167.state, blockers: v167.blockers, digest: v167.digest },
      providerCalls: 0,
      rawSecretValuesPersisted: false,
    });
    process.exitCode = 1;
    return;
  }

  const v168 = buildFandexMomentumVerifierVercelMutationDryRun({ guard: v167 });
  if (v168.state !== 'dry-run-ready' || !v168.plan) {
    writeResult({
      state: 'configuration-mutation-precondition-blocked',
      blocker: 'v168-dry-run-not-ready',
      v166: { state: v166.state, digest: v166.digest, recordDigest: v166.recordDigest },
      v167: { state: v167.state, digest: v167.digest },
      v168: { state: v168.state, blockers: v168.blockers, digest: v168.digest },
      providerCalls: 0,
      rawSecretValuesPersisted: false,
    });
    process.exitCode = 1;
    return;
  }

  const body = [
    {
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
      value: 'approved-v162-research-read-only',
      type: 'plain',
      target: ['production'],
      comment: 'FANDEX v162 research read-only verifier channel gate',
    },
    {
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
      value: 'production',
      type: 'plain',
      target: ['production'],
      comment: 'FANDEX v162 research read-only verifier deployment selector',
    },
    {
      key: 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
      value: verifierSecret,
      type: 'sensitive',
      target: ['production'],
      comment: 'FANDEX v162 dedicated verifier authorization secret',
    },
  ];

  const url =
    'https://api.vercel.com/v10/projects/'
    + encodeURIComponent(PROJECT_ID)
    + '/env?upsert=true&teamId='
    + encodeURIComponent(TEAM_ID);

  let providerCalls = 0;
  let responseStatus: number | null = null;
  let created: SanitizedCreatedRow[] = [];
  let failedCount = 0;
  let rollback: Array<{ id: string; key: string; status: number; ok: boolean }> = [];

  try {
    providerCalls += 1;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    responseStatus = response.status;

    let providerBody: unknown = null;
    try {
      providerBody = await response.json();
    } catch {
      providerBody = null;
    }

    created = createdRowsFrom(providerBody);
    failedCount = failedCountFrom(providerBody);
    const createdKeys = new Set(created.map((row) => row.key));
    const allExpectedCreated =
      expectedKeys.every((key) => createdKeys.has(key))
      && createdKeys.size === expectedKeys.length;

    if (!response.ok || failedCount !== 0 || !allExpectedCreated) {
      if (created.length > 0) {
        rollback = await rollbackCreated(token, created);
        providerCalls += rollback.length;
      }
      const rollbackComplete =
        created.length === 0 || rollback.every((row) => row.ok);

      writeResult({
        contractVersion: 'fandex_momentum_pr127_v166_configuration_mutation_execution_result_v1',
        lifecycle: 'research-configuration-mutation',
        state: rollbackComplete
          ? 'configuration-mutation-failed-rolled-back'
          : 'configuration-mutation-failed-rollback-incomplete',
        executedAt: new Date().toISOString(),
        github: { runId, sha },
        authorization: {
          authorizationId: authRecord.authorizationId,
          v166RecordDigest: v166.recordDigest,
          v166ResultDigest: v166.digest,
        },
        v167: {
          state: v167.state,
          digest: v167.digest,
          trustedSecretHandleId: handleId,
          secretValueExposed: false,
          differsFromSchedulerCredential: true,
        },
        v168: { state: v168.state, digest: v168.digest },
        v169: { state: 'rollback-readiness-ready', digest: V169_DIGEST },
        provider: {
          batchPostStatus: responseStatus,
          created,
          failedCount,
          rawProviderResponsePersisted: false,
          secretValueLogged: false,
          secretValuePersistedInArtifact: false,
        },
        rollback,
        effects: {
          vercelCalls: providerCalls,
          environmentMutationAttempted: true,
          rollbackAttempted: created.length > 0,
          productionDeployments: 0,
          verifierActivations: 0,
          nativeVerifierExecutions: 0,
          databaseWrites: 0,
          productMetricWrites: 0,
          registryMutations: 0,
          historyWrites: 0,
          watermarkWrites: 0,
          manifestWrites: 0,
        },
        productBoundary: {
          productMomentumScore: null,
          productionEligible: false,
          productProductionActual: '1/7',
        },
      });
      process.exitCode = 1;
      return;
    }

    writeResult({
      contractVersion: 'fandex_momentum_pr127_v166_configuration_mutation_execution_result_v1',
      lifecycle: 'research-configuration-mutation',
      state: 'configuration-mutation-succeeded',
      executedAt: new Date().toISOString(),
      github: { runId, sha },
      authorization: {
        authorizationId: authRecord.authorizationId,
        v166RecordDigest: v166.recordDigest,
        v166ResultDigest: v166.digest,
      },
      v167: {
        state: v167.state,
        digest: v167.digest,
        mutationEnvelopeReady: true,
        trustedSecretHandleId: handleId,
        secretValueExposed: false,
        secretContractSatisfied: true,
        differsFromSchedulerCredential: true,
        attestationMethod:
          'trusted-environment-non-equality-attestation-without-secret-output',
      },
      v168: {
        state: v168.state,
        dryRunReady: true,
        digest: v168.digest,
      },
      v169: {
        state: 'rollback-readiness-ready',
        rollbackReady: true,
        digest: V169_DIGEST,
      },
      provider: {
        batchPostStatus: responseStatus,
        created,
        failedCount,
        rawProviderResponsePersisted: false,
        secretValueLogged: false,
        secretValuePersistedInArtifact: false,
      },
      rollback: [],
      effects: {
        vercelCalls: providerCalls,
        environmentMutations: 1,
        verifierKeysCreatedOrUpserted: expectedKeys.length,
        secretWrites: 1,
        schedulerCredentialMutations: 0,
        runtimeDatabaseCredentialMutations: 0,
        previewCredentialCopies: 0,
        productionDeployments: 0,
        verifierActivations: 0,
        nativeVerifierExecutions: 0,
        databaseWrites: 0,
        productMetricWrites: 0,
        registryMutations: 0,
        historyWrites: 0,
        watermarkWrites: 0,
        manifestWrites: 0,
      },
      productBoundary: {
        productMomentumScore: null,
        productionEligible: false,
        productProductionActual: '1/7',
      },
    });
  } finally {
    // Ensure the generated verifier secret is never deliberately persisted or printed.
  }
}

main().catch((error) => {
  writeResult({
    state: 'configuration-mutation-execution-error',
    errorCode: error instanceof Error ? error.name : 'unknown-error',
    providerResponsePersisted: false,
    secretValuePersistedInArtifact: false,
  });
  process.exitCode = 1;
});
