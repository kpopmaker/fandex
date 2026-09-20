import 'server-only';

import {
  adaptNaverNewsIssuePointProductCandidate,
} from '../../product/adapters/naverNewsIssuePointProductCandidateAdapter';
import {
  getArtistProductVariable,
} from '../../product/queries/getArtistProductVariable';
import {
  getArtistProductVariableShadowReadModel,
  type ArtistProductVariableShadowReadModelResult,
} from '../../product/queries/getArtistProductVariableShadowReadModel';
import {
  createPostgresNaverNewsCanonicalJobEvidenceReadRepository,
} from '../ingestion/naverNewsCanonicalJobEvidence';
import {
  evaluateNaverNewsIssuePointFrozenMethodology,
} from '../ingestion/naverNewsIssuePointFrozenMethodology';
import {
  assembleOfficialNaverNewsShadowFirstSeenSeries,
} from '../ingestion/naverNewsShadowFirstSeenSeries';
import { getRuntimeDatabasePool } from '../persistence/db';

export type ServerArtistProductVariableShadowReadModelInput = Readonly<{
  artistId: string;
  variableId: string;
  throughSlotStart: string;
}>;

export async function getServerArtistProductVariableShadowReadModel(
  input: ServerArtistProductVariableShadowReadModelInput,
): Promise<ArtistProductVariableShadowReadModelResult> {
  return getArtistProductVariableShadowReadModel(
    {
      artistId: input.artistId,
      variableId: input.variableId,
    },
    {
      getLegacyResult: getArtistProductVariable,
      async getNewsIssuePointRealCandidateResult() {
        try {
          const repository =
            createPostgresNaverNewsCanonicalJobEvidenceReadRepository(
              getRuntimeDatabasePool(),
            );
          const series = await assembleOfficialNaverNewsShadowFirstSeenSeries(
            {
              canonicalArtistId: 'iu',
              throughSlotStart: input.throughSlotStart,
            },
            repository,
          );
          const methodology =
            evaluateNaverNewsIssuePointFrozenMethodology(series);
          return adaptNaverNewsIssuePointProductCandidate(methodology);
        } catch {
          return Object.freeze({ status: 'runtime-unavailable' as const });
        }
      },
    },
  );
}
