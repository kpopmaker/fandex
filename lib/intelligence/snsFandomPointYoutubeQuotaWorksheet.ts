export const SNS_FANDOM_YOUTUBE_QUOTA_WORKSHEET_VERSION =
  'sns-fandom-youtube-quota-worksheet-v1' as const;

export type SnsFandomYoutubeQuotaEndpoint =
  | 'youtube.channels.list'
  | 'youtube.playlistItems.list'
  | 'youtube.videos.list'
  | 'youtube.commentThreads.list'
  | 'youtube.comments.list';

export type SnsFandomYoutubeQuotaWorksheetInput = Readonly<{
  providerClientRef: string;
  measuredAt: string;
  requestedEndpoints: readonly SnsFandomYoutubeQuotaEndpoint[];
  measuredUsage: Readonly<{
    artistChannelCount: number;
    uploadManifestPageCountPerReactionRun: number;
    videoCountPerReactionRun: number;
    commentThreadPageCountPerPersistenceRun: number;
    commentPageCountPerPersistenceRun: number;
    reactionSnapshotRunsPerDay: number;
    commentPersistenceRunsPerDay: number;
  }>;
  providerLimits: Readonly<{
    maxChannelIdsPerCall: number;
    maxVideoIdsPerCall: number;
  }>;
  quotaUnitsPerCall: Readonly<Record<SnsFandomYoutubeQuotaEndpoint, number>>;
  evidence: Readonly<{
    measuredUsageEvidenceRef: string;
    cadenceEvidenceRef: string;
    providerBatchLimitEvidenceRef: string;
    providerQuotaCostEvidenceRef: string;
  }>;
}>;

export type SnsFandomYoutubeQuotaLineItem = Readonly<{
  endpoint: SnsFandomYoutubeQuotaEndpoint;
  callsPerDay: number;
  quotaUnitsPerCall: number;
  quotaUnitsPerDay: number;
}>;

export type SnsFandomYoutubeQuotaWorksheetResult = Readonly<{
  contractVersion: typeof SNS_FANDOM_YOUTUBE_QUOTA_WORKSHEET_VERSION;
  state: 'blocked' | 'quota-evidence-ready';
  providerClientRef: string;
  measuredAt: string;
  requestedEndpoints: readonly SnsFandomYoutubeQuotaEndpoint[];
  lineItems: readonly SnsFandomYoutubeQuotaLineItem[];
  minimumProjectedQuotaUnitsPerDay: number | null;
  requestedQuotaUnitsPerDay: null;
  headroomFactorApplied: false;
  arbitraryCadenceApplied: false;
  arbitraryProviderLimitApplied: false;
  arbitraryQuotaCostApplied: false;
  submissionEvidenceEligible: boolean;
  blockers: readonly string[];
}>;

const SUPPORTED_ENDPOINTS: readonly SnsFandomYoutubeQuotaEndpoint[] =
  Object.freeze([
    'youtube.channels.list',
    'youtube.playlistItems.list',
    'youtube.videos.list',
    'youtube.commentThreads.list',
    'youtube.comments.list',
  ]);

const REQUIRED_REACTION_ENDPOINTS: readonly SnsFandomYoutubeQuotaEndpoint[] =
  Object.freeze([
    'youtube.channels.list',
    'youtube.playlistItems.list',
    'youtube.videos.list',
  ]);

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function present(value: string): boolean {
  return value.trim().length > 0;
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
  ].some((needle) => normalized.includes(needle));
}

function uniqueSorted<T extends string>(values: readonly T[]): T[] {
  return Array.from(new Set(values)).sort() as T[];
}

function positiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function nonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function safeProduct(...values: readonly number[]): number | null {
  let product = 1;
  for (const value of values) {
    product *= value;
    if (!Number.isSafeInteger(product)) return null;
  }
  return product;
}

function lineItem(
  endpoint: SnsFandomYoutubeQuotaEndpoint,
  callsPerDay: number,
  quotaUnitsPerCall: number,
): SnsFandomYoutubeQuotaLineItem | null {
  const quotaUnitsPerDay = safeProduct(callsPerDay, quotaUnitsPerCall);
  if (quotaUnitsPerDay === null) return null;
  return Object.freeze({
    endpoint,
    callsPerDay,
    quotaUnitsPerCall,
    quotaUnitsPerDay,
  });
}

export function evaluateSnsFandomYoutubeQuotaWorksheet(
  input: SnsFandomYoutubeQuotaWorksheetInput,
): SnsFandomYoutubeQuotaWorksheetResult {
  const blockers: string[] = [];

  if (!present(input.providerClientRef)) {
    blockers.push('youtube-quota-provider-client-ref-empty');
  }
  if (!validIso(input.measuredAt)) {
    blockers.push('youtube-quota-measured-at-invalid');
  }

  const requestedEndpoints = uniqueSorted(input.requestedEndpoints);
  if (requestedEndpoints.length !== input.requestedEndpoints.length) {
    blockers.push('youtube-quota-endpoint-duplicate');
  }

  for (const endpoint of input.requestedEndpoints) {
    if (!SUPPORTED_ENDPOINTS.includes(endpoint)) {
      blockers.push('youtube-quota-endpoint-unsupported');
      break;
    }
  }

  for (const endpoint of REQUIRED_REACTION_ENDPOINTS) {
    if (!requestedEndpoints.includes(endpoint)) {
      blockers.push('youtube-quota-required-reaction-endpoint-missing');
      break;
    }
  }

  const m = input.measuredUsage;
  if (!positiveSafeInteger(m.artistChannelCount)) {
    blockers.push('youtube-quota-artist-channel-count-invalid');
  }
  if (!positiveSafeInteger(m.uploadManifestPageCountPerReactionRun)) {
    blockers.push('youtube-quota-upload-page-count-invalid');
  }
  if (!positiveSafeInteger(m.videoCountPerReactionRun)) {
    blockers.push('youtube-quota-video-count-invalid');
  }
  if (!positiveSafeInteger(m.reactionSnapshotRunsPerDay)) {
    blockers.push('youtube-quota-reaction-cadence-invalid');
  }
  if (!nonNegativeSafeInteger(m.commentThreadPageCountPerPersistenceRun)) {
    blockers.push('youtube-quota-comment-thread-page-count-invalid');
  }
  if (!nonNegativeSafeInteger(m.commentPageCountPerPersistenceRun)) {
    blockers.push('youtube-quota-comment-page-count-invalid');
  }
  if (!nonNegativeSafeInteger(m.commentPersistenceRunsPerDay)) {
    blockers.push('youtube-quota-comment-cadence-invalid');
  }

  const commentThreadsIncluded = requestedEndpoints.includes(
    'youtube.commentThreads.list',
  );
  const commentsIncluded = requestedEndpoints.includes(
    'youtube.comments.list',
  );

  if (commentsIncluded && !commentThreadsIncluded) {
    blockers.push('youtube-quota-comments-require-comment-threads-scope');
  }

  if (commentThreadsIncluded) {
    if (!positiveSafeInteger(m.commentPersistenceRunsPerDay)) {
      blockers.push('youtube-quota-comment-cadence-required');
    }
    if (!positiveSafeInteger(m.commentThreadPageCountPerPersistenceRun)) {
      blockers.push('youtube-quota-comment-thread-pages-required');
    }
  } else if (
    m.commentPersistenceRunsPerDay !== 0
    || m.commentThreadPageCountPerPersistenceRun !== 0
  ) {
    blockers.push('youtube-quota-comment-thread-usage-outside-scope');
  }

  if (commentsIncluded) {
    if (!positiveSafeInteger(m.commentPageCountPerPersistenceRun)) {
      blockers.push('youtube-quota-comment-pages-required');
    }
  } else if (m.commentPageCountPerPersistenceRun !== 0) {
    blockers.push('youtube-quota-comment-usage-outside-scope');
  }

  if (!positiveSafeInteger(input.providerLimits.maxChannelIdsPerCall)) {
    blockers.push('youtube-quota-channel-batch-limit-invalid');
  }
  if (!positiveSafeInteger(input.providerLimits.maxVideoIdsPerCall)) {
    blockers.push('youtube-quota-video-batch-limit-invalid');
  }

  for (const endpoint of requestedEndpoints) {
    const cost = input.quotaUnitsPerCall[endpoint];
    if (!positiveSafeInteger(cost)) {
      blockers.push('youtube-quota-cost-invalid');
      break;
    }
  }

  for (const ref of Object.values(input.evidence)) {
    if (!present(ref)) {
      blockers.push('youtube-quota-evidence-ref-missing');
      break;
    }
    if (secretLike(ref)) {
      blockers.push('youtube-quota-evidence-ref-secret-like');
      break;
    }
  }

  const lineItems: SnsFandomYoutubeQuotaLineItem[] = [];

  if (
    positiveSafeInteger(m.artistChannelCount)
    && positiveSafeInteger(m.reactionSnapshotRunsPerDay)
    && positiveSafeInteger(input.providerLimits.maxChannelIdsPerCall)
  ) {
    const callsPerRun = Math.ceil(
      m.artistChannelCount / input.providerLimits.maxChannelIdsPerCall,
    );
    const callsPerDay = safeProduct(callsPerRun, m.reactionSnapshotRunsPerDay);
    if (callsPerDay === null) {
      blockers.push('youtube-quota-arithmetic-overflow');
    } else {
      const item = lineItem(
        'youtube.channels.list',
        callsPerDay,
        input.quotaUnitsPerCall['youtube.channels.list'],
      );
      if (item === null) {
        blockers.push('youtube-quota-arithmetic-overflow');
      } else {
        lineItems.push(item);
      }
    }
  }

  if (
    positiveSafeInteger(m.uploadManifestPageCountPerReactionRun)
    && positiveSafeInteger(m.reactionSnapshotRunsPerDay)
  ) {
    const callsPerDay = safeProduct(
      m.uploadManifestPageCountPerReactionRun,
      m.reactionSnapshotRunsPerDay,
    );
    if (callsPerDay === null) {
      blockers.push('youtube-quota-arithmetic-overflow');
    } else {
      const item = lineItem(
        'youtube.playlistItems.list',
        callsPerDay,
        input.quotaUnitsPerCall['youtube.playlistItems.list'],
      );
      if (item === null) {
        blockers.push('youtube-quota-arithmetic-overflow');
      } else {
        lineItems.push(item);
      }
    }
  }

  if (
    positiveSafeInteger(m.videoCountPerReactionRun)
    && positiveSafeInteger(m.reactionSnapshotRunsPerDay)
    && positiveSafeInteger(input.providerLimits.maxVideoIdsPerCall)
  ) {
    const callsPerRun = Math.ceil(
      m.videoCountPerReactionRun / input.providerLimits.maxVideoIdsPerCall,
    );
    const callsPerDay = safeProduct(callsPerRun, m.reactionSnapshotRunsPerDay);
    if (callsPerDay === null) {
      blockers.push('youtube-quota-arithmetic-overflow');
    } else {
      const item = lineItem(
        'youtube.videos.list',
        callsPerDay,
        input.quotaUnitsPerCall['youtube.videos.list'],
      );
      if (item === null) {
        blockers.push('youtube-quota-arithmetic-overflow');
      } else {
        lineItems.push(item);
      }
    }
  }

  if (
    commentThreadsIncluded
    && positiveSafeInteger(m.commentThreadPageCountPerPersistenceRun)
    && positiveSafeInteger(m.commentPersistenceRunsPerDay)
  ) {
    const callsPerDay = safeProduct(
      m.commentThreadPageCountPerPersistenceRun,
      m.commentPersistenceRunsPerDay,
    );
    if (callsPerDay === null) {
      blockers.push('youtube-quota-arithmetic-overflow');
    } else {
      const item = lineItem(
        'youtube.commentThreads.list',
        callsPerDay,
        input.quotaUnitsPerCall['youtube.commentThreads.list'],
      );
      if (item === null) {
        blockers.push('youtube-quota-arithmetic-overflow');
      } else {
        lineItems.push(item);
      }
    }
  }

  if (
    commentsIncluded
    && positiveSafeInteger(m.commentPageCountPerPersistenceRun)
    && positiveSafeInteger(m.commentPersistenceRunsPerDay)
  ) {
    const callsPerDay = safeProduct(
      m.commentPageCountPerPersistenceRun,
      m.commentPersistenceRunsPerDay,
    );
    if (callsPerDay === null) {
      blockers.push('youtube-quota-arithmetic-overflow');
    } else {
      const item = lineItem(
        'youtube.comments.list',
        callsPerDay,
        input.quotaUnitsPerCall['youtube.comments.list'],
      );
      if (item === null) {
        blockers.push('youtube-quota-arithmetic-overflow');
      } else {
        lineItems.push(item);
      }
    }
  }

  const producedEndpoints = uniqueSorted(
    lineItems.map((item) => item.endpoint),
  );
  if (
    JSON.stringify(producedEndpoints)
      !== JSON.stringify(requestedEndpoints)
  ) {
    blockers.push('youtube-quota-line-item-scope-mismatch');
  }

  let total = 0;
  for (const item of lineItems) {
    total += item.quotaUnitsPerDay;
    if (!Number.isSafeInteger(total)) {
      blockers.push('youtube-quota-arithmetic-overflow');
      break;
    }
  }

  const dedupedBlockers = uniqueSorted(blockers);
  const ready = dedupedBlockers.length === 0;

  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_QUOTA_WORKSHEET_VERSION,
    state: ready ? 'quota-evidence-ready' as const : 'blocked' as const,
    providerClientRef: input.providerClientRef,
    measuredAt: input.measuredAt,
    requestedEndpoints: Object.freeze([...requestedEndpoints]),
    lineItems: Object.freeze([...lineItems]),
    minimumProjectedQuotaUnitsPerDay: ready ? total : null,
    requestedQuotaUnitsPerDay: null,
    headroomFactorApplied: false as const,
    arbitraryCadenceApplied: false as const,
    arbitraryProviderLimitApplied: false as const,
    arbitraryQuotaCostApplied: false as const,
    submissionEvidenceEligible: ready,
    blockers: Object.freeze(dedupedBlockers),
  });
}
