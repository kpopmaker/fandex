import type {
  NewsIssuePointRealProductActivationGateResult,
} from './newsIssuePointRealProductActivationGate';
import type {
  NewsIssuePointRealPromotionControlResult,
} from '../promotion/newsIssuePointRealProductPromotionAuthorization';

export const NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION =
  'v1_news_issue_point_real_product_activation_authorization' as const;

export const NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_CONTRACT_VERSION =
  'v1_news_issue_point_real_product_activation_approval' as const;

export type NewsIssuePointRealProductActivationApproval = Readonly<{
  contractVersion:
    typeof NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_CONTRACT_VERSION;
  action: 'authorize-production-activation';
  authority: 'product-operations-owner';
  activationAuthorizationId: string;
  authorizedAt: string;
  target: Readonly<{
    artistId: 'iu';
    variableId: 'newsIssuePoint';
  }>;
  binding: Readonly<{
    promotionAuthorizationId: string;
    promotionApprovalContractVersion:
      'v1_news_issue_point_real_promotion_approval';
    activationGateContractVersion:
      'v1_news_issue_point_real_product_activation_gate';
    methodologyVersion:
      'v1_naver_news_issue_point_real_methodology';
    protocolStart: string;
    selectedWindowSlotCount: 8;
    normalizationType:
      'HISTORICAL_STRICT_EXCEEDANCE_SHARE';
    claimScope:
      'protocol-conditioned-first-seen-only';
  }>;
}>;

export type NewsIssuePointRealProductActivationAuthorizationResult =
  | Readonly<{
      contractVersion:
        typeof NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION;
      status: 'authorized-for-cutover';
      activationAuthorized: true;
      publicRouteActivated: false;
      productScorePublished: false;
      directProductionContributionEligible: false;
      strictPublicationIntervalClaimAllowed: false;
      lifecycleState: 'shadow';
      requiredNextGate: 'explicit-public-route-cutover';
      approval: NewsIssuePointRealProductActivationApproval;
    }>
  | Readonly<{
      contractVersion:
        typeof NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION;
      status: 'not-authorized';
      activationAuthorized: false;
      publicRouteActivated: false;
      productScorePublished: false;
      directProductionContributionEligible: false;
      strictPublicationIntervalClaimAllowed: false;
      lifecycleState: 'shadow';
      reason:
        | 'activation-readiness-not-eligible'
        | 'activation-approval-absent';
    }>
  | Readonly<{
      contractVersion:
        typeof NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION;
      status: 'data-issue';
      activationAuthorized: false;
      publicRouteActivated: false;
      productScorePublished: false;
      directProductionContributionEligible: false;
      strictPublicationIntervalClaimAllowed: false;
      lifecycleState: 'blocked';
      reason:
        | 'activation-approval-contract-invalid'
        | 'activation-approval-binding-mismatch';
    }>;

function exactIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function notAuthorized(
  reason:
    | 'activation-readiness-not-eligible'
    | 'activation-approval-absent',
): NewsIssuePointRealProductActivationAuthorizationResult {
  return Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
    status: 'not-authorized' as const,
    activationAuthorized: false as const,
    publicRouteActivated: false as const,
    productScorePublished: false as const,
    directProductionContributionEligible: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
    lifecycleState: 'shadow' as const,
    reason,
  });
}

function dataIssue(
  reason:
    | 'activation-approval-contract-invalid'
    | 'activation-approval-binding-mismatch',
): NewsIssuePointRealProductActivationAuthorizationResult {
  return Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_AUTHORIZATION_CONTRACT_VERSION,
    status: 'data-issue' as const,
    activationAuthorized: false as const,
    publicRouteActivated: false as const,
    productScorePublished: false as const,
    directProductionContributionEligible: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
    lifecycleState: 'blocked' as const,
    reason,
  });
}

function approvalContractValid(
  approval: NewsIssuePointRealProductActivationApproval,
): boolean {
  return (
    approval.contractVersion
      === NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL_CONTRACT_VERSION
    && approval.action === 'authorize-production-activation'
    && approval.authority === 'product-operations-owner'
    && /^[a-z0-9][a-z0-9._:-]{7,127}$/.test(
      approval.activationAuthorizationId,
    )
    && exactIso(approval.authorizedAt)
    && approval.target.artistId === 'iu'
    && approval.target.variableId === 'newsIssuePoint'
    && /^[a-z0-9][a-z0-9._:-]{7,127}$/.test(
      approval.binding.promotionAuthorizationId,
    )
    && approval.binding.promotionApprovalContractVersion
      === 'v1_news_issue_point_real_promotion_approval'
    && approval.binding.activationGateContractVersion
      === 'v1_news_issue_point_real_product_activation_gate'
    && approval.binding.methodologyVersion
      === 'v1_naver_news_issue_point_real_methodology'
    && exactIso(approval.binding.protocolStart)
    && approval.binding.selectedWindowSlotCount === 8
    && approval.binding.normalizationType
      === 'HISTORICAL_STRICT_EXCEEDANCE_SHARE'
    && approval.binding.claimScope
      === 'protocol-conditioned-first-seen-only'
  );
}

function approvalMatches(
  readiness: Extract<
    NewsIssuePointRealProductActivationGateResult,
    { status: 'eligible-for-activation-review' }
  >,
  control: Extract<
    NewsIssuePointRealPromotionControlResult,
    { status: 'authorized' }
  >,
  approval: NewsIssuePointRealProductActivationApproval,
): boolean {
  const promotionApproval = control.authorization.approval;
  const candidate = control.authorization.eligibility.candidate;
  const metadata = candidate.sourceMetadata;

  return (
    readiness.authorizationId
      === promotionApproval.authorizationId
    && approval.binding.promotionAuthorizationId
      === promotionApproval.authorizationId
    && approval.binding.promotionApprovalContractVersion
      === promotionApproval.contractVersion
    && approval.binding.activationGateContractVersion
      === readiness.contractVersion
    && approval.binding.methodologyVersion
      === metadata.methodologyVersion
    && approval.binding.protocolStart
      === metadata.protocolStart
    && approval.binding.selectedWindowSlotCount
      === metadata.selectedWindowSlotCount
    && approval.binding.normalizationType
      === metadata.normalizationType
    && approval.binding.claimScope
      === control.authorization.claimScope
    && Date.parse(approval.authorizedAt)
      >= Date.parse(promotionApproval.authorizedAt)
  );
}

export function authorizeNewsIssuePointRealProductActivation(
  input: Readonly<{
    readiness: NewsIssuePointRealProductActivationGateResult;
    promotionControl: NewsIssuePointRealPromotionControlResult;
    approval: NewsIssuePointRealProductActivationApproval | null;
  }>,
): NewsIssuePointRealProductActivationAuthorizationResult {
  if (input.readiness.status !== 'eligible-for-activation-review') {
    return notAuthorized('activation-readiness-not-eligible');
  }

  if (input.promotionControl.status !== 'authorized') {
    return notAuthorized('activation-readiness-not-eligible');
  }

  if (input.approval === null) {
    return notAuthorized('activation-approval-absent');
  }

  if (!approvalContractValid(input.approval)) {
    return dataIssue('activation-approval-contract-invalid');
  }

  if (!approvalMatches(
    input.readiness,
    input.promotionControl,
    input.approval,
  )) {
    return dataIssue('activation-approval-binding-mismatch');
  }

  return Object.freeze({
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
    approval: input.approval,
  });
}
