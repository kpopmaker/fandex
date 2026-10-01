export const SNS_FANDOM_YOUTUBE_CONTENT_MANIFEST_VERSION =
  'sns-fandom-youtube-content-manifest-v1' as const;

export type SnsFandomYoutubeContentManifestItem = Readonly<{
  videoId: string;
  publishedAt: string;
}>;

export type SnsFandomYoutubeContentManifest = Readonly<{
  contractVersion: typeof SNS_FANDOM_YOUTUBE_CONTENT_MANIFEST_VERSION;
  canonicalArtistId: string;
  youtubeChannelId: string;
  providerClientRef: string;
  selectionRule: 'official-channel-all-uploads-in-published-window';
  windowStart: string;
  windowEnd: string;
  uploadsPlaylistId: string;
  providerEndpoints: readonly [
    'youtube.channels.list',
    'youtube.playlistItems.list',
  ];
  pagination: Readonly<{
    pageCount: number;
    terminalNextPageToken: null;
    terminalPageEvidenceRef: string;
  }>;
  items: readonly SnsFandomYoutubeContentManifestItem[];
  evidenceRef: string;
}>;

export type SnsFandomYoutubeContentManifestValidation = Readonly<{
  ok: boolean;
  blockers: readonly string[];
  selectedVideoIds: readonly string[];
}>;

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

export function validateSnsFandomYoutubeContentManifest(
  manifest: SnsFandomYoutubeContentManifest,
): SnsFandomYoutubeContentManifestValidation {
  const blockers: string[] = [];

  if (
    manifest.contractVersion
      !== SNS_FANDOM_YOUTUBE_CONTENT_MANIFEST_VERSION
  ) {
    blockers.push('youtube-content-manifest-version-invalid');
  }
  if (manifest.canonicalArtistId.trim().length === 0) {
    blockers.push('youtube-content-manifest-canonical-artist-id-empty');
  }
  if (manifest.youtubeChannelId.trim().length === 0) {
    blockers.push('youtube-content-manifest-channel-id-empty');
  }
  if (manifest.providerClientRef.trim().length === 0) {
    blockers.push('youtube-content-manifest-client-ref-empty');
  }
  if (
    manifest.selectionRule
      !== 'official-channel-all-uploads-in-published-window'
  ) {
    blockers.push('youtube-content-selection-rule-invalid');
  }
  if (!validIso(manifest.windowStart) || !validIso(manifest.windowEnd)) {
    blockers.push('youtube-content-window-invalid');
  } else if (Date.parse(manifest.windowStart) > Date.parse(manifest.windowEnd)) {
    blockers.push('youtube-content-window-order-invalid');
  }
  if (manifest.uploadsPlaylistId.trim().length === 0) {
    blockers.push('youtube-content-uploads-playlist-id-empty');
  }
  if (
    manifest.providerEndpoints.length !== 2
    || manifest.providerEndpoints[0] !== 'youtube.channels.list'
    || manifest.providerEndpoints[1] !== 'youtube.playlistItems.list'
  ) {
    blockers.push('youtube-content-selection-endpoint-chain-invalid');
  }
  if (
    !Number.isSafeInteger(manifest.pagination.pageCount)
    || manifest.pagination.pageCount < 1
  ) {
    blockers.push('youtube-content-pagination-page-count-invalid');
  }
  if (manifest.pagination.terminalNextPageToken !== null) {
    blockers.push('youtube-content-pagination-not-terminal');
  }
  if (
    manifest.pagination.terminalPageEvidenceRef.trim().length === 0
    || manifest.evidenceRef.trim().length === 0
  ) {
    blockers.push('youtube-content-manifest-evidence-ref-empty');
  }

  const videoIds = new Set<string>();
  for (const item of manifest.items) {
    if (item.videoId.trim().length === 0) {
      blockers.push('youtube-content-manifest-video-id-empty');
      continue;
    }
    if (videoIds.has(item.videoId)) {
      blockers.push('youtube-content-manifest-video-id-duplicate');
      continue;
    }
    videoIds.add(item.videoId);

    if (!validIso(item.publishedAt)) {
      blockers.push('youtube-content-manifest-published-at-invalid');
      continue;
    }
    if (
      validIso(manifest.windowStart)
      && validIso(manifest.windowEnd)
      && (
        Date.parse(item.publishedAt) < Date.parse(manifest.windowStart)
        || Date.parse(item.publishedAt) > Date.parse(manifest.windowEnd)
      )
    ) {
      blockers.push('youtube-content-manifest-item-outside-window');
    }
  }

  return Object.freeze({
    ok: blockers.length === 0,
    blockers: Object.freeze(Array.from(new Set(blockers))),
    selectedVideoIds: Object.freeze(Array.from(videoIds).sort()),
  });
}

export type SnsFandomYoutubeContentSelectionResult = Readonly<{
  contractVersion: typeof SNS_FANDOM_YOUTUBE_CONTENT_MANIFEST_VERSION;
  state: 'selection-ready' | 'selection-blocked';
  canonicalArtistId: string;
  youtubeChannelId: string;
  providerClientRef: string;
  windowStart: string;
  windowEnd: string;
  selectedVideoIds: readonly string[];
  selectionRule: 'official-channel-all-uploads-in-published-window';
  aggregationMethod: null;
  aggregateValue: null;
  blockers: readonly string[];
}>;

export function evaluateSnsFandomYoutubeContentSelection(
  input: Readonly<{
    manifest: SnsFandomYoutubeContentManifest;
    snapshotVideoIds: readonly string[];
    snapshotObservedAt: string;
  }>,
): SnsFandomYoutubeContentSelectionResult {
  const validation = validateSnsFandomYoutubeContentManifest(input.manifest);
  const blockers = [...validation.blockers];

  if (!validIso(input.snapshotObservedAt)) {
    blockers.push('youtube-content-snapshot-observed-at-invalid');
  } else if (
    validIso(input.manifest.windowEnd)
    && Date.parse(input.snapshotObservedAt) < Date.parse(input.manifest.windowEnd)
  ) {
    blockers.push('youtube-content-snapshot-precedes-window-end');
  }

  const snapshotVideoIds = Array.from(new Set(input.snapshotVideoIds)).sort();
  if (snapshotVideoIds.length !== input.snapshotVideoIds.length) {
    blockers.push('youtube-content-snapshot-video-id-duplicate');
  }
  if (
    JSON.stringify(snapshotVideoIds)
      !== JSON.stringify(validation.selectedVideoIds)
  ) {
    blockers.push('youtube-content-snapshot-manifest-set-mismatch');
  }

  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_CONTENT_MANIFEST_VERSION,
    state: blockers.length === 0
      ? 'selection-ready' as const
      : 'selection-blocked' as const,
    canonicalArtistId: input.manifest.canonicalArtistId,
    youtubeChannelId: input.manifest.youtubeChannelId,
    providerClientRef: input.manifest.providerClientRef,
    windowStart: input.manifest.windowStart,
    windowEnd: input.manifest.windowEnd,
    selectedVideoIds: validation.selectedVideoIds,
    selectionRule: input.manifest.selectionRule,
    aggregationMethod: null,
    aggregateValue: null,
    blockers: Object.freeze(Array.from(new Set(blockers))),
  });
}
