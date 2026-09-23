import type {
  NewsIssuePointRealProductActivationAuthorizationResult,
} from './newsIssuePointRealProductActivationAuthorization';

export const NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION =
  'v1_news_issue_point_public_route_cutover_authorization' as const;

export const NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION =
  'v1_news_issue_point_public_route_cutover_approval' as const;

export type NewsIssuePointPublicRouteCutoverApproval = Readonly<{
  contractVersion:
    typeof NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION;
  action: 'authorize-public-route-cutover';
  authority: 'product-operations-owner';
  cutoverAuthorizationId: string;
  authorizedAt: string;
  target: Readonly<{
    artistId: 'iu';
    variableId: 'newsIssuePoint';
  }>;
  binding: Readonly<{
    activationAuthorizationId: string;
    activationApprovalContractVersion:
      'v1_news_issue_point_real_product_activation_approval';
    activationAuthorizationContractVersion:
      'v1_news_issue_point_real_product_activation_authorization';
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

export type NewsIssuePointPublicRouteCutoverAuthorizationResult =
  | Readonly<{
      contractVersion:
        typeof NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION;
      status: 'authorized-for-route-cutover';
      activationAuthorized: true;
      cutoverAuthorized: true;
      publicRouteActivated: false;
      productScorePublished: false;
      directProductionContributionEligible: false;
      strictPublicationIntervalClaimAllowed: false;
      lifecycleState: 'shadow';
      requiredNextGate: 'explicit-public-route-cutover-execution';
      approval: NewsIssuePointPublicRouteCutoverApproval;
    }>
  | Readonly<{
      contractVersion:
        typeof NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION;
      status: 'not-authorized';
      activationAuthorized: boolean;
      cutoverAuthorized: false;
      publicRouteActivated: false;
      productScorePublished: false;
      directProductionContributionEligible: false;
      strictPublicationIntervalClaimAllowed: false;
      lifecycleState: 'shadow';
      reason:
        | 'activation-authorization-not-ready'
        | 'cutover-approval-absent';
    }>
  | Readonly<{
      contractVersion:
        typeof NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION;
      status: 'data-issue';
      activationAuthorized: false;
      cutoverAuthorized: false;
      publicRouteActivated: false;
      productScorePublished: false;
      directProductionContributionEligible: false;
      strictPublicationIntervalClaimAllowed: false;
      lifecycleState: 'blocked';
      reason:
        | 'cutover-approval-contract-invalid'
        | 'cutover-approval-binding-mismatch';
    }>;

function exactIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function notAuthorized(
  activationAuthorized: boolean,
  reason:
    | 'activation-authorization-not-ready'
    | 'cutover-approval-absent',
): NewsIssuePointPublicRouteCutoverAuthorizationResult {
  return Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION,
    status: 'not-authorized' as const,
    activationAuthorized,
    cutoverAuthorized: false as const,
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
    | 'cutover-approval-contract-invalid'
    | 'cutover-approval-binding-mismatch',
): NewsIssuePointPublicRouteCutoverAuthorizationResult {
  return Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION,
    status: 'data-issue' as const,
    activationAuthorized: false as const,
    cutoverAuthorized: false as const,
    publicRouteActivated: false as const,
    productScorePublished: false as const,
    directProductionContributionEligible: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
    lifecycleState: 'blocked' as const,
    reason,
  });
}

function approvalContractValid(
  approval: NewsIssuePointPublicRouteCutoverApproval,
): boolean {
  return (
    approval.contractVersion
      === NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL_CONTRACT_VERSION
    && approval.action === 'authorize-public-route-cutover'
    && approval.authority === 'product-operations-owner'
    && /^[a-z0-9][a-z0-9._:-]{7,127}$/.test(
      approval.cutoverAuthorizationId,
    )
    && exactIso(approval.authorizedAt)
    && approval.target.artistId === 'iu'
    && approval.target.variableId === 'newsIssuePoint'
    && /^[a-z0-9][a-z0-9._:-]{7,127}$/.test(
      approval.binding.activationAuthorizationId,
    )
    && approval.binding.activationApprovalContractVersion
      === 'v1_news_issue_point_real_product_activation_approval'
    && approval.binding.activationAuthorizationContractVersion
      === 'v1_news_issue_point_real_product_activation_authorization'
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
  activationAuthorization: Extract<
    NewsIssuePointRealProductActivationAuthorizationResult,
    { status: 'authorized-for-cutover' }
  >,
  approval: NewsIssuePointPublicRouteCutoverApproval,
): boolean {
  const activationApproval = activationAuthorization.approval;

  return (
    activationAuthorization.activationAuthorized === true
    && activationAuthorization.publicRouteActivated === false
    && activationAuthorization.productScorePublished === false
    && activationAuthorization.directProductionContributionEligible === false
    && activationAuthorization.strictPublicationIntervalClaimAllowed === false
    && activationAuthorization.lifecycleState === 'shadow'
    && activationAuthorization.requiredNextGate
      === 'explicit-public-route-cutover'
    && approval.binding.activationAuthorizationId
      === activationApproval.activationAuthorizationId
    && approval.binding.activationApprovalContractVersion
      === activationApproval.contractVersion
    && approval.binding.activationAuthorizationContractVersion
      === activationAuthorization.contractVersion
    && approval.binding.methodologyVersion
      === activationApproval.binding.methodologyVersion
    && approval.binding.protocolStart
      === activationApproval.binding.protocolStart
    && approval.binding.selectedWindowSlotCount
      === activationApproval.binding.selectedWindowSlotCount
    && approval.binding.normalizationType
      === activationApproval.binding.normalizationType
    && approval.binding.claimScope
      === activationApproval.binding.claimScope
    && Date.parse(approval.authorizedAt)
      >= Date.parse(activationApproval.authorizedAt)
  );
}

export function authorizeNewsIssuePointPublicRouteCutover(
  input: Readonly<{
    activationAuthorization:
      NewsIssuePointRealProductActivationAuthorizationResult;
    approval: NewsIssuePointPublicRouteCutoverApproval | null;
  }>,
): NewsIssuePointPublicRouteCutoverAuthorizationResult {
  if (input.activationAuthorization.status !== 'authorized-for-cutover') {
    return notAuthorized(
      false,
      'activation-authorization-not-ready',
    );
  }

  if (input.approval === null) {
    return notAuthorized(true, 'cutover-approval-absent');
  }

  if (!approvalContractValid(input.approval)) {
    return dataIssue('cutover-approval-contract-invalid');
  }

  if (!approvalMatches(input.activationAuthorization, input.approval)) {
    return dataIssue('cutover-approval-binding-mismatch');
  }

  return Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_AUTHORIZATION_CONTRACT_VERSION,
    status: 'authorized-for-route-cutover' as const,
    activationAuthorized: true as const,
    cutoverAuthorized: true as const,
    publicRouteActivated: false as const,
    productScorePublished: false as const,
    directProductionContributionEligible: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
    lifecycleState: 'shadow' as const,
    requiredNextGate:
      'explicit-public-route-cutover-execution' as const,
    approval: input.approval,
  });
}
