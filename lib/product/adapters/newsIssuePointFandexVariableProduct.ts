import {
  buildNewsIssuePointRiskQualityMetadata,
  type NewsIssuePointRiskQualityMetadataResult,
} from './newsIssuePointRiskQualityMetadata';
import {
  createFandexVariableProductRecord,
  type FandexVariableProductRecord,
} from '../contracts/fandexVariableProduct';
import type {
  ProductVariableReadModelResult,
} from '../contracts/productVariable';

export const NEWS_ISSUE_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION =
  'news-issue-point-fandex-variable-product-adapter-v1' as const;

export type NewsIssuePointFandexVariableProductAdapterResult =
  | Readonly<{
      status: 'ok';
      record: FandexVariableProductRecord;
    }>
  | Readonly<{
      status: 'blocked';
      reason: Extract<
        NewsIssuePointRiskQualityMetadataResult,
        { status: 'blocked' }
      >['reason'];
    }>;

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

export function adaptNewsIssuePointToFandexVariableProduct(
  result: ProductVariableReadModelResult,
): NewsIssuePointFandexVariableProductAdapterResult {
  const quality = buildNewsIssuePointRiskQualityMetadata(result);
  if (quality.status === 'blocked') {
    return Object.freeze({
      status: 'blocked' as const,
      reason: quality.reason,
    });
  }

  if (result.status !== 'ok') {
    throw new Error(
      'news_issue_point_common_adapter_quality_read_state_mismatch',
    );
  }

  const model = result.model;
  if (
    model.sourceMetadata.sourceKind
      !== 'naver-news-issue-point-frozen-methodology'
  ) {
    throw new Error(
      'news_issue_point_common_adapter_source_kind_mismatch',
    );
  }

  const fact = model.fact;
  const availability =
    fact.availability === 'available'
      ? 'available' as const
      : fact.availability === 'missing'
        ? 'missing' as const
        : 'unavailable' as const;

  const missingReason =
    fact.availability === 'missing'
      ? 'source-missing'
      : null;

  const record = createFandexVariableProductRecord({
    variableId: 'newsIssuePoint',
    canonicalArtistId: model.identity.sourceArtistId,
    lifecycleState: quality.metadata.lifecycleState,
    materialClass: quality.metadata.materialClass,
    readinessState: 'production',
    availability,
    valueRepresentation: {
      kind: 'numeric',
      value:
        fact.availability === 'available'
          ? fact.value
          : null,
      unit: null,
    },
    asOf: model.sourceMetadata.sourceTimeLabel,
    observationTime: model.observationTime,
    collectionTime: null,
    confidence: quality.metadata.confidenceState,
    coverage: quality.metadata.coverageState,
    freshness: quality.metadata.freshnessState,
    missingReason,
    unsupportedReason: null,
    blockerReason: null,
    evidenceRefs: orderedUnique([
      ...quality.metadata.evidenceRefs,
      `contract:${quality.metadata.contractVersion}`,
      `methodology:${model.sourceMetadata.methodologyVersion}`,
    ]),
    methodologyVersion: model.sourceMetadata.methodologyVersion,
    sourceVersion: model.sourceMetadata.methodologyVersion,
    productVersion:
      NEWS_ISSUE_POINT_FANDEX_VARIABLE_PRODUCT_ADAPTER_VERSION,
  });

  return Object.freeze({
    status: 'ok' as const,
    record,
  });
}
