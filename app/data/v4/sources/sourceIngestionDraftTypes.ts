import type {
  FandexSourceProvider,
  FandexSourceVariableSignalKey,
} from './sourceIngestionTypes';
import type {
  FandexSourceSignalReviewActionMode,
  FandexSourceSignalReviewActionRiskLevel,
} from './sourceSignalReviewActionTypes';

export type FandexSourceIngestionDraftStatus =
  | 'ready'
  | 'review'
  | 'limited'
  | 'blocked'
  | 'skipped';

export type FandexSourceIngestionDraftProviderMode =
  | 'fixture_provider'
  | 'mock_provider'
  | 'manual_import'
  | 'future_external_provider';

export type FandexSourceIngestionDraftReasonCode =
  | 'provider_fixture_ready'
  | 'adapter_preview_available'
  | 'review_action_available'
  | 'manual_review_required'
  | 'limited_source'
  | 'blocked_source'
  | 'missing_provider'
  | 'missing_candidate'
  | 'warning_present'
  | 'future_ingestion_only'
  | 'fixture_only'
  | 'preview_only';

export type FandexSourceIngestionDraft = {
  draftKey: string;
  provider: FandexSourceProvider;
  providerMode: FandexSourceIngestionDraftProviderMode;
  sourceId: string;
  candidateKey: string;
  artistId: string;
  variableKey: FandexSourceVariableSignalKey;
  reviewKey: string;
  actionKey: string;
  draftStatus: FandexSourceIngestionDraftStatus;
  actionMode: FandexSourceSignalReviewActionMode;
  riskLevel: FandexSourceSignalReviewActionRiskLevel;
  previewSignalWeight: number;
  reasonCodes: FandexSourceIngestionDraftReasonCode[];
  warnings: string[];
  requiresManualReview: boolean;
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceIngestionDraftGroup = {
  groupKey: string;
  provider: FandexSourceProvider;
  providerMode: FandexSourceIngestionDraftProviderMode;
  draftCount: number;
  readyCount: number;
  reviewCount: number;
  limitedCount: number;
  blockedCount: number;
  skippedCount: number;
  warningCount: number;
  manualReviewCount: number;
  topDraftKeys: string[];
  blockedDraftKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceIngestionDraftSummary = {
  draftCount: number;
  groupCount: number;
  providerCount: number;
  readyCount: number;
  reviewCount: number;
  limitedCount: number;
  blockedCount: number;
  skippedCount: number;
  warningCount: number;
  manualReviewCount: number;
  readyDraftKeys: string[];
  reviewDraftKeys: string[];
  blockedDraftKeys: string[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};
