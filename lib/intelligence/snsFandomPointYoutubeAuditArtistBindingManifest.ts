export const SNS_FANDOM_YOUTUBE_AUDIT_ARTIST_BINDING_MANIFEST_VERSION =
  'sns-fandom-youtube-audit-artist-binding-manifest-v1' as const;

export type SnsFandomYoutubeAuditArtistBinding = Readonly<{
  canonicalArtistId: string;
  youtubeChannelId: string;
  bindingState: 'verified';
  includedInAuditScope: boolean;
  evidenceRef: string;
  verifiedAt: string;
  sharedChannelCaveat: string | null;
}>;

export type SnsFandomYoutubeAuditArtistBindingManifestInput = Readonly<{
  manifestId: string;
  evidenceRef: string;
  members: readonly SnsFandomYoutubeAuditArtistBinding[];
}>;

export type SnsFandomYoutubeAuditArtistBindingManifestResult = Readonly<{
  contractVersion:
    typeof SNS_FANDOM_YOUTUBE_AUDIT_ARTIST_BINDING_MANIFEST_VERSION;
  state: 'blocked' | 'binding-manifest-ready';
  manifestId: string;
  evidenceRef: string | null;
  verifiedMemberCount: number;
  auditScopeMemberCount: number;
  auditScopeCanonicalArtistIds: readonly string[];
  auditScopeYoutubeChannelIds: readonly string[];
  arbitraryUniverseTargetApplied: false;
  submissionEvidenceEligible: boolean;
  blockers: readonly string[];
}>;

const YOUTUBE_CHANNEL_ID = /^UC[A-Za-z0-9_-]{22}$/;

function present(value: string): boolean {
  return value.trim().length > 0;
}

function validIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function secretLike(value: string): boolean {
  if (/AIza[0-9A-Za-z_-]{10,}/.test(value)) return true;
  const normalized = value.toLowerCase();
  return [
    'password=',
    'access_token=',
    'refresh_token=',
    'client_secret=',
    'authorization: bearer ',
    'api_key=',
    'apikey=',
    'key=aiza',
  ].some((needle) => normalized.includes(needle));
}

export function evaluateSnsFandomYoutubeAuditArtistBindingManifest(
  input: SnsFandomYoutubeAuditArtistBindingManifestInput,
): SnsFandomYoutubeAuditArtistBindingManifestResult {
  const blockers: string[] = [];

  if (!present(input.manifestId)) {
    blockers.push('youtube-audit-binding-manifest-id-empty');
  }

  if (!present(input.evidenceRef)) {
    blockers.push('youtube-audit-binding-manifest-evidence-missing');
  } else if (secretLike(input.evidenceRef)) {
    blockers.push('youtube-audit-binding-manifest-evidence-secret-like');
  }

  if (input.members.length === 0) {
    blockers.push('youtube-audit-binding-manifest-empty');
  }

  const canonicalArtistIds = new Set<string>();
  const channelToMembers = new Map<string, SnsFandomYoutubeAuditArtistBinding[]>();

  for (const member of input.members) {
    if (!present(member.canonicalArtistId)) {
      blockers.push('youtube-audit-binding-canonical-artist-id-empty');
    } else if (canonicalArtistIds.has(member.canonicalArtistId)) {
      blockers.push('youtube-audit-binding-canonical-artist-duplicate');
    } else {
      canonicalArtistIds.add(member.canonicalArtistId);
    }

    if (!YOUTUBE_CHANNEL_ID.test(member.youtubeChannelId)) {
      blockers.push('youtube-audit-binding-youtube-channel-id-invalid');
    } else {
      const existing = channelToMembers.get(member.youtubeChannelId) ?? [];
      existing.push(member);
      channelToMembers.set(member.youtubeChannelId, existing);
    }

    if (member.bindingState !== 'verified') {
      blockers.push('youtube-audit-binding-state-not-verified');
    }

    if (!present(member.evidenceRef)) {
      blockers.push('youtube-audit-binding-evidence-missing');
    } else if (secretLike(member.evidenceRef)) {
      blockers.push('youtube-audit-binding-evidence-secret-like');
    }

    if (!validIso(member.verifiedAt)) {
      blockers.push('youtube-audit-binding-verified-at-invalid');
    }

    if (
      member.sharedChannelCaveat !== null
      && !present(member.sharedChannelCaveat)
    ) {
      blockers.push('youtube-audit-binding-shared-channel-caveat-empty');
    }
  }

  for (const members of channelToMembers.values()) {
    if (members.length <= 1) continue;

    if (members.some((member) => member.sharedChannelCaveat === null)) {
      blockers.push('youtube-audit-binding-shared-channel-caveat-required');
    }

    if (members.some((member) => member.includedInAuditScope)) {
      blockers.push('youtube-audit-binding-shared-channel-not-audit-eligible');
    }
  }

  const auditScopeMembers = input.members.filter(
    (member) => member.includedInAuditScope,
  );

  if (auditScopeMembers.length === 0) {
    blockers.push('youtube-audit-binding-audit-scope-empty');
  }

  const uniqueBlockers = Object.freeze(Array.from(new Set(blockers)));
  const ready = uniqueBlockers.length === 0;

  return Object.freeze({
    contractVersion:
      SNS_FANDOM_YOUTUBE_AUDIT_ARTIST_BINDING_MANIFEST_VERSION,
    state: ready ? 'binding-manifest-ready' as const : 'blocked' as const,
    manifestId: input.manifestId,
    evidenceRef: ready ? input.evidenceRef : null,
    verifiedMemberCount: input.members.length,
    auditScopeMemberCount: auditScopeMembers.length,
    auditScopeCanonicalArtistIds: Object.freeze(
      auditScopeMembers.map((member) => member.canonicalArtistId).sort(),
    ),
    auditScopeYoutubeChannelIds: Object.freeze(
      auditScopeMembers.map((member) => member.youtubeChannelId).sort(),
    ),
    arbitraryUniverseTargetApplied: false as const,
    submissionEvidenceEligible: ready,
    blockers: uniqueBlockers,
  });
}
