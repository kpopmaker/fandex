import type {
  FandexVariableDefinitionV1,
} from '../../intelligence/variableRegistry';
import type {
  NewsIssuePointRealPromotionControlResult,
} from '../promotion/newsIssuePointRealProductPromotionAuthorization';
import type {
  NewsIssuePointRealProductReadModelResult,
} from '../readModels/newsIssuePointRealProductReadModel';

export const NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_GATE_CONTRACT_VERSION =
  'v1_news_issue_point_real_product_activation_gate' as const;

export type NewsIssuePointRealProductActivationBlockedReason =
  | 'promotion-control-not-authorized'
  | 'promotion-disabled'
  | 'promotion-control-data-issue'
  | 'real-read-model-not-ready'
  | 'authorization-read-model-mismatch'
  | 'registry-variable-mismatch'
  | 'registry-read-model-binding-pending'
  | 'registry-promotion-not-authorized'
  | 'registry-state-invalid';

export type NewsIssuePointRealProductActivationGateResult =
  | Readonly<{
      contractVersion:
        typeof NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_GATE_CONTRACT_VERSION;
      status: 'eligible-for-activation-review';
      activationAuthorized: false;
      publicRouteActivated: false;
      productScorePublished: false;
      directProductionContributionEligible: false;
      strictPublicationIntervalClaimAllowed: false;
      requiredNextGate: 'explicit-production-activation-authorization';
      authorizationId: string;
    }>
  | Readonly<{
      contractVersion:
        typeof NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_GATE_CONTRACT_VERSION;
      status: 'blocked';
      activationAuthorized: false;
      publicRouteActivated: false;
      productScorePublished: false;
      directProductionContributionEligible: false;
      strictPublicationIntervalClaimAllowed: false;
      reason: NewsIssuePointRealProductActivationBlockedReason;
    }>;

function blocked(
  reason: NewsIssuePointRealProductActivationBlockedReason,
): NewsIssuePointRealProductActivationGateResult {
  return Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_GATE_CONTRACT_VERSION,
    status: 'blocked' as const,
    activationAuthorized: false as const,
    publicRouteActivated: false as const,
    productScorePublished: false as const,
    directProductionContributionEligible: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
    reason,
  });
}

export function evaluateNewsIssuePointRealProductActivationReadiness(
  input: Readonly<{
    control: NewsIssuePointRealPromotionControlResult;
    readModel: NewsIssuePointRealProductReadModelResult;
    registryDefinition: FandexVariableDefinitionV1 | null;
  }>,
): NewsIssuePointRealProductActivationGateResult {
  const { control, readModel, registryDefinition } = input;

  if (control.status === 'disabled') {
    return blocked('promotion-disabled');
  }

  if (control.status === 'data-issue') {
    return blocked('promotion-control-data-issue');
  }

  if (control.status !== 'authorized') {
    return blocked('promotion-control-not-authorized');
  }

  if (readModel.status !== 'ok') {
    return blocked('real-read-model-not-ready');
  }

  const model = readModel.model;
  const approval = control.authorization.approval;

  if (
    model.identity.artistId !== 'iu'
    || model.identity.variableId !== 'newsIssuePoint'
    || model.dataOrigin !== 'observed'
    || model.presentation !== 'standard'
    || model.sourcePublication !== 'shadow'
    || model.publicationTarget !== 'production'
    || model.activation !== 'inactive'
    || model.promotionAuthorized !== true
    || model.strictPublicationIntervalClaimAllowed !== false
    || model.authorization.authorizationId !== approval.authorizationId
    || model.authorization.authorizedAt !== approval.authorizedAt
    || model.authorization.authority !== approval.authority
  ) {
    return blocked('authorization-read-model-mismatch');
  }

  if (
    registryDefinition === null
    || registryDefinition.variableId !== 'newsIssuePoint'
    || registryDefinition.kind !== 'canonical'
    || registryDefinition.family !== 'media'
    || registryDefinition.measureType !== 'index'
    || registryDefinition.role !== 'primary'
  ) {
    return blocked('registry-variable-mismatch');
  }

  if (registryDefinition.blockers.includes('product-read-model-binding-pending')) {
    return blocked('registry-read-model-binding-pending');
  }

  if (registryDefinition.blockers.includes('production-promotion-not-authorized')) {
    return blocked('registry-promotion-not-authorized');
  }

  if (
    registryDefinition.blockers.length !== 1
    || registryDefinition.blockers[0] !== 'production-activation-not-authorized'
  ) {
    return blocked('registry-state-invalid');
  }

  if (
    registryDefinition.lifecycle !== 'shadow'
    || registryDefinition.directProductionContributionEligible !== false
  ) {
    return blocked('registry-state-invalid');
  }

  if (
    control.publicRouteActivated !== false
    || control.directProductionContributionEligible !== false
    || control.productScorePublished !== false
    || control.lifecycleState !== 'shadow'
  ) {
    return blocked('registry-state-invalid');
  }

  return Object.freeze({
    contractVersion:
      NEWS_ISSUE_POINT_REAL_PRODUCT_ACTIVATION_GATE_CONTRACT_VERSION,
    status: 'eligible-for-activation-review' as const,
    activationAuthorized: false as const,
    publicRouteActivated: false as const,
    productScorePublished: false as const,
    directProductionContributionEligible: false as const,
    strictPublicationIntervalClaimAllowed: false as const,
    requiredNextGate:
      'explicit-production-activation-authorization' as const,
    authorizationId: approval.authorizationId,
  });
}
