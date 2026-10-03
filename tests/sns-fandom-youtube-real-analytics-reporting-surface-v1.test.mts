import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  getSnsFandomYoutubeAnalyticsReportingEvidence,
} from '../lib/intelligence/snsFandomPointYoutubeAnalyticsReportingEvidence';

test('real analytics surface consumes the canonical bounded provider evidence exactly', () => {
  const evidence = getSnsFandomYoutubeAnalyticsReportingEvidence();

  assert.equal(evidence.surfaceState, 'real-bounded-provider-observation');
  assert.equal(evidence.completeness, 'measurement-window-incomplete');
  assert.equal(evidence.sourceLabel, 'YouTube Data API bounded observation');

  assert.equal(evidence.measurementWindowStart, '2026-10-03T15:00:00.000Z');
  assert.equal(evidence.measurementWindowEnd, '2027-10-04T15:00:00.000Z');
  assert.equal(evidence.measuredAt, '2026-10-03T15:19:42.325Z');
  assert.equal(evidence.reactionSnapshotRunsPerDay, 24);

  assert.equal(evidence.artistChannelCount, 5);
  assert.equal(evidence.uploadManifestPageCountPerReactionRun, 115);
  assert.equal(evidence.videoCountPerReactionRun, 0);
  assert.equal(evidence.trueZeroVideoCountObserved, true);

  assert.deepEqual(evidence.providerCallsObserved, {
    channelsList: 5,
    playlistItemsList: 115,
    videosList: 0,
    total: 120,
  });
  assert.equal(evidence.quotaUnitsObserved, 120);

  assert.equal(
    evidence.perArtist.reduce(
      (sum, row) => sum + row.playlistItemsPagesTraversed,
      0,
    ),
    115,
  );
  assert.equal(
    evidence.perArtist.reduce(
      (sum, row) => sum + row.includedVideoCount,
      0,
    ),
    0,
  );

  assert.equal(evidence.provenance.authorizationCommentId, '5970501121');
  assert.equal(evidence.provenance.workflowRunId, '37132802429');
  assert.equal(evidence.provenance.artifactId, '11277073687');
  assert.equal(
    evidence.provenance.sourceMainSha,
    'f7a0965e5708ddf00ebacfe58ab8740e1d89084f',
  );

  assert.equal(evidence.quotaWorksheetEligible, false);
  assert.equal(evidence.finalOwnerEvidencePromotionAllowed, false);
  assert.equal(evidence.productionCollectionAuthorized, false);
  assert.equal(evidence.providerSubmissionAuthorized, false);
  assert.equal(evidence.schedulerMutationAuthorized, false);
});

test('analytics evidence route is backed only by the real evidence adapter', async () => {
  const source = await readFile(
    new URL('../app/youtube-analytics-evidence/page.tsx', import.meta.url),
    'utf8',
  );

  assert.match(
    source,
    /getSnsFandomYoutubeAnalyticsReportingEvidence/,
  );
  assert.match(source, /실제 YouTube API 관측 증거/);
  assert.match(source, /measurementWindowComplete = false/);
  assert.match(source, /quotaWorksheetEligible = false/);
  assert.match(source, /true zero/);

  assert.doesNotMatch(source, /app\/data\/v4\/charts/);
  assert.doesNotMatch(source, /sample-report/);
  assert.doesNotMatch(source, /mock issue/i);
  assert.doesNotMatch(source, /Math\.random/);
});

test('checked-in evidence adapter never exposes raw identifiers or authorizes execution', async () => {
  const source = await readFile(
    new URL(
      '../lib/intelligence/snsFandomPointYoutubeAnalyticsReportingEvidence.ts',
      import.meta.url,
    ),
    'utf8',
  );

  assert.match(source, /rawVideoIdentifiersStored !== false/);
  assert.match(source, /rawStatisticsStored !== false/);
  assert.match(source, /secretMaterialStored !== false/);
  assert.match(source, /productionCollectionAuthorized !== false/);
  assert.match(source, /providerSubmissionAuthorized !== false/);
  assert.match(source, /schedulerMutationAuthorized !== false/);

  assert.doesNotMatch(source, /youtubeChannelId/);
  assert.doesNotMatch(source, /uploadsPlaylistId/);
  assert.doesNotMatch(source, /apiKey/i);
});
