import type { FandexSourceVariableSignalCandidate } from './sourceIngestionTypes';
import {
  getCurrentSourceProviderSnapshotFixture,
  getPreviousSourceProviderSnapshotFixture,
  getSourceProviderSnapshotFixtures,
} from './sourceProviderSnapshotFixture';
import type {
  FandexSourceProviderSnapshot,
  FandexSourceProviderSnapshotDiff,
} from './sourceProviderSnapshotTypes';

export type FandexSourceProviderSnapshotShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'duplicate-snapshot-id'
    | 'missing-source-items'
    | 'missing-candidates'
    | 'invalid-source-item-count'
    | 'invalid-candidate-count'
    | 'missing-created-at'
    | 'missing-collected-at';
  message: string;
  snapshotId?: string;
};

export type FandexSourceProviderSnapshotShapeCheckResult = {
  isValid: boolean;
  snapshotCount: number;
  issues: FandexSourceProviderSnapshotShapeCheckIssue[];
};

export type FandexSourceProviderSnapshotDiffShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'duplicate-added-source-id'
    | 'duplicate-removed-source-id'
    | 'duplicate-retained-source-id'
    | 'invalid-delta'
    | 'duplicate-changed-artist-id'
    | 'duplicate-changed-variable-key';
  message: string;
};

export type FandexSourceProviderSnapshotDiffShapeCheckResult = {
  isValid: boolean;
  addedSourceIdCount: number;
  removedSourceIdCount: number;
  retainedSourceIdCount: number;
  issues: FandexSourceProviderSnapshotDiffShapeCheckIssue[];
};

function getUniqueValues<T extends string>(values: T[]) {
  return Array.from(new Set(values)).sort();
}

function getCandidateKey(candidate: FandexSourceVariableSignalCandidate) {
  return `${candidate.sourceId}::${candidate.artistId}::${candidate.variableKey}`;
}

function getSetDiff<T extends string>(left: Set<T>, right: Set<T>) {
  return Array.from(left).filter((value) => !right.has(value)).sort();
}

function getSetIntersection<T extends string>(left: Set<T>, right: Set<T>) {
  return Array.from(left).filter((value) => right.has(value)).sort();
}

function hasDuplicateValues(values: string[]) {
  return new Set(values).size !== values.length;
}

function getChangedArtistIds(diff: {
  addedCandidateIds: string[];
  removedCandidateIds: string[];
  previous: FandexSourceProviderSnapshot;
  current: FandexSourceProviderSnapshot;
}) {
  const changedCandidateIds = new Set([
    ...diff.addedCandidateIds,
    ...diff.removedCandidateIds,
  ]);
  const candidates = [
    ...diff.previous.candidates,
    ...diff.current.candidates,
  ].filter((candidate) => changedCandidateIds.has(getCandidateKey(candidate)));

  return getUniqueValues(candidates.map((candidate) => candidate.artistId));
}

function getChangedVariableKeys(diff: {
  addedCandidateIds: string[];
  removedCandidateIds: string[];
  previous: FandexSourceProviderSnapshot;
  current: FandexSourceProviderSnapshot;
}) {
  const changedCandidateIds = new Set([
    ...diff.addedCandidateIds,
    ...diff.removedCandidateIds,
  ]);
  const candidates = [
    ...diff.previous.candidates,
    ...diff.current.candidates,
  ].filter((candidate) => changedCandidateIds.has(getCandidateKey(candidate)));

  return getUniqueValues(candidates.map((candidate) => candidate.variableKey));
}

export function diffSourceProviderSnapshots(
  previous: FandexSourceProviderSnapshot,
  current: FandexSourceProviderSnapshot,
): FandexSourceProviderSnapshotDiff {
  const previousSourceIds = new Set(
    previous.sourceItems.map((item) => item.sourceId),
  );
  const currentSourceIds = new Set(current.sourceItems.map((item) => item.sourceId));
  const previousCandidateIds = new Set(previous.candidates.map(getCandidateKey));
  const currentCandidateIds = new Set(current.candidates.map(getCandidateKey));
  const addedSourceIds = getSetDiff(currentSourceIds, previousSourceIds);
  const removedSourceIds = getSetDiff(previousSourceIds, currentSourceIds);
  const retainedSourceIds = getSetIntersection(previousSourceIds, currentSourceIds);
  const addedCandidateIds = getSetDiff(currentCandidateIds, previousCandidateIds);
  const removedCandidateIds = getSetDiff(previousCandidateIds, currentCandidateIds);
  const retainedCandidateIds = getSetIntersection(
    previousCandidateIds,
    currentCandidateIds,
  );
  const changedArtistIds = getChangedArtistIds({
    addedCandidateIds,
    removedCandidateIds,
    previous,
    current,
  });
  const changedVariableKeys = getChangedVariableKeys({
    addedCandidateIds,
    removedCandidateIds,
    previous,
    current,
  });

  return {
    fromSnapshotId: previous.snapshotId,
    toSnapshotId: current.snapshotId,
    addedSourceIds,
    removedSourceIds,
    retainedSourceIds,
    addedCandidateIds,
    removedCandidateIds,
    retainedCandidateIds,
    sourceItemCountDelta: current.sourceItemCount - previous.sourceItemCount,
    candidateCountDelta: current.candidateCount - previous.candidateCount,
    artistCountDelta: current.artistCount - previous.artistCount,
    variableCountDelta: current.variableCount - previous.variableCount,
    changedArtistIds,
    changedVariableKeys,
    summaryLabel: `${previous.snapshotId} -> ${current.snapshotId}`,
    summaryNote:
      'Read-only snapshot diff preview. Not persisted and not connected to FANDEX scoring.',
    previewOnly: true,
  };
}

export function getSourceProviderSnapshotDiffPreview() {
  return diffSourceProviderSnapshots(
    getPreviousSourceProviderSnapshotFixture(),
    getCurrentSourceProviderSnapshotFixture(),
  );
}

export function runSourceProviderSnapshotShapeCheck(
  snapshots: FandexSourceProviderSnapshot[] = getSourceProviderSnapshotFixtures(),
): FandexSourceProviderSnapshotShapeCheckResult {
  const issues: FandexSourceProviderSnapshotShapeCheckIssue[] = [];
  const snapshotIdCounts = new Map<string, number>();

  snapshots.forEach((snapshot) => {
    snapshotIdCounts.set(
      snapshot.snapshotId,
      (snapshotIdCounts.get(snapshot.snapshotId) ?? 0) + 1,
    );

    if (!Array.isArray(snapshot.sourceItems)) {
      issues.push({
        severity: 'error',
        code: 'missing-source-items',
        message: `snapshot sourceItems must be an array: ${snapshot.snapshotId}`,
        snapshotId: snapshot.snapshotId,
      });
    }

    if (!Array.isArray(snapshot.candidates)) {
      issues.push({
        severity: 'error',
        code: 'missing-candidates',
        message: `snapshot candidates must be an array: ${snapshot.snapshotId}`,
        snapshotId: snapshot.snapshotId,
      });
    }

    if (snapshot.sourceItemCount !== snapshot.sourceItems.length) {
      issues.push({
        severity: 'error',
        code: 'invalid-source-item-count',
        message: `sourceItemCount mismatch: ${snapshot.snapshotId}`,
        snapshotId: snapshot.snapshotId,
      });
    }

    if (snapshot.candidateCount !== snapshot.candidates.length) {
      issues.push({
        severity: 'error',
        code: 'invalid-candidate-count',
        message: `candidateCount mismatch: ${snapshot.snapshotId}`,
        snapshotId: snapshot.snapshotId,
      });
    }

    if (snapshot.createdAt.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-created-at',
        message: `createdAt must not be empty: ${snapshot.snapshotId}`,
        snapshotId: snapshot.snapshotId,
      });
    }

    if (snapshot.collectedAt.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-collected-at',
        message: `collectedAt must not be empty: ${snapshot.snapshotId}`,
        snapshotId: snapshot.snapshotId,
      });
    }
  });

  snapshotIdCounts.forEach((count, snapshotId) => {
    if (count > 1) {
      issues.push({
        severity: 'error',
        code: 'duplicate-snapshot-id',
        message: `duplicate snapshotId: ${snapshotId}`,
        snapshotId,
      });
    }
  });

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    snapshotCount: snapshots.length,
    issues,
  };
}

export function runSourceProviderSnapshotDiffShapeCheck(
  diff: FandexSourceProviderSnapshotDiff = getSourceProviderSnapshotDiffPreview(),
): FandexSourceProviderSnapshotDiffShapeCheckResult {
  const issues: FandexSourceProviderSnapshotDiffShapeCheckIssue[] = [];

  if (hasDuplicateValues(diff.addedSourceIds)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-added-source-id',
      message: 'addedSourceIds must be unique.',
    });
  }

  if (hasDuplicateValues(diff.removedSourceIds)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-removed-source-id',
      message: 'removedSourceIds must be unique.',
    });
  }

  if (hasDuplicateValues(diff.retainedSourceIds)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-retained-source-id',
      message: 'retainedSourceIds must be unique.',
    });
  }

  [
    diff.sourceItemCountDelta,
    diff.candidateCountDelta,
    diff.artistCountDelta,
    diff.variableCountDelta,
  ].forEach((delta) => {
    if (!Number.isFinite(delta)) {
      issues.push({
        severity: 'error',
        code: 'invalid-delta',
        message: 'Snapshot diff delta values must be finite numbers.',
      });
    }
  });

  if (hasDuplicateValues(diff.changedArtistIds)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-changed-artist-id',
      message: 'changedArtistIds must be unique.',
    });
  }

  if (hasDuplicateValues(diff.changedVariableKeys)) {
    issues.push({
      severity: 'error',
      code: 'duplicate-changed-variable-key',
      message: 'changedVariableKeys must be unique.',
    });
  }

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    addedSourceIdCount: diff.addedSourceIds.length,
    removedSourceIdCount: diff.removedSourceIds.length,
    retainedSourceIdCount: diff.retainedSourceIds.length,
    issues,
  };
}
