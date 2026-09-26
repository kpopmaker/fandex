import {
  ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL,
} from '../activation/activityExposurePublicRouteCutoverApproval';
import {
  ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION,
} from '../activation/activityExposurePublicRouteCutoverExecution';
import type {
  ProductActivityExposureReadModelResult,
} from '../contracts/productActivityExposure';
import type {
  ProductActivityExposurePublicRouteResult,
} from '../contracts/productActivityExposurePublicRoute';

export type ActivityExposurePublicRouteRuntime = Readonly<{
  readActivityExposureReal: () => Promise<ProductActivityExposureReadModelResult>;
}>;

function dataIssue(
  reason:
    | 'execution-binding-invalid'
    | 'runtime-read-failed'
    | 'source-data-issue'
    | 'stored-evidence-trace-missing',
  issues?: Extract<
    ProductActivityExposureReadModelResult,
    { status: 'data-issue' }
  >['issues'],
): ProductActivityExposurePublicRouteResult {
  return Object.freeze({
    status: 'data-issue' as const,
    reason,
    ...(issues ? { issues } : {}),
  });
}

function executionBindingValid(): boolean {
  const execution = ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_EXECUTION;
  const approval = ACTIVITY_EXPOSURE_PUBLIC_ROUTE_CUTOVER_APPROVAL;

  return (
    execution.action === 'execute-public-route-cutover'
    && execution.authority === 'product-operations-owner'
    && execution.target.artistId === 'iu'
    && execution.target.legacyVariableId === 'comebackActivityPoint'
    && execution.target.constructId === 'activityExposure'
    && execution.binding.cutoverAuthorizationId
      === approval.cutoverAuthorizationId
    && execution.binding.cutoverApprovalContractVersion
      === approval.contractVersion
    && execution.binding.activationAuthorizationId
      === approval.binding.activationAuthorizationId
    && execution.binding.productContractVersion
      === approval.binding.productContractVersion
    && execution.binding.claimScope === 'event-stream-only-no-numeric-score'
    && execution.decision.activationAuthorized === true
    && execution.decision.cutoverAuthorized === true
    && execution.decision.publicRouteActivated === true
    && execution.decision.publication === 'production'
    && execution.decision.directProductionContributionEligible === true
    && execution.decision.lifecycleState === 'production'
  );
}

export async function getActivityExposurePublicRoute(
  runtime: ActivityExposurePublicRouteRuntime,
): Promise<ProductActivityExposurePublicRouteResult> {
  if (!executionBindingValid()) {
    return dataIssue('execution-binding-invalid');
  }

  let source: ProductActivityExposureReadModelResult;
  try {
    source = await runtime.readActivityExposureReal();
  } catch {
    return dataIssue('runtime-read-failed');
  }

  if (source.status !== 'ok') {
    return dataIssue('source-data-issue', source.issues);
  }

  const model = source.model;
  if (
    model.contractVersion !== 'product-activity-exposure-v1'
    || model.identity.sourceArtistId !== 'iu'
    || model.identity.constructId !== 'activityExposure'
    || model.construct !== 'Activity Exposure Event Stream'
    || model.dataOrigin !== 'observed'
    || model.publication !== 'shadow'
    || model.presentation !== 'standard'
    || model.providerCoverage.length < 2
    || !model.providerCoverage.some(
      (coverage) => coverage.provider === 'musicbrainz',
    )
    || !model.providerCoverage.some(
      (coverage) => coverage.provider === 'youtube',
    )
  ) {
    return dataIssue('execution-binding-invalid');
  }

  if (
    model.events.some(
      (event) =>
        event.storedEvidenceTrace === undefined
        || event.storedEvidenceTrace.eventRecordId.trim().length === 0
        || event.storedEvidenceTrace.sourceObservationId.trim().length === 0,
    )
  ) {
    return dataIssue('stored-evidence-trace-missing');
  }

  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      ...model,
      publication: 'production' as const,
    }),
  });
}
