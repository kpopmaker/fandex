import type {
  ProductVariableReadModelResult,
} from '../product/contracts/productVariable';
import type {
  RiskAdjustmentAvailabilityState,
  RiskAdjustmentUpstreamInput,
} from './riskAdjustmentPointConstruct';

export const RISK_ADJUSTMENT_NEWS_ISSUE_PROJECTION_CONTRACT_VERSION =
  'risk-adjustment-news-issue-projection-v1' as const;

export type RiskAdjustmentNewsIssueProjectionResult =
  | Readonly<{
      status: 'ok';
      contractVersion:
        typeof RISK_ADJUSTMENT_NEWS_ISSUE_PROJECTION_CONTRACT_VERSION;
      input: RiskAdjustmentUpstreamInput;
      unresolvedDimensions: readonly [
        'confidence',
        'coverage',
        'freshness',
        'conflict',
        'revision',
        'volatility',
      ];
    }>
  | Readonly<{
      status: 'blocked';
      contractVersion:
        typeof RISK_ADJUSTMENT_NEWS_ISSUE_PROJECTION_CONTRACT_VERSION;
      reason:
        | 'upstream-read-not-ok'
        | 'upstream-identity-mismatch'
        | 'upstream-not-real-production'
        | 'upstream-source-contract-mismatch';
    }>;

function availability(
  result: Extract<ProductVariableReadModelResult, { status: 'ok' }>,
): RiskAdjustmentAvailabilityState {
  const fact = result.model.fact;

  if (fact.availability === 'available') {
    return fact.value === 0 ? 'true-zero' : 'available-nonzero';
  }
  if (fact.availability === 'missing') return 'source-missing';
  if (fact.availability === 'not-tracked') return 'not-tracked';
  if (fact.availability === 'not-ranked') return 'not-ranked';

  // Product "unavailable" does not encode whether the provider failed,
  // baseline history is insufficient, or another source-specific condition
  // made the value unavailable. Risk must not collapse those states.
  return 'upstream-unavailable-ambiguous';
}

export function projectNewsIssuePointForRiskAdjustment(
  result: ProductVariableReadModelResult,
): RiskAdjustmentNewsIssueProjectionResult {
  if (result.status !== 'ok') {
    return Object.freeze({
      status: 'blocked' as const,
      contractVersion:
        RISK_ADJUSTMENT_NEWS_ISSUE_PROJECTION_CONTRACT_VERSION,
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
      contractVersion:
        RISK_ADJUSTMENT_NEWS_ISSUE_PROJECTION_CONTRACT_VERSION,
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
      contractVersion:
        RISK_ADJUSTMENT_NEWS_ISSUE_PROJECTION_CONTRACT_VERSION,
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
      contractVersion:
        RISK_ADJUSTMENT_NEWS_ISSUE_PROJECTION_CONTRACT_VERSION,
      reason: 'upstream-source-contract-mismatch' as const,
    });
  }

  const evidenceRefs = Object.freeze(
    [...new Set(model.evidenceTrace.storedEvidenceJobIds)]
      .sort((left, right) => left.localeCompare(right))
      .map((jobId) => `naver-news-job:${jobId}`),
  );

  return Object.freeze({
    status: 'ok' as const,
    contractVersion:
      RISK_ADJUSTMENT_NEWS_ISSUE_PROJECTION_CONTRACT_VERSION,
    input: Object.freeze({
      variableId: 'newsIssuePoint' as const,
      lifecycleState: 'production' as const,
      materialClass: 'real' as const,
      // No explicit FandexConfidenceAssessment is exposed by this Product
      // read model. Do not infer a higher confidence state.
      confidenceState: 'insufficient' as const,
      availabilityState: availability(result),
      identityState: 'resolved' as const,
      // These dimensions are not explicitly exposed by the upstream Product
      // contract. Unknown is intentional and fail-closed.
      coverageState: 'unknown' as const,
      freshnessState: 'unknown' as const,
      conflictState: 'unknown' as const,
      revisionState: 'unknown' as const,
      volatilityState: 'unknown' as const,
      // The frozen methodology explicitly requires replicated historical
      // cycle evidence and at least one defined prior window.
      historyState: 'sufficient' as const,
      evidenceRefs,
    }),
    unresolvedDimensions: Object.freeze([
      'confidence',
      'coverage',
      'freshness',
      'conflict',
      'revision',
      'volatility',
    ] as const),
  });
}
