import { sha256Canonical } from '../shared/canonicalDigest';
import {
  adaptFandexMomentumVerifierVercelInventoryResearch,
  type FandexMomentumVerifierOpaqueSecretRollbackAttestation,
  type FandexMomentumVerifierVercelInventoryAdapterResult,
  type FandexMomentumVerifierVercelInventoryRow,
} from './fandexMomentumVerifierVercelInventoryAdapterResearch';

export const FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ACQUISITION_VERSION =
  'v171_fandex_momentum_verifier_vercel_inventory_acquisition_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ACQUISITION_RECEIPT_VERSION =
  'v171_fandex_momentum_verifier_vercel_inventory_acquisition_receipt_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ACQUISITION_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ACQUISITION_VERSION,
    lifecycle: 'research' as const,
    upstreamV170Contract:
      'v170_fandex_momentum_verifier_vercel_inventory_adapter_research_v1' as const,
    provider: 'vercel' as const,
    readOnlyAcquisition: true as const,
    mutationCapabilityAllowed: false as const,
    decryptRequested: false as const,
    rawProviderResponsePersisted: false as const,
    secretValueLogged: false as const,
    secretValuePersisted: false as const,
    providerPaginationShapeInvented: false as const,
    completenessProofRequired: true as const,
    verifierActivationPerformed: false as const,
    productionDeploymentPerformed: false as const,
    nativeVerifierExecutionPerformed: false as const,
    ledgerAdvancePerformed: false as const,
  });

export type FandexMomentumVerifierVercelInventoryAcquisitionStatus =
  | 'not-attempted'
  | 'success'
  | 'transport-error'
  | 'authorization-error'
  | 'provider-error';

export type FandexMomentumVerifierVercelInventoryAcquisitionInput =
  Readonly<{
    channel: Readonly<{
      available: boolean;
      authenticatedReadOnly: boolean;
      mutationCapabilityPresent: boolean;
      interfaceName: string | null;
    }>;
    request: Readonly<{
      method: 'GET';
      endpoint: '/v10/projects/{idOrName}/env';
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
      decryptRequested: false;
      gitBranchFilter: null;
      customEnvironmentFilter: null;
    }>;
    execution: Readonly<{
      status: FandexMomentumVerifierVercelInventoryAcquisitionStatus;
      readPerformed: boolean;
      providerResponseReceived: boolean;
      responseBoundToProjectAndTeam: boolean;
      completeForProductionTarget: boolean;
      truncationOrAdditionalPageRisk: boolean;
      rawProviderResponsePersisted: false;
      secretValueLogged: false;
      secretValuePersisted: false;
    }>;
    rows: readonly FandexMomentumVerifierVercelInventoryRow[];
    opaqueSecretRollbackAttestation:
      FandexMomentumVerifierOpaqueSecretRollbackAttestation | null;
  }>;

export type FandexMomentumVerifierVercelInventoryAcquisitionReceipt =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ACQUISITION_RECEIPT_VERSION;
    state:
      | 'acquisition-not-attempted'
      | 'acquisition-failed'
      | 'acquisition-bounded';
    provider: 'vercel';
    request: Readonly<{
      method: 'GET';
      endpoint: '/v10/projects/{idOrName}/env';
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs';
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v';
      decryptRequested: false;
    }>;
    channelAvailable: boolean;
    authenticatedReadOnly: boolean;
    mutationCapabilityPresent: boolean;
    executionStatus: FandexMomentumVerifierVercelInventoryAcquisitionStatus;
    readPerformed: boolean;
    providerResponseReceived: boolean;
    responseBoundToProjectAndTeam: boolean;
    completeForProductionTarget: boolean;
    truncationOrAdditionalPageRisk: boolean;
    providerRowCount: number;
    verifierRowCount: number;
    duplicateVerifierKeyDetected: boolean;
    previewScopedVerifierKeyDetected: boolean;
    decryptedVerifierRowDetected: boolean;
    sensitiveValueObservedAndDiscarded: boolean;
    rawProviderResponsePersisted: false;
    secretValueLogged: false;
    secretValuePersisted: false;
    digest: string;
  }>;

export type FandexMomentumVerifierVercelInventoryAcquisitionResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ACQUISITION_VERSION;
    state: 'inventory-acquisition-blocked' | 'inventory-acquisition-ready';
    acquisitionReady: boolean;
    receipt: FandexMomentumVerifierVercelInventoryAcquisitionReceipt;
    boundedRows: readonly FandexMomentumVerifierVercelInventoryRow[];
    v170: FandexMomentumVerifierVercelInventoryAdapterResult;
    blockers: readonly string[];
    effects: Readonly<{
      vercelReads: 0 | 1;
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

const VERIFIER_KEYS = new Set([
  'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED',
  'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT',
  'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET',
]);

function sanitizeRow(
  row: FandexMomentumVerifierVercelInventoryRow,
): FandexMomentumVerifierVercelInventoryRow {
  const secretLike =
    row.key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET'
    || row.type === 'sensitive'
    || row.type === 'encrypted';

  return Object.freeze({
    id: row.id,
    key: row.key,
    type: row.type,
    target: Object.freeze([...row.target]),
    decrypted: row.decrypted,
    value: secretLike ? null : row.value,
  });
}

function receiptDigest(
  receipt: Omit<FandexMomentumVerifierVercelInventoryAcquisitionReceipt, 'digest'>,
) {
  return sha256Canonical(receipt);
}

export function acquireFandexMomentumVerifierVercelInventoryResearch(
  input: FandexMomentumVerifierVercelInventoryAcquisitionInput,
): FandexMomentumVerifierVercelInventoryAcquisitionResult {
  const blockers: string[] = [];

  if (
    input.request.method !== 'GET'
    || input.request.endpoint !== '/v10/projects/{idOrName}/env'
    || input.request.teamId !== 'team_OrRPxuBxMwCYU3kk0r76AfOs'
    || input.request.projectId !== 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v'
    || input.request.decryptRequested !== false
    || input.request.gitBranchFilter !== null
    || input.request.customEnvironmentFilter !== null
  ) {
    blockers.push('inventory-acquisition-request-invalid');
  }

  if (!input.channel.available) {
    blockers.push('inventory-acquisition-channel-unavailable');
  }
  if (!input.channel.authenticatedReadOnly) {
    blockers.push('inventory-acquisition-channel-not-authenticated-read-only');
  }
  if (input.channel.mutationCapabilityPresent) {
    blockers.push('inventory-acquisition-channel-has-mutation-capability');
  }

  if (!input.execution.readPerformed) {
    blockers.push('inventory-acquisition-read-not-performed');
  }
  if (input.execution.status !== 'success') {
    blockers.push(`inventory-acquisition-status-${input.execution.status}`);
  }
  if (!input.execution.providerResponseReceived) {
    blockers.push('inventory-acquisition-provider-response-missing');
  }
  if (!input.execution.responseBoundToProjectAndTeam) {
    blockers.push('inventory-acquisition-response-not-bound-to-target');
  }
  if (!input.execution.completeForProductionTarget) {
    blockers.push('inventory-acquisition-production-completeness-unproven');
  }
  if (input.execution.truncationOrAdditionalPageRisk) {
    blockers.push('inventory-acquisition-truncation-or-additional-page-risk');
  }
  if (
    input.execution.rawProviderResponsePersisted !== false
    || input.execution.secretValueLogged !== false
    || input.execution.secretValuePersisted !== false
  ) {
    blockers.push('inventory-acquisition-sensitive-persistence-boundary-violated');
  }

  const boundedRows = Object.freeze(input.rows.map(sanitizeRow));
  const verifierRows = boundedRows.filter((row) => VERIFIER_KEYS.has(row.key));
  const counts = new Map<string, number>();
  for (const row of verifierRows) {
    counts.set(row.key, (counts.get(row.key) ?? 0) + 1);
  }
  const duplicateVerifierKeyDetected =
    [...counts.values()].some((count) => count > 1);
  const previewScopedVerifierKeyDetected =
    verifierRows.some((row) => row.target.includes('preview'));
  const decryptedVerifierRowDetected =
    verifierRows.some((row) => row.decrypted === true);
  const sensitiveValueObservedAndDiscarded =
    input.rows.some((row) =>
      (
        row.key === 'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET'
        || row.type === 'sensitive'
        || row.type === 'encrypted'
      )
      && row.value !== null
    );

  if (duplicateVerifierKeyDetected) {
    blockers.push('inventory-acquisition-duplicate-verifier-key');
  }
  if (previewScopedVerifierKeyDetected) {
    blockers.push('inventory-acquisition-preview-scoped-verifier-key');
  }
  if (decryptedVerifierRowDetected) {
    blockers.push('inventory-acquisition-decrypted-verifier-row-forbidden');
  }

  const acquisitionUsable =
    blockers.length === 0
    && input.channel.available
    && input.channel.authenticatedReadOnly
    && !input.channel.mutationCapabilityPresent
    && input.execution.status === 'success'
    && input.execution.readPerformed
    && input.execution.providerResponseReceived
    && input.execution.responseBoundToProjectAndTeam
    && input.execution.completeForProductionTarget
    && !input.execution.truncationOrAdditionalPageRisk;

  const v170 =
    adaptFandexMomentumVerifierVercelInventoryResearch({
      request: {
        method: 'GET',
        endpoint: '/v10/projects/{idOrName}/env',
        teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs',
        projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v',
        decryptRequested: false,
      },
      inventoryAvailable: acquisitionUsable,
      inventoryBoundToProjectAndTeam:
        acquisitionUsable && input.execution.responseBoundToProjectAndTeam,
      completeForProductionTarget:
        acquisitionUsable && input.execution.completeForProductionTarget,
      rows: acquisitionUsable ? boundedRows : [],
      opaqueSecretRollbackAttestation:
        acquisitionUsable ? input.opaqueSecretRollbackAttestation : null,
    });

  blockers.push(...v170.blockers);
  const uniqueBlockers = Object.freeze([...new Set(blockers)]);

  const receiptState:
    FandexMomentumVerifierVercelInventoryAcquisitionReceipt['state'] =
    !input.execution.readPerformed
      ? 'acquisition-not-attempted'
      : input.execution.status === 'success'
        && input.execution.providerResponseReceived
        ? 'acquisition-bounded'
        : 'acquisition-failed';

  const receiptWithoutDigest = Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ACQUISITION_RECEIPT_VERSION,
    state: receiptState,
    provider: 'vercel' as const,
    request: Object.freeze({
      method: 'GET' as const,
      endpoint: '/v10/projects/{idOrName}/env' as const,
      teamId: 'team_OrRPxuBxMwCYU3kk0r76AfOs' as const,
      projectId: 'prj_aT3p8zmjyochu8iGmFOuNR1lSU7v' as const,
      decryptRequested: false as const,
    }),
    channelAvailable: input.channel.available,
    authenticatedReadOnly: input.channel.authenticatedReadOnly,
    mutationCapabilityPresent: input.channel.mutationCapabilityPresent,
    executionStatus: input.execution.status,
    readPerformed: input.execution.readPerformed,
    providerResponseReceived: input.execution.providerResponseReceived,
    responseBoundToProjectAndTeam:
      input.execution.responseBoundToProjectAndTeam,
    completeForProductionTarget:
      input.execution.completeForProductionTarget,
    truncationOrAdditionalPageRisk:
      input.execution.truncationOrAdditionalPageRisk,
    providerRowCount: input.rows.length,
    verifierRowCount: verifierRows.length,
    duplicateVerifierKeyDetected,
    previewScopedVerifierKeyDetected,
    decryptedVerifierRowDetected,
    sensitiveValueObservedAndDiscarded,
    rawProviderResponsePersisted: false as const,
    secretValueLogged: false as const,
    secretValuePersisted: false as const,
  });

  const receipt = Object.freeze({
    ...receiptWithoutDigest,
    digest: receiptDigest(receiptWithoutDigest),
  });

  const acquisitionReady =
    uniqueBlockers.length === 0
    && v170.state === 'inventory-adapter-ready'
    && v170.adapterReady;
  const state = acquisitionReady
    ? 'inventory-acquisition-ready' as const
    : 'inventory-acquisition-blocked' as const;

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_VERCEL_INVENTORY_ACQUISITION_VERSION,
    state,
    acquisitionReady,
    receipt,
    boundedRows,
    v170,
    blockers: uniqueBlockers,
  };

  return Object.freeze({
    ...payload,
    effects: Object.freeze({
      vercelReads: input.execution.readPerformed ? 1 as const : 0 as const,
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
    }),
    digest: sha256Canonical(payload),
  });
}
