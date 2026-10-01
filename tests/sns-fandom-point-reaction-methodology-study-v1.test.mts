import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSnsFandomReactionMethodologyStudy,
} from '../lib/intelligence/snsFandomPointReactionMethodologyStudy';
import {
  type SnsFandomReactionValidationDatasetResult,
} from '../lib/intelligence/snsFandomPointReactionValidationDataset';

function dataset(
  input: Readonly<{
    datasetId: string;
    targetAge: number;
    contentCounts?: readonly number[];
    construct?:
      | 'typical-content-reaction-intensity'
      | 'window-total-reaction-volume';
    metricId?:
      | 'youtube.video.view-count'
      | 'youtube.video.like-count'
      | 'youtube.video.comment-count';
  }>,
): SnsFandomReactionValidationDatasetResult {
  const contentCounts = input.contentCounts ?? [1, 2];
  const artistIds = contentCounts.map((_, index) =>
    'artist-' + String(index + 1)
  );

  return {
    contractVersion: 'sns-fandom-reaction-validation-dataset-v1',
    datasetId: input.datasetId,
    state: 'validation-ready',
    construct:
      input.construct ?? 'typical-content-reaction-intensity',
    metricId: input.metricId ?? 'youtube.video.view-count',
    materialClass: 'real',
    canonicalArtistIds: artistIds,
    distinctCanonicalArtistCount: artistIds.length,
    providerId: 'youtube-data-api',
    providerClientRef: 'gcp-project-fandex-youtube-primary',
    providerEndpoints: ['youtube.videos.list'],
    targetContentAgeMilliseconds: input.targetAge,
    members: contentCounts.map((count, index) => ({
      canonicalArtistId: artistIds[index],
      youtubeChannelId: 'UC-' + artistIds[index],
      providerClientRef: 'gcp-project-fandex-youtube-primary',
      contentSelectionEvidenceRef:
        'evidence://manifest/' + artistIds[index],
      selectedContentCount: count,
      targetContentAgeMilliseconds: input.targetAge,
      rawSamples: [],
      aggregateValue: null,
      normalizedValue: null,
    })),
    revisionStabilityReviewed: true,
    methodologyValidationEligible: true,
    aggregateValuesProduced: false,
    normalizedValuesProduced: false,
    arbitraryContentCountEqualizationAllowed: false,
    blockers: [],
  };
}

function methodEvidence(datasetId: string) {
  return [
    {
      methodId: 'candidate-mean-v1',
      datasetId,
      construct: 'typical-content-reaction-intensity' as const,
      metricId: 'youtube.video.view-count' as const,
      materialClass: 'real' as const,
      resultEvidenceRef: 'evidence://method/mean',
    },
    {
      methodId: 'candidate-median-v1',
      datasetId,
      construct: 'typical-content-reaction-intensity' as const,
      metricId: 'youtube.video.view-count' as const,
      materialClass: 'real' as const,
      resultEvidenceRef: 'evidence://method/median',
    },
  ];
}

function reviewed(evidenceRef: string) {
  return {
    state: 'reviewed' as const,
    evidenceRef,
  };
}

test('complete real methodology evidence becomes decision-support-ready without selecting or ranking a method', () => {
  const primary = dataset({
    datasetId: 'dataset-age-7d',
    targetAge: 7 * 24 * 60 * 60 * 1000,
    contentCounts: [1, 2],
  });
  const age14 = dataset({
    datasetId: 'dataset-age-14d',
    targetAge: 14 * 24 * 60 * 60 * 1000,
    contentCounts: [1, 3],
  });

  const result = buildSnsFandomReactionMethodologyStudy({
    studyId: 'reaction-study-v1',
    primaryDataset: primary,
    supportingDatasets: [age14],
    methodEvidence: methodEvidence(primary.datasetId),
    contentAgeSensitivity: {
      ...reviewed('evidence://sensitivity/content-age'),
      comparedDatasetIds: [primary.datasetId, age14.datasetId],
    },
    releaseVolumeSensitivity: reviewed(
      'evidence://sensitivity/release-volume',
    ),
    missingnessSensitivity: reviewed(
      'evidence://sensitivity/missingness',
    ),
  });

  assert.equal(result.state, 'decision-support-ready');
  assert.equal(result.decisionSupportReady, true);
  assert.equal(result.distinctTargetContentAgeCount, 2);
  assert.ok(result.distinctSelectedContentCount >= 2);
  assert.deepEqual(result.comparedMethodIds, [
    'candidate-mean-v1',
    'candidate-median-v1',
  ]);
  assert.equal(result.selectedMethodId, null);
  assert.equal(result.methodRankingProduced, false);
  assert.equal(result.scoreProduced, false);
  assert.deepEqual(result.blockers, []);
});

test('one method is not a comparison and cannot support a methodology decision', () => {
  const primary = dataset({
    datasetId: 'dataset-age-7d',
    targetAge: 604800000,
  });
  const age14 = dataset({
    datasetId: 'dataset-age-14d',
    targetAge: 1209600000,
  });

  const result = buildSnsFandomReactionMethodologyStudy({
    studyId: 'one-method',
    primaryDataset: primary,
    supportingDatasets: [age14],
    methodEvidence: [methodEvidence(primary.datasetId)[0]],
    contentAgeSensitivity: {
      ...reviewed('evidence://age'),
      comparedDatasetIds: [primary.datasetId, age14.datasetId],
    },
    releaseVolumeSensitivity: reviewed('evidence://volume'),
    missingnessSensitivity: reviewed('evidence://missing'),
  });

  assert.equal(result.state, 'study-incomplete');
  assert.equal(result.decisionSupportReady, false);
  assert.ok(
    result.blockers.includes(
      'reaction-methodology-method-comparison-insufficient',
    ),
  );
});

test('content-age sensitivity requires real validation-ready datasets at distinct target ages', () => {
  const primary = dataset({
    datasetId: 'dataset-a',
    targetAge: 604800000,
  });
  const sameAge = dataset({
    datasetId: 'dataset-b',
    targetAge: 604800000,
  });

  const result = buildSnsFandomReactionMethodologyStudy({
    studyId: 'same-age',
    primaryDataset: primary,
    supportingDatasets: [sameAge],
    methodEvidence: methodEvidence(primary.datasetId),
    contentAgeSensitivity: {
      ...reviewed('evidence://age'),
      comparedDatasetIds: [primary.datasetId, sameAge.datasetId],
    },
    releaseVolumeSensitivity: reviewed('evidence://volume'),
    missingnessSensitivity: reviewed('evidence://missing'),
  });

  assert.equal(result.state, 'study-incomplete');
  assert.equal(result.distinctTargetContentAgeCount, 1);
  assert.equal(result.contentAgeSensitivityReviewed, false);
  assert.ok(
    result.blockers.includes(
      'reaction-methodology-content-age-sensitivity-evidence-incomplete',
    ),
  );
});

test('release-volume sensitivity cannot be marked reviewed when all real artist content counts are identical', () => {
  const primary = dataset({
    datasetId: 'dataset-a',
    targetAge: 604800000,
    contentCounts: [2, 2],
  });
  const age14 = dataset({
    datasetId: 'dataset-b',
    targetAge: 1209600000,
    contentCounts: [2, 2],
  });

  const result = buildSnsFandomReactionMethodologyStudy({
    studyId: 'no-volume-variation',
    primaryDataset: primary,
    supportingDatasets: [age14],
    methodEvidence: methodEvidence(primary.datasetId),
    contentAgeSensitivity: {
      ...reviewed('evidence://age'),
      comparedDatasetIds: [primary.datasetId, age14.datasetId],
    },
    releaseVolumeSensitivity: reviewed('evidence://volume'),
    missingnessSensitivity: reviewed('evidence://missing'),
  });

  assert.equal(result.releaseVolumeSensitivityReviewed, false);
  assert.equal(result.decisionSupportReady, false);
  assert.ok(
    result.blockers.includes(
      'reaction-methodology-release-volume-sensitivity-evidence-incomplete',
    ),
  );
});

test('missingness sensitivity remains incomplete without explicit evidence', () => {
  const primary = dataset({
    datasetId: 'dataset-a',
    targetAge: 604800000,
  });
  const age14 = dataset({
    datasetId: 'dataset-b',
    targetAge: 1209600000,
  });

  const result = buildSnsFandomReactionMethodologyStudy({
    studyId: 'missingness-unassessed',
    primaryDataset: primary,
    supportingDatasets: [age14],
    methodEvidence: methodEvidence(primary.datasetId),
    contentAgeSensitivity: {
      ...reviewed('evidence://age'),
      comparedDatasetIds: [primary.datasetId, age14.datasetId],
    },
    releaseVolumeSensitivity: reviewed('evidence://volume'),
    missingnessSensitivity: {
      state: 'unassessed',
      evidenceRef: null,
    },
  });

  assert.equal(result.missingnessSensitivityReviewed, false);
  assert.equal(result.decisionSupportReady, false);
  assert.ok(
    result.blockers.includes(
      'reaction-methodology-missingness-sensitivity-evidence-incomplete',
    ),
  );
});

test('supporting dataset construct mismatch is a hard block', () => {
  const primary = dataset({
    datasetId: 'dataset-a',
    targetAge: 604800000,
  });
  const mismatch = dataset({
    datasetId: 'dataset-b',
    targetAge: 1209600000,
    construct: 'window-total-reaction-volume',
  });

  const result = buildSnsFandomReactionMethodologyStudy({
    studyId: 'construct-mismatch',
    primaryDataset: primary,
    supportingDatasets: [mismatch],
    methodEvidence: methodEvidence(primary.datasetId),
    contentAgeSensitivity: {
      ...reviewed('evidence://age'),
      comparedDatasetIds: [primary.datasetId, mismatch.datasetId],
    },
    releaseVolumeSensitivity: reviewed('evidence://volume'),
    missingnessSensitivity: reviewed('evidence://missing'),
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.decisionSupportReady, false);
  assert.ok(
    result.blockers.includes(
      'reaction-methodology-dataset-construct-mismatch',
    ),
  );
});

test('method result evidence must be bound to the primary real dataset', () => {
  const primary = dataset({
    datasetId: 'dataset-a',
    targetAge: 604800000,
  });
  const age14 = dataset({
    datasetId: 'dataset-b',
    targetAge: 1209600000,
  });
  const methods = methodEvidence('other-dataset');

  const result = buildSnsFandomReactionMethodologyStudy({
    studyId: 'method-dataset-mismatch',
    primaryDataset: primary,
    supportingDatasets: [age14],
    methodEvidence: methods,
    contentAgeSensitivity: {
      ...reviewed('evidence://age'),
      comparedDatasetIds: [primary.datasetId, age14.datasetId],
    },
    releaseVolumeSensitivity: reviewed('evidence://volume'),
    missingnessSensitivity: reviewed('evidence://missing'),
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'reaction-methodology-method-dataset-mismatch',
    ),
  );
});
