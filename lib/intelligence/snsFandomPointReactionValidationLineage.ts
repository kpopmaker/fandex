import {
  validateSnsFandomCollectionRunManifest,
  type SnsFandomCollectionRunManifest,
} from './snsFandomPointCollectionRunManifest';
import {
  isHistoricalSnapshotEligible,
  type SnsFandomHistoricalSnapshotManifest,
} from './snsFandomPointHistoricalSnapshotManifest';
import {
  evaluateSnsFandomObservationRevision,
  type SnsFandomObservationRevisionEvent,
} from './snsFandomPointObservationRevisionContract';
import {
  isEligibleYoutubeRawCollectionRecord,
  type SnsFandomYoutubeRawCollectionRecord,
} from './snsFandomPointYoutubeRawCollectionSchema';

export const SNS_FANDOM_REACTION_VALIDATION_LINEAGE_VERSION =
  'sns-fandom-reaction-validation-lineage-v1' as const;

export type SnsFandomReactionValidationLineageEntry = Readonly<{
  canonicalArtistId: string;
  observationId: string;
  collectionRun: SnsFandomCollectionRunManifest;
  rawRecord: SnsFandomYoutubeRawCollectionRecord;
  historicalSnapshot: SnsFandomHistoricalSnapshotManifest;
  revisionEvent: SnsFandomObservationRevisionEvent;
}>;

export type SnsFandomReactionValidationLineageMember = Readonly<{
  canonicalArtistId: string;
  observationId: string;
  providerResourceId: string;
  artistIdentityRef: string;
  providerId: 'youtube-data-api';
  observedAt: string;
  collectedAt: string;
  rawMetrics: Readonly<{
    viewCount: string | null;
    likeCount: string | null;
    commentCount: string | null;
  }>;
  collectionRunId: string;
  snapshotId: string;
  revisionId: string;
  evidenceRefs: readonly string[];
}>;

export type SnsFandomReactionValidationLineageResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_REACTION_VALIDATION_LINEAGE_VERSION;
  state: 'lineage-ready' | 'lineage-blocked';
  members: readonly SnsFandomReactionValidationLineageMember[];
  distinctObservationCount: number;
  distinctCollectionRunCount: number;
  distinctSnapshotCount: number;
  distinctRevisionCount: number;
  methodologyValidationEligible: boolean;
  blockers: readonly string[];
}>;

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

function intersection(
  left: readonly string[],
  right: readonly string[],
): string[] {
  const rightSet = new Set(right);
  return unique(left.filter((value) => rightSet.has(value)));
}

function sameWindow(
  raw: SnsFandomYoutubeRawCollectionRecord,
  snapshot: SnsFandomHistoricalSnapshotManifest,
): boolean {
  return (
    raw.observationWindow.startAt === snapshot.observationWindow.start
    && raw.observationWindow.endAt === snapshot.observationWindow.end
  );
}

export function buildSnsFandomReactionValidationLineage(
  entries: readonly SnsFandomReactionValidationLineageEntry[],
): SnsFandomReactionValidationLineageResult {
  const blockers: string[] = [];
  const members: SnsFandomReactionValidationLineageMember[] = [];

  if (entries.length === 0) {
    blockers.push('reaction-validation-lineage-empty');
  }

  const observationIds = entries.map((entry) => entry.observationId);
  if (unique(observationIds).length !== observationIds.length) {
    blockers.push('reaction-validation-lineage-observation-duplicate');
  }

  const collectionRunEntryCounts = new Map<string, number>();
  for (const entry of entries) {
    collectionRunEntryCounts.set(
      entry.collectionRun.runId,
      (collectionRunEntryCounts.get(entry.collectionRun.runId) ?? 0) + 1,
    );
  }

  for (const entry of entries) {
    const {
      collectionRun,
      rawRecord,
      historicalSnapshot,
      revisionEvent,
    } = entry;
    const entryBlockers: string[] = [];

    const runValidation =
      validateSnsFandomCollectionRunManifest(collectionRun);
    if (!runValidation.valid) {
      entryBlockers.push('reaction-validation-lineage-run-invalid');
    }
    if (
      collectionRun.collectionState !== 'completed'
      || collectionRun.rightsState !== 'authorized'
    ) {
      entryBlockers.push('reaction-validation-lineage-run-not-completed');
    }
    if (
      collectionRun.providerId !== 'youtube-data-api'
      || rawRecord.provider !== 'youtube-data-api'
      || historicalSnapshot.providerId !== 'youtube-data-api'
      || revisionEvent.providerId !== 'youtube-data-api'
    ) {
      entryBlockers.push('reaction-validation-lineage-provider-mismatch');
    }

    const expectedRunEntries =
      collectionRunEntryCounts.get(collectionRun.runId) ?? 0;
    if (collectionRun.observationCount < expectedRunEntries) {
      entryBlockers.push(
        'reaction-validation-lineage-run-observation-count-insufficient',
      );
    }

    if (!isEligibleYoutubeRawCollectionRecord(rawRecord)) {
      entryBlockers.push('reaction-validation-lineage-raw-record-ineligible');
    }
    if (!isHistoricalSnapshotEligible(historicalSnapshot)) {
      entryBlockers.push(
        'reaction-validation-lineage-historical-snapshot-ineligible',
      );
    }
    const revisionDecision =
      evaluateSnsFandomObservationRevision(revisionEvent);
    if (
      !revisionDecision.accepted
      || !revisionDecision.usableForMethodologyValidation
    ) {
      entryBlockers.push('reaction-validation-lineage-revision-ineligible');
    }

    if (
      entry.canonicalArtistId.trim().length === 0
      || rawRecord.artistIdentityRef.trim().length === 0
      || historicalSnapshot.artistIdentityRef
        !== rawRecord.artistIdentityRef
    ) {
      entryBlockers.push(
        'reaction-validation-lineage-artist-identity-mismatch',
      );
    }

    if (revisionEvent.observationId !== entry.observationId) {
      entryBlockers.push(
        'reaction-validation-lineage-observation-id-mismatch',
      );
    }
    if (
      revisionEvent.observedAt !== rawRecord.observedAt
      || revisionEvent.collectedAt !== rawRecord.collectedAt
    ) {
      entryBlockers.push('reaction-validation-lineage-time-mismatch');
    }
    if (
      historicalSnapshot.collectionTimestamp !== rawRecord.collectedAt
      || historicalSnapshot.observationTimestampSource
        !== 'provider-observation-time'
      || !sameWindow(rawRecord, historicalSnapshot)
    ) {
      entryBlockers.push('reaction-validation-lineage-snapshot-time-mismatch');
    }

    const runToRaw = intersection(
      collectionRun.evidenceRefs,
      rawRecord.evidenceRefs,
    );
    const rawToSnapshot = intersection(
      rawRecord.evidenceRefs,
      historicalSnapshot.lineage.evidenceRefs,
    );
    const snapshotToRevision = intersection(
      historicalSnapshot.lineage.evidenceRefs,
      revisionEvent.evidenceRefs,
    );

    if (runToRaw.length === 0) {
      entryBlockers.push(
        'reaction-validation-lineage-run-raw-evidence-disconnected',
      );
    }
    if (rawToSnapshot.length === 0) {
      entryBlockers.push(
        'reaction-validation-lineage-raw-snapshot-evidence-disconnected',
      );
    }
    if (snapshotToRevision.length === 0) {
      entryBlockers.push(
        'reaction-validation-lineage-snapshot-revision-evidence-disconnected',
      );
    }

    if (entryBlockers.length > 0) {
      blockers.push(...entryBlockers);
      continue;
    }

    members.push(Object.freeze({
      canonicalArtistId: entry.canonicalArtistId,
      observationId: entry.observationId,
      providerResourceId: rawRecord.providerResourceId,
      artistIdentityRef: rawRecord.artistIdentityRef,
      providerId: 'youtube-data-api' as const,
      observedAt: rawRecord.observedAt,
      collectedAt: rawRecord.collectedAt,
      rawMetrics: Object.freeze({ ...rawRecord.metrics }),
      collectionRunId: collectionRun.runId,
      snapshotId: historicalSnapshot.snapshotId,
      revisionId: revisionEvent.revisionId,
      evidenceRefs: Object.freeze(unique([
        ...collectionRun.evidenceRefs,
        ...rawRecord.evidenceRefs,
        ...historicalSnapshot.lineage.evidenceRefs,
        ...revisionEvent.evidenceRefs,
      ])),
    }));
  }

  const distinctObservationCount =
    unique(members.map((member) => member.observationId)).length;
  const distinctCollectionRunCount =
    unique(members.map((member) => member.collectionRunId)).length;
  const distinctSnapshotCount =
    unique(members.map((member) => member.snapshotId)).length;
  const distinctRevisionCount =
    unique(members.map((member) => member.revisionId)).length;

  if (members.length !== entries.length) {
    blockers.push('reaction-validation-lineage-member-construction-incomplete');
  }

  const dedupedBlockers = unique(blockers);
  const ready = dedupedBlockers.length === 0;

  return Object.freeze({
    contractVersion: SNS_FANDOM_REACTION_VALIDATION_LINEAGE_VERSION,
    state: ready ? 'lineage-ready' as const : 'lineage-blocked' as const,
    members: Object.freeze(members),
    distinctObservationCount,
    distinctCollectionRunCount,
    distinctSnapshotCount,
    distinctRevisionCount,
    methodologyValidationEligible: ready,
    blockers: Object.freeze(dedupedBlockers),
  });
}
