import type {
  NewsIssuePointRealProductActivationGateResult,
} from './newsIssuePointRealProductActivationGate';

export const NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION =
  'v1_news_issue_point_real_product_activation_approval_candidate' as const;

export type NewsIssuePointRealProductActivationApprovalCandidateResult =
  | Readonly<{
      status: 'ready-for-owner-attestation';
      contractVersion:
        typeof NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION;
      target: Readonly<{
        artistId: 'iu';
        variableId: 'newsIssuePoint';
      }>;
      authorityRequired: 'product-operations-owner';
      action: 'authorize-real-product-activation';
      activationAuthorizationId: null;
      authorizedAt: null;
      binding: Readonly<{
        activationGateContractVersion:
          'v1_news_issue_point_real_product_activation_gate';
        promotionAuthorizationId: string;
      }>;
      activationAuthorized: false;
      publicRouteActivated: false;
      productScorePublished: false;
      directProductionContributionEligible: false;
      strictPublicationIntervalClaimAllowed: false;
    }>
  | Readonly<{
      status: 'blocked';
      contractVersion:
        typeof NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION;
      reason: 'activation-readiness-not-met';
      activationAuthorized: false;
      publicRouteActivated: false;
      productScorePublished: false;
      directProductionContributionEligible: false;
      strictPublicationIntervalClaimAllowed: false;
    }>;

function blocked(): NewsIssuePointRealProductActivationApprovalCandidateResult {
  return Object.freeze({
    status: 'blocked' as const,
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION,
    reason: 'activation-readiness-not-met' as const,
    activationAuthorized: false as const,
    publicRouteActivated: false as const,
    productScorePublished: false as const,
    directProductionContributionEligible: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
  });
}

export function createNewsIssuePointRealProductActivationApprovalCandidate(
  readiness: NewsIssuePointRealProductActivationGateResult,
): NewsIssuePointRealProductActivationApprovalCandidateResult {
  if (
    readiness.status !== 'eligible-for-activation-review'
    || readiness.contractVersion
      !== 'v1_news_issue_point_real_product_activation_gate'
    || readiness.activationAuthorized !== false
    || readiness.publicRouteActivated !== false
    || readiness.productScorePublished !== false
    || readiness.directProductionContributionEligible !== false
    || readiness.strictPublicationIntervalClaimAllowed !== false
    || readiness.requiredNextGate
      !== 'explicit-production-activation-authorization'
    || typeof readiness.authorizationId !== 'string'
    || readiness.authorizationId.trim() === ''
  ) {
    return blocked();
  }

  return Object.freeze({
    status: 'ready-for-owner-attestation' as const,
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION,
    target: Object.freeze({
      artistId: 'iu' as const,
      variableId: 'newsIssuePoint' as const,
    }),
    authorityRequired: 'product-operations-owner' as const,
    action: 'authorize-real-product-activation' as const,
    activationAuthorizationId: null,
    authorizedAt: null,
    binding: Object.freeze({
      activationGateContractVersion:
        'v1_news_issue_point_real_product_activation_gate' as const,
      promotionAuthorizationId: readiness.authorizationId,
    }),
    activationAuthorized: false as const,
    publicRouteActivated: false as const,
    productScorePublished: false as const,
    directProductionContributionEligible: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
  });
}
