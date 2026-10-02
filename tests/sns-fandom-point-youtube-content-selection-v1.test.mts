import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeContentSelection,
  validateSnsFandomYoutubeContentManifest,
  type SnsFandomYoutubeContentManifest,
} from '../lib/intelligence/snsFandomPointYoutubeContentSelection';

function manifest(
  overrides: Partial<SnsFandomYoutubeContentManifest> = {},
): SnsFandomYoutubeContentManifest {
  return {
    contractVersion: 'sns-fandom-youtube-content-manifest-v1',
    canonicalArtistId: 'iu',
    youtubeChannelId: 'UC-iu',
    providerClientRef: 'gcp-project-fandex-youtube-primary',
    selectionRule: 'official-channel-all-uploads-in-published-window',
    windowStart: '2026-09-01T00:00:00.000Z',
    windowEnd: '2026-09-30T23:59:59.999Z',
    uploadsPlaylistId: 'UU-iu',
    providerEndpoints: [
      'youtube.channels.list',
      'youtube.playlistItems.list',
    ],
    pagination: {
      pageCount: 2,
      terminalNextPageToken: null,
      terminalPageEvidenceRef:
        'evidence://youtube/iu/uploads/terminal-page',
    },
    items: [
      {
        videoId: 'video-a',
        publishedAt: '2026-09-10T00:00:00.000Z',
      },
      {
        videoId: 'video-b',
        publishedAt: '2026-09-20T00:00:00.000Z',
      },
    ],
    evidenceRef: 'evidence://youtube/iu/uploads/september',
    ...overrides,
  };
}

test('complete official-channel upload window is selection-ready but has no aggregation formula', () => {
  const result = evaluateSnsFandomYoutubeContentSelection({
    manifest: manifest(),
    snapshotVideoIds: ['video-b', 'video-a'],
    snapshotObservedAt: '2026-10-01T00:00:00.000Z',
  });

  assert.equal(result.state, 'selection-ready');
  assert.deepEqual(result.selectedVideoIds, ['video-a', 'video-b']);
  assert.equal(result.aggregationMethod, null);
  assert.equal(result.aggregateValue, null);
  assert.deepEqual(result.blockers, []);
});

test('snapshot video set must exactly equal the complete-window manifest set', () => {
  const result = evaluateSnsFandomYoutubeContentSelection({
    manifest: manifest(),
    snapshotVideoIds: ['video-a'],
    snapshotObservedAt: '2026-10-01T00:00:00.000Z',
  });

  assert.equal(result.state, 'selection-blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-content-snapshot-manifest-set-mismatch',
    ),
  );
});

test('manifest rejects duplicate or out-of-window content', () => {
  const invalid = manifest({
    items: [
      {
        videoId: 'video-a',
        publishedAt: '2026-08-31T23:59:59.999Z',
      },
      {
        videoId: 'video-a',
        publishedAt: '2026-09-20T00:00:00.000Z',
      },
    ],
  });

  const result = validateSnsFandomYoutubeContentManifest(invalid);
  assert.equal(result.ok, false);
  assert.ok(
    result.blockers.includes(
      'youtube-content-manifest-item-outside-window',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-content-manifest-video-id-duplicate',
    ),
  );
});

test('selection must terminate pagination rather than silently truncate the upload list', () => {
  const invalid = manifest() as unknown as {
    pagination: {
      pageCount: number;
      terminalNextPageToken: string | null;
      terminalPageEvidenceRef: string;
    };
  } & Omit<SnsFandomYoutubeContentManifest, 'pagination'>;

  invalid.pagination = {
    pageCount: 1,
    terminalNextPageToken: 'NEXT_PAGE_EXISTS',
    terminalPageEvidenceRef:
      'evidence://youtube/iu/uploads/non-terminal-page',
  };

  const result = validateSnsFandomYoutubeContentManifest(
    invalid as unknown as SnsFandomYoutubeContentManifest,
  );

  assert.equal(result.ok, false);
  assert.ok(
    result.blockers.includes('youtube-content-pagination-not-terminal'),
  );
});

test('selection endpoint chain is exact and does not accept search/manual discovery as equivalent', () => {
  const invalid = manifest() as unknown as {
    providerEndpoints: readonly string[];
  } & Omit<SnsFandomYoutubeContentManifest, 'providerEndpoints'>;

  invalid.providerEndpoints = [
    'youtube.channels.list',
    'youtube.search.list',
  ];

  const result = validateSnsFandomYoutubeContentManifest(
    invalid as unknown as SnsFandomYoutubeContentManifest,
  );

  assert.equal(result.ok, false);
  assert.ok(
    result.blockers.includes(
      'youtube-content-selection-endpoint-chain-invalid',
    ),
  );
});

test('snapshot time cannot precede the declared content publication window', () => {
  const result = evaluateSnsFandomYoutubeContentSelection({
    manifest: manifest(),
    snapshotVideoIds: ['video-a', 'video-b'],
    snapshotObservedAt: '2026-09-15T00:00:00.000Z',
  });

  assert.equal(result.state, 'selection-blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-content-snapshot-precedes-window-end',
    ),
  );
});
