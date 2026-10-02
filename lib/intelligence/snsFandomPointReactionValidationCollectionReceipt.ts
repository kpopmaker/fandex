import {
  type SnsFandomReactionCollectionHandoffResult,
} from './snsFandomPointReactionValidationCollectionHandoff';

export const SNS_FANDOM_REACTION_COLLECTION_RECEIPT_VERSION =
  'sns-fandom-reaction-validation-collection-receipt-v1' as const;

export type SnsFandomReactionCollectionExecutionReceipt = Readonly<{
  taskId: string;
  datasetId: string;
  canonicalArtistId: string;
  videoId: string;
  metricId:
    | 'youtube.video.view-count'
    | 'youtube.video.like-count'
    | 'youtube.video.comment-count';
  providerId: 'youtube-data-api';
  providerClientRef: string;
  state: 'succeeded' | 'failed';
  observedAt: string | null;
  collectedAt: string | null;
  observationId: string | null;
  collectionRunId: string | null;
  evidenceRef: string | null;
  failureReason: string | null;
}>;

export type SnsFandomReactionCollectionReceiptMember = Readonly<{
  taskId: string;
  datasetId: string;
  canonicalArtistId: string;
  videoId: string;
  metricId:
    | 'youtube.video.view-count'
    | 'youtube.video.like-count'
    | 'youtube.video.comment-count';
  plannedCaptureAt: string;
  actualObservedAt: string;
  collectedAt: string;
  timingDeviationMilliseconds: number;
  timingState: 'exact-target-age' | 'deviated-from-target-age';
  observationId: string;
  collectionRunId: string;
  evidenceRef: string;
}>;

export type SnsFandomReactionCollectionReceiptResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_REACTION_COLLECTION_RECEIPT_VERSION;
  state:
    | 'blocked'
    | 'capture-complete-lineage-pending'
    | 'capture-complete-timing-review-required';
  planId: string;
  expectedTaskCount: number;
  receivedReceiptCount: number;
  completedMemberCount: number;
  exactTargetAgeCaptureCount: number;
  deviatedCaptureCount: number;
  members: readonly SnsFandomReactionCollectionReceiptMember[];
  targetAgeDatasetAssemblyEligible: boolean;
  lineageValidationStillRequired: true;
  revisionAuditStillRequired: true;
  timingToleranceApplied: false;
  interpolationApplied: false;
  extrapolationApplied: false;
  blockers: readonly string[];
}>;

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values));
}

export function evaluateSnsFandomReactionCollectionReceipts(
  input: Readonly<{
    handoff: SnsFandomReactionCollectionHandoffResult;
    receipts: readonly SnsFandomReactionCollectionExecutionReceipt[];
  }>,
): SnsFandomReactionCollectionReceiptResult {
  const blockers: string[] = [];
  const { handoff } = input;

  if (
    handoff.state !== 'production-ops-handoff-ready'
    || !handoff.productionOpsHandoffReady
  ) {
    blockers.push('reaction-collection-receipt-handoff-not-ready');
  }

  const expectedByTaskId = new Map(
    handoff.pendingTasks.map((task) => [task.taskId, task]),
  );
  const receiptByTaskId = new Map<
    string,
    SnsFandomReactionCollectionExecutionReceipt
  >();

  for (const receipt of input.receipts) {
    if (receiptByTaskId.has(receipt.taskId)) {
      blockers.push('reaction-collection-receipt-task-duplicate');
      continue;
    }
    receiptByTaskId.set(receipt.taskId, receipt);

    if (!expectedByTaskId.has(receipt.taskId)) {
      blockers.push('reaction-collection-receipt-unexpected-task');
    }
  }

  const members: SnsFandomReactionCollectionReceiptMember[] = [];

  for (const task of handoff.pendingTasks) {
    const receipt = receiptByTaskId.get(task.taskId);
    if (receipt === undefined) {
      blockers.push('reaction-collection-receipt-task-missing');
      continue;
    }

    if (receipt.state !== 'succeeded') {
      blockers.push('reaction-collection-receipt-task-failed');
      if (
        receipt.failureReason === null
        || receipt.failureReason.trim().length === 0
      ) {
        blockers.push(
          'reaction-collection-receipt-failure-reason-missing',
        );
      }
      continue;
    }

    if (
      receipt.datasetId !== task.datasetId
      || receipt.canonicalArtistId !== task.canonicalArtistId
      || receipt.videoId !== task.videoId
      || receipt.metricId !== task.metricId
      || receipt.providerId !== 'youtube-data-api'
      || receipt.providerClientRef !== task.providerClientRef
    ) {
      blockers.push('reaction-collection-receipt-task-binding-mismatch');
      continue;
    }

    if (
      receipt.observedAt === null
      || receipt.collectedAt === null
      || !validIso(receipt.observedAt)
      || !validIso(receipt.collectedAt)
    ) {
      blockers.push('reaction-collection-receipt-time-invalid');
      continue;
    }
    if (Date.parse(receipt.collectedAt) < Date.parse(receipt.observedAt)) {
      blockers.push(
        'reaction-collection-receipt-collection-before-observation',
      );
      continue;
    }

    if (
      receipt.observationId === null
      || receipt.observationId.trim().length === 0
      || receipt.collectionRunId === null
      || receipt.collectionRunId.trim().length === 0
      || receipt.evidenceRef === null
      || receipt.evidenceRef.trim().length === 0
    ) {
      blockers.push('reaction-collection-receipt-lineage-reference-missing');
      continue;
    }

    const timingDeviationMilliseconds =
      Date.parse(receipt.observedAt) - Date.parse(task.captureAt);
    if (!Number.isSafeInteger(timingDeviationMilliseconds)) {
      blockers.push('reaction-collection-receipt-timing-deviation-invalid');
      continue;
    }

    members.push(Object.freeze({
      taskId: task.taskId,
      datasetId: task.datasetId,
      canonicalArtistId: task.canonicalArtistId,
      videoId: task.videoId,
      metricId: task.metricId,
      plannedCaptureAt: task.captureAt,
      actualObservedAt: receipt.observedAt,
      collectedAt: receipt.collectedAt,
      timingDeviationMilliseconds,
      timingState: timingDeviationMilliseconds === 0
        ? 'exact-target-age' as const
        : 'deviated-from-target-age' as const,
      observationId: receipt.observationId,
      collectionRunId: receipt.collectionRunId,
      evidenceRef: receipt.evidenceRef,
    }));
  }

  if (input.receipts.length !== handoff.pendingTasks.length) {
    blockers.push('reaction-collection-receipt-count-mismatch');
  }

  const exactTargetAgeCaptureCount = members.filter(
    (member) => member.timingDeviationMilliseconds === 0,
  ).length;
  const deviatedCaptureCount = members.filter(
    (member) => member.timingDeviationMilliseconds !== 0,
  ).length;

  if (deviatedCaptureCount > 0) {
    blockers.push(
      'reaction-collection-receipt-target-age-timing-deviation-unapproved',
    );
  }

  if (members.length !== handoff.pendingTasks.length) {
    blockers.push('reaction-collection-receipt-member-construction-incomplete');
  }

  const hardBlockers = blockers.filter(
    (blocker) =>
      blocker !==
      'reaction-collection-receipt-target-age-timing-deviation-unapproved',
  );
  const dedupedBlockers = unique(blockers);

  const structurallyComplete =
    hardBlockers.length === 0
    && members.length === handoff.pendingTasks.length;

  const targetAgeDatasetAssemblyEligible =
    structurallyComplete
    && deviatedCaptureCount === 0;

  let state: SnsFandomReactionCollectionReceiptResult['state'];
  if (!structurallyComplete) {
    state = 'blocked';
  } else if (deviatedCaptureCount > 0) {
    state = 'capture-complete-timing-review-required';
  } else {
    state = 'capture-complete-lineage-pending';
  }

  return Object.freeze({
    contractVersion: SNS_FANDOM_REACTION_COLLECTION_RECEIPT_VERSION,
    state,
    planId: handoff.planId,
    expectedTaskCount: handoff.pendingTasks.length,
    receivedReceiptCount: input.receipts.length,
    completedMemberCount: members.length,
    exactTargetAgeCaptureCount,
    deviatedCaptureCount,
    members: Object.freeze(members),
    targetAgeDatasetAssemblyEligible,
    lineageValidationStillRequired: true as const,
    revisionAuditStillRequired: true as const,
    timingToleranceApplied: false as const,
    interpolationApplied: false as const,
    extrapolationApplied: false as const,
    blockers: Object.freeze(dedupedBlockers),
  });
}
