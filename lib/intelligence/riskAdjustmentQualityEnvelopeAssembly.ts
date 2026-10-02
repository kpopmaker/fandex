import {
  assembleRiskAdjustmentProductDependencies,
  type RiskAdjustmentProductDependencyAssembly,
} from './riskAdjustmentProductDependencyAssembly';
import {
  evaluateRiskAdjustmentUpstreamQualityEnvelope,
  type RiskAdjustmentUpstreamQualityEnvelope,
  type RiskAdjustmentUpstreamQualityEnvelopeAssessment,
} from './riskAdjustmentUpstreamQualityEnvelope';
import type {
  RiskAdjustmentUpstreamVariableId,
} from './riskAdjustmentPointConstruct';

export const RISK_ADJUSTMENT_QUALITY_ENVELOPE_ASSEMBLY_VERSION =
  'risk-adjustment-quality-envelope-assembly-v1' as const;

export type RiskAdjustmentQualityEnvelopeAssemblyEntry = Readonly<{
  variableId: RiskAdjustmentUpstreamVariableId;
  envelopeStatus: Exclude<
    RiskAdjustmentUpstreamQualityEnvelopeAssessment['status'],
    'invalid'
  >;
  consumed: boolean;
}>;

export type RiskAdjustmentQualityEnvelopeAssembly = Readonly<{
  contractVersion:
    typeof RISK_ADJUSTMENT_QUALITY_ENVELOPE_ASSEMBLY_VERSION;
  productDependencyAssembly: RiskAdjustmentProductDependencyAssembly;
  envelopes: readonly RiskAdjustmentQualityEnvelopeAssemblyEntry[];
}>;

export function assembleRiskAdjustmentFromQualityEnvelopes(input: Readonly<{
  artistId: string;
  envelopes: readonly RiskAdjustmentUpstreamQualityEnvelope[];
}>): RiskAdjustmentQualityEnvelopeAssembly {
  const variableIds = input.envelopes.map((envelope) => envelope.variableId);
  if (new Set(variableIds).size !== variableIds.length) {
    throw new Error('risk_adjustment_quality_envelope_duplicate');
  }

  const assessed = input.envelopes.map((envelope) => {
    const assessment =
      evaluateRiskAdjustmentUpstreamQualityEnvelope(envelope);

    if (assessment.status === 'invalid') {
      throw new Error(
        'risk_adjustment_quality_envelope_invalid:' + assessment.reason,
      );
    }

    return assessment;
  });

  const productDependencyAssembly =
    assembleRiskAdjustmentProductDependencies({
      artistId: input.artistId,
      dependencies: assessed.map((assessment) => ({
        handoff: assessment.handoff,
        projectedInput: assessment.input,
      })),
    });

  return Object.freeze({
    contractVersion:
      RISK_ADJUSTMENT_QUALITY_ENVELOPE_ASSEMBLY_VERSION,
    productDependencyAssembly,
    envelopes: Object.freeze(
      assessed
        .map((assessment) => Object.freeze({
          variableId: assessment.handoff.variableId,
          envelopeStatus: assessment.status,
          consumed: assessment.handoff.acceptedForRiskConsumption,
        }))
        .sort((left, right) =>
          left.variableId.localeCompare(right.variableId)
        ),
    ),
  });
}
