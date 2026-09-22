import { sha256Canonical } from '../shared/canonicalDigest';
import type {
  FandexMomentumVerifierVercelInventoryReadChannelPlanResult,
} from './fandexMomentumVerifierVercelInventoryReadChannelPlanResearch';
import type {
  FandexMomentumVerifierVercelInventoryExecutionEnvelopeResult,
} from './fandexMomentumVerifierVercelInventoryExecutionEnvelopeResearch';
import type {
  FandexMomentumVerifierVercelInventoryExecutionReceiptResult,
} from './fandexMomentumVerifierVercelInventoryExecutionReceiptResearch';

export const FANDEX_MOMENTUM_VERIFIER_REAL_INVENTORY_ACQUISITION_READINESS_VERSION =
  'v175_fandex_momentum_verifier_real_inventory_acquisition_readiness_research_v1' as const;

export const FANDEX_MOMENTUM_VERIFIER_REAL_INVENTORY_ACQUISITION_READINESS_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_REAL_INVENTORY_ACQUISITION_READINESS_VERSION,
    lifecycle: 'research' as const,
    readinessOnly: true as const,
    genericContinuationCountsAsAuthorization: false as const,
    authorizationMutationPerformed: false as const,
    credentialCreatedOrRead: false as const,
    inventoryReadPerformed: false as const,
    vercelMutationPerformed: false as const,
    productionDeploymentPerformed: false as const,
    verifierActivationPerformed: false as const,
    nativeVerifierExecutionPerformed: false as const,
    ledgerAdvancePerformed: false as const,
    productMutationPerformed: false as const,
    registryMutationPerformed: false as const,
  });

export type FandexMomentumVerifierRealInventoryAcquisitionReadinessResult =
  Readonly<{
    contractVersion:
      typeof FANDEX_MOMENTUM_VERIFIER_REAL_INVENTORY_ACQUISITION_READINESS_VERSION;
    state:
      | 'real-acquisition-blocked'
      | 'external-read-ready'
      | 'receipt-ready'
      | 'v171-handoff-ready';
    realAcquisitionReady: boolean;
    externalReadReady: boolean;
    stages: Readonly<{
      v172PlanReady: boolean;
      readChannelProvisioningAuthorizationPresent: boolean;
      opaqueCredentialHandlePresent: boolean;
      opaqueCredentialHandleAccepted: boolean;
      v172ProvisioningReady: boolean;
      readExecutionAuthorizationPresent: boolean;
      v173EnvelopePrepared: boolean;
      v173ReadExecutionAuthorized: boolean;
      v173ReadExecutionReady: boolean;
      actualReadReceiptPresent: boolean;
      v174ReceiptReady: boolean;
      v174HandoffInvoked: boolean;
      v171HandoffReady: boolean;
    }>;
    upstreamDigests: Readonly<{
      v172: string;
      v173: string;
      v174: string;
    }>;
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
    productBoundary: Readonly<{
      productMomentumScore: null;
      productionEligible: false;
      productProductionActual: '0/7';
    }>;
    digest: string;
  }>;

function validDigest(value: string): boolean {
  return /^[0-9a-f]{64}$/.test(value);
}

export function evaluateFandexMomentumVerifierRealInventoryAcquisitionReadiness(
  input: Readonly<{
    v172: FandexMomentumVerifierVercelInventoryReadChannelPlanResult;
    v173: FandexMomentumVerifierVercelInventoryExecutionEnvelopeResult;
    v174: FandexMomentumVerifierVercelInventoryExecutionReceiptResult;
  }>,
): FandexMomentumVerifierRealInventoryAcquisitionReadinessResult {
  const blockers: string[] = [];

  const v172PlanReady = input.v172.planReady === true;
  const readChannelProvisioningAuthorizationPresent =
    input.v172.authorization.state === 'approved';
  const opaqueCredentialHandlePresent = input.v172.credentialHandle !== null;
  const opaqueCredentialHandleAccepted =
    input.v172.credentialHandleAccepted === true;
  const v172ProvisioningReady =
    input.v172.state === 'read-channel-provisioning-ready'
    && input.v172.provisioningAuthorized === true
    && opaqueCredentialHandleAccepted;

  const readExecutionAuthorizationPresent =
    input.v173.authorization.state === 'approved';
  const v173EnvelopePrepared = input.v173.envelopePrepared === true;
  const v173ReadExecutionAuthorized =
    input.v173.readExecutionAuthorized === true;
  const v173ReadExecutionReady =
    input.v173.state === 'read-execution-ready'
    && v173EnvelopePrepared
    && v173ReadExecutionAuthorized
    && input.v173.envelope !== null;

  const actualReadReceiptPresent =
    input.v174.receipt.executionStatus !== 'not-executed'
    && input.v174.receipt.readCount > 0;
  const v174ReceiptReady = input.v174.receiptReady === true;
  const v174HandoffInvoked = input.v174.v171HandoffInvoked === true;
  const v171HandoffReady =
    input.v174.state === 'v171-handoff-ready'
    && v174ReceiptReady
    && v174HandoffInvoked
    && input.v174.v171?.acquisitionReady === true;

  if (!validDigest(input.v172.digest)) {
    blockers.push('v172-result-digest-invalid');
  }
  if (!validDigest(input.v173.digest)) {
    blockers.push('v173-result-digest-invalid');
  }
  if (!validDigest(input.v174.digest)) {
    blockers.push('v174-result-digest-invalid');
  }

  if (!v172PlanReady) {
    blockers.push('v172-read-channel-plan-not-ready');
  }
  if (!readChannelProvisioningAuthorizationPresent) {
    blockers.push('read-channel-provisioning-authorization-missing');
  }
  if (!opaqueCredentialHandlePresent) {
    blockers.push('opaque-vercel-credential-handle-missing');
  }
  if (opaqueCredentialHandlePresent && !opaqueCredentialHandleAccepted) {
    blockers.push('opaque-vercel-credential-handle-not-accepted');
  }
  if (!v172ProvisioningReady) {
    blockers.push('v172-read-channel-provisioning-not-ready');
  }
  if (!readExecutionAuthorizationPresent) {
    blockers.push('inventory-read-execution-authorization-missing');
  }
  if (!v173EnvelopePrepared) {
    blockers.push('v173-execution-envelope-not-prepared');
  }
  if (!v173ReadExecutionAuthorized) {
    blockers.push('v173-read-execution-not-authorized');
  }
  if (!v173ReadExecutionReady) {
    blockers.push('v173-read-execution-not-ready');
  }
  if (!actualReadReceiptPresent) {
    blockers.push('actual-inventory-read-receipt-missing');
  }
  if (!v174ReceiptReady) {
    blockers.push('v174-execution-receipt-not-ready');
  }
  if (!v174HandoffInvoked) {
    blockers.push('v174-v171-handoff-not-invoked');
  }
  if (!v171HandoffReady) {
    blockers.push('v171-handoff-not-ready');
  }

  const uniqueBlockers = Object.freeze([...new Set(blockers)]);

  let state:
    FandexMomentumVerifierRealInventoryAcquisitionReadinessResult['state'];
  if (v171HandoffReady) {
    state = 'v171-handoff-ready';
  } else if (v174ReceiptReady && actualReadReceiptPresent) {
    state = 'receipt-ready';
  } else if (v173ReadExecutionReady) {
    state = 'external-read-ready';
  } else {
    state = 'real-acquisition-blocked';
  }

  const stages = Object.freeze({
    v172PlanReady,
    readChannelProvisioningAuthorizationPresent,
    opaqueCredentialHandlePresent,
    opaqueCredentialHandleAccepted,
    v172ProvisioningReady,
    readExecutionAuthorizationPresent,
    v173EnvelopePrepared,
    v173ReadExecutionAuthorized,
    v173ReadExecutionReady,
    actualReadReceiptPresent,
    v174ReceiptReady,
    v174HandoffInvoked,
    v171HandoffReady,
  });

  const payload = {
    contractVersion:
      FANDEX_MOMENTUM_VERIFIER_REAL_INVENTORY_ACQUISITION_READINESS_VERSION,
    state,
    realAcquisitionReady: v171HandoffReady,
    externalReadReady: v173ReadExecutionReady,
    stages,
    upstreamDigests: Object.freeze({
      v172: input.v172.digest,
      v173: input.v173.digest,
      v174: input.v174.digest,
    }),
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
    }),
    digest: sha256Canonical(payload),
  });
}
