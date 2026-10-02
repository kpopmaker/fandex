import {
  SNS_FANDOM_REACTION_COLLECTION_RECEIPT_VERSION,
  type SnsFandomReactionCollectionReceiptMember,
  type SnsFandomReactionCollectionReceiptResult,
} from './snsFandomPointReactionValidationCollectionReceipt';
import {
  type SnsFandomProspectiveEnrollmentReconciliationResult,
  type SnsFandomProspectiveEnrollmentResult,
} from './snsFandomPointReactionProspectiveContentEnrollment';

export const SNS_FANDOM_REACTION_PROSPECTIVE_RECEIPT_BUNDLE_VERSION =
  'sns-fandom-reaction-prospective-receipt-bundle-v1' as const;

export type SnsFandomProspectiveReceiptBundleEntry = Readonly<{
  enrollment: SnsFandomProspectiveEnrollmentResult;
  reconciliation: SnsFandomProspectiveEnrollmentReconciliationResult;
  receipts: readonly SnsFandomReactionCollectionReceiptResult[];
}>;

export type SnsFandomProspectiveReceiptBundleResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_REACTION_PROSPECTIVE_RECEIPT_BUNDLE_VERSION;
  state: 'blocked' | 'receipt-bundle-ready';
  studyId: string;
  canonicalArtistIds: readonly string[];
  providerClientRef: string | null;
  metricId: string | null;
  construct: string | null;
  expectedTaskCount: number;
  bundledReceiptMemberCount: number;
  receipt: SnsFandomReactionCollectionReceiptResult | null;
  finalManifestReconciliationRequired: true;
  multiArtistEvidenceRequired: true;
  automaticBackfillAllowed: false;
  blockers: readonly string[];
}>;

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function exactSetEqual(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return JSON.stringify(uniqueSorted(left))
    === JSON.stringify(uniqueSorted(right));
}

function targetSignature(
  enrollment: SnsFandomProspectiveEnrollmentResult,
): string {
  return uniqueSorted(
    enrollment.tasks.map(
      (task) =>
        task.datasetId + ':' + String(task.targetContentAgeMilliseconds),
    ),
  ).join('|');
}

export function bundleSnsFandomProspectiveReactionReceipts(
  input: Readonly<{
    studyId: string;
    entries: readonly SnsFandomProspectiveReceiptBundleEntry[];
  }>,
): SnsFandomProspectiveReceiptBundleResult {
  const blockers: string[] = [];

  if (input.studyId.trim().length === 0) {
    blockers.push('prospective-receipt-bundle-study-id-empty');
  }
  if (input.entries.length === 0) {
    blockers.push('prospective-receipt-bundle-entry-missing');
  }

  const canonicalArtistIds = uniqueSorted(
    input.entries.map((entry) => entry.enrollment.canonicalArtistId),
  );
  if (canonicalArtistIds.length < 2) {
    blockers.push(
      'prospective-receipt-bundle-multi-artist-evidence-insufficient',
    );
  }
  if (canonicalArtistIds.length !== input.entries.length) {
    blockers.push('prospective-receipt-bundle-duplicate-canonical-artist');
  }

  const providerClientRefs = uniqueSorted(
    input.entries.map((entry) => entry.enrollment.providerClientRef),
  );
  if (providerClientRefs.length !== 1) {
    blockers.push('prospective-receipt-bundle-provider-client-mismatch');
  }

  const metricIds = uniqueSorted(
    input.entries.map((entry) => entry.enrollment.metricId),
  );
  if (metricIds.length !== 1) {
    blockers.push('prospective-receipt-bundle-metric-mismatch');
  }

  const constructs = uniqueSorted(
    input.entries.map((entry) => entry.enrollment.construct),
  );
  if (constructs.length !== 1) {
    blockers.push('prospective-receipt-bundle-construct-mismatch');
  }

  const targetSignatures = uniqueSorted(
    input.entries.map((entry) => targetSignature(entry.enrollment)),
  );
  if (targetSignatures.length !== 1) {
    blockers.push('prospective-receipt-bundle-target-plan-mismatch');
  }

  const expectedTaskIds: string[] = [];
  const members: SnsFandomReactionCollectionReceiptMember[] = [];
  let receivedReceiptCount = 0;
  let exactTargetAgeCaptureCount = 0;
  let deviatedCaptureCount = 0;

  for (const entry of input.entries) {
    const { enrollment, reconciliation, receipts } = entry;

    if (enrollment.state !== 'enrollment-active') {
      blockers.push('prospective-receipt-bundle-enrollment-not-active');
    }
    if (enrollment.missedTaskCount > 0) {
      blockers.push('prospective-receipt-bundle-enrollment-has-missed-captures');
    }
    if (
      reconciliation.enrollmentId !== enrollment.enrollmentId
      || reconciliation.state !== 'reconciliation-ready'
      || !reconciliation.contentUniverseReconciled
      || !reconciliation.prospectiveContentUniverseEligibleForDatasetAssembly
      || reconciliation.blockers.length > 0
    ) {
      blockers.push('prospective-receipt-bundle-reconciliation-not-ready');
    }

    const eligibleTasks = enrollment.tasks.filter(
      (task) => task.state === 'pending-prospective-capture',
    );
    const expectedTaskById = new Map(
      eligibleTasks.map((task) => [task.taskId, task]),
    );
    const entryExpectedTaskIds = uniqueSorted(
      eligibleTasks.map((task) => task.taskId),
    );
    if (entryExpectedTaskIds.length === 0) {
      blockers.push('prospective-receipt-bundle-enrollment-task-missing');
    }
    expectedTaskIds.push(...entryExpectedTaskIds);

    const entryMembers: SnsFandomReactionCollectionReceiptMember[] = [];
    for (const receipt of receipts) {
      if (
        receipt.state !== 'capture-complete-lineage-pending'
        || !receipt.targetAgeDatasetAssemblyEligible
        || receipt.blockers.length > 0
        || receipt.deviatedCaptureCount > 0
      ) {
        blockers.push('prospective-receipt-bundle-receipt-not-exact-ready');
      }

      if (
        receipt.expectedTaskCount !== receipt.members.length
        || receipt.receivedReceiptCount !== receipt.members.length
        || receipt.completedMemberCount !== receipt.members.length
        || receipt.exactTargetAgeCaptureCount !== receipt.members.length
      ) {
        blockers.push('prospective-receipt-bundle-receipt-count-inconsistent');
      }

      receivedReceiptCount += receipt.receivedReceiptCount;
      exactTargetAgeCaptureCount += receipt.exactTargetAgeCaptureCount;
      deviatedCaptureCount += receipt.deviatedCaptureCount;

      for (const member of receipt.members) {
        const expectedTask = expectedTaskById.get(member.taskId);
        if (
          expectedTask === undefined
          || member.datasetId !== expectedTask.datasetId
          || member.canonicalArtistId !== expectedTask.canonicalArtistId
          || member.videoId !== expectedTask.videoId
          || member.metricId !== expectedTask.metricId
          || member.plannedCaptureAt !== expectedTask.captureAt
        ) {
          blockers.push(
            'prospective-receipt-bundle-receipt-task-binding-mismatch',
          );
        }
        if (member.canonicalArtistId !== enrollment.canonicalArtistId) {
          blockers.push(
            'prospective-receipt-bundle-receipt-artist-mismatch',
          );
        }
        entryMembers.push(member);
        members.push(member);
      }
    }

    const entryReceiptTaskIds = entryMembers.map((member) => member.taskId);
    if (!exactSetEqual(entryReceiptTaskIds, entryExpectedTaskIds)) {
      blockers.push(
        'prospective-receipt-bundle-enrollment-receipt-task-set-mismatch',
      );
    }
  }

  if (
    uniqueSorted(expectedTaskIds).length !== expectedTaskIds.length
  ) {
    blockers.push('prospective-receipt-bundle-expected-task-duplicate');
  }

  const memberTaskIds = members.map((member) => member.taskId);
  if (uniqueSorted(memberTaskIds).length !== memberTaskIds.length) {
    blockers.push('prospective-receipt-bundle-receipt-task-duplicate');
  }

  const observationIds = members.map((member) => member.observationId);
  if (uniqueSorted(observationIds).length !== observationIds.length) {
    blockers.push('prospective-receipt-bundle-observation-id-duplicate');
  }

  if (!exactSetEqual(memberTaskIds, expectedTaskIds)) {
    blockers.push('prospective-receipt-bundle-study-task-set-mismatch');
  }

  if (deviatedCaptureCount > 0) {
    blockers.push('prospective-receipt-bundle-timing-deviation-present');
  }
  if (
    receivedReceiptCount !== expectedTaskIds.length
    || exactTargetAgeCaptureCount !== expectedTaskIds.length
    || members.length !== expectedTaskIds.length
  ) {
    blockers.push('prospective-receipt-bundle-study-count-inconsistent');
  }

  const dedupedBlockers = uniqueSorted(blockers);
  const ready = dedupedBlockers.length === 0;

  const receipt: SnsFandomReactionCollectionReceiptResult | null =
    ready
      ? Object.freeze({
          contractVersion: SNS_FANDOM_REACTION_COLLECTION_RECEIPT_VERSION,
          state: 'capture-complete-lineage-pending' as const,
          planId: input.studyId,
          expectedTaskCount: expectedTaskIds.length,
          receivedReceiptCount,
          completedMemberCount: members.length,
          exactTargetAgeCaptureCount,
          deviatedCaptureCount: 0,
          members: Object.freeze([...members]),
          targetAgeDatasetAssemblyEligible: true,
          lineageValidationStillRequired: true as const,
          revisionAuditStillRequired: true as const,
          timingToleranceApplied: false as const,
          interpolationApplied: false as const,
          extrapolationApplied: false as const,
          blockers: Object.freeze([]),
        })
      : null;

  return Object.freeze({
    contractVersion: SNS_FANDOM_REACTION_PROSPECTIVE_RECEIPT_BUNDLE_VERSION,
    state: ready ? 'receipt-bundle-ready' as const : 'blocked' as const,
    studyId: input.studyId,
    canonicalArtistIds: Object.freeze(canonicalArtistIds),
    providerClientRef:
      providerClientRefs.length === 1 ? providerClientRefs[0] : null,
    metricId: metricIds.length === 1 ? metricIds[0] : null,
    construct: constructs.length === 1 ? constructs[0] : null,
    expectedTaskCount: expectedTaskIds.length,
    bundledReceiptMemberCount: members.length,
    receipt,
    finalManifestReconciliationRequired: true as const,
    multiArtistEvidenceRequired: true as const,
    automaticBackfillAllowed: false as const,
    blockers: Object.freeze(dedupedBlockers),
  });
}
