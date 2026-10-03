export const SNS_FANDOM_YOUTUBE_ANALYTICS_REPORTING_SURFACE_VERSION =
  'sns-fandom-youtube-analytics-reporting-surface-v1' as const;

export type SnsFandomYoutubeAnalyticsReportingArtistRow = Readonly<{
  canonicalArtistId: string;
  playlistItemsPagesTraversed: number;
  includedVideoCount: number;
}>;

export type SnsFandomYoutubeAnalyticsReportingSurface =
  | Readonly<{
      contractVersion:
        typeof SNS_FANDOM_YOUTUBE_ANALYTICS_REPORTING_SURFACE_VERSION;
      state: 'blocked';
      blockers: readonly string[];
      renderAllowed: false;
      screenshotCandidateEligible: false;
    }>
  | Readonly<{
      contractVersion:
        typeof SNS_FANDOM_YOUTUBE_ANALYTICS_REPORTING_SURFACE_VERSION;
      state: 'real-bounded-snapshot-ready';
      blockers: readonly [];
      renderAllowed: true;
      screenshotCandidateEligible: true;
      evidenceClass: 'real-provider-bounded-snapshot';
      measurementWindowStart: string;
      measurementWindowEnd: string;
      measurementStartedAt: string;
      measuredAt: string;
      observedThrough: string;
      measurementWindowComplete: false;
      quotaWorksheetEligible: false;
      finalOwnerEvidencePromotionAllowed: false;
      reactionSnapshotRunsPerDay: number;
      artistChannelCount: number;
      uploadManifestPageCountPerReactionRun: number;
      videoCountPerReactionRun: number;
      trueZeroVideoCountObserved: boolean;
      providerCallsObserved: Readonly<{
        channelsList: number;
        playlistItemsList: number;
        videosList: number;
        total: number;
      }>;
      quotaUnitsObserved: number;
      perArtist: readonly SnsFandomYoutubeAnalyticsReportingArtistRow[];
      lineage: Readonly<{
        authorizationEvidenceRef: string;
        workflowRunId: string;
        artifactId: string;
        durableResultEvidenceRef: string;
      }>;
      rawVideoIdentifiersStored: false;
      rawStatisticsStored: false;
      secretMaterialStored: false;
      productionCollectionAuthorized: false;
      providerSubmissionAuthorized: false;
      schedulerMutationAuthorized: false;
    }>;

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value
    : null;
}

function exactIso(value: unknown): string | null {
  const candidate = text(value);
  if (candidate === null) return null;
  const parsed = Date.parse(candidate);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString() === candidate ? candidate : null;
}

function nonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number'
    && Number.isSafeInteger(value)
    && value >= 0
    ? value
    : null;
}

function positiveInteger(value: unknown): number | null {
  const parsed = nonNegativeInteger(value);
  return parsed !== null && parsed > 0 ? parsed : null;
}

function secretLike(value: string): boolean {
  const normalized = value.toLowerCase();
  return [
    'password=',
    'access_token=',
    'refresh_token=',
    'client_secret=',
    'authorization: bearer ',
    'api_key=',
    'apikey=',
    'key=aiza',
  ].some((needle) => normalized.includes(needle));
}

function blocked(blockers: readonly string[]): SnsFandomYoutubeAnalyticsReportingSurface {
  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_ANALYTICS_REPORTING_SURFACE_VERSION,
    state: 'blocked' as const,
    blockers: Object.freeze([...new Set(blockers)].sort()),
    renderAllowed: false as const,
    screenshotCandidateEligible: false as const,
  });
}

export function evaluateSnsFandomYoutubeAnalyticsReportingSurface(
  value: unknown,
): SnsFandomYoutubeAnalyticsReportingSurface {
  const input = record(value);
  if (input === null) return blocked(['snapshot-record-missing']);

  const blockers: string[] = [];
  if (input.state !== 'current-plan-bounded-snapshot-recorded') {
    blockers.push('snapshot-state-invalid');
  }
  if (input.workflowConclusion !== 'success') {
    blockers.push('workflow-not-successful');
  }
  if (input.measurementWindowComplete !== false) {
    blockers.push('measurement-window-completeness-must-remain-false');
  }
  if (input.quotaWorksheetEligibilityReason !== 'measurement-window-incomplete') {
    blockers.push('quota-worksheet-eligibility-reason-invalid');
  }

  const measurementWindowStart = exactIso(input.measurementWindowStart);
  const measurementWindowEnd = exactIso(input.measurementWindowEnd);
  const measurementStartedAt = exactIso(input.measurementStartedAt);
  const measuredAt = exactIso(input.measuredAt);
  const observedThrough = exactIso(input.observedThrough);

  if (measurementWindowStart === null) blockers.push('measurement-window-start-invalid');
  if (measurementWindowEnd === null) blockers.push('measurement-window-end-invalid');
  if (measurementStartedAt === null) blockers.push('measurement-started-at-invalid');
  if (measuredAt === null) blockers.push('measured-at-invalid');
  if (observedThrough === null) blockers.push('observed-through-invalid');

  if (
    measurementWindowStart !== null
    && measurementWindowEnd !== null
    && Date.parse(measurementWindowStart) >= Date.parse(measurementWindowEnd)
  ) {
    blockers.push('measurement-window-order-invalid');
  }
  if (
    measurementWindowStart !== null
    && measurementStartedAt !== null
    && Date.parse(measurementStartedAt) < Date.parse(measurementWindowStart)
  ) {
    blockers.push('measurement-before-window-start');
  }
  if (
    measurementStartedAt !== null
    && measuredAt !== null
    && Date.parse(measuredAt) < Date.parse(measurementStartedAt)
  ) {
    blockers.push('measured-at-before-start');
  }

  const reactionSnapshotRunsPerDay = positiveInteger(input.reactionSnapshotRunsPerDay);
  const artistChannelCount = positiveInteger(input.artistChannelCount);
  const uploadManifestPageCountPerReactionRun =
    positiveInteger(input.uploadManifestPageCountPerReactionRun);
  const videoCountPerReactionRun = nonNegativeInteger(input.videoCountPerReactionRun);
  const quotaUnitsObserved = nonNegativeInteger(input.quotaUnitsObserved);

  if (reactionSnapshotRunsPerDay === null) blockers.push('reaction-cadence-invalid');
  if (artistChannelCount === null) blockers.push('artist-channel-count-invalid');
  if (uploadManifestPageCountPerReactionRun === null) blockers.push('page-count-invalid');
  if (videoCountPerReactionRun === null) blockers.push('video-count-invalid');
  if (quotaUnitsObserved === null) blockers.push('quota-units-invalid');

  const trueZeroVideoCountObserved = input.trueZeroVideoCountObserved === true;
  if (
    videoCountPerReactionRun !== null
    && ((videoCountPerReactionRun === 0) !== trueZeroVideoCountObserved)
  ) {
    blockers.push('true-zero-marker-mismatch');
  }

  const calls = record(input.providerCallsObserved);
  const channelsList = nonNegativeInteger(calls?.channelsList);
  const playlistItemsList = nonNegativeInteger(calls?.playlistItemsList);
  const videosList = nonNegativeInteger(calls?.videosList);
  const total = nonNegativeInteger(calls?.total);
  if (
    channelsList === null
    || playlistItemsList === null
    || videosList === null
    || total === null
  ) {
    blockers.push('provider-call-count-invalid');
  } else {
    if (channelsList + playlistItemsList + videosList !== total) {
      blockers.push('provider-call-total-mismatch');
    }
    if (
      artistChannelCount !== null
      && channelsList !== artistChannelCount
    ) {
      blockers.push('provider-channel-call-count-mismatch');
    }
    if (
      uploadManifestPageCountPerReactionRun !== null
      && playlistItemsList !== uploadManifestPageCountPerReactionRun
    ) {
      blockers.push('provider-playlist-call-count-mismatch');
    }
    if (
      videoCountPerReactionRun !== null
      && videosList !== videoCountPerReactionRun
    ) {
      blockers.push('provider-video-call-count-mismatch');
    }
    if (
      quotaUnitsObserved !== null
      && quotaUnitsObserved !== total
    ) {
      blockers.push('quota-units-provider-call-mismatch');
    }
  }

  const perArtistRaw = Array.isArray(input.perArtist) ? input.perArtist : [];
  const perArtist: SnsFandomYoutubeAnalyticsReportingArtistRow[] = [];
  const artistIds = new Set<string>();
  for (const rowValue of perArtistRaw) {
    const row = record(rowValue);
    const canonicalArtistId = text(row?.canonicalArtistId);
    const playlistItemsPagesTraversed =
      nonNegativeInteger(row?.playlistItemsPagesTraversed);
    const includedVideoCount = nonNegativeInteger(row?.includedVideoCount);
    if (
      canonicalArtistId === null
      || playlistItemsPagesTraversed === null
      || includedVideoCount === null
    ) {
      blockers.push('per-artist-row-invalid');
      continue;
    }
    if (artistIds.has(canonicalArtistId)) {
      blockers.push('per-artist-id-duplicate');
      continue;
    }
    artistIds.add(canonicalArtistId);
    perArtist.push(Object.freeze({
      canonicalArtistId,
      playlistItemsPagesTraversed,
      includedVideoCount,
    }));
  }

  if (artistChannelCount !== null && perArtist.length !== artistChannelCount) {
    blockers.push('per-artist-count-mismatch');
  }
  if (
    uploadManifestPageCountPerReactionRun !== null
    && perArtist.reduce((sum, row) => sum + row.playlistItemsPagesTraversed, 0)
      !== uploadManifestPageCountPerReactionRun
  ) {
    blockers.push('per-artist-page-sum-mismatch');
  }
  if (
    videoCountPerReactionRun !== null
    && perArtist.reduce((sum, row) => sum + row.includedVideoCount, 0)
      !== videoCountPerReactionRun
  ) {
    blockers.push('per-artist-video-sum-mismatch');
  }

  const authorizationEvidenceRef = text(input.authorizationEvidenceRef);
  const workflowRunId = text(input.workflowRunId);
  const artifactId = text(input.artifactId);
  const durableResultEvidenceRef = text(input.durableResultEvidenceRef);
  for (const [name, ref] of [
    ['authorization-evidence-ref', authorizationEvidenceRef],
    ['workflow-run-id', workflowRunId],
    ['artifact-id', artifactId],
    ['durable-result-evidence-ref', durableResultEvidenceRef],
  ] as const) {
    if (ref === null) blockers.push(`${name}-missing`);
    else if (secretLike(ref)) blockers.push(`${name}-secret-like`);
  }

  if (input.rawVideoIdentifiersStored !== false) blockers.push('raw-video-identifiers-stored');
  if (input.rawStatisticsStored !== false) blockers.push('raw-statistics-stored');
  if (input.secretMaterialStored !== false) blockers.push('secret-material-stored');
  if (input.quotaWorksheetEligible !== false) blockers.push('quota-worksheet-eligibility-must-remain-false');
  if (input.finalOwnerEvidencePromotionAllowed !== false) blockers.push('final-owner-promotion-must-remain-false');
  if (input.productionCollectionAuthorized !== false) blockers.push('production-collection-must-remain-false');
  if (input.providerSubmissionAuthorized !== false) blockers.push('provider-submission-must-remain-false');
  if (input.schedulerMutationAuthorized !== false) blockers.push('scheduler-mutation-must-remain-false');

  if (blockers.length > 0) return blocked(blockers);

  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_ANALYTICS_REPORTING_SURFACE_VERSION,
    state: 'real-bounded-snapshot-ready' as const,
    blockers: Object.freeze([]) as readonly [],
    renderAllowed: true as const,
    screenshotCandidateEligible: true as const,
    evidenceClass: 'real-provider-bounded-snapshot' as const,
    measurementWindowStart: measurementWindowStart as string,
    measurementWindowEnd: measurementWindowEnd as string,
    measurementStartedAt: measurementStartedAt as string,
    measuredAt: measuredAt as string,
    observedThrough: observedThrough as string,
    measurementWindowComplete: false as const,
    quotaWorksheetEligible: false as const,
    finalOwnerEvidencePromotionAllowed: false as const,
    reactionSnapshotRunsPerDay: reactionSnapshotRunsPerDay as number,
    artistChannelCount: artistChannelCount as number,
    uploadManifestPageCountPerReactionRun:
      uploadManifestPageCountPerReactionRun as number,
    videoCountPerReactionRun: videoCountPerReactionRun as number,
    trueZeroVideoCountObserved,
    providerCallsObserved: Object.freeze({
      channelsList: channelsList as number,
      playlistItemsList: playlistItemsList as number,
      videosList: videosList as number,
      total: total as number,
    }),
    quotaUnitsObserved: quotaUnitsObserved as number,
    perArtist: Object.freeze(perArtist),
    lineage: Object.freeze({
      authorizationEvidenceRef: authorizationEvidenceRef as string,
      workflowRunId: workflowRunId as string,
      artifactId: artifactId as string,
      durableResultEvidenceRef: durableResultEvidenceRef as string,
    }),
    rawVideoIdentifiersStored: false as const,
    rawStatisticsStored: false as const,
    secretMaterialStored: false as const,
    productionCollectionAuthorized: false as const,
    providerSubmissionAuthorized: false as const,
    schedulerMutationAuthorized: false as const,
  });
}
