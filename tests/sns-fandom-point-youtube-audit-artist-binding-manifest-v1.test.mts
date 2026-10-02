import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  evaluateSnsFandomYoutubeAuditArtistBindingManifest,
  type SnsFandomYoutubeAuditArtistBindingManifestInput,
} from '../lib/intelligence/snsFandomPointYoutubeAuditArtistBindingManifest';

function manifest(
  overrides: Partial<SnsFandomYoutubeAuditArtistBindingManifestInput> = {},
): SnsFandomYoutubeAuditArtistBindingManifestInput {
  return {
    manifestId: 'youtube-audit-binding-manifest-study-v1',
    evidenceRef: 'external://youtube-audit/verified-channel-bindings',
    members: [
      {
        canonicalArtistId: 'artist-a',
        youtubeChannelId: 'UCaaaaaaaaaaaaaaaaaaaaaa',
        bindingState: 'verified',
        includedInAuditScope: true,
        evidenceRef: 'external://youtube-binding/artist-a',
        verifiedAt: '2026-10-02T11:30:00.000Z',
        sharedChannelCaveat: null,
      },
      {
        canonicalArtistId: 'artist-b',
        youtubeChannelId: 'UCbbbbbbbbbbbbbbbbbbbbbb',
        bindingState: 'verified',
        includedInAuditScope: true,
        evidenceRef: 'external://youtube-binding/artist-b',
        verifiedAt: '2026-10-02T11:31:00.000Z',
        sharedChannelCaveat: null,
      },
    ],
    ...overrides,
  };
}

test('verified unique artist channels produce an exact audit-scope count', () => {
  const result = evaluateSnsFandomYoutubeAuditArtistBindingManifest(
    manifest(),
  );

  assert.equal(result.state, 'binding-manifest-ready');
  assert.equal(result.verifiedMemberCount, 2);
  assert.equal(result.auditScopeMemberCount, 2);
  assert.deepEqual(result.auditScopeCanonicalArtistIds, [
    'artist-a',
    'artist-b',
  ]);
  assert.deepEqual(result.auditScopeYoutubeChannelIds, [
    'UCaaaaaaaaaaaaaaaaaaaaaa',
    'UCbbbbbbbbbbbbbbbbbbbbbb',
  ]);
  assert.equal(result.arbitraryUniverseTargetApplied, false);
  assert.equal(result.submissionEvidenceEligible, true);
  assert.deepEqual(result.blockers, []);
});

test('duplicate canonical artist identity fails closed', () => {
  const base = manifest();
  const result = evaluateSnsFandomYoutubeAuditArtistBindingManifest({
    ...base,
    members: [
      base.members[0],
      {
        ...base.members[1],
        canonicalArtistId: 'artist-a',
      },
    ],
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-audit-binding-canonical-artist-duplicate',
    ),
  );
});

test('shared provider channel requires an explicit caveat and cannot enter audit scope', () => {
  const base = manifest();
  const sharedChannel = 'UCcccccccccccccccccccccc';
  const result = evaluateSnsFandomYoutubeAuditArtistBindingManifest({
    ...base,
    members: [
      {
        ...base.members[0],
        youtubeChannelId: sharedChannel,
        sharedChannelCaveat: 'label-shared-channel',
      },
      {
        ...base.members[1],
        youtubeChannelId: sharedChannel,
        sharedChannelCaveat: 'label-shared-channel',
      },
    ],
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-audit-binding-shared-channel-not-audit-eligible',
    ),
  );
});

test('shared channel without caveat is rejected even outside audit scope', () => {
  const base = manifest();
  const sharedChannel = 'UCdddddddddddddddddddddd';
  const result = evaluateSnsFandomYoutubeAuditArtistBindingManifest({
    ...base,
    members: [
      {
        ...base.members[0],
        youtubeChannelId: sharedChannel,
        includedInAuditScope: false,
      },
      {
        ...base.members[1],
        youtubeChannelId: sharedChannel,
        includedInAuditScope: false,
      },
    ],
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-audit-binding-shared-channel-caveat-required',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-audit-binding-audit-scope-empty',
    ),
  );
});

test('invalid YouTube channel identity and missing evidence fail closed', () => {
  const base = manifest();
  const result = evaluateSnsFandomYoutubeAuditArtistBindingManifest({
    ...base,
    members: [
      {
        ...base.members[0],
        youtubeChannelId: 'not-a-youtube-channel',
        evidenceRef: '',
      },
    ],
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-audit-binding-youtube-channel-id-invalid',
    ),
  );
  assert.ok(
    result.blockers.includes(
      'youtube-audit-binding-evidence-missing',
    ),
  );
});

test('binding evidence cannot embed API credentials', () => {
  const base = manifest();
  const result = evaluateSnsFandomYoutubeAuditArtistBindingManifest({
    ...base,
    members: [
      {
        ...base.members[0],
        evidenceRef:
          'external://youtube-binding?key=AIzaDoNotStoreThisValue12345',
      },
    ],
  });

  assert.equal(result.state, 'blocked');
  assert.ok(
    result.blockers.includes(
      'youtube-audit-binding-evidence-secret-like',
    ),
  );
});

test('manifest cannot claim readiness with zero selected audit members', () => {
  const base = manifest();
  const result = evaluateSnsFandomYoutubeAuditArtistBindingManifest({
    ...base,
    members: base.members.map((member) => ({
      ...member,
      includedInAuditScope: false,
    })),
  });

  assert.equal(result.state, 'blocked');
  assert.equal(result.auditScopeMemberCount, 0);
  assert.ok(
    result.blockers.includes(
      'youtube-audit-binding-audit-scope-empty',
    ),
  );
});


test('approved cohort v1 from Artist Expansion handoff is binding-manifest-ready', () => {
  const result = evaluateSnsFandomYoutubeAuditArtistBindingManifest({
    manifestId: 'sns-fandom-youtube-audit-cohort-v1',
    evidenceRef:
      'repo://data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_binding_scope_candidates_v1.json#owner-selection-recorded',
    members: [
      {
        canonicalArtistId: 'blackpink',
        youtubeChannelId: 'UCOmHUn--16B90oW2L6FRR3A',
        bindingState: 'verified',
        includedInAuditScope: true,
        evidenceRef:
          'https://www.youtube.com/channel/UCOmHUn--16B90oW2L6FRR3A',
        verifiedAt: '2026-10-02T12:46:00.000Z',
        sharedChannelCaveat: null,
      },
      {
        canonicalArtistId: 'twice',
        youtubeChannelId: 'UCzgxx_DM2Dcb9Y1spb9mUJA',
        bindingState: 'verified',
        includedInAuditScope: true,
        evidenceRef:
          'https://www.youtube.com/channel/UCzgxx_DM2Dcb9Y1spb9mUJA',
        verifiedAt: '2026-10-02T12:46:00.000Z',
        sharedChannelCaveat: null,
      },
      {
        canonicalArtistId: 'rose',
        youtubeChannelId: 'UCBo1hnzxV9rz3WVsv__Rn1g',
        bindingState: 'verified',
        includedInAuditScope: true,
        evidenceRef:
          'https://www.youtube.com/channel/UCBo1hnzxV9rz3WVsv__Rn1g',
        verifiedAt: '2026-10-02T12:46:00.000Z',
        sharedChannelCaveat: null,
      },
      {
        canonicalArtistId: 'riize',
        youtubeChannelId: 'UCdVD0MsYecQaIE5Ru-pOIQQ',
        bindingState: 'verified',
        includedInAuditScope: true,
        evidenceRef:
          'https://www.youtube.com/channel/UCdVD0MsYecQaIE5Ru-pOIQQ',
        verifiedAt: '2026-10-02T12:46:00.000Z',
        sharedChannelCaveat: null,
      },
      {
        canonicalArtistId: 'jennie',
        youtubeChannelId: 'UCNYi_zGmR519r5gYdOKLTjQ',
        bindingState: 'verified',
        includedInAuditScope: true,
        evidenceRef:
          'https://www.youtube.com/channel/UCNYi_zGmR519r5gYdOKLTjQ',
        verifiedAt: '2026-10-02T12:46:00.000Z',
        sharedChannelCaveat: null,
      },
    ],
  });

  assert.equal(result.state, 'binding-manifest-ready');
  assert.equal(result.verifiedMemberCount, 5);
  assert.equal(result.auditScopeMemberCount, 5);
  assert.deepEqual(result.auditScopeCanonicalArtistIds, [
    'blackpink',
    'jennie',
    'riize',
    'rose',
    'twice',
  ]);
  assert.deepEqual(result.auditScopeYoutubeChannelIds, [
    'UCBo1hnzxV9rz3WVsv__Rn1g',
    'UCNYi_zGmR519r5gYdOKLTjQ',
    'UCOmHUn--16B90oW2L6FRR3A',
    'UCdVD0MsYecQaIE5Ru-pOIQQ',
    'UCzgxx_DM2Dcb9Y1spb9mUJA',
  ].sort());
  assert.equal(result.submissionEvidenceEligible, true);
  assert.equal(result.arbitraryUniverseTargetApplied, false);
  assert.deepEqual(result.blockers, []);
});

test('approved cohort v1 keeps LISA and shared-channel artists out of the manifest', () => {
  const selectedArtistIds = new Set([
    'blackpink',
    'twice',
    'rose',
    'riize',
    'jennie',
  ]);

  assert.equal(selectedArtistIds.has('lisa'), false);
  assert.equal(selectedArtistIds.has('bts'), false);
  assert.equal(selectedArtistIds.has('enhypen'), false);
  assert.equal(selectedArtistIds.has('jimin'), false);
  assert.equal(selectedArtistIds.has('v'), false);
  assert.equal(selectedArtistIds.has('jungkook'), false);
});


test('main-merged Audit cohort v1 artifact evaluates as binding-manifest-ready', async () => {
  const raw = JSON.parse(
    await readFile(
      new URL(
        '../data/fandex-cloud-v10/seed/sns_fandom_youtube_audit_artist_binding_manifest_v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  ) as SnsFandomYoutubeAuditArtistBindingManifestInput & {
    ownerDecision?: Readonly<{
      heldCanonicalArtistIds?: readonly string[];
      providerApprovalImplied?: boolean;
      collectionAuthorizationImplied?: boolean;
    }>;
  };

  const result = evaluateSnsFandomYoutubeAuditArtistBindingManifest({
    manifestId: raw.manifestId,
    evidenceRef: raw.evidenceRef,
    members: raw.members,
  });

  assert.equal(result.state, 'binding-manifest-ready');
  assert.equal(result.verifiedMemberCount, 5);
  assert.equal(result.auditScopeMemberCount, 5);
  assert.deepEqual(result.auditScopeCanonicalArtistIds, [
    'blackpink',
    'jennie',
    'riize',
    'rose',
    'twice',
  ]);
  assert.equal(result.submissionEvidenceEligible, true);
  assert.deepEqual(result.blockers, []);

  assert.deepEqual(raw.ownerDecision?.heldCanonicalArtistIds, ['lisa']);
  assert.equal(raw.ownerDecision?.providerApprovalImplied, false);
  assert.equal(raw.ownerDecision?.collectionAuthorizationImplied, false);
});
