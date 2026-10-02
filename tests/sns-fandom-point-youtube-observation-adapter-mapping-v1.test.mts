import assert from 'node:assert/strict';

const REQUIRED_RAW_FIELDS = [
  'providerResourceId',
  'channelId',
  'artistIdentityRef',
  'observedAt',
  'collectedAt',
  'evidenceRefs',
];

function mapYoutubeRawToObservation(raw) {
  if (!raw.rightsAuthorized) {
    return { ok: false, reason: 'provider-rights-not-authorized' };
  }

  for (const field of REQUIRED_RAW_FIELDS) {
    if (!raw[field]) {
      return { ok: false, reason: `${field}-missing` };
    }
  }

  return {
    ok: true,
    observation: {
      providerId: 'youtube-data-api',
      artistIdentityRef: raw.artistIdentityRef,
      observedAt: raw.observedAt,
      collectedAt: raw.collectedAt,
      rawMetrics: raw.rawMetrics,
      evidenceRefs: raw.evidenceRefs,
    },
  };
}

const valid = mapYoutubeRawToObservation({
  providerResourceId: 'video-1',
  channelId: 'channel-1',
  artistIdentityRef: 'artist-1',
  observedAt: '2026-10-02T00:00:00Z',
  collectedAt: '2026-10-02T00:05:00Z',
  evidenceRefs: ['evidence-1'],
  rightsAuthorized: true,
  rawMetrics: { viewCount: 100 },
});

assert.equal(valid.ok, true);
assert.equal(valid.observation.artistIdentityRef, 'artist-1');

const blocked = mapYoutubeRawToObservation({
  providerResourceId: 'video-1',
  channelId: 'channel-1',
  artistIdentityRef: 'artist-1',
  observedAt: '2026-10-02T00:00:00Z',
  collectedAt: '2026-10-02T00:05:00Z',
  evidenceRefs: ['evidence-1'],
  rightsAuthorized: false,
});

assert.equal(blocked.ok, false);
assert.equal(blocked.reason, 'provider-rights-not-authorized');

const missingIdentity = mapYoutubeRawToObservation({
  providerResourceId: 'video-1',
  channelId: 'channel-1',
  observedAt: '2026-10-02T00:00:00Z',
  collectedAt: '2026-10-02T00:05:00Z',
  evidenceRefs: ['evidence-1'],
  rightsAuthorized: true,
});

assert.equal(missingIdentity.ok, false);
assert.equal(missingIdentity.reason, 'artistIdentityRef-missing');
