import type {
  AlbumResearchIdentityCandidate,
  AlbumResearchIdentityResolution,
  AlternativeEvidence,
} from './contracts';

export type AlbumResearchIdentityResolutionRequest = Readonly<{
  evidence: AlternativeEvidence;
  candidate: AlbumResearchIdentityCandidate | null;
  contextTextDigest: string;
}>;

export interface AlbumResearchIdentityResolver {
  resolveArtist(
    request: AlbumResearchIdentityResolutionRequest,
  ): AlbumResearchIdentityResolution;
  resolveRelease(
    request: AlbumResearchIdentityResolutionRequest,
  ): AlbumResearchIdentityResolution;
}

export type AlbumResearchIdentityHints = Readonly<{
  artist: AlbumResearchIdentityCandidate | null;
  release: AlbumResearchIdentityCandidate | null;
  releaseFamily: AlbumResearchIdentityCandidate | null;
}>;

export function unresolvedIdentity(
  candidate: AlbumResearchIdentityCandidate | null,
): AlbumResearchIdentityResolution {
  return Object.freeze({
    fandexId: null,
    candidate,
    state: candidate ? 'candidate' : 'unresolved',
    reviewed: false,
    blockers: Object.freeze([
      candidate ? 'identity-review-required' : 'identity-candidate-missing',
    ]),
  });
}

function validateResolution(
  resolution: AlbumResearchIdentityResolution,
  entity: 'artist' | 'release',
): AlbumResearchIdentityResolution {
  if (resolution.state === 'resolved') {
    if (!resolution.fandexId || !resolution.reviewed) {
      throw new Error(`album_research_${entity}_resolution_not_reviewed`);
    }
  } else if (resolution.fandexId !== null) {
    throw new Error(`album_research_${entity}_resolution_state_invalid`);
  }
  return resolution;
}

export function resolveAlbumResearchIdentities(input: Readonly<{
  evidence: AlternativeEvidence;
  contextTextDigest: string;
  hints?: Partial<AlbumResearchIdentityHints>;
  resolver?: AlbumResearchIdentityResolver;
}>): Readonly<{
  artist: AlbumResearchIdentityResolution;
  release: AlbumResearchIdentityResolution;
  releaseFamily: AlbumResearchIdentityCandidate | null;
}> {
  const artistCandidate = input.hints?.artist ?? null;
  const releaseCandidate = input.hints?.release ?? null;
  const artistRequest = Object.freeze({
    evidence: input.evidence,
    candidate: artistCandidate,
    contextTextDigest: input.contextTextDigest,
  });
  const releaseRequest = Object.freeze({
    evidence: input.evidence,
    candidate: releaseCandidate,
    contextTextDigest: input.contextTextDigest,
  });

  return Object.freeze({
    artist: validateResolution(
      input.resolver?.resolveArtist(artistRequest)
        ?? unresolvedIdentity(artistCandidate),
      'artist',
    ),
    release: validateResolution(
      input.resolver?.resolveRelease(releaseRequest)
        ?? unresolvedIdentity(releaseCandidate),
      'release',
    ),
    releaseFamily: input.hints?.releaseFamily ?? null,
  });
}
