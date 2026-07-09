import type { FandexSourceVariableSignalKey } from './sourceIngestionTypes';
import type {
  FandexSourceSignalImpactDirection,
  FandexSourceSignalImpactLevel,
} from './sourceSignalImpactTypes';
import type {
  FandexSourceSignalReviewPriority,
  FandexSourceSignalReviewQueueStatus,
} from './sourceSignalReviewQueueTypes';

export type FandexSourceSignalReviewActionMode =
  | 'approve_preview'
  | 'hold_review'
  | 'limit_preview'
  | 'reject_preview'
  | 'skip_preview';

export type FandexSourceSignalReviewActionRiskLevel =
  | 'low'
  | 'medium'
  | 'high'
  | 'blocked';

export type FandexSourceSignalReviewActionReasonCode =
  | 'ready_for_review'
  | 'needs_attention'
  | 'limited_review'
  | 'blocked_review'
  | 'skipped_review'
  | 'high_priority'
  | 'medium_priority'
  | 'low_priority'
  | 'positive_impact'
  | 'negative_impact'
  | 'warning_present'
  | 'low_preview_weight'
  | 'fixture_only'
  | 'preview_only';

export type FandexSourceSignalReviewActionPlan = {
  actionKey: string;
  reviewKey: string;
  impactKey: string;
  applicationKey: string;
  candidateKey: string;
  sourceId: string;
  artistId: string;
  variableKey: FandexSourceVariableSignalKey;
  actionMode: FandexSourceSignalReviewActionMode;
  riskLevel: FandexSourceSignalReviewActionRiskLevel;
  reviewStatus: FandexSourceSignalReviewQueueStatus;
  priority: FandexSourceSignalReviewPriority;
  impactLevel: FandexSourceSignalImpactLevel;
  impactDirection: FandexSourceSignalImpactDirection;
  previewSignalWeight: number;
  reasonCodes: FandexSourceSignalReviewActionReasonCode[];
  warnings: string[];
  requiresManualReview: boolean;
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceSignalReviewActionGroup = {
  groupKey: string;
  artistId: string;
  variableKey: FandexSourceVariableSignalKey;
  actionPlanCount: number;
  approvePreviewCount: number;
  holdReviewCount: number;
  limitPreviewCount: number;
  rejectPreviewCount: number;
  skipPreviewCount: number;
  highRiskCount: number;
  warningCount: number;
  topActionKeys: string[];
  blockedActionKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceSignalReviewActionSummary = {
  actionPlanCount: number;
  groupCount: number;
  approvePreviewCount: number;
  holdReviewCount: number;
  limitPreviewCount: number;
  rejectPreviewCount: number;
  skipPreviewCount: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  blockedRiskCount: number;
  warningCount: number;
  approveActionKeys: string[];
  holdActionKeys: string[];
  rejectActionKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};
