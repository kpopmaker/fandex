import type {
  ActivityExposureObservationProvider,
  ActivityExposureRawObservation,
} from './activityExposureObservation';

export const ACTIVITY_EXPOSURE_RETENTION_POLICY_VERSION =
  'activity-exposure-retention-policy-v1-research' as const;

export type ActivityExposureRetentionPolicy =
  | 'musicbrainz-minimized-core-metadata'
  | 'youtube-non-authorized-api-data-30d';

export type ActivityExposureRetentionDecision = Readonly<{
  policyVersion: typeof ACTIVITY_EXPOSURE_RETENTION_POLICY_VERSION;
  provider: ActivityExposureObservationProvider;
  policy: ActivityExposureRetentionPolicy;
  rawReplayPayloadAllowed: boolean;
  refreshOrDeleteRequired: boolean;
  refreshOrDeleteBy: string | null;
  persistentReplayClaimAllowed: boolean;
  notes: readonly string[];
}>;

const YOUTUBE_MAX_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

function plusDays(timestamp: string, days: number) {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed + days * DAY_MS).toISOString();
}

export function activityExposureRetentionDecision(input: Readonly<{
  provider: ActivityExposureObservationProvider;
  responseCapturedAt: string;
}>): ActivityExposureRetentionDecision {
  if (input.provider === 'youtube') {
    return Object.freeze({
      policyVersion: ACTIVITY_EXPOSURE_RETENTION_POLICY_VERSION,
      provider: 'youtube',
      policy: 'youtube-non-authorized-api-data-30d',
      rawReplayPayloadAllowed: true,
      refreshOrDeleteRequired: true,
      refreshOrDeleteBy: plusDays(
        input.responseCapturedAt,
        YOUTUBE_MAX_RETENTION_DAYS,
      ),
      persistentReplayClaimAllowed: false,
      notes: Object.freeze([
        'Public/non-authorized YouTube API data is treated as temporary research evidence.',
        'Refresh or delete the retained replay payload within 30 calendar days.',
        'Long-term Product lineage must not depend on indefinite retained YouTube API payloads.',
      ]),
    });
  }

  return Object.freeze({
    policyVersion: ACTIVITY_EXPOSURE_RETENTION_POLICY_VERSION,
    provider: 'musicbrainz',
    policy: 'musicbrainz-minimized-core-metadata',
    rawReplayPayloadAllowed: true,
    refreshOrDeleteRequired: false,
    refreshOrDeleteBy: null,
    persistentReplayClaimAllowed: true,
    notes: Object.freeze([
      'Persist only the minimized metadata subset required to reconstruct the normalized release event.',
      'Do not treat this policy as permission to persist unrelated supplementary MusicBrainz data.',
      'Preserve provider attribution/source reference in Product evidence lineage.',
    ]),
  });
}

export function validateActivityExposureRetention(
  observation: ActivityExposureRawObservation,
) {
  const decision = activityExposureRetentionDecision({
    provider: observation.sourceProvider,
    responseCapturedAt: observation.responseCapturedAt,
  });
  const issues: string[] = [];

  if (
    observation.rawPayloadRetentionState === 'retained'
    && !decision.rawReplayPayloadAllowed
  ) {
    issues.push('provider-retention-disallows-replay-payload');
  }

  if (
    observation.sourceProvider === 'youtube'
    && observation.rawPayloadRetentionState === 'retained'
    && decision.refreshOrDeleteBy === null
  ) {
    issues.push('youtube-retention-deadline-unavailable');
  }

  return issues;
}

export function canRetainActivityExposureReplayPayloadAt(
  observation: ActivityExposureRawObservation,
  asOf: string,
) {
  if (
    observation.rawPayloadRetentionState !== 'retained'
    || observation.rawPayloadCanonical === null
  ) {
    return false;
  }

  const decision = activityExposureRetentionDecision({
    provider: observation.sourceProvider,
    responseCapturedAt: observation.responseCapturedAt,
  });

  if (!decision.refreshOrDeleteRequired) return true;
  if (decision.refreshOrDeleteBy === null) return false;

  const asOfMs = Date.parse(asOf);
  const deadlineMs = Date.parse(decision.refreshOrDeleteBy);
  return Number.isFinite(asOfMs)
    && Number.isFinite(deadlineMs)
    && asOfMs <= deadlineMs;
}
