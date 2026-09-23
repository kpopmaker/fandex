export const ACTIVITY_EXPOSURE_CONTRACT_VERSION = 'activity-exposure-event-v1-research' as const;

export type ActivityExposureEventFamily = 'release' | 'official_content';
export type ActivityExposureLifecycleState = 'planned' | 'observed' | 'cancelled' | 'unknown';
export type ActivityExposurePrecision = 'year' | 'month' | 'day' | 'timestamp';
export type ActivityExposureMissingState =
  | 'covered'
  | 'partial'
  | 'missing_source_data'
  | 'identity_unresolved'
  | 'provider_unavailable'
  | 'not_in_scope'
  | 'invalid';

export type ActivityExposureEvent = Readonly<{
  artistId: string;
  eventId: string;
  eventFamily: ActivityExposureEventFamily;
  eventType: string;
  lifecycleState: ActivityExposureLifecycleState;
  announcedAt: string | null;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  occurredAt: string | null;
  occurredAtPrecision: ActivityExposurePrecision | null;
  sourcePublishedAt: string | null;
  collectedAt: string;
  sourceProvider: 'musicbrainz' | 'youtube';
  sourceEntityType: string;
  sourceEntityId: string;
  canonicalFamilyId: string | null;
  providerArtistId: string;
  evidenceRef: string;
  identityState: string;
  missingState: ActivityExposureMissingState;
  evidenceState: string;
  conflictState: string;
  timeZoneState: string;
  revisionId: string;
  supersedesRevisionId: string | null;
  [key: string]: unknown;
}>;

export type ActivityExposureValidationIssue = Readonly<{
  code:
    | 'required_field_missing'
    | 'observed_without_occurrence'
    | 'non_observed_with_occurrence'
    | 'precision_mismatch'
    | 'duplicate_event_id'
    | 'duplicate_provider_entity'
    | 'youtube_channel_mismatch'
    | 'musicbrainz_artist_mismatch'
    | 'prohibited_numeric_methodology_field'
    | 'invalid_missing_semantics';
  eventId?: string;
  message: string;
}>;

const prohibitedMethodologyFields = new Set([
  'score',
  'point',
  'weight',
  'decay',
  'recencyWeight',
  'activeUntil',
  'activeWindowDays',
  'activityCount',
  'aggregateCount',
]);

function matchesPrecision(value: string, precision: ActivityExposurePrecision) {
  if (precision === 'year') return /^\d{4}$/.test(value);
  if (precision === 'month') return /^\d{4}-\d{2}$/.test(value);
  if (precision === 'day') return /^\d{4}-\d{2}-\d{2}$/.test(value);
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value);
}

export function validateActivityExposureEvent(
  event: ActivityExposureEvent,
  identity: Readonly<{
    artistId: string;
    musicbrainzArtistId?: string;
    youtubeChannelId?: string;
  }>,
): ActivityExposureValidationIssue[] {
  const issues: ActivityExposureValidationIssue[] = [];

  const required = [
    'artistId',
    'eventId',
    'eventFamily',
    'eventType',
    'lifecycleState',
    'collectedAt',
    'sourceProvider',
    'sourceEntityId',
    'providerArtistId',
    'evidenceRef',
    'identityState',
    'missingState',
    'revisionId',
  ] as const;

  for (const field of required) {
    const value = event[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      issues.push({
        code: 'required_field_missing',
        eventId: event.eventId,
        message: `Required field is missing: ${field}`,
      });
    }
  }

  if (event.lifecycleState === 'observed' && event.occurredAt === null) {
    issues.push({
      code: 'observed_without_occurrence',
      eventId: event.eventId,
      message: 'Observed events require occurredAt.',
    });
  }

  if (
    event.lifecycleState !== 'observed'
    && event.occurredAt !== null
    && event.lifecycleState !== 'unknown'
  ) {
    issues.push({
      code: 'non_observed_with_occurrence',
      eventId: event.eventId,
      message: 'Planned/cancelled events must not be promoted to observed by carrying occurredAt.',
    });
  }

  if (event.occurredAt !== null) {
    if (event.occurredAtPrecision === null || !matchesPrecision(event.occurredAt, event.occurredAtPrecision)) {
      issues.push({
        code: 'precision_mismatch',
        eventId: event.eventId,
        message: 'occurredAt does not match occurredAtPrecision.',
      });
    }
  }

  if (
    event.sourceProvider === 'youtube'
    && identity.youtubeChannelId
    && event.providerArtistId !== identity.youtubeChannelId
  ) {
    issues.push({
      code: 'youtube_channel_mismatch',
      eventId: event.eventId,
      message: 'YouTube event providerArtistId does not match the canonical official channel ID.',
    });
  }

  if (
    event.sourceProvider === 'musicbrainz'
    && identity.musicbrainzArtistId
    && event.providerArtistId !== identity.musicbrainzArtistId
  ) {
    issues.push({
      code: 'musicbrainz_artist_mismatch',
      eventId: event.eventId,
      message: 'MusicBrainz event providerArtistId does not match the canonical artist MBID.',
    });
  }

  for (const field of prohibitedMethodologyFields) {
    if (Object.prototype.hasOwnProperty.call(event, field)) {
      issues.push({
        code: 'prohibited_numeric_methodology_field',
        eventId: event.eventId,
        message: `Activity Exposure event must not contain numeric methodology field: ${field}`,
      });
    }
  }

  if (
    event.missingState !== 'covered'
    && event.missingState !== 'partial'
    && event.lifecycleState === 'observed'
    && event.occurredAt !== null
  ) {
    issues.push({
      code: 'invalid_missing_semantics',
      eventId: event.eventId,
      message: 'An observed occurrence cannot simultaneously be classified as absent/provider-unavailable/not-in-scope.',
    });
  }

  return issues;
}

export function validateActivityExposureStream(
  events: readonly ActivityExposureEvent[],
  identity: Readonly<{
    artistId: string;
    musicbrainzArtistId?: string;
    youtubeChannelId?: string;
  }>,
): ActivityExposureValidationIssue[] {
  const issues = events.flatMap((event) => validateActivityExposureEvent(event, identity));
  const eventIds = new Set<string>();
  const providerEntityKeys = new Set<string>();

  for (const event of events) {
    if (eventIds.has(event.eventId)) {
      issues.push({
        code: 'duplicate_event_id',
        eventId: event.eventId,
        message: 'eventId must be unique within an Activity Exposure stream.',
      });
    }
    eventIds.add(event.eventId);

    const providerKey = `${event.sourceProvider}:${event.sourceEntityType}:${event.sourceEntityId}`;
    if (providerEntityKeys.has(providerKey)) {
      issues.push({
        code: 'duplicate_provider_entity',
        eventId: event.eventId,
        message: 'The same provider entity must not create multiple Activity Exposure events.',
      });
    }
    providerEntityKeys.add(providerKey);
  }

  return issues;
}

export function isActivityExposureStreamValid(
  events: readonly ActivityExposureEvent[],
  identity: Readonly<{
    artistId: string;
    musicbrainzArtistId?: string;
    youtubeChannelId?: string;
  }>,
) {
  return validateActivityExposureStream(events, identity).length === 0;
}
