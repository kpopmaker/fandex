import type { FandexSourceEligibilityStatus } from './sourceEligibilityTypes';
import type { FandexSourceVariableSignalKey } from './sourceIngestionTypes';

export type FandexSourceSignalApplicationMode =
  | 'ready'
  | 'review'
  | 'limited'
  | 'blocked'
  | 'skipped';

export type FandexSourceSignalApplicationReasonCode =
  | 'eligible_candidate'
  | 'review_required'
  | 'limited_candidate'
  | 'blocked_candidate'
  | 'low_confidence'
  | 'warning_present'
  | 'fixture_only'
  | 'no_candidate'
  | 'duplicate_variable_candidate'
  | 'preview_only';

export type FandexSourceSignalApplicationPlan = {
  applicationKey: string;
  candidateKey: string;
  sourceId: string;
  artistId: string;
  variableKey: FandexSourceVariableSignalKey;
  applicationMode: FandexSourceSignalApplicationMode;
  eligibilityStatus: FandexSourceEligibilityStatus;
  candidateScore: number;
  confidenceScore: number;
  sourceQualityScore: number;
  blendedQualityScore: number;
  reasonCodes: FandexSourceSignalApplicationReasonCode[];
  warnings: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceSignalApplicationGroup = {
  groupKey: string;
  artistId: string;
  variableKey: FandexSourceVariableSignalKey;
  planCount: number;
  readyCount: number;
  reviewCount: number;
  limitedCount: number;
  blockedCount: number;
  skippedCount: number;
  averageBlendedQualityScore: number;
  topCandidateKeys: string[];
  blockedCandidateKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceSignalApplicationSummary = {
  planCount: number;
  groupCount: number;
  readyPlanCount: number;
  reviewPlanCount: number;
  limitedPlanCount: number;
  blockedPlanCount: number;
  skippedPlanCount: number;
  artistCount: number;
  variableCount: number;
  warningCount: number;
  readyApplicationKeys: string[];
  reviewApplicationKeys: string[];
  blockedApplicationKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};
