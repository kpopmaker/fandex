import { fromAlbumResearchClaim, type CanonicalAlbumFeatureInput } from './canonicalAlbumFeatureInput';
import {
  validateAlbumResearchClaimStoredRow,
  type AlbumResearchClaimStoredRow,
} from './albumResearchClaimPersistenceResearch';
import type { AlbumResearchClaim } from './contracts';

export const ALBUM_RESEARCH_CLAIM_STORED_READER_RESEARCH_CONTRACT_VERSION =
  'album-research-claim-stored-reader-research-v1' as const;

export const ALBUM_RESEARCH_CLAIM_STORED_READER_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: ALBUM_RESEARCH_CLAIM_STORED_READER_RESEARCH_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  sourceStore: 'fandex.album_research_claim_records' as const,
  readOnly: true as const,
  maxDatabaseReadsPerCall: 1 as const,
  databaseReadFailureIsMissing: false as const,
  databaseReadFailureIsZero: false as const,
  directProductContributionEligible: false as const,
  productScorePublished: false as const,
  productionEligible: false as const,
  semantics: 'read-verified-stored-album-research-claims-and-build-canonical-feature-inputs' as const,
});

export const ALBUM_RESEARCH_CLAIMS_FOR_RELEASE_SQL = `
SELECT *
FROM fandex.album_research_claim_records
WHERE release_id = $1
  AND research_only = true
ORDER BY claim_id;` as const;

export interface AlbumResearchClaimQueryExecutor {
  query(
    sql: string,
    params: unknown[],
  ): Promise<Readonly<{ rows: readonly AlbumResearchClaimStoredRow[] }>>;
}

export type StoredAlbumResearchClaimFeatureRead = Readonly<{
  claims: readonly AlbumResearchClaim[];
  features: readonly CanonicalAlbumFeatureInput[];
  effects: Readonly<{ databaseReads: 1; databaseWrites: 0; externalCalls: 0 }>;
}>;

export async function readStoredAlbumResearchClaimsAndBuildFeaturesResearch(
  executor: AlbumResearchClaimQueryExecutor,
  releaseId: string,
): Promise<StoredAlbumResearchClaimFeatureRead> {
  if (!releaseId.startsWith('research:')) {
    throw new Error('album_research_claim_reader_requires_research_release_id');
  }

  const result = await executor.query(ALBUM_RESEARCH_CLAIMS_FOR_RELEASE_SQL, [releaseId]);
  const claims: AlbumResearchClaim[] = [];
  const features: CanonicalAlbumFeatureInput[] = [];

  for (const row of result.rows) {
    const issues = validateAlbumResearchClaimStoredRow(row);
    if (issues.length > 0) {
      throw new Error(`album_research_claim_stored_invalid:${issues.join(',')}`);
    }
    if (row.release_id !== releaseId) {
      throw new Error('album_research_claim_release_filter_mismatch');
    }
    const claim = row.claim_payload;
    claims.push(claim);
    features.push(...fromAlbumResearchClaim(claim));
  }

  return Object.freeze({
    claims: Object.freeze(claims),
    features: Object.freeze(features),
    effects: Object.freeze({ databaseReads: 1 as const, databaseWrites: 0 as const, externalCalls: 0 as const }),
  });
}
