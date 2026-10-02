import type {
  ProductActivityExposurePublicRouteResult,
} from '../product/contracts/productActivityExposurePublicRoute';
import type {
  ProductActivityExposureProviderCoverage,
} from '../product/contracts/productActivityExposure';
import type {
  RiskAdjustmentAvailabilityState,
  RiskAdjustmentCoverageState,
  RiskAdjustmentIdentityState,
  RiskAdjustmentUpstreamInput,
} from './riskAdjustmentPointConstruct';

export const RISK_ADJUSTMENT_ACTIVITY_EXPOSURE_PROJECTION_CONTRACT_VERSION =
  'risk-adjustment-activity-exposure-projection-v1' as const;

export type RiskAdjustmentActivityExposureProjectionResult =
  | Readonly<{
      status: 'ok';
      contractVersion:
        typeof RISK_ADJUSTMENT_ACTIVITY_EXPOSURE_PROJECTION_CONTRACT_VERSION;
      input: RiskAdjustmentUpstreamInput;
      unresolvedDimensions: readonly [
        'confidence',
        'freshness',
        'conflict',
        'revision',
        'history',
        'volatility',
      ];
    }>
  | Readonly<{
      status: 'blocked';
      contractVersion:
        typeof RISK_ADJUSTMENT_ACTIVITY_EXPOSURE_PROJECTION_CONTRACT_VERSION;
      reason:
        | 'upstream-read-not-ok'
        | 'upstream-identity-mismatch'
        | 'upstream-not-real-production'
        | 'upstream-quality-state-invalid';
    }>;

function hasInvalidCoverage(
  coverage: readonly ProductActivityExposureProviderCoverage[],
): boolean {
  return coverage.some(
    (entry) =>
      entry.collectionStatus === 'invalid'
      || entry.coverageState === 'invalid',
  );
}

function availabilityState(
  coverage: readonly ProductActivityExposureProviderCoverage[],
): RiskAdjustmentAvailabilityState {
  if (
    coverage.some(
      (entry) =>
        entry.collectionStatus === 'provider_unavailable'
        || entry.coverageState === 'provider_unavailable',
    )
  ) {
    return 'provider-unavailable';
  }

  if (coverage.some((entry) => entry.collectionStatus === 'credential_blocked')) {
    return 'upstream-unavailable-ambiguous';
  }

  if (coverage.some((entry) => entry.coverageState === 'missing_source_data')) {
    return 'source-missing';
  }

  if (coverage.some((entry) => entry.coverageState === 'not_in_scope')) {
    return 'unsupported';
  }

  // Activity Exposure is an event stream, not a numeric fact. Successful
  // collection with zero events is therefore "available", not true zero.
  return 'available';
}

function coverageState(
  coverage: readonly ProductActivityExposureProviderCoverage[],
): RiskAdjustmentCoverageState {
  return coverage.every(
    (entry) =>
      entry.collectionStatus === 'succeeded'
      && entry.coverageState === 'covered',
  )
    ? 'complete'
    : 'incomplete';
}

function identityState(
  result: Extract<ProductActivityExposurePublicRouteResult, { status: 'ok' }>,
): RiskAdjustmentIdentityState {
  // The upstream Product read model fails closed on artist/provider identity
  // mismatch. A typed identity_unresolved missing state remains explicit.
  return result.model.events.some(
    (event) => event.missingState === 'identity_unresolved',
  )
    ? 'unresolved'
    : 'resolved';
}

export function projectActivityExposureForRiskAdjustment(
  result: ProductActivityExposurePublicRouteResult,
): RiskAdjustmentActivityExposureProjectionResult {
  if (result.status !== 'ok') {
    return Object.freeze({
      status: 'blocked' as const,
      contractVersion:
        RISK_ADJUSTMENT_ACTIVITY_EXPOSURE_PROJECTION_CONTRACT_VERSION,
      reason: 'upstream-read-not-ok' as const,
    });
  }

  const model = result.model;
  if (
    model.identity.sourceArtistId !== 'iu'
    || model.identity.constructId !== 'activityExposure'
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      contractVersion:
        RISK_ADJUSTMENT_ACTIVITY_EXPOSURE_PROJECTION_CONTRACT_VERSION,
      reason: 'upstream-identity-mismatch' as const,
    });
  }

  if (
    model.dataOrigin !== 'observed'
    || model.publication !== 'production'
    || model.presentation !== 'standard'
    || model.contractVersion !== 'product-activity-exposure-v1'
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      contractVersion:
        RISK_ADJUSTMENT_ACTIVITY_EXPOSURE_PROJECTION_CONTRACT_VERSION,
      reason: 'upstream-not-real-production' as const,
    });
  }

  if (
    model.providerCoverage.length < 2
    || hasInvalidCoverage(model.providerCoverage)
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      contractVersion:
        RISK_ADJUSTMENT_ACTIVITY_EXPOSURE_PROJECTION_CONTRACT_VERSION,
      reason: 'upstream-quality-state-invalid' as const,
    });
  }

  const evidenceRefs = Object.freeze(
    [...new Set(
      model.events.flatMap((event) =>
        event.storedEvidenceTrace
          ? [`activity-exposure-event:${event.storedEvidenceTrace.eventRecordId}`]
          : [],
      ),
    )].sort((left, right) => left.localeCompare(right)),
  );

  return Object.freeze({
    status: 'ok' as const,
    contractVersion:
      RISK_ADJUSTMENT_ACTIVITY_EXPOSURE_PROJECTION_CONTRACT_VERSION,
    input: Object.freeze({
      variableId: 'comebackActivityPoint' as const,
      lifecycleState: 'production' as const,
      materialClass: 'real' as const,
      confidenceState: 'insufficient' as const,
      availabilityState: availabilityState(model.providerCoverage),
      identityState: identityState(result),
      coverageState: coverageState(model.providerCoverage),
      // Timestamps exist, but the Product contract exposes no validated
      // freshness policy. Risk must not invent a threshold.
      freshnessState: 'unknown' as const,
      // Event conflictState is currently free-form rather than a typed Product
      // quality contract, so Risk cannot infer conflict semantics from it.
      conflictState: 'unknown' as const,
      // Revision lineage exists, but lineage alone does not establish revision
      // stability or instability.
      revisionState: 'unknown' as const,
      volatilityState: 'unknown' as const,
      // Event count/history length is not a validated sufficiency rule.
      historyState: 'unknown' as const,
      evidenceRefs,
    }),
    unresolvedDimensions: Object.freeze([
      'confidence',
      'freshness',
      'conflict',
      'revision',
      'history',
      'volatility',
    ] as const),
  });
}
