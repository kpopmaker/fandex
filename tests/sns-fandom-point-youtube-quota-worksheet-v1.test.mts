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

test('measured counts, cadence, provider batch limits and quota costs cannot be defaulted', () => {
  const base = input();
  const result = evaluateSnsFandomYoutubeQuotaWorksheet({
    ...base,
    measuredUsage: {
      ...base.measuredUsage,
      artistChannelCount: 0,
      reactionSnapshotRunsPerDay: 0,
    },
    providerLimits: {
      maxChannelIdsPerCall: 0,
      maxVideoIdsPerCall: 0,
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
      'youtube-quota-channel-batch-limit-invalid',
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
