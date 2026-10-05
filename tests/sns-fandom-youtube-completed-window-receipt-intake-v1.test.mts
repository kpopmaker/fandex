import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeAuditArtistBindingManifest,
} from '../lib/intelligence/snsFandomPointYoutubeAuditArtistBindingManifest';
import {
  evaluateSnsFandomYoutubeCompletedWindowReceiptIntake,
} from '../lib/intelligence/snsFandomPointYoutubeCompletedWindowReceiptIntake';

const SOURCE_MAIN = '1111111111111111111111111111111111111111';
const REQUEST_SHA = '2222222222222222222222222222222222222222';
const END = '2027-10-04T15:00:00.000Z';

function manifest() {
  return evaluateSnsFandomYoutubeAuditArtistBindingManifest({
    manifestId: 'sns-fandom-youtube-audit-cohort-v1',
    evidenceRef: 'repo://data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_artist_binding_manifest_v1.json',
    members: Array.from({ length: 5 }, (_, index) => ({
      canonicalArtistId: `artist-${index + 1}`,
      youtubeChannelId: `UC${String(index + 1).padStart(22, '0')}`,
      bindingState: 'verified' as const,
      includedInAuditScope: true,
      evidenceRef: `https://www.youtube.com/channel/UC${String(index + 1).padStart(22, '0')}`,
      verifiedAt: '2026-10-04T00:00:00.000Z',
      sharedChannelCaveat: null,
    })),
  });
}

function receipt(overrides: Record<string, unknown> = {}) {
  const artists = Array.from({ length: 5 }, (_, index) => ({
    canonicalArtistId: `artist-${index + 1}`,
    youtubeChannelId: `UC${String(index + 1).padStart(22, '0')}`,
    uploadsPlaylistId: `UU${String(index + 1).padStart(22, '0')}`,
    playlistItemsPagesTraversed: index === 0 ? 3 : 1,
    includedVideoCount: 0,
    channelListCalls: 1,
    playlistItemsListCalls: index === 0 ? 3 : 1,
    videosListCalls: 0,
  }));

  return {
    version: 'sns_fandom_youtube_bounded_measurement_receipt_v1',
    receiptState: 'completed',
    executionAuthorizationEvidenceRef:
      'github-issue://kpopmaker/fandex/issues/424#issuecomment-7000000000',
    executionAuthorizationCommentId: 7000000000,
    sourceMainSha: SOURCE_MAIN,
    executionRequestCommitSha: REQUEST_SHA,
    measuredAt: '2027-10-04T15:01:00.000Z',
    contractVersion: 'sns-fandom-youtube-bounded-measurement-v1',
    state: 'bounded-measurement-completed',
    providerId: 'youtube-data-api',
    artistBindingManifestId: 'sns-fandom-youtube-audit-cohort-v1',
    artistChannelCount: 5,
    measurementWindowStart: '2026-10-03T15:00:00.000Z',
    measurementWindowEnd: END,
    measurementStartedAt: '2027-10-04T15:00:30.000Z',
    observedThrough: END,
    measurementWindowComplete: true,
    reactionSnapshotRunsPerDay: 24,
    requestBatchingStrategy:
      'singleton-only-until-provider-batch-limit-evidence',
    requestedEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
      'youtube.videos.list',
    ],
    artists,
    uploadManifestPageCountPerReactionRun: 7,
    videoCountPerReactionRun: 0,
    providerCallsObserved: {
      channelsList: 5,
      playlistItemsList: 7,
      videosList: 0,
      total: 12,
    },
    quotaUnitsObserved: 12,
    rawVideoIdentifiersStored: false,
    rawStatisticsStored: false,
    secretMaterialStored: false,
    automaticProviderCallAllowed: false,
    productionCollectionAuthorized: false,
    providerSubmissionAuthorized: false,
    schedulerMutationAuthorized: false,
    ...overrides,
  };
}

function evaluate(receiptOverrides: Record<string, unknown> = {}) {
  return evaluateSnsFandomYoutubeCompletedWindowReceiptIntake({
    receipt: receipt(receiptOverrides),
    expectedSourceMainSha: SOURCE_MAIN,
    canonicalPlan: {
      measurementWindowStart: '2026-10-03T15:00:00.000Z',
      measurementWindowEnd: END,
      reactionSnapshotRunsPerDay: 24,
    },
    artistBindingManifest: manifest(),
    receiptEvidenceRef:
      'github-actions://kpopmaker/fandex/runs/999/artifacts/888#sns-fandom-youtube-bounded-measurement-receipt-v1.json',
  });
}

test('completed canonical receipt produces exact owner candidate and preserves true zero', () => {
  const result = evaluate();

  assert.equal(result.state, 'completed-window-receipt-ready');
  assert.deepEqual(result.blockers, []);
  assert.deepEqual(result.candidate, {
    measurementWindowComplete: true,
    observedThrough: END,
    measurementWindowCompletionEvidenceRef:
      'github-actions://kpopmaker/fandex/runs/999/artifacts/888#sns-fandom-youtube-bounded-measurement-receipt-v1.json',
    measuredAt: '2027-10-04T15:01:00.000Z',
    uploadManifestPageCountPerReactionRun: 7,
    videoCountPerReactionRun: 0,
    measuredUsageEvidenceRef:
      'github-actions://kpopmaker/fandex/runs/999/artifacts/888#sns-fandom-youtube-bounded-measurement-receipt-v1.json',
  });
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.schedulerMutationAllowed, false);
  assert.equal(result.productActivationAuthorized, false);
});

test('incomplete-window receipt is rejected instead of being promoted', () => {
  const result = evaluate({
    measurementStartedAt: '2027-10-04T14:59:00.000Z',
    observedThrough: '2027-10-04T14:59:00.000Z',
    measurementWindowComplete: false,
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.candidate, null);
  assert.ok(result.blockers.includes('youtube-completed-window-incomplete'));
  assert.ok(
    result.blockers.includes(
      'youtube-completed-window-observed-through-before-end',
    ),
  );
});

test('stale source main or canonical plan drift is rejected', () => {
  const sourceMismatch =
    evaluateSnsFandomYoutubeCompletedWindowReceiptIntake({
      receipt: receipt(),
      expectedSourceMainSha:
        '3333333333333333333333333333333333333333',
      canonicalPlan: {
        measurementWindowStart: '2026-10-03T15:00:00.000Z',
        measurementWindowEnd: END,
        reactionSnapshotRunsPerDay: 24,
      },
      artistBindingManifest: manifest(),
      receiptEvidenceRef:
        'github-actions://kpopmaker/fandex/runs/999/artifacts/888#receipt.json',
    });

  assert.equal(sourceMismatch.state, 'blocked');
  assert.ok(
    sourceMismatch.blockers.includes(
      'youtube-completed-window-source-main-mismatch',
    ),
  );

  const planMismatch = evaluate({
    reactionSnapshotRunsPerDay: 12,
  });
  assert.equal(planMismatch.state, 'blocked');
  assert.ok(
    planMismatch.blockers.includes('youtube-completed-window-plan-mismatch'),
  );
});

test('artist binding drift and non-durable evidence are rejected', () => {
  const driftedArtists = (receipt().artists as Array<Record<string, unknown>>)
    .map((artist, index) => index === 0
      ? { ...artist, canonicalArtistId: 'different-artist' }
      : artist);

  const result = evaluateSnsFandomYoutubeCompletedWindowReceiptIntake({
    receipt: receipt({ artists: driftedArtists }),
    expectedSourceMainSha: SOURCE_MAIN,
    canonicalPlan: {
      measurementWindowStart: '2026-10-03T15:00:00.000Z',
      measurementWindowEnd: END,
      reactionSnapshotRunsPerDay: 24,
    },
    artistBindingManifest: manifest(),
    receiptEvidenceRef: 'temporary-local-path/receipt.json',
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.candidate, null);
  assert.ok(
    result.blockers.includes(
      'youtube-completed-window-artist-lineage-mismatch',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-completed-window-receipt-evidence-not-durable',
    ),
  );
});

test('receipt aggregate accounting cannot diverge from per-artist lineage', () => {
  const result = evaluate({
    uploadManifestPageCountPerReactionRun: 8,
    quotaUnitsObserved: 13,
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-completed-window-measured-usage-mismatch',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-completed-window-provider-call-accounting-mismatch',
    ),
  );
});
