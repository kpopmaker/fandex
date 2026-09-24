import { createHash } from 'node:crypto';

export const ACTIVITY_EXPOSURE_OBSERVATION_CONTRACT_VERSION =
  'activity-exposure-observation-v1-research' as const;

export type ActivityExposureObservationProvider = 'musicbrainz' | 'youtube';
export type ActivityExposureObservationScope = 'research' | 'shadow';

export type ActivityExposureRawObservation = Readonly<{
  contractVersion: typeof ACTIVITY_EXPOSURE_OBSERVATION_CONTRACT_VERSION;
  observationId: string;
  scope: ActivityExposureObservationScope;
  artistId: string;
  sourceProvider: ActivityExposureObservationProvider;
  providerArtistId: string;
  sourceEntityType: string;
  sourceEntityId: string;
  requestRef: string;
  responseCapturedAt: string;
  collectedAt: string;
  sourcePublishedAt: string | null;
  providerObservedAt: string | null;
  rawPayloadDigest: string;
  rawPayloadCanonical: string | null;
  rawPayloadRetentionState: 'retained' | 'digest-only' | 'not-retained';
  evidenceRef: string;
  priorObservationId: string | null;
  supersedesObservationId: string | null;
  revisionState: 'original' | 'unchanged-repeat' | 'changed' | 'unavailable-after-observation';
  authorizationState: 'research-allowed' | 'review-required' | 'blocked';
  normalizedEventIds: readonly string[];
}>;

export type ActivityExposureObservationInput = Readonly<{
  scope?: ActivityExposureObservationScope;
  artistId: string;
  sourceProvider: ActivityExposureObservationProvider;
  providerArtistId: string;
  sourceEntityType: string;
  sourceEntityId: string;
  requestRef: string;
  responseCapturedAt: string;
  collectedAt: string;
  sourcePublishedAt?: string | null;
  providerObservedAt?: string | null;
  rawPayloadCanonical: string;
  rawPayloadRetentionState?: ActivityExposureRawObservation['rawPayloadRetentionState'];
  evidenceRef: string;
  priorObservationId?: string | null;
  supersedesObservationId?: string | null;
  revisionState?: ActivityExposureRawObservation['revisionState'];
  authorizationState?: ActivityExposureRawObservation['authorizationState'];
  normalizedEventIds?: readonly string[];
}>;

export function digestActivityExposureRawPayload(rawPayloadCanonical: string) {
  return createHash('sha256').update(rawPayloadCanonical).digest('hex');
}

export function buildActivityExposureObservationId(input: Readonly<{
  artistId: string;
  sourceProvider: ActivityExposureObservationProvider;
  sourceEntityType: string;
  sourceEntityId: string;
  collectedAt: string;
  rawPayloadDigest: string;
}>) {
  return createHash('sha256')
    .update(JSON.stringify({
      contractVersion: ACTIVITY_EXPOSURE_OBSERVATION_CONTRACT_VERSION,
      artistId: input.artistId,
      sourceProvider: input.sourceProvider,
      sourceEntityType: input.sourceEntityType,
      sourceEntityId: input.sourceEntityId,
      collectedAt: input.collectedAt,
      rawPayloadDigest: input.rawPayloadDigest,
    }))
    .digest('hex');
}

export function createActivityExposureRawObservation(
  input: ActivityExposureObservationInput,
): ActivityExposureRawObservation {
  const rawPayloadDigest = digestActivityExposureRawPayload(input.rawPayloadCanonical);
  const observationId = buildActivityExposureObservationId({
    artistId: input.artistId,
    sourceProvider: input.sourceProvider,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
    collectedAt: input.collectedAt,
    rawPayloadDigest,
  });

  return Object.freeze({
    contractVersion: ACTIVITY_EXPOSURE_OBSERVATION_CONTRACT_VERSION,
    observationId,
    scope: input.scope ?? 'research',
    artistId: input.artistId,
    sourceProvider: input.sourceProvider,
    providerArtistId: input.providerArtistId,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
    requestRef: input.requestRef,
    responseCapturedAt: input.responseCapturedAt,
    collectedAt: input.collectedAt,
    sourcePublishedAt: input.sourcePublishedAt ?? null,
    providerObservedAt: input.providerObservedAt ?? null,
    rawPayloadDigest,
    rawPayloadCanonical:
      (input.rawPayloadRetentionState ?? 'digest-only') === 'retained'
        ? input.rawPayloadCanonical
        : null,
    rawPayloadRetentionState: input.rawPayloadRetentionState ?? 'digest-only',
    evidenceRef: input.evidenceRef,
    priorObservationId: input.priorObservationId ?? null,
    supersedesObservationId: input.supersedesObservationId ?? null,
    revisionState: input.revisionState ?? 'original',
    authorizationState: input.authorizationState ?? 'review-required',
    normalizedEventIds: Object.freeze([...(input.normalizedEventIds ?? [])]),
  });
}

export function classifyActivityExposureRevision(
  previous: ActivityExposureRawObservation | null,
  currentDigest: string,
): ActivityExposureRawObservation['revisionState'] {
  if (previous === null) return 'original';
  return previous.rawPayloadDigest === currentDigest ? 'unchanged-repeat' : 'changed';
}

export function validateActivityExposureObservation(
  observation: ActivityExposureRawObservation,
) {
  const issues: string[] = [];

  if (observation.scope === 'research' && observation.authorizationState === 'blocked') {
    issues.push('authorization-blocked');
  }

  if (observation.revisionState === 'changed' && observation.priorObservationId === null) {
    issues.push('changed-without-prior-observation');
  }

  if (
    observation.supersedesObservationId !== null
    && observation.revisionState !== 'changed'
    && observation.revisionState !== 'unavailable-after-observation'
  ) {
    issues.push('supersession-without-revision');
  }

  if (observation.rawPayloadRetentionState !== 'retained') {
    issues.push('deterministic-replay-raw-evidence-not-retained');
  }

  if (
    observation.rawPayloadRetentionState === 'retained'
    && observation.rawPayloadCanonical === null
  ) {
    issues.push('retained-payload-missing');
  }

  if (
    observation.rawPayloadRetentionState === 'retained'
    && observation.rawPayloadCanonical !== null
    && digestActivityExposureRawPayload(observation.rawPayloadCanonical) !== observation.rawPayloadDigest
  ) {
    issues.push('retained-payload-digest-mismatch');
  }

  if (
    observation.rawPayloadRetentionState !== 'retained'
    && observation.rawPayloadCanonical !== null
  ) {
    issues.push('retention-state-payload-mismatch');
  }

  if (!/^[a-f0-9]{64}$/.test(observation.rawPayloadDigest)) {
    issues.push('invalid-payload-digest');
  }

  if (!/^[a-f0-9]{64}$/.test(observation.observationId)) {
    issues.push('invalid-observation-id');
  }

  return issues;
}

export function canDeterministicallyReplay(
  observations: readonly ActivityExposureRawObservation[],
) {
  return observations.length > 0
    && observations.every(
      (observation) =>
        observation.rawPayloadRetentionState === 'retained'
        && observation.rawPayloadCanonical !== null
        && validateActivityExposureObservation(observation).length === 0,
    );
}
