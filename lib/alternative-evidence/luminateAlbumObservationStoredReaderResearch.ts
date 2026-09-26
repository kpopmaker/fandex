import {
  IU_LUMINATE_BASELINE_ACQUISITION_TARGETS_RESEARCH,
} from './iuLuminateBaselineAcquisitionResearch';
import {
  resolveIuLuminateStoredNormalization,
  type IuLuminateStoredNormalizationResult,
  type LuminateObservationResearchStoredRow,
} from './iuLuminateStoredNormalizationResearch';

export const LUMINATE_ALBUM_OBSERVATION_STORED_READER_RESEARCH_VERSION =
  'luminate-album-observation-stored-reader-research-v1' as const;

export const LUMINATE_ALBUM_OBSERVATION_STORED_READER_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: LUMINATE_ALBUM_OBSERVATION_STORED_READER_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  sourceStore: 'fandex.album_research_observation_records' as const,
  providerId: 'luminate-music' as const,
  artistId: 'iu' as const,
  readOnly: true as const,
  maxDatabaseReadsPerResolution: 1 as const,
  databaseReadFailureIsMissing: false as const,
  databaseReadFailureIsZero: false as const,
  databaseReadFailureIsStable: false as const,
  queryResultOutsideRequestedLaneAllowed: false as const,
  directProductContributionEligible: false as const,
  productScorePublished: false as const,
  productionEligible: false as const,
  semantics: 'read-one-bounded-luminate-iu-lane-and-resolve-stored-normalization' as const,
});

export const IU_LUMINATE_STORED_OBSERVATIONS_FOR_NORMALIZATION_SQL = `
SELECT
  record_id,
  record_version,
  provider,
  source_entity_id,
  source_record_id,
  observation_id,
  payload_digest,
  fandex_artist_id,
  fandex_release_id,
  provider_period,
  record_state,
  supersedes_record_id,
  intake_plan_digest,
  write_grant_digest,
  authorization_snapshot,
  observation_payload,
  observed_at,
  collected_at,
  revision_observed_at
FROM fandex.album_research_observation_records
WHERE provider = 'luminate-music'
  AND fandex_artist_id = 'iu'
  AND fandex_release_id = ANY($1::text[])
  AND observation_payload->>'territory' = $2
  AND observation_payload->>'semantic' = 'first-week-sale'
  AND observation_payload->>'unit' = 'physical-units'
  AND observation_payload->>'format' = 'physical'
  AND observation_payload->>'scopeRole' = 'release-total'
ORDER BY fandex_release_id, observed_at, collected_at, record_id;` as const;

export interface LuminateAlbumObservationResearchQueryExecutor {
  query(
    sql: string,
    params: unknown[],
  ): Promise<Readonly<{ rows: readonly LuminateObservationResearchStoredRow[] }>>;
}

export type IuLuminateStoredAuthorizationLineage = Readonly<{
  agreementEvidenceIds: readonly string[];
  postTerminationPolicyEvidenceIds: readonly string[];
  publicOutputModes: readonly string[];
  writeGrantDigests: readonly string[];
  authorizedTerritories: readonly ('US' | 'CA')[];
}>;

export type IuLuminateStoredNormalizationRead = Readonly<{
  releaseIdsQueried: readonly string[];
  rowsRead: number;
  authorizationLineage: IuLuminateStoredAuthorizationLineage;
  resolution: IuLuminateStoredNormalizationResult;
  effects: Readonly<{ databaseReads: 1; databaseWrites: 0; externalCalls: 0 }>;
}>;

function requestedReleaseIds(): readonly string[] {
  return Object.freeze(
    IU_LUMINATE_BASELINE_ACQUISITION_TARGETS_RESEARCH.map((target) => target.fandexReleaseId),
  );
}

function assertReturnedRowsStayInRequestedLane(
  rows: readonly LuminateObservationResearchStoredRow[],
  territory: 'US' | 'CA',
  releaseIds: readonly string[],
): void {
  const allowed = new Set(releaseIds);
  for (const row of rows) {
    if (row.provider !== 'luminate-music') {
      throw new Error('luminate_observation_reader_provider_filter_mismatch');
    }
    if (row.fandex_artist_id !== 'iu') {
      throw new Error('luminate_observation_reader_artist_filter_mismatch');
    }
    if (!allowed.has(row.fandex_release_id)) {
      throw new Error('luminate_observation_reader_release_filter_mismatch');
    }
    if (row.observation_payload.territory !== territory) {
      throw new Error('luminate_observation_reader_territory_filter_mismatch');
    }
    if (row.observation_payload.semantic !== 'first-week-sale'
        || row.observation_payload.unit !== 'physical-units'
        || row.observation_payload.format !== 'physical'
        || row.observation_payload.scopeRole !== 'release-total') {
      throw new Error('luminate_observation_reader_scope_filter_mismatch');
    }
  }
}

function summarizeAuthorizationLineage(
  rows: readonly LuminateObservationResearchStoredRow[],
): IuLuminateStoredAuthorizationLineage {
  const agreements = new Set<string>();
  const postTerminationPolicies = new Set<string>();
  const outputModes = new Set<string>();
  const writeGrantDigests = new Set<string>();
  const territories = new Set<'US' | 'CA'>();

  for (const row of rows) {
    agreements.add(row.authorization_snapshot.agreementEvidenceId);
    postTerminationPolicies.add(row.authorization_snapshot.postTerminationPolicyEvidenceId);
    outputModes.add(row.authorization_snapshot.publicOutputMode);
    writeGrantDigests.add(row.write_grant_digest);
    for (const territory of row.authorization_snapshot.authorizedTerritories) {
      territories.add(territory);
    }
  }

  return Object.freeze({
    agreementEvidenceIds: Object.freeze([...agreements].sort()),
    postTerminationPolicyEvidenceIds: Object.freeze([...postTerminationPolicies].sort()),
    publicOutputModes: Object.freeze([...outputModes].sort()),
    writeGrantDigests: Object.freeze([...writeGrantDigests].sort()),
    authorizedTerritories: Object.freeze([...territories].sort()),
  });
}

export async function readStoredIuLuminateNormalizationResearch(
  executor: LuminateAlbumObservationResearchQueryExecutor,
  territory: 'US' | 'CA',
): Promise<IuLuminateStoredNormalizationRead> {
  const releaseIds = requestedReleaseIds();
  const result = await executor.query(
    IU_LUMINATE_STORED_OBSERVATIONS_FOR_NORMALIZATION_SQL,
    [releaseIds, territory],
  );

  assertReturnedRowsStayInRequestedLane(result.rows, territory, releaseIds);
  const resolution = resolveIuLuminateStoredNormalization(result.rows, territory);
  const authorizationLineage = summarizeAuthorizationLineage(result.rows);

  return Object.freeze({
    releaseIdsQueried: releaseIds,
    rowsRead: result.rows.length,
    authorizationLineage,
    resolution,
    effects: Object.freeze({
      databaseReads: 1 as const,
      databaseWrites: 0 as const,
      externalCalls: 0 as const,
    }),
  });
}
