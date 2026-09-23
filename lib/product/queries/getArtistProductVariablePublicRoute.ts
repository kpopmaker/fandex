import {
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL,
} from '../activation/newsIssuePointPublicRouteCutoverApproval';
import {
  NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION,
} from '../activation/newsIssuePointPublicRouteCutoverExecution';
import type {
  ProductVariableReadModelResult,
} from '../contracts/productVariable';
import {
  validateProductVariableId,
} from '../variables/productVariableDefinitions';
import {
  getArtistProductVariable,
} from './getArtistProductVariable';

export type ProductVariablePublicRouteRuntime = Readonly<{
  readNewsIssuePointReal: () => Promise<ProductVariableReadModelResult>;
  readLegacyProductVariable?: (
    input: Readonly<{ artistId: string; variableId: string }>,
  ) => ProductVariableReadModelResult;
}>;

function targetScope(artistId: string, variableId: string): boolean {
  return artistId === 'iu' && variableId === 'newsIssuePoint';
}

function dataIssue(
  artistId: string,
  rawVariableId: string,
  reason: 'runtime-read-failed' | 'selector-data-issue',
): ProductVariableReadModelResult {
  return Object.freeze({
    status: 'data-issue' as const,
    issues: Object.freeze([
      Object.freeze({
        code: 'real-source-data-issue' as const,
        reason,
      }),
    ]),
    sourceMetadata: Object.freeze({
      sourceArtistId: artistId,
      rawVariableId,
      sourceTimeLabel: null,
    }),
  });
}

function executionBindingValid(): boolean {
  const execution = NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_EXECUTION;
  const approval = NEWS_ISSUE_POINT_PUBLIC_ROUTE_CUTOVER_APPROVAL;

  return (
    execution.action === 'execute-public-route-cutover'
    && execution.authority === 'product-operations-owner'
    && execution.target.artistId === 'iu'
    && execution.target.variableId === 'newsIssuePoint'
    && execution.binding.cutoverAuthorizationId
      === approval.cutoverAuthorizationId
    && execution.binding.cutoverApprovalContractVersion
      === approval.contractVersion
    && execution.binding.activationAuthorizationId
      === approval.binding.activationAuthorizationId
    && execution.binding.methodologyVersion
      === approval.binding.methodologyVersion
    && execution.binding.protocolStart
      === approval.binding.protocolStart
    && execution.binding.selectedWindowSlotCount === 8
    && execution.binding.normalizationType
      === 'HISTORICAL_STRICT_EXCEEDANCE_SHARE'
    && execution.binding.claimScope
      === 'protocol-conditioned-first-seen-only'
    && execution.decision.activationAuthorized === true
    && execution.decision.cutoverAuthorized === true
    && execution.decision.publicRouteActivated === true
    && execution.decision.productScorePublished === true
    && execution.decision.directProductionContributionEligible === true
    && execution.decision.strictPublicationIntervalClaimAllowed === false
    && execution.decision.lifecycleState === 'production'
  );
}

export async function getArtistProductVariablePublicRoute(
  input: Readonly<{ artistId: string; variableId: string }>,
  runtime: ProductVariablePublicRouteRuntime,
): Promise<ProductVariableReadModelResult> {
  const artistId = input.artistId.trim();
  const identity = validateProductVariableId(input.variableId);
  const readLegacy =
    runtime.readLegacyProductVariable ?? getArtistProductVariable;

  if (
    identity.status === 'invalid'
    || !targetScope(artistId, identity.variableId)
  ) {
    return readLegacy({
      artistId,
      variableId: input.variableId,
    });
  }

  if (!executionBindingValid()) {
    return dataIssue(
      artistId,
      input.variableId,
      'selector-data-issue',
    );
  }

  let realResult: ProductVariableReadModelResult;
  try {
    realResult = await runtime.readNewsIssuePointReal();
  } catch {
    return dataIssue(
      artistId,
      input.variableId,
      'runtime-read-failed',
    );
  }

  if (realResult.status !== 'ok') {
    return realResult;
  }

  const model = realResult.model;
  if (
    model.identity.sourceArtistId !== 'iu'
    || model.identity.variableId !== 'newsIssuePoint'
    || model.identity.sourceVariableKey !== 'newsIssuePoint'
    || model.dataOrigin !== 'observed'
    || model.presentation !== 'standard'
    || model.publication !== 'shadow'
    || model.sourceMetadata.sourceKind
      !== 'naver-news-issue-point-frozen-methodology'
    || model.sourceMetadata.sourceArtistId !== 'iu'
    || model.sourceMetadata.sourceVariableKey !== 'newsIssuePoint'
    || model.evidenceTrace.kind
      !== 'naver-news-issue-point-stored-evidence'
  ) {
    return dataIssue(
      artistId,
      input.variableId,
      'selector-data-issue',
    );
  }

  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      ...model,
      publication: 'production' as const,
    }),
  });
}
