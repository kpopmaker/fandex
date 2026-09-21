import type {
  NewsIssuePointRealPromotionApproval,
} from './newsIssuePointRealProductPromotionAuthorization';

export const NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE_CONTRACT_VERSION =
  'v1_news_issue_point_real_product_operations_approval_evidence' as const;

export const NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL =
  Object.freeze({
    contractVersion: 'v1_news_issue_point_real_promotion_approval' as const,
    action: 'authorize-real-variable-promotion' as const,
    authority: 'product-operations-owner' as const,
    authorizationId: 'ops-approval-newsissuepoint-20260921t001840z-v1',
    authorizedAt: '2026-09-21T00:18:40.114Z',
    target: Object.freeze({
      artistId: 'iu' as const,
      variableId: 'newsIssuePoint' as const,
    }),
    binding: Object.freeze({
      candidateContractVersion:
        'v1_naver_news_issue_point_product_candidate' as const,
      methodologyVersion:
        'v1_naver_news_issue_point_real_methodology' as const,
      protocolStart: '2026-09-15T16:00:00.000Z',
      selectedWindowSlotCount: 8 as const,
      normalizationType:
        'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
      claimScope:
        'protocol-conditioned-first-seen-only' as const,
    }),
  }) satisfies NewsIssuePointRealPromotionApproval;

export const NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE =
  Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PRODUCT_OPERATIONS_APPROVAL_EVIDENCE_CONTRACT_VERSION,
    auditedAt: '2026-09-21T00:18:40.114Z',
    evidenceSource: 'neon-production-read-only' as const,
    canonicalArtistId: 'iu' as const,
    variableId: 'newsIssuePoint' as const,
    protocolStart: '2026-09-15T16:00:00.000Z',
    throughSlotStart: '2026-09-21T00:00:00.000Z',
    latestJobId:
      'dae0750b1ad81f468f479328ef726e6344eaa31a62246cce3e4aeebc5d9a3f7d',
    protocol: Object.freeze({
      query: '아이유 IU',
      display: 100 as const,
      start: 1 as const,
      sort: 'date' as const,
      expectedSlotCount: 129,
      succeededSlotCount: 129,
      raw100SlotCount: 129,
      normalized100SlotCount: 129,
      rejected0SlotCount: 129,
      collectionReceivedSlotCount: 129,
      gapCount: 0,
    }),
    baselineReadiness: Object.freeze({
      analysisSlotCount: 128,
      utcHourCoverageCount: 24,
      sameUtcHourReplicationFloor: 5,
      sameUtcHourReplicationCeiling: 6,
      status: 'replicated_cycle_history' as const,
    }),
    currentWindow: Object.freeze({
      startSlotStart: '2026-09-20T17:00:00.000Z',
      endSlotStart: '2026-09-21T00:00:00.000Z',
      firstSeenObservationCount: 0,
      observedObservationCount: 800,
      activityRate: 0,
    }),
    normalization: Object.freeze({
      type: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
      priorDefinedWindowCount: 120,
      priorLessThanLatestCount: 0,
      priorEqualToLatestCount: 39,
      priorGreaterThanLatestCount: 81,
      score: 0,
    }),
    providerAudit: Object.freeze({
      latestReceived: 100,
      latestProviderTotal: 16281,
      strictPublicationIntervalClaimAllowed: false as const,
    }),
    productDecision: Object.freeze({
      promotionApproved: true as const,
      activationAuthorized: false as const,
      publicRouteActivated: false as const,
      productScorePublished: false as const,
      directProductionContributionEligible: false as const,
      requiredNextGate:
        'explicit-production-activation-authorization' as const,
    }),
  });
