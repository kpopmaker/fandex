import { sha256Canonical } from '../shared/canonicalDigest';
import {
  acquireFandexMomentumVerifierVercelInventoryResearch,
  type FandexMomentumVerifierVercelInventoryAcquisitionResult,
} from './fandexMomentumVerifierVercelInventoryAcquisitionResearch';
import type {
  FandexMomentumVerifierOpaqueSecretRollbackAttestation,
  FandexMomentumVerifierVercelInventoryRow,
} from './fandexMomentumVerifierVercelInventoryAdapterResearch';
import type {
  FandexMomentumVerifierVercelInventoryExecutionEnvelopeResult,
} from './fandexMomentumVerifierVercelInventoryExecutionEnvelopeResearch';

export const FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_RECEIPT_VERSION =
  'v174_fandex_momentum_verifier_vercel_inventory_execution_receipt_handoff_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_RECEIPT_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_RECEIPT_VERSION,
    lifecycle: 'research' as const,
    upstreamV173Contract:
      'v173_fandex_momentum_verifier_vercel_inventory_execution_envelope_research_v1' as const,
    downstreamV171Contract:
      'v171_fandex_momentum_verifier_vercel_inventory_acquisition_research_v1' as const,
    receiptValidationOnly: true as const,
    actualInventoryReadPerformed: false as const,
    actualCredentialReadPerformed: false as const,
    actualMutationPerformed: false as const,
    exactEnvelopeBindingRequired: true as const,
    exactlyOneReadRequired: true as const,
    mutationCapabilityAllowed: false as const,
    decryptTrueAllowed: false as const,
    credentialValueExposureAllowed: false as const,
    rawProviderResponsePersistenceAllowed: false as const,
    sensitiveProviderValuesDiscardedBeforeHandoff: true as const,
    completenessProofRequired: true as const,
    truncationRiskAllowed: false as const,
    v171InvokedOnlyAfterValidCompleteReceipt: true as const,
    productOrLedgerMutationAllowed: false as const,
  });

export type FandexMomentumVerifierVercelInventoryExecutionReceiptStatus =
  | 'not-executed'
  | 'success'
  | 'transport-error'
  | 'authorization-error'
  | 'provider-error';

export type FandexMomentumVerifierVercelInventoryExecutionReceiptInput =
  Readonly<{
    evaluatedAt: string;
    upstreamV173:
      FandexMomentumVerifierVercelInventoryExecutionEnvelopeResult;
    execution: Readonly<{
      status: FandexMomentumVerifierVercelInventoryExecutionReceiptStatus;
      envelopeId: string | null;
      interfaceName: string | null;
      method: 'GET';
      endpoint: '/v10/projects/{idOrName}/env';
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
      decryptRequested: false;
      readCount: number;
      mutationCapabilityPresent: boolean;
      decryptTruePathPresent: boolean;
      decryptedValueEndpointPresent: boolean;
      credentialValueExposed: boolean;
      providerResponseReceived: boolean;
      responseBoundToProjectAndTeam: boolean;
      completeForProductionTarget: boolean;
      truncationOrAdditionalPageRisk: boolean;
      rawProviderResponsePersisted: false;
      secretValueLogged: false;
      secretValuePersisted: false;
    }>;
    providerRows: readonly FandexMomentumVerifierVercelInventoryRow[];
    opaqueSecretRollbackAttestation:
      FandexMomentumVerifierOpaqueSecretRollbackAttestation | null;
  }>;

export type FandexMomentumVerifierVercelInventoryExecutionReceipt =
  Readonly<{
    contractVersion:
      'v174_fandex_momentum_verifier_vercel_inventory_execution_receipt_v1';
    state:
      | 'execution-not-performed'
      | 'execution-failed'
      | 'execution-bounded';
    upstreamV173Digest: string;
    envelopeId: string | null;
    executionStatus: FandexMomentumVerifierVercelInventoryExecutionReceiptStatus;
    interfaceName: string | null;
    request: Readonly<{
      method: 'GET';
      endpoint: '/v10/projects/{idOrName}/env';
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
      decryptRequested: false;
    }>;
    readCount: number;
    mutationCapabilityPresent: boolean;
    decryptTruePathPresent: boolean;
    decryptedValueEndpointPresent: boolean;
    credentialValueExposed: boolean;
    providerResponseReceived: boolean;
    responseBoundToProjectAndTeam: boolean;
    completeForProductionTarget: boolean;
    truncationOrAdditionalPageRisk: boolean;
    providerRowCount: number;
    boundedRowCount: number;
    sensitiveValueObservedAndDiscarded: boolean;
    rawProviderResponsePersisted: false;
    secretValueLogged: false;
    secretValuePersisted: false;
    digest: string;
  }>;

export type FandexMomentumVerifierVercelInventoryExecutionReceiptResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_RECEIPT_VERSION;
    state:
      | 'execution-receipt-blocked'
      | 'execution-receipt-ready'
      | 'v171-handoff-ready';
    receiptReady: boolean;
    v171HandoffInvoked: boolean;
    receipt: FandexMomentumVerifierVercelInventoryExecutionReceipt;
    boundedRows: readonly FandexMomentumVerifierVercelInventoryRow[];
    v171: FandexMomentumVerifierVercelInventoryAcquisitionResult | null;
    blockers: readonly string[];
    effects: Readonly<{
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
    }>;
    digest: string;
  }>;

export type FandexMomentumVerifierVercelInventoryExecutionReceiptDependencies =
  Readonly<{
    acquireV171?:
      typeof acquireFandexMomentumVerifierVercelInventoryResearch;
  }>;

function exactIso(value: string): boolean {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp)
    && new Date(timestamp).toISOString() === value;
}

function validEnvelopeId(value: string | null): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
}

function boundedRow(
  row: FandexMomentumVerifierVercelInventoryRow,
): FandexMomentumVerifierVercelInventoryRow {
  const sensitive =
    row.key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET'
    || row.type === 'sensitive'
    || row.type === 'encrypted';

  return Object.freeze({
    id: row.id,
    key: row.key,
    type: row.type,
    target: Object.freeze([...row.target]),
    decrypted: row.decrypted,
    value: sensitive ? null : row.value,
  });
}

function zeroEffects() {
  return Object.freeze({
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
  });
}

export function evaluateFandexMomentumVerifierVercelInventoryExecutionReceipt(
  input: FandexMomentumVerifierVercelInventoryExecutionReceiptInput,
  dependencies:
    FandexMomentumVerifierVercelInventoryExecutionReceiptDependencies = {},
): FandexMomentumVerifierVercelInventoryExecutionReceiptResult {
  const blockers: string[] = [];

  if (!exactIso(input.evaluatedAt)) {
    blockers.push('inventory-execution-receipt-evaluation-time-invalid');
  }

  const upstream = input.upstreamV173;
  const envelope = upstream.envelope;
  if (
    upstream.contractVersion
      !== 'v173_fandex_momentum_verifier_vercel_inventory_execution_envelope_research_v1'
    || upstream.state !== 'read-execution-ready'
    || upstream.envelopePrepared !== true
    || upstream.readExecutionAuthorized !== true
    || envelope === null
  ) {
    blockers.push('upstream-v173-not-read-execution-ready');
  }

  if (
    input.execution.method !== 'GET'
    || input.execution.endpoint !== '/v10/projects/{idOrName}/env'
    || input.execution.teamId !== 'team_OrRPxuBxMwCYU3kk0r76AfOs'
    || input.execution.projectId !== 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
    || input.execution.decryptRequested !== false
  ) {
    blockers.push('inventory-execution-request-invalid');
  }

  if (
    envelope !== null
    && input.execution.envelopeId !== envelope.envelopeId
  ) {
    blockers.push('inventory-execution-envelope-binding-mismatch');
  }
  if (
    input.execution.envelopeId !== null
    && !validEnvelopeId(input.execution.envelopeId)
  ) {
    blockers.push('inventory-execution-envelope-id-invalid');
  }

  if (input.execution.status === 'not-executed') {
    if (input.execution.readCount !== 0) {
      blockers.push('inventory-execution-not-executed-read-count-invalid');
    }
  } else if (input.execution.readCount !== 1) {
    blockers.push('inventory-execution-read-count-must-equal-one');
  }

  if (input.execution.status !== 'success') {
    blockers.push('inventory-execution-status-' + input.execution.status);
  }
  if (!input.execution.interfaceName?.trim()) {
    blockers.push('inventory-execution-interface-name-missing');
  }
  if (input.execution.mutationCapabilityPresent) {
    blockers.push('inventory-execution-interface-has-mutation-capability');
  }
  if (input.execution.decryptTruePathPresent) {
    blockers.push('inventory-execution-decrypt-true-path-present');
  }
  if (input.execution.decryptedValueEndpointPresent) {
    blockers.push('inventory-execution-decrypted-value-endpoint-present');
  }
  if (input.execution.credentialValueExposed) {
    blockers.push('inventory-execution-credential-value-exposed');
  }
  if (!input.execution.providerResponseReceived) {
    blockers.push('inventory-execution-provider-response-missing');
  }
  if (!input.execution.responseBoundToProjectAndTeam) {
    blockers.push('inventory-execution-response-not-bound-to-target');
  }
  if (!input.execution.completeForProductionTarget) {
    blockers.push('inventory-execution-production-completeness-unproven');
  }
  if (input.execution.truncationOrAdditionalPageRisk) {
    blockers.push('inventory-execution-truncation-or-additional-page-risk');
  }
  if (
    input.execution.rawProviderResponsePersisted !== false
    || input.execution.secretValueLogged !== false
    || input.execution.secretValuePersisted !== false
  ) {
    blockers.push('inventory-execution-sensitive-persistence-boundary-violated');
  }

  const sensitiveValueObservedAndDiscarded =
    input.providerRows.some((row) =>
      (
        row.key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET'
        || row.type === 'sensitive'
        || row.type === 'encrypted'
      )
      && row.value !== null
    );
  const boundedRows = Object.freeze(input.providerRows.map(boundedRow));

  const receiptState:
    FandexMomentumVerifierVercelInventoryExecutionReceipt['state'] =
    input.execution.status === 'not-executed'
      ? 'execution-not-performed'
      : input.execution.status === 'success'
        && input.execution.providerResponseReceived
        ? 'execution-bounded'
        : 'execution-failed';

  const receiptBase = Object.freeze({
    contractVersion:
      'v174_fandex_momentum_verifier_vercel_inventory_execution_receipt_v1' as const,
    state: receiptState,
    upstreamV173Digest: upstream.digest,
    envelopeId: input.execution.envelopeId,
    executionStatus: input.execution.status,
    interfaceName: input.execution.interfaceName,
    request: Object.freeze({
      method: 'GET' as const,
      endpoint: '/v10/projects/{idOrName}/env' as const,
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs' as const,
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const,
      decryptRequested: false as const,
    }),
    readCount: input.execution.readCount,
    mutationCapabilityPresent: input.execution.mutationCapabilityPresent,
    decryptTruePathPresent: input.execution.decryptTruePathPresent,
    decryptedValueEndpointPresent: input.execution.decryptedValueEndpointPresent,
    credentialValueExposed: input.execution.credentialValueExposed,
    providerResponseReceived: input.execution.providerResponseReceived,
    responseBoundToProjectAndTeam:
      input.execution.responseBoundToProjectAndTeam,
    completeForProductionTarget:
      input.execution.completeForProductionTarget,
    truncationOrAdditionalPageRisk:
      input.execution.truncationOrAdditionalPageRisk,
    providerRowCount: input.providerRows.length,
    boundedRowCount: boundedRows.length,
    sensitiveValueObservedAndDiscarded,
    rawProviderResponsePersisted: false as const,
    secretValueLogged: false as const,
    secretValuePersisted: false as const,
  });

  const receipt = Object.freeze({
    ...receiptBase,
    digest: sha256Canonical(receiptBase),
  });

  const uniquePreHandoffBlockers = Object.freeze([...new Set(blockers)]);
  const receiptReady =
    uniquePreHandoffBlockers.length === 0
    && receipt.state === 'execution-bounded'
    && input.execution.readCount === 1
    && validEnvelopeId(input.execution.envelopeId);

  let v171: FandexMomentumVerifierVercelInventoryAcquisitionResult | null = null;
  let v171HandoffInvoked = false;
  const downstreamBlockers: string[] = [];

  if (receiptReady) {
    const acquireV171 =
      dependencies.acquireV171
      ?? acquireFandexMomentumVerifierVercelInventoryResearch;
    v171HandoffInvoked = true;
    v171 = acquireV171({
      channel: {
        available: true,
        authenticatedReadOnly: true,
        mutationCapabilityPresent: false,
        interfaceName: input.execution.interfaceName,
      },
      request: {
        method: 'GET',
        endpoint: '/v10/projects/{idOrName}/env',
        teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
        projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
        decryptRequested: false,
        gitBranchFilter: null,
        customEnvironmentFilter: null,
      },
      execution: {
        status: 'success',
        readPerformed: true,
        providerResponseReceived: true,
        responseBoundToProjectAndTeam: true,
        completeForProductionTarget: true,
        truncationOrAdditionalPageRisk: false,
        rawProviderResponsePersisted: false,
        secretValueLogged: false,
        secretValuePersisted: false,
      },
      rows: boundedRows,
      opaqueSecretRollbackAttestation:
        input.opaqueSecretRollbackAttestation,
    });
    downstreamBlockers.push(...v171.blockers);
  }

  const allBlockers = Object.freeze([
    ...new Set([...uniquePreHandoffBlockers, ...downstreamBlockers]),
  ]);
  const state:
    FandexMomentumVerifierVercelInventoryExecutionReceiptResult['state'] =
    !receiptReady
      ? 'execution-receipt-blocked'
      : v171 !== null && v171.acquisitionReady
        ? 'v171-handoff-ready'
        : 'execution-receipt-ready';

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_EXECUTION_RECEIPT_VERSION,
    state,
    receiptReady,
    v171HandoffInvoked,
    receipt,
    boundedRows,
    v171Digest: v171?.digest ?? null,
    v171State: v171?.state ?? null,
    blockers: allBlockers,
  };

  return Object.freeze({
    contractVersion: payload.contractVersion,
    state,
    receiptReady,
    v171HandoffInvoked,
    receipt,
    boundedRows,
    v171,
    blockers: allBlockers,
    effects: zeroEffects(),
    digest: sha256Canonical(payload),
  });
}
