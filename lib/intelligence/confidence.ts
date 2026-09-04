export const FANDEX_CONFIDENCE_CONTRACT_VERSION = 'fandex-confidence-v1' as const;
export const FANDEX_CONFIDENCE_POLICY = 'conservative-floor-v1' as const;

export const FANDEX_CONFIDENCE_STATES = Object.freeze(['high', 'moderate', 'low', 'insufficient'] as const);
export type FandexConfidenceState = typeof FANDEX_CONFIDENCE_STATES[number];

export const FANDEX_CONFIDENCE_DIMENSIONS = Object.freeze([
  'sourceQuality',
  'constructFit',
  'freshness',
  'coverage',
  'identityIntegrity',
  'conflictIntegrity',
  'lineageCompleteness',
] as const);
export type FandexConfidenceDimension = typeof FANDEX_CONFIDENCE_DIMENSIONS[number];

export const FANDEX_CONFIDENCE_SUBJECT_TYPES = Object.freeze([
  'evidence', 'variable', 'metric', 'component', 'index', 'claim',
] as const);
export type FandexConfidenceSubjectType = typeof FANDEX_CONFIDENCE_SUBJECT_TYPES[number];

export type FandexConfidenceDimensionsV1 = Readonly<Record<FandexConfidenceDimension, FandexConfidenceState>>;
export type FandexConfidenceAssessmentV1 = Readonly<{
  subject: Readonly<{ type: FandexConfidenceSubjectType; id: string }>;
  dimensions: FandexConfidenceDimensionsV1;
  state: FandexConfidenceState;
  evidenceRefs: readonly string[];
  limitations: readonly string[];
  confidencePolicy: typeof FANDEX_CONFIDENCE_POLICY;
  contractVersion: typeof FANDEX_CONFIDENCE_CONTRACT_VERSION;
}>;

const rank: Readonly<Record<FandexConfidenceState, number>> = Object.freeze({ high: 3, moderate: 2, low: 1, insufficient: 0 });
const isState = (value: unknown): value is FandexConfidenceState =>
  typeof value === 'string' && FANDEX_CONFIDENCE_STATES.includes(value as FandexConfidenceState);

const sortedUnique = (values: readonly string[], error: string): readonly string[] => {
  if (values.some((value) => typeof value !== 'string' || value.trim() === '')) throw new Error(error);
  return Object.freeze([...new Set(values)].sort((left, right) => left.localeCompare(right)));
};

export function deriveFandexConfidenceState(dimensions: FandexConfidenceDimensionsV1): FandexConfidenceState {
  let lowest: FandexConfidenceState = 'high';
  for (const dimension of FANDEX_CONFIDENCE_DIMENSIONS) {
    const value = dimensions[dimension];
    if (!isState(value)) throw new Error('fandex_confidence_dimension_state_invalid');
    if (rank[value] < rank[lowest]) lowest = value;
  }
  return lowest;
}

export function createFandexConfidenceAssessment(input: Readonly<{
  subject: Readonly<{ type: FandexConfidenceSubjectType; id: string }>;
  dimensions: Readonly<Partial<Record<FandexConfidenceDimension, FandexConfidenceState>>>;
  evidenceRefs?: readonly string[];
  limitations?: readonly string[];
  // Deliberately not accepted as an input: overall state is always derived.
}>): FandexConfidenceAssessmentV1 {
  if (!input.subject || !FANDEX_CONFIDENCE_SUBJECT_TYPES.includes(input.subject.type)) throw new Error('fandex_confidence_subject_type_invalid');
  if (typeof input.subject.id !== 'string' || input.subject.id.trim() === '') throw new Error('fandex_confidence_subject_id_invalid');
  const dimensions = {} as Record<FandexConfidenceDimension, FandexConfidenceState>;
  for (const dimension of FANDEX_CONFIDENCE_DIMENSIONS) {
    const value = input.dimensions?.[dimension];
    if (!isState(value)) throw new Error('fandex_confidence_dimension_required');
    dimensions[dimension] = value;
  }
  const evidenceRefs = sortedUnique(input.evidenceRefs ?? [], 'fandex_confidence_evidence_ref_invalid');
  const suppliedLimitations = sortedUnique(input.limitations ?? [], 'fandex_confidence_limitation_invalid');
  const state = deriveFandexConfidenceState(dimensions);
  const limitations = state === 'insufficient' && evidenceRefs.length === 0
    ? Object.freeze([...new Set([...suppliedLimitations, 'evidence-refs-missing'])].sort((a, b) => a.localeCompare(b)))
    : suppliedLimitations;
  return Object.freeze({
    subject: Object.freeze({ type: input.subject.type, id: input.subject.id }),
    dimensions: Object.freeze(dimensions),
    state,
    evidenceRefs,
    limitations,
    confidencePolicy: FANDEX_CONFIDENCE_POLICY,
    contractVersion: FANDEX_CONFIDENCE_CONTRACT_VERSION,
  });
}
