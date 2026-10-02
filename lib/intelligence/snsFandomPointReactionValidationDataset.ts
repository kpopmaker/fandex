import {
  validateSnsFandomObservation,
  type SnsFandomObservation,
} from './snsFandomPointContracts';
import {
  buildSnsFandomReactionValidationLineage,
  type SnsFandomReactionValidationLineageEntry,
} from './snsFandomPointReactionValidationLineage';
import {
  evaluateSnsFandomYoutubeContentAgeAlignment,
} from './snsFandomPointYoutubeContentAgeAlignment';
import {
  type SnsFandomYoutubeContentManifest,
} from './snsFandomPointYoutubeContentSelection';

export const SNS_FANDOM_REACTION_VALIDATION_DATASET_VERSION =
  'sns-fandom-reaction-validation-dataset-v1' as const;

export type SnsFandomReactionValidationMetricId =
  | 'youtube.video.view-count'
  | 'youtube.video.like-count'
  | 'youtube.video.comment-count';

export type SnsFandomReactionValidationConstruct =
  | 'typical-content-reaction-intensity'
  | 'window-total-reaction-volume';

export type SnsFandomReactionValidationDatasetArtistInput = Readonly<{
  manifest: SnsFandomYoutubeContentManifest;
  observations: readonly SnsFandomObservation[];
}>;

export type SnsFandomReactionValidationRevisionAudit = Readonly<{
  state: 'unassessed' | 'stable' | 'changed';
  evidenceRef: string | null;
  comparedDatasetRefs: readonly string[];
}>;

export type SnsFandomReactionValidationDatasetInput = Readonly<{
  datasetId: string;
  construct: SnsFandomReactionValidationConstruct;
  metricId: SnsFandomReactionValidationMetricId;
  artists: readonly SnsFandomReactionValidationDatasetArtistInput[];
  lineageEntries: readonly SnsFandomReactionValidationLineageEntry[];
  revisionAudit: SnsFandomReactionValidationRevisionAudit;
}>;

export type SnsFandomReactionValidationDatasetMember = Readonly<{
  canonicalArtistId: string;
  youtubeChannelId: string;
  providerClientRef: string;
  contentSelectionEvidenceRef: string;
  selectedContentCount: number;
  targetContentAgeMilliseconds: number;
  rawSamples: readonly Readonly<{
    videoId: string;
    publishedAt: string;
    observedAt: string;
    rawValue: number;
    evidenceRef: string;
    revision: string | null;
  }>[];
  aggregateValue: null;
  normalizedValue: null;
}>;

export type SnsFandomReactionValidationDatasetResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_REACTION_VALIDATION_DATASET_VERSION;
  datasetId: string;
  state:
    | 'blocked'
    | 'structurally-ready'
    | 'validation-ready';
  construct: SnsFandomReactionValidationConstruct;
  metricId: SnsFandomReactionValidationMetricId;
  materialClass: 'real';
  canonicalArtistIds: readonly string[];
  distinctCanonicalArtistCount: number;
  providerId: 'youtube-data-api';
  providerClientRef: string | null;
  providerEndpoints: readonly string[];
  targetContentAgeMilliseconds: number | null;
  members: readonly SnsFandomReactionValidationDatasetMember[];
  revisionStabilityReviewed: boolean;
  lineageValidated: boolean;
  methodologyValidationEligible: boolean;
  aggregateValuesProduced: false;
  normalizedValuesProduced: false;
  arbitraryContentCountEqualizationAllowed: false;
  blockers: readonly string[];
}>;

function uniqueSorted(values: readonly string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function rawMetricString(
  metricId: SnsFandomReactionValidationMetricId,
  metrics: Readonly<{
    viewCount: string | null;
    likeCount: string | null;
    commentCount: string | null;
  }>,
): string | null {
  if (metricId === 'youtube.video.view-count') return metrics.viewCount;
  if (metricId === 'youtube.video.like-count') return metrics.likeCount;
  return metrics.commentCount;
}

export function buildSnsFandomReactionValidationDataset(
  input: SnsFandomReactionValidationDatasetInput,
): SnsFandomReactionValidationDatasetResult {
  const blockers: string[] = [];

  if (input.datasetId.trim().length === 0) {
    blockers.push('reaction-validation-dataset-id-empty');
  }

  const lineage = buildSnsFandomReactionValidationLineage(
    input.lineageEntries,
  );
  const lineageValidated =
    lineage.state === 'lineage-ready'
    && lineage.methodologyValidationEligible;

  if (!lineageValidated) {
    blockers.push('reaction-validation-lineage-not-ready');
    blockers.push(...lineage.blockers);
  }

  const lineageByObservationId = new Map(
    lineage.members.map((member) => [member.observationId, member]),
  );

  const canonicalArtistIds = uniqueSorted(
    input.artists.map((artist) => artist.manifest.canonicalArtistId),
  );

  if (canonicalArtistIds.length < 2) {
    blockers.push(
      'reaction-validation-multi-artist-evidence-insufficient',
    );
  }
  if (canonicalArtistIds.length !== input.artists.length) {
    blockers.push('reaction-validation-duplicate-canonical-artist');
  }

  const providerClientRefs = uniqueSorted(
    input.artists.map((artist) => artist.manifest.providerClientRef),
  );
  if (providerClientRefs.length !== 1) {
    blockers.push('reaction-validation-provider-client-mismatch');
  }

  const members: SnsFandomReactionValidationDatasetMember[] = [];
  const cohortContentAges: number[] = [];
  const cohortEndpointSets: string[] = [];

  for (const artist of input.artists) {
    const manifest = artist.manifest;
    const alignment = evaluateSnsFandomYoutubeContentAgeAlignment({
      manifest,
      observations: artist.observations,
    });

    if (alignment.state !== 'age-alignment-ready') {
      blockers.push('reaction-validation-content-age-alignment-not-ready');
      continue;
    }

    const metricAlignment = alignment.metrics.find(
      (metric) => metric.metricId === input.metricId,
    );
    if (
      metricAlignment === undefined
      || metricAlignment.state !== 'exact-age-aligned'
      || metricAlignment.distinctContentAgeMilliseconds.length !== 1
      || metricAlignment.observedVideoCount < 1
    ) {
      blockers.push(
        'reaction-validation-selected-metric-age-alignment-not-ready',
      );
      continue;
    }

    const targetContentAgeMilliseconds =
      metricAlignment.distinctContentAgeMilliseconds[0];
    cohortContentAges.push(targetContentAgeMilliseconds);

    const observationsByVideo = new Map<string, SnsFandomObservation>();
    for (const observation of artist.observations) {
      if (
        observation.providerId !== 'youtube-data-api'
        || observation.variable.metricId !== input.metricId
        || observation.entity.providerContentId === null
      ) {
        continue;
      }

      if (!validateSnsFandomObservation(observation).ok) {
        blockers.push('reaction-validation-observation-invalid');
        continue;
      }
      if (observation.lifecycle.materialClass !== 'real') {
        blockers.push('reaction-validation-non-real-material');
        continue;
      }
      if (
        observation.value.missingState !== 'observed'
        || observation.value.rawValue === null
      ) {
        blockers.push('reaction-validation-metric-missing');
        continue;
      }
      if (
        observation.entity.canonicalArtistId
          !== manifest.canonicalArtistId
        || observation.entity.providerArtistId
          !== manifest.youtubeChannelId
        || observation.evidence.providerClientRef
          !== manifest.providerClientRef
      ) {
        blockers.push('reaction-validation-identity-binding-mismatch');
        continue;
      }

      const videoId = observation.entity.providerContentId;
      const lineageMember = lineageByObservationId.get(
        observation.observationId,
      );
      if (lineageMember === undefined) {
        blockers.push('reaction-validation-observation-lineage-missing');
        continue;
      }
      if (
        lineageMember.canonicalArtistId
          !== observation.entity.canonicalArtistId
        || lineageMember.providerResourceId !== videoId
        || lineageMember.observedAt !== observation.time.observedAt
        || lineageMember.collectedAt !== observation.time.collectedAt
      ) {
        blockers.push('reaction-validation-observation-lineage-mismatch');
        continue;
      }

      const sourceMetric = rawMetricString(
        input.metricId,
        lineageMember.rawMetrics,
      );
      if (
        sourceMetric === null
        || observation.value.rawValue === null
        || sourceMetric !== String(observation.value.rawValue)
      ) {
        blockers.push('reaction-validation-raw-mapping-value-mismatch');
        continue;
      }
      if (observationsByVideo.has(videoId)) {
        blockers.push('reaction-validation-video-observation-duplicate');
        continue;
      }
      observationsByVideo.set(videoId, observation);
    }

    const manifestVideoIds = uniqueSorted(
      manifest.items.map((item) => item.videoId),
    );
    const observationVideoIds = uniqueSorted(
      Array.from(observationsByVideo.keys()),
    );

    if (
      JSON.stringify(manifestVideoIds)
        !== JSON.stringify(observationVideoIds)
    ) {
      blockers.push('reaction-validation-manifest-observation-set-mismatch');
      continue;
    }

    const rawSamples: Array<{
      videoId: string;
      publishedAt: string;
      observedAt: string;
      rawValue: number;
      evidenceRef: string;
      revision: string | null;
    }> = [];
    const endpointSets: string[] = [];

    for (const item of manifest.items) {
      const observation = observationsByVideo.get(item.videoId);
      if (observation === undefined) continue;

      const contentAgeMilliseconds =
        Date.parse(observation.time.observedAt) - Date.parse(item.publishedAt);
      if (contentAgeMilliseconds !== targetContentAgeMilliseconds) {
        blockers.push('reaction-validation-content-age-drift');
        continue;
      }

      const endpoints = uniqueSorted(
        observation.evidence.providerEndpoints,
      );
      endpointSets.push(endpoints.join(','));

      rawSamples.push(Object.freeze({
        videoId: item.videoId,
        publishedAt: item.publishedAt,
        observedAt: observation.time.observedAt,
        rawValue: observation.value.rawValue as number,
        evidenceRef: observation.evidence.evidenceRef,
        revision: observation.evidence.revision,
      }));
    }

    const distinctArtistEndpointSets = uniqueSorted(endpointSets);
    if (distinctArtistEndpointSets.length !== 1) {
      blockers.push('reaction-validation-provider-endpoint-mismatch');
      continue;
    }
    if (distinctArtistEndpointSets[0] !== 'youtube.videos.list') {
      blockers.push('reaction-validation-statistical-endpoint-invalid');
      continue;
    }
    cohortEndpointSets.push(distinctArtistEndpointSets[0]);

    members.push(Object.freeze({
      canonicalArtistId: manifest.canonicalArtistId,
      youtubeChannelId: manifest.youtubeChannelId,
      providerClientRef: manifest.providerClientRef,
      contentSelectionEvidenceRef: manifest.evidenceRef,
      selectedContentCount: manifest.items.length,
      targetContentAgeMilliseconds,
      rawSamples: Object.freeze(rawSamples),
      aggregateValue: null,
      normalizedValue: null,
    }));
  }

  if (uniqueSorted(cohortContentAges.map((value) => String(value))).length > 1) {
    blockers.push('reaction-validation-cross-artist-content-age-mismatch');
  }

  if (uniqueSorted(cohortEndpointSets).length > 1) {
    blockers.push('reaction-validation-cross-artist-endpoint-mismatch');
  }

  if (members.length !== input.artists.length) {
    blockers.push('reaction-validation-member-construction-incomplete');
  }

  let revisionStabilityReviewed = false;
  if (input.revisionAudit.state === 'unassessed') {
    blockers.push('reaction-validation-revision-stability-unassessed');
  } else {
    if (
      input.revisionAudit.evidenceRef === null
      || input.revisionAudit.evidenceRef.trim().length === 0
    ) {
      blockers.push('reaction-validation-revision-audit-evidence-missing');
    }
    const comparedRefs = uniqueSorted(input.revisionAudit.comparedDatasetRefs);
    if (comparedRefs.length < 2) {
      blockers.push(
        'reaction-validation-revision-audit-comparison-insufficient',
      );
    }
    if (input.revisionAudit.state === 'changed') {
      blockers.push('reaction-validation-revision-instability-detected');
    } else if (
      input.revisionAudit.state === 'stable'
      && input.revisionAudit.evidenceRef !== null
      && input.revisionAudit.evidenceRef.trim().length > 0
      && comparedRefs.length >= 2
    ) {
      revisionStabilityReviewed = true;
    }
  }

  const structuralBlockers = blockers.filter(
    (blocker) => !blocker.startsWith('reaction-validation-revision-'),
  );
  const structurallyReady = structuralBlockers.length === 0;
  const methodologyValidationEligible =
    structurallyReady
    && revisionStabilityReviewed
    && lineageValidated;

  const state =
    !structurallyReady
      ? 'blocked' as const
      : methodologyValidationEligible
        ? 'validation-ready' as const
        : 'structurally-ready' as const;

  const providerEndpoints =
    cohortEndpointSets.length > 0
      ? uniqueSorted(cohortEndpointSets[0].split(',').filter(Boolean))
      : [];

  return Object.freeze({
    contractVersion: SNS_FANDOM_REACTION_VALIDATION_DATASET_VERSION,
    datasetId: input.datasetId,
    state,
    construct: input.construct,
    metricId: input.metricId,
    materialClass: 'real' as const,
    canonicalArtistIds: Object.freeze(canonicalArtistIds),
    distinctCanonicalArtistCount: canonicalArtistIds.length,
    providerId: 'youtube-data-api' as const,
    providerClientRef: providerClientRefs.length === 1
      ? providerClientRefs[0]
      : null,
    providerEndpoints: Object.freeze(providerEndpoints),
    targetContentAgeMilliseconds:
      uniqueSorted(cohortContentAges.map((value) => String(value))).length === 1
        ? cohortContentAges[0]
        : null,
    members: Object.freeze(members),
    revisionStabilityReviewed,
    lineageValidated,
    methodologyValidationEligible,
    aggregateValuesProduced: false as const,
    normalizedValuesProduced: false as const,
    arbitraryContentCountEqualizationAllowed: false as const,
    blockers: Object.freeze(Array.from(new Set(blockers))),
  });
}
