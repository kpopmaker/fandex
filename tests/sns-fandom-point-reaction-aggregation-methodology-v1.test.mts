import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomReactionAggregationMethodology,
  type SnsFandomReactionAggregationDecision,
} from '../lib/intelligence/snsFandomPointReactionAggregationMethodology';
import {
  type SnsFandomReactionValidationDatasetResult,
} from '../lib/intelligence/snsFandomPointReactionValidationDataset';
import {
  type SnsFandomYoutubeContentAgeAlignmentResult,
} from '../lib/intelligence/snsFandomPointYoutubeContentAgeAlignment';

function ageAlignment(
  state: SnsFandomYoutubeContentAgeAlignmentResult['state'] =
    'age-alignment-ready',
): SnsFandomYoutubeContentAgeAlignmentResult {
  return {
    contractVersion: 'sns-fandom-youtube-content-age-alignment-v1',
    state,
    metrics: [
      {
        metricId: 'youtube.video.view-count',
        state: state === 'age-alignment-ready'
          ? 'exact-age-aligned'
          : 'age-misaligned',
        manifestVideoCount: 1,
        observedVideoCount: 1,
        distinctContentAgeMilliseconds: [604800000],
        samples: [],
        directRawComparisonReady:
          state === 'age-alignment-ready',
        interpolationAllowed: false,
        extrapolationAllowed: false,
        aggregationMethod: null,
        aggregateValue: null,
        blockers: [],
      },
    ],
    artistLevelAggregationReady: false,
    normalizationReady: false,
    interpolationAllowed: false,
    extrapolationAllowed: false,
    blockers: state === 'age-alignment-ready'
      ? ['youtube-artist-level-aggregation-methodology-not-approved']
      : ['youtube-content-age-alignment-required'],
  };
}

function validationDataset(
  overrides: Partial<SnsFandomReactionValidationDatasetResult> = {},
): SnsFandomReactionValidationDatasetResult {
  return {
    contractVersion: 'sns-fandom-reaction-validation-dataset-v1',
    datasetId: 'dataset://real/reaction-methodology-v1',
    state: 'validation-ready',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    materialClass: 'real',
    canonicalArtistIds: ['artist-a', 'artist-b'],
    distinctCanonicalArtistCount: 2,
    providerId: 'youtube-data-api',
    providerClientRef: 'gcp-project-fandex-youtube-primary',
    providerEndpoints: ['youtube.videos.list'],
    targetContentAgeMilliseconds: 604800000,
    members: [],
    revisionStabilityReviewed: true,
    methodologyValidationEligible: true,
    aggregateValuesProduced: false,
    normalizedValuesProduced: false,
    arbitraryContentCountEqualizationAllowed: false,
    blockers: [],
    ...overrides,
  };
}

function decision(
  overrides: Partial<SnsFandomReactionAggregationDecision> = {},
): SnsFandomReactionAggregationDecision {
  return {
    contractVersion: 'sns-fandom-reaction-aggregation-methodology-v1',
    state: 'research-only',
    construct: 'typical-content-reaction-intensity',
    metricId: 'youtube.video.view-count',
    methodId: 'candidate-method-a',
    contentSelectionRule:
      'official-channel-all-uploads-in-published-window',
    contentAgeRequirement: 'exact-age-aligned',
    releaseVolumeTreatment:
      'held-separate-from-reaction-intensity',
    missingPolicy: 'block',
    evidenceRef: 'evidence://methodology/reaction-aggregation/v1',
    decidedAt: '2026-10-01T00:00:00.000Z',
    empiricalValidation: {
      datasetRef: 'dataset://real/reaction-methodology-v1',
      materialClass: 'real',
      distinctCanonicalArtistCount: 2,
      comparedMethodIds: [
        'candidate-method-a',
        'candidate-method-b',
      ],
      contentAgeSensitivityReviewed: true,
      releaseVolumeSensitivityReviewed: true,
      missingnessSensitivityReviewed: true,
      revisionStabilityReviewed: true,
    },
    ...overrides,
  };
}

test('age-aligned evidence without a methodology decision remains blocked', () => {
  const result = evaluateSnsFandomReactionAggregationMethodology({
    ageAlignment: ageAlignment(),
    validationDataset: validationDataset(),
    decision: null,
  });

  assert.equal(result.state, 'methodology-missing');
  assert.equal(result.executionImplemented, false);
  assert.equal(result.aggregateValue, null);
  assert.equal(result.normalizedValue, null);
  assert.ok(
    result.blockers.includes(
      'reaction-aggregation-methodology-decision-missing',
    ),
  );
});

test('research-only methodology never becomes executable Product aggregation', () => {
  const result = evaluateSnsFandomReactionAggregationMethodology({
    ageAlignment: ageAlignment(),
    validationDataset: validationDataset(),
    decision: decision(),
  });

  assert.equal(result.state, 'methodology-research-only');
  assert.equal(result.construct, 'typical-content-reaction-intensity');
  assert.equal(result.executionImplemented, false);
  assert.equal(result.aggregateValue, null);
  assert.equal(result.crossMetricCombinationAllowed, false);
  assert.equal(result.crossPlatformCombinationAllowed, false);
});

test('approved methodology requires real multi-artist validation and all structural sensitivity reviews', () => {
  const result = evaluateSnsFandomReactionAggregationMethodology({
    ageAlignment: ageAlignment(),
    validationDataset: validationDataset(),
    decision: decision({
      state: 'approved',
      empiricalValidation: {
        datasetRef: 'dataset://real/reaction-methodology-v1',
        materialClass: 'real',
        distinctCanonicalArtistCount: 1,
        comparedMethodIds: ['candidate-method-a'],
        contentAgeSensitivityReviewed: false,
        releaseVolumeSensitivityReviewed: false,
        missingnessSensitivityReviewed: false,
        revisionStabilityReviewed: false,
      },
    }),
  });

  assert.equal(result.state, 'methodology-invalid');
  assert.ok(
    result.blockers.includes(
      'reaction-aggregation-validation-multi-artist-evidence-insufficient',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'reaction-aggregation-content-age-sensitivity-not-reviewed',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'reaction-aggregation-release-volume-sensitivity-not-reviewed',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'reaction-aggregation-missingness-sensitivity-not-reviewed',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'reaction-aggregation-revision-stability-not-reviewed',
    ),
  );
});

test('even a structurally valid approved decision produces no number until execution is separately implemented', () => {
  const result = evaluateSnsFandomReactionAggregationMethodology({
    ageAlignment: ageAlignment(),
    validationDataset: validationDataset(),
    decision: decision({
      state: 'approved',
    }),
  });

  assert.equal(result.state, 'methodology-approved');
  assert.equal(result.executionImplemented, false);
  assert.equal(result.aggregateValue, null);
  assert.equal(result.normalizedValue, null);
  assert.ok(
    result.blockers.includes(
      'reaction-aggregation-execution-not-implemented',
    ),
  );
});

test('typical-content intensity and total-window reaction volume remain distinct construct decisions', () => {
  const intensity = evaluateSnsFandomReactionAggregationMethodology({
    ageAlignment: ageAlignment(),
    validationDataset: validationDataset(),
    decision: decision({
      construct: 'typical-content-reaction-intensity',
      releaseVolumeTreatment:
        'held-separate-from-reaction-intensity',
    }),
  });

  const volume = evaluateSnsFandomReactionAggregationMethodology({
    ageAlignment: ageAlignment(),
    validationDataset: validationDataset({
      construct: 'window-total-reaction-volume',
    }),
    decision: decision({
      construct: 'window-total-reaction-volume',
      releaseVolumeTreatment: 'part-of-construct',
    }),
  });

  assert.equal(
    intensity.construct,
    'typical-content-reaction-intensity',
  );
  assert.equal(volume.construct, 'window-total-reaction-volume');
  assert.notEqual(intensity.construct, volume.construct);
  assert.equal(intensity.aggregateValue, null);
  assert.equal(volume.aggregateValue, null);
});

test('an approved methodology cannot bypass missing content-age alignment', () => {
  const result = evaluateSnsFandomReactionAggregationMethodology({
    ageAlignment: ageAlignment('age-alignment-blocked'),
    validationDataset: validationDataset(),
    decision: decision({ state: 'approved' }),
  });

  assert.equal(result.state, 'age-alignment-blocked');
  assert.equal(result.executionImplemented, false);
  assert.equal(result.aggregateValue, null);
  assert.ok(
    result.blockers.includes(
      'reaction-aggregation-content-age-alignment-not-ready',
    ),
  );
});


test('methodology decision cannot target a metric without aligned observed content evidence', () => {
  const noMetricEvidence: SnsFandomYoutubeContentAgeAlignmentResult = {
    ...ageAlignment(),
    metrics: [],
  };

  const result = evaluateSnsFandomReactionAggregationMethodology({
    ageAlignment: noMetricEvidence,
    validationDataset: validationDataset(),
    decision: decision({ state: 'approved' }),
  });

  assert.equal(result.state, 'age-alignment-blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-aggregation-selected-metric-age-alignment-not-ready',
    ),
  );
  assert.equal(result.aggregateValue, null);
});


test('methodology decision cannot reuse a different validation dataset id', () => {
  const result = evaluateSnsFandomReactionAggregationMethodology({
    ageAlignment: ageAlignment(),
    validationDataset: validationDataset({
      datasetId: 'dataset://real/other-dataset',
    }),
    decision: decision({ state: 'approved' }),
  });

  assert.equal(result.state, 'validation-dataset-blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-aggregation-validation-dataset-ref-mismatch',
    ),
  );
  assert.equal(result.aggregateValue, null);
});

test('methodology decision construct and metric must match the real validation dataset', () => {
  const result = evaluateSnsFandomReactionAggregationMethodology({
    ageAlignment: ageAlignment(),
    validationDataset: validationDataset({
      construct: 'window-total-reaction-volume',
      metricId: 'youtube.video.like-count',
    }),
    decision: decision({ state: 'approved' }),
  });

  assert.equal(result.state, 'validation-dataset-blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-aggregation-validation-dataset-construct-mismatch',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'reaction-aggregation-validation-dataset-metric-mismatch',
    ),
  );
});
