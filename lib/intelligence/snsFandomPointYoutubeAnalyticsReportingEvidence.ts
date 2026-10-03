import evidenceRefs from '../../docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json';

export const SNS_FANDOM_YOUTUBE_ANALYTICS_REPORTING_EVIDENCE_VERSION =
  'sns-fandom-youtube-analytics-reporting-evidence-v1' as const;

type RawArtistObservation = Readonly<{
  canonicalArtistId: string;
  playlistItemsPagesTraversed: number;
  includedVideoCount: number;
}>;

type RawBoundedMeasurementEvidence = Readonly<{
  state: string;
  authorizationCommentId: string;
  authorizationEvidenceRef: string;
  sourceMainSha: string;
  executionRequestCommitSha: string;
  workflowRunId: string;
  workflowConclusion: string;
  artifactId: string;
  artifactDigest: string;
  durableResultEvidenceRef: string;
  measurementWindowStart: string;
  measurementWindowEnd: string;
  measurementStartedAt: string;
  measuredAt: string;
  observedThrough: string;
  measurementWindowComplete: boolean;
  reactionSnapshotRunsPerDay: number;
  requestBatchingStrategy: string;
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
  perArtist: readonly RawArtistObservation[];
  rawVideoIdentifiersStored: boolean;
  rawStatisticsStored: boolean;
  secretMaterialStored: boolean;
  quotaWorksheetEligible: boolean;
  quotaWorksheetEligibilityReason: string;
  finalOwnerEvidencePromotionAllowed: boolean;
  productionCollectionAuthorized: boolean;
  providerSubmissionAuthorized: boolean;
  schedulerMutationAuthorized: boolean;
}>;

export type SnsFandomYoutubeAnalyticsReportingEvidence = Readonly<{
  version: typeof SNS_FANDOM_YOUTUBE_ANALYTICS_REPORTING_EVIDENCE_VERSION;
  surfaceState: 'real-bounded-provider-observation';
  completeness: 'measurement-window-incomplete';
  sourceLabel: 'YouTube Data API bounded observation';
  measurementWindowStart: string;
  measurementWindowEnd: string;
  measurementStartedAt: string;
  measuredAt: string;
  observedThrough: string;
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
  perArtist: readonly RawArtistObservation[];
  provenance: Readonly<{
    authorizationCommentId: string;
    sourceMainSha: string;
    executionRequestCommitSha: string;
    workflowRunId: string;
    artifactId: string;
    artifactDigest: string;
    durableResultEvidenceRef: string;
  }>;
  quotaWorksheetEligible: false;
  finalOwnerEvidencePromotionAllowed: false;
  productionCollectionAuthorized: false;
  providerSubmissionAuthorized: false;
  schedulerMutationAuthorized: false;
}>;

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function nonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function positiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function present(value: string): boolean {
  return value.trim().length > 0;
}

function fail(reason: string): never {
  throw new Error(`sns_fandom_analytics_reporting_evidence_invalid:${reason}`);
}

export function getSnsFandomYoutubeAnalyticsReportingEvidence():
  SnsFandomYoutubeAnalyticsReportingEvidence {
  const raw = (
    evidenceRefs as unknown as {
      currentBoundedMeasurementEvidence?: RawBoundedMeasurementEvidence;
    }
  ).currentBoundedMeasurementEvidence;

  if (!raw) fail('current-bounded-measurement-missing');
  if (raw.state !== 'current-plan-bounded-snapshot-recorded') {
    fail('state');
  }
  if (raw.workflowConclusion !== 'success') fail('workflow-conclusion');
  if (raw.measurementWindowComplete !== false) {
    fail('measurement-window-completeness');
  }
  if (raw.quotaWorksheetEligible !== false) {
    fail('quota-worksheet-eligibility');
  }
  if (raw.quotaWorksheetEligibilityReason !== 'measurement-window-incomplete') {
    fail('quota-worksheet-eligibility-reason');
  }
  if (raw.finalOwnerEvidencePromotionAllowed !== false) {
    fail('final-owner-promotion');
  }
  if (
    raw.productionCollectionAuthorized !== false
    || raw.providerSubmissionAuthorized !== false
    || raw.schedulerMutationAuthorized !== false
  ) {
    fail('authorization-boundary');
  }
  if (
    raw.rawVideoIdentifiersStored !== false
    || raw.rawStatisticsStored !== false
    || raw.secretMaterialStored !== false
  ) {
    fail('raw-or-secret-material');
  }

  for (const timestamp of [
    raw.measurementWindowStart,
    raw.measurementWindowEnd,
    raw.measurementStartedAt,
    raw.measuredAt,
    raw.observedThrough,
  ]) {
    if (!validIso(timestamp)) fail('timestamp');
  }
  if (
    Date.parse(raw.measurementWindowStart) >= Date.parse(raw.measurementWindowEnd)
    || Date.parse(raw.measurementStartedAt) < Date.parse(raw.measurementWindowStart)
    || Date.parse(raw.observedThrough) < Date.parse(raw.measurementWindowStart)
    || Date.parse(raw.observedThrough) > Date.parse(raw.measurementWindowEnd)
  ) {
    fail('timestamp-order');
  }

  if (!positiveSafeInteger(raw.reactionSnapshotRunsPerDay)) {
    fail('reaction-cadence');
  }
  if (!positiveSafeInteger(raw.artistChannelCount)) {
    fail('artist-channel-count');
  }
  if (!positiveSafeInteger(raw.uploadManifestPageCountPerReactionRun)) {
    fail('upload-page-count');
  }
  if (!nonNegativeSafeInteger(raw.videoCountPerReactionRun)) {
    fail('video-count');
  }
  if (raw.trueZeroVideoCountObserved !== (raw.videoCountPerReactionRun === 0)) {
    fail('true-zero-semantics');
  }

  const calls = raw.providerCallsObserved;
  for (const value of [
    calls.channelsList,
    calls.playlistItemsList,
    calls.videosList,
    calls.total,
    raw.quotaUnitsObserved,
  ]) {
    if (!nonNegativeSafeInteger(value)) fail('provider-call-count');
  }
  if (
    calls.total
      !== calls.channelsList + calls.playlistItemsList + calls.videosList
  ) {
    fail('provider-call-total');
  }
  if (raw.quotaUnitsObserved !== calls.total) {
    fail('quota-unit-total');
  }
  if (calls.channelsList !== raw.artistChannelCount) {
    fail('channel-call-count');
  }
  if (calls.playlistItemsList !== raw.uploadManifestPageCountPerReactionRun) {
    fail('playlist-call-count');
  }
  if (calls.videosList !== raw.videoCountPerReactionRun) {
    fail('video-call-count');
  }

  if (!Array.isArray(raw.perArtist) || raw.perArtist.length !== raw.artistChannelCount) {
    fail('per-artist-count');
  }
  const artistIds = new Set<string>();
  let artistPageTotal = 0;
  let artistVideoTotal = 0;
  for (const artist of raw.perArtist) {
    if (!present(artist.canonicalArtistId)) fail('artist-id');
    if (artistIds.has(artist.canonicalArtistId)) fail('artist-id-duplicate');
    artistIds.add(artist.canonicalArtistId);
    if (!nonNegativeSafeInteger(artist.playlistItemsPagesTraversed)) {
      fail('artist-page-count');
    }
    if (!nonNegativeSafeInteger(artist.includedVideoCount)) {
      fail('artist-video-count');
    }
    artistPageTotal += artist.playlistItemsPagesTraversed;
    artistVideoTotal += artist.includedVideoCount;
  }
  if (artistPageTotal !== raw.uploadManifestPageCountPerReactionRun) {
    fail('per-artist-page-total');
  }
  if (artistVideoTotal !== raw.videoCountPerReactionRun) {
    fail('per-artist-video-total');
  }

  for (const ref of [
    raw.authorizationCommentId,
    raw.authorizationEvidenceRef,
    raw.sourceMainSha,
    raw.executionRequestCommitSha,
    raw.workflowRunId,
    raw.artifactId,
    raw.artifactDigest,
    raw.durableResultEvidenceRef,
  ]) {
    if (!present(ref)) fail('provenance-ref');
  }

  return Object.freeze({
    version: SNS_FANDOM_YOUTUBE_ANALYTICS_REPORTING_EVIDENCE_VERSION,
    surfaceState: 'real-bounded-provider-observation' as const,
    completeness: 'measurement-window-incomplete' as const,
    sourceLabel: 'YouTube Data API bounded observation' as const,
    measurementWindowStart: raw.measurementWindowStart,
    measurementWindowEnd: raw.measurementWindowEnd,
    measurementStartedAt: raw.measurementStartedAt,
    measuredAt: raw.measuredAt,
    observedThrough: raw.observedThrough,
    reactionSnapshotRunsPerDay: raw.reactionSnapshotRunsPerDay,
    artistChannelCount: raw.artistChannelCount,
    uploadManifestPageCountPerReactionRun:
      raw.uploadManifestPageCountPerReactionRun,
    videoCountPerReactionRun: raw.videoCountPerReactionRun,
    trueZeroVideoCountObserved: raw.trueZeroVideoCountObserved,
    providerCallsObserved: Object.freeze({ ...calls }),
    quotaUnitsObserved: raw.quotaUnitsObserved,
    perArtist: Object.freeze(raw.perArtist.map((artist) => Object.freeze({ ...artist }))),
    provenance: Object.freeze({
      authorizationCommentId: raw.authorizationCommentId,
      sourceMainSha: raw.sourceMainSha,
      executionRequestCommitSha: raw.executionRequestCommitSha,
      workflowRunId: raw.workflowRunId,
      artifactId: raw.artifactId,
      artifactDigest: raw.artifactDigest,
      durableResultEvidenceRef: raw.durableResultEvidenceRef,
    }),
    quotaWorksheetEligible: false as const,
    finalOwnerEvidencePromotionAllowed: false as const,
    productionCollectionAuthorized: false as const,
    providerSubmissionAuthorized: false as const,
    schedulerMutationAuthorized: false as const,
  });
}
