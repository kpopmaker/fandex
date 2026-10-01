import type {
  RiskAdjustmentUpstreamVariableId,
} from './riskAdjustmentPointConstruct';

export const RISK_ADJUSTMENT_UPSTREAM_INVENTORY_VERSION =
  'risk-adjustment-upstream-inventory-v1' as const;

export type RiskAdjustmentUpstreamRepositoryState =
  | 'main-production-public-route'
  | 'main-shadow-categorical'
  | 'draft-variable-candidate'
  | 'not-production';

export type RiskAdjustmentUpstreamReadinessState =
  | 'structurally-usable-runtime-conditional'
  | 'blocked-not-production';

export type RiskAdjustmentUpstreamInventoryEntry = Readonly<{
  variableId: RiskAdjustmentUpstreamVariableId;
  repositoryState: RiskAdjustmentUpstreamRepositoryState;
  readinessState: RiskAdjustmentUpstreamReadinessState;
  riskInputAllowed: boolean;
  productForm: 'numeric' | 'categorical' | 'unresolved';
  blockers: readonly string[];
  evidenceBasis: readonly string[];
}>;

export const RISK_ADJUSTMENT_REVIEWED_MAIN =
  'e8ad0ecab3731e2aed9ea54d7dea89519648865a' as const;

export const RISK_ADJUSTMENT_UPSTREAM_INVENTORY:
  readonly RiskAdjustmentUpstreamInventoryEntry[] = Object.freeze([
    Object.freeze({
      variableId: 'newsIssuePoint' as const,
      repositoryState: 'main-production-public-route' as const,
      readinessState:
        'structurally-usable-runtime-conditional' as const,
      riskInputAllowed: true,
      productForm: 'numeric' as const,
      blockers: Object.freeze([
        'required-quality-metadata-incomplete',
      ]),
      evidenceBasis: Object.freeze([
        'newsIssuePoint public-route cutover execution is Production',
        'runtime read must still return an observed Production Product model',
        'confidence/coverage/freshness/conflict/revision metadata are incomplete for Risk',
      ]),
    }),
    Object.freeze({
      variableId: 'comebackActivityPoint' as const,
      repositoryState: 'main-production-public-route' as const,
      readinessState:
        'structurally-usable-runtime-conditional' as const,
      riskInputAllowed: true,
      productForm: 'categorical' as const,
      blockers: Object.freeze([
        'required-quality-metadata-incomplete',
      ]),
      evidenceBasis: Object.freeze([
        'Activity Exposure public-route cutover execution is Production',
        'Product contract exposes provider coverage and categorical event lineage',
        'confidence/freshness/revision-stability/history-sufficiency metadata remain unresolved for Risk',
      ]),
    }),
    Object.freeze({
      variableId: 'growthMomentumPoint' as const,
      repositoryState: 'main-shadow-categorical' as const,
      readinessState: 'blocked-not-production' as const,
      riskInputAllowed: false,
      productForm: 'categorical' as const,
      blockers: Object.freeze([
        'upstream-not-production',
        'public-route-cutover-not-established',
      ]),
      evidenceBasis: Object.freeze([
        'Momentum Evidence Consensus remains shadow at the Product publication boundary',
        'numeric legacy growthMomentumPoint reuse is explicitly forbidden',
        'current NAVER recovery/epoch work does not itself authorize Product publication',
      ]),
    }),
    Object.freeze({
      variableId: 'musicAlbumPoint' as const,
      repositoryState: 'draft-variable-candidate' as const,
      readinessState: 'blocked-not-production' as const,
      riskInputAllowed: false,
      productForm: 'unresolved' as const,
      blockers: Object.freeze([
        'upstream-not-production',
        'album-production-rights-unresolved',
        'combined-product-contract-not-ready',
      ]),
      evidenceBasis: Object.freeze([
        'current-main musicAlbumPoint work remains Draft candidate only',
        'Album Production rights/history acquisition remains externally blocked',
        'Music and Album construct-level combination is not a Production Product truth',
      ]),
    }),
    Object.freeze({
      variableId: 'snsFandomPoint' as const,
      repositoryState: 'draft-variable-candidate' as const,
      readinessState: 'blocked-not-production' as const,
      riskInputAllowed: false,
      productForm: 'categorical' as const,
      blockers: Object.freeze([
        'upstream-not-production',
        'generic-rights-coverage-unresolved',
      ]),
      evidenceBasis: Object.freeze([
        'SNS public reaction and fandom persistence remain separate constructs',
        'current source rights and generic K-pop coverage are not Production-ready',
        'numeric snsFandomPoint remains ineligible',
      ]),
    }),
    Object.freeze({
      variableId: 'brandFitPoint' as const,
      repositoryState: 'draft-variable-candidate' as const,
      readinessState: 'blocked-not-production' as const,
      riskInputAllowed: false,
      productForm: 'categorical' as const,
      blockers: Object.freeze([
        'upstream-not-production',
        'live-production-collection-absent',
      ]),
      evidenceBasis: Object.freeze([
        'Brand Fit current candidate is categorical verified partnership evidence',
        'first live provider collection has not been authorized/executed',
        'numeric brandFitPoint remains ineligible',
      ]),
    }),
  ]);

export function getRiskAdjustmentUpstreamInventory(
  variableId: RiskAdjustmentUpstreamVariableId,
): RiskAdjustmentUpstreamInventoryEntry {
  const entry = RISK_ADJUSTMENT_UPSTREAM_INVENTORY.find(
    (candidate) => candidate.variableId === variableId,
  );
  if (!entry) {
    throw new Error('risk_adjustment_upstream_inventory_missing');
  }
  return entry;
}

export function listRiskAdjustmentUsableUpstreamVariables():
  readonly RiskAdjustmentUpstreamVariableId[] {
  return Object.freeze(
    RISK_ADJUSTMENT_UPSTREAM_INVENTORY
      .filter((entry) => entry.riskInputAllowed)
      .map((entry) => entry.variableId),
  );
}

export function listRiskAdjustmentBlockedUpstreamVariables():
  readonly RiskAdjustmentUpstreamVariableId[] {
  return Object.freeze(
    RISK_ADJUSTMENT_UPSTREAM_INVENTORY
      .filter((entry) => !entry.riskInputAllowed)
      .map((entry) => entry.variableId),
  );
}
