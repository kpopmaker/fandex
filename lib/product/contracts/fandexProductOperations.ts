import {
  FANDEX_PRODUCT_READ_MODEL_AUDIENCE,
  FANDEX_PRODUCT_READ_MODEL_CONTRACT_VERSION,
  type FandexProductReadModel,
} from './fandexProductReadModel';
import {
  FANDEX_VARIABLE_PRODUCT_IDS,
  type FandexVariableProductId,
} from './fandexVariableProduct';

export const FANDEX_PRODUCT_OPERATIONS_CONTRACT_VERSION =
  'fandex-product-operations-v1' as const;

export const FANDEX_PRODUCT_RIGHTS_STATES = Object.freeze([
  'unknown',
  'internal-only',
  'public-permitted',
  'restricted',
] as const);

export type FandexProductRightsState =
  typeof FANDEX_PRODUCT_RIGHTS_STATES[number];

export type FandexProductRightsClaim = Readonly<{
  variableId: FandexVariableProductId;
  state: FandexProductRightsState;
  basis: string;
  evidenceRefs?: readonly string[];
}>;

export type FandexProductVariableRights = Readonly<{
  variableId: FandexVariableProductId;
  state: FandexProductRightsState;
  basis: string;
  evidenceRefs: readonly string[];
}>;

export type FandexProductRightsMatrix = Readonly<{
  byVariable: Readonly<Record<
    FandexVariableProductId,
    FandexProductVariableRights
  >>;
  publicPublicationAllowed: boolean | null;
  unresolvedVariableIds: readonly FandexVariableProductId[];
  restrictedVariableIds: readonly FandexVariableProductId[];
}>;

export type FandexProductMonitoringIssueCode =
  | 'production-component-unavailable'
  | 'support-unknown'
  | 'unsupported'
  | 'missing'
  | 'blocked'
  | 'stale'
  | 'coverage-incomplete-or-unknown'
  | 'confidence-low-or-insufficient';

export type FandexProductMonitoringIssue = Readonly<{
  variableId: FandexVariableProductId;
  code: FandexProductMonitoringIssueCode;
}>;

export type FandexProductMonitoring = Readonly<{
  state: 'clear' | 'issues-present';
  issues: readonly FandexProductMonitoringIssue[];
}>;

export type FandexProductVariableVersionLineage = Readonly<{
  variableId: FandexVariableProductId;
  methodologyVersion: string;
  sourceVersion: string;
  productVersion: string;
}>;

export type FandexProductVersioning = Readonly<{
  readModelContractVersion: typeof FANDEX_PRODUCT_READ_MODEL_CONTRACT_VERSION;
  candidateContractVersion: string;
  explainabilityContractVersion: string;
  variableLineage: readonly FandexProductVariableVersionLineage[];
}>;

export type FandexProductOperations = Readonly<{
  contractVersion: typeof FANDEX_PRODUCT_OPERATIONS_CONTRACT_VERSION;
  audience: typeof FANDEX_PRODUCT_READ_MODEL_AUDIENCE;
  canonicalArtistId: string;
  generatedAt: string;
  monitoring: FandexProductMonitoring;
  rights: FandexProductRightsMatrix;
  versioning: FandexProductVersioning;
}>;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function orderedUniqueStrings(
  values: readonly string[],
  errorCode: string,
): readonly string[] {
  if (values.some((value) => !isNonEmptyString(value))) {
    throw new Error(errorCode);
  }

  return Object.freeze(
    [...new Set(values.map((value) => value.trim()))]
      .sort((left, right) => left.localeCompare(right)),
  );
}

function orderedVariableIds(
  ids: readonly FandexVariableProductId[],
): readonly FandexVariableProductId[] {
  const selected = new Set(ids);
  return Object.freeze(
    FANDEX_VARIABLE_PRODUCT_IDS.filter((variableId) =>
      selected.has(variableId)),
  );
}

function makeMonitoringIssues(
  model: FandexProductReadModel,
): readonly FandexProductMonitoringIssue[] {
  const byKey = new Map<string, FandexProductMonitoringIssue>();

  const add = (
    variableIds: readonly FandexVariableProductId[],
    code: FandexProductMonitoringIssueCode,
  ) => {
    for (const variableId of variableIds) {
      byKey.set(
        `${variableId}::${code}`,
        Object.freeze({ variableId, code }),
      );
    }
  };

  add(
    model.summary.productionUnavailableComponentIds,
    'production-component-unavailable',
  );
  add(model.summary.supportUnknownComponentIds, 'support-unknown');
  add(model.summary.unsupportedComponentIds, 'unsupported');
  add(model.summary.missingComponentIds, 'missing');
  add(model.summary.blockedComponentIds, 'blocked');
  add(model.summary.staleComponentIds, 'stale');
  add(
    model.summary.incompleteOrUnknownCoverageComponentIds,
    'coverage-incomplete-or-unknown',
  );
  add(
    model.summary.lowOrInsufficientConfidenceComponentIds,
    'confidence-low-or-insufficient',
  );

  const codeOrder: readonly FandexProductMonitoringIssueCode[] = [
    'production-component-unavailable',
    'support-unknown',
    'unsupported',
    'missing',
    'blocked',
    'stale',
    'coverage-incomplete-or-unknown',
    'confidence-low-or-insufficient',
  ];

  return Object.freeze(
    FANDEX_VARIABLE_PRODUCT_IDS.flatMap((variableId) =>
      codeOrder.flatMap((code) => {
        const issue = byKey.get(`${variableId}::${code}`);
        return issue ? [issue] : [];
      }),
    ),
  );
}

function makeRightsMatrix(
  claims: readonly FandexProductRightsClaim[],
): FandexProductRightsMatrix {
  const claimsByVariable = new Map<
    FandexVariableProductId,
    FandexProductRightsClaim
  >();

  for (const claim of claims) {
    if (!FANDEX_VARIABLE_PRODUCT_IDS.includes(claim.variableId)) {
      throw new Error('fandex_product_rights_variable_invalid');
    }
    if (!FANDEX_PRODUCT_RIGHTS_STATES.includes(claim.state)) {
      throw new Error('fandex_product_rights_state_invalid');
    }
    if (!isNonEmptyString(claim.basis)) {
      throw new Error('fandex_product_rights_basis_required');
    }
    if (claimsByVariable.has(claim.variableId)) {
      throw new Error(
        `fandex_product_rights_duplicate_claim:${claim.variableId}`,
      );
    }
    orderedUniqueStrings(
      claim.evidenceRefs ?? [],
      'fandex_product_rights_evidence_ref_invalid',
    );
    claimsByVariable.set(claim.variableId, claim);
  }

  const entries = FANDEX_VARIABLE_PRODUCT_IDS.map((variableId) => {
    const claim = claimsByVariable.get(variableId);
    const rights: FandexProductVariableRights = claim
      ? Object.freeze({
          variableId,
          state: claim.state,
          basis: claim.basis.trim(),
          evidenceRefs: orderedUniqueStrings(
            claim.evidenceRefs ?? [],
            'fandex_product_rights_evidence_ref_invalid',
          ),
        })
      : Object.freeze({
          variableId,
          state: 'unknown' as const,
          basis: 'rights-not-established',
          evidenceRefs: Object.freeze([]),
        });

    return [variableId, rights] as const;
  });

  const byVariable = Object.freeze(
    Object.fromEntries(entries),
  ) as Readonly<Record<
    FandexVariableProductId,
    FandexProductVariableRights
  >>;

  const unresolvedVariableIds = orderedVariableIds(
    FANDEX_VARIABLE_PRODUCT_IDS.filter(
      (variableId) => byVariable[variableId].state === 'unknown',
    ),
  );
  const restrictedVariableIds = orderedVariableIds(
    FANDEX_VARIABLE_PRODUCT_IDS.filter((variableId) => {
      const state = byVariable[variableId].state;
      return state === 'internal-only' || state === 'restricted';
    }),
  );

  const publicPublicationAllowed =
    restrictedVariableIds.length > 0
      ? false
      : unresolvedVariableIds.length > 0
        ? null
        : true;

  return Object.freeze({
    byVariable,
    publicPublicationAllowed,
    unresolvedVariableIds,
    restrictedVariableIds,
  });
}

export function createFandexProductOperations(input: Readonly<{
  model: FandexProductReadModel;
  rightsClaims?: readonly FandexProductRightsClaim[];
}>): FandexProductOperations {
  if (
    input.model.contractVersion
      !== FANDEX_PRODUCT_READ_MODEL_CONTRACT_VERSION
    || input.model.audience !== FANDEX_PRODUCT_READ_MODEL_AUDIENCE
  ) {
    throw new Error('fandex_product_operations_read_model_invalid');
  }

  const canonicalArtistId = input.model.canonicalArtistId.trim();
  if (!canonicalArtistId) {
    throw new Error('fandex_product_operations_artist_id_invalid');
  }

  const generatedAt = input.model.generatedTime.generatedAt.trim();
  if (!generatedAt) {
    throw new Error('fandex_product_operations_generated_at_invalid');
  }

  if (
    input.model.fandexValue !== null
    || input.model.fandexCandidateEligible !== null
    || input.model.methodologyVersion !== null
  ) {
    throw new Error('fandex_product_operations_methodology_boundary_invalid');
  }

  const monitoringIssues = makeMonitoringIssues(input.model);

  const variableLineage = Object.freeze(
    FANDEX_VARIABLE_PRODUCT_IDS.map(
      (variableId): FandexProductVariableVersionLineage => {
        const component = input.model.byVariable[variableId];
        if (!component || component.variableId !== variableId) {
          throw new Error(
            `fandex_product_operations_component_missing:${variableId}`,
          );
        }
        if (
          !isNonEmptyString(component.versions.methodologyVersion)
          || !isNonEmptyString(component.versions.sourceVersion)
          || !isNonEmptyString(component.versions.productVersion)
        ) {
          throw new Error(
            `fandex_product_operations_version_invalid:${variableId}`,
          );
        }

        return Object.freeze({
          variableId,
          methodologyVersion: component.versions.methodologyVersion,
          sourceVersion: component.versions.sourceVersion,
          productVersion: component.versions.productVersion,
        });
      },
    ),
  );

  return Object.freeze({
    contractVersion: FANDEX_PRODUCT_OPERATIONS_CONTRACT_VERSION,
    audience: FANDEX_PRODUCT_READ_MODEL_AUDIENCE,
    canonicalArtistId,
    generatedAt,
    monitoring: Object.freeze({
      state: monitoringIssues.length === 0
        ? 'clear' as const
        : 'issues-present' as const,
      issues: monitoringIssues,
    }),
    rights: makeRightsMatrix(input.rightsClaims ?? []),
    versioning: Object.freeze({
      readModelContractVersion: FANDEX_PRODUCT_READ_MODEL_CONTRACT_VERSION,
      candidateContractVersion: input.model.sourceContracts.candidate,
      explainabilityContractVersion:
        input.model.sourceContracts.explainability,
      variableLineage,
    }),
  });
}
