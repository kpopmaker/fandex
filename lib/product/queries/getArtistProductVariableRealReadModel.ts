import {
  adaptNaverNewsIssuePointProductCandidate,
} from '../adapters/naverNewsIssuePointProductCandidateAdapter';
import type {
  ProductVariableReadModel,
  ProductVariableReadModelResult,
  ProductVariableStoredEvidenceWindowTrace,
} from '../contracts/productVariable';
import {
  selectNewsIssuePointRealProductSource,
} from '../selectors/newsIssuePointRealProductSelector';
import {
  PRODUCT_VARIABLE_DEFINITION_BY_ID,
  validateProductVariableId,
} from '../variables/productVariableDefinitions';
import type {
  NaverNewsIssuePointFrozenMethodologyResult,
  NaverNewsIssuePointWindowEvidence,
} from '../../server/ingestion/naverNewsIssuePointFrozenMethodology';
import {
  getArtistProductVariable,
} from './getArtistProductVariable';

export type ArtistProductVariableRealReadInput = Readonly<{
  artistId: string;
  variableId: string;
  throughSlotStart: string | null;
}>;

export type ProductVariableRealReadRuntime = Readonly<{
  readNewsIssuePointFrozenMethodology: (input: Readonly<{
    canonicalArtistId: 'iu';
    throughSlotStart: string;
  }>) => Promise<NaverNewsIssuePointFrozenMethodologyResult>;
  readLegacyProductVariable?: (
    input: Readonly<{ artistId: string; variableId: string }>,
  ) => ProductVariableReadModelResult;
}>;

function dataIssue(
  artistId: string,
  rawVariableId: string,
  sourceTimeLabel: string | null,
  reason: 'runtime-read-failed' | 'selector-data-issue' | 'methodology-candidate-mismatch',
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

function targetScope(artistId: string, variableId: string): boolean {
  return artistId === 'iu' && variableId === 'newsIssuePoint';
}

function projectWindow(
  window: NaverNewsIssuePointWindowEvidence,
): ProductVariableStoredEvidenceWindowTrace {
  return Object.freeze({
    startSlotStart: window.startSlotStart,
    endSlotStart: window.endSlotStart,
    firstSeenObservationCount: window.firstSeenObservationCount,
    observedObservationCount: window.observedObservationCount,
    activityRate: window.activityRate,
    slotEvidence: Object.freeze(
      window.slotEvidence.map((slot) => Object.freeze({
        slotStart: slot.slotStart,
        jobId: slot.jobId,
      })),
    ),
  });
}

function methodologyMatchesCandidate(
  methodology: NaverNewsIssuePointFrozenMethodologyResult,
  candidate: Extract<
    ReturnType<typeof selectNewsIssuePointRealProductSource>,
    { selection: 'real-shadow-candidate' | 'real-unavailable' }
  >['candidate'],
  throughSlotStart: string,
): boolean {
  return (
    methodology.variableId === 'newsIssuePoint'
    && methodology.canonicalArtistId === 'iu'
    && methodology.throughSlotStart === throughSlotStart
    && candidate.variableId === methodology.variableId
    && candidate.canonicalArtistId === methodology.canonicalArtistId
    && candidate.sourceMetadata.methodologyVersion === methodology.methodologyVersion
    && candidate.sourceMetadata.protocolStart === methodology.protocolStart
    && candidate.sourceMetadata.throughSlotStart === methodology.throughSlotStart
    && candidate.sourceMetadata.priorDefinedWindowCount
      === methodology.priorDefinedWindowCount
    && candidate.sourceMetadata.priorLessThanLatestCount
      === methodology.priorLessThanLatestCount
    && candidate.sourceMetadata.priorEqualToLatestCount
      === methodology.priorEqualToLatestCount
    && candidate.sourceMetadata.priorGreaterThanLatestCount
      === methodology.priorGreaterThanLatestCount
  );
}

function realModel(
  methodology: NaverNewsIssuePointFrozenMethodologyResult,
  candidate: Extract<
    ReturnType<typeof selectNewsIssuePointRealProductSource>,
    { selection: 'real-shadow-candidate' | 'real-unavailable' }
  >['candidate'],
): ProductVariableReadModel {
  const definition = PRODUCT_VARIABLE_DEFINITION_BY_ID.get('newsIssuePoint');
  if (!definition) {
    throw new Error('product_news_issue_point_definition_missing');
  }

  const currentWindow = methodology.currentWindow;
  const series = (
    candidate.fact.availability === 'available'
    && currentWindow !== null
  )
    ? Object.freeze([
        Object.freeze({
          sourceTimeLabel: currentWindow.endSlotStart,
          fact: candidate.fact,
        }),
      ])
    : Object.freeze([]);

  const productTraceWindows = [
    ...methodology.eligiblePriorWindows,
    ...(currentWindow === null ? [] : [currentWindow]),
  ];
  const storedEvidenceJobIds = Object.freeze([
    ...new Set(
      productTraceWindows.flatMap((window) =>
        window.slotEvidence.map((slot) => slot.jobId),
      ),
    ),
  ]);

  return Object.freeze({
    identity: Object.freeze({
      sourceArtistId: 'iu',
      variableId: 'newsIssuePoint' as const,
      sourceVariableKey: 'newsIssuePoint' as const,
    }),
    definition: Object.freeze({
      ...definition,
      evidenceRelation: Object.freeze({
        kind: 'stored-evidence-job-trace' as const,
        sourceMetric: 'naverNewsShadowFirstSeenActivity' as const,
      }),
    }),
    fact: candidate.fact,
    series,
    observationTime: candidate.observationTime,
    presentation: candidate.presentation,
    dataOrigin: candidate.dataOrigin,
    publication: candidate.publication,
    sourceMetadata: Object.freeze({
      sourceKind: 'naver-news-issue-point-frozen-methodology' as const,
      sourceArtistId: 'iu',
      sourceVariableKey: 'newsIssuePoint' as const,
      sourceTimeLabel: currentWindow?.endSlotStart ?? methodology.throughSlotStart,
      methodologyVersion: methodology.methodologyVersion,
      officialShadowEpoch: methodology.protocolStart,
      throughSlotStart: methodology.throughSlotStart,
      selectedWindowSlotCount: methodology.selectedWindowSlotCount,
      normalizationType: methodology.normalizationType,
      baselineReadinessStatus: methodology.baselineReadiness.status,
      currentActivityRate: methodology.currentActivityRate,
      priorDefinedWindowCount: methodology.priorDefinedWindowCount,
      priorLessThanLatestCount: methodology.priorLessThanLatestCount,
      priorEqualToLatestCount: methodology.priorEqualToLatestCount,
      priorGreaterThanLatestCount: methodology.priorGreaterThanLatestCount,
    }),
    evidenceTrace: Object.freeze({
      kind: 'naver-news-issue-point-stored-evidence' as const,
      methodologyVersion: methodology.methodologyVersion,
      officialShadowEpoch: methodology.protocolStart,
      throughSlotStart: methodology.throughSlotStart,
      currentWindow: currentWindow === null ? null : projectWindow(currentWindow),
      eligiblePriorWindows: Object.freeze(
        methodology.eligiblePriorWindows.map(projectWindow),
      ),
      storedEvidenceJobIds,
    }),
  });
}

export async function getArtistProductVariableRealReadModel(
  input: ArtistProductVariableRealReadInput,
  runtime: ProductVariableRealReadRuntime,
): Promise<ProductVariableReadModelResult> {
  const artistId = input.artistId.trim();
  const variableIdentity = validateProductVariableId(input.variableId);
  const legacyResult = (
    runtime.readLegacyProductVariable ?? getArtistProductVariable
  )({
    artistId,
    variableId: input.variableId,
  });

  if (
    variableIdentity.status === 'invalid'
    || !targetScope(artistId, variableIdentity.variableId)
  ) {
    return legacyResult;
  }

  const throughSlotStart = input.throughSlotStart;
  if (throughSlotStart === null) {
    return dataIssue(
      artistId,
      input.variableId,
      null,
      'runtime-read-failed',
    );
  }

  let methodology: NaverNewsIssuePointFrozenMethodologyResult;
  try {
    methodology = await runtime.readNewsIssuePointFrozenMethodology({
      canonicalArtistId: 'iu',
      throughSlotStart,
    });
  } catch {
    return dataIssue(
      artistId,
      input.variableId,
      throughSlotStart,
      'runtime-read-failed',
    );
  }

  const candidateResult =
    adaptNaverNewsIssuePointProductCandidate(methodology);
  const selection = selectNewsIssuePointRealProductSource({
    artistId,
    variableId: variableIdentity.variableId,
    legacyResult,
    realCandidateResult: candidateResult,
  });

  if (selection.selection === 'data-issue') {
    return dataIssue(
      artistId,
      input.variableId,
      methodology.throughSlotStart,
      'selector-data-issue',
    );
  }

  if (selection.selection === 'legacy-preview') {
    return legacyResult;
  }

  if (!methodologyMatchesCandidate(
    methodology,
    selection.candidate,
    throughSlotStart,
  )) {
    return dataIssue(
      artistId,
      input.variableId,
      methodology.throughSlotStart,
      'methodology-candidate-mismatch',
    );
  }

  return Object.freeze({
    status: 'ok' as const,
    model: realModel(methodology, selection.candidate),
  });
}
