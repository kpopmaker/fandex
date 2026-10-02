export const SNS_FANDOM_OBSERVATION_CONTRACT_VERSION =
  'sns-fandom-observation-contract-v1' as const;

export type SnsFandomObservationDimension =
  | 'public-reaction-diffusion'
  | 'fandom-activity-persistence';

export type SnsFandomObservationSourceState =
  | 'authorized-and-collectable'
  | 'approved-but-not-collected'
  | 'rights-blocked'
  | 'unsupported'
  | 'missing';

export type SnsFandomObservationRecord = Readonly<{
  contractVersion: typeof SNS_FANDOM_OBSERVATION_CONTRACT_VERSION;
  providerId: string;
  artistIdentityRef: string;
  dimension: SnsFandomObservationDimension;

  // The event being measured. This is never replaced by collection time.
  observationWindow: Readonly<{
    startAt: string;
    endAt: string;
  }>;

  // The moment FANDEX obtained the observation.
  collectionTime: string;

  sourceState: SnsFandomObservationSourceState;

  // Raw provider values remain provider-scoped.
  // Cross-provider normalization happens downstream only after qualification.
  rawMetrics: readonly Readonly<{
    metricName: string;
    value: number | null;
    unit: string;
  }>[];

  evidenceRefs: readonly string[];
}>;

export function isCollectableSnsFandomObservation(
  record: SnsFandomObservationRecord,
): boolean {
  if (record.sourceState !== 'authorized-and-collectable') {
    return false;
  }

  if (record.artistIdentityRef.trim().length === 0) {
    return false;
  }

  return record.rawMetrics.length > 0;
}
