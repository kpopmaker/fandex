import {
  type SnsFandomYoutubeQuotaMeasurementHandoffResult,
} from './snsFandomPointYoutubeQuotaMeasurementHandoff';

export const SNS_FANDOM_YOUTUBE_BOUNDED_MEASUREMENT_VERSION =
  'sns-fandom-youtube-bounded-measurement-v1' as const;

export type SnsFandomYoutubeApiMethod =
  | 'channels.list'
  | 'playlistItems.list'
  | 'videos.list';

export type SnsFandomYoutubeApiRequest = Readonly<{
  method: SnsFandomYoutubeApiMethod;
  params: Readonly<Record<string, string>>;
}>;

export type SnsFandomYoutubeApiRequester = (
  request: SnsFandomYoutubeApiRequest,
) => Promise<unknown>;

export type SnsFandomYoutubeBoundedMeasurementInput = Readonly<{
  handoff: SnsFandomYoutubeQuotaMeasurementHandoffResult;
  measurementStartedAt: string;
  requestJson: SnsFandomYoutubeApiRequester;
  onRequestAttempt?: (request: SnsFandomYoutubeApiRequest) => void;
}>;

export type SnsFandomYoutubeBoundedMeasurementArtistReceipt = Readonly<{
  canonicalArtistId: string;
  youtubeChannelId: string;
  uploadsPlaylistId: string;
  playlistItemsPagesTraversed: number;
  includedVideoCount: number;
  channelListCalls: 1;
  playlistItemsListCalls: number;
  videosListCalls: number;
}>;

export type SnsFandomYoutubeBoundedMeasurementResult = Readonly<{
  contractVersion: typeof SNS_FANDOM_YOUTUBE_BOUNDED_MEASUREMENT_VERSION;
  state: 'bounded-measurement-completed';
  providerId: 'youtube-data-api';
  artistBindingManifestId: 'sns-fandom-youtube-audit-cohort-v1';
  artistChannelCount: 5;
  measurementWindowStart: string;
  measurementWindowEnd: string;
  measurementStartedAt: string;
  observedThrough: string;
  measurementWindowComplete: boolean;
  reactionSnapshotRunsPerDay: number;
  requestBatchingStrategy:
    'singleton-only-until-provider-batch-limit-evidence';
  requestedEndpoints: readonly [
    'youtube.channels.list',
    'youtube.playlistItems.list',
    'youtube.videos.list',
  ];
  artists: readonly SnsFandomYoutubeBoundedMeasurementArtistReceipt[];
  uploadManifestPageCountPerReactionRun: number;
  videoCountPerReactionRun: number;
  providerCallsObserved: Readonly<{
    channelsList: number;
    playlistItemsList: number;
    videosList: number;
    total: number;
  }>;
  quotaUnitsObserved: number;
  rawVideoIdentifiersStored: false;
  rawStatisticsStored: false;
  secretMaterialStored: false;
  automaticProviderCallAllowed: false;
  productionCollectionAuthorized: false;
  providerSubmissionAuthorized: false;
  schedulerMutationAuthorized: false;
}>;

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function validProviderDateTime(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

function object(value: unknown, reason: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(reason);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, reason: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new Error(reason);
  return value;
}

function string(value: unknown, reason: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(reason);
  }
  return value;
}

function sameExactEndpoints(values: readonly string[]): boolean {
  return JSON.stringify(values) === JSON.stringify([
    'youtube.channels.list',
    'youtube.playlistItems.list',
    'youtube.videos.list',
  ]);
}

function observedThrough(
  measurementStartedAt: string,
  measurementWindowEnd: string,
): string {
  return Date.parse(measurementStartedAt) < Date.parse(measurementWindowEnd)
    ? measurementStartedAt
    : measurementWindowEnd;
}

export async function executeSnsFandomYoutubeBoundedMeasurement(
  input: SnsFandomYoutubeBoundedMeasurementInput,
): Promise<SnsFandomYoutubeBoundedMeasurementResult> {
  const { handoff } = input;

  if (handoff.state !== 'measurement-handoff-ready') {
    throw new Error('sns_fandom_bounded_measurement_handoff_not_ready');
  }
  if (
    handoff.artistBindingManifestId !== 'sns-fandom-youtube-audit-cohort-v1'
    || handoff.artistChannelCount !== 5
    || handoff.tasks.length !== 5
  ) {
    throw new Error('sns_fandom_bounded_measurement_scope_mismatch');
  }
  if (!sameExactEndpoints(handoff.requestedEndpoints)) {
    throw new Error('sns_fandom_bounded_measurement_endpoint_scope_mismatch');
  }
  if (
    handoff.measurementWindowStart === null
    || handoff.measurementWindowEnd === null
    || handoff.reactionSnapshotRunsPerDay === null
  ) {
    throw new Error('sns_fandom_bounded_measurement_plan_missing');
  }
  if (!validIso(input.measurementStartedAt)) {
    throw new Error('sns_fandom_bounded_measurement_started_at_invalid');
  }
  if (
    Date.parse(input.measurementStartedAt)
    < Date.parse(handoff.measurementWindowStart)
  ) {
    throw new Error('sns_fandom_bounded_measurement_window_not_started');
  }

  const cutoff = observedThrough(
    input.measurementStartedAt,
    handoff.measurementWindowEnd,
  );
  const artists: SnsFandomYoutubeBoundedMeasurementArtistReceipt[] = [];
  const requestJson: SnsFandomYoutubeApiRequester = async (request) => {
    input.onRequestAttempt?.(request);
    return input.requestJson(request);
  };

  for (const task of handoff.tasks) {
    if (
      task.requestBatchingStrategy
      !== 'singleton-only-until-provider-batch-limit-evidence'
    ) {
      throw new Error('sns_fandom_bounded_measurement_batching_not_singleton');
    }

    const channelsRaw = object(
      await requestJson({
        method: 'channels.list',
        params: Object.freeze({
          part: 'contentDetails',
          id: task.youtubeChannelId,
        }),
      }),
      'sns_fandom_bounded_measurement_channels_response_invalid',
    );
    const channelItems = array(
      channelsRaw.items,
      'sns_fandom_bounded_measurement_channels_items_invalid',
    );
    if (channelItems.length !== 1) {
      throw new Error('sns_fandom_bounded_measurement_channel_not_exact');
    }
    const channel = object(
      channelItems[0],
      'sns_fandom_bounded_measurement_channel_invalid',
    );
    if (
      string(
        channel.id,
        'sns_fandom_bounded_measurement_channel_id_missing',
      ) !== task.youtubeChannelId
    ) {
      throw new Error('sns_fandom_bounded_measurement_channel_id_mismatch');
    }
    const contentDetails = object(
      channel.contentDetails,
      'sns_fandom_bounded_measurement_channel_content_details_missing',
    );
    const relatedPlaylists = object(
      contentDetails.relatedPlaylists,
      'sns_fandom_bounded_measurement_related_playlists_missing',
    );
    const uploadsPlaylistId = string(
      relatedPlaylists.uploads,
      'sns_fandom_bounded_measurement_uploads_playlist_missing',
    );

    let pageToken: string | null = null;
    const seenPageTokens = new Set<string>();
    let playlistItemsPagesTraversed = 0;
    const includedVideoIds = new Set<string>();

    do {
      if (pageToken !== null) {
        if (seenPageTokens.has(pageToken)) {
          throw new Error('sns_fandom_bounded_measurement_page_token_cycle');
        }
        seenPageTokens.add(pageToken);
      }

      const params: Record<string, string> = {
        part: 'contentDetails',
        playlistId: uploadsPlaylistId,
        maxResults: '50',
      };
      if (pageToken !== null) params.pageToken = pageToken;

      const playlistRaw = object(
        await requestJson({
          method: 'playlistItems.list',
          params: Object.freeze(params),
        }),
        'sns_fandom_bounded_measurement_playlist_response_invalid',
      );
      playlistItemsPagesTraversed += 1;

      const playlistItems = array(
        playlistRaw.items,
        'sns_fandom_bounded_measurement_playlist_items_invalid',
      );
      for (const itemRaw of playlistItems) {
        const item = object(
          itemRaw,
          'sns_fandom_bounded_measurement_playlist_item_invalid',
        );
        const itemContent = object(
          item.contentDetails,
          'sns_fandom_bounded_measurement_playlist_content_details_missing',
        );
        const videoId = string(
          itemContent.videoId,
          'sns_fandom_bounded_measurement_video_id_missing',
        );
        const publishedAt = string(
          itemContent.videoPublishedAt,
          'sns_fandom_bounded_measurement_video_published_at_missing',
        );
        if (!validProviderDateTime(publishedAt)) {
          throw new Error(
            'sns_fandom_bounded_measurement_video_published_at_invalid',
          );
        }

        if (
          Date.parse(publishedAt) >= Date.parse(handoff.measurementWindowStart)
          && Date.parse(publishedAt) <= Date.parse(cutoff)
        ) {
          includedVideoIds.add(videoId);
        }
      }

      pageToken = typeof playlistRaw.nextPageToken === 'string'
        && playlistRaw.nextPageToken.length > 0
        ? playlistRaw.nextPageToken
        : null;
    } while (pageToken !== null);

    let videosListCalls = 0;
    for (const videoId of includedVideoIds) {
      const videosRaw = object(
        await requestJson({
          method: 'videos.list',
          params: Object.freeze({
            part: 'statistics',
            id: videoId,
          }),
        }),
        'sns_fandom_bounded_measurement_videos_response_invalid',
      );
      const videoItems = array(
        videosRaw.items,
        'sns_fandom_bounded_measurement_videos_items_invalid',
      );
      if (videoItems.length !== 1) {
        throw new Error('sns_fandom_bounded_measurement_video_not_exact');
      }
      const video = object(
        videoItems[0],
        'sns_fandom_bounded_measurement_video_invalid',
      );
      if (
        string(video.id, 'sns_fandom_bounded_measurement_video_id_missing')
        !== videoId
      ) {
        throw new Error('sns_fandom_bounded_measurement_video_id_mismatch');
      }
      videosListCalls += 1;
    }

    artists.push(Object.freeze({
      canonicalArtistId: task.canonicalArtistId,
      youtubeChannelId: task.youtubeChannelId,
      uploadsPlaylistId,
      playlistItemsPagesTraversed,
      includedVideoCount: includedVideoIds.size,
      channelListCalls: 1 as const,
      playlistItemsListCalls: playlistItemsPagesTraversed,
      videosListCalls,
    }));
  }

  const uploadManifestPageCountPerReactionRun = artists.reduce(
    (sum, artist) => sum + artist.playlistItemsPagesTraversed,
    0,
  );
  const videoCountPerReactionRun = artists.reduce(
    (sum, artist) => sum + artist.includedVideoCount,
    0,
  );
  const channelsList = artists.length;
  const playlistItemsList = uploadManifestPageCountPerReactionRun;
  const videosList = artists.reduce(
    (sum, artist) => sum + artist.videosListCalls,
    0,
  );
  const total = channelsList + playlistItemsList + videosList;

  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_BOUNDED_MEASUREMENT_VERSION,
    state: 'bounded-measurement-completed' as const,
    providerId: 'youtube-data-api' as const,
    artistBindingManifestId: 'sns-fandom-youtube-audit-cohort-v1' as const,
    artistChannelCount: 5 as const,
    measurementWindowStart: handoff.measurementWindowStart,
    measurementWindowEnd: handoff.measurementWindowEnd,
    measurementStartedAt: input.measurementStartedAt,
    observedThrough: cutoff,
    measurementWindowComplete:
      Date.parse(cutoff) >= Date.parse(handoff.measurementWindowEnd),
    reactionSnapshotRunsPerDay: handoff.reactionSnapshotRunsPerDay,
    requestBatchingStrategy:
      'singleton-only-until-provider-batch-limit-evidence' as const,
    requestedEndpoints: Object.freeze([
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
    ] as const),
    artists: Object.freeze(artists),
    uploadManifestPageCountPerReactionRun,
    videoCountPerReactionRun,
    providerCallsObserved: Object.freeze({
      channelsList,
      playlistItemsList,
      videosList,
      total,
    }),
    quotaUnitsObserved: total,
    rawVideoIdentifiersStored: false as const,
    rawStatisticsStored: false as const,
    secretMaterialStored: false as const,
    automaticProviderCallAllowed: false as const,
    productionCollectionAuthorized: false as const,
    providerSubmissionAuthorized: false as const,
    schedulerMutationAuthorized: false as const,
  });
}
