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

export function isEligibleYoutubeRawCollectionRecord(
  record: SnsFandomYoutubeRawCollectionRecord,
): boolean {
  if (record.schemaVersion !== SNS_FANDOM_YOUTUBE_RAW_COLLECTION_SCHEMA_VERSION) {
    return false;
  }

  if (record.provider !== 'youtube-data-api') {
    return false;
  }

  if (record.rightsState !== 'authorized-and-collectable') {
    return false;
  }

  if (!record.artistIdentityRef || !record.channelId) {
    return false;
  }

  if (!record.observedAt || !record.collectedAt) {
    return false;
  }

  return record.evidenceRefs.length > 0;
}
