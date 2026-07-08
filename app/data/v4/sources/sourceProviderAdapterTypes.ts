import type {
  FandexNormalizedSourceItem,
  FandexSourceContentType,
  FandexSourceProvider,
  FandexSourceTrustLevel,
} from './sourceIngestionTypes';

export type FandexSourceProviderAdapterStatus =
  | 'ready'
  | 'mock'
  | 'disabled'
  | 'planned';

export type FandexSourceProviderAdapterCapability =
  | 'news'
  | 'video'
  | 'social'
  | 'search'
  | 'brand'
  | 'performance'
  | 'fandom'
  | 'risk';

export type FandexSourceProviderAdapterProvider =
  | FandexSourceProvider
  | 'video'
  | 'performance'
  | 'risk';

export type FandexSourceProviderAdapterContext = {
  collectedAt: string;
  targetArtistIds?: string[];
  targetContentTypes?: FandexSourceContentType[];
  maxItems?: number;
  note?: string;
};

export type FandexSourceProviderAdapterResult = {
  provider: FandexSourceProviderAdapterProvider;
  status: FandexSourceProviderAdapterStatus;
  collectedAt: string;
  items: FandexNormalizedSourceItem[];
  itemCount: number;
  warnings: string[];
  note: string;
};

export type FandexSourceProviderAdapter = {
  provider: FandexSourceProviderAdapterProvider;
  displayName: string;
  status: FandexSourceProviderAdapterStatus;
  capabilities: FandexSourceProviderAdapterCapability[];
  description: string;
  trustLevel: FandexSourceTrustLevel;
  collectPreviewSources: (
    context: FandexSourceProviderAdapterContext,
  ) => FandexSourceProviderAdapterResult;
};

export type FandexSourceProviderAdapterSummary = {
  provider: FandexSourceProviderAdapterProvider;
  displayName: string;
  status: FandexSourceProviderAdapterStatus;
  capabilities: FandexSourceProviderAdapterCapability[];
  trustLevel: FandexSourceTrustLevel;
  previewItemCount: number;
  description: string;
};

export type FandexSourceProviderRegistryShapeCheckIssue = {
  severity: 'error' | 'warning';
  code:
    | 'duplicate-provider'
    | 'missing-display-name'
    | 'missing-capabilities'
    | 'invalid-status'
    | 'invalid-result-count'
    | 'provider-item-mismatch';
  message: string;
  provider?: string;
  sourceId?: string;
};

export type FandexSourceProviderRegistryShapeCheckResult = {
  isValid: boolean;
  adapterCount: number;
  previewItemCount: number;
  issues: FandexSourceProviderRegistryShapeCheckIssue[];
};
