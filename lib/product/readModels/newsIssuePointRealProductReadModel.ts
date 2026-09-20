import type { FandexVariableKey } from '../../../app/data/v4/metrics/fandexMetricTypes';
import {
  PRODUCT_VARIABLE_DEFINITION_BY_ID,
} from '../variables/productVariableDefinitions';
import type { ProductNumericFact } from '../contracts/productNumericFact';
import type { ProductObservationTime } from '../contracts/productTime';
import type {
  NewsIssuePointRealPromotionAuthorizationResult,
} from '../promotion/newsIssuePointRealProductPromotionAuthorization';

export const NEWS_ISSUE_POINT_REAL_PRODUCT_READ_MODEL_CONTRACT_VERSION =
  'v1_news_issue_point_real_product_read_model' as const;

export type NewsIssuePointRealProductReadModel = Readonly<{
  contractVersion:
    typeof NEWS_ISSUE_POINT_REAL_PRODUCT_READ_MODEL_CONTRACT_VERSION;
  identity: Readonly<{
    artistId: 'iu';
    variableId: 'newsIssuePoint';
  }>;
  definition: Readonly<{
    variableId: 'newsIssuePoint';
    displayName: string;
    description: string;
    relatedSourceMetricKeys: readonly FandexVariableKey[];
    evidenceRelation: Readonly<{
      kind: 'stored-evidence-job-trace';
      sourceMetric: 'naverNewsShadowFirstSeenActivity';
    }>;
  }>;
  fact: ProductNumericFact;
  observationTime: ProductObservationTime;
  dataOrigin: 'observed';
  presentation: 'standard';
  sourcePublication: 'shadow';
  publicationTarget: 'production';
  activation: 'inactive';
  promotionAuthorized: true;
  claimScope: 'protocol-conditioned-first-seen-only';
  strictPublicationIntervalClaimAllowed: false;
  methodology: Readonly<{
    methodologyVersion: 'v1_naver_news_issue_point_real_methodology';
    selectedWindowSlotCount: 8;
    normalizationType: 'HISTORICAL_STRICT_EXCEEDANCE_SHARE';
    baselineReadinessStatus: 'replicated_cycle_history';
    protocolStart: string;
    throughSlotStart: string;
    priorDefinedWindowCount: number;
    priorLessThanLatestCount: number;
    priorEqualToLatestCount: number;
    priorGreaterThanLatestCount: number;
  }>;
  evidenceTrace: Readonly<{
    currentWindow:
      NonNullable<
        Extract<
          NewsIssuePointRealPromotionAuthorizationResult,
          { status: 'authorized' }
        >['eligibility']['candidate']['evidenceTrace']['currentWindow']
      >;
    storedEvidenceJobIds: readonly string[];
  }>;
  authorization: Readonly<{
    authorizationId: string;
    authorizedAt: string;
    authority: 'product-operations-owner';
    approvalContractVersion: 'v1_news_issue_point_real_promotion_approval';
  }>;
}>;

export type NewsIssuePointRealProductReadModelResult =
  | Readonly<{
      status: 'ok';
      model: NewsIssuePointRealProductReadModel;
    }>
  | Readonly<{
      status: 'blocked';
      reason: 'promotion-not-authorized' | 'authorized-state-invalid';
    }>;

export function buildNewsIssuePointRealProductReadModel(
  authorization: NewsIssuePointRealPromotionAuthorizationResult,
): NewsIssuePointRealProductReadModelResult {
  if (authorization.status !== 'authorized') {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'promotion-not-authorized' as const,
    });
  }

  const candidate = authorization.eligibility.candidate;
  const metadata = candidate.sourceMetadata;
  const currentWindow = candidate.evidenceTrace.currentWindow;
  const definition = PRODUCT_VARIABLE_DEFINITION_BY_ID.get('newsIssuePoint');

  if (
    !definition
    || candidate.variableId !== 'newsIssuePoint'
    || candidate.canonicalArtistId !== 'iu'
    || candidate.fact.availability !== 'available'
    || candidate.dataOrigin !== 'observed'
    || candidate.presentation !== 'standard'
    || candidate.publication !== 'shadow'
    || currentWindow === null
    || authorization.publicRouteActivated !== false
    || authorization.publicationTarget !== 'production'
    || authorization.strictPublicationIntervalClaimAllowed !== false
    || authorization.claimScope !== 'protocol-conditioned-first-seen-only'
    || metadata.methodologyVersion
      !== 'v1_naver_news_issue_point_real_methodology'
    || metadata.selectedWindowSlotCount !== 8
    || metadata.normalizationType
      !== 'HISTORICAL_STRICT_EXCEEDANCE_SHARE'
    || metadata.baselineReadinessStatus !== 'replicated_cycle_history'
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'authorized-state-invalid' as const,
    });
  }

  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      contractVersion:
        NEWS_ISSUE_POINT_REAL_PRODUCT_READ_MODEL_CONTRACT_VERSION,
      identity: Object.freeze({
        artistId: 'iu' as const,
        variableId: 'newsIssuePoint' as const,
      }),
      definition: Object.freeze({
        variableId: 'newsIssuePoint' as const,
        displayName: definition.displayName,
        description: definition.description,
        relatedSourceMetricKeys: Object.freeze([
          ...definition.relatedSourceMetricKeys,
        ]),
        evidenceRelation: Object.freeze({
          kind: 'stored-evidence-job-trace' as const,
          sourceMetric: 'naverNewsShadowFirstSeenActivity' as const,
        }),
      }),
      fact: candidate.fact,
      observationTime: candidate.observationTime,
      dataOrigin: 'observed' as const,
      presentation: 'standard' as const,
      sourcePublication: 'shadow' as const,
      publicationTarget: 'production' as const,
      activation: 'inactive' as const,
      promotionAuthorized: true as const,
      claimScope: 'protocol-conditioned-first-seen-only' as const,
      strictPublicationIntervalClaimAllowed: false as const,
      methodology: Object.freeze({
        methodologyVersion: metadata.methodologyVersion,
        selectedWindowSlotCount: metadata.selectedWindowSlotCount,
        normalizationType: metadata.normalizationType,
        baselineReadinessStatus: metadata.baselineReadinessStatus,
        protocolStart: metadata.protocolStart,
        throughSlotStart: metadata.throughSlotStart,
        priorDefinedWindowCount: metadata.priorDefinedWindowCount,
        priorLessThanLatestCount: metadata.priorLessThanLatestCount,
        priorEqualToLatestCount: metadata.priorEqualToLatestCount,
        priorGreaterThanLatestCount: metadata.priorGreaterThanLatestCount,
      }),
      evidenceTrace: Object.freeze({
        currentWindow,
        storedEvidenceJobIds: Object.freeze([
          ...candidate.evidenceTrace.storedEvidenceJobIds,
        ]),
      }),
      authorization: Object.freeze({
        authorizationId: authorization.approval.authorizationId,
        authorizedAt: authorization.approval.authorizedAt,
        authority: authorization.approval.authority,
        approvalContractVersion: authorization.approval.contractVersion,
      }),
    }),
  });
}
