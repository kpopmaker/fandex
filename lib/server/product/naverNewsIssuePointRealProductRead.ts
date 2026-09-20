import 'server-only';

import {
  getArtistProductVariableRealReadModel,
  type ProductVariableRealReadRuntime,
} from '../../product/queries/getArtistProductVariableRealReadModel';
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

export type NaverNewsIssuePointRealProductReadInput = Readonly<{
  throughSlotStart: string;
}>;

function runtime(): ProductVariableRealReadRuntime {
  return Object.freeze({
    async readNewsIssuePointFrozenMethodology(input) {
      const repository =
        createPostgresNaverNewsCanonicalJobEvidenceReadRepository(
          getRuntimeDatabasePool(),
        );
      const series = await assembleOfficialNaverNewsShadowFirstSeenSeries(
        {
          canonicalArtistId: input.canonicalArtistId,
          throughSlotStart: input.throughSlotStart,
        },
        repository,
      );
      return evaluateNaverNewsIssuePointFrozenMethodology(series);
    },
  });
}

export async function getNaverNewsIssuePointRealProductVariable(
  input: NaverNewsIssuePointRealProductReadInput,
) {
  return getArtistProductVariableRealReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: input.throughSlotStart,
    },
    runtime(),
  );
}
