import 'server-only';

import {
  projectNewsIssuePointForRiskAdjustment,
} from '../../intelligence/riskAdjustmentNewsIssuePointProjection';
import {
  projectActivityExposureForRiskAdjustment,
} from '../../intelligence/riskAdjustmentActivityExposureProjection';
import {
  createRiskAdjustmentProductContractCandidate,
  type RiskAdjustmentProductContractCandidate,
} from '../../intelligence/riskAdjustmentProductContractCandidate';
import {
  buildRiskAdjustmentCurrentReadinessReport,
  type RiskAdjustmentCurrentReadinessReport,
} from '../../intelligence/riskAdjustmentCurrentReadinessReport';
import {
  deriveRiskAdjustmentQualitySufficiencyWitness,
} from '../../intelligence/riskAdjustmentQualitySufficiencyWitness';
import type {
  ProductVariableReadModelResult,
} from '../../product/contracts/productVariable';
import type {
  ProductActivityExposurePublicRouteResult,
} from '../../product/contracts/productActivityExposurePublicRoute';

export const RISK_ADJUSTMENT_CURRENT_RUNTIME_READ_VERSION =
  'risk-adjustment-current-runtime-read-v1' as const;

export type RiskAdjustmentCurrentRuntimeReadResult =
  | Readonly<{
      status: 'ok';
      contractVersion:
        typeof RISK_ADJUSTMENT_CURRENT_RUNTIME_READ_VERSION;
      candidate: RiskAdjustmentProductContractCandidate;
      readiness: RiskAdjustmentCurrentReadinessReport;
    }>
  | Readonly<{
      status: 'data-issue';
      contractVersion:
        typeof RISK_ADJUSTMENT_CURRENT_RUNTIME_READ_VERSION;
      reason:
        | 'news-projection-blocked'
        | 'activity-projection-blocked';
      detail: string;
    }>;

export function deriveRiskAdjustmentCurrentRuntimeForIU(input: Readonly<{
  newsIssuePoint: ProductVariableReadModelResult;
  comebackActivityPoint: ProductActivityExposurePublicRouteResult;
}>): RiskAdjustmentCurrentRuntimeReadResult {
  const news = projectNewsIssuePointForRiskAdjustment(
    input.newsIssuePoint,
  );
  if (news.status !== 'ok') {
    return Object.freeze({
      status: 'data-issue' as const,
      contractVersion: RISK_ADJUSTMENT_CURRENT_RUNTIME_READ_VERSION,
      reason: 'news-projection-blocked' as const,
      detail: news.reason,
    });
  }

  const activity = projectActivityExposureForRiskAdjustment(
    input.comebackActivityPoint,
  );
  if (activity.status !== 'ok') {
    return Object.freeze({
      status: 'data-issue' as const,
      contractVersion: RISK_ADJUSTMENT_CURRENT_RUNTIME_READ_VERSION,
      reason: 'activity-projection-blocked' as const,
      detail: activity.reason,
    });
  }

  const inputs = Object.freeze([
    news.input,
    activity.input,
  ]);

  return Object.freeze({
    status: 'ok' as const,
    contractVersion: RISK_ADJUSTMENT_CURRENT_RUNTIME_READ_VERSION,
    candidate: createRiskAdjustmentProductContractCandidate({
      artistId: 'iu',
      inputs,
    }),
    readiness: buildRiskAdjustmentCurrentReadinessReport(
      deriveRiskAdjustmentQualitySufficiencyWitness(inputs),
    ),
  });
}
