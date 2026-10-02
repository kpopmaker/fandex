import assert from 'node:assert/strict';
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
