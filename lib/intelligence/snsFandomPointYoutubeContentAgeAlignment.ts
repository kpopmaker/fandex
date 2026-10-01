import {
  validateSnsFandomObservation,
  type SnsFandomObservation,
} from './snsFandomPointContracts';
import {
  validateSnsFandomYoutubeContentManifest,
  type SnsFandomYoutubeContentManifest,
} from './snsFandomPointYoutubeContentSelection';

export const SNS_FANDOM_YOUTUBE_CONTENT_AGE_ALIGNMENT_VERSION =
  'sns-fandom-youtube-content-age-alignment-v1' as const;

export type SnsFandomYoutubeContentAgeSample = Readonly<{
  videoId: string;
  publishedAt: string;
  observedAt: string;
  contentAgeMilliseconds: number;
  rawValue: number | null;
  missingState: 'observed' | 'missing' | 'unsupported';
}>;

export type SnsFandomYoutubeMetricAgeAlignment = Readonly<{
  metricId: string;
  state:
    | 'exact-age-aligned'
    | 'age-misaligned'
    | 'evidence-incomplete';
  manifestVideoCount: number;
  observedVideoCount: number;
  distinctContentAgeMilliseconds: readonly number[];
  samples: readonly SnsFandomYoutubeContentAgeSample[];
  directRawComparisonReady: boolean;
  interpolationAllowed: false;
  extrapolationAllowed: false;
  aggregationMethod: null;
  aggregateValue: null;
  blockers: readonly string[];
}>;

export type SnsFandomYoutubeContentAgeAlignmentResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_YOUTUBE_CONTENT_AGE_ALIGNMENT_VERSION;
  state:
    | 'age-alignment-ready'
    | 'age-alignment-blocked'
    | 'evidence-incomplete';
  metrics: readonly SnsFandomYoutubeMetricAgeAlignment[];
  artistLevelAggregationReady: false;
  normalizationReady: false;
  interpolationAllowed: false;
  extrapolationAllowed: false;
  blockers: readonly string[];
}>;

const REACTION_METRICS = Object.freeze([
  'youtube.video.view-count',
  'youtube.video.like-count',
  'youtube.video.comment-count',
] as const);

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

export function evaluateSnsFandomYoutubeContentAgeAlignment(
  input: Readonly<{
    manifest: SnsFandomYoutubeContentManifest;
    observations: readonly SnsFandomObservation[];
  }>,
): SnsFandomYoutubeContentAgeAlignmentResult {
  const manifestValidation =
    validateSnsFandomYoutubeContentManifest(input.manifest);
  const blockers = [...manifestValidation.blockers];

  const publishedAtByVideoId = new Map(
    input.manifest.items.map((item) => [item.videoId, item.publishedAt]),
  );

  const candidateObservations = input.observations.filter(
    (observation) => (
      observation.providerId === 'youtube-data-api'
      && observation.entity.canonicalArtistId
        === input.manifest.canonicalArtistId
      && observation.entity.providerArtistId
        === input.manifest.youtubeChannelId
      && observation.evidence.providerClientRef
        === input.manifest.providerClientRef
      && observation.entity.providerContentId !== null
      && observation.variable.dimension === 'public-reaction-diffusion'
      && observation.variable.metricRole === 'construct-evidence'
      && REACTION_METRICS.includes(
        observation.variable.metricId as typeof REACTION_METRICS[number],
      )
    ),
  );

  const metrics: SnsFandomYoutubeMetricAgeAlignment[] = [];

  for (const metricId of REACTION_METRICS) {
    const metricBlockers: string[] = [];
    const byVideoId = new Map<string, SnsFandomObservation[]>();

    for (const observation of candidateObservations) {
      if (observation.variable.metricId !== metricId) continue;
      const videoId = observation.entity.providerContentId;
      if (videoId === null) continue;
      const current = byVideoId.get(videoId) ?? [];
      current.push(observation);
      byVideoId.set(videoId, current);
    }

    const samples: SnsFandomYoutubeContentAgeSample[] = [];
    let observedVideoCount = 0;

    for (const videoId of manifestValidation.selectedVideoIds) {
      const publishedAt = publishedAtByVideoId.get(videoId);
      const observations = byVideoId.get(videoId) ?? [];

      if (publishedAt === undefined || !validIso(publishedAt)) {
        metricBlockers.push('youtube-content-age-published-at-missing');
        continue;
      }
      if (observations.length !== 1) {
        metricBlockers.push(
          observations.length === 0
            ? 'youtube-content-age-observation-missing'
            : 'youtube-content-age-observation-duplicate',
        );
        continue;
      }

      const observation = observations[0];
      const validation = validateSnsFandomObservation(observation);
      if (!validation.ok) {
        metricBlockers.push('youtube-content-age-observation-invalid');
        continue;
      }

      const observedAt = observation.time.observedAt;
      const contentAgeMilliseconds =
        Date.parse(observedAt) - Date.parse(publishedAt);

      if (!Number.isSafeInteger(contentAgeMilliseconds)
          || contentAgeMilliseconds < 0) {
        metricBlockers.push('youtube-content-age-invalid');
        continue;
      }

      if (observation.value.missingState === 'observed') {
        observedVideoCount += 1;
      } else {
        metricBlockers.push('youtube-content-age-metric-not-observed');
      }

      samples.push(Object.freeze({
        videoId,
        publishedAt,
        observedAt,
        contentAgeMilliseconds,
        rawValue: observation.value.rawValue,
        missingState: observation.value.missingState,
      }));
    }

    for (const videoId of byVideoId.keys()) {
      if (!publishedAtByVideoId.has(videoId)) {
        metricBlockers.push('youtube-content-age-observation-outside-manifest');
      }
    }

    const distinctContentAgeMilliseconds = Array.from(
      new Set(samples.map((sample) => sample.contentAgeMilliseconds)),
    ).sort((a, b) => a - b);

    const complete =
      metricBlockers.length === 0
      && samples.length === manifestValidation.selectedVideoIds.length
      && observedVideoCount === manifestValidation.selectedVideoIds.length;

    const exactlyAligned =
      complete
      && distinctContentAgeMilliseconds.length <= 1;

    let state: SnsFandomYoutubeMetricAgeAlignment['state'];
    if (!complete) {
      state = 'evidence-incomplete';
    } else if (exactlyAligned) {
      state = 'exact-age-aligned';
    } else {
      state = 'age-misaligned';
      metricBlockers.push('youtube-content-age-not-exactly-aligned');
    }

    metrics.push(Object.freeze({
      metricId,
      state,
      manifestVideoCount: manifestValidation.selectedVideoIds.length,
      observedVideoCount,
      distinctContentAgeMilliseconds: Object.freeze(
        distinctContentAgeMilliseconds,
      ),
      samples: Object.freeze(samples),
      directRawComparisonReady: state === 'exact-age-aligned',
      interpolationAllowed: false as const,
      extrapolationAllowed: false as const,
      aggregationMethod: null,
      aggregateValue: null,
      blockers: Object.freeze(Array.from(new Set(metricBlockers))),
    }));
  }

  const incomplete = metrics.some(
    (metric) => metric.state === 'evidence-incomplete',
  );
  const misaligned = metrics.some(
    (metric) => metric.state === 'age-misaligned',
  );

  if (incomplete) {
    blockers.push('youtube-content-age-evidence-incomplete');
  }
  if (misaligned) {
    blockers.push('youtube-content-age-alignment-required');
  }

  blockers.push('youtube-artist-level-aggregation-methodology-not-approved');

  const state =
    incomplete || !manifestValidation.ok
      ? 'evidence-incomplete' as const
      : misaligned
        ? 'age-alignment-blocked' as const
        : 'age-alignment-ready' as const;

  return Object.freeze({
    contractVersion: SNS_FANDOM_YOUTUBE_CONTENT_AGE_ALIGNMENT_VERSION,
    state,
    metrics: Object.freeze(metrics),
    artistLevelAggregationReady: false as const,
    normalizationReady: false as const,
    interpolationAllowed: false as const,
    extrapolationAllowed: false as const,
    blockers: Object.freeze(Array.from(new Set(blockers))),
  });
}
