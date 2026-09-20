import type {
  NewsIssuePointRealPromotionEligibilityResult,
} from './newsIssuePointRealProductPromotionGate';

export const NEWS_ISSUE_POINT_REAL_PROMOTION_AUTHORIZATION_CONTRACT_VERSION =
  'v1_news_issue_point_real_promotion_authorization' as const;

export const NEWS_ISSUE_POINT_REAL_PROMOTION_APPROVAL_CONTRACT_VERSION =
  'v1_news_issue_point_real_promotion_approval' as const;

export type NewsIssuePointRealPromotionApproval = Readonly<{
  contractVersion:
    typeof NEWS_ISSUE_POINT_REAL_PROMOTION_APPROVAL_CONTRACT_VERSION;
  action: 'authorize-real-variable-promotion';
  authority: 'product-operations-owner';
  authorizationId: string;
  authorizedAt: string;
  target: Readonly<{
    artistId: 'iu';
    variableId: 'newsIssuePoint';
  }>;
  binding: Readonly<{
    candidateContractVersion: 'v1_naver_news_issue_point_product_candidate';
    methodologyVersion: 'v1_naver_news_issue_point_real_methodology';
    protocolStart: string;
    selectedWindowSlotCount: 8;
    normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE';
    claimScope: 'protocol-conditioned-first-seen-only';
  }>;
}>;

export type NewsIssuePointRealPromotionAuthorizationResult =
  | Readonly<{
      contractVersion:
        typeof NEWS_ISSUE_POINT_REAL_PROMOTION_AUTHORIZATION_CONTRACT_VERSION;
      status: 'authorized';
      promotionAuthorized: true;
      publicRouteActivated: false;
      publicationTarget: 'production';
      strictPublicationIntervalClaimAllowed: false;
      claimScope: 'protocol-conditioned-first-seen-only';
      approval: NewsIssuePointRealPromotionApproval;
      eligibility: Extract<
        NewsIssuePointRealPromotionEligibilityResult,
        { status: 'eligible' }
      >;
    }>
  | Readonly<{
      contractVersion:
        typeof NEWS_ISSUE_POINT_REAL_PROMOTION_AUTHORIZATION_CONTRACT_VERSION;
      status: 'not-authorized';
      promotionAuthorized: false;
      publicRouteActivated: false;
      strictPublicationIntervalClaimAllowed: false;
      reason: 'eligibility-blocked' | 'approval-absent';
    }>
  | Readonly<{
      contractVersion:
        typeof NEWS_ISSUE_POINT_REAL_PROMOTION_AUTHORIZATION_CONTRACT_VERSION;
      status: 'data-issue';
      promotionAuthorized: false;
      publicRouteActivated: false;
      strictPublicationIntervalClaimAllowed: false;
      reason:
        | 'approval-contract-invalid'
        | 'approval-binding-mismatch';
    }>;

function notAuthorized(
  reason: 'eligibility-blocked' | 'approval-absent',
): NewsIssuePointRealPromotionAuthorizationResult {
  return Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PROMOTION_AUTHORIZATION_CONTRACT_VERSION,
    status: 'not-authorized' as const,
    promotionAuthorized: false as const,
    publicRouteActivated: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
    reason,
  });
}

function dataIssue(
  reason: 'approval-contract-invalid' | 'approval-binding-mismatch',
): NewsIssuePointRealPromotionAuthorizationResult {
  return Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PROMOTION_AUTHORIZATION_CONTRACT_VERSION,
    status: 'data-issue' as const,
    promotionAuthorized: false as const,
    publicRouteActivated: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
    reason,
  });
}

function exactIso(value: string): boolean {
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp)
    && new Date(timestamp).toISOString() === value
  );
}

function approvalContractValid(
  approval: NewsIssuePointRealPromotionApproval,
): boolean {
  if (
    approval.contractVersion
      !== NEWS_ISSUE_POINT_REAL_PROMOTION_APPROVAL_CONTRACT_VERSION
    || approval.action !== 'authorize-real-variable-promotion'
    || approval.authority !== 'product-operations-owner'
    || !/^[a-z0-9][a-z0-9._:-]{7,127}$/.test(approval.authorizationId)
    || !exactIso(approval.authorizedAt)
    || approval.target.artistId !== 'iu'
    || approval.target.variableId !== 'newsIssuePoint'
    || approval.binding.candidateContractVersion
      !== 'v1_naver_news_issue_point_product_candidate'
    || approval.binding.methodologyVersion
      !== 'v1_naver_news_issue_point_real_methodology'
    || !exactIso(approval.binding.protocolStart)
    || approval.binding.selectedWindowSlotCount !== 8
    || approval.binding.normalizationType
      !== 'HISTORICAL_STRICT_EXCEEDANCE_SHARE'
    || approval.binding.claimScope
      !== 'protocol-conditioned-first-seen-only'
  ) {
    return false;
  }

  return (
    Date.parse(approval.authorizedAt)
    >= Date.parse(approval.binding.protocolStart)
  );
}

function approvalMatchesEligibility(
  eligibility: Extract<
    NewsIssuePointRealPromotionEligibilityResult,
    { status: 'eligible' }
  >,
  approval: NewsIssuePointRealPromotionApproval,
): boolean {
  const candidate = eligibility.candidate;
  const metadata = candidate.sourceMetadata;

  return (
    eligibility.claimScope === approval.binding.claimScope
    && eligibility.strictPublicationIntervalClaimAllowed === false
    && approval.binding.candidateContractVersion === candidate.contractVersion
    && approval.binding.methodologyVersion === metadata.methodologyVersion
    && approval.binding.protocolStart === metadata.protocolStart
    && approval.binding.selectedWindowSlotCount
      === metadata.selectedWindowSlotCount
    && approval.binding.normalizationType === metadata.normalizationType
  );
}

export function authorizeNewsIssuePointRealPromotion(
  eligibility: NewsIssuePointRealPromotionEligibilityResult,
  approval: NewsIssuePointRealPromotionApproval | null,
): NewsIssuePointRealPromotionAuthorizationResult {
  if (eligibility.status !== 'eligible') {
    return notAuthorized('eligibility-blocked');
  }

  if (approval === null) {
    return notAuthorized('approval-absent');
  }

  if (!approvalContractValid(approval)) {
    return dataIssue('approval-contract-invalid');
  }

  if (!approvalMatchesEligibility(eligibility, approval)) {
    return dataIssue('approval-binding-mismatch');
  }

  return Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PROMOTION_AUTHORIZATION_CONTRACT_VERSION,
    status: 'authorized' as const,
    promotionAuthorized: true as const,
    publicRouteActivated: false as const,
    publicationTarget: 'production' as const,
    strictPublicationIntervalClaimAllowed: false as const,
    claimScope: 'protocol-conditioned-first-seen-only' as const,
    approval,
    eligibility,
  });
}
