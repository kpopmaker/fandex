import { sha256Canonical } from '../shared/canonicalDigest';
import {
  evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt,
  type FandexMomentumVerifierVercelInventoryExecutionReceiptResult,
} from './fandexMomentumVerifierVercelInventoryExecutionReceiptResearch';
import type {
  FandexMomentumVerifierOpaqueSecretRollbackAttestation,
  FandexMomentumVerifierVercelInventoryRow,
} from './fandexMomentumVerifierVercelInventoryAdapterResearch';
import type {
  FandexMomentumVerifierVercelInventoryExecutionEnvelopeResult,
} from './fandexMomentumVerifierVercelInventoryExecutionEnvelopeResearch';

export const FANDEX_MOMENTUM_VERIFIER_EXTERNAL_INVENTORY_EXECUTION_RESPONSE_INTAKE_VERSION =
  'v179_fandex_momentum_verifier_external_inventory_execution_response_intake_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_EXTERNAL_INVENTORY_EXECUTION_RESPONSE_INTAKE_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_EXTERNAL_INVENTORY_EXECUTION_RESPONSE_INTAKE_VERSION,
    lifecycle: 'research' as const,
    upstreamV173Contract:
      'v173_fandex_momentum_verifier_vercel_inventory_execution_envelope_research_v1' as const,
    downstreamV174Contract:
      'v174_fandex_momentum_verifier_vercel_inventory_execution_receipt_handoff_research_v1' as const,
    intakeOnly: true as const,
    providerReadPerformedByThisContract: false as const,
    providerWritePerformedByThisContract: false as const,
    genericContinuationCountsAsExecutionResponse: false as const,
    rawCredentialValueAllowed: false as const,
    decryptedProviderRowsAllowed: false as const,
    sensitiveProviderValuesAllowed: false as const,
    existingDedicatedSecretRequiresOpaqueRollbackAttestation: true as const,
    productOrLedgerMutationAllowed: false as const,
  });

export type FandexMomentumVerifierExternalInventoryExecutionResponse =
  Readonly<{
    responseId: string;
    submittedAt: string;
    submittedBy: string;
    upstreamV173Digest: string;
    execution: Readonly<{
      status: 'success';
      envelopeId: string;
      interfaceName: string;
      method: 'GET';
      endpoint: '/v10/projects/{idOrName}/env';
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
      decryptRequested: false;
      readCount: 1;
      mutationCapabilityPresent: false;
      decryptTruePathPresent: false;
      decryptedValueEndpointPresent: false;
      credentialValueExposed: false;
      providerResponseReceived: true;
      responseBoundToProjectAndTeam: true;
      completeForProductionTarget: true;
      truncationOrAdditionalPageRisk: false;
      rawProviderResponsePersisted: false;
      secretValueLogged: false;
      secretValuePersisted: false;
    }>;
    providerRows: readonly FandexMomentumVerifierVercelInventoryRow[];
    opaqueSecretRollbackAttestation:
      FandexMomentumVerifierOpaqueSecretRollbackAttestation | null;
  }>;

export type FandexMomentumVerifierExternalInventoryExecutionResponseIntakeResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_EXTERNAL_INVENTORY_EXECUTION_RESPONSE_INTAKE_VERSION;
    state:
      | 'external-inventory-execution-response-missing'
      | 'external-inventory-execution-response-invalid'
      | 'v174-execution-receipt-ready'
      | 'v171-handoff-ready';
    intakeReady: boolean;
    v171HandoffReady: boolean;
    upstreamV173Digest: string;
    responseId: string | null;
    secretRollback: Readonly<{
      dedicatedSecretRowPresent: boolean | null;
      dedicatedSecretEnvId: string | null;
      opaqueRollbackAttestationRequired: boolean | null;
      opaqueRollbackAttestationAccepted: boolean;
    }>;
    v174: FandexMomentumVerifierVercelInventoryExecutionReceiptResult | null;
    blockers: readonly string[];
    effects: Readonly<{
      authorizationWrites: 0;
      credentialCreates: 0;
      credentialReads: 0;
      credentialRotations: 0;
      vercelReads: 0;
      vercelWrites: 0;
      environmentMutations: 0;
      secretReads: 0;
      secretWrites: 0;
      productionDeployments: 0;
      verifierActivations: 0;
      nativeVerifierExecutions: 0;
      databaseWrites: 0;
      productMetricWrites: 0;
      registryMutations: 0;
      historyWrites: 0;
      watermarkWrites: 0;
      manifestWrites: 0;
      pullRequestMerges: 0;
    }>;
    productBoundary: Readonly<{
      productMomentumScore: null;
      productionEligible: false;
      productProductionActual: '0/7';
    }>;
    digest: string;
  }>;

function exactIso(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function validId(value: string): boolean {
  return /^[A-Za-z0-9._:-]{8,256}$/.test(value);
}

function validDigest(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

function nonEmptyIdentity(value: string): boolean {
  return value.trim().length > 0 && value.length <= 256;
}

function validProviderRow(row: FandexMomentumVerifierVercelInventoryRow): boolean {
  return (
    /^[A-Za-z0-9._:-]{3,256}$/.test(row.id)
    && row.key.length > 0
    && row.key.length <= 256
    && row.target.length > 0
    && row.target.every((target) =>
      target === 'production'
      || target === 'preview'
      || target === 'development'
    )
    && row.decrypted === false
  );
}

function validOpaqueRollbackAttestation(
  attestation: FandexMomentumVerifierOpaqueSecretRollbackAttestation | null,
  envId: string,
): boolean {
  return (
    attestation !== null
    && attestation.envId === envId
    && validId(attestation.handleId)
    && attestation.restorable === true
    && attestation.source === 'trusted-environment-opaque-snapshot'
    && attestation.secretValueExposed === false
  );
}

function hasForbiddenCredentialMaterial(
  response: FandexMomentumVerifierExternalInventoryExecutionResponse,
): boolean {
  const serialized = JSON.stringify(response);
  return (
    serialized.includes('"token":')
    || serialized.includes('"accessToken":')
    || serialized.includes('"bearerToken":')
    || serialized.includes('"credentialValue":')
  );
}

export function evaluateFandexMomentumVerifierExternalInventoryExecutionResponseIntake(
  input: Readonly<{
    evaluatedAt: string;
    requestIntent:
      | 'generic-continuation'
      | 'external-inventory-execution-response-intake';
    upstreamV173:
      FandexMomentumVerifierVercelInventoryExecutionEnvelopeResult;
    response: FandexMomentumVerifierExternalInventoryExecutionResponse | null;
  }>,
): FandexMomentumVerifierExternalInventoryExecutionResponseIntakeResult {
  const blockers: string[] = [];

  if (!exactIso(input.evaluatedAt)) {
    blockers.push('external-inventory-response-evaluation-time-invalid');
  }

  const upstream = input.upstreamV173;
  if (
    upstream.contractVersion
      !== 'v173_fandex_momentum_verifier_vercel_inventory_execution_envelope_research_v1'
    || !validDigest(upstream.digest)
    || upstream.state !== 'read-execution-ready'
    || upstream.envelopePrepared !== true
    || upstream.readExecutionAuthorized !== true
    || upstream.envelope === null
  ) {
    blockers.push('upstream-v173-not-read-execution-ready');
  }

  if (input.requestIntent !== 'external-inventory-execution-response-intake') {
    blockers.push('generic-continuation-is-not-external-inventory-execution-response');
  }

  const response = input.response;
  let dedicatedSecretRowPresent: boolean | null = null;
  let dedicatedSecretEnvId: string | null = null;
  let opaqueRollbackAttestationRequired: boolean | null = null;
  let opaqueRollbackAttestationAccepted = false;
  let v174: FandexMomentumVerifierVercelInventoryExecutionReceiptResult | null = null;

  if (response === null) {
    blockers.push('external-inventory-execution-response-missing');
  } else {
    if (
      !validId(response.responseId)
      || !exactIso(response.submittedAt)
      || !nonEmptyIdentity(response.submittedBy)
      || !validDigest(response.upstreamV173Digest)
      || response.upstreamV173Digest !== upstream.digest
    ) {
      blockers.push('external-inventory-execution-response-binding-invalid');
    }

    if (hasForbiddenCredentialMaterial(response)) {
      blockers.push('external-inventory-execution-response-raw-credential-material-forbidden');
    }

    const execution = response.execution;
    if (
      execution.status !== 'success'
      || !validId(execution.envelopeId)
      || !nonEmptyIdentity(execution.interfaceName)
      || execution.method !== 'GET'
      || execution.endpoint !== '/v10/projects/{idOrName}/env'
      || execution.teamId !== 'team_OrRPxuBxMwCYU3kk0r76AfOs'
      || execution.projectId !== 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
      || execution.decryptRequested !== false
      || execution.readCount !== 1
      || execution.mutationCapabilityPresent !== false
      || execution.decryptTruePathPresent !== false
      || execution.decryptedValueEndpointPresent !== false
      || execution.credentialValueExposed !== false
      || execution.providerResponseReceived !== true
      || execution.responseBoundToProjectAndTeam !== true
      || execution.completeForProductionTarget !== true
      || execution.truncationOrAdditionalPageRisk !== false
      || execution.rawProviderResponsePersisted !== false
      || execution.secretValueLogged !== false
      || execution.secretValuePersisted !== false
    ) {
      blockers.push('external-inventory-execution-response-execution-contract-invalid');
    }

    if (
      upstream.envelope !== null
      && execution.envelopeId !== upstream.envelope.envelopeId
    ) {
      blockers.push('external-inventory-execution-response-envelope-binding-mismatch');
    }

    for (const row of response.providerRows) {
      if (!validProviderRow(row)) {
        blockers.push('external-inventory-execution-response-provider-row-invalid');
        continue;
      }
      const sensitive =
        row.key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET'
        || row.type === 'sensitive'
        || row.type === 'encrypted';
      if (sensitive && row.value !== null) {
        blockers.push('external-inventory-execution-response-sensitive-value-forbidden');
      }
    }

    const secretRows = response.providerRows.filter(
      (row) => row.key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
    );
    dedicatedSecretRowPresent = secretRows.length > 0;
    opaqueRollbackAttestationRequired = secretRows.length === 1;

    if (secretRows.length > 1) {
      blockers.push('external-inventory-execution-response-duplicate-dedicated-secret');
    } else if (secretRows.length === 1) {
      const secretRow = secretRows[0]!;
      dedicatedSecretEnvId = secretRow.id;
      if (secretRow.target.includes('preview')) {
        blockers.push('external-inventory-execution-response-dedicated-secret-preview-scope-forbidden');
      }
      opaqueRollbackAttestationAccepted = validOpaqueRollbackAttestation(
        response.opaqueSecretRollbackAttestation,
        secretRow.id,
      );
      if (!opaqueRollbackAttestationAccepted) {
        blockers.push('external-inventory-execution-response-opaque-secret-rollback-attestation-required');
      }
    } else if (response.opaqueSecretRollbackAttestation !== null) {
      blockers.push('external-inventory-execution-response-unbound-opaque-secret-rollback-attestation');
    }

    if (blockers.length === 0) {
      v174 = evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt({
        evaluatedAt: input.evaluatedAt,
        upstreamV173: upstream,
        execution,
        providerRows: response.providerRows,
        opaqueSecretRollbackAttestation:
          response.opaqueSecretRollbackAttestation,
      });

      if (!v174.receiptReady) {
        blockers.push(...v174.blockers.map((blocker) => `v174:${blocker}`));
      }
    }
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);
  const intakeReady =
    response !== null
    && uniqueBlockers.length === 0
    && v174 !== null
    && v174.receiptReady;
  const v171HandoffReady =
    intakeReady
    && v174 !== null
    && v174.state === 'v171-handoff-ready'
    && v174.v171?.acquisitionReady === true;

  let state:
    FandexMomentumVerifierExternalInventoryExecutionResponseIntakeResult['state'];
  if (response === null) {
    state = 'external-inventory-execution-response-missing';
  } else if (!intakeReady) {
    state = 'external-inventory-execution-response-invalid';
  } else if (v171HandoffReady) {
    state = 'v171-handoff-ready';
  } else {
    state = 'v174-execution-receipt-ready';
  }

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_EXTERNAL_INVENTORY_EXECUTION_RESPONSE_INTAKE_VERSION,
    state,
    intakeReady,
    v171HandoffReady,
    upstreamV173Digest: upstream.digest,
    responseId: response?.responseId ?? null,
    secretRollback: Object.freeze({
      dedicatedSecretRowPresent,
      dedicatedSecretEnvId,
      opaqueRollbackAttestationRequired,
      opaqueRollbackAttestationAccepted,
    }),
    v174,
    blockers: uniqueBlockers,
    productBoundary: Object.freeze({
      productMomentumScore: null,
      productionEligible: false as const,
      productProductionActual: '0/7' as const,
    }),
  };

  return Object.freeze({
    ...payload,
    effects: Object.freeze({
      authorizationWrites: 0 as const,
      credentialCreates: 0 as const,
      credentialReads: 0 as const,
      credentialRotations: 0 as const,
      vercelReads: 0 as const,
      vercelWrites: 0 as const,
      environmentMutations: 0 as const,
      secretReads: 0 as const,
      secretWrites: 0 as const,
      productionDeployments: 0 as const,
      verifierActivations: 0 as const,
      nativeVerifierExecutions: 0 as const,
      databaseWrites: 0 as const,
      productMetricWrites: 0 as const,
      registryMutations: 0 as const,
      historyWrites: 0 as const,
      watermarkWrites: 0 as const,
      manifestWrites: 0 as const,
      pullRequestMerges: 0 as const,
    }),
    digest: sha256Canonical(payload),
  });
}
