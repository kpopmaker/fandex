import { fixtureSourceProviderAdapters } from './sourceProviderMockAdapters';
import type {
  FandexSourceProviderAdapter,
  FandexSourceProviderAdapterProvider,
  FandexSourceProviderAdapterStatus,
  FandexSourceProviderAdapterSummary,
  FandexSourceProviderRegistryShapeCheckIssue,
  FandexSourceProviderRegistryShapeCheckResult,
} from './sourceProviderAdapterTypes';

const allowedAdapterStatuses: readonly FandexSourceProviderAdapterStatus[] = [
  'ready',
  'mock',
  'disabled',
  'planned',
];

const defaultRegistryShapeCheckContext = {
  collectedAt: '2026-07-08T00:00:00.000Z',
  note: 'Registry shape check uses fixture-only preview adapters.',
};

export function getSourceProviderAdapters(): FandexSourceProviderAdapter[] {
  return fixtureSourceProviderAdapters;
}

export function getSourceProviderAdapterByProvider(
  provider: FandexSourceProviderAdapterProvider,
) {
  return getSourceProviderAdapters().find(
    (adapter) => adapter.provider === provider,
  ) ?? null;
}

export function getEnabledSourceProviderAdapters() {
  return getSourceProviderAdapters().filter(
    (adapter) => adapter.status === 'ready' || adapter.status === 'mock',
  );
}

export function getSourceProviderAdapterSummaries(): FandexSourceProviderAdapterSummary[] {
  return getSourceProviderAdapters().map((adapter) => {
    const previewResult = adapter.collectPreviewSources(
      defaultRegistryShapeCheckContext,
    );

    return {
      provider: adapter.provider,
      displayName: adapter.displayName,
      status: adapter.status,
      capabilities: adapter.capabilities,
      trustLevel: adapter.trustLevel,
      previewItemCount: previewResult.itemCount,
      description: adapter.description,
    };
  });
}

function hasProviderItemMismatch(adapter: FandexSourceProviderAdapter) {
  const previewResult = adapter.collectPreviewSources(defaultRegistryShapeCheckContext);

  return previewResult.items.some((item) => item.provider !== adapter.provider)
    && previewResult.warnings.length === 0;
}

export function runSourceProviderRegistryShapeCheck(): FandexSourceProviderRegistryShapeCheckResult {
  const adapters = getSourceProviderAdapters();
  const issues: FandexSourceProviderRegistryShapeCheckIssue[] = [];
  const providerCounts = new Map<string, number>();
  let previewItemCount = 0;

  adapters.forEach((adapter) => {
    providerCounts.set(
      adapter.provider,
      (providerCounts.get(adapter.provider) ?? 0) + 1,
    );

    if (adapter.displayName.trim().length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-display-name',
        message: `Source provider adapter displayName is empty: ${adapter.provider}`,
        provider: adapter.provider,
      });
    }

    if (adapter.capabilities.length === 0) {
      issues.push({
        severity: 'error',
        code: 'missing-capabilities',
        message: `Source provider adapter capabilities are empty: ${adapter.provider}`,
        provider: adapter.provider,
      });
    }

    if (!allowedAdapterStatuses.includes(adapter.status)) {
      issues.push({
        severity: 'error',
        code: 'invalid-status',
        message: `Source provider adapter status is not allowed: ${adapter.provider}`,
        provider: adapter.provider,
      });
    }

    const previewResult = adapter.collectPreviewSources(
      defaultRegistryShapeCheckContext,
    );
    previewItemCount += previewResult.itemCount;

    if (previewResult.itemCount !== previewResult.items.length) {
      issues.push({
        severity: 'error',
        code: 'invalid-result-count',
        message: `Adapter itemCount does not match items.length: ${adapter.provider}`,
        provider: adapter.provider,
      });
    }

    if (hasProviderItemMismatch(adapter)) {
      issues.push({
        severity: 'warning',
        code: 'provider-item-mismatch',
        message:
          'Adapter provider differs from fixture item provider without an explanatory warning.',
        provider: adapter.provider,
      });
    }
  });

  providerCounts.forEach((count, provider) => {
    if (count > 1) {
      issues.push({
        severity: 'error',
        code: 'duplicate-provider',
        message: `Duplicate source provider adapter: ${provider}`,
        provider,
      });
    }
  });

  return {
    isValid: issues.every((issue) => issue.severity !== 'error'),
    adapterCount: adapters.length,
    previewItemCount,
    issues,
  };
}
