import type { FandexSourceVariableSignalKey } from './sourceIngestionTypes';
import type { FandexSourceSignalApplicationMode } from './sourceSignalApplicationTypes';

export type FandexSourceSignalImpactLevel =
  | 'strong'
  | 'moderate'
  | 'weak'
  | 'blocked'
  | 'skipped';

export type FandexSourceSignalImpactDirection =
  | 'positive'
  | 'negative'
  | 'mixed'
  | 'neutral';

export type FandexSourceSignalImpactReasonCode =
  | 'ready_application'
  | 'review_application'
  | 'limited_application'
  | 'blocked_application'
  | 'high_blended_quality'
  | 'low_confidence'
  | 'warning_present'
  | 'preview_weight_only'
  | 'no_score_delta'
  | 'fixture_only'
  | 'preview_only';

export type FandexSourceSignalImpactPreview = {
  impactKey: string;
  applicationKey: string;
  candidateKey: string;
  sourceId: string;
  artistId: string;
  variableKey: FandexSourceVariableSignalKey;
  applicationMode: FandexSourceSignalApplicationMode;
  impactLevel: FandexSourceSignalImpactLevel;
  impactDirection: FandexSourceSignalImpactDirection;
  candidateScore: number;
  confidenceScore: number;
  sourceQualityScore: number;
  blendedQualityScore: number;
  previewSignalWeight: number;
  reasonCodes: FandexSourceSignalImpactReasonCode[];
  warnings: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceSignalImpactGroup = {
  groupKey: string;
  artistId: string;
  variableKey: FandexSourceVariableSignalKey;
  impactCount: number;
  strongCount: number;
  moderateCount: number;
  weakCount: number;
  blockedCount: number;
  skippedCount: number;
  averagePreviewSignalWeight: number;
  topImpactKeys: string[];
  blockedImpactKeys: string[];
  warningCount: number;
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceSignalImpactSummary = {
  impactCount: number;
  groupCount: number;
  strongImpactCount: number;
  moderateImpactCount: number;
  weakImpactCount: number;
  blockedImpactCount: number;
  skippedImpactCount: number;
  artistCount: number;
  variableCount: number;
  warningCount: number;
  topImpactKeys: string[];
  blockedImpactKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};
