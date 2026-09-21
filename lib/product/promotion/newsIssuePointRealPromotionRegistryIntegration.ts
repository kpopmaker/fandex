import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL,
  NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE,
} from './newsIssuePointRealProductOperationsApproval';

export const NEWS_ISSUE_POINT_REAL_PROMOTION_REGISTRY_INTEGRATION_CONTRACT_VERSION =
  'v1_news_issue_point_real_promotion_registry_integration' as const;

export const NEWS_ISSUE_POINT_REAL_PROMOTION_REGISTRY_INTEGRATION =
  Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PROMOTION_REGISTRY_INTEGRATION_CONTRACT_VERSION,
    sourceApproval: Object.freeze({
      contractVersion:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL.contractVersion,
      authorizationId:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL.authorizationId,
      authorizedAt:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL.authorizedAt,
      authority:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL.authority,
      target:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL.target,
    }),
    evidenceAudit: Object.freeze({
      throughSlotStart:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE
          .throughSlotStart,
      latestJobId:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE
          .latestJobId,
      baselineReadinessStatus:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE
          .baselineReadiness.status,
      normalizationType:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL
          .binding.normalizationType,
      strictPublicationIntervalClaimAllowed:
        NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE
          .providerAudit.strictPublicationIntervalClaimAllowed,
    }),
    registryTransition: Object.freeze({
      fromBlocker: 'production-promotion-not-authorized' as const,
      toBlocker: 'production-activation-not-authorized' as const,
      lifecycleBefore: 'shadow' as const,
      lifecycleAfter: 'shadow' as const,
      directProductionContributionEligibleBefore: false as const,
      directProductionContributionEligibleAfter: false as const,
    }),
    activationState: Object.freeze({
      activationAuthorized: false as const,
      publicRouteActivated: false as const,
      productScorePublished: false as const,
      directProductionContributionEligible: false as const,
      requiredNextGate:
        'explicit-production-activation-authorization' as const,
    }),
  });
