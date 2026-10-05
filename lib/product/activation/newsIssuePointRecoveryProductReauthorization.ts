import {
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION,
} from './newsIssuePointPublicRouteCutoverExecution';
import {
  NAVER_NEWS_IU_RECOVERY_PROTOCOL_START,
} from '../../server/ingestion/naverNewsShadowEpoch';

export const NEWS_ISSUE_POINT_RECOVERY_PRODUCT_REAUTHORIZATION_CONTRACT_VERSION =
  'v1_news_issue_point_recovery_product_reauthorization' as const;

export const NEWS_ISSUE_POINT_RECOVERY_PRODUCT_REAUTHORIZATION =
  Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_RECOVERY_PRODUCT_REAUTHORIZATION_CONTRACT_VERSION,
    action: 'reauthorize-recovery-epoch-product-cutover' as const,
    authority: 'product-operations-owner' as const,
    authorizationId:
      'ops-reauthorize-newsissuepoint-recovery-epoch-20261005-v1',
    authorizedDate: '2026-10-05' as const,
    authorizedBaseMain:
      'd1c11d058c903dd738a0e42e19129826aeb2e5e3' as const,
    target: Object.freeze({
      artistId: 'iu' as const,
      variableId: 'newsIssuePoint' as const,
    }),
    binding: Object.freeze({
      candidatePath:
        'data/momentum-product/iu_naver_news_recovery_product_reauthorization_candidate_v1.json' as const,
      candidateBlobSha:
        'abb7334d4dfeed9f34e116dffbfee2f46a59ac13' as const,
      recoveryEpochActivationMergeSha:
        '70e66c0c7e968b222b49f391a40a419e694480b6' as const,
      historicalCutoverExecutionAuthorizationId:
        NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION
          .cutoverExecutionAuthorizationId,
      historicalProtocolStart:
        NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION
          .binding.protocolStart,
      recoveryProtocolStart:
        NAVER_NEWS_IU_RECOVERY_PROTOCOL_START,
      methodologyVersion:
        NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION
          .binding.methodologyVersion,
      selectedWindowSlotCount:
        NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION
          .binding.selectedWindowSlotCount,
      normalizationType:
        NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION
          .binding.normalizationType,
      claimScope:
        NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION
          .binding.claimScope,
    }),
    decision: Object.freeze({
      activationReauthorized: true as const,
      publicRouteCutoverReauthorized: true as const,
      newsIssuePointPublicationAuthorized: true as const,
      newsIssuePointScorePublicationAuthorized: true as const,
      directProductionContributionEligible: true as const,
      lifecycleState: 'production' as const,
      strictPublicationIntervalClaimAllowed: false as const,
      fandexAggregateScorePublicationAuthorized: false as const,
    }),
    safetyBoundary: Object.freeze({
      providerExecutionsAuthorized: 0 as const,
      blobWritesAuthorized: 0 as const,
      databaseWritesAuthorized: 0 as const,
      backfillAuthorized: false as const,
      missingSlotSynthesisAuthorized: false as const,
      methodologyChangeAuthorized: false as const,
      fandexAggregateScorePublicationAuthorized: false as const,
    }),
  });

if (
  NEWS_ISSUE_POINT_RECOVERY_PRODUCT_REAUTHORIZATION
    .binding.historicalProtocolStart
    === NEWS_ISSUE_POINT_RECOVERY_PRODUCT_REAUTHORIZATION
      .binding.recoveryProtocolStart
  || NEWS_ISSUE_POINT_RECOVERY_PRODUCT_REAUTHORIZATION
    .binding.recoveryProtocolStart
    !== NAVER_NEWS_IU_RECOVERY_PROTOCOL_START
  || NEWS_ISSUE_POINT_RECOVERY_PRODUCT_REAUTHORIZATION
    .binding.methodologyVersion
    !== NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION
      .binding.methodologyVersion
  || NEWS_ISSUE_POINT_RECOVERY_PRODUCT_REAUTHORIZATION
    .binding.selectedWindowSlotCount !== 8
  || NEWS_ISSUE_POINT_RECOVERY_PRODUCT_REAUTHORIZATION
    .binding.normalizationType
      !== 'HISTORICAL_STRICT_EXCEEDANCE_SHARE'
  || NEWS_ISSUE_POINT_RECOVERY_PRODUCT_REAUTHORIZATION
    .binding.claimScope
      !== 'protocol-conditioned-first-seen-only'
) {
  throw new Error(
    'news_issue_point_recovery_product_reauthorization_binding_invalid',
  );
}
