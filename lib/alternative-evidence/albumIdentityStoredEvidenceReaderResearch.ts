import type { AlternativeEvidence } from './contracts';
import type { RetailObservation } from './retailObservation';
import {
  ALBUM_IDENTITY_RESEARCH_ROWS_FOR_RETAIL_PRODUCT_SQL,
  fromRetailObservationWithStoredAlbumIdentityResearch,
  type AlbumIdentityResearchStoredRow,
  type StoredRetailIdentityFeatureBridge,
} from './albumIdentityStoredEvidenceHydrationResearch';

export const ALBUM_IDENTITY_STORED_EVIDENCE_READER_RESEARCH_CONTRACT_VERSION =
  'album-identity-stored-evidence-reader-research-v1' as const;

export const ALBUM_IDENTITY_STORED_EVIDENCE_READER_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: ALBUM_IDENTITY_STORED_EVIDENCE_READER_RESEARCH_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  sourceStore: 'fandex.album_identity_research_records' as const,
  readOnly: true as const,
  databaseReadFailureIsMissing: false as const,
  databaseReadFailureIsZero: false as const,
  directProductContributionEligible: false as const,
  productScorePublished: false as const,
  productionEligible: false as const,
  maxDatabaseReadsPerBridge: 1 as const,
  semantics: 'read-stored-album-identity-evidence-and-build-research-feature-input' as const,
});

export interface AlbumIdentityResearchQueryExecutor {
  query(
    sql: string,
    params: unknown[],
  ): Promise<Readonly<{ rows: readonly AlbumIdentityResearchStoredRow[] }>>;
}

export type StoredRetailIdentityReadBridge = Readonly<{
  resolution: StoredRetailIdentityFeatureBridge['resolution'];
  observation: StoredRetailIdentityFeatureBridge['observation'];
  features: StoredRetailIdentityFeatureBridge['features'];
  effects: Readonly<{ databaseReads: 0 | 1; databaseWrites: 0; externalCalls: 0 }>;
}>;

export async function readStoredAlbumIdentityAndBuildRetailFeaturesResearch(
  executor: AlbumIdentityResearchQueryExecutor,
  observation: RetailObservation,
  evidence: AlternativeEvidence,
  options: Readonly<{
    rankFeatureKey?: 'physicalRetailLevelProxy' | 'diagnosticRank';
    includeBreadth?: boolean;
  }> = {},
): Promise<StoredRetailIdentityReadBridge> {
  if (!observation.retailerProductId) {
    const bridged = fromRetailObservationWithStoredAlbumIdentityResearch(observation, evidence, [], options);
    return Object.freeze({
      ...bridged,
      effects: Object.freeze({ databaseReads: 0 as const, databaseWrites: 0 as const, externalCalls: 0 as const }),
    });
  }

  const result = await executor.query(
    ALBUM_IDENTITY_RESEARCH_ROWS_FOR_RETAIL_PRODUCT_SQL,
    [observation.retailerId, observation.retailerProductId],
  );
  const bridged = fromRetailObservationWithStoredAlbumIdentityResearch(
    observation,
    evidence,
    result.rows,
    options,
  );
  return Object.freeze({
    ...bridged,
    effects: Object.freeze({ databaseReads: 1 as const, databaseWrites: 0 as const, externalCalls: 0 as const }),
  });
}
