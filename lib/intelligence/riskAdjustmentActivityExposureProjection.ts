import type {
  ProductActivityExposurePublicRouteResult,
} from '../product/contracts/productActivityExposurePublicRoute';
import type {
  ProductActivityExposureProviderCoverage,
} from '../product/contracts/productActivityExposure';
import type {
  RiskAdjustmentAvailabilityState,
  RiskAdjustmentCoverageState,
  RiskAdjustmentUpstreamInput,
} from './riskAdjustmentPointConstruct';

export const RISK_ADJUSTMENT_ACTIVITY_EXPOSURE_PROJECTION_VERSION =
  'risk-adjustment-activity-exposure-projection-v1' as const;

export type RiskAdjustmentActivityExposureProjectionResult =
  | Readonly<{
      status: 'ok';
      contractVersion:
        typeof RISK_ADJUSTMENT_ACTIVITY_EXPOSURE_PROJECTION_VERSION;
      input: RiskAdjustmentUpstreamInput;
      unresolvedDimensions: readonly [
        'confidence',
        'freshness',
        'revision',
        'volatility',
        'history',
      ];
    }>
  | Readonly<{
      status: 'blocked';
      contractVersion:
        typeof RISK_ADJUSTMENT_ACTIVITY_EXPOSURE_PROJECTION_VERSION;
      reason:
        | 'upstream-read-not-ok'
        | 'upstream-identity-mismatch'
        | 'upstream-not-real-production'
        | 'upstream-provider-coverage-invalid';
    }>;

function blocked(
  reason: Extract<
    RiskAdjustmentActivityExposureProjectionResult,
    { status: 'blocked' }
  >['reason'],
): RiskAdjustmentActivityExposureProjectionResult {
  return Object.freeze({
    status: 'blocked' as const,
    contractVersion:
      RISK_ADJUSTMENT_ACTIVITY_EXPOSURE_PROJECTION_VERSION,
    reason,
  });
}

function coverageState(
  coverage: readonly ProductActivityExposureProviderCoverage[],
): RiskAdjustmentCoverageState {
  if (
    coverage.every(
      (item) =>
        item.collectionStatus === 'succeeded'
        && item.coverageState === 'covered',
    )
  ) {
    return 'complete';
  }

  if (
    coverage.some(
      (item) =>
        item.collectionStatus === 'bounded_partial'
        || item.collectionStatus === 'provider_unavailable'
        || item.collectionStatus === 'credential_blocked'
        || item.coverageState === 'partial'
        || item.coverageState === 'missing_source_data'
        || item.coverageState === 'provider_unavailable'
        || item.coverageState === 'identity_unresolved',
    )
  ) {
    return 'incomplete';
  }

  return 'unknown';
}

function availabilityState(
  coverage: readonly ProductActivityExposureProviderCoverage[],
  eventCount: number,
): RiskAdjustmentAvailabilityState {
  if (
    coverage.some(
      (item) =>
        item.collectionStatus === 'provider_unavailable'
        || item.coverageState === 'provider_unavailable',
    )
  ) {
    return 'provider-unavailable';
  }

  if (
    coverage.some(
      (item) => item.coverageState === 'missing_source_data',
    )
  ) {
    return 'source-missing';
  }

  if (eventCount > 0) return 'categorical-evidence-present';

  if (
    coverage.every(
      (item) =>
        item.collectionStatus === 'succeeded'
        && item.coverageState === 'covered',
    )
  ) {
    return 'categorical-covered-no-event';
  }

  return 'upstream-unavailable-ambiguous';
}

export function projectActivityExposureForRiskAdjustment(
  result: ProductActivityExposurePublicRouteResult,
): RiskAdjustmentActivityExposureProjectionResult {
  if (result.status !== 'ok') {
    return blocked('upstream-read-not-ok');
  }

  const model = result.model;
  if (
    model.identity.sourceArtistId !== 'iu'
    || model.identity.constructId !== 'activityExposure'
    || model.construct !== 'Activity Exposure Event Stream'
  ) {
    return blocked('upstream-identity-mismatch');
  }

  if (
    model.dataOrigin !== 'observed'
    || model.publication !== 'production'
    || model.presentation !== 'standard'
  ) {
    return blocked('upstream-not-real-production');
  }

  const providers = new Map(
    model.providerCoverage.map((item) => [item.provider, item]),
  );
  if (
    providers.size !== 2
    || !providers.has('musicbrainz')
    || !providers.has('youtube')
  ) {
    return blocked('upstream-provider-coverage-invalid');
  }

  const identityState = model.events.some(
    (event) => event.identityState === 'conflict',
  )
    ? 'conflict' as const
    : model.events.some(
        (event) => event.identityState !== 'resolved',
      )
      ? 'unresolved' as const
      : 'resolved' as const;

  const conflictState = model.events.some(
    (event) =>
      event.conflictState === 'conflict'
      || event.conflictState === 'detected',
  )
    ? 'detected' as const
    : model.events.every((event) => event.conflictState === 'clear')
      ? 'none' as const
      : 'unknown' as const;

  const evidenceRefs = Object.freeze(
    [...new Set(
      model.events.flatMap((event) => {
        const trace = event.storedEvidenceTrace;
        if (!trace) return [];
        return [
          'activity-event:' + trace.eventRecordId,
          'activity-observation:' + trace.sourceObservationId,
        ];
      }),
    )].sort((left, right) => left.localeCompare(right)),
  );

  return Object.freeze({
    status: 'ok' as const,
    contractVersion:
      RISK_ADJUSTMENT_ACTIVITY_EXPOSURE_PROJECTION_VERSION,
    input: Object.freeze({
      variableId: 'comebackActivityPoint' as const,
      lifecycleState: 'production' as const,
      materialClass: 'real' as const,
      confidenceState: 'insufficient' as const,
      availabilityState: availabilityState(
        model.providerCoverage,
        model.events.length,
      ),
      identityState,
      coverageState: coverageState(model.providerCoverage),
      freshnessState: 'unknown' as const,
      conflictState,
      revisionState: 'unknown' as const,
      volatilityState: 'unknown' as const,
      historyState: 'unknown' as const,
      evidenceRefs,
    }),
    unresolvedDimensions: Object.freeze([
      'confidence',
      'freshness',
      'revision',
      'volatility',
      'history',
    ] as const),
  });
}
