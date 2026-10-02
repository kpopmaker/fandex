import {
  buildSnsFandomReactionValidationDataset,
  type SnsFandomReactionValidationDatasetInput,
  type SnsFandomReactionValidationDatasetResult,
} from './snsFandomPointReactionValidationDataset';
import {
  type SnsFandomReactionCollectionReceiptResult,
} from './snsFandomPointReactionValidationCollectionReceipt';

export const SNS_FANDOM_REACTION_DATASET_ASSEMBLY_VERSION =
  'sns-fandom-reaction-validation-dataset-assembly-v1' as const;

export type SnsFandomReactionDatasetAssemblyResult = Readonly<{
  contractVersion: typeof SNS_FANDOM_REACTION_DATASET_ASSEMBLY_VERSION;
  state: 'blocked' | 'validation-dataset-ready';
  datasetId: string;
  receiptMemberCount: number;
  observationCount: number;
  lineageEntryCount: number;
  dataset: SnsFandomReactionValidationDatasetResult | null;
  aggregateValuesProduced: false;
  normalizedValuesProduced: false;
  methodologyDecisionProduced: false;
  blockers: readonly string[];
}>;

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort();
}

export function assembleSnsFandomReactionValidationDataset(
  input: Readonly<{
    receipt: SnsFandomReactionCollectionReceiptResult;
    datasetInput: SnsFandomReactionValidationDatasetInput;
  }>,
): SnsFandomReactionDatasetAssemblyResult {
  const blockers: string[] = [];
  const { receipt, datasetInput } = input;

  if (
    receipt.state !== 'capture-complete-lineage-pending'
    || !receipt.targetAgeDatasetAssemblyEligible
  ) {
    blockers.push('reaction-dataset-assembly-receipt-not-eligible');
  }

  const receiptMembers = receipt.members.filter(
    (member) => member.datasetId === datasetInput.datasetId,
  );
  if (receiptMembers.length === 0) {
    blockers.push('reaction-dataset-assembly-receipt-members-missing');
  }

  const observations = datasetInput.artists.flatMap(
    (artist) => artist.observations.filter(
      (observation) =>
        observation.variable.metricId === datasetInput.metricId
        && observation.entity.providerContentId !== null,
    ),
  );

  const observationIds = uniqueSorted(
    observations.map((observation) => observation.observationId),
  );
  const receiptObservationIds = uniqueSorted(
    receiptMembers.map((member) => member.observationId),
  );
  const lineageObservationIds = uniqueSorted(
    datasetInput.lineageEntries.map((entry) => entry.observationId),
  );

  if (
    JSON.stringify(observationIds)
      !== JSON.stringify(receiptObservationIds)
  ) {
    blockers.push(
      'reaction-dataset-assembly-receipt-observation-set-mismatch',
    );
  }
  if (
    JSON.stringify(lineageObservationIds)
      !== JSON.stringify(receiptObservationIds)
  ) {
    blockers.push(
      'reaction-dataset-assembly-lineage-observation-set-mismatch',
    );
  }

  const observationById = new Map(
    observations.map((observation) => [
      observation.observationId,
      observation,
    ]),
  );
  const lineageByObservationId = new Map(
    datasetInput.lineageEntries.map((entry) => [
      entry.observationId,
      entry,
    ]),
  );

  for (const member of receiptMembers) {
    const observation = observationById.get(member.observationId);
    const lineage = lineageByObservationId.get(member.observationId);

    if (observation === undefined || lineage === undefined) {
      blockers.push('reaction-dataset-assembly-member-link-missing');
      continue;
    }

    if (
      observation.entity.canonicalArtistId !== member.canonicalArtistId
      || observation.entity.providerContentId !== member.videoId
      || observation.variable.metricId !== member.metricId
      || observation.time.observedAt !== member.actualObservedAt
      || observation.time.collectedAt !== member.collectedAt
    ) {
      blockers.push(
        'reaction-dataset-assembly-receipt-observation-mismatch',
      );
    }

    if (lineage.collectionRun.runId !== member.collectionRunId) {
      blockers.push(
        'reaction-dataset-assembly-collection-run-mismatch',
      );
    }

    const lineageEvidence = new Set([
      ...lineage.collectionRun.evidenceRefs,
      ...lineage.rawRecord.evidenceRefs,
      ...lineage.historicalSnapshot.lineage.evidenceRefs,
      ...lineage.revisionEvent.evidenceRefs,
    ]);
    if (!lineageEvidence.has(member.evidenceRef)) {
      blockers.push(
        'reaction-dataset-assembly-receipt-evidence-disconnected',
      );
    }
  }

  let dataset: SnsFandomReactionValidationDatasetResult | null = null;

  if (blockers.length === 0) {
    dataset = buildSnsFandomReactionValidationDataset(datasetInput);
    if (
      dataset.state !== 'validation-ready'
      || !dataset.methodologyValidationEligible
      || !dataset.lineageValidated
    ) {
      blockers.push(
        'reaction-dataset-assembly-dataset-not-validation-ready',
      );
    }
  }

  const dedupedBlockers = uniqueSorted(blockers);
  const ready =
    dedupedBlockers.length === 0
    && dataset !== null
    && dataset.state === 'validation-ready'
    && dataset.methodologyValidationEligible;

  return Object.freeze({
    contractVersion: SNS_FANDOM_REACTION_DATASET_ASSEMBLY_VERSION,
    state: ready
      ? 'validation-dataset-ready' as const
      : 'blocked' as const,
    datasetId: datasetInput.datasetId,
    receiptMemberCount: receiptMembers.length,
    observationCount: observations.length,
    lineageEntryCount: datasetInput.lineageEntries.length,
    dataset,
    aggregateValuesProduced: false as const,
    normalizedValuesProduced: false as const,
    methodologyDecisionProduced: false as const,
    blockers: Object.freeze(dedupedBlockers),
  });
}
