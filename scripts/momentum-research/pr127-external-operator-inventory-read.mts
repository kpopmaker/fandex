import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

import {
  evaluateFandexMomentumVerifierOperatorResponseIntake,
  type FandexMomentumVerifierOperatorResponse,
} from '../../lib/intelligence/fandexMomentumVerifierOperatorResponseIntakeResearch';
import {
  projectFandexMomentumVerifierOperatorResponse,
} from '../../lib/intelligence/fandexMomentumVerifierOperatorResponseProjectionResearch';
import {
  buildFandexMomentumVerifierVercelInventoryExecutionEnvelope,
} from '../../lib/intelligence/fandexMomentumVerifierVercelInventoryExecutionEnvelopeResearch';
import {
  evaluateFandexMomentumVerifierExternalInventoryExecutionResponseIntake,
  type FandexMomentumVerifierExternalInventoryExecutionResponse,
} from '../../lib/intelligence/fandexMomentumVerifierExternalInventoryExecutionResponseIntakeResearch';

const V172 =
  'e779f7386db56d4fff7202d45a82c35c522036748018071b8205523a843f4b2a';
const V176 =
  'd66383659245ec10012bfd3575fe4cf16a89299784580a2a5159638d4e146ed5';
const TEAM = 'team_OrRPxuBxMwCYU3kk0r76AfOs' as const;
const PROJECT = 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const;
const ENDPOINT = '/v10/projects/{idOrName}/env' as const;
const CONFIRM = 'EXECUTE_ONE_VERCEL_ENV_INVENTORY_READ';
const REQUEST_PATH =
  process.env.MOMENTUM_OPERATOR_REQUEST_PATH
  ?? 'data/momentum-research/pr127_external_operator_execution_request.json';
const RESULT_PATH =
  process.env.MOMENTUM_OPERATOR_RESULT_PATH
  ?? 'operator-result/pr127_external_operator_result.json';

type Request = {
  contractVersion: 'fandex_momentum_external_operator_execution_request_v1';
  authorized: boolean;
  confirm: string;
  requestId: string | null;
  authorizedBy: string | null;
  decidedAt: string | null;
  validFrom: string | null;
  expiresAt: string | null;
  opaqueSecretRollbackHandleId: string | null;
  opaqueSecretRollbackRestorableAttested: boolean;
  exactRead: {
    provider: 'vercel';
    method: 'GET';
    endpoint: typeof ENDPOINT;
    teamId: typeof TEAM;
    projectId: typeof PROJECT;
    decrypt: 'false';
    maximumProviderCalls: 1;
    maximumInventoryReads: 1;
  };
  upstream: {
    v172Digest: string;
    v176Digest: string;
  };
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function exactIso(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9._:-]{8,256}$/.test(value);
}

function assertGate(request: Request, evaluatedAt: string): void {
  if (request.contractVersion !== 'fandex_momentum_external_operator_execution_request_v1') {
    throw new Error('request-contract-version-invalid');
  }
  if (request.authorized !== true || request.confirm !== CONFIRM) {
    throw new Error('external-operator-read-not-authorized');
  }
  if (!validId(request.requestId)) {
    throw new Error('external-operator-request-id-invalid');
  }
  if (
    typeof request.authorizedBy !== 'string'
    || request.authorizedBy.trim().length === 0
    || request.authorizedBy.length > 256
  ) {
    throw new Error('external-operator-authorizer-invalid');
  }
  if (
    !exactIso(request.decidedAt)
    || !exactIso(request.validFrom)
    || !exactIso(request.expiresAt)
  ) {
    throw new Error('external-operator-authorization-time-invalid');
  }
  if (Date.parse(request.decidedAt) > Date.parse(request.validFrom)) {
    throw new Error('external-operator-authorization-order-invalid');
  }
  if (Date.parse(request.validFrom) >= Date.parse(request.expiresAt)) {
    throw new Error('external-operator-authorization-window-invalid');
  }
  if (
    Date.parse(evaluatedAt) < Date.parse(request.validFrom)
    || Date.parse(evaluatedAt) >= Date.parse(request.expiresAt)
  ) {
    throw new Error('external-operator-authorization-not-effective');
  }
  if (
    request.exactRead.provider !== 'vercel'
    || request.exactRead.method !== 'GET'
    || request.exactRead.endpoint !== ENDPOINT
    || request.exactRead.teamId !== TEAM
    || request.exactRead.projectId !== PROJECT
    || request.exactRead.decrypt !== 'false'
    || request.exactRead.maximumProviderCalls !== 1
    || request.exactRead.maximumInventoryReads !== 1
    || request.upstream.v172Digest !== V172
    || request.upstream.v176Digest !== V176
  ) {
    throw new Error('external-operator-frozen-binding-invalid');
  }
}

function normalizeTargets(value: unknown): Array<'production' | 'preview' | 'development'> {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return raw.filter(
    (target): target is 'production' | 'preview' | 'development' =>
      target === 'production' || target === 'preview' || target === 'development',
  );
}

function paginationRisk(body: Record<string, unknown>, envCount: number): boolean {
  const pagination = body.pagination;
  if (pagination === undefined || pagination === null) return false;
  if (typeof pagination !== 'object' || Array.isArray(pagination)) return true;
  const p = pagination as Record<string, unknown>;
  if (p.hasMore === true) return true;
  for (const key of ['next', 'nextCursor', 'cursor']) {
    const value = p[key];
    if (value !== undefined && value !== null && value !== '' && value !== false) {
      return true;
    }
  }
  if (typeof p.count === 'number' && p.count > envCount) return true;
  return false;
}

async function writeResult(value: unknown): Promise<void> {
  await mkdir(RESULT_PATH.split('/').slice(0, -1).join('/') || '.', { recursive: true });
  await writeFile(RESULT_PATH, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

async function run(): Promise<void> {
  const evaluatedAt = new Date().toISOString();
  const request = JSON.parse(await readFile(REQUEST_PATH, 'utf8')) as Request;

  assertGate(request, evaluatedAt);

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    await writeResult({
      contractVersion: 'fandex_momentum_external_operator_execution_result_v1',
      state: 'credential-unavailable',
      requestId: request.requestId,
      providerReads: 0,
      blocker: 'github-actions-vercel-token-secret-unavailable',
      productBoundary: {
        productMomentumScore: null,
        productionEligible: false,
        productProductionActual: '1/7',
      },
    });
    throw new Error('github-actions-vercel-token-secret-unavailable');
  }

  const runId = process.env.GITHUB_RUN_ID ?? 'unknown-run';
  const runAttempt = process.env.GITHUB_RUN_ATTEMPT ?? '1';
  const interfaceName = 'github-actions-generic-vercel-rest-read';
  const credentialHandleId =
    `opaque-vercel-bearer:github-actions:VERCEL_TOKEN:${runId}:${runAttempt}`;
  const authorizationSeed = [
    request.requestId,
    request.authorizedBy,
    request.decidedAt,
    request.validFrom,
    request.expiresAt,
    runId,
    runAttempt,
  ].join('|');

  const provisioningAuthorizationId =
    sha256(`${authorizationSeed}|read-channel-provisioning`);
  const readExecutionAuthorizationId =
    sha256(`${authorizationSeed}|inventory-read-execution`);
  const submittedAt = new Date().toISOString();

  const response: FandexMomentumVerifierOperatorResponse = {
    responseId: `operator-response:v177:gha:${runId}:${runAttempt}`,
    submittedAt,
    submittedBy: request.authorizedBy!,
    upstreamV176Digest: V176,
    upstreamV172Digest: V172,
    provisioningAuthorization: {
      authorizationId: provisioningAuthorizationId,
      kind: 'read-channel-provisioning',
      decidedAt: request.decidedAt!,
      decidedBy: request.authorizedBy!,
      validFrom: request.validFrom!,
      expiresAt: request.expiresAt!,
      revokedAt: null,
      targetTeamId: TEAM,
      targetProjectId: PROJECT,
      upstreamV176Digest: V176,
      upstreamV172Digest: V172,
      credentialHandleId,
    },
    credentialHandle: {
      handleId: credentialHandleId,
      provider: 'vercel',
      kind: 'opaque-bearer-credential-handle',
      tokenValueExposed: false,
      tokenValuePersisted: false,
      targetTeamId: TEAM,
      targetProjectId: PROJECT,
      bearerCredentialAvailable: true,
      credentialUsableForRead: true,
      credentialRevoked: false,
    },
    readExecutionAuthorization: {
      authorizationId: readExecutionAuthorizationId,
      kind: 'inventory-read-execution',
      decidedAt: request.decidedAt!,
      decidedBy: request.authorizedBy!,
      validFrom: request.validFrom!,
      expiresAt: request.expiresAt!,
      revokedAt: null,
      targetTeamId: TEAM,
      targetProjectId: PROJECT,
      upstreamV176Digest: V176,
      upstreamV172Digest: V172,
      credentialHandleId,
    },
    capabilityReceipt: {
      receiptId: `capability-receipt:v177:gha:${runId}:${runAttempt}`,
      observedAt: submittedAt,
      interfaceName,
      exactEnvironmentInventoryActionAvailable: false,
      genericVercelRestActionAvailable: true,
      authenticatedReadOnly: true,
      mutationCapabilityPresent: false,
      exactRequestSupported: true,
      maximumProviderCalls: 1,
      maximumInventoryReads: 1,
      request: {
        method: 'GET',
        endpoint: ENDPOINT,
        teamId: TEAM,
        projectId: PROJECT,
        decrypt: 'false',
        gitBranch: null,
        customEnvironmentId: null,
        customEnvironmentSlug: null,
      },
      credentialHandleId,
      upstreamV176Digest: V176,
      upstreamV172Digest: V172,
    },
  };

  const v177 = evaluateFandexMomentumVerifierOperatorResponseIntake({
    evaluatedAt: submittedAt,
    requestIntent: 'operator-response-intake',
    upstreamV176Digest: V176,
    upstreamV172Digest: V172,
    response,
  });
  if (!v177.intakeReady) {
    await writeResult({
      contractVersion: 'fandex_momentum_external_operator_execution_result_v1',
      state: 'v177-blocked',
      requestId: request.requestId,
      providerReads: 0,
      v177: {
        state: v177.state,
        digest: v177.digest,
        blockers: v177.blockers,
      },
      productBoundary: {
        productMomentumScore: null,
        productionEligible: false,
        productProductionActual: '1/7',
      },
    });
    throw new Error('v177-operator-response-intake-not-ready');
  }

  const v178 = projectFandexMomentumVerifierOperatorResponse({
    evaluatedAt: submittedAt,
    requestIntent: 'operator-response-projection',
    upstreamV177: v177,
    response,
  });
  if (
    !v178.projectionReady
    || v178.projectedV172 === null
    || v178.projectedV173ReadExecutionAuthorization === null
  ) {
    await writeResult({
      contractVersion: 'fandex_momentum_external_operator_execution_result_v1',
      state: 'v178-blocked',
      requestId: request.requestId,
      providerReads: 0,
      v177: { state: v177.state, digest: v177.digest },
      v178: {
        state: v178.state,
        digest: v178.digest,
        blockers: v178.blockers,
      },
      productBoundary: {
        productMomentumScore: null,
        productionEligible: false,
        productProductionActual: '1/7',
      },
    });
    throw new Error('v178-operator-response-projection-not-ready');
  }

  const v173 = buildFandexMomentumVerifierVercelInventoryExecutionEnvelope({
    evaluatedAt: submittedAt,
    requestIntent: 'explicit-inventory-read-execution-authorization',
    upstreamV172: v178.projectedV172,
    readExecutionAuthorization: v178.projectedV173ReadExecutionAuthorization,
  });
  if (!v173.readExecutionAuthorized || !v173.envelopePrepared || v173.envelope === null) {
    await writeResult({
      contractVersion: 'fandex_momentum_external_operator_execution_result_v1',
      state: 'v173-blocked',
      requestId: request.requestId,
      providerReads: 0,
      v177: { state: v177.state, digest: v177.digest },
      v178: { state: v178.state, digest: v178.digest },
      v173: {
        state: v173.state,
        digest: v173.digest,
        blockers: v173.blockers,
      },
      productBoundary: {
        productMomentumScore: null,
        productionEligible: false,
        productProductionActual: '1/7',
      },
    });
    throw new Error('v173-read-execution-not-ready');
  }

  const url = new URL(`https://api.vercel.com/v10/projects/${PROJECT}/env`);
  url.searchParams.set('teamId', TEAM);
  url.searchParams.set('decrypt', 'false');

  let providerReadCount = 0;
  let res: Response;
  try {
    providerReadCount += 1;
    res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'User-Agent': 'fandex-momentum-external-operator-v1',
      },
    });
  } catch {
    await writeResult({
      contractVersion: 'fandex_momentum_external_operator_execution_result_v1',
      state: 'provider-transport-error',
      requestId: request.requestId,
      providerReads: providerReadCount,
      v177: { state: v177.state, digest: v177.digest },
      v178: { state: v178.state, digest: v178.digest },
      v173: { state: v173.state, digest: v173.digest, envelopeId: v173.envelope.envelopeId },
      blocker: 'vercel-inventory-read-transport-error',
      productBoundary: {
        productMomentumScore: null,
        productionEligible: false,
        productProductionActual: '1/7',
      },
    });
    throw new Error('vercel-inventory-read-transport-error');
  }

  if (res.status !== 200) {
    await writeResult({
      contractVersion: 'fandex_momentum_external_operator_execution_result_v1',
      state: 'provider-http-error',
      requestId: request.requestId,
      providerReads: providerReadCount,
      httpStatus: res.status,
      v177: { state: v177.state, digest: v177.digest },
      v178: { state: v178.state, digest: v178.digest },
      v173: { state: v173.state, digest: v173.digest, envelopeId: v173.envelope.envelopeId },
      blocker: 'vercel-inventory-read-non-200',
      productBoundary: {
        productMomentumScore: null,
        productionEligible: false,
        productProductionActual: '1/7',
      },
    });
    throw new Error(`vercel-inventory-read-http-${res.status}`);
  }

  const body = await res.json() as Record<string, unknown>;
  const envs = body.envs;
  if (!Array.isArray(envs)) {
    await writeResult({
      contractVersion: 'fandex_momentum_external_operator_execution_result_v1',
      state: 'provider-response-shape-invalid',
      requestId: request.requestId,
      providerReads: providerReadCount,
      httpStatus: res.status,
      blocker: 'vercel-env-array-missing',
      productBoundary: {
        productMomentumScore: null,
        productionEligible: false,
        productProductionActual: '1/7',
      },
    });
    throw new Error('vercel-env-array-missing');
  }

  const targetKeys = new Set([
    'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
    'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
    'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
  ]);
  const providerRows = envs
    .filter((entry): entry is Record<string, unknown> =>
      typeof entry === 'object'
      && entry !== null
      && !Array.isArray(entry)
      && typeof (entry as Record<string, unknown>).key === 'string'
      && targetKeys.has((entry as Record<string, unknown>).key as string),
    )
    .map((entry) => {
      const key = String(entry.key);
      const type = typeof entry.type === 'string' ? entry.type : 'unknown';
      const sensitive =
        key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET'
        || type === 'sensitive'
        || type === 'encrypted';
      const decrypted = entry.decrypted === true;
      return {
        id: typeof entry.id === 'string' ? entry.id : '',
        key,
        type,
        target: normalizeTargets(entry.target),
        decrypted,
        value:
          !sensitive
          && !decrypted
          && type === 'plain'
          && typeof entry.value === 'string'
            ? entry.value
            : null,
      };
    });

  const secretRows = providerRows.filter(
    (row) => row.key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
  );
  const rollbackHandle = request.opaqueSecretRollbackHandleId;
  const rollbackAttestation =
    secretRows.length === 1
    && request.opaqueSecretRollbackRestorableAttested === true
    && validId(rollbackHandle)
      ? {
          envId: secretRows[0]!.id,
          handleId: rollbackHandle,
          restorable: true as const,
          source: 'trusted-environment-opaque-snapshot' as const,
          secretValueExposed: false as const,
        }
      : null;

  const hasPaginationRisk = paginationRisk(body, envs.length);
  if (hasPaginationRisk) {
    await writeResult({
      contractVersion: 'fandex_momentum_external_operator_execution_result_v1',
      state: 'provider-response-incomplete',
      requestId: request.requestId,
      providerReads: providerReadCount,
      httpStatus: res.status,
      blocker: 'vercel-inventory-pagination-or-additional-page-risk',
      productBoundary: {
        productMomentumScore: null,
        productionEligible: false,
        productProductionActual: '1/7',
      },
    });
    throw new Error('vercel-inventory-pagination-or-additional-page-risk');
  }

  const v179Response: FandexMomentumVerifierExternalInventoryExecutionResponse = {
    responseId: `external-inventory-response:v179:gha:${runId}:${runAttempt}`,
    submittedAt: new Date().toISOString(),
    submittedBy: request.authorizedBy!,
    upstreamV173Digest: v173.digest,
    execution: {
      status: 'success',
      envelopeId: v173.envelope.envelopeId,
      interfaceName,
      method: 'GET',
      endpoint: ENDPOINT,
      teamId: TEAM,
      projectId: PROJECT,
      decryptRequested: false,
      readCount: 1,
      mutationCapabilityPresent: false,
      decryptTruePathPresent: false,
      decryptedValueEndpointPresent: false,
      credentialValueExposed: false,
      providerResponseReceived: true,
      responseBoundToProjectAndTeam: true,
      completeForProductionTarget: true,
      truncationOrAdditionalPageRisk: false,
      rawProviderResponsePersisted: false,
      secretValueLogged: false,
      secretValuePersisted: false,
    },
    providerRows,
    opaqueSecretRollbackAttestation: rollbackAttestation,
  };

  const v179 = evaluateFandexMomentumVerifierExternalInventoryExecutionResponseIntake({
    evaluatedAt: v179Response.submittedAt,
    requestIntent: 'external-inventory-execution-response-intake',
    upstreamV173: v173,
    response: v179Response,
  });

  await writeResult({
    contractVersion: 'fandex_momentum_external_operator_execution_result_v1',
    state: v179.intakeReady ? 'external-operator-read-intake-ready' : 'external-operator-read-intake-blocked',
    requestId: request.requestId,
    authorizedBy: request.authorizedBy,
    providerReads: providerReadCount,
    rawProviderResponsePersisted: false,
    credentialValueExposed: false,
    secretValuePersisted: false,
    v177Response: response,
    v177: {
      state: v177.state,
      intakeReady: v177.intakeReady,
      digest: v177.digest,
      blockers: v177.blockers,
    },
    v178: {
      state: v178.state,
      projectionReady: v178.projectionReady,
      digest: v178.digest,
      blockers: v178.blockers,
    },
    v173: {
      state: v173.state,
      envelopePrepared: v173.envelopePrepared,
      readExecutionAuthorized: v173.readExecutionAuthorized,
      digest: v173.digest,
      envelopeId: v173.envelope.envelopeId,
      blockers: v173.blockers,
    },
    v179Response,
    v179: {
      state: v179.state,
      intakeReady: v179.intakeReady,
      v171HandoffReady: v179.v171HandoffReady,
      digest: v179.digest,
      blockers: v179.blockers,
      secretRollback: v179.secretRollback,
    },
    productBoundary: {
      productMomentumScore: null,
      productionEligible: false,
      productProductionActual: '1/7',
    },
  });

  if (!v179.intakeReady) {
    throw new Error('v179-external-inventory-response-intake-blocked');
  }
}

run().catch(async (error) => {
  const message = error instanceof Error ? error.message : 'unknown-error';
  console.error(`external operator execution failed closed: ${message}`);
  process.exitCode = 1;
});
