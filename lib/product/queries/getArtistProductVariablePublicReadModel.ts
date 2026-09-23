import type {
  ProductVariableReadModel,
  ProductVariableReadModelResult,
} from '../contracts/productVariable';
import type {
  NewsIssuePointPublicRouteCutoverAuthorizationResult,
} from '../activation/newsIssuePointPublicRouteCutoverAuthorization';
import {
  NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL,
} from '../activation/newsIssuePointRealProductActivationApproval';
import {
  validateProductVariableId,
} from '../variables/productVariableDefinitions';
import {
  getArtistProductVariable,
} from './getArtistProductVariable';

export type ArtistProductVariablePublicReadInput = Readonly<{
  artistId: string;
  variableId: string;
  throughSlotStart: string | null;
}>;

export type ProductVariablePublicReadRuntime = Readonly<{
  cutoverAuthorization:
    NewsIssuePointPublicRouteCutoverAuthorizationResult;
  readRealProductVariable: (input: Readonly<{
    throughSlotStart: string;
  }>) => Promise<ProductVariableReadModelResult>;
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
  sourceTimeLabel: string | null,
  reason:
    | 'public-route-cutover-not-authorized'
    | 'public-route-cutover-data-issue'
    | 'public-route-real-read-invalid',
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
      sourceTimeLabel,
    }),
  });
}

function cutoverAuthorizationMatchesApprovedActivation(
  authorization: NewsIssuePointPublicRouteCutoverAuthorizationResult,
): authorization is Extract<
  NewsIssuePointPublicRouteCutoverAuthorizationResult,
  { status: 'authorized-for-route-cutover' }
> {
  if (authorization.status !== 'authorized-for-route-cutover') {
    return false;
  }

  const approval = authorization.approval;
  const activationApproval =
    NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_APPROVAL;

  return (
    authorization.activationAuthorized === true
    && authorization.cutoverAuthorized === true
    && authorization.publicRouteActivated === false
    && authorization.productScorePublished === false
    && authorization.directProductionContributionEligible === false
    && authorization.strictPublicationIntervalClaimAllowed === false
    && authorization.lifecycleState === 'shadow'
    && authorization.requiredNextGate
      === 'explicit-public-route-cutover-execution'
    && approval.target.artistId === 'iu'
    && approval.target.variableId === 'newsIssuePoint'
    && approval.binding.activationAuthorizationId
      === activationApproval.activationAuthorizationId
    && approval.binding.activationApprovalContractVersion
      === activationApproval.contractVersion
    && approval.binding.methodologyVersion
      === activationApproval.binding.methodologyVersion
    && approval.binding.protocolStart
      === activationApproval.binding.protocolStart
    && approval.binding.selectedWindowSlotCount
      === activationApproval.binding.selectedWindowSlotCount
    && approval.binding.normalizationType
      === activationApproval.binding.normalizationType
    && approval.binding.claimScope
      === activationApproval.binding.claimScope
  );
}

function realReadMatchesCutover(
  model: ProductVariableReadModel,
  authorization: Extract<
    NewsIssuePointPublicRouteCutoverAuthorizationResult,
    { status: 'authorized-for-route-cutover' }
  >,
  throughSlotStart: string,
): boolean {
  const metadata = model.sourceMetadata;
  const trace = model.evidenceTrace;
  const relation = model.definition.evidenceRelation;
  const binding = authorization.approval.binding;

  if (
    model.identity.sourceArtistId !== 'iu'
    || model.identity.variableId !== 'newsIssuePoint'
    || model.identity.sourceVariableKey !== 'newsIssuePoint'
    || model.dataOrigin !== 'observed'
    || model.presentation !== 'standard'
    || model.publication !== 'shadow'
    || relation.kind !== 'stored-evidence-job-trace'
    || relation.sourceMetric !== 'naverNewsShadowFirstSeenActivity'
    || metadata.sourceKind
      !== 'naver-news-issue-point-frozen-methodology'
    || metadata.sourceArtistId !== 'iu'
    || metadata.sourceVariableKey !== 'newsIssuePoint'
    || metadata.methodologyVersion !== binding.methodologyVersion
    || metadata.officialShadowEpoch !== binding.protocolStart
    || metadata.throughSlotStart !== throughSlotStart
    || metadata.selectedWindowSlotCount
      !== binding.selectedWindowSlotCount
    || metadata.normalizationType !== binding.normalizationType
    || trace.kind !== 'naver-news-issue-point-stored-evidence'
    || trace.methodologyVersion !== metadata.methodologyVersion
    || trace.officialShadowEpoch !== metadata.officialShadowEpoch
    || trace.throughSlotStart !== metadata.throughSlotStart
    || trace.storedEvidenceJobIds.length === 0
  ) {
    return false;
  }

  if (model.fact.availability === 'available') {
    return (
      trace.currentWindow !== null
      && model.observationTime.kind === 'period'
      && model.observationTime.start === trace.currentWindow.startSlotStart
      && model.observationTime.end === trace.currentWindow.endSlotStart
    );
  }

  return model.fact.availability === 'unavailable';
}

function productionProjection(
  model: ProductVariableReadModel,
): ProductVariableReadModelResult {
  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      ...model,
      publication: 'production' as const,
    }),
  });
}

export async function getArtistProductVariablePublicReadModel(
  input: ArtistProductVariablePublicReadInput,
  runtime: ProductVariablePublicReadRuntime,
): Promise<ProductVariableReadModelResult> {
  const artistId = input.artistId.trim();
  const identity = validateProductVariableId(input.variableId);
  const legacyResult = (
    runtime.readLegacyProductVariable ?? getArtistProductVariable
  )({
    artistId,
    variableId: input.variableId,
  });

  if (
    identity.status === 'invalid'
    || !targetScope(artistId, identity.variableId)
  ) {
    return legacyResult;
  }

  const authorization = runtime.cutoverAuthorization;
  if (authorization.status === 'data-issue') {
    return dataIssue(
      artistId,
      input.variableId,
      input.throughSlotStart,
      'public-route-cutover-data-issue',
    );
  }

  if (!cutoverAuthorizationMatchesApprovedActivation(authorization)) {
    return dataIssue(
      artistId,
      input.variableId,
      input.throughSlotStart,
      'public-route-cutover-not-authorized',
    );
  }

  if (input.throughSlotStart === null) {
    return dataIssue(
      artistId,
      input.variableId,
      null,
      'public-route-real-read-invalid',
    );
  }

  let realResult: ProductVariableReadModelResult;
  try {
    realResult = await runtime.readRealProductVariable({
      throughSlotStart: input.throughSlotStart,
    });
  } catch {
    return dataIssue(
      artistId,
      input.variableId,
      input.throughSlotStart,
      'public-route-real-read-invalid',
    );
  }

  if (
    realResult.status !== 'ok'
    || !realReadMatchesCutover(
      realResult.model,
      authorization,
      input.throughSlotStart,
    )
  ) {
    return dataIssue(
      artistId,
      input.variableId,
      input.throughSlotStart,
      'public-route-real-read-invalid',
    );
  }

  return productionProjection(realResult.model);
}
