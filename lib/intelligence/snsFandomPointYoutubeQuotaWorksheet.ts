import {
  type SnsFandomYoutubeAuditArtistBindingManifestResult,
} from './snsFandomPointYoutubeAuditArtistBindingManifest';

export const SNS_FANDOM_YOUTUBE_QUOTA_WORKSHEET_VERSION =
  'sns-fandom-youtube-quota-worksheet-v1' as const;

export type SnsFandomYoutubeQuotaEndpoint =
  | 'youtube.channels.list'
  | 'youtube.playlistItems.list'
  | 'youtube.videos.list'
  | 'youtube.commentThreads.list'
  | 'youtube.comments.list';

export type SnsFandomYoutubeQuotaBatchingStrategy =
  | 'singleton-only-until-provider-batch-limit-evidence'
  | 'provider-limit-evidenced';

export type SnsFandomYoutubeQuotaWorksheetInput = Readonly<{
  providerClientRef: string;
  measuredAt: string;
  requestedEndpoints: readonly SnsFandomYoutubeQuotaEndpoint[];
  artistBindingManifest: SnsFandomYoutubeAuditArtistBindingManifestResult | null;
  measuredUsage: Readonly<{
    artistChannelCount: number;
    uploadManifestPageCountPerReactionRun: number;
    videoCountPerReactionRun: number;
    commentThreadPageCountPerPersistenceRun: number;
    commentPageCountPerPersistenceRun: number;
    reactionSnapshotRunsPerDay: number;
    commentPersistenceRunsPerDay: number;
  }>;
  requestBatching: Readonly<{
    strategy: SnsFandomYoutubeQuotaBatchingStrategy;
    channelIdsPerCall: number;
    videoIdsPerCall: number;
  }>;
  providerLimits: Readonly<{
    maxChannelIdsPerCall: number | null;
    maxVideoIdsPerCall: number | null;
  }>;
  quotaUnitsPerCall: Readonly<Record<SnsFandomYoutubeQuotaEndpoint, number>>;
  evidence: Readonly<{
    measuredUsageEvidenceRef: string;
    cadenceEvidenceRef: string;
    requestBatchingEvidenceRef: string;
    providerBatchLimitEvidenceRef: string | null;
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
  artistBindingManifestValidated: boolean;
  artistBindingManifestId: string | null;
  artistChannelCount: number | null;
  lineItems: readonly SnsFandomYoutubeQuotaLineItem[];
  requestBatchingStrategy: SnsFandomYoutubeQuotaBatchingStrategy;
  channelIdsPerCall: number;
  videoIdsPerCall: number;
  providerBatchLimitEvidenceRequired: boolean;
  providerBatchLimitEvidenceValidated: boolean;
  providerLimitClaimed: boolean;
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

  const artistBindingManifest = input.artistBindingManifest;
  let artistBindingManifestValidated = false;

  if (artistBindingManifest === null) {
    blockers.push('youtube-quota-artist-binding-manifest-missing');
  } else {
    if (
      artistBindingManifest.state !== 'binding-manifest-ready'
      || !artistBindingManifest.submissionEvidenceEligible
      || artistBindingManifest.auditScopeMemberCount <= 0
      || artistBindingManifest.blockers.length > 0
    ) {
      blockers.push('youtube-quota-artist-binding-manifest-not-ready');
    }

    artistBindingManifestValidated =
      artistBindingManifest.state === 'binding-manifest-ready'
      && artistBindingManifest.submissionEvidenceEligible
      && artistBindingManifest.auditScopeMemberCount > 0
      && artistBindingManifest.blockers.length === 0;
  }

  const m = input.measuredUsage;
  if (
    artistBindingManifestValidated
    && artistBindingManifest !== null
    && m.artistChannelCount !== artistBindingManifest.auditScopeMemberCount
  ) {
    blockers.push('youtube-quota-artist-channel-count-binding-mismatch');
  }
  if (!positiveSafeInteger(m.artistChannelCount)) {
    blockers.push('youtube-quota-artist-channel-count-invalid');
  }
  if (!positiveSafeInteger(m.uploadManifestPageCountPerReactionRun)) {
    blockers.push('youtube-quota-upload-page-count-invalid');
  }
  if (!nonNegativeSafeInteger(m.videoCountPerReactionRun)) {
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

  const batching = input.requestBatching;
  if (!positiveSafeInteger(batching.channelIdsPerCall)) {
    blockers.push('youtube-quota-channel-request-batch-size-invalid');
  }
  if (!positiveSafeInteger(batching.videoIdsPerCall)) {
    blockers.push('youtube-quota-video-request-batch-size-invalid');
  }

  const providerBatchLimitEvidenceRequired =
    batching.strategy === 'provider-limit-evidenced';

  if (
    batching.strategy === 'singleton-only-until-provider-batch-limit-evidence'
    && (
      batching.channelIdsPerCall !== 1
      || batching.videoIdsPerCall !== 1
    )
  ) {
    blockers.push('youtube-quota-singleton-batching-size-mismatch');
  }

  const maxChannelIdsPerCall = input.providerLimits.maxChannelIdsPerCall;
  const maxVideoIdsPerCall = input.providerLimits.maxVideoIdsPerCall;
  if (
    maxChannelIdsPerCall !== null
    && !positiveSafeInteger(maxChannelIdsPerCall)
  ) {
    blockers.push('youtube-quota-channel-provider-limit-invalid');
  }
  if (
    maxVideoIdsPerCall !== null
    && !positiveSafeInteger(maxVideoIdsPerCall)
  ) {
    blockers.push('youtube-quota-video-provider-limit-invalid');
  }

  if (providerBatchLimitEvidenceRequired) {
    if (
      maxChannelIdsPerCall === null
      || !positiveSafeInteger(maxChannelIdsPerCall)
    ) {
      blockers.push('youtube-quota-channel-provider-limit-required');
    }
    if (
      maxVideoIdsPerCall === null
      || !positiveSafeInteger(maxVideoIdsPerCall)
    ) {
      blockers.push('youtube-quota-video-provider-limit-required');
    }
    if (
      maxChannelIdsPerCall !== null
      && positiveSafeInteger(maxChannelIdsPerCall)
      && batching.channelIdsPerCall > maxChannelIdsPerCall
    ) {
      blockers.push('youtube-quota-channel-request-batch-exceeds-provider-limit');
    }
    if (
      maxVideoIdsPerCall !== null
      && positiveSafeInteger(maxVideoIdsPerCall)
      && batching.videoIdsPerCall > maxVideoIdsPerCall
    ) {
      blockers.push('youtube-quota-video-request-batch-exceeds-provider-limit');
    }
  }

  for (const endpoint of requestedEndpoints) {
    const cost = input.quotaUnitsPerCall[endpoint];
    if (!positiveSafeInteger(cost)) {
      blockers.push('youtube-quota-cost-invalid');
      break;
    }
  }

  for (const ref of [
    input.evidence.measuredUsageEvidenceRef,
    input.evidence.cadenceEvidenceRef,
    input.evidence.requestBatchingEvidenceRef,
    input.evidence.providerQuotaCostEvidenceRef,
  ]) {
    if (!present(ref)) {
      blockers.push('youtube-quota-evidence-ref-missing');
      break;
    }
    if (secretLike(ref)) {
      blockers.push('youtube-quota-evidence-ref-secret-like');
      break;
    }
  }

  const providerBatchLimitEvidenceRef =
    input.evidence.providerBatchLimitEvidenceRef;
  if (providerBatchLimitEvidenceRef !== null) {
    if (!present(providerBatchLimitEvidenceRef)) {
      blockers.push('youtube-quota-provider-batch-limit-evidence-ref-invalid');
    } else if (secretLike(providerBatchLimitEvidenceRef)) {
      blockers.push('youtube-quota-evidence-ref-secret-like');
    }
  }
  if (
    providerBatchLimitEvidenceRequired
    && providerBatchLimitEvidenceRef === null
  ) {
    blockers.push('youtube-quota-provider-batch-limit-evidence-required');
  }

  const providerBatchLimitEvidenceValidated =
    maxChannelIdsPerCall !== null
    && positiveSafeInteger(maxChannelIdsPerCall)
    && maxVideoIdsPerCall !== null
    && positiveSafeInteger(maxVideoIdsPerCall)
    && providerBatchLimitEvidenceRef !== null
    && present(providerBatchLimitEvidenceRef)
    && !secretLike(providerBatchLimitEvidenceRef);

  const lineItems: SnsFandomYoutubeQuotaLineItem[] = [];

  if (
    positiveSafeInteger(m.artistChannelCount)
    && positiveSafeInteger(m.reactionSnapshotRunsPerDay)
    && positiveSafeInteger(batching.channelIdsPerCall)
  ) {
    const callsPerRun = Math.ceil(
      m.artistChannelCount / batching.channelIdsPerCall,
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
    nonNegativeSafeInteger(m.videoCountPerReactionRun)
    && positiveSafeInteger(m.reactionSnapshotRunsPerDay)
    && positiveSafeInteger(batching.videoIdsPerCall)
  ) {
    const callsPerRun = Math.ceil(
      m.videoCountPerReactionRun / batching.videoIdsPerCall,
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
    artistBindingManifestValidated,
    artistBindingManifestId:
      artistBindingManifestValidated && artistBindingManifest !== null
        ? artistBindingManifest.manifestId
        : null,
    artistChannelCount:
      artistBindingManifestValidated && artistBindingManifest !== null
        ? artistBindingManifest.auditScopeMemberCount
        : null,
    lineItems: Object.freeze([...lineItems]),
    requestBatchingStrategy: batching.strategy,
    channelIdsPerCall: batching.channelIdsPerCall,
    videoIdsPerCall: batching.videoIdsPerCall,
    providerBatchLimitEvidenceRequired,
    providerBatchLimitEvidenceValidated,
    providerLimitClaimed:
      batching.strategy === 'provider-limit-evidenced',
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
