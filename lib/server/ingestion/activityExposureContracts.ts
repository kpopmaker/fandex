import { sha256Canonical } from '../../shared/canonicalDigest';

export const ACTIVITY_EXPOSURE_INGESTION_CONTRACT_VERSION =
  'activity-exposure-ingestion-v1' as const;

export const YOUTUBE_NON_AUTHORIZED_DATA_MAX_RETENTION_DAYS = 30;

export type ActivityExposureIngestionProvider = 'musicbrainz' | 'youtube';

export type ActivityExposureRawPayloadRetentionState =
  | 'retained'
  | 'digest-only'
  | 'evicted'
  | 'not-retained';

export type ActivityExposureAuthorizationState =
  | 'allowed'
  | 'review-required'
  | 'blocked';

export type ActivityExposureRevisionState =
  | 'original'
  | 'unchanged-repeat'
  | 'changed'
  | 'unavailable-after-observation';

export type ActivityExposureProviderObservation = Readonly<{
  contractVersion: typeof ACTIVITY_EXPOSURE_INGESTION_CONTRACT_VERSION;
  observationId: string;
  artistId: string;
  sourceProvider: ActivityExposureIngestionProvider;
  providerArtistId: string;
  sourceEntityType: string;
  sourceEntityId: string;
  requestRef: string;
  responseCapturedAt: string;
  collectedAt: string;
  sourcePublishedAt: string | null;
  providerObservedAt: string | null;
  rawPayloadDigest: string;
  rawPayloadRetentionState: ActivityExposureRawPayloadRetentionState;
  retentionPolicyVersion: string;
  retainedAt: string | null;
  refreshDueAt: string | null;
  refreshedAt: string | null;
  evictedAt: string | null;
  evidenceRef: string;
  priorObservationId: string | null;
  supersedesObservationId: string | null;
  revisionState: ActivityExposureRevisionState;
  authorizationState: ActivityExposureAuthorizationState;
  normalizedEventIds: readonly string[];
}>;

export type ActivityExposureProviderObservationInput = Readonly<{
  artistId: string;
  sourceProvider: ActivityExposureIngestionProvider;
  providerArtistId: string;
  sourceEntityType: string;
  sourceEntityId: string;
  requestRef: string;
  responseCapturedAt: string;
  collectedAt: string;
  sourcePublishedAt?: string | null;
  providerObservedAt?: string | null;
  rawPayloadCanonical: string;
  rawPayloadRetentionState: ActivityExposureRawPayloadRetentionState;
  retentionPolicyVersion: string;
  retainedAt?: string | null;
  refreshDueAt?: string | null;
  refreshedAt?: string | null;
  evictedAt?: string | null;
  evidenceRef: string;
  priorObservationId?: string | null;
  supersedesObservationId?: string | null;
  revisionState?: ActivityExposureRevisionState;
  authorizationState: ActivityExposureAuthorizationState;
  normalizedEventIds?: readonly string[];
}>;

export type ActivityExposureProviderObservationIssue =
  | 'authorization-blocked'
  | 'invalid-observation-id'
  | 'invalid-payload-digest'
  | 'changed-without-prior-observation'
  | 'supersession-without-revision'
  | 'invalid-retention-state'
  | 'youtube-refresh-boundary-required'
  | 'youtube-refresh-boundary-too-late';

function isIsoTimestamp(value: string) {
  return Number.isFinite(Date.parse(value));
}

function retentionIssues(
  observation: ActivityExposureProviderObservation,
): ActivityExposureProviderObservationIssue[] {
  const issues: ActivityExposureProviderObservationIssue[] = [];

  if (observation.rawPayloadRetentionState === 'retained') {
    if (observation.retainedAt === null || observation.evictedAt !== null) {
      issues.push('invalid-retention-state');
    }
  } else if (observation.rawPayloadRetentionState === 'evicted') {
    if (observation.retainedAt === null || observation.evictedAt === null) {
      issues.push('invalid-retention-state');
    }
  } else if (
    observation.retainedAt !== null
    || observation.evictedAt !== null
  ) {
    issues.push('invalid-retention-state');
  }

  if (
    observation.sourceProvider === 'youtube'
    && observation.rawPayloadRetentionState === 'retained'
  ) {
    if (
      observation.retainedAt === null
      || observation.refreshDueAt === null
      || !isIsoTimestamp(observation.retainedAt)
      || !isIsoTimestamp(observation.refreshDueAt)
      || Date.parse(observation.refreshDueAt) <= Date.parse(observation.retainedAt)
    ) {
      issues.push('youtube-refresh-boundary-required');
    } else {
      const maximumDueAt =
        Date.parse(observation.retainedAt)
        + YOUTUBE_NON_AUTHORIZED_DATA_MAX_RETENTION_DAYS * 24 * 60 * 60 * 1000;
      if (Date.parse(observation.refreshDueAt) > maximumDueAt) {
        issues.push('youtube-refresh-boundary-too-late');
      }
    }
  }

  return issues;
}

export function buildActivityExposureObservationId(input: Readonly<{
  artistId: string;
  sourceProvider: ActivityExposureIngestionProvider;
  sourceEntityType: string;
  sourceEntityId: string;
  collectedAt: string;
  rawPayloadDigest: string;
}>) {
  return sha256Canonical({
    contractVersion: ACTIVITY_EXPOSURE_INGESTION_CONTRACT_VERSION,
    artistId: input.artistId,
    sourceProvider: input.sourceProvider,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
    collectedAt: input.collectedAt,
    rawPayloadDigest: input.rawPayloadDigest,
  });
}

export function createActivityExposureProviderObservation(
  input: ActivityExposureProviderObservationInput,
): ActivityExposureProviderObservation {
  const rawPayloadDigest = sha256Canonical(input.rawPayloadCanonical);
  const observationId = buildActivityExposureObservationId({
    artistId: input.artistId,
    sourceProvider: input.sourceProvider,
    sourceEntityType: input.sourceEntityType,
    sourceEntityId: input.sourceEntityId,
    collectedAt: input.collectedAt,
    rawPayloadDigest,
  });

  return Object.freeze({
    contractVersion: ACTIVITY_EXPOSURE_INGESTION_CONTRACT_VERSION,
    observationId,
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
    rawPayloadRetentionState: input.rawPayloadRetentionState,
    retentionPolicyVersion: input.retentionPolicyVersion,
    retainedAt: input.retainedAt ?? null,
    refreshDueAt: input.refreshDueAt ?? null,
    refreshedAt: input.refreshedAt ?? null,
    evictedAt: input.evictedAt ?? null,
    evidenceRef: input.evidenceRef,
    priorObservationId: input.priorObservationId ?? null,
    supersedesObservationId: input.supersedesObservationId ?? null,
    revisionState: input.revisionState ?? 'original',
    authorizationState: input.authorizationState,
    normalizedEventIds: Object.freeze([...(input.normalizedEventIds ?? [])]),
  });
}

export function validateActivityExposureProviderObservation(
  observation: ActivityExposureProviderObservation,
): ActivityExposureProviderObservationIssue[] {
  const issues: ActivityExposureProviderObservationIssue[] = [];

  if (observation.authorizationState === 'blocked') {
    issues.push('authorization-blocked');
  }

  if (!/^[a-f0-9]{64}$/.test(observation.observationId)) {
    issues.push('invalid-observation-id');
  }
  if (!/^[a-f0-9]{64}$/.test(observation.rawPayloadDigest)) {
    issues.push('invalid-payload-digest');
  }

  if (
    observation.revisionState === 'changed'
    && observation.priorObservationId === null
  ) {
    issues.push('changed-without-prior-observation');
  }

  if (
    observation.supersedesObservationId !== null
    && !['changed', 'unavailable-after-observation'].includes(
      observation.revisionState,
    )
  ) {
    issues.push('supersession-without-revision');
  }

  issues.push(...retentionIssues(observation));
  return issues;
}
