import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

type RecoveryEntry = Readonly<{
  canonicalArtistId: string;
  videoId: string;
  youtubeChannelId: string;
  channelTitle: string;
  reviewedAt: string;
  reviewReason: string;
  evidenceUrl: string;
  recoveryState:
    | 'direct-artist-channel-candidate'
    | 'vevo-scope-review-required'
    | 'shared-channel-blocked';
  sharedChannelGroup: string | null;
  auditScopeIncluded: boolean;
  currentVerificationRequired: boolean;
}>;

async function load() {
  const raw = await readFile(
    new URL(
      '../data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_binding_recovery_v1.json',
      import.meta.url,
    ),
    'utf8',
  );
  return JSON.parse(raw) as {
    version: string;
    status: string;
    generatedFrom: {
      sourceBranch: string;
      sourceFile: string;
      sourceBlobSha: string;
      sourceDiscoveries: readonly unknown[];
    };
    semantics: Record<string, boolean>;
    summary: {
      recoveredArtistCount: number;
      uniqueRecoveredChannelCount: number;
      directArtistChannelCandidateCount: number;
      vevoScopeReviewRequiredCount: number;
      sharedChannelBlockedArtistCount: number;
      auditScopeIncludedCount: number;
    };
    entries: RecoveryEntry[];
  };
}

test('recovery manifest preserves exact historical reviewed-channel provenance', async () => {
  const data = await load();

  assert.equal(data.version, 'sns_fandom_youtube_audit_binding_recovery_v1');
  assert.equal(
    data.generatedFrom.sourceBranch,
    'validation/artist-expansion-youtube-lineage-final-v1',
  );
  assert.equal(
    data.generatedFrom.sourceFile,
    'data/fandex-cloud-v10/seed/youtube_seed_video_reviews_v1.json',
  );
  assert.equal(
    data.generatedFrom.sourceBlobSha,
    '62713bf1d2644923d5f3f5c510b206151554517e',
  );
  assert.equal(data.generatedFrom.sourceDiscoveries.length, 2);
});

test('historical review recovers 11 artists across 8 distinct channels', async () => {
  const data = await load();
  const artists = new Set(data.entries.map((entry) => entry.canonicalArtistId));
  const channels = new Set(data.entries.map((entry) => entry.youtubeChannelId));

  assert.equal(data.entries.length, 11);
  assert.equal(artists.size, 11);
  assert.equal(channels.size, 8);
  assert.equal(data.summary.recoveredArtistCount, 11);
  assert.equal(data.summary.uniqueRecoveredChannelCount, 8);
});

test('recovery never auto-enrolls a historical channel into the audit cohort', async () => {
  const data = await load();

  assert.equal(data.summary.auditScopeIncludedCount, 0);
  assert.ok(data.entries.every((entry) => entry.auditScopeIncluded === false));
  assert.ok(
    data.entries.every(
      (entry) => entry.currentVerificationRequired === true,
    ),
  );
  assert.equal(
    data.semantics.recoveredReviewDoesNotEqualAuditScopeApproval,
    true,
  );
  assert.equal(
    data.semantics.recoveredReviewDoesNotEqualCurrentOfficialChannelVerification,
    true,
  );
});

test('direct-channel candidates, VEVO review rows, and shared-channel rows stay distinct', async () => {
  const data = await load();
  const counts = data.entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.recoveryState] = (acc[entry.recoveryState] ?? 0) + 1;
    return acc;
  }, {});

  assert.equal(counts['direct-artist-channel-candidate'], 4);
  assert.equal(counts['vevo-scope-review-required'], 2);
  assert.equal(counts['shared-channel-blocked'], 5);

  assert.equal(data.summary.directArtistChannelCandidateCount, 4);
  assert.equal(data.summary.vevoScopeReviewRequiredCount, 2);
  assert.equal(data.summary.sharedChannelBlockedArtistCount, 5);
});

test('HYBE LABELS and BANGTANTV recovered rows remain shared-channel blocked', async () => {
  const data = await load();

  for (const entry of data.entries.filter(
    (candidate) =>
      candidate.youtubeChannelId === 'UC3IZKseVpdzPSBaWxBxundA'
      || candidate.youtubeChannelId === 'UCLkAepWjdylmXSltofFvsYQ',
  )) {
    assert.equal(entry.recoveryState, 'shared-channel-blocked');
    assert.notEqual(entry.sharedChannelGroup, null);
    assert.equal(entry.auditScopeIncluded, false);
  }
});

test('every recovered entry retains exact video evidence and review time', async () => {
  const data = await load();

  for (const entry of data.entries) {
    assert.match(entry.youtubeChannelId, /^UC[A-Za-z0-9_-]{22}$/);
    assert.match(entry.videoId, /^[A-Za-z0-9_-]{11}$/);
    assert.equal(
      new Date(entry.reviewedAt).toISOString(),
      entry.reviewedAt,
    );
    assert.equal(
      entry.evidenceUrl,
      `https://www.youtube.com/watch?v=${entry.videoId}`,
    );
    assert.ok(entry.reviewReason.length > 0);
  }
});
