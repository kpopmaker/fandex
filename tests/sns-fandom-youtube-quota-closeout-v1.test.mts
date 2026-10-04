import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeAuditArtistBindingManifest,
} from '../lib/intelligence/snsFandomPointYoutubeAuditArtistBindingManifest';
import {
  evaluateSnsFandomYoutubeQuotaCloseout,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaCloseout';
import {
  evaluateSnsFandomYoutubeQuotaOwnerHandoff,
  type SnsFandomYoutubeQuotaOwnerHandoffInput,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaOwnerHandoff';

function manifest() {
  return evaluateSnsFandomYoutubeAuditArtistBindingManifest({
    manifestId: 'closeout-test-cohort-v1',
    evidenceRef: 'repo://test/closeout-cohort-v1',
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

function ownerInput(
  overrides: Partial<SnsFandomYoutubeQuotaOwnerHandoffInput> = {},
): SnsFandomYoutubeQuotaOwnerHandoffInput {
  return {
    measurementWindowStart: '2026-10-03T15:00:00.000Z',
    measurementWindowEnd: '2027-10-04T15:00:00.000Z',
    reactionSnapshotRunsPerDay: 24,
    cadenceEvidenceRef: 'evidence://quota/cadence',
    measurementWindowComplete: true,
    observedThrough: '2027-10-04T15:00:00.000Z',
    measurementWindowCompletionEvidenceRef:
      'evidence://quota/window-complete',
    measuredAt: '2027-10-04T15:01:00.000Z',
    uploadManifestPageCountPerReactionRun: 7,
    videoCountPerReactionRun: 0,
    measuredUsageEvidenceRef: 'evidence://quota/measured-usage',
    requestBatchingStrategy:
      'singleton-only-until-provider-batch-limit-evidence',
    channelIdsPerCall: 1,
    videoIdsPerCall: 1,
    requestBatchingEvidenceRef:
      'repo://lib/intelligence/snsFandomPointYoutubeQuotaMeasurementHandoff.ts#singleton-only-until-provider-batch-limit-evidence',
    maxChannelIdsPerCall: null,
    maxVideoIdsPerCall: null,
    providerBatchLimitEvidenceRef: null,
    ...overrides,
  };
}

function closeout(
  ownerOverrides: Partial<SnsFandomYoutubeQuotaOwnerHandoffInput> = {},
) {
  return evaluateSnsFandomYoutubeQuotaCloseout({
    providerClientRef: 'gcp-project-fandex-509708',
    quotaOwnerHandoff:
      evaluateSnsFandomYoutubeQuotaOwnerHandoff(
        ownerInput(ownerOverrides),
      ),
    artistBindingManifest: manifest(),
    reactionQuotaUnitsPerCall: {
      'youtube.channels.list': 1,
      'youtube.playlistItems.list': 1,
      'youtube.videos.list': 1,
    },
    providerQuotaCostEvidenceRef:
      'https://developers.google.com/youtube/v3/determine_quota_cost',
  });
}

test('incomplete window cannot reach a quota worksheet through closeout adapter', () => {
  const result = closeout({
    measurementWindowComplete: false,
  });

  assert.equal(result.state, 'awaiting-completed-window');
  assert.equal(result.quotaWorksheet, null);
  assert.equal(result.estimateCandidate, null);
  assert.equal(result.quotaEstimateRef, null);
  assert.equal(result.quotaEstimateMaterializationAllowed, false);
  assert.deepEqual(result.blockers, [
    'youtube-quota-closeout-owner-handoff-not-ready',
  ]);
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.productionCollectionAuthorized, false);
});

test('completed owner evidence assembles the canonical reaction-only quota worksheet', () => {
  const result = closeout();

  assert.equal(
    result.state,
    'quota-worksheet-ready-awaiting-estimate-materialization',
  );
  assert.ok(result.quotaWorksheet);
  assert.equal(result.quotaWorksheet.state, 'quota-evidence-ready');
  assert.equal(result.quotaWorksheet.artistChannelCount, 5);
  assert.equal(result.quotaWorksheet.minimumProjectedQuotaUnitsPerDay, 288);
  assert.deepEqual(
    result.quotaWorksheet.lineItems.map((item) => [
      item.endpoint,
      item.callsPerDay,
      item.quotaUnitsPerDay,
    ]),
    [
      ['youtube.channels.list', 120, 120],
      ['youtube.playlistItems.list', 168, 168],
      ['youtube.videos.list', 0, 0],
    ],
  );
  assert.equal(
    result.estimateCandidate?.minimumProjectedQuotaUnitsPerDay,
    288,
  );
  assert.equal(result.estimateCandidate?.requestedQuotaUnitsPerDay, null);
  assert.equal(result.estimateCandidate?.headroomFactorApplied, false);
  assert.equal(result.quotaEstimateMaterializationAllowed, true);
  assert.equal(result.quotaEstimateRef, null);
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.productActivationAuthorized, false);
  assert.deepEqual(result.blockers, []);
});

test('observed-through before canonical end stays fail-closed before worksheet assembly', () => {
  const result = closeout({
    observedThrough: '2027-10-04T14:59:59.999Z',
  });

  assert.equal(result.state, 'awaiting-completed-window');
  assert.equal(result.quotaWorksheet, null);
  assert.equal(result.estimateCandidate, null);
  assert.equal(result.quotaEstimateMaterializationAllowed, false);
});
