import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeAnalyticsReportingSurface,
} from '../lib/product/presentation/snsFandomYoutubeAnalyticsReportingSurface';

async function currentSnapshot() {
  const raw = JSON.parse(
    await readFile(
      new URL(
        '../docs/research/sns-fandom-youtube-audit-evidence-refs-v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as Record<string, unknown>;

  return raw.currentBoundedMeasurementEvidence;
}

test('current bounded provider snapshot is eligible for a real reporting surface without becoming final quota evidence', async () => {
  const surface = evaluateSnsFandomYoutubeAnalyticsReportingSurface(
    await currentSnapshot(),
  );

  assert.equal(surface.state, 'real-bounded-snapshot-ready');
  if (surface.state !== 'real-bounded-snapshot-ready') return;

  assert.equal(surface.renderAllowed, true);
  assert.equal(surface.screenshotCandidateEligible, true);
  assert.equal(surface.evidenceClass, 'real-provider-bounded-snapshot');
  assert.equal(surface.measurementWindowComplete, false);
  assert.equal(surface.quotaWorksheetEligible, false);
  assert.equal(surface.finalOwnerEvidencePromotionAllowed, false);
  assert.equal(surface.artistChannelCount, 5);
  assert.equal(surface.uploadManifestPageCountPerReactionRun, 115);
  assert.equal(surface.videoCountPerReactionRun, 0);
  assert.equal(surface.trueZeroVideoCountObserved, true);
  assert.equal(surface.providerCallsObserved.total, 120);
  assert.equal(surface.quotaUnitsObserved, 120);
  assert.equal(surface.perArtist.length, 5);
  assert.equal(
    surface.perArtist.reduce(
      (sum, row) => sum + row.playlistItemsPagesTraversed,
      0,
    ),
    115,
  );
  assert.equal(
    surface.perArtist.reduce(
      (sum, row) => sum + row.includedVideoCount,
      0,
    ),
    0,
  );
  assert.equal(surface.rawVideoIdentifiersStored, false);
  assert.equal(surface.rawStatisticsStored, false);
  assert.equal(surface.secretMaterialStored, false);
  assert.equal(surface.productionCollectionAuthorized, false);
  assert.equal(surface.providerSubmissionAuthorized, false);
  assert.equal(surface.schedulerMutationAuthorized, false);
});

test('true zero cannot be silently rewritten to missing or nonzero', async () => {
  const snapshot = await currentSnapshot();
  const forged = {
    ...(snapshot as Record<string, unknown>),
    videoCountPerReactionRun: 1,
    trueZeroVideoCountObserved: true,
  };

  const surface =
    evaluateSnsFandomYoutubeAnalyticsReportingSurface(forged);

  assert.equal(surface.state, 'blocked');
  assert.ok(surface.blockers.includes('true-zero-marker-mismatch'));
});

test('unsafe or promoted evidence fails closed before rendering', async () => {
  const snapshot = await currentSnapshot();
  const forged = {
    ...(snapshot as Record<string, unknown>),
    finalOwnerEvidencePromotionAllowed: true,
    productionCollectionAuthorized: true,
  };

  const surface =
    evaluateSnsFandomYoutubeAnalyticsReportingSurface(forged);

  assert.equal(surface.state, 'blocked');
  assert.equal(surface.renderAllowed, false);
  assert.equal(surface.screenshotCandidateEligible, false);
  assert.ok(surface.blockers.includes('final-owner-promotion-must-remain-false'));
  assert.ok(surface.blockers.includes('production-collection-must-remain-false'));
});


test('completed-window or mismatched provider accounting cannot masquerade as the bounded screenshot candidate', async () => {
  const snapshot = await currentSnapshot();

  const completed = evaluateSnsFandomYoutubeAnalyticsReportingSurface({
    ...(snapshot as Record<string, unknown>),
    measurementWindowComplete: true,
  });
  assert.equal(completed.state, 'blocked');
  assert.ok(
    completed.blockers.includes(
      'measurement-window-completeness-must-remain-false',
    ),
  );

  const mismatchedCalls = evaluateSnsFandomYoutubeAnalyticsReportingSurface({
    ...(snapshot as Record<string, unknown>),
    providerCallsObserved: {
      channelsList: 5,
      playlistItemsList: 114,
      videosList: 0,
      total: 119,
    },
    quotaUnitsObserved: 120,
  });
  assert.equal(mismatchedCalls.state, 'blocked');
  assert.ok(
    mismatchedCalls.blockers.includes(
      'provider-playlist-call-count-mismatch',
    ),
  );
  assert.ok(
    mismatchedCalls.blockers.includes(
      'quota-units-provider-call-mismatch',
    ),
  );
});
