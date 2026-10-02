import {
  deriveRiskAdjustmentCategoricalStates,
  type RiskAdjustmentCategoricalStateAssessment,
} from './riskAdjustmentCategoricalStates';
import {
  deriveRiskAdjustmentAssessment,
  RISK_ADJUSTMENT_POINT_CONSTRUCT,
  type RiskAdjustmentAssessment,
  type RiskAdjustmentUpstreamInput,
} from './riskAdjustmentPointConstruct';

export const RISK_ADJUSTMENT_PRODUCT_CONTRACT_CANDIDATE_VERSION =
  'risk-adjustment-product-contract-candidate-v1' as const;

export type RiskAdjustmentProductReadinessState =
  | 'dependency-blocked'
  | 'insufficient-data'
  | 'categorical-contract-ready';

export type RiskAdjustmentProductContractCandidate = Readonly<{
  contractVersion:
    typeof RISK_ADJUSTMENT_PRODUCT_CONTRACT_CANDIDATE_VERSION;
  identity: Readonly<{
    sourceArtistId: string;
    variableId: 'riskAdjustmentPoint';
  }>;
  constructId: typeof RISK_ADJUSTMENT_POINT_CONSTRUCT.constructId;
  productForm: 'categorical-adjustment-state';
  readinessState: RiskAdjustmentProductReadinessState;
  assessment: RiskAdjustmentAssessment;
  categoricalState: RiskAdjustmentCategoricalStateAssessment;
  numericEligible: false;
  score: null;
  penalty: null;
  weight: null;
  activationAuthorized: false;
  publicationAuthorized: false;
  publicRouteAuthorized: false;
}>;

function readinessState(
  assessment: RiskAdjustmentAssessment,
): RiskAdjustmentProductReadinessState {
  if (assessment.status === 'dependency_blocked') {
    return 'dependency-blocked';
  }
  if (assessment.status === 'insufficient_data') {
    return 'insufficient-data';
  }
  return 'categorical-contract-ready';
}

export function createRiskAdjustmentProductContractCandidate(input: Readonly<{
  artistId: string;
  inputs: readonly RiskAdjustmentUpstreamInput[];
}>): RiskAdjustmentProductContractCandidate {
  const artistId = input.artistId.trim();
  if (artistId === '') {
    throw new Error('risk_adjustment_product_artist_id_invalid');
  }

  const assessment = deriveRiskAdjustmentAssessment(input.inputs);
  const categoricalState =
    deriveRiskAdjustmentCategoricalStates(assessment);

  return Object.freeze({
    contractVersion: RISK_ADJUSTMENT_PRODUCT_CONTRACT_CANDIDATE_VERSION,
    identity: Object.freeze({
      sourceArtistId: artistId,
      variableId: 'riskAdjustmentPoint' as const,
    }),
    constructId: RISK_ADJUSTMENT_POINT_CONSTRUCT.constructId,
    productForm: 'categorical-adjustment-state' as const,
    readinessState: readinessState(assessment),
    assessment,
    categoricalState,
    numericEligible: false as const,
    score: null,
    penalty: null,
    weight: null,
    // Candidate construction is not authorization. Product Operations owns
    // activation/publication/public-route gates.
    activationAuthorized: false as const,
    publicationAuthorized: false as const,
    publicRouteAuthorized: false as const,
  });
}
