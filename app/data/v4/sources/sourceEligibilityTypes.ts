import type {
  FandexSourceProvider,
  FandexSourceVariableSignalKey,
} from './sourceIngestionTypes';
import type { FandexSourceQualityGrade } from './sourceQualityScoringTypes';

export type FandexSourceEligibilityStatus =
  | 'eligible'
  | 'review'
  | 'limited'
  | 'blocked';

export type FandexSourceEligibilityReasonCode =
  | 'high_quality'
  | 'sufficient_confidence'
  | 'fresh_source'
  | 'trusted_provider'
  | 'low_quality'
  | 'low_confidence'
  | 'stale_source'
  | 'warning_present'
  | 'blocked_grade'
  | 'missing_source'
  | 'duplicate_candidate'
  | 'fixture_only';

export type FandexSourceEligibilityDecision = {
  sourceId: string;
  provider: FandexSourceProvider;
  qualityScore: number;
  qualityGrade: FandexSourceQualityGrade;
  eligibilityStatus: FandexSourceEligibilityStatus;
  reasonCodes: FandexSourceEligibilityReasonCode[];
  warnings: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexCandidateEligibilityDecision = {
  candidateKey: string;
  sourceId: string;
  artistId: string;
  variableKey: FandexSourceVariableSignalKey;
  candidateScore: number;
  confidenceScore: number;
  sourceQualityScore: number;
  blendedQualityScore: number;
  qualityGrade: FandexSourceQualityGrade;
  eligibilityStatus: FandexSourceEligibilityStatus;
  reasonCodes: FandexSourceEligibilityReasonCode[];
  warnings: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceEligibilitySummary = {
  sourceDecisionCount: number;
  candidateDecisionCount: number;
  eligibleSourceCount: number;
  reviewSourceCount: number;
  limitedSourceCount: number;
  blockedSourceCount: number;
  eligibleCandidateCount: number;
  reviewCandidateCount: number;
  limitedCandidateCount: number;
  blockedCandidateCount: number;
  warningCount: number;
  eligibleSourceIds: string[];
  blockedSourceIds: string[];
  eligibleCandidateKeys: string[];
  blockedCandidateKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};
