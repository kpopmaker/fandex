import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function load() {
  const raw = await readFile(
    new URL(
      '../data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_binding_current_verification_v1.json',
      import.meta.url,
    ),
    'utf8',
  );
  return JSON.parse(raw) as {
    version: string;
    status: string;
    checkedAt: string;
    methodology: Record<string, boolean>;
    summary: {
      directHistoricalCandidatesChecked: number;
      directHistoricalCandidatesCurrentIdentityConfirmed: number;
      historicalVevoCandidatesChecked: number;
      historicalVevoCandidatesKeptAsCanonical: number;
      replacementCurrentChannelCandidates: number;
      finalAuditScopeIncludedCount: number;
    };
    directCandidates: Array<{
      canonicalArtistId: string;
      historicalChannelId: string;
      currentChannelId: string;
      currentChannelTitle: string;
      verificationState: string;
      currentEvidenceRefs: string[];
      auditScopeIncluded: boolean;
      ownerScopeSelectionRequired: boolean;
    }>;
    vevoTransitions: Array<{
      canonicalArtistId: string;
      historicalVevoChannelId: string;
      historicalVevoCanonicalRetained: boolean;
      currentReplacementCandidate: {
        youtubeChannelId: string;
        channelTitle: string;
        handle: string;
        candidateState: string;
        evidenceRefs: string[];
      };
      personalChannelObservation?: {
        youtubeChannelId: string;
        channelTitle: string;
        handle: string;
        evidenceRefs: string[];
      };
      auditScopeIncluded: boolean;
      ownerScopeSelectionRequired: boolean;
    }>;
    blockers: string[];
  };
}

test('current verification confirms all four direct historical channel identities without enrolling them', async () => {
  const data = await load();

  assert.equal(
    data.version,
    'sns_fandom_youtube_audit_binding_current_verification_v1',
  );
  assert.equal(data.summary.directHistoricalCandidatesChecked, 4);
  assert.equal(
    data.summary.directHistoricalCandidatesCurrentIdentityConfirmed,
    4,
  );
  assert.equal(data.directCandidates.length, 4);
  assert.ok(
    data.directCandidates.every(
      (entry) =>
        entry.verificationState === 'current-channel-identity-confirmed'
        && entry.currentChannelId === entry.historicalChannelId
        && entry.auditScopeIncluded === false
        && entry.ownerScopeSelectionRequired === true,
    ),
  );
});

test('direct current verification is bound to exact non-secret YouTube channel evidence', async () => {
  const data = await load();

  for (const entry of data.directCandidates) {
    assert.match(entry.currentChannelId, /^UC[A-Za-z0-9_-]{22}$/);
    assert.ok(entry.currentChannelTitle.length > 0);
    assert.ok(
      entry.currentEvidenceRefs.includes(
        `https://www.youtube.com/channel/${entry.currentChannelId}`,
      ),
    );
    for (const ref of entry.currentEvidenceRefs) {
      assert.equal(
        /access_token=|refresh_token=|client_secret=|api_key=|key=AIza/i.test(
          ref,
        ),
        false,
      );
    }
  }
});

test('historical VEVO channels are not silently retained as canonical audit channels', async () => {
  const data = await load();

  assert.equal(data.summary.historicalVevoCandidatesChecked, 2);
  assert.equal(data.summary.historicalVevoCandidatesKeptAsCanonical, 0);
  assert.equal(data.summary.replacementCurrentChannelCandidates, 2);

  for (const entry of data.vevoTransitions) {
    assert.equal(entry.historicalVevoCanonicalRetained, false);
    assert.equal(entry.auditScopeIncluded, false);
    assert.equal(entry.ownerScopeSelectionRequired, true);
    assert.match(
      entry.currentReplacementCandidate.youtubeChannelId,
      /^UC[A-Za-z0-9_-]{22}$/,
    );
  }
});

test('JENNIE transition points to the current artist-named OAC candidate', async () => {
  const data = await load();
  const jennie = data.vevoTransitions.find(
    (entry) => entry.canonicalArtistId === 'jennie',
  );

  assert.ok(jennie);
  assert.equal(
    jennie.historicalVevoChannelId,
    'UCN9_L9lA9kqJbGANLRus_1A',
  );
  assert.equal(
    jennie.currentReplacementCandidate.youtubeChannelId,
    'UCNYi_zGmR519r5gYdOKLTjQ',
  );
  assert.equal(jennie.currentReplacementCandidate.channelTitle, 'JENNIE');
  assert.equal(
    jennie.currentReplacementCandidate.candidateState,
    'current-oac-candidate',
  );
});

test('LISA transition preserves the personal channel observation but keeps label-owned OAC scope blocked', async () => {
  const data = await load();
  const lisa = data.vevoTransitions.find(
    (entry) => entry.canonicalArtistId === 'lisa',
  );

  assert.ok(lisa);
  assert.equal(
    lisa.historicalVevoChannelId,
    'UCg3ymxYCmURj5BFtbgMt-Og',
  );
  assert.equal(
    lisa.personalChannelObservation?.youtubeChannelId,
    'UC35HKvKYPkri4Grd5KXl3wQ',
  );
  assert.equal(
    lisa.currentReplacementCandidate.youtubeChannelId,
    'UC6-BgjsBa5R3PZQ_kZ8hKPg',
  );
  assert.equal(
    lisa.currentReplacementCandidate.candidateState,
    'current-oac-label-owned-review-required',
  );
  assert.ok(
    data.blockers.includes(
      'lisa-label-owned-oac-scope-decision-required',
    ),
  );
});

test('current public verification remains non-authorizing', async () => {
  const data = await load();

  assert.equal(data.summary.finalAuditScopeIncludedCount, 0);
  assert.equal(data.methodology.providerApiCallPerformed, false);
  assert.equal(data.methodology.secretUsed, false);
  assert.equal(data.methodology.auditScopeSelectionPerformed, false);
  assert.ok(
    data.blockers.includes('audit-cohort-owner-selection-required'),
  );
  assert.ok(
    data.blockers.includes(
      'shared-channel-artists-still-require-artist-specific-resolution',
    ),
  );
  assert.equal(Number.isFinite(Date.parse(data.checkedAt)), true);
});
