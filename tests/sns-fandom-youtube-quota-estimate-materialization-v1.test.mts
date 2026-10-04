import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeAuditArtistBindingManifest,
} from '../lib/intelligence/snsFandomPointYoutubeAuditArtistBindingManifest';
import {
  evaluateSnsFandomYoutubeQuotaCloseout,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaCloseout';
import {
  evaluateSnsFandomYoutubeQuotaEstimateMaterialization,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaEstimateMaterialization';
import {
  evaluateSnsFandomYoutubeQuotaOwnerHandoff,
  type SnsFandomYoutubeQuotaOwnerHandoffInput,
} from '../lib/intelligence/snsFandomPointYoutubeQuotaOwnerHandoff';

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
      'github-issue://kpopmaker/fandex/issues/424#completed-window',
    measuredAt: '2027-10-04T15:01:00.000Z',
    uploadManifestPageCountPerReactionRun: 7,
    videoCountPerReactionRun: 0,
    measuredUsageEvidenceRef:
      'github-actions://kpopmaker/fandex/runs/example/artifacts/example',
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
  overrides: Partial<SnsFandomYoutubeQuotaOwnerHandoffInput> = {},
) {
  const manifest = evaluateSnsFandomYoutubeAuditArtistBindingManifest({
    manifestId: 'estimate-materialization-test-v1',
    evidenceRef: 'repo://test/estimate-materialization-v1',
    members: Array.from({ length: 5 }, (_, index) => ({
      canonicalArtistId: `artist-${index + 1}`,
      youtubeChannelId: `UC${String(index + 1).padStart(22, '0')}`,
      bindingState: 'verified' as const,
      includedInAuditScope: true,
      evidenceRef:
        `https://www.youtube.com/channel/UC${String(index + 1).padStart(22, '0')}`,
      verifiedAt: '2026-10-04T00:00:00.000Z',
      sharedChannelCaveat: null,
    })),
  });

  return evaluateSnsFandomYoutubeQuotaCloseout({
    providerClientRef: 'gcp-project-fandex-509708',
    quotaOwnerHandoff:
      evaluateSnsFandomYoutubeQuotaOwnerHandoff(ownerInput(overrides)),
    artistBindingManifest: manifest,
    reactionQuotaUnitsPerCall: {
      'youtube.channels.list': 1,
      'youtube.playlistItems.list': 1,
      'youtube.videos.list': 1,
    },
    providerQuotaCostEvidenceRef:
      'https://developers.google.com/youtube/v3/determine_quota_cost',
  });
}

test('current incomplete window cannot materialize quota estimate evidence', () => {
  const result = evaluateSnsFandomYoutubeQuotaEstimateMaterialization({
    quotaCloseout: closeout({ measurementWindowComplete: false }),
    quotaEstimateRef: null,
    estimatedAt: null,
    minimumProjectedQuotaUnitsPerDay: null,
    requestedQuotaUnitsPerDay: null,
    headroomFactorApplied: false,
  });

  assert.equal(result.state, 'awaiting-completed-window');
  assert.equal(result.quotaEstimateRef, null);
  assert.equal(result.submissionEvidenceEligible, false);
  assert.equal(result.providerSubmissionAuthorized, false);
});

test('ready worksheet still requires durable estimate evidence', () => {
  const result = evaluateSnsFandomYoutubeQuotaEstimateMaterialization({
    quotaCloseout: closeout(),
    quotaEstimateRef: null,
    estimatedAt: null,
    minimumProjectedQuotaUnitsPerDay: null,
    requestedQuotaUnitsPerDay: null,
    headroomFactorApplied: false,
  });

  assert.equal(result.state, 'awaiting-estimate-evidence');
  assert.deepEqual(result.blockers, [
    'youtube-quota-estimate-ref-missing',
    'youtube-quota-estimated-at-missing',
    'youtube-quota-estimate-minimum-missing',
  ]);
});

test('estimate evidence must exactly match worksheet minimum and cannot invent requested quota', () => {
  const result = evaluateSnsFandomYoutubeQuotaEstimateMaterialization({
    quotaCloseout: closeout(),
    quotaEstimateRef: 'repo://docs/research/future-quota-estimate-v1.json',
    estimatedAt: '2027-10-04T15:02:00.000Z',
    minimumProjectedQuotaUnitsPerDay: 999,
    requestedQuotaUnitsPerDay: 10000,
    headroomFactorApplied: true,
  });

  assert.equal(result.state, 'quota-estimate-evidence-blocked');
  assert.ok(
    result.blockers.includes('youtube-quota-estimate-minimum-mismatch'),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-quota-requested-quota-must-remain-unset',
    ),
  );
  assert.ok(
    result.blockers.includes('youtube-quota-headroom-factor-not-allowed'),
  );
});

test('matching durable estimate evidence becomes submission evidence without authorizing submission', () => {
  const readyCloseout = closeout();
  assert.equal(
    readyCloseout.state,
    'quota-worksheet-ready-awaiting-estimate-materialization',
  );

  const result = evaluateSnsFandomYoutubeQuotaEstimateMaterialization({
    quotaCloseout: readyCloseout,
    quotaEstimateRef:
      'repo://docs/research/future-quota-estimate-v1.json',
    estimatedAt: '2027-10-04T15:02:00.000Z',
    minimumProjectedQuotaUnitsPerDay:
      readyCloseout.estimateCandidate?.minimumProjectedQuotaUnitsPerDay
      ?? null,
    requestedQuotaUnitsPerDay: null,
    headroomFactorApplied: false,
  });

  assert.equal(result.state, 'quota-estimate-evidence-ready');
  assert.equal(result.submissionEvidenceEligible, true);
  assert.equal(
    result.minimumProjectedQuotaUnitsPerDay,
    readyCloseout.estimateCandidate?.minimumProjectedQuotaUnitsPerDay,
  );
  assert.equal(
    result.quotaEstimateRef,
    'repo://docs/research/future-quota-estimate-v1.json',
  );
  assert.equal(result.requestedQuotaUnitsPerDay, null);
  assert.equal(result.headroomFactorApplied, false);
  assert.equal(result.providerSubmissionAuthorized, false);
  assert.equal(result.productionCollectionAuthorized, false);
  assert.equal(result.productActivationAuthorized, false);
  assert.deepEqual(result.blockers, []);
});
