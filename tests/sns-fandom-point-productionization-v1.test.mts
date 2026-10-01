import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildSnsFandomPersistenceEvidence,
  evaluateSnsFandomPointReadiness,
  SNS_FANDOM_PROVIDER_QUALIFICATIONS,
  type SnsFandomArtistProviderEntitlement,
  type SnsFandomObservation,
  type SnsFandomProviderApprovalEvidence,
  validateSnsFandomArtistProviderEntitlement,
  validateSnsFandomObservation,
  validateSnsFandomProviderApprovalEvidence,
} from '../lib/intelligence/snsFandomPointContracts';
import {
  buildYoutubeSnsFandomCandidate,
} from '../lib/intelligence/snsFandomPointYoutubeCandidate';
import {
  buildYoutubeAnalyticsFandomPersistenceCandidate,
} from '../lib/intelligence/snsFandomPointYoutubeAnalyticsCandidate';
import {
  buildYoutubePublicCommentPersistenceCandidate,
} from '../lib/intelligence/snsFandomPointYoutubeCommentPersistenceCandidate';
import {
  ARTIST_EXPANSION_YOUTUBE_COLLECTOR_V1_COMPATIBILITY,
  ARTIST_EXPANSION_YOUTUBE_COLLECTOR_V1_PROFILE,
  evaluateYoutubeCollectorCompatibility,
} from '../lib/intelligence/snsFandomPointYoutubeCollectorCompatibility';
import {
  buildSnsFandomYoutubeCollectorBridge,
} from '../lib/intelligence/snsFandomPointYoutubeCollectorBridge';

function youtubeAnalyticsEntitlement(
  overrides: Partial<SnsFandomArtistProviderEntitlement> = {},
): SnsFandomArtistProviderEntitlement {
  return {
    contractVersion: 'sns-fandom-artist-provider-entitlement-v1',
    canonicalArtistId: 'iu',
    providerId: 'youtube-analytics-api',
    providerArtistId: 'UC-iu',
    authorizationClass: 'channel-owner-oauth',
    state: 'active',
    allowedDimensions: ['fandom-activity-persistence'],
    authorizedScopes: [
      'https://www.googleapis.com/auth/yt-analytics.readonly',
    ],
    verifiedAt: '2026-09-30T23:00:00.000Z',
    validFrom: '2026-09-30T23:00:00.000Z',
    validUntil: null,
    evidenceRef: 'evidence://oauth/youtube-analytics/iu',
    rights: {
      commercialProductUse: true,
      recurringAutomatedCollection: true,
      storageRetention: true,
      derivedMetricPublication: true,
    },
    ...overrides,
  };
}

function youtubeStatsProviderApproval(
  overrides: Partial<SnsFandomProviderApprovalEvidence> = {},
): SnsFandomProviderApprovalEvidence {
  return {
    contractVersion: 'sns-fandom-provider-approval-evidence-v1',
    providerId: 'youtube-data-api',
    state: 'approved',
    approvalClass: 'youtube-analytics-derived-metrics-data-storage',
    useCase: 'analytics-reporting',
    approvedDimensions: ['public-reaction-diffusion'],
    approvedMetricIds: [
      'youtube.video.view-count',
      'youtube.video.like-count',
      'youtube.video.comment-count',
      'youtube.channel.subscriber-count',
    ],
    allowedEndpoints: [
      'youtube.videos.list',
      'youtube.channels.list',
    ],
    approvedAt: '2026-10-01T00:00:00.000Z',
    validUntil: null,
    evidenceRef: 'evidence://youtube/audit/fandex/reaction-v1',
    rights: {
      commercialProductUse: true,
      recurringAutomatedCollection: true,
      aggregateRetention: true,
      derivedMetricPublication: true,
    },
    retention: {
      statisticalDataMonths: 36,
      derivedMetricMonths: 36,
      nonStatisticalDataRefreshDays: 30,
    },
    ...overrides,
  };
}

function youtubeCommentProviderApproval(
  overrides: Partial<SnsFandomProviderApprovalEvidence> = {},
): SnsFandomProviderApprovalEvidence {
  return {
    contractVersion: 'sns-fandom-provider-approval-evidence-v1',
    providerId: 'youtube-comments-derived',
    state: 'approved',
    approvalClass: 'youtube-analytics-derived-metrics-data-storage',
    useCase: 'analytics-reporting',
    approvedDimensions: ['fandom-activity-persistence'],
    approvedMetricIds: [
      'youtube.public-commenter.cross-content-repeat-count',
      'youtube.public-commenter.distinct-count',
    ],
    allowedEndpoints: [
      'youtube.commentThreads.list',
      'youtube.comments.list',
    ],
    approvedAt: '2026-10-01T00:00:00.000Z',
    validUntil: null,
    evidenceRef: 'evidence://youtube/audit/fandex/comment-persistence-v1',
    rights: {
      commercialProductUse: true,
      recurringAutomatedCollection: true,
      aggregateRetention: true,
      derivedMetricPublication: true,
    },
    retention: {
      statisticalDataMonths: 36,
      derivedMetricMonths: 36,
      nonStatisticalDataRefreshDays: 30,
    },
    ...overrides,
  };
}

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

test('current Artist Expansion YouTube collector is rejected for snsFandom Production evidence', () => {
  assert.equal(
    ARTIST_EXPANSION_YOUTUBE_COLLECTOR_V1_COMPATIBILITY.state,
    'not-production-compatible',
  );
  assert.equal(
    ARTIST_EXPANSION_YOUTUBE_COLLECTOR_V1_COMPATIBILITY
      .productionCompatible,
    false,
  );
  assert.deepEqual(
    ARTIST_EXPANSION_YOUTUBE_COLLECTOR_V1_COMPATIBILITY.blockers,
    [
      'youtube-collector-missing-semantics-not-preserved',
      'youtube-collector-provider-channel-id-missing',
      'youtube-collector-observed-at-missing',
      'youtube-collector-collected-at-missing',
      'youtube-collector-raw-response-retention-unqualified',
      'youtube-collector-evidence-ref-missing',
    ],
  );
});

test('collector compatibility becomes eligible only when missing/time/identity/evidence/retention semantics are all explicit', () => {
  const compatible = evaluateYoutubeCollectorCompatibility({
    ...ARTIST_EXPANSION_YOUTUBE_COLLECTOR_V1_PROFILE,
    sourceRef: 'hypothetical-fixed-collector',
    missingStatisticSemantics: 'preserve-null',
    emitsProviderChannelId: true,
    emitsObservedAt: true,
    emitsCollectedAt: true,
    persistsRawApiResponse: false,
    rawApiResponseRetentionQualified: false,
    emitsEvidenceRef: true,
  });

  assert.equal(compatible.state, 'production-compatible');
  assert.equal(compatible.productionCompatible, true);
  assert.deepEqual(compatible.blockers, []);
});

test('collector bridge rejects the current legacy collector before reading candidate data', () => {
  const result = buildSnsFandomYoutubeCollectorBridge({
    collectorProfile: ARTIST_EXPANSION_YOUTUBE_COLLECTOR_V1_PROFILE,
    batch: {
      contractVersion: 'sns-fandom-youtube-collector-export-v1',
      canonicalArtistId: 'iu',
      providerChannelId: 'UC-iu',
      observedAt: '2026-10-01T00:00:00.000Z',
      collectedAt: '2026-10-01T00:01:00.000Z',
      evidenceRef: 'evidence://youtube/iu/collector',
      channelSubscriberCount: null,
      videos: [],
    },
    providerApproval: youtubeStatsProviderApproval(),
    evaluatedAt: '2026-10-01T00:02:00.000Z',
  });

  assert.equal(result.state, 'collector-incompatible');
  assert.equal(result.candidate, null);
  assert.ok(
    result.blockers.includes(
      'youtube-collector-missing-semantics-not-preserved',
    ),
  );
});

test('collector bridge preserves null missing values and exact observation time after compatibility is fixed', () => {
  const compatibleProfile = {
    ...ARTIST_EXPANSION_YOUTUBE_COLLECTOR_V1_PROFILE,
    collectorId: 'youtube-collector-hypothetical-fixed-v2',
    sourceRef: 'hypothetical-fixed-v2',
    missingStatisticSemantics: 'preserve-null' as const,
    emitsProviderChannelId: true,
    emitsObservedAt: true,
    emitsCollectedAt: true,
    persistsRawApiResponse: false,
    rawApiResponseRetentionQualified: false,
    emitsEvidenceRef: true,
  };

  const result = buildSnsFandomYoutubeCollectorBridge({
    collectorProfile: compatibleProfile,
    batch: {
      contractVersion: 'sns-fandom-youtube-collector-export-v1',
      canonicalArtistId: 'iu',
      providerChannelId: 'UC-iu',
      observedAt: '2026-10-01T00:00:00.000Z',
      collectedAt: '2026-10-01T00:01:00.000Z',
      evidenceRef: 'evidence://youtube/iu/collector-fixed',
      channelSubscriberCount: null,
      videos: [
        {
          videoId: 'video-1',
          viewCount: 100,
          likeCount: null,
          commentCount: 10,
        },
      ],
    },
    providerApproval: youtubeStatsProviderApproval(),
    evaluatedAt: '2026-10-01T00:02:00.000Z',
  });

  assert.equal(result.state, 'candidate-built');
  assert.ok(result.candidate);
  assert.equal(result.candidate?.state, 'normalized-candidate');
  if (result.candidate?.state !== 'normalized-candidate') return;

  const likes = result.candidate.observations.find(
    (item) => item.variable.metricId === 'youtube.video.like-count',
  );
  assert.deepEqual(likes?.value, {
    rawValue: null,
    unit: null,
    missingState: 'missing',
  });
  assert.equal(
    likes?.entity.providerArtistId,
    'UC-iu',
  );
  assert.equal(
    likes?.time.observedAt,
    '2026-10-01T00:00:00.000Z',
  );
  assert.equal(
    likes?.time.collectedAt,
    '2026-10-01T00:01:00.000Z',
  );
});

test('collector bridge rejects duplicate video ids and invalid counts before normalization', () => {
  const compatibleProfile = {
    ...ARTIST_EXPANSION_YOUTUBE_COLLECTOR_V1_PROFILE,
    collectorId: 'youtube-collector-hypothetical-fixed-v2',
    sourceRef: 'hypothetical-fixed-v2',
    missingStatisticSemantics: 'preserve-null' as const,
    emitsProviderChannelId: true,
    emitsObservedAt: true,
    emitsCollectedAt: true,
    persistsRawApiResponse: false,
    rawApiResponseRetentionQualified: false,
    emitsEvidenceRef: true,
  };

  const result = buildSnsFandomYoutubeCollectorBridge({
    collectorProfile: compatibleProfile,
    batch: {
      contractVersion: 'sns-fandom-youtube-collector-export-v1',
      canonicalArtistId: 'iu',
      providerChannelId: 'UC-iu',
      observedAt: '2026-10-01T00:00:00.000Z',
      collectedAt: '2026-10-01T00:01:00.000Z',
      evidenceRef: 'evidence://youtube/iu/invalid',
      channelSubscriberCount: null,
      videos: [
        {
          videoId: 'video-1',
          viewCount: -1,
          likeCount: null,
          commentCount: 1,
        },
        {
          videoId: 'video-1',
          viewCount: 1,
          likeCount: 1,
          commentCount: 1,
        },
      ],
    },
    providerApproval: youtubeStatsProviderApproval(),
    evaluatedAt: '2026-10-01T00:02:00.000Z',
  });

  assert.equal(result.state, 'input-blocked');
  assert.equal(result.candidate, null);
  assert.ok(
    result.blockers.includes('youtube-collector-export-video-count-invalid'),
  );
  assert.ok(
    result.blockers.includes('youtube-collector-export-video-id-duplicate'),
  );
});

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

  const youtubeAnalytics = SNS_FANDOM_PROVIDER_QUALIFICATIONS.find(
    (item) => item.providerId === 'youtube-analytics-api',
  );
  assert.equal(youtubeAnalytics?.state, 'authorized-account-only');
  assert.deepEqual(
    youtubeAnalytics?.constructCoverage,
    ['fandom-activity-persistence'],
  );

  const tiktokResearch = SNS_FANDOM_PROVIDER_QUALIFICATIONS.find(
    (item) => item.providerId === 'tiktok-research-api',
  );
  assert.equal(tiktokResearch?.state, 'not-production-eligible');
});

test('artist entitlement is fail-closed on rights, validity, and exact artist identity', () => {
  const active = youtubeAnalyticsEntitlement();
  assert.equal(
    validateSnsFandomArtistProviderEntitlement(
      active,
      '2026-10-01T00:00:00.000Z',
    ).ok,
    true,
  );

  const incompleteRights = youtubeAnalyticsEntitlement({
    rights: {
      commercialProductUse: true,
      recurringAutomatedCollection: true,
      storageRetention: false,
      derivedMetricPublication: true,
    },
  });
  assert.deepEqual(
    validateSnsFandomArtistProviderEntitlement(
      incompleteRights,
      '2026-10-01T00:00:00.000Z',
    ).blockers,
    ['artist-provider-entitlement-rights-incomplete'],
  );

  const expired = youtubeAnalyticsEntitlement({
    validUntil: '2026-09-30T23:30:00.000Z',
  });
  assert.deepEqual(
    validateSnsFandomArtistProviderEntitlement(
      expired,
      '2026-10-01T00:00:00.000Z',
    ).blockers,
    ['artist-provider-entitlement-expired-by-time'],
  );
});

test('provider approval evidence is fail-closed on rights, validity, and YouTube retention caps', () => {
  const active = youtubeStatsProviderApproval();
  assert.equal(
    validateSnsFandomProviderApprovalEvidence(
      active,
      '2026-10-01T00:02:00.000Z',
    ).ok,
    true,
  );

  const incompleteRights = youtubeStatsProviderApproval({
    rights: {
      commercialProductUse: true,
      recurringAutomatedCollection: true,
      aggregateRetention: false,
      derivedMetricPublication: true,
    },
  });
  assert.deepEqual(
    validateSnsFandomProviderApprovalEvidence(
      incompleteRights,
      '2026-10-01T00:02:00.000Z',
    ).blockers,
    ['provider-approval-rights-incomplete'],
  );

  const excessiveRetention = youtubeStatsProviderApproval({
    retention: {
      statisticalDataMonths: 37,
      derivedMetricMonths: 36,
      nonStatisticalDataRefreshDays: 30,
    },
  });
  assert.deepEqual(
    validateSnsFandomProviderApprovalEvidence(
      excessiveRetention,
      '2026-10-01T00:02:00.000Z',
    ).blockers,
    ['youtube-provider-approval-statistical-retention-invalid'],
  );
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

test('provider period ordering is validated independently from collection time', () => {
  const invalid = observation({
    time: {
      providerPeriodStart: '2026-10-02T00:00:00.000Z',
      providerPeriodEnd: '2026-10-01T23:59:59.999Z',
      observedAt: '2026-10-01T12:00:00.000Z',
      collectedAt: '2026-10-02T00:01:00.000Z',
    },
  });

  assert.deepEqual(
    validateSnsFandomObservation(invalid).blockers,
    [
      'provider-period-order-invalid',
      'observation-precedes-provider-period-end',
    ],
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
  assert.equal(two[0]?.dimension, 'public-reaction-diffusion');
  assert.equal(two[0]?.providerContentId, 'video-1');
  assert.equal(two[0]?.distinctObservationTimeCount, 2);
  assert.equal(two[0]?.derivedNumericValue, null);
});

test('persistence history never combines different provider content implicitly', () => {
  const split = buildSnsFandomPersistenceEvidence([
    observation(),
    observation({
      observationId: 'obs-other-content',
      entity: {
        entityType: 'artist',
        canonicalArtistId: 'iu',
        providerArtistId: 'UC-example',
        providerContentId: 'video-2',
        identityState: 'bound',
      },
      time: {
        providerPeriodStart: null,
        providerPeriodEnd: null,
        observedAt: '2026-10-02T00:00:00.000Z',
        collectedAt: '2026-10-02T00:01:00.000Z',
      },
    }),
  ]);

  assert.equal(split.length, 2);
  assert.ok(split.every((item) => item.state === 'history-insufficient'));
  assert.deepEqual(
    split.map((item) => item.providerContentId).sort(),
    ['video-1', 'video-2'],
  );
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
  assert.ok(
    result.blockers.includes(
      'public-reaction-diffusion-provider-rights-blocked',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'fandom-activity-persistence-provider-rights-blocked',
    ),
  );
});

test('YouTube adapter emits no observations before provider approval evidence', () => {
  const result = buildYoutubeSnsFandomCandidate({
    snapshots: [],
    providerApproval: null,
    evaluatedAt: '2026-10-01T00:02:00.000Z',
  });

  assert.equal(result.state, 'rights-blocked');
  assert.deepEqual(result.observations, []);
  assert.deepEqual(result.persistenceEvidence, []);
  assert.deepEqual(result.blockers, [
    'youtube-provider-approval-evidence-missing',
  ]);
});

test('YouTube Analytics persistence adapter emits nothing without artist entitlement', () => {
  const result = buildYoutubeAnalyticsFandomPersistenceCandidate({
    snapshots: [],
    entitlement: null,
    evaluatedAt: '2026-10-01T00:00:00.000Z',
  });

  assert.equal(result.state, 'entitlement-blocked');
  assert.deepEqual(result.observations, []);
  assert.deepEqual(result.persistenceEvidence, []);
  assert.deepEqual(result.blockers, [
    'youtube-analytics-channel-owner-entitlement-missing',
  ]);
});

test('YouTube Analytics adapter fails closed on revoked entitlement even with no snapshots', () => {
  const result = buildYoutubeAnalyticsFandomPersistenceCandidate({
    snapshots: [],
    entitlement: youtubeAnalyticsEntitlement({
      state: 'revoked',
    }),
    evaluatedAt: '2026-10-01T00:00:00.000Z',
  });

  assert.equal(result.state, 'entitlement-blocked');
  assert.deepEqual(result.observations, []);
  assert.ok(
    result.blockers.includes('youtube-analytics-entitlement-not-active'),
  );
});

test('YouTube Analytics adapter rejects mismatched artist/channel entitlement', () => {
  const result = buildYoutubeAnalyticsFandomPersistenceCandidate({
    entitlement: youtubeAnalyticsEntitlement({
      canonicalArtistId: 'other-artist',
    }),
    evaluatedAt: '2026-10-01T00:00:00.000Z',
    snapshots: [
      {
        canonicalArtistId: 'iu',
        youtubeChannelId: 'UC-iu',
        providerPeriodStart: '2026-09-30T00:00:00.000Z',
        providerPeriodEnd: '2026-09-30T23:59:59.999Z',
        observedAt: '2026-10-01T00:00:00.000Z',
        collectedAt: '2026-10-01T00:01:00.000Z',
        subscribedViews: 140,
        evidenceRef: 'evidence://youtube-analytics/iu/2026-09-30',
      },
    ],
  });

  assert.equal(result.state, 'entitlement-blocked');
  assert.deepEqual(result.observations, []);
  assert.ok(
    result.blockers.includes(
      'youtube-analytics-entitlement-not-active-for-snapshot',
    ),
  );
});

test('authorized YouTube Analytics subscriber activity remains a bounded persistence proxy', () => {
  const result = buildYoutubeAnalyticsFandomPersistenceCandidate({
    entitlement: youtubeAnalyticsEntitlement(),
    evaluatedAt: '2026-10-01T00:02:00.000Z',
    snapshots: [
      {
        canonicalArtistId: 'iu',
        youtubeChannelId: 'UC-iu',
        providerPeriodStart: '2026-09-29T00:00:00.000Z',
        providerPeriodEnd: '2026-09-29T23:59:59.999Z',
        observedAt: '2026-09-30T00:00:00.000Z',
        collectedAt: '2026-09-30T00:01:00.000Z',
        subscribedViews: 120,
        evidenceRef: 'evidence://youtube-analytics/iu/2026-09-29',
      },
      {
        canonicalArtistId: 'iu',
        youtubeChannelId: 'UC-iu',
        providerPeriodStart: '2026-09-30T00:00:00.000Z',
        providerPeriodEnd: '2026-09-30T23:59:59.999Z',
        observedAt: '2026-10-01T00:00:00.000Z',
        collectedAt: '2026-10-01T00:01:00.000Z',
        subscribedViews: 140,
        evidenceRef: 'evidence://youtube-analytics/iu/2026-09-30',
      },
    ],
  });

  assert.equal(result.state, 'normalized-authorized-account-candidate');
  assert.equal(result.observations.length, 2);
  assert.ok(result.observations.every(
    (item) =>
      item.providerId === 'youtube-analytics-api'
      && item.variable.dimension === 'fandom-activity-persistence'
      && item.variable.metricId
        === 'youtube.analytics.subscribed-view-count',
  ));
  assert.equal(result.persistenceEvidence.length, 1);
  assert.equal(
    result.persistenceEvidence[0]?.state,
    'temporal-history-present',
  );
  assert.equal(result.persistenceEvidence[0]?.derivedNumericValue, null);
  assert.equal(result.persistenceEvidence[0]?.inferenceOfFanIdentity, false);
  assert.deepEqual(result.blockers, [
    'youtube-analytics-generic-kpop-coverage-not-established',
  ]);
});

test('public-comment persistence candidate is completely silent before derived-metric rights approval', () => {
  const result = buildYoutubePublicCommentPersistenceCandidate({
    batch: {
      canonicalArtistId: 'iu',
      youtubeChannelId: 'UC-iu',
      providerPeriodStart: '2026-09-01T00:00:00.000Z',
      providerPeriodEnd: '2026-09-30T23:59:59.999Z',
      observedAt: '2026-10-01T00:00:00.000Z',
      collectedAt: '2026-10-01T00:01:00.000Z',
      comments: [],
      evidenceRef: 'evidence://youtube-comments/iu/2026-09',
    },
    providerApproval: null,
    evaluatedAt: '2026-10-01T00:02:00.000Z',
  });

  assert.equal(result.state, 'rights-blocked');
  assert.deepEqual(result.observations, []);
  assert.deepEqual(result.persistenceEvidence, []);
  assert.ok(
    result.blockers.includes(
      'youtube-commenter-recurrence-provider-approval-evidence-missing',
    ),
  );
});

test('public-comment recurrence is aggregated across distinct official content without persisting commenter identity', () => {
  const result = buildYoutubePublicCommentPersistenceCandidate({
    batch: {
      canonicalArtistId: 'iu',
      youtubeChannelId: 'UC-iu',
      providerPeriodStart: '2026-09-01T00:00:00.000Z',
      providerPeriodEnd: '2026-09-30T23:59:59.999Z',
      observedAt: '2026-10-01T00:00:00.000Z',
      collectedAt: '2026-10-01T00:01:00.000Z',
      comments: [
        {
          videoId: 'video-a',
          commentId: 'comment-1',
          authorChannelId: 'author-repeat',
          publishedAt: '2026-09-10T00:00:00.000Z',
        },
        {
          videoId: 'video-b',
          commentId: 'comment-2',
          authorChannelId: 'author-repeat',
          publishedAt: '2026-09-11T00:00:00.000Z',
        },
        {
          videoId: 'video-a',
          commentId: 'comment-3',
          authorChannelId: 'author-single',
          publishedAt: '2026-09-12T00:00:00.000Z',
        },
        {
          videoId: 'video-a',
          commentId: 'comment-3',
          authorChannelId: 'author-single',
          publishedAt: '2026-09-12T00:00:00.000Z',
        },
        {
          videoId: 'video-c',
          commentId: 'comment-4',
          authorChannelId: null,
          publishedAt: '2026-09-13T00:00:00.000Z',
        },
      ],
      evidenceRef: 'evidence://youtube-comments/iu/2026-09',
    },
    providerApproval: youtubeCommentProviderApproval(),
    evaluatedAt: '2026-10-01T00:02:00.000Z',
  });

  assert.equal(result.state, 'normalized-candidate');
  assert.equal(result.summary.receivedCommentCount, 5);
  assert.equal(result.summary.duplicateCommentCount, 1);
  assert.equal(result.summary.missingAuthorChannelCount, 1);
  assert.equal(result.summary.distinctPublicCommenterCount, 2);
  assert.equal(result.summary.returningPublicCommenterCount, 1);
  assert.equal(result.safety.rawCommentIdsPersisted, false);
  assert.equal(result.safety.rawCommenterChannelIdsPersisted, false);
  assert.equal(result.safety.individualFanIdentityInferred, false);
  assert.equal(
    result.observations.find(
      (item) =>
        item.variable.metricId
          === 'youtube.public-commenter.cross-content-repeat-count',
    )?.value.rawValue,
    1,
  );

  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /author-repeat/);
  assert.doesNotMatch(serialized, /author-single/);
  assert.doesNotMatch(serialized, /comment-1/);
  assert.doesNotMatch(serialized, /comment-2/);
});

test('public-comment recurrence fails closed when a comment falls outside the declared provider period', () => {
  const result = buildYoutubePublicCommentPersistenceCandidate({
    batch: {
      canonicalArtistId: 'iu',
      youtubeChannelId: 'UC-iu',
      providerPeriodStart: '2026-09-01T00:00:00.000Z',
      providerPeriodEnd: '2026-09-30T23:59:59.999Z',
      observedAt: '2026-10-01T00:00:00.000Z',
      collectedAt: '2026-10-01T00:01:00.000Z',
      comments: [
        {
          videoId: 'video-a',
          commentId: 'comment-outside',
          authorChannelId: 'author-x',
          publishedAt: '2026-10-01T00:00:00.000Z',
        },
      ],
      evidenceRef: 'evidence://youtube-comments/iu/2026-09',
    },
    providerApproval: youtubeCommentProviderApproval(),
    evaluatedAt: '2026-10-01T00:02:00.000Z',
  });

  assert.equal(result.state, 'input-blocked');
  assert.deepEqual(result.observations, []);
  assert.ok(
    result.blockers.includes(
      'youtube-comment-persistence-comment-outside-period',
    ),
  );
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
    providerApproval: youtubeStatsProviderApproval(),
    evaluatedAt: '2026-10-01T00:02:00.000Z',
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

test('validated provider approval evidence makes only its exact provider metrics evidence-eligible', () => {
  const approved = youtubeStatsProviderApproval();
  const result = evaluateSnsFandomPointReadiness({
    canonicalArtistId: 'iu',
    observations: [observation()],
    providerApprovals: [approved],
    evaluatedAt: '2026-10-01T00:02:00.000Z',
  });

  assert.equal(result.state, 'provider-rights-blocked');
  assert.deepEqual(result.productionReadyProviders, []);
  assert.deepEqual(result.providerApprovedProviders, ['youtube-data-api']);
  assert.deepEqual(result.evidenceEligibleProviders, ['youtube-data-api']);
  assert.equal(result.observedReactionEvidenceCount, 1);
  assert.equal(result.temporalPersistenceEvidenceCount, 0);
  assert.ok(
    result.blockers.includes(
      'fandom-activity-persistence-provider-rights-blocked',
    ),
  );
});

test('approval for one YouTube metric never authorizes an unlisted metric', () => {
  const approved = youtubeStatsProviderApproval({
    approvedMetricIds: ['youtube.video.view-count'],
  });
  const result = evaluateSnsFandomPointReadiness({
    canonicalArtistId: 'iu',
    observations: [observation()],
    providerApprovals: [approved],
    evaluatedAt: '2026-10-01T00:02:00.000Z',
  });

  assert.deepEqual(result.providerApprovedProviders, ['youtube-data-api']);
  assert.equal(result.observedReactionEvidenceCount, 0);
  assert.ok(
    result.blockers.includes('public-reaction-diffusion-evidence-missing'),
  );
});

test('reaction history alone cannot satisfy fandom persistence readiness', () => {
  const productionQualifications =
    SNS_FANDOM_PROVIDER_QUALIFICATIONS.map((item) =>
      item.providerId === 'youtube-data-api'
        ? { ...item, state: 'production-ready' as const, blockers: [] }
        : item,
    );

  const result = evaluateSnsFandomPointReadiness({
    canonicalArtistId: 'iu',
    observations: [
      observation(),
      observation({
        observationId: 'obs-2',
        time: {
          providerPeriodStart: null,
          providerPeriodEnd: null,
          observedAt: '2026-10-02T00:00:00.000Z',
          collectedAt: '2026-10-02T00:01:00.000Z',
        },
      }),
    ],
    providerQualifications: productionQualifications,
  });

  assert.equal(result.state, 'provider-rights-blocked');
  assert.equal(result.observedReactionEvidenceCount, 2);
  assert.equal(result.temporalPersistenceEvidenceCount, 0);
  assert.ok(
    result.blockers.includes('fandom-activity-persistence-history-missing'),
  );
  assert.ok(
    result.blockers.includes(
      'fandom-activity-persistence-provider-rights-blocked',
    ),
  );
});

test('artist-scoped Analytics entitlement can qualify only its persistence dimension', () => {
  const productionQualifications =
    SNS_FANDOM_PROVIDER_QUALIFICATIONS.map((item) =>
      item.providerId === 'youtube-data-api'
        ? { ...item, state: 'production-ready' as const, blockers: [] }
        : item,
    );

  const analytics = buildYoutubeAnalyticsFandomPersistenceCandidate({
    entitlement: youtubeAnalyticsEntitlement(),
    evaluatedAt: '2026-10-01T00:02:00.000Z',
    snapshots: [
      {
        canonicalArtistId: 'iu',
        youtubeChannelId: 'UC-iu',
        providerPeriodStart: '2026-09-29T00:00:00.000Z',
        providerPeriodEnd: '2026-09-29T23:59:59.999Z',
        observedAt: '2026-09-30T00:00:00.000Z',
        collectedAt: '2026-09-30T00:01:00.000Z',
        subscribedViews: 120,
        evidenceRef: 'evidence://youtube-analytics/iu/2026-09-29',
      },
      {
        canonicalArtistId: 'iu',
        youtubeChannelId: 'UC-iu',
        providerPeriodStart: '2026-09-30T00:00:00.000Z',
        providerPeriodEnd: '2026-09-30T23:59:59.999Z',
        observedAt: '2026-10-01T00:00:00.000Z',
        collectedAt: '2026-10-01T00:01:00.000Z',
        subscribedViews: 140,
        evidenceRef: 'evidence://youtube-analytics/iu/2026-09-30',
      },
    ],
  });
  assert.equal(analytics.state, 'normalized-authorized-account-candidate');

  const result = evaluateSnsFandomPointReadiness({
    canonicalArtistId: 'iu',
    observations: [
      observation(),
      ...analytics.observations,
    ],
    providerQualifications: productionQualifications,
    artistEntitlements: [youtubeAnalyticsEntitlement()],
    evaluatedAt: '2026-10-01T00:02:00.000Z',
  });

  assert.equal(result.state, 'dual-dimension-evidence-ready');
  assert.deepEqual(result.productionReadyProviders, ['youtube-data-api']);
  assert.deepEqual(result.artistAuthorizedProviders, [
    'youtube-analytics-api',
  ]);
  assert.deepEqual(
    [...result.evidenceEligibleProviders].sort(),
    ['youtube-analytics-api', 'youtube-data-api'],
  );
  assert.equal(result.observedReactionEvidenceCount, 1);
  assert.equal(result.temporalPersistenceEvidenceCount, 1);
  assert.equal(result.snsFandomPoint, null);
  assert.equal(result.numericProductEligible, false);
  assert.ok(
    result.blockers.includes(
      'cross-dimension-combination-methodology-not-approved',
    ),
  );
});

test('artist entitlement never carries over to another canonical artist', () => {
  const productionQualifications =
    SNS_FANDOM_PROVIDER_QUALIFICATIONS.map((item) =>
      item.providerId === 'youtube-data-api'
        ? { ...item, state: 'production-ready' as const, blockers: [] }
        : item,
    );

  const result = evaluateSnsFandomPointReadiness({
    canonicalArtistId: 'other-artist',
    observations: [],
    providerQualifications: productionQualifications,
    artistEntitlements: [youtubeAnalyticsEntitlement()],
    evaluatedAt: '2026-10-01T00:02:00.000Z',
  });

  assert.equal(result.state, 'provider-rights-blocked');
  assert.deepEqual(result.artistAuthorizedProviders, []);
  assert.ok(
    result.blockers.includes(
      'fandom-activity-persistence-provider-rights-blocked',
    ),
  );
});

test('even explicitly qualified dual-dimension evidence does not invent a numeric snsFandomPoint', () => {
  const productionQualifications =
    SNS_FANDOM_PROVIDER_QUALIFICATIONS.map((item) =>
      item.providerId === 'x-api'
        ? {
            ...item,
            state: 'production-ready' as const,
            blockers: [],
          }
        : item,
    );

  const fandomObservation = (
    observationId: string,
    observedAt: string,
    collectedAt: string,
  ): SnsFandomObservation => ({
    ...observation(),
    observationId,
    providerId: 'x-api',
    entity: {
      entityType: 'artist',
      canonicalArtistId: 'iu',
      providerArtistId: 'hypothetical-qualified-provider-artist',
      providerContentId: 'persistence-scope-1',
      identityState: 'bound',
    },
    variable: {
      variableId: 'snsFandomPoint',
      metricFamily: 'sns-fandom',
      dimension: 'fandom-activity-persistence',
      metricId: 'test.qualified-persistence-signal',
      metricRole: 'construct-evidence',
    },
    time: {
      providerPeriodStart: null,
      providerPeriodEnd: null,
      observedAt,
      collectedAt,
    },
  });

  const reaction = {
    ...observation(),
    observationId: 'reaction-1',
    providerId: 'x-api' as const,
    entity: {
      entityType: 'artist' as const,
      canonicalArtistId: 'iu',
      providerArtistId: 'hypothetical-qualified-provider-artist',
      providerContentId: 'reaction-scope-1',
      identityState: 'bound' as const,
    },
  };

  const result = evaluateSnsFandomPointReadiness({
    canonicalArtistId: 'iu',
    observations: [
      reaction,
      fandomObservation(
        'fandom-1',
        '2026-10-01T00:00:00.000Z',
        '2026-10-01T00:01:00.000Z',
      ),
      fandomObservation(
        'fandom-2',
        '2026-10-02T00:00:00.000Z',
        '2026-10-02T00:01:00.000Z',
      ),
    ],
    providerQualifications: productionQualifications,
  });

  assert.equal(result.state, 'dual-dimension-evidence-ready');
  assert.equal(result.observedReactionEvidenceCount, 1);
  assert.equal(result.temporalPersistenceEvidenceCount, 1);
  assert.equal(result.snsFandomPoint, null);
  assert.equal(result.numericProductEligible, false);
  assert.ok(
    result.blockers.includes(
      'cross-dimension-combination-methodology-not-approved',
    ),
  );
});
