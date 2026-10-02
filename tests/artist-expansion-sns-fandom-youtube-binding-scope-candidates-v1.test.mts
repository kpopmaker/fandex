import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function load() {
  const raw = await readFile(
    new URL(
      '../data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_binding_scope_candidates_v1.json',
      import.meta.url,
    ),
    'utf8',
  );
  return JSON.parse(raw) as {
    version: string;
    status: string;
    semantics: Record<string, boolean>;
    summary: {
      ownerSelectableCandidateCount: number;
      conditionalCandidateCount: number;
      sharedChannelBlockedArtistCount: number;
      selectedAuditScopeCount: number;
    };
    ownerSelectableCandidates: Array<{
      canonicalArtistId: string;
      youtubeChannelId: string;
      channelTitle: string;
      candidateBasis: string;
      evidenceRefs: string[];
      selected: boolean;
    }>;
    conditionalCandidates: Array<{
      canonicalArtistId: string;
      youtubeChannelId: string;
      channelTitle: string;
      condition: string;
      candidateBasis: string;
      evidenceRefs: string[];
      selected: boolean;
    }>;
    blockedSharedChannelArtists: Array<{
      canonicalArtistId: string;
      youtubeChannelId: string;
      channelTitle: string;
      blockReason: string;
    }>;
    selectedAuditScope: unknown[];
    blockers: string[];
  };
}

test('scope handoff reduces current evidence to five selectable and one conditional candidate', async () => {
  const data = await load();

  assert.equal(
    data.version,
    'sns_fandom_youtube_audit_binding_scope_candidates_v1',
  );
  assert.equal(data.status, 'owner-selection-required');
  assert.equal(data.summary.ownerSelectableCandidateCount, 5);
  assert.equal(data.summary.conditionalCandidateCount, 1);
  assert.equal(data.ownerSelectableCandidates.length, 5);
  assert.equal(data.conditionalCandidates.length, 1);

  assert.deepEqual(
    data.ownerSelectableCandidates
      .map((entry) => entry.canonicalArtistId)
      .sort(),
    ['blackpink', 'jennie', 'riize', 'rose', 'twice'],
  );
  assert.equal(data.conditionalCandidates[0].canonicalArtistId, 'lisa');
});

test('candidate set stays non-authorizing until owner selection', async () => {
  const data = await load();

  assert.equal(data.summary.selectedAuditScopeCount, 0);
  assert.deepEqual(data.selectedAuditScope, []);
  assert.ok(
    data.ownerSelectableCandidates.every((entry) => entry.selected === false),
  );
  assert.ok(
    data.conditionalCandidates.every((entry) => entry.selected === false),
  );
  assert.equal(data.semantics.candidateDoesNotEqualSelected, true);
  assert.equal(data.semantics.selectedDoesNotEqualProviderApproved, true);
  assert.equal(data.semantics.noAutomaticAuditScopeSelection, true);
  assert.ok(
    data.blockers.includes('owner-audit-cohort-selection-required'),
  );
});

test('selectable candidate channel identities are unique and evidence-bound', async () => {
  const data = await load();
  const artistIds = new Set<string>();
  const channelIds = new Set<string>();

  for (const entry of data.ownerSelectableCandidates) {
    assert.equal(artistIds.has(entry.canonicalArtistId), false);
    assert.equal(channelIds.has(entry.youtubeChannelId), false);
    artistIds.add(entry.canonicalArtistId);
    channelIds.add(entry.youtubeChannelId);

    assert.match(entry.youtubeChannelId, /^UC[A-Za-z0-9_-]{22}$/);
    assert.ok(
      entry.evidenceRefs.includes(
        `https://www.youtube.com/channel/${entry.youtubeChannelId}`,
      ),
    );
    for (const ref of entry.evidenceRefs) {
      assert.equal(
        /access_token=|refresh_token=|client_secret=|api_key=|key=AIza/i.test(
          ref,
        ),
        false,
      );
    }
  }
});

test('LISA remains conditional because the current OAC candidate is label-owned', async () => {
  const data = await load();
  const lisa = data.conditionalCandidates[0];

  assert.equal(lisa.canonicalArtistId, 'lisa');
  assert.equal(lisa.youtubeChannelId, 'UC6-BgjsBa5R3PZQ_kZ8hKPg');
  assert.equal(lisa.channelTitle, 'LLOUD Official');
  assert.equal(
    lisa.condition,
    'explicit-owner-acceptance-of-label-owned-oac-for-artist-scope',
  );
  assert.equal(lisa.selected, false);
  assert.ok(
    data.blockers.includes(
      'lisa-label-owned-oac-policy-decision-required',
    ),
  );
});

test('historically shared HYBE LABELS and BANGTANTV rows stay outside the selectable set', async () => {
  const data = await load();

  assert.equal(data.summary.sharedChannelBlockedArtistCount, 5);
  assert.equal(data.blockedSharedChannelArtists.length, 5);
  assert.equal(
    data.semantics.sharedChannelExcludedFromV1SelectableSet,
    true,
  );

  const blockedChannels = new Set(
    data.blockedSharedChannelArtists.map(
      (entry) => entry.youtubeChannelId,
    ),
  );
  assert.deepEqual(
    [...blockedChannels].sort(),
    [
      'UC3IZKseVpdzPSBaWxBxundA',
      'UCLkAepWjdylmXSltofFvsYQ',
    ].sort(),
  );

  const selectableChannels = new Set(
    data.ownerSelectableCandidates.map(
      (entry) => entry.youtubeChannelId,
    ),
  );
  for (const channelId of blockedChannels) {
    assert.equal(selectableChannels.has(channelId), false);
  }
});
