import type {
  NaverNewsIssuePointProductCandidateResult,
} from '../adapters/naverNewsIssuePointProductCandidateAdapter';
import type {
  ProductVariableReadModelResult,
} from '../contracts/productVariable';
import {
  getFandexVariableDefinition,
} from '../../intelligence/variableRegistry';
import {
  isNewsIssuePointRealProductTargetScope,
  selectNewsIssuePointRealProductSource,
  type NewsIssuePointRealSelectorResult,
} from '../selectors/newsIssuePointRealProductSelector';

export const ARTIST_PRODUCT_VARIABLE_SHADOW_READ_MODEL_CONTRACT_VERSION =
  'v1_artist_product_variable_shadow_read_model' as const;

export type ArtistProductVariableShadowReadModelInput = Readonly<{
  artistId: string;
  variableId: string;
}>;

export type ArtistProductVariableShadowReadModelRuntimeUnavailable = Readonly<{
  status: 'runtime-unavailable';
}>;

export type ArtistProductVariableShadowReadModelRuntime = Readonly<{
  getLegacyResult: (
    input: ArtistProductVariableShadowReadModelInput,
  ) => ProductVariableReadModelResult;
  getNewsIssuePointRealCandidateResult: (
    input: ArtistProductVariableShadowReadModelInput,
  ) =>
    | NaverNewsIssuePointProductCandidateResult
    | ArtistProductVariableShadowReadModelRuntimeUnavailable
    | Promise<
        | NaverNewsIssuePointProductCandidateResult
        | ArtistProductVariableShadowReadModelRuntimeUnavailable
      >;
}>;

export type ArtistProductVariableShadowReadModelIssue =
  | 'canonical-registry-mismatch'
  | 'real-runtime-unavailable';

export type ArtistProductVariableShadowReadModelResult =
  | NewsIssuePointRealSelectorResult
  | Readonly<{
      contractVersion:
        typeof ARTIST_PRODUCT_VARIABLE_SHADOW_READ_MODEL_CONTRACT_VERSION;
      selection: 'data-issue';
      targetScope: true;
      publishable: false;
      reason: ArtistProductVariableShadowReadModelIssue;
    }>;

function blocked(
  reason: ArtistProductVariableShadowReadModelIssue,
): ArtistProductVariableShadowReadModelResult {
  return Object.freeze({
    contractVersion: ARTIST_PRODUCT_VARIABLE_SHADOW_READ_MODEL_CONTRACT_VERSION,
    selection: 'data-issue' as const,
    targetScope: true as const,
    publishable: false as const,
    reason,
  });
}

function canonicalRegistryBindingIsSafe(): boolean {
  const definition = getFandexVariableDefinition('newsIssuePoint');

  return (
    definition !== null
    && definition.kind === 'canonical'
    && definition.family === 'media'
    && definition.measureType === 'index'
    && definition.role === 'primary'
    && definition.lifecycle === 'shadow'
    && definition.construct
      === 'protocol_conditioned_first_seen_canonical_media_activity'
    && definition.sourceProviderId === 'naver-news'
    && definition.supportedEntityTypes.includes('artist')
    && definition.directProductionContributionEligible === false
    && !definition.blockers.includes('product-read-model-binding-pending')
    && definition.blockers.includes('production-promotion-not-authorized')
  );
}

export async function getArtistProductVariableShadowReadModel(
  input: ArtistProductVariableShadowReadModelInput,
  runtime: ArtistProductVariableShadowReadModelRuntime,
): Promise<ArtistProductVariableShadowReadModelResult> {
  const artistId = input.artistId.trim();
  const variableId = input.variableId.trim();
  const legacyResult = runtime.getLegacyResult({ artistId, variableId });

  if (!isNewsIssuePointRealProductTargetScope(artistId, variableId)) {
    return Object.freeze({
      contractVersion: 'v1_news_issue_point_real_selector' as const,
      selection: 'legacy-preview' as const,
      targetScope: false as const,
      legacyResult,
    });
  }

  if (!canonicalRegistryBindingIsSafe()) {
    return blocked('canonical-registry-mismatch');
  }

  const realCandidateResult =
    await runtime.getNewsIssuePointRealCandidateResult({ artistId, variableId });

  if (realCandidateResult.status === 'runtime-unavailable') {
    return blocked('real-runtime-unavailable');
  }

  return selectNewsIssuePointRealProductSource({
    artistId,
    variableId,
    legacyResult,
    realCandidateResult,
  });
}
