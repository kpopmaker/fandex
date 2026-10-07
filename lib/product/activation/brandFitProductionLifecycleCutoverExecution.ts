import {
  createFandexVariableProductRecord,
  type FandexVariableProductRecord,
} from '../contracts/fandexVariableProduct';
import {
  BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL,
  authorizeBrandFitProductionActivationWithApproval,
} from './brandFitProductionActivationApproval';
import {
  evaluateBrandFitProductionReadiness,
} from './brandFitProductionReadiness';
import {
  BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
} from './brandFitProductionRuntimeVerification';
import {
  createBrandFitProductionLifecycleCutoverCandidate,
} from './brandFitProductionLifecycleCutoverCandidate';

export const BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_EXECUTION_VERSION =
  'brand-fit-production-lifecycle-cutover-execution-v1' as const;

export const BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_EXECUTION_APPROVAL =
  Object.freeze({
    contractVersion:
      BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_EXECUTION_VERSION,
    authority: 'product-operations-owner' as const,
    cutoverExecutionId:
      'ops-cutover-brand-fit-iu-20261007-v1' as const,
    approvedAt: '2026-10-07T12:37:07.000Z' as const,
    approvalEvidenceCommentId: 6038050693 as const,
    approvalEvidenceCommentUrl:
      'https://github.com/kpopmaker/fandex/pull/555#issuecomment-6038050693' as const,
    target: Object.freeze({
      artistId: 'iu' as const,
      variableId: 'brandFitPoint' as const,
      sourceLifecycle: 'research' as const,
      targetLifecycle: 'production' as const,
      targetReadiness: 'production' as const,
    }),
    activationAuthorizationId:
      BRAND_FIT_PRODUCTION_ACTIVATION_APPROVAL
        .activationAuthorizationId,
    executionBoundary: Object.freeze({
      lifecycleCutoverExecuted: true as const,
      renderRedeployExecuted: false as const,
      publicationAuthorized: false as const,
      publicRouteCutoverAuthorized: false as const,
      riskInventoryUpdated: false as const,
      riskConsumptionAuthorized: false as const,
      numericEligible: false as const,
      providerCalls: 0 as const,
      blobWrites: 0 as const,
      databaseWrites: 0 as const,
    }),
  });

export type BrandFitProductionLifecycleCutoverExecutionResult =
  | Readonly<{
      status: 'ok';
      record: FandexVariableProductRecord;
      execution: typeof BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_EXECUTION_APPROVAL;
    }>
  | Readonly<{
      status: 'blocked';
      reason:
        | 'source-record-not-research-real'
        | 'activation-authorization-not-current'
        | 'cutover-candidate-not-ready'
        | 'cutover-record-invalid';
    }>;

function sourceRecordEligible(
  record: FandexVariableProductRecord,
): boolean {
  return (
    record.variableId === 'brandFitPoint'
    && record.canonicalArtistId === 'iu'
    && record.lifecycleState === 'research'
    && record.materialClass === 'real'
    && record.readinessState === 'research-only'
    && record.availability === 'available'
    && record.valueRepresentation.kind === 'event'
  );
}

function blocked(
  reason: Extract<
    BrandFitProductionLifecycleCutoverExecutionResult,
    { status: 'blocked' }
  >['reason'],
): BrandFitProductionLifecycleCutoverExecutionResult {
  return Object.freeze({
    status: 'blocked' as const,
    reason,
  });
}

export function executeBrandFitProductionLifecycleCutover(
  sourceRecord: FandexVariableProductRecord,
): BrandFitProductionLifecycleCutoverExecutionResult {
  if (!sourceRecordEligible(sourceRecord)) {
    return blocked('source-record-not-research-real');
  }

  const readiness = evaluateBrandFitProductionReadiness({
    record: sourceRecord,
    runtimeVerification:
      BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION,
  });

  const authorization =
    authorizeBrandFitProductionActivationWithApproval(readiness);

  if (
    authorization.status !== 'authorized-for-lifecycle-cutover'
    || authorization.approval.activationAuthorizationId
      !== BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_EXECUTION_APPROVAL
        .activationAuthorizationId
  ) {
    return blocked('activation-authorization-not-current');
  }

  const candidate =
    createBrandFitProductionLifecycleCutoverCandidate({
      sourceRecord,
      authorization,
    });

  if (
    candidate.status
      !== 'ready-for-explicit-lifecycle-cutover-execution'
  ) {
    return blocked('cutover-candidate-not-ready');
  }

  let record: FandexVariableProductRecord;
  try {
    record = createFandexVariableProductRecord({
      variableId: candidate.candidateRecord.variableId,
      canonicalArtistId:
        candidate.candidateRecord.canonicalArtistId,
      lifecycleState: 'production',
      materialClass: candidate.candidateRecord.materialClass,
      readinessState: 'production',
      availability: candidate.candidateRecord.availability,
      valueRepresentation:
        candidate.candidateRecord.valueRepresentation,
      asOf: candidate.candidateRecord.asOf,
      observationTime:
        candidate.candidateRecord.observationTime,
      collectionTime:
        candidate.candidateRecord.collectionTime,
      confidence: candidate.candidateRecord.confidence,
      coverage: candidate.candidateRecord.coverage,
      freshness: candidate.candidateRecord.freshness,
      missingReason:
        candidate.candidateRecord.missingReason,
      unsupportedReason:
        candidate.candidateRecord.unsupportedReason,
      blockerReason:
        candidate.candidateRecord.blockerReason,
      evidenceRefs: [
        ...candidate.candidateRecord.evidenceRefs,
        `brand-fit-lifecycle-cutover-execution:${BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_EXECUTION_APPROVAL.cutoverExecutionId}`,
        `brand-fit-lifecycle-cutover-approval-comment:${BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_EXECUTION_APPROVAL.approvalEvidenceCommentId}`,
        'brand-fit-lifecycle-cutover-executed:true',
        'brand-fit-render-redeploy-executed:false',
      ],
      methodologyVersion:
        candidate.candidateRecord.methodologyVersion,
      sourceVersion:
        candidate.candidateRecord.sourceVersion,
      productVersion:
        candidate.candidateRecord.productVersion,
    });
  } catch {
    return blocked('cutover-record-invalid');
  }

  if (
    record.lifecycleState !== 'production'
    || record.readinessState !== 'production'
    || record.materialClass !== 'real'
    || record.availability !== 'available'
    || record.valueRepresentation.kind !== 'event'
    || record.evidenceRefs.includes(
      'brand-fit-publication-authorized:true',
    )
    || record.evidenceRefs.includes(
      'brand-fit-public-route-cutover-authorized:true',
    )
    || record.evidenceRefs.includes(
      'brand-fit-risk-inventory-updated:true',
    )
    || record.evidenceRefs.includes(
      'brand-fit-risk-consumption-authorized:true',
    )
  ) {
    return blocked('cutover-record-invalid');
  }

  return Object.freeze({
    status: 'ok' as const,
    record,
    execution:
      BRAND_FIT_PRODUCTION_LIFECYCLE_CUTOVER_EXECUTION_APPROVAL,
  });
}
