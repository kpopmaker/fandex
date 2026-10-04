import type {
  FandexCurrentRuntimeAssemblyReadiness,
} from '../runtime/fandexCurrentRuntimeAssemblyReadiness';
import type {
  FandexVariableProductId,
  FandexVariableProductRecord,
} from '../contracts/fandexVariableProduct';

export const FANDEX_BETA_ARTIST_PRESENTATION_VERSION =
  'fandex-beta-artist-presentation-v1' as const;

export const FANDEX_BETA_VARIABLE_LABELS: Readonly<
  Record<FandexVariableProductId, string>
> = Object.freeze({
  musicAlbumPoint: '음원/음반',
  newsIssuePoint: '뉴스/이슈',
  snsFandomPoint: 'SNS/팬덤',
  brandFitPoint: '브랜드 적합도',
  comebackActivityPoint: '컴백/활동',
  growthMomentumPoint: '성장 모멘텀',
  riskAdjustmentPoint: '데이터 품질 조정',
});

export type FandexBetaArtistComponentPresentation = Readonly<{
  variableId: FandexVariableProductId;
  label: string;
  sourceState:
    | 'resolved'
    | 'data-issue'
    | 'runtime-source-unavailable'
    | 'derived';
  adapterState: 'ok' | 'blocked' | 'not-run';
  statusReason: string | null;
  lifecycleState: FandexVariableProductRecord['lifecycleState'] | null;
  materialClass: FandexVariableProductRecord['materialClass'] | null;
  readinessState: FandexVariableProductRecord['readinessState'] | null;
  availability: FandexVariableProductRecord['availability'] | null;
  confidence: FandexVariableProductRecord['confidence'] | null;
  coverage: FandexVariableProductRecord['coverage'] | null;
  freshness: FandexVariableProductRecord['freshness'] | null;
  asOf: string | null;
  displayValue: string;
  evidenceCount: number;
}>;

export type FandexBetaArtistPresentation = Readonly<{
  contractVersion: typeof FANDEX_BETA_ARTIST_PRESENTATION_VERSION;
  canonicalArtistId: string;
  generatedAt: string;
  runtimeStatus: FandexCurrentRuntimeAssemblyReadiness['status'];
  resolvedVariableCount: number;
  blockedVariableCount: number;
  productionVariableCount: number;
  totalVariableCount: number;
  fandexValue: null;
  ranking: null;
  scoreStatus: 'not-defined';
  methodologyFinalized: false;
  components: readonly FandexBetaArtistComponentPresentation[];
}>;

function recordValueText(record: FandexVariableProductRecord): string {
  const representation = record.valueRepresentation;

  if (representation.kind === 'numeric') {
    if (representation.value === null) {
      return '값 없음';
    }

    const value = new Intl.NumberFormat('ko-KR', {
      maximumFractionDigits: 2,
    }).format(representation.value);

    return representation.unit
      ? `${value} ${representation.unit}`
      : value;
  }

  if (
    representation.kind === 'categorical'
    || representation.kind === 'event'
    || representation.kind === 'quality'
  ) {
    return representation.state ?? '상태 없음';
  }

  return representation.reason;
}

export function createFandexBetaArtistPresentation(input: Readonly<{
  readiness: FandexCurrentRuntimeAssemblyReadiness;
  generatedAt: string;
}>): FandexBetaArtistPresentation {
  const recordByVariable = new Map(
    input.readiness.records.map((record) => [record.variableId, record] as const),
  );

  const components = input.readiness.variableStates.map((state) => {
    const record = recordByVariable.get(state.variableId) ?? null;

    return Object.freeze({
      variableId: state.variableId,
      label: FANDEX_BETA_VARIABLE_LABELS[state.variableId],
      sourceState: state.sourceState,
      adapterState: state.adapterState,
      statusReason:
        state.reason
        ?? record?.blockerReason
        ?? record?.missingReason
        ?? record?.unsupportedReason
        ?? null,
      lifecycleState: record?.lifecycleState ?? null,
      materialClass: record?.materialClass ?? null,
      readinessState: record?.readinessState ?? null,
      availability: record?.availability ?? null,
      confidence: record?.confidence ?? null,
      coverage: record?.coverage ?? null,
      freshness: record?.freshness ?? null,
      asOf: record?.asOf ?? null,
      displayValue: record ? recordValueText(record) : '런타임 확인 필요',
      evidenceCount: record?.evidenceRefs.length ?? 0,
    });
  });

  const productionVariableCount = components.filter(
    (component) =>
      component.lifecycleState === 'production'
      && component.materialClass === 'real'
      && component.readinessState === 'production',
  ).length;

  return Object.freeze({
    contractVersion: FANDEX_BETA_ARTIST_PRESENTATION_VERSION,
    canonicalArtistId: input.readiness.canonicalArtistId,
    generatedAt: input.generatedAt,
    runtimeStatus: input.readiness.status,
    resolvedVariableCount: input.readiness.resolvedVariableIds.length,
    blockedVariableCount: input.readiness.blockedVariableIds.length,
    productionVariableCount,
    totalVariableCount: components.length,
    fandexValue: null,
    ranking: null,
    scoreStatus: 'not-defined' as const,
    methodologyFinalized: false as const,
    components: Object.freeze(components),
  });
}
