import { sha256Canonical } from '../shared/canonicalDigest';
import type { AlbumResearchClaim } from './contracts';

export const ALBUM_RESEARCH_CLAIM_STORE_PLAN_VERSION =
  'album-research-claim-store-plan-v1';

export type AlbumResearchClaimStoreQuery = Readonly<{
  claimIds?: readonly string[];
  claimFamilyIds?: readonly string[];
  sourceEvidenceIds?: readonly string[];
  asKnownAt?: string | null;
}>;

export type AlbumResearchClaimAppendPlan = Readonly<{
  contractVersion: typeof ALBUM_RESEARCH_CLAIM_STORE_PLAN_VERSION;
  operation: 'append-only';
  claims: readonly AlbumResearchClaim[];
  claimIds: readonly string[];
  planDigest: string;
  effects: Readonly<{
    databaseReads: 0;
    databaseWrites: 0;
    externalCalls: 0;
  }>;
}>;

export function planAlbumResearchClaimAppend(
  claims: readonly AlbumResearchClaim[],
): AlbumResearchClaimAppendPlan {
  const claimIds = Object.freeze([...new Set(claims.map((claim) => claim.claimId))].sort());
  if (claimIds.length !== claims.length) {
    throw new Error('album_research_store_plan_duplicate_claim_id');
  }
  const frozenClaims = Object.freeze([...claims]);
  return Object.freeze({
    contractVersion: ALBUM_RESEARCH_CLAIM_STORE_PLAN_VERSION,
    operation: 'append-only',
    claims: frozenClaims,
    claimIds,
    planDigest: sha256Canonical({
      contractVersion: ALBUM_RESEARCH_CLAIM_STORE_PLAN_VERSION,
      operation: 'append-only',
      claimIds,
    }),
    effects: Object.freeze({ databaseReads: 0, databaseWrites: 0, externalCalls: 0 }),
  });
}

export interface AlbumResearchClaimStore {
  read(query: AlbumResearchClaimStoreQuery): Promise<readonly AlbumResearchClaim[]>;
  planAppend(claims: readonly AlbumResearchClaim[]): Promise<AlbumResearchClaimAppendPlan>;
}
