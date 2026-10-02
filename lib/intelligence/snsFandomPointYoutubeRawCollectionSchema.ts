export const SNS_FANDOM_YOUTUBE_RAW_COLLECTION_SCHEMA_VERSION =
  'sns-fandom-youtube-raw-collection-schema-v1' as const;

export type SnsFandomYoutubeRawCollectionRecord = Readonly<{
  schemaVersion: typeof SNS_FANDOM_YOUTUBE_RAW_COLLECTION_SCHEMA_VERSION;
  provider: 'youtube-data-api';
  providerResourceId: string;
  channelId: string;
  artistIdentityRef: string;
  observationWindow: Readonly<{
    startAt: string;
    endAt: string;
  }>;
  observedAt: string;
  collectedAt: string;
  metrics: Readonly<{
    viewCount: string | null;
    likeCount: string | null;
    commentCount: string | null;
  }>;
  rightsState:
    | 'blocked-by-rights'
    | 'authorized-and-collectable';
  evidenceRefs: readonly string[];
}>;

export function validateSnsFandomYoutubeRawCollectionRecord(
  record: SnsFandomYoutubeRawCollectionRecord,
): Readonly<{
  valid: boolean;
  blockers: readonly string[];
}> {
  const blockers: string[] = [];

  if (
    record.schemaVersion
      !== SNS_FANDOM_YOUTUBE_RAW_COLLECTION_SCHEMA_VERSION
  ) {
    blockers.push('raw-schema-version-invalid');
  }
  if (record.provider !== 'youtube-data-api') {
    blockers.push('raw-provider-invalid');
  }
  if (record.providerResourceId.trim().length === 0) {
    blockers.push('provider-resource-id-missing');
  }
  if (record.artistIdentityRef.trim().length === 0) {
    blockers.push('artist-identity-binding-missing');
  }
  if (record.channelId.trim().length === 0) {
    blockers.push('provider-channel-id-missing');
  }
  if (record.observedAt.trim().length === 0) {
    blockers.push('observation-time-missing');
  }
  if (record.collectedAt.trim().length === 0) {
    blockers.push('collection-time-missing');
  }
  if (
    record.observationWindow.startAt.trim().length === 0
    || record.observationWindow.endAt.trim().length === 0
  ) {
    blockers.push('observation-window-missing');
  }
  if (record.rightsState !== 'authorized-and-collectable') {
    blockers.push('provider-rights-not-authorized');
  }
  if (record.evidenceRefs.length === 0) {
    blockers.push('evidence-reference-missing');
  }

  return Object.freeze({
    valid: blockers.length === 0,
    blockers: Object.freeze(Array.from(new Set(blockers))),
  });
}

export function isEligibleYoutubeRawCollectionRecord(
  record: SnsFandomYoutubeRawCollectionRecord,
): boolean {
  return validateSnsFandomYoutubeRawCollectionRecord(record).valid;
}
