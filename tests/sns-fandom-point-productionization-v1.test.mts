import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSnsFandomPersistenceEvidence,
  evaluateSnsFandomPointReadiness,
  SNS_FANDOM_PROVIDER_QUALIFICATIONS,
  type SnsFandomObservation,
  validateSnsFandomObservation,
} from '../lib/intelligence/snsFandomPointContracts';
import {
  buildYoutubeSnsFandomCandidate,
} from '../lib/intelligence/snsFandomPointYoutubeCandidate';

function observation(
  overrides: Partial<SnsFandomObservation> = {},
): SnsFandomObservation {
  return {
    contractVersion: 'fandex-observation-v1',
    observationId: 'obs-1',
    providerId: 'youtube-data-api',
    entity: {
      entityType: 'artist',
      canonicalArtistId: 'iu',
      providerArtistId: 'UC-example',
      providerContentId: 'video-1',
      identityState: 'bound',
    },
    variable: {
      variableId: 'snsFandomPoint',
      metricFamily: 'sns-fandom',
      dimension: 'public-reaction-diffusion',
      metricId: 'youtube.video.comment-count',
      metricRole: 'construct-evidence',
    },
    value: {
      rawValue: 10,
      unit: 'count',
      missingState: 'observed',
    },
    time: {
      providerPeriodStart: null,
      providerPeriodEnd: null,
      observedAt: '2026-10-01T00:00:00.000Z',
      collectedAt: '2026-10-01T00:01:00.000Z',
    },
    evidence: {
      evidenceRef: 'evidence://youtube/video-1/20261001t000000z',
      revision: null,
    },
    lifecycle: {
      state: 'research',
      materialClass: 'real',
      blockers: [],
    },
    ...overrides,
  };
}

test('current provider matrix intentionally has no Production-ready source', () => {
  assert.equal(
    SNS_FANDOM_PROVIDER_QUALIFICATIONS.some(
      (item) => item.state === 'production-ready',
    ),
    false,
  );

  const youtube = SNS_FANDOM_PROVIDER_QUALIFICATIONS.find(
    (item) => item.providerId === 'youtube-data-api',
  );
  assert.equal(youtube?.state, 'conditional-approval-required');

  const tiktokResearch = SNS_FANDOM_PROVIDER_QUALIFICATIONS.find(
    (item) => item.providerId === 'tiktok-research-api',
  );
  assert.equal(tiktokResearch?.state, 'not-production-eligible');
});

test('missing is not zero and unsupported is not missing', () => {
  const missing = observation({
    value: {
      rawValue: null,
      unit: null,
      missingState: 'missing',
    },
  });
  const unsupported = observation({
    value: {
      rawValue: null,
      unit: null,
      missingState: 'unsupported',
    },
  });

  assert.equal(validateSnsFandomObservation(missing).ok, true);
  assert.equal(validateSnsFandomObservation(unsupported).ok, true);
  assert.notEqual(
    missing.value.missingState,
    unsupported.value.missingState,
  );

  const invalidZero = observation({
    value: {
      rawValue: 0,
      unit: 'count',
      missingState: 'missing',
    },
  });
  assert.deepEqual(
    validateSnsFandomObservation(invalidZero).blockers,
    [
      'non-observed-raw-value-must-be-null',
      'non-observed-unit-must-be-null',
    ],
  );
});

test('observation time and collection time remain distinct semantics', () => {
  const invalid = observation({
    time: {
      providerPeriodStart: null,
      providerPeriodEnd: null,
      observedAt: '2026-10-01T00:02:00.000Z',
      collectedAt: '2026-10-01T00:01:00.000Z',
    },
  });

  assert.deepEqual(
    validateSnsFandomObservation(invalid).blockers,
    ['collection-precedes-observation'],
  );
});

test('persistence evidence requires temporal history and does not infer fan identity', () => {
  const one = buildSnsFandomPersistenceEvidence([
    observation(),
  ]);
  assert.equal(one[0]?.state, 'history-insufficient');
  assert.equal(one[0]?.derivedNumericValue, null);
  assert.equal(one[0]?.inferenceOfFanIdentity, false);

  const two = buildSnsFandomPersistenceEvidence([
    observation(),
    observation({
      observationId: 'obs-2',
      value: {
        rawValue: 14,
        unit: 'count',
        missingState: 'observed',
      },
      time: {
        providerPeriodStart: null,
        providerPeriodEnd: null,
        observedAt: '2026-10-02T00:00:00.000Z',
        collectedAt: '2026-10-02T00:01:00.000Z',
      },
    }),
  ]);
  assert.equal(two[0]?.state, 'temporal-history-present');
  assert.equal(two[0]?.distinctObservationTimeCount, 2);
  assert.equal(two[0]?.derivedNumericValue, null);
});

test('current Real Product readiness fails closed on provider rights', () => {
  const result = evaluateSnsFandomPointReadiness({
    canonicalArtistId: 'iu',
    observations: [],
  });

  assert.equal(result.state, 'provider-rights-blocked');
  assert.equal(result.snsFandomPoint, null);
  assert.equal(result.numericProductEligible, false);
  assert.equal(result.productActivationReady, false);
  assert.equal(result.productPublicationReady, false);
  assert.equal(result.previewFallbackAllowed, false);
  assert.equal(result.crossPlatformRawAverageAllowed, false);
  assert.equal(result.followerCountAloneAllowedAsFandom, false);
  assert.equal(result.mentionCountAloneAllowedAsSnsFandom, false);
  assert.ok(result.blockers.includes('no-qualified-production-provider'));
});

test('YouTube adapter emits no observations before rights approval', () => {
  const result = buildYoutubeSnsFandomCandidate({
    snapshots: [],
    providerApproval: {
      analyticsDerivedMetricsUseCaseApproved: false,
      retentionExtensionOrRefreshPolicyApproved: false,
    },
  });

  assert.equal(result.state, 'rights-blocked');
  assert.deepEqual(result.observations, []);
  assert.deepEqual(result.persistenceEvidence, []);
  assert.deepEqual(result.blockers, [
    'youtube-derived-metrics-approval-missing',
    'youtube-retention-policy-approval-missing',
  ]);
});

test('YouTube candidate keeps subscriber count context-only and preserves missing values', () => {
  const result = buildYoutubeSnsFandomCandidate({
    snapshots: [
      {
        canonicalArtistId: 'iu',
        youtubeChannelId: 'UC-iu',
        observedAt: '2026-10-01T00:00:00.000Z',
        collectedAt: '2026-10-01T00:01:00.000Z',
        videos: [
          {
            videoId: 'video-1',
            viewCount: 100,
            likeCount: null,
            commentCount: 10,
          },
        ],
        channelSubscriberCount: 1000,
        evidenceRef: 'evidence://youtube/iu/1',
      },
    ],
    providerApproval: {
      analyticsDerivedMetricsUseCaseApproved: true,
      retentionExtensionOrRefreshPolicyApproved: true,
    },
  });

  assert.equal(result.state, 'normalized-candidate');
  if (result.state !== 'normalized-candidate') return;

  const subscriber = result.observations.find(
    (item) =>
      item.variable.metricId === 'youtube.channel.subscriber-count',
  );
  assert.equal(subscriber?.variable.metricRole, 'context-only');

  const likes = result.observations.find(
    (item) => item.variable.metricId === 'youtube.video.like-count',
  );
  assert.deepEqual(likes?.value, {
    rawValue: null,
    unit: null,
    missingState: 'missing',
  });
});

test('even dual-dimension source evidence does not invent a numeric snsFandomPoint', () => {
  const productionQualifications =
    SNS_FANDOM_PROVIDER_QUALIFICATIONS.map((item) =>
      item.providerId === 'youtube-data-api'
        ? { ...item, state: 'production-ready' as const, blockers: [] }
        : item,
    );

  const observations = [
    observation(),
    observation({
      observationId: 'obs-2',
      value: {
        rawValue: 12,
        unit: 'count',
        missingState: 'observed',
      },
      time: {
        providerPeriodStart: null,
        providerPeriodEnd: null,
        observedAt: '2026-10-02T00:00:00.000Z',
        collectedAt: '2026-10-02T00:01:00.000Z',
      },
    }),
  ];

  const result = evaluateSnsFandomPointReadiness({
    canonicalArtistId: 'iu',
    observations,
    providerQualifications: productionQualifications,
  });

  assert.equal(result.state, 'dual-dimension-evidence-ready');
  assert.equal(result.observedReactionEvidenceCount, 2);
  assert.equal(result.temporalPersistenceEvidenceCount, 1);
  assert.equal(result.snsFandomPoint, null);
  assert.equal(result.numericProductEligible, false);
  assert.ok(
    result.blockers.includes(
      'cross-dimension-combination-methodology-not-approved',
    ),
  );
});
