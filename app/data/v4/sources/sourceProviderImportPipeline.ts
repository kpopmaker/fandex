import { getEnabledSourceProviderAdapters } from './sourceProviderRegistry';
import { getSourceVariableSignalCandidates } from './sourceSignalCandidateMapper';
import type {
  FandexNormalizedSourceItem,
  FandexSourceVariableSignalCandidate,
} from './sourceIngestionTypes';
import type {
  FandexSourceProviderAdapterContext,
  FandexSourceProviderAdapterResult,
} from './sourceProviderAdapterTypes';

export type FandexSourceProviderPreviewImportSummary = {
  providerCount: number;
  sourceItemCount: number;
  candidateCount: number;
  artistCount: number;
  variableCount: number;
  warningCount: number;
  averageRelevanceScore: number;
  averageCandidateScore: number;
};

export type FandexSourceProviderPreviewImport = {
  collectedAt: string;
  providerResults: FandexSourceProviderAdapterResult[];
  sourceItems: FandexNormalizedSourceItem[];
  candidates: FandexSourceVariableSignalCandidate[];
  summary: FandexSourceProviderPreviewImportSummary;
  warnings: string[];
  previewOnly: true;
};

export type FandexSourceProviderPreviewImportShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'empty-provider-results'
    | 'duplicate-source-id'
    | 'invalid-source-item-count'
    | 'invalid-candidate-count'
    | 'non-preview-candidate';
  message: string;
  sourceId?: string;
  candidateId?: string;
};

export type FandexSourceProviderPreviewImportShapeCheckResult = {
  isValid: boolean;
  providerCount: number;
  sourceItemCount: number;
  candidateCount: number;
  issues: FandexSourceProviderPreviewImportShapeCheckIssue[];
};

const defaultPreviewImportContext: FandexSourceProviderAdapterContext = {
  collectedAt: '2026-07-08T00:00:00.000Z',
  note: 'Preview import uses fixture-only source provider adapters.',
};

function getAverage(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function dedupeSourceItems(items: FandexNormalizedSourceItem[]) {
  const itemMap = new Map<string, FandexNormalizedSourceItem>();

  items.forEach((item) => {
    if (!itemMap.has(item.sourceId)) {
      itemMap.set(item.sourceId, item);
    }
  });

  return Array.from(itemMap.values());
}

function createPreviewImportSummary(
  providerResults: FandexSourceProviderAdapterResult[],
  sourceItems: FandexNormalizedSourceItem[],
  candidates: FandexSourceVariableSignalCandidate[],
): FandexSourceProviderPreviewImportSummary {
  return {
    providerCount: providerResults.length,
    sourceItemCount: sourceItems.length,
    candidateCount: candidates.length,
    artistCount: new Set(sourceItems.flatMap((item) => item.artistIds)).size,
    variableCount: new Set(candidates.map((candidate) => candidate.variableKey)).size,
    warningCount: providerResults.reduce(
      (sum, result) => sum + result.warnings.length,
      0,
    ),
    averageRelevanceScore: getAverage(
      sourceItems.map((item) => item.relevanceScore),
    ),
    averageCandidateScore: getAverage(
      candidates.map((candidate) => candidate.candidateScore),
    ),
  };
}

export function runSourceProviderPreviewImport(
  context: Partial<FandexSourceProviderAdapterContext> = {},
): FandexSourceProviderPreviewImport {
  const importContext = {
    ...defaultPreviewImportContext,
    ...context,
  };
  const providerResults = getEnabledSourceProviderAdapters().map((adapter) =>
    adapter.collectPreviewSources(importContext),
  );
  const sourceItems = dedupeSourceItems(
    providerResults.flatMap((result) => result.items),
  );
  const candidates = getSourceVariableSignalCandidates(sourceItems);
  const warnings = providerResults.flatMap((result) => result.warnings);

  return {
    collectedAt: importContext.collectedAt,
    providerResults,
    sourceItems,
    candidates,
    summary: createPreviewImportSummary(providerResults, sourceItems, candidates),
    warnings,
    previewOnly: true,
  };
}

export function getSourceProviderPreviewImportSummary(
  context: Partial<FandexSourceProviderAdapterContext> = {},
) {
  return runSourceProviderPreviewImport(context).summary;
}

export function runSourceProviderPreviewImportShapeCheck(): FandexSourceProviderPreviewImportShapeCheckResult {
  const previewImport = runSourceProviderPreviewImport();
  const issues: FandexSourceProviderPreviewImportShapeCheckIssue[] = [];
  const sourceIdCounts = new Map<string, number>();

  if (previewImport.providerResults.length === 0) {
    issues.push({
      severity: 'error',
      code: 'empty-provider-results',
      message: 'Preview import provider results must not be empty.',
    });
  }

  previewImport.sourceItems.forEach((item) => {
    sourceIdCounts.set(item.sourceId, (sourceIdCounts.get(item.sourceId) ?? 0) + 1);
  });

  sourceIdCounts.forEach((count, sourceId) => {
    if (count > 1) {
      issues.push({
        severity: 'error',
        code: 'duplicate-source-id',
        message: `Preview import sourceItems must be unique: ${sourceId}`,
        sourceId,
      });
    }
  });

  previewImport.providerResults.forEach((result) => {
    if (result.itemCount !== result.items.length) {
      issues.push({
        severity: 'error',
        code: 'invalid-source-item-count',
        message: `Provider result itemCount mismatch: ${result.provider}`,
      });
    }
  });

  if (previewImport.summary.candidateCount !== previewImport.candidates.length) {
    issues.push({
      severity: 'error',
      code: 'invalid-candidate-count',
      message: 'Preview import candidateCount does not match candidates.length.',
    });
  }

  previewImport.candidates.forEach((candidate) => {
    if (!candidate.previewOnly) {
      issues.push({
        severity: 'error',
        code: 'non-preview-candidate',
        message: `Candidate must remain previewOnly: ${candidate.candidateId}`,
        sourceId: candidate.sourceId,
        candidateId: candidate.candidateId,
      });
    }
  });

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    providerCount: previewImport.summary.providerCount,
    sourceItemCount: previewImport.summary.sourceItemCount,
    candidateCount: previewImport.summary.candidateCount,
    issues,
  };
}
