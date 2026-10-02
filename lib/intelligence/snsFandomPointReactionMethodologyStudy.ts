import {
  type SnsFandomReactionValidationDatasetResult,
} from './snsFandomPointReactionValidationDataset';

export const SNS_FANDOM_REACTION_METHODOLOGY_STUDY_VERSION =
  'sns-fandom-reaction-methodology-study-v1' as const;

export type SnsFandomReactionMethodEvidence = Readonly<{
  methodId: string;
  datasetId: string;
  construct:
    | 'typical-content-reaction-intensity'
    | 'window-total-reaction-volume';
  metricId:
    | 'youtube.video.view-count'
    | 'youtube.video.like-count'
    | 'youtube.video.comment-count';
  materialClass: 'real';
  resultEvidenceRef: string;
}>;

export type SnsFandomReactionSensitivityAudit = Readonly<{
  state: 'unassessed' | 'reviewed';
  evidenceRef: string | null;
}>;

export type SnsFandomReactionContentAgeSensitivityAudit =
  SnsFandomReactionSensitivityAudit & Readonly<{
    comparedDatasetIds: readonly string[];
  }>;

export type SnsFandomReactionMethodologyStudyInput = Readonly<{
  studyId: string;
  primaryDataset: SnsFandomReactionValidationDatasetResult;
  supportingDatasets: readonly SnsFandomReactionValidationDatasetResult[];
  methodEvidence: readonly SnsFandomReactionMethodEvidence[];
  contentAgeSensitivity: SnsFandomReactionContentAgeSensitivityAudit;
  releaseVolumeSensitivity: SnsFandomReactionSensitivityAudit;
  missingnessSensitivity: SnsFandomReactionSensitivityAudit;
}>;

export type SnsFandomReactionMethodologyStudyResult = Readonly<{
  contractVersion: typeof SNS_FANDOM_REACTION_METHODOLOGY_STUDY_VERSION;
  studyId: string;
  state: 'blocked' | 'study-incomplete' | 'decision-support-ready';
  primaryDatasetId: string;
  construct: SnsFandomReactionValidationDatasetResult['construct'];
  metricId: SnsFandomReactionValidationDatasetResult['metricId'];
  comparedMethodIds: readonly string[];
  validationDatasetIds: readonly string[];
  distinctTargetContentAgeCount: number;
  distinctSelectedContentCount: number;
  contentAgeSensitivityReviewed: boolean;
  releaseVolumeSensitivityReviewed: boolean;
  missingnessSensitivityReviewed: boolean;
  revisionStabilityReviewed: boolean;
  selectedMethodId: null;
  methodRankingProduced: false;
  scoreProduced: false;
  decisionSupportReady: boolean;
  blockers: readonly string[];
}>;

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function auditEvidencePresent(
  audit: SnsFandomReactionSensitivityAudit,
): boolean {
  return (
    audit.state === 'reviewed'
    && audit.evidenceRef !== null
    && audit.evidenceRef.trim().length > 0
  );
}

export function buildSnsFandomReactionMethodologyStudy(
  input: SnsFandomReactionMethodologyStudyInput,
): SnsFandomReactionMethodologyStudyResult {
  const blockers: string[] = [];

  if (input.studyId.trim().length === 0) {
    blockers.push('reaction-methodology-study-id-empty');
  }

  const primary = input.primaryDataset;
  if (
    primary.state !== 'validation-ready'
    || !primary.methodologyValidationEligible
  ) {
    blockers.push('reaction-methodology-primary-dataset-not-ready');
  }

  const datasets = [
    primary,
    ...input.supportingDatasets,
  ];
  const datasetIds = uniqueSorted(datasets.map((dataset) => dataset.datasetId));
  if (datasetIds.length !== datasets.length) {
    blockers.push('reaction-methodology-duplicate-dataset-id');
  }

  for (const dataset of datasets) {
    if (
      dataset.state !== 'validation-ready'
      || !dataset.methodologyValidationEligible
      || dataset.materialClass !== 'real'
    ) {
      blockers.push('reaction-methodology-supporting-dataset-not-ready');
      continue;
    }
    if (dataset.construct !== primary.construct) {
      blockers.push('reaction-methodology-dataset-construct-mismatch');
    }
    if (dataset.metricId !== primary.metricId) {
      blockers.push('reaction-methodology-dataset-metric-mismatch');
    }
    if (dataset.providerClientRef !== primary.providerClientRef) {
      blockers.push('reaction-methodology-dataset-client-mismatch');
    }
    if (
      JSON.stringify(dataset.providerEndpoints)
        !== JSON.stringify(primary.providerEndpoints)
    ) {
      blockers.push('reaction-methodology-dataset-endpoint-mismatch');
    }
  }

  const methodIds = input.methodEvidence.map((item) => item.methodId);
  const distinctMethodIds = uniqueSorted(methodIds);
  if (distinctMethodIds.length < 2) {
    blockers.push('reaction-methodology-method-comparison-insufficient');
  }
  if (distinctMethodIds.length !== methodIds.length) {
    blockers.push('reaction-methodology-method-id-duplicate');
  }

  for (const evidence of input.methodEvidence) {
    if (evidence.methodId.trim().length === 0) {
      blockers.push('reaction-methodology-method-id-empty');
    }
    if (evidence.datasetId !== primary.datasetId) {
      blockers.push('reaction-methodology-method-dataset-mismatch');
    }
    if (evidence.construct !== primary.construct) {
      blockers.push('reaction-methodology-method-construct-mismatch');
    }
    if (evidence.metricId !== primary.metricId) {
      blockers.push('reaction-methodology-method-metric-mismatch');
    }
    if (evidence.materialClass !== 'real') {
      blockers.push('reaction-methodology-method-evidence-not-real');
    }
    if (evidence.resultEvidenceRef.trim().length === 0) {
      blockers.push('reaction-methodology-method-evidence-ref-empty');
    }
  }

  const targetAges = uniqueSorted(
    datasets
      .map((dataset) => dataset.targetContentAgeMilliseconds)
      .filter((value): value is number => value !== null)
      .map((value) => String(value)),
  );
  const distinctTargetContentAgeCount = targetAges.length;

  const declaredAgeDatasetIds = uniqueSorted(
    input.contentAgeSensitivity.comparedDatasetIds,
  );
  const contentAgeSensitivityReviewed =
    auditEvidencePresent(input.contentAgeSensitivity)
    && distinctTargetContentAgeCount >= 2
    && declaredAgeDatasetIds.length >= 2
    && declaredAgeDatasetIds.every((datasetId) =>
      datasetIds.includes(datasetId)
    );

  if (!contentAgeSensitivityReviewed) {
    blockers.push(
      'reaction-methodology-content-age-sensitivity-evidence-incomplete',
    );
  }

  const contentCounts = uniqueSorted(
    datasets.flatMap((dataset) =>
      dataset.members.map((member) => String(member.selectedContentCount))
    ),
  );
  const distinctSelectedContentCount = contentCounts.length;

  const releaseVolumeSensitivityReviewed =
    auditEvidencePresent(input.releaseVolumeSensitivity)
    && distinctSelectedContentCount >= 2;

  if (!releaseVolumeSensitivityReviewed) {
    blockers.push(
      'reaction-methodology-release-volume-sensitivity-evidence-incomplete',
    );
  }

  const missingnessSensitivityReviewed =
    auditEvidencePresent(input.missingnessSensitivity);

  if (!missingnessSensitivityReviewed) {
    blockers.push(
      'reaction-methodology-missingness-sensitivity-evidence-incomplete',
    );
  }

  const revisionStabilityReviewed = datasets.every(
    (dataset) => dataset.revisionStabilityReviewed,
  );

  if (!revisionStabilityReviewed) {
    blockers.push(
      'reaction-methodology-revision-stability-evidence-incomplete',
    );
  }

  const hardBlockers = blockers.filter((blocker) =>
    blocker.startsWith('reaction-methodology-primary-')
    || blocker.startsWith('reaction-methodology-supporting-')
    || blocker.startsWith('reaction-methodology-duplicate-dataset')
    || blocker.startsWith('reaction-methodology-dataset-')
    || blocker.startsWith('reaction-methodology-method-dataset')
    || blocker.startsWith('reaction-methodology-method-construct')
    || blocker.startsWith('reaction-methodology-method-metric')
    || blocker.startsWith('reaction-methodology-method-evidence-not-real')
  );

  const decisionSupportReady =
    blockers.length === 0
    && distinctMethodIds.length >= 2
    && contentAgeSensitivityReviewed
    && releaseVolumeSensitivityReviewed
    && missingnessSensitivityReviewed
    && revisionStabilityReviewed;

  const state =
    hardBlockers.length > 0
      ? 'blocked' as const
      : decisionSupportReady
        ? 'decision-support-ready' as const
        : 'study-incomplete' as const;

  return Object.freeze({
    contractVersion: SNS_FANDOM_REACTION_METHODOLOGY_STUDY_VERSION,
    studyId: input.studyId,
    state,
    primaryDatasetId: primary.datasetId,
    construct: primary.construct,
    metricId: primary.metricId,
    comparedMethodIds: Object.freeze(distinctMethodIds),
    validationDatasetIds: Object.freeze(datasetIds),
    distinctTargetContentAgeCount,
    distinctSelectedContentCount,
    contentAgeSensitivityReviewed,
    releaseVolumeSensitivityReviewed,
    missingnessSensitivityReviewed,
    revisionStabilityReviewed,
    selectedMethodId: null,
    methodRankingProduced: false as const,
    scoreProduced: false as const,
    decisionSupportReady,
    blockers: Object.freeze(Array.from(new Set(blockers))),
  });
}
