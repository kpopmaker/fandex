export const SNS_FANDOM_VALIDATION_DATASET_ELIGIBILITY_VERSION =
  'sns-fandom-validation-dataset-eligibility-v1' as const;

export type SnsFandomValidationDatasetCandidate = Readonly<{
  datasetId: string;
  providerId: string;
  construct:
    | 'public-reaction-diffusion'
    | 'fandom-activity-persistence';
  observationCount: number;
  artistCoverageCount: number;
  allSnapshotsValidated: boolean;
  allRevisionsResolved: boolean;
  hasProviderEvidence: boolean;
  hasIdentityBinding: boolean;
  hasTemporalAlignment: boolean;
  containsSyntheticRecords: boolean;
  containsMissingAsZeroRecords: boolean;
}>;

export type SnsFandomValidationDatasetEligibility = Readonly<{
  datasetId: string;
  eligible: boolean;
  reasons: readonly string[];
}>;

export function evaluateSnsFandomValidationDatasetEligibility(
  candidate: SnsFandomValidationDatasetCandidate,
): SnsFandomValidationDatasetEligibility {
  const reasons: string[] = [];

  if (candidate.observationCount <= 0) {
    reasons.push('dataset-has-no-observations');
  }
  if (candidate.artistCoverageCount <= 0) {
    reasons.push('dataset-has-no-artist-coverage');
  }
  if (!candidate.allSnapshotsValidated) {
    reasons.push('dataset-contains-unvalidated-snapshots');
  }
  if (!candidate.allRevisionsResolved) {
    reasons.push('dataset-has-unresolved-revisions');
  }
  if (!candidate.hasProviderEvidence) {
    reasons.push('dataset-provider-evidence-missing');
  }
  if (!candidate.hasIdentityBinding) {
    reasons.push('dataset-artist-identity-binding-missing');
  }
  if (!candidate.hasTemporalAlignment) {
    reasons.push('dataset-temporal-alignment-missing');
  }
  if (candidate.containsSyntheticRecords) {
    reasons.push('synthetic-records-are-not-eligible');
  }
  if (candidate.containsMissingAsZeroRecords) {
    reasons.push('missing-as-zero-records-are-not-eligible');
  }

  return Object.freeze({
    datasetId: candidate.datasetId,
    eligible: reasons.length === 0,
    reasons: Object.freeze(Array.from(new Set(reasons))),
  });
}
