import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

async function readJson(path: string) {
  return JSON.parse(
    await readFile(new URL(`../${path}`, import.meta.url), 'utf8'),
  ) as Record<string, unknown>;
}

test('approved audit binding manifest contains exactly the five selected cohort members', async () => {
  const manifest = await readJson(
    'data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_artist_binding_manifest_v1.json',
  ) as {
    manifestId: string;
    evidenceRef: string;
    members: Array<{
      canonicalArtistId: string;
      youtubeChannelId: string;
      bindingState: string;
      includedInAuditScope: boolean;
      evidenceRef: string;
      verifiedAt: string;
      sharedChannelCaveat: string | null;
    }>;
    ownerDecision: {
      cohortVersion: string;
      selectedCanonicalArtistIds: string[];
      heldCanonicalArtistIds: string[];
      decisionRecordedAt: string;
      providerApprovalImplied: boolean;
      collectionAuthorizationImplied: boolean;
      mergeAuthorizationImplied: boolean;
      deploymentAuthorizationImplied: boolean;
    };
  };

  assert.equal(
    manifest.manifestId,
    'sns-fandom-youtube-audit-cohort-v1',
  );
  assert.equal(manifest.members.length, 5);
  assert.deepEqual(
    manifest.members.map((member) => member.canonicalArtistId).sort(),
    ['blackpink', 'jennie', 'riize', 'rose', 'twice'],
  );
  assert.deepEqual(
    [...manifest.ownerDecision.selectedCanonicalArtistIds].sort(),
    ['blackpink', 'jennie', 'riize', 'rose', 'twice'],
  );
  assert.deepEqual(manifest.ownerDecision.heldCanonicalArtistIds, ['lisa']);
});

test('manifest members satisfy snsFandom binding-manifest-v1 input invariants', async () => {
  const manifest = await readJson(
    'data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_artist_binding_manifest_v1.json',
  ) as {
    manifestId: string;
    evidenceRef: string;
    members: Array<{
      canonicalArtistId: string;
      youtubeChannelId: string;
      bindingState: string;
      includedInAuditScope: boolean;
      evidenceRef: string;
      verifiedAt: string;
      sharedChannelCaveat: string | null;
    }>;
  };

  assert.ok(manifest.manifestId.length > 0);
  assert.ok(manifest.evidenceRef.length > 0);

  const artistIds = new Set<string>();
  const channelIds = new Set<string>();

  for (const member of manifest.members) {
    assert.equal(artistIds.has(member.canonicalArtistId), false);
    assert.equal(channelIds.has(member.youtubeChannelId), false);
    artistIds.add(member.canonicalArtistId);
    channelIds.add(member.youtubeChannelId);

    assert.match(member.youtubeChannelId, /^UC[A-Za-z0-9_-]{22}$/);
    assert.equal(member.bindingState, 'verified');
    assert.equal(member.includedInAuditScope, true);
    assert.equal(member.sharedChannelCaveat, null);
    assert.equal(
      new Date(member.verifiedAt).toISOString(),
      member.verifiedAt,
    );
    assert.equal(
      /access_token=|refresh_token=|client_secret=|api_key=|key=AIza/i.test(
        member.evidenceRef,
      ),
      false,
    );
  }
});

test('final manifest exactly matches the recorded selectedAuditScope handoff', async () => {
  const [manifestRaw, scopeRaw] = await Promise.all([
    readJson(
      'data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_artist_binding_manifest_v1.json',
    ),
    readJson(
      'data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_binding_scope_candidates_v1.json',
    ),
  ]);

  const manifest = manifestRaw as {
    members: Array<{
      canonicalArtistId: string;
      youtubeChannelId: string;
    }>;
  };
  const scope = scopeRaw as {
    selectedAuditScope: Array<{
      canonicalArtistId: string;
      youtubeChannelId: string;
    }>;
    ownerDecision: {
      lisaDisposition: string;
    };
  };

  const normalize = (
    values: Array<{ canonicalArtistId: string; youtubeChannelId: string }>,
  ) =>
    values
      .map(
        (entry) =>
          `${entry.canonicalArtistId}:${entry.youtubeChannelId}`,
      )
      .sort();

  assert.deepEqual(
    normalize(manifest.members),
    normalize(scope.selectedAuditScope),
  );
  assert.equal(scope.ownerDecision.lisaDisposition, 'hold');
  assert.equal(
    manifest.members.some(
      (member) => member.canonicalArtistId === 'lisa',
    ),
    false,
  );
});

test('cohort selection does not imply provider, collection, merge, or deployment authorization', async () => {
  const manifest = await readJson(
    'data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_artist_binding_manifest_v1.json',
  ) as {
    ownerDecision: {
      providerApprovalImplied: boolean;
      collectionAuthorizationImplied: boolean;
      mergeAuthorizationImplied: boolean;
      deploymentAuthorizationImplied: boolean;
      decisionRecordedAt: string;
    };
  };

  assert.equal(manifest.ownerDecision.providerApprovalImplied, false);
  assert.equal(
    manifest.ownerDecision.collectionAuthorizationImplied,
    false,
  );
  assert.equal(manifest.ownerDecision.mergeAuthorizationImplied, false);
  assert.equal(
    manifest.ownerDecision.deploymentAuthorizationImplied,
    false,
  );
  assert.equal(
    Number.isFinite(Date.parse(manifest.ownerDecision.decisionRecordedAt)),
    true,
  );
});
