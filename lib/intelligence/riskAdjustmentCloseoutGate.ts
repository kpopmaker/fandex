import type {
  RiskAdjustmentCurrentReadinessReport,
} from './riskAdjustmentCurrentReadinessReport';

export const RISK_ADJUSTMENT_CLOSEOUT_GATE_VERSION =
  'risk-adjustment-closeout-gate-v1' as const;

export type RiskAdjustmentCloseoutStatus =
  | 'contract-complete-awaiting-upstream'
  | 'categorical-contract-ready-awaiting-product-authorization';

export type RiskAdjustmentCloseoutGate = Readonly<{
  contractVersion: typeof RISK_ADJUSTMENT_CLOSEOUT_GATE_VERSION;
  status: RiskAdjustmentCloseoutStatus;
  riskOwnedContractComplete: true;
  currentProductReadyForCategoricalContract: boolean;
  upstreamQualityBlocked: boolean;
  upstreamUniverseIncomplete: boolean;
  mergeAuthorized: false;
  activationAuthorized: false;
  publicationAuthorized: false;
  publicRouteAuthorized: false;
  numericEligible: false;
  score: null;
  penalty: null;
  weight: null;
}>;

export function deriveRiskAdjustmentCloseoutGate(
  readiness: RiskAdjustmentCurrentReadinessReport,
): RiskAdjustmentCloseoutGate {
  const currentProductReadyForCategoricalContract =
    readiness.currentProductReadyForCategoricalContract;

  const upstreamQualityBlocked =
    readiness.currentProductStatus === 'quality-sufficiency-blocked'
    || readiness.currentProductStatus === 'dependency-blocked';

  const upstreamUniverseIncomplete =
    readiness.candidateUniverseStatus
    === 'partial-current-real-production';

  const status: RiskAdjustmentCloseoutStatus =
    currentProductReadyForCategoricalContract
      ? 'categorical-contract-ready-awaiting-product-authorization'
      : 'contract-complete-awaiting-upstream';

  return Object.freeze({
    contractVersion: RISK_ADJUSTMENT_CLOSEOUT_GATE_VERSION,
    status,
    riskOwnedContractComplete: true as const,
    currentProductReadyForCategoricalContract,
    upstreamQualityBlocked,
    upstreamUniverseIncomplete,
    mergeAuthorized: false as const,
    activationAuthorized: false as const,
    publicationAuthorized: false as const,
    publicRouteAuthorized: false as const,
    numericEligible: false as const,
    score: null,
    penalty: null,
    weight: null,
  });
}
