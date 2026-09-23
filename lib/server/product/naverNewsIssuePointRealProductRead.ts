import 'server-only';

import {
  getArtistProductVariableRealReadModel,
  type ProductVariableRealReadRuntime,
} from '../../product/queries/getArtistProductVariableRealReadModel';
import {
  getArtistProductVariablePublicRoute,
} from '../../product/queries/getArtistProductVariablePublicRoute';
import {
  getArtistProductStoredEvidenceJob,
} from '../../product/queries/getArtistProductStoredEvidenceJob';
import {
  assembleNaverNewsCanonicalJobEvidence,
  createPostgresNaverNewsCanonicalJobEvidenceReadRepository,
} from '../ingestion/naverNewsCanonicalJobEvidence';
import {
  evaluateNaverNewsIssuePointFrozenMethodology,
} from '../ingestion/naverNewsIssuePointFrozenMethodology';
import {
  assembleOfficialNaverNewsShadowFirstSeenSeries,
} from '../ingestion/naverNewsShadowFirstSeenSeries';
import {
  createPostgresNaverNewsLatestOfficialShadowSlotRepository,
  resolveLatestOfficialNaverNewsShadowThroughSlotStart,
} from '../ingestion/naverNewsLatestOfficialShadowSlot';
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

async function latestOfficialThroughSlotStart(): Promise<string | null> {
  const repository =
    createPostgresNaverNewsLatestOfficialShadowSlotRepository(
      getRuntimeDatabasePool(),
    );
  const result =
    await resolveLatestOfficialNaverNewsShadowThroughSlotStart(repository);
  return result.status === 'ok' ? result.throughSlotStart : null;
}

export async function getNaverNewsIssuePointRealProductVariableAtLatestOfficialSlot() {
  return getArtistProductVariableRealReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart: await latestOfficialThroughSlotStart(),
    },
    runtime(),
  );
}

export async function getNaverNewsIssuePointPublicRouteVariable() {
  return getArtistProductVariablePublicRoute(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
    },
    Object.freeze({
      readNewsIssuePointReal:
        getNaverNewsIssuePointRealProductVariableAtLatestOfficialSlot,
    }),
  );
}


export type NaverNewsIssuePointRealProductStoredEvidenceInput = Readonly<{
  throughSlotStart: string;
  jobId: string;
}>;

export async function getNaverNewsIssuePointRealProductStoredEvidenceJob(
  input: NaverNewsIssuePointRealProductStoredEvidenceInput,
) {
  const variableResult = await getNaverNewsIssuePointRealProductVariable({
    throughSlotStart: input.throughSlotStart,
  });
  const repository =
    createPostgresNaverNewsCanonicalJobEvidenceReadRepository(
      getRuntimeDatabasePool(),
    );

  return getArtistProductStoredEvidenceJob(
    {
      variableResult,
      jobId: input.jobId,
    },
    Object.freeze({
      readCanonicalJobEvidence: (request) =>
        assembleNaverNewsCanonicalJobEvidence(request, repository),
    }),
  );
}

export async function getNaverNewsIssuePointRealProductStoredEvidenceJobAtLatestOfficialSlot(
  input: Readonly<{ jobId: string }>,
) {
  const throughSlotStart = await latestOfficialThroughSlotStart();
  const variableResult = throughSlotStart === null
    ? await getArtistProductVariableRealReadModel(
        {
          artistId: 'iu',
          variableId: 'newsIssuePoint',
          throughSlotStart: null,
        },
        runtime(),
      )
    : await getNaverNewsIssuePointRealProductVariable({ throughSlotStart });

  const repository =
    createPostgresNaverNewsCanonicalJobEvidenceReadRepository(
      getRuntimeDatabasePool(),
    );

  return getArtistProductStoredEvidenceJob(
    {
      variableResult,
      jobId: input.jobId,
    },
    Object.freeze({
      readCanonicalJobEvidence: (request) =>
        assembleNaverNewsCanonicalJobEvidence(request, repository),
    }),
  );
}
