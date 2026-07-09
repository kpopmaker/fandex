import type { FandexSourceVariableSignalKey } from './sourceIngestionTypes';
import type {
  FandexSourceSignalImpactDirection,
  FandexSourceSignalImpactLevel,
} from './sourceSignalImpactTypes';

export type FandexSourceSignalReviewQueueStatus =
  | 'ready_for_review'
  | 'needs_attention'
  | 'limited_review'
  | 'blocked'
  | 'skipped';

export type FandexSourceSignalReviewPriority =
  | 'high'
  | 'medium'
  | 'low'
  | 'blocked';

export type FandexSourceSignalReviewReasonCode =
  | 'strong_impact_candidate'
  | 'moderate_impact_candidate'
  | 'weak_impact_candidate'
  | 'blocked_impact_candidate'
  | 'warning_present'
  | 'low_confidence'
  | 'high_preview_weight'
  | 'manual_review_required'
  | 'preview_only'
  | 'fixture_only'
  | 'no_score_delta';

export type FandexSourceSignalReviewQueueItem = {
  reviewKey: string;
  impactKey: string;
  applicationKey: string;
  candidateKey: string;
  sourceId: string;
  artistId: string;
  variableKey: FandexSourceVariableSignalKey;
  impactLevel: FandexSourceSignalImpactLevel;
  impactDirection: FandexSourceSignalImpactDirection;
  previewSignalWeight: number;
  reviewStatus: FandexSourceSignalReviewQueueStatus;
  priority: FandexSourceSignalReviewPriority;
  reasonCodes: FandexSourceSignalReviewReasonCode[];
  warnings: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceSignalReviewQueueGroup = {
  groupKey: string;
  artistId: string;
  variableKey: FandexSourceVariableSignalKey;
  reviewItemCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  blockedCount: number;
  warningCount: number;
  topReviewKeys: string[];
  blockedReviewKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceSignalReviewQueueSummary = {
  reviewItemCount: number;
  groupCount: number;
  readyForReviewCount: number;
  needsAttentionCount: number;
  limitedReviewCount: number;
  blockedCount: number;
  skippedCount: number;
  highPriorityCount: number;
  mediumPriorityCount: number;
  lowPriorityCount: number;
  warningCount: number;
  topReviewKeys: string[];
  blockedReviewKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};
