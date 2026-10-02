import assert from 'node:assert/strict';
import test from 'node:test';

import {
  mapYoutubeVideoMetricsToObservation,
  youtubeObservationAdapter,
} from '../lib/intelligence/snsFandomPointYoutubeObservationAdapter';

const validInput = {
  providerVideoId: 'video-1',
  channelId: 'channel-1',
  artistIdentityRef: 'artist-1',
  publishedAt: '2026-09-25T00:00:00.000Z',
  observedAt: '2026-10-02T00:00:00.000Z',
  collectedAt: '2026-10-02T00:05:00.000Z',
  viewCount: 100,
  likeCount: null,
  commentCount: 10,
  evidenceRefs: ['evidence-1'],
} as const;

test('YouTube adapter remains rights-blocked until provider grants exist', () => {
  assert.equal(youtubeObservationAdapter.state, 'blocked-by-rights');
  assert.deepEqual(youtubeObservationAdapter.dimensions, [
    'public-reaction-diffusion',
  ]);
});

test('mapping emits the actual observation contract and preserves missing values', () => {
  const observation = mapYoutubeVideoMetricsToObservation(
    validInput,
    validInput.artistIdentityRef,
  );

  assert.notEqual(observation, null);
  assert.equal(
    observation?.contractVersion,
    'sns-fandom-observation-contract-v1',
  );
  assert.equal(observation?.providerId, 'youtube-data-api');
  assert.equal(observation?.artistIdentityRef, 'artist-1');
  assert.equal(observation?.sourceState, 'rights-blocked');
  assert.deepEqual(observation?.observationWindow, {
    startAt: '2026-09-25T00:00:00.000Z',
    endAt: '2026-10-02T00:00:00.000Z',
  });
  assert.equal(observation?.collectionTime, validInput.collectedAt);

  const likes = observation?.rawMetrics.find(
    (metric) => metric.metricName === 'youtube.video.like-count',
  );
  assert.equal(likes?.value, null);
});

test('mapping rejects missing artist identity binding', () => {
  const observation = mapYoutubeVideoMetricsToObservation(
    validInput,
    null,
  );

  assert.equal(observation, null);
});

test('mapping rejects records without evidence lineage', () => {
  const observation = mapYoutubeVideoMetricsToObservation(
    {
      ...validInput,
      evidenceRefs: [],
    },
    validInput.artistIdentityRef,
  );

  assert.equal(observation, null);
});
