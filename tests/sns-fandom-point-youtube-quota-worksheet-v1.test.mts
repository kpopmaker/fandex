import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeQuotaWorksheet,
  type SnsFandomYoutubeQuotaWorksheetInput,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaWorksheet';
import {
  evaluateSnsFandomYoutubeAuditArtistBindingManifest,
} from '../lib/intelligence/snsFandomPointYoutubeAuditArtistBindingManifest';

function artistBindingManifest() {
  return evaluateSnsFandomYoutubeAuditArtistBindingManifest({
    manifestId: 'youtube-audit-binding-manifest-study-v1',
    evidenceRef: 'external://youtube-audit/verified-channel-bindings',
    members: Array.from({ length: 12 }, (_, index) => ({
      canonicalArtistId: `artist-${index + 1}`,
      youtubeChannelId:
        `UC${String(index + 1).padStart(22, '0')}`,
      bindingState: 'verified' as const,
      includedInAuditScope: true,
      evidenceRef: `external://youtube-binding/artist-${index + 1}`,
      verifiedAt: '2026-10-02T11:30:00.000Z',
      sharedChannelCaveat: null,
    })),
  });
}

function input(
  overrides: Partial<SnsFandomYoutubeQuotaWorksheetInput> = {},
): SnsFandomYoutubeQuotaWorksheetInput {
  return {
    providerClientRef: 'gcp-project-fandex-youtube-primary',
    measuredAt: '2026-10-02T11:00:00.000Z',
    requestedEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
    ],
    artistBindingManifest: artistBindingManifest(),
    measuredUsage: {
      artistChannelCount: 12,
      uploadManifestPageCountPerReactionRun: 7,
      videoCountPerReactionRun: 120,
      commentThreadPageCountPerPersistenceRun: 0,
      commentPageCountPerPersistenceRun: 0,
      reactionSnapshotRunsPerDay: 4,
      commentPersistenceRunsPerDay: 0,
    },
    requestBatching: {
      strategy: 'provider-limit-evidenced',
      channelIdsPerCall: 50,
      videoIdsPerCall: 50,
    },
    providerLimits: {
      maxChannelIdsPerCall: 50,
      maxVideoIdsPerCall: 50,
    },
    quotaUnitsPerCall: {
      'youtube.channels.list': 1,
      'youtube.playlistItems.list': 1,
      'youtube.videos.list': 1,
      'youtube.commentThreads.list': 1,
      'youtube.comments.list': 1,
    },
    evidence: {
      measuredUsageEvidenceRef: 'evidence://youtube/quota/measured-usage-v1',
      cadenceEvidenceRef: 'evidence://youtube/quota/cadence-v1',
      requestBatchingEvidenceRef:
        'evidence://youtube/client/request-batching-v1',
      providerBatchLimitEvidenceRef:
        'evidence://youtube/provider/batch-limits-v1',
      providerQuotaCostEvidenceRef:
        'evidence://youtube/provider/quota-costs-v1',
    },
    ...overrides,
  };
}

test('reaction-only worksheet calculates measured minimum quota without inventing headroom', () => {
  const result = evaluateSnsFandomYoutubeQuotaWorksheet(input());

  assert.equal(result.state, 'quota-evidence-ready');
  assert.equal(result.artistBindingManifestValidated, true);
  assert.equal(result.artistChannelCount, 12);
  assert.equal(result.minimumProjectedQuotaUnitsPerDay, 44);
  assert.equal(result.requestedQuotaUnitsPerDay, null);
  assert.equal(result.headroomFactorApplied, false);
  assert.equal(result.arbitraryCadenceApplied, false);
  assert.equal(result.arbitraryProviderLimitApplied, false);
  assert.equal(result.arbitraryQuotaCostApplied, false);
  assert.equal(result.submissionEvidenceEligible, true);
  assert.deepEqual(
    result.lineItems.map((item) => [
      item.endpoint,
      item.callsPerDay,
      item.quotaUnitsPerDay,
    ]),
    [
      ['youtube.channels.list', 4, 4],
      ['youtube.playlistItems.list', 28, 28],
      ['youtube.videos.list', 12, 12],
    ],
  );
  assert.deepEqual(result.blockers, []);
});

test('comment persistence quota is included only when explicitly in submitted scope', () => {
  const base = input();
  const result = evaluateSnsFandomYoutubeQuotaWorksheet({
    ...base,
    requestedEndpoints: [
      ...base.requestedEndpoints,
      'youtube.commentThreads.list',
      'youtube.comments.list',
    ],
    measuredUsage: {
      ...base.measuredUsage,
      commentThreadPageCountPerPersistenceRun: 10,
      commentPageCountPerPersistenceRun: 5,
      commentPersistenceRunsPerDay: 1,
    },
  });

  assert.equal(result.state, 'quota-evidence-ready');
  assert.equal(result.minimumProjectedQuotaUnitsPerDay, 59);
  assert.deepEqual(
    result.lineItems.slice(-2).map((item) => [
      item.endpoint,
      item.callsPerDay,
      item.quotaUnitsPerDay,
    ]),
    [
      ['youtube.commentThreads.list', 10, 10],
      ['youtube.comments.list', 5, 5],
    ],
  );
});

test('comment usage outside requested provider scope fails closed', () => {
  const base = input();
  const result = evaluateSnsFandomYoutubeQuotaWorksheet({
    ...base,
    measuredUsage: {
      ...base.measuredUsage,
      commentThreadPageCountPerPersistenceRun: 10,
      commentPersistenceRunsPerDay: 1,
    },
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.minimumProjectedQuotaUnitsPerDay, null);
  assert.equal(result.submissionEvidenceEligible, false);
  assert.ok(
    result.blockers.includes(
      'youtube-quota-comment-thread-usage-outside-scope',
    ),
  );
});

test('comments endpoint cannot be requested without comment-thread scope', () => {
  const base = input();
  const result = evaluateSnsFandomYoutubeQuotaWorksheet({
    ...base,
    requestedEndpoints: [
      ...base.requestedEndpoints,
      'youtube.comments.list',
    ],
    measuredUsage: {
      ...base.measuredUsage,
      commentPageCountPerPersistenceRun: 5,
      commentPersistenceRunsPerDay: 1,
    },
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-quota-comments-require-comment-threads-scope',
    ),
  );
});

test('measured counts, cadence, request batch sizes and quota costs cannot be defaulted', () => {
  const base = input();
  const result = evaluateSnsFandomYoutubeQuotaWorksheet({
    ...base,
    measuredUsage: {
      ...base.measuredUsage,
      artistChannelCount: 0,
      reactionSnapshotRunsPerDay: 0,
    },
    requestBatching: {
      ...base.requestBatching,
      channelIdsPerCall: 0,
      videoIdsPerCall: 0,
    },
    quotaUnitsPerCall: {
      ...base.quotaUnitsPerCall,
      'youtube.videos.list': 0,
    },
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.minimumProjectedQuotaUnitsPerDay, null);
  assert.equal(result.arbitraryCadenceApplied, false);
  assert.equal(result.arbitraryProviderLimitApplied, false);
  assert.equal(result.arbitraryQuotaCostApplied, false);
  assert.ok(
    result.blockers.includes(
      'youtube-quota-artist-channel-count-invalid',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-quota-reaction-cadence-invalid',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-quota-channel-request-batch-size-invalid',
    ),
  );
  assert.ok(
    result.blockers.includes('youtube-quota-cost-invalid'),
  );
});

test('quota worksheet needs non-secret evidence for every measured assumption', () => {
  const base = input();
  const result = evaluateSnsFandomYoutubeQuotaWorksheet({
    ...base,
    evidence: {
      ...base.evidence,
      measuredUsageEvidenceRef: '',
      providerQuotaCostEvidenceRef:
        'external://youtube?access_token=do-not-store',
    },
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.submissionEvidenceEligible, false);
  assert.ok(
    result.blockers.includes('youtube-quota-evidence-ref-missing'),
  );
});

test('duplicate endpoint scope is rejected instead of silently altering the application packet', () => {
  const base = input();
  const result = evaluateSnsFandomYoutubeQuotaWorksheet({
    ...base,
    requestedEndpoints: [
      ...base.requestedEndpoints,
      'youtube.videos.list',
    ],
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes('youtube-quota-endpoint-duplicate'),
  );
});


test('artist channel count must exactly match the verified audit binding manifest', () => {
  const base = input();
  const result = evaluateSnsFandomYoutubeQuotaWorksheet({
    ...base,
    measuredUsage: {
      ...base.measuredUsage,
      artistChannelCount: 100,
    },
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.minimumProjectedQuotaUnitsPerDay, null);
  assert.ok(
    result.blockers.includes(
      'youtube-quota-artist-channel-count-binding-mismatch',
    ),
  );
});

test('quota worksheet cannot become ready without the verified binding manifest', () => {
  const result = evaluateSnsFandomYoutubeQuotaWorksheet(
    input({
      artistBindingManifest: null,
    }),
  );

  assert.equal(result.state, 'blocked');
  assert.equal(result.artistBindingManifestValidated, false);
  assert.equal(result.artistBindingManifestId, null);
  assert.equal(result.artistChannelCount, null);
  assert.ok(
    result.blockers.includes(
      'youtube-quota-artist-binding-manifest-missing',
    ),
  );
});


test('singleton client batching can become quota-ready without claiming provider maxima', () => {
  const base = input();
  const result = evaluateSnsFandomYoutubeQuotaWorksheet({
    ...base,
    requestBatching: {
      strategy: 'singleton-only-until-provider-batch-limit-evidence',
      channelIdsPerCall: 1,
      videoIdsPerCall: 1,
    },
    providerLimits: {
      maxChannelIdsPerCall: null,
      maxVideoIdsPerCall: null,
    },
    evidence: {
      ...base.evidence,
      requestBatchingEvidenceRef:
        'repo://lib/intelligence/snsFandomPointYoutubeQuotaMeasurementHandoff.ts#singleton-only-until-provider-batch-limit-evidence',
      providerBatchLimitEvidenceRef: null,
    },
  });

  assert.equal(result.state, 'quota-evidence-ready');
  assert.equal(
    result.requestBatchingStrategy,
    'singleton-only-until-provider-batch-limit-evidence',
  );
  assert.equal(result.channelIdsPerCall, 1);
  assert.equal(result.videoIdsPerCall, 1);
  assert.equal(result.providerBatchLimitEvidenceRequired, false);
  assert.equal(result.providerBatchLimitEvidenceValidated, false);
  assert.equal(result.providerLimitClaimed, false);
  assert.equal(result.minimumProjectedQuotaUnitsPerDay, 556);
  assert.deepEqual(
    result.lineItems.map((item) => [
      item.endpoint,
      item.callsPerDay,
      item.quotaUnitsPerDay,
    ]),
    [
      ['youtube.channels.list', 48, 48],
      ['youtube.playlistItems.list', 28, 28],
      ['youtube.videos.list', 480, 480],
    ],
  );
  assert.deepEqual(result.blockers, []);
});

test('singleton strategy rejects any request batch size other than one', () => {
  const base = input();
  const result = evaluateSnsFandomYoutubeQuotaWorksheet({
    ...base,
    requestBatching: {
      strategy: 'singleton-only-until-provider-batch-limit-evidence',
      channelIdsPerCall: 2,
      videoIdsPerCall: 1,
    },
    providerLimits: {
      maxChannelIdsPerCall: null,
      maxVideoIdsPerCall: null,
    },
    evidence: {
      ...base.evidence,
      providerBatchLimitEvidenceRef: null,
    },
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes('youtube-quota-singleton-batching-size-mismatch'),
  );
});

test('provider-limit batching still requires exact provider limit evidence', () => {
  const base = input();
  const result = evaluateSnsFandomYoutubeQuotaWorksheet({
    ...base,
    providerLimits: {
      maxChannelIdsPerCall: null,
      maxVideoIdsPerCall: null,
    },
    evidence: {
      ...base.evidence,
      providerBatchLimitEvidenceRef: null,
    },
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.providerBatchLimitEvidenceRequired, true);
  assert.equal(result.providerBatchLimitEvidenceValidated, false);
  assert.ok(
    result.blockers.includes('youtube-quota-channel-provider-limit-required'),
  );
  assert.ok(
    result.blockers.includes('youtube-quota-video-provider-limit-required'),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-quota-provider-batch-limit-evidence-required',
    ),
  );
});


test('observed zero videos stay in scope with zero calls instead of becoming missing', () => {
  const base = input();
  const result = evaluateSnsFandomYoutubeQuotaWorksheet({
    ...base,
    measuredUsage: {
      ...base.measuredUsage,
      videoCountPerReactionRun: 0,
    },
  });

  assert.equal(result.state, 'quota-evidence-ready');
  assert.equal(result.minimumProjectedQuotaUnitsPerDay, 32);
  assert.deepEqual(
    result.lineItems.map((item) => [
      item.endpoint,
      item.callsPerDay,
      item.quotaUnitsPerDay,
    ]),
    [
      ['youtube.channels.list', 4, 4],
      ['youtube.playlistItems.list', 28, 28],
      ['youtube.videos.list', 0, 0],
    ],
  );
  assert.deepEqual(result.blockers, []);
});
