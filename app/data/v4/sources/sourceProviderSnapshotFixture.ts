import { runSourceProviderPreviewImport } from './sourceProviderImportPipeline';
import { getSourceVariableSignalCandidates } from './sourceSignalCandidateMapper';
import type {
  FandexNormalizedSourceItem,
  FandexSourceVariableSignalCandidate,
} from './sourceIngestionTypes';
import type {
  FandexSourceProviderSnapshot,
  FandexSourceProviderSnapshotHistorySummary,
  FandexSourceProviderSnapshotStatus,
} from './sourceProviderSnapshotTypes';

const currentSnapshotId = 'snapshot-preview-current';
const previousSnapshotId = 'snapshot-preview-previous';

const currentSnapshotCreatedAt = '2026-07-08T00:05:00.000Z';
const previousSnapshotCreatedAt = '2026-07-07T00:05:00.000Z';
const previousSnapshotCollectedAt = '2026-07-07T00:00:00.000Z';

const previousSnapshotRemovedSourceIds = new Set([
  'fixture-risk-newjeans-contract-noise-2026-07-05',
  'fixture-music-bts-streaming-2026-07-05',
]);

function getUniqueValues(values: string[]) {
  return Array.from(new Set(values)).sort();
}

function createSnapshotFromItems({
  snapshotId,
  status,
  createdAt,
  collectedAt,
  sourceItems,
  candidates,
  warnings,
  note,
}: {
  snapshotId: string;
  status: FandexSourceProviderSnapshotStatus;
  createdAt: string;
  collectedAt: string;
  sourceItems: FandexNormalizedSourceItem[];
  candidates: FandexSourceVariableSignalCandidate[];
  warnings: string[];
  note: string;
}): FandexSourceProviderSnapshot {
  return {
    snapshotId,
    status,
    createdAt,
    collectedAt,
    providerCount: getUniqueValues(sourceItems.map((item) => item.provider)).length,
    sourceItemCount: sourceItems.length,
    candidateCount: candidates.length,
    artistCount: getUniqueValues(sourceItems.flatMap((item) => item.artistIds)).length,
    variableCount: getUniqueValues(
      candidates.map((candidate) => candidate.variableKey),
    ).length,
    sourceItems,
    candidates,
    warnings,
    note,
    previewOnly: true,
  };
}

export function createSourceProviderSnapshotFromPreviewImport({
  snapshotId = currentSnapshotId,
  status = 'preview',
  createdAt = currentSnapshotCreatedAt,
  note = 'Preview import snapshot fixture. No file storage, DB, Supabase, crawling, or FANDEX scoring connection.',
}: {
  snapshotId?: string;
  status?: FandexSourceProviderSnapshotStatus;
  createdAt?: string;
  note?: string;
} = {}): FandexSourceProviderSnapshot {
  const previewImport = runSourceProviderPreviewImport();

  return createSnapshotFromItems({
    snapshotId,
    status,
    createdAt,
    collectedAt: previewImport.collectedAt,
    sourceItems: previewImport.sourceItems,
    candidates: previewImport.candidates,
    warnings: previewImport.warnings,
    note,
  });
}

export function getCurrentSourceProviderSnapshotFixture() {
  return createSourceProviderSnapshotFromPreviewImport();
}

export function getPreviousSourceProviderSnapshotFixture() {
  const currentSnapshot = getCurrentSourceProviderSnapshotFixture();
  const sourceItems = currentSnapshot.sourceItems.filter(
    (item) => !previousSnapshotRemovedSourceIds.has(item.sourceId),
  );
  const candidates = getSourceVariableSignalCandidates(sourceItems);

  return createSnapshotFromItems({
    snapshotId: previousSnapshotId,
    status: 'fixture',
    createdAt: previousSnapshotCreatedAt,
    collectedAt: previousSnapshotCollectedAt,
    sourceItems,
    candidates,
    warnings: currentSnapshot.warnings,
    note: 'Previous snapshot fixture derived from current preview import with a small source subset removed. No persistence or external provider connection.',
  });
}

export function getSourceProviderSnapshotFixtures() {
  return [
    getPreviousSourceProviderSnapshotFixture(),
    getCurrentSourceProviderSnapshotFixture(),
  ];
}

export function getSourceProviderSnapshotHistorySummary(
  snapshots: FandexSourceProviderSnapshot[] = getSourceProviderSnapshotFixtures(),
): FandexSourceProviderSnapshotHistorySummary {
  const sortedSnapshots = [...snapshots].sort((first, second) =>
    first.collectedAt.localeCompare(second.collectedAt),
  );
  const allSourceItems = snapshots.flatMap((snapshot) => snapshot.sourceItems);
  const allCandidates = snapshots.flatMap((snapshot) => snapshot.candidates);
  const uniqueArtistIds = getUniqueValues(
    allSourceItems.flatMap((item) => item.artistIds),
  );
  const uniqueVariableKeys = getUniqueValues(
    allCandidates.map((candidate) => candidate.variableKey),
  );

  return {
    snapshotCount: snapshots.length,
    latestSnapshotId: sortedSnapshots.at(-1)?.snapshotId ?? null,
    earliestSnapshotId: sortedSnapshots[0]?.snapshotId ?? null,
    latestCollectedAt: sortedSnapshots.at(-1)?.collectedAt ?? null,
    totalSourceItemCount: snapshots.reduce(
      (sum, snapshot) => sum + snapshot.sourceItemCount,
      0,
    ),
    totalCandidateCount: snapshots.reduce(
      (sum, snapshot) => sum + snapshot.candidateCount,
      0,
    ),
    uniqueArtistCount: uniqueArtistIds.length,
    uniqueVariableCount: uniqueVariableKeys.length,
    warningCount: snapshots.reduce(
      (sum, snapshot) => sum + snapshot.warnings.length,
      0,
    ),
    summaryLabel: 'source provider snapshot history preview',
    summaryNote:
      'Fixture-only snapshot history summary. Results are not persisted and are not connected to FANDEX scoring.',
    previewOnly: true,
  };
}
