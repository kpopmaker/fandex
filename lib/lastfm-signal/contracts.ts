export const LASTFM_REAL_SIGNAL_READ_MODEL_VERSION =
  'v131_lastfm_real_signal_read_model_v1' as const;

export const LASTFM_CLOUD_HISTORY_VERSION = 'lastfm_cloud_history_v1' as const;
export const LASTFM_CLOUD_SCORE_USAGE = 'preview_only_not_master_score' as const;

export type LastfmCloudStatus = Readonly<{
  version: typeof LASTFM_CLOUD_HISTORY_VERSION;
  createdAt: string;
  snapshotDate: string;
  snapshotAppended: boolean;
  historyRowCount: number;
  snapshotDateCount: number;
  deltaReadyCount: number;
  needsReviewCount: number;
  scorePreviewCount: number;
  scoreUsage: typeof LASTFM_CLOUD_SCORE_USAGE;
  masterModified: false;
  websiteModified: false;
}>;

export type LastfmHistoryRow = Readonly<{
  snapshotDate: string;
  artist: string;
  query: string;
  lastfmName: string;
  listeners: number;
  playcount: number;
  collectedAt: string;
  status: 'ok';
}>;

export type LastfmDeltaRow = Readonly<{
  artist: string;
  previousDate: string | null;
  latestDate: string | null;
  daysBetween: number | null;
  listenerDelta: number | null;
  playcountDelta: number | null;
  listenerDeltaPerDay: number | null;
  playcountDeltaPerDay: number | null;
  status: 'delta_ready' | 'needs_review' | 'insufficient_history';
}>;

export type LastfmPreviewScoreRow = Readonly<{
  rank: number;
  artist: string;
  previousDate: string;
  latestDate: string;
  daysBetween: number;
  listenerDeltaPerDay: number;
  playcountDeltaPerDay: number;
  listenerLogNormalized: number;
  playcountLogNormalized: number;
  lastfmGlobalInterestPreviewPoint: number;
  status: 'preview_ready';
}>;

export type LastfmRealSignal = Readonly<{
  artistLabel: string;
  query: string;
  resolvedLastfmName: string;
  previousDate: string;
  latestDate: string;
  collectedAt: string;
  listeners: number;
  playcount: number;
  listenerDelta: number;
  playcountDelta: number;
  listenerDeltaPerDay: number;
  playcountDeltaPerDay: number;
  listenerLogNormalized: number;
  playcountLogNormalized: number;
  previewPoint: number;
  sourceRank: number;
  sourceStatus: 'preview_ready';
}>;

export type LastfmReadinessState = 'ready' | 'blocked';

export type LastfmRealSignalReadModel = Readonly<{
  contractVersion: typeof LASTFM_REAL_SIGNAL_READ_MODEL_VERSION;
  sourceVersion: typeof LASTFM_CLOUD_HISTORY_VERSION;
  sourceUsage: typeof LASTFM_CLOUD_SCORE_USAGE;
  sourceCreatedAt: string;
  snapshotDate: string;
  readiness: Readonly<{
    state: LastfmReadinessState;
    reasons: readonly string[];
    signalCount: number;
    deltaReadyCount: number;
    needsReviewCount: number;
  }>;
  signals: readonly LastfmRealSignal[];
  digest: string;
  effects: Readonly<{
    externalCalls: 0;
    databaseReads: 0;
    databaseWrites: 0;
    masterScoreWrites: 0;
    websiteWrites: 0;
  }>;
}>;

export type LastfmRealSignalSourceBundle = Readonly<{
  historyCsv: string;
  deltaCsv: string;
  scoreCsv: string;
  statusJson: string;
}>;
