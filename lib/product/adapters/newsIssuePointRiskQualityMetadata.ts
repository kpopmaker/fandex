import {
  FANDEX_CONFIDENCE_CONTRACT_VERSION,
  FANDEX_CONFIDENCE_POLICY,
  type FandexConfidenceState,
} from '../../intelligence/confidence';
import type {
  ProductVariableReadModelResult,
} from '../contracts/productVariable';

export const NEWS_ISSUE_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION =
  'news-issue-point-risk-quality-metadata-v1' as const;

export type NewsIssuePointRiskAvailabilityState =
  | 'available-nonzero'
  | 'true-zero'
  | 'source-missing'
  | 'upstream-unavailable-ambiguous'
  | 'not-tracked'
  | 'not-ranked';

export type NewsIssuePointRiskQualitySemantic = Readonly<{
  semanticId: string;
  semanticVersion:
    typeof NEWS_ISSUE_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION;
  stateValue: string;
  reason: string;
  evidenceRefs: readonly string[];
}>;

export type NewsIssuePointRiskQualityMetadata = Readonly<{
  contractVersion:
    typeof NEWS_ISSUE_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION;
  producerContractVersion: string;
  variableId: 'newsIssuePoint';
  lifecycleState: 'production';
  materialClass: 'real';
  confidenceContractVersion: typeof FANDEX_CONFIDENCE_CONTRACT_VERSION;
  confidencePolicy: typeof FANDEX_CONFIDENCE_POLICY;
  availabilityState: NewsIssuePointRiskAvailabilityState;
  identityState: 'resolved';
  confidenceState: FandexConfidenceState;
  coverageState: 'unknown';
  freshnessState: 'unknown';
  conflictState: 'unknown';
  revisionState: 'unknown';
  historyState: 'sufficient';
  evidenceRefs: readonly string[];
  requiredDimensionSemantics: Readonly<{
    availability: NewsIssuePointRiskQualitySemantic;
    identity: NewsIssuePointRiskQualitySemantic;
    confidence: NewsIssuePointRiskQualitySemantic;
    coverage: NewsIssuePointRiskQualitySemantic;
    freshness: NewsIssuePointRiskQualitySemantic;
    conflict: NewsIssuePointRiskQualitySemantic;
    revision: NewsIssuePointRiskQualitySemantic;
    history: NewsIssuePointRiskQualitySemantic;
  }>;
}>;

export type NewsIssuePointRiskQualityMetadataResult =
  | Readonly<{
      status: 'ok';
      metadata: NewsIssuePointRiskQualityMetadata;
    }>
  | Readonly<{
      status: 'blocked';
      reason:
        | 'upstream-read-not-ok'
        | 'upstream-identity-mismatch'
        | 'upstream-not-real-production'
        | 'upstream-source-contract-mismatch';
    }>;

function orderedUnique(values: readonly string[]): readonly string[] {
  return Object.freeze(
    [...new Set(values.map((value) => value.trim()).filter(Boolean))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

function availabilityState(
  result: Extract<ProductVariableReadModelResult, { status: 'ok' }>,
): NewsIssuePointRiskAvailabilityState {
  const fact = result.model.fact;
  if (fact.availability === 'available') {
    return fact.value === 0 ? 'true-zero' : 'available-nonzero';
  }
  if (fact.availability === 'missing') return 'source-missing';
  if (fact.availability === 'not-tracked') return 'not-tracked';
  if (fact.availability === 'not-ranked') return 'not-ranked';
  return 'upstream-unavailable-ambiguous';
}

function semantic(
  dimension: string,
  stateValue: string,
  reason: string,
  evidenceRefs: readonly string[],
): NewsIssuePointRiskQualitySemantic {
  return Object.freeze({
    semanticId: `news-issue-point:${dimension}`,
    semanticVersion:
      NEWS_ISSUE_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
    stateValue,
    reason,
    evidenceRefs: orderedUnique(evidenceRefs),
  });
}

export function buildNewsIssuePointRiskQualityMetadata(
  result: ProductVariableReadModelResult,
): NewsIssuePointRiskQualityMetadataResult {
  if (result.status !== 'ok') {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-read-not-ok' as const,
    });
  }

  const model = result.model;
  if (
    model.identity.sourceArtistId !== 'iu'
    || model.identity.variableId !== 'newsIssuePoint'
    || model.identity.sourceVariableKey !== 'newsIssuePoint'
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-identity-mismatch' as const,
    });
  }

  if (
    model.dataOrigin !== 'observed'
    || model.publication !== 'production'
    || model.presentation !== 'standard'
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-not-real-production' as const,
    });
  }

  if (
    model.sourceMetadata.sourceKind
      !== 'naver-news-issue-point-frozen-methodology'
    || model.evidenceTrace.kind
      !== 'naver-news-issue-point-stored-evidence'
    || model.sourceMetadata.baselineReadinessStatus
      !== 'replicated_cycle_history'
    || model.sourceMetadata.priorDefinedWindowCount <= 0
  ) {
    return Object.freeze({
      status: 'blocked' as const,
      reason: 'upstream-source-contract-mismatch' as const,
    });
  }

  const evidenceRefs = orderedUnique(
    model.evidenceTrace.storedEvidenceJobIds.map(
      (jobId) => `naver-news-job:${jobId}`,
    ),
  );
  const contractEvidence = Object.freeze([
    ...evidenceRefs,
    `contract:${NEWS_ISSUE_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION}`,
  ]);

  const availability = availabilityState(result);
  const identity = 'resolved' as const;
  const confidence: FandexConfidenceState = 'insufficient';
  const coverage = 'unknown' as const;
  const freshness = 'unknown' as const;
  const conflict = 'unknown' as const;
  const revision = 'unknown' as const;
  const history = 'sufficient' as const;

  return Object.freeze({
    status: 'ok' as const,
    metadata: Object.freeze({
      contractVersion:
        NEWS_ISSUE_POINT_RISK_QUALITY_METADATA_CONTRACT_VERSION,
      producerContractVersion: model.sourceMetadata.methodologyVersion,
      variableId: 'newsIssuePoint' as const,
      lifecycleState: 'production' as const,
      materialClass: 'real' as const,
      confidenceContractVersion: FANDEX_CONFIDENCE_CONTRACT_VERSION,
      confidencePolicy: FANDEX_CONFIDENCE_POLICY,
      availabilityState: availability,
      identityState: identity,
      confidenceState: confidence,
      coverageState: coverage,
      freshnessState: freshness,
      conflictState: conflict,
      revisionState: revision,
      historyState: history,
      evidenceRefs,
      requiredDimensionSemantics: Object.freeze({
        availability: semantic(
          'availability',
          availability,
          'product-numeric-fact-availability',
          contractEvidence,
        ),
        identity: semantic(
          'identity',
          identity,
          'product-read-model-fail-closed-identity-boundary',
          contractEvidence,
        ),
        confidence: semantic(
          'confidence',
          confidence,
          'producer-quality-dimensions-not-fully-explicit',
          contractEvidence,
        ),
        coverage: semantic(
          'coverage',
          coverage,
          'metric-interval-coverage-unproven',
          contractEvidence,
        ),
        freshness: semantic(
          'freshness',
          freshness,
          'no-validated-product-freshness-policy',
          contractEvidence,
        ),
        conflict: semantic(
          'conflict',
          conflict,
          'no-typed-product-conflict-assessment',
          contractEvidence,
        ),
        revision: semantic(
          'revision',
          revision,
          'no-product-revision-stability-assessment',
          contractEvidence,
        ),
        history: semantic(
          'history',
          history,
          'replicated-cycle-history-with-defined-prior-window',
          contractEvidence,
        ),
      }),
    }),
  });
}
