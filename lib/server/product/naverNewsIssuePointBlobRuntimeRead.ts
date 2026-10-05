import { getVercelOidcToken } from '@vercel/functions/oidc';

import {
  getArtistProductVariableRealReadModel,
  type ProductVariableRealReadRuntime,
} from '../../product/queries/getArtistProductVariableRealReadModel';
import {
  evaluateNaverNewsIssuePointFrozenMethodology,
} from '../ingestion/naverNewsIssuePointFrozenMethodology';
import {
  assembleOfficialNaverNewsShadowFirstSeenSeries,
} from '../ingestion/naverNewsShadowFirstSeenSeries';
import {
  resolveLatestOfficialNaverNewsShadowThroughSlotStart,
} from '../ingestion/naverNewsLatestOfficialShadowSlot';
import {
  createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository,
  createObjectStoreNaverNewsLatestOfficialShadowSlotRepository,
} from '../ingestion/naverNewsStoredEvidenceMirror';
import {
  createProductionNaverNewsBlobEvidenceReadStore,
} from '../ingestion/naverNewsBlobMirrorRuntime';
import type {
  ImmutableTextObjectStore,
} from '../storage/immutableTextObjectStore';

export const NAVER_NEWS_ISSUE_POINT_BLOB_RUNTIME_READ_VERSION =
  'naver-news-issue-point-blob-runtime-read-v1' as const;

export const FANDEX_PRODUCT_RUNTIME_ENV =
  'FANDEX_PRODUCT_RUNTIME_ENV' as const;

function isProductionRuntime(
  environment: Readonly<Record<string, string | undefined>>,
): boolean {
  return (
    environment[FANDEX_PRODUCT_RUNTIME_ENV]?.trim() === 'production'
    || environment.VERCEL_ENV?.trim() === 'production'
  );
}

type ReadOnlyStore = Pick<
  ImmutableTextObjectStore,
  'readText' | 'listPathnames'
>;

export type NaverNewsIssuePointBlobRuntimeDependencies =
  Readonly<{
    createReadStore?: (
      environment: Readonly<Record<string, string | undefined>>,
    ) => ReadOnlyStore;
    resolveOidcToken?: () =>
      string | undefined | Promise<string | undefined>;
  }>;

async function runtimeEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
  resolveOidcToken: () =>
    string | undefined | Promise<string | undefined>,
): Promise<Readonly<Record<string, string | undefined>>> {
  if (environment.BLOB_READ_WRITE_TOKEN?.trim()) {
    return environment;
  }

  const storeId =
    environment.FANDEX_NAVER_EVIDENCE_BLOB_STORE_ID?.trim()
    || environment.BLOB_STORE_ID?.trim();
  if (!storeId) {
    throw new Error('naver_news_blob_runtime_store_missing');
  }

  const existingOidc = environment.VERCEL_OIDC_TOKEN?.trim();
  if (existingOidc) {
    return Object.freeze({
      ...environment,
      BLOB_STORE_ID: storeId,
      VERCEL_OIDC_TOKEN: existingOidc,
    });
  }

  const oidcToken = (await resolveOidcToken())?.trim();
  if (!oidcToken) {
    throw new Error('naver_news_blob_runtime_oidc_missing');
  }

  return Object.freeze({
    ...environment,
    BLOB_STORE_ID: storeId,
    VERCEL_OIDC_TOKEN: oidcToken,
  });
}

function runtime(store: ReadOnlyStore): ProductVariableRealReadRuntime {
  return Object.freeze({
    async readNewsIssuePointFrozenMethodology(input) {
      const repository =
        createObjectStoreNaverNewsCanonicalJobEvidenceReadRepository(
          store,
        );
      const series =
        await assembleOfficialNaverNewsShadowFirstSeenSeries(
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

export async function getNaverNewsIssuePointBlobProductVariableAtLatestOfficialSlot(
  environment: Readonly<Record<string, string | undefined>> =
    process.env,
  dependencies: NaverNewsIssuePointBlobRuntimeDependencies = {},
) {
  if (!isProductionRuntime(environment)) {
    return getArtistProductVariableRealReadModel(
      {
        artistId: 'iu',
        variableId: 'newsIssuePoint',
        throughSlotStart: null,
      },
      Object.freeze({
        async readNewsIssuePointFrozenMethodology() {
          throw new Error(
            'naver_news_blob_runtime_not_production',
          );
        },
      }),
    );
  }

  let store: ReadOnlyStore;
  try {
    const resolvedEnvironment = await runtimeEnvironment(
      environment,
      dependencies.resolveOidcToken
        ?? (() => getVercelOidcToken()),
    );
    store = (
      dependencies.createReadStore
      ?? createProductionNaverNewsBlobEvidenceReadStore
    )(resolvedEnvironment);
  } catch {
    return getArtistProductVariableRealReadModel(
      {
        artistId: 'iu',
        variableId: 'newsIssuePoint',
        throughSlotStart: null,
      },
      Object.freeze({
        async readNewsIssuePointFrozenMethodology() {
          throw new Error(
            'naver_news_blob_runtime_unavailable',
          );
        },
      }),
    );
  }

  const latestRepository =
    createObjectStoreNaverNewsLatestOfficialShadowSlotRepository(
      store,
    );
  const latest =
    await resolveLatestOfficialNaverNewsShadowThroughSlotStart(
      latestRepository,
    );
  const throughSlotStart =
    latest.status === 'ok' ? latest.throughSlotStart : null;

  return getArtistProductVariableRealReadModel(
    {
      artistId: 'iu',
      variableId: 'newsIssuePoint',
      throughSlotStart,
    },
    runtime(store),
  );
}
