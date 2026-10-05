import type {
  ProductVariableReadModelResult,
} from '../contracts/productVariable';
import {
  NAVER_NEWS_IU_RECOVERY_PROTOCOL_START,
  NAVER_NEWS_SHADOW_EPOCH_CONTRACT_VERSION,
} from '../../server/ingestion/naverNewsShadowEpoch';

export const NEWS_ISSUE_POINT_RECOVERY_EPOCH_PRODUCT_REAUTHORIZATION_CONTRACT_VERSION =
  'v1_news_issue_point_recovery_epoch_product_reauthorization' as const;

export const NEWS_ISSUE_POINT_RECOVERY_EPOCH_PRODUCT_REAUTHORIZATION =
  Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_RECOVERY_EPOCH_PRODUCT_REAUTHORIZATION_CONTRACT_VERSION,
    action: 'reauthorize-recovery-epoch-product-publication' as const,
    authority: 'product-operations-owner' as const,
    authorizationId:
      'ops-reauthorize-newsissuepoint-recovery-epoch-20261005-v1',
    authorizationSource:
      'explicit-owner-conversation-approval-2026-10-05' as const,
    preparedAgainstMain:
      'd1c11d058c903dd738a0e42e19129826aeb2e5e3' as const,
    target: Object.freeze({
      artistId: 'iu' as const,
      variableId: 'newsIssuePoint' as const,
    }),
    candidate: Object.freeze({
      path:
        'data/momentum-product/iu_naver_news_recovery_product_reauthorization_candidate_v1.json' as const,
      blobSha:
        'abb7334d4dfeed9f34e116dffbfee2f46a59ac13' as const,
      contractVersion:
        'naver-news-recovery-product-reauthorization-candidate-v1' as const,
    }),
    binding: Object.freeze({
      shadowEpochContractVersion:
        NAVER_NEWS_SHADOW_EPOCH_CONTRACT_VERSION,
      protocolStart: NAVER_NEWS_IU_RECOVERY_PROTOCOL_START,
      methodologyVersion:
        'v1_naver_news_issue_point_real_methodology' as const,
      selectedWindowSlotCount: 8 as const,
      normalizationType:
        'HISTORICAL_STRICT_EXCEEDANCE_SHARE' as const,
      claimScope:
        'protocol-conditioned-first-seen-only' as const,
    }),
    decision: Object.freeze({
      activationAuthorized: true as const,
      publicRouteCutoverAuthorized: true as const,
      variablePublication: 'production' as const,
      directProductionContributionEligible: true as const,
      productScorePublished: false as const,
      methodologyChanged: false as const,
      rankingActivated: false as const,
    }),
    safetyBoundary: Object.freeze({
      providerExecutionsAuthorized: 0 as const,
      blobWritesAuthorized: 0 as const,
      databaseWritesAuthorized: 0 as const,
      backfillAuthorized: false as const,
      missingSlotSynthesisAuthorized: false as const,
      scorePublicationAuthorized: false as const,
      rankingActivationAuthorized: false as const,
    }),
  });

function dataIssue(
  result: Extract<ProductVariableReadModelResult, { status: 'ok' }>,
): ProductVariableReadModelResult {
  return Object.freeze({
    status: 'data-issue' as const,
    issues: Object.freeze([
      Object.freeze({
        code: 'real-source-data-issue' as const,
        reason: 'selector-data-issue' as const,
      }),
    ]),
    sourceMetadata: Object.freeze({
      sourceArtistId: result.model.identity.sourceArtistId,
      rawVariableId: result.model.identity.variableId,
      sourceTimeLabel: result.model.sourceMetadata.sourceTimeLabel,
    }),
  });
}

export function applyNewsIssuePointRecoveryEpochProductReauthorization(
  result: ProductVariableReadModelResult,
): ProductVariableReadModelResult {
  if (result.status !== 'ok') return result;

  const model = result.model;
  const authorization =
    NEWS_ISSUE_POINT_RECOVERY_EPOCH_PRODUCT_REAUTHORIZATION;

  if (
    model.identity.sourceArtistId !== authorization.target.artistId
    || model.identity.variableId !== authorization.target.variableId
    || model.identity.sourceVariableKey !== 'newsIssuePoint'
    || model.dataOrigin !== 'observed'
    || model.presentation !== 'standard'
    || model.publication !== 'shadow'
  ) {
    return dataIssue(result);
  }

  const metadata = model.sourceMetadata;
  if (
    metadata.sourceKind
      !== 'naver-news-issue-point-frozen-methodology'
    || metadata.methodologyVersion
      !== authorization.binding.methodologyVersion
    || metadata.officialShadowEpoch
      !== authorization.binding.protocolStart
    || metadata.selectedWindowSlotCount
      !== authorization.binding.selectedWindowSlotCount
    || metadata.normalizationType
      !== authorization.binding.normalizationType
    || metadata.baselineReadinessStatus
      !== 'replicated_cycle_history'
    || metadata.priorDefinedWindowCount <= 0
  ) {
    return dataIssue(result);
  }

  const trace = model.evidenceTrace;
  if (
    trace.kind !== 'naver-news-issue-point-stored-evidence'
    || trace.methodologyVersion
      !== authorization.binding.methodologyVersion
    || trace.officialShadowEpoch
      !== authorization.binding.protocolStart
    || trace.throughSlotStart !== metadata.throughSlotStart
    || trace.storedEvidenceJobIds.length === 0
  ) {
    return dataIssue(result);
  }

  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      ...model,
      publication: authorization.decision.variablePublication,
    }),
  });
}
