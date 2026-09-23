import {
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION,
  authorizeNewsIssuePointPublicRouteCutover,
  type NewsIssuePointPublicRouteCutoverApproval,
} from './newsIssuePointPublicRouteCutoverAuthorization';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE,
} from './newsIssuePointRealProductActivationApproval';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
} from './newsIssuePointRealProductActivationAuthorization';

export const NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE_CONTRACT_VERSION =
  'v2_news_issue_point_real_product_public_route_cutover_candidate' as const;

type PendingCutoverApproval = Readonly<
  Omit<
    NewsIssuePointPublicRouteCutoverApproval,
    'cutoverAuthorizationId' | 'authorizedAt'
  > & {
    cutoverAuthorizationId: null;
    authorizedAt: null;
  }
>;

const pendingApproval = Object.freeze({
  contractVersion:
    NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION,
  action: 'authorize-public-route-cutover' as const,
  authority: 'product-operations-owner' as const,
  cutoverAuthorizationId: null,
  authorizedAt: null,
  target: Object.freeze({
    artistId: 'iu' as const,
    variableId: 'newsIssuePoint' as const,
  }),
  binding: Object.freeze({
    activationAuthorizationId:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
        .activationAuthorizationId,
    activationApprovalContractVersion:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL.contractVersion,
    activationAuthorizationContractVersion:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
    methodologyVersion:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
        .binding.methodologyVersion,
    protocolStart:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
        .binding.protocolStart,
    selectedWindowSlotCount:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
        .binding.selectedWindowSlotCount,
    normalizationType:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
        .binding.normalizationType,
    claimScope:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL
        .binding.claimScope,
  }),
}) satisfies PendingCutoverApproval;

export const NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE =
  Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PRODUCT_PUBLIC_ROUTE_CUTOVER_CANDIDATE_CONTRACT_VERSION,
    status: 'ready-for-owner-attestation' as const,
    authoritativeMainWithCutoverAuthorizationContract:
      '66b4a253c6cc049b7b25c7650b8c121e610e8629' as const,
    activationAuthorizationEvidenceCommentId:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_EVIDENCE
        .authorizationEvidenceCommentId,
    pendingApproval,
    authorizationWithoutApproval:
      authorizeNewsIssuePointPublicRouteCutover({
        activationAuthorization: Object.freeze({
          contractVersion:
            NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
          status: 'authorized-for-cutover' as const,
          activationAuthorized: true as const,
          publicRouteActivated: false as const,
          productScorePublished: false as const,
          directProductionContributionEligible: false as const,
          strictPublicationIntervalClaimAllowed: false as const,
          lifecycleState: 'shadow' as const,
          requiredNextGate: 'explicit-public-route-cutover' as const,
          approval: NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
        }),
        approval: null,
      }),
    decision: Object.freeze({
      activationAuthorized: true as const,
      cutoverAuthorized: false as const,
      publicRouteActivated: false as const,
      productScorePublished: false as const,
      directProductionContributionEligible: false as const,
      strictPublicationIntervalClaimAllowed: false as const,
      lifecycleState: 'shadow' as const,
      requiredNextGate: 'explicit-public-route-cutover' as const,
    }),
  });
