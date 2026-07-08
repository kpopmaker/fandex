import type {
  FandexNormalizedSourceItem,
  FandexSourceVariableSignalCandidate,
  FandexSourceVariableSignalKey,
} from './sourceIngestionTypes';

export type FandexSourceProviderSnapshotStatus =
  | 'preview'
  | 'fixture'
  | 'archived'
  | 'invalid';

export type FandexSourceProviderSnapshot = {
  snapshotId: string;
  status: FandexSourceProviderSnapshotStatus;
  createdAt: string;
  collectedAt: string;
  providerCount: number;
  sourceItemCount: number;
  candidateCount: number;
  artistCount: number;
  variableCount: number;
  sourceItems: FandexNormalizedSourceItem[];
  candidates: FandexSourceVariableSignalCandidate[];
  warnings: string[];
  note: string;
  previewOnly: true;
};

export type FandexSourceProviderSnapshotDiff = {
  fromSnapshotId: string;
  toSnapshotId: string;
  addedSourceIds: string[];
  removedSourceIds: string[];
  retainedSourceIds: string[];
  addedCandidateIds: string[];
  removedCandidateIds: string[];
  retainedCandidateIds: string[];
  sourceItemCountDelta: number;
  candidateCountDelta: number;
  artistCountDelta: number;
  variableCountDelta: number;
  changedArtistIds: string[];
  changedVariableKeys: FandexSourceVariableSignalKey[];
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};

export type FandexSourceProviderSnapshotHistorySummary = {
  snapshotCount: number;
  latestSnapshotId: string | null;
  earliestSnapshotId: string | null;
  latestCollectedAt: string | null;
  totalSourceItemCount: number;
  totalCandidateCount: number;
  uniqueArtistCount: number;
  uniqueVariableCount: number;
  warningCount: number;
  summaryLabel: string;
  summaryNote: string;
  previewOnly: true;
};
