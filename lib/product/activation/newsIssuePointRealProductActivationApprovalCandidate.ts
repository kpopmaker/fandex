import type {
  NewsIssuePointRealProductActivationApproval,
} from './newsIssuePointRealProductActivationAuthorization';
import type {
  NewsIssuePointRealProductActivationGateResult,
} from './newsIssuePointRealProductActivationGate';
import type {
  NewsIssuePointRealPromotionApproval,
} from '../promotion/newsIssuePointRealProductPromotionAuthorization';

export const NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION =
  'v2_news_issue_point_real_product_activation_approval_candidate' as const;

type NewsIssuePointRealProductActivationApprovalDraft = Readonly<
  Omit<
    NewsIssuePointRealProductActivationApproval,
    'activationAuthorizationId' | 'authorizedAt'
  > & {
    activationAuthorizationId: null;
    authorizedAt: null;
  }
>;

export type NewsIssuePointRealProductActivationApprovalCandidateResult =
  | Readonly<{
      status: 'ready-for-owner-attestation';
      contractVersion:
        typeof NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION;
      approval: NewsIssuePointRealProductActivationApprovalDraft;
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
      reason:
        | 'activation-readiness-not-met'
        | 'promotion-approval-invalid'
        | 'promotion-authorization-binding-mismatch';
      activationAuthorized: false;
      publicRouteActivated: false;
      productScorePublished: false;
      directProductionContributionEligible: false;
      strictPublicationIntervalClaimAllowed: false;
    }>;

function blocked(
  reason: Extract<
    NewsIssuePointRealProductActivationApprovalCandidateResult,
    { status: 'blocked' }
  >['reason'],
): NewsIssuePointRealProductActivationApprovalCandidateResult {
  return Object.freeze({
    status: 'blocked' as const,
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION,
    reason,
    activationAuthorized: false as const,
    publicRouteActivated: false as const,
    productScorePublished: false as const,
    directProductionContributionEligible: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
  });
}

function promotionApprovalValid(
  approval: NewsIssuePointRealPromotionApproval,
): boolean {
  return (
    approval.contractVersion === 'v1_news_issue_point_real_promotion_approval'
    && approval.action === 'authorize-real-variable-promotion'
    && approval.authority === 'product-operations-owner'
    && approval.target.artistId === 'iu'
    && approval.target.variableId === 'newsIssuePoint'
    && approval.binding.methodologyVersion
      === 'v1_naver_news_issue_point_real_methodology'
    && approval.binding.selectedWindowSlotCount === 8
    && approval.binding.normalizationType
      === 'HISTORICAL_STRICT_EXCEEDANCE_SHARE'
    && approval.binding.claimScope
      === 'protocol-conditioned-first-seen-only'
    && typeof approval.authorizationId === 'string'
    && approval.authorizationId.trim() !== ''
    && typeof approval.binding.protocolStart === 'string'
    && approval.binding.protocolStart.trim() !== ''
  );
}

export function createNewsIssuePointRealProductActivationApprovalCandidate(
  input: Readonly<{
    readiness: NewsIssuePointRealProductActivationGateResult;
    promotionApproval: NewsIssuePointRealPromotionApproval;
  }>,
): NewsIssuePointRealProductActivationApprovalCandidateResult {
  const { readiness, promotionApproval } = input;

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
    return blocked('activation-readiness-not-met');
  }

  if (!promotionApprovalValid(promotionApproval)) {
    return blocked('promotion-approval-invalid');
  }

  if (readiness.authorizationId !== promotionApproval.authorizationId) {
    return blocked('promotion-authorization-binding-mismatch');
  }

  const approval: NewsIssuePointRealProductActivationApprovalDraft =
    Object.freeze({
      contractVersion:
        'v1_news_issue_point_real_product_activation_approval' as const,
      action: 'authorize-production-activation' as const,
      authority: 'product-operations-owner' as const,
      activationAuthorizationId: null,
      authorizedAt: null,
      target: Object.freeze({
        artistId: promotionApproval.target.artistId,
        variableId: promotionApproval.target.variableId,
      }),
      binding: Object.freeze({
        promotionAuthorizationId: promotionApproval.authorizationId,
        promotionApprovalContractVersion: promotionApproval.contractVersion,
        activationGateContractVersion: readiness.contractVersion,
        methodologyVersion: promotionApproval.binding.methodologyVersion,
        protocolStart: promotionApproval.binding.protocolStart,
        selectedWindowSlotCount:
          promotionApproval.binding.selectedWindowSlotCount,
        normalizationType: promotionApproval.binding.normalizationType,
        claimScope: promotionApproval.binding.claimScope,
      }),
    });

  return Object.freeze({
    status: 'ready-for-owner-attestation' as const,
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_CANDIDATE_CONTRACT_VERSION,
    approval,
    activationAuthorized: false as const,
    publicRouteActivated: false as const,
    productScorePublished: false as const,
    directProductionContributionEligible: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
  });
}
