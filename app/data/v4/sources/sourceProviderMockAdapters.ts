import { sourceIngestionFixture } from './sourceIngestionFixture';
import type {
  FandexNormalizedSourceItem,
  FandexSourceContentType,
  FandexSourceProvider,
} from './sourceIngestionTypes';
import type {
  FandexSourceProviderAdapter,
  FandexSourceProviderAdapterCapability,
  FandexSourceProviderAdapterContext,
  FandexSourceProviderAdapterProvider,
} from './sourceProviderAdapterTypes';

type FixtureSourceProviderAdapterConfig = {
  provider: FandexSourceProviderAdapterProvider;
  displayName: string;
  capabilities: FandexSourceProviderAdapterCapability[];
  description: string;
  sourceProviders?: FandexSourceProvider[];
  contentTypes?: FandexSourceContentType[];
  excludeContentTypes?: FandexSourceContentType[];
  mismatchNote?: string;
};

function matchesArtistTargets(
  item: FandexNormalizedSourceItem,
  targetArtistIds?: string[],
) {
  if (!targetArtistIds || targetArtistIds.length === 0) {
    return true;
  }

  return item.artistIds.some((artistId) => targetArtistIds.includes(artistId));
}

function matchesContentTypeTargets(
  item: FandexNormalizedSourceItem,
  targetContentTypes?: FandexSourceContentType[],
) {
  if (!targetContentTypes || targetContentTypes.length === 0) {
    return true;
  }

  return targetContentTypes.includes(item.contentType);
}

function getFixtureItemsForAdapter(config: FixtureSourceProviderAdapterConfig) {
  return sourceIngestionFixture.filter((item) => {
    const providerMatches = config.sourceProviders
      ? config.sourceProviders.includes(item.provider)
      : item.provider === config.provider;
    const contentTypeMatches = config.contentTypes
      ? config.contentTypes.includes(item.contentType)
      : true;
    const contentTypeExcluded = config.excludeContentTypes?.includes(item.contentType)
      ?? false;

    return providerMatches && contentTypeMatches && !contentTypeExcluded;
  });
}

export function createFixtureSourceProviderAdapter(
  config: FixtureSourceProviderAdapterConfig,
): FandexSourceProviderAdapter {
  return {
    provider: config.provider,
    displayName: config.displayName,
    status: 'mock',
    capabilities: config.capabilities,
    description: config.description,
    trustLevel: 'preview',
    collectPreviewSources: (context: FandexSourceProviderAdapterContext) => {
      const maxItems = context.maxItems && context.maxItems > 0
        ? context.maxItems
        : undefined;
      const filteredItems = getFixtureItemsForAdapter(config)
        .filter((item) => matchesArtistTargets(item, context.targetArtistIds))
        .filter((item) =>
          matchesContentTypeTargets(item, context.targetContentTypes),
        );
      const items = typeof maxItems === 'number'
        ? filteredItems.slice(0, maxItems)
        : filteredItems;
      const warnings = config.mismatchNote ? [config.mismatchNote] : [];

      if (context.maxItems !== undefined && context.maxItems <= 0) {
        warnings.push('maxItems must be greater than zero. Returning all matched items.');
      }

      return {
        provider: config.provider,
        status: 'mock',
        collectedAt: context.collectedAt,
        items,
        itemCount: items.length,
        warnings,
        note: [
          'Fixture-only source provider adapter preview.',
          'No external API, DB, Supabase, crawling, or FANDEX scoring connection.',
          context.note,
        ].filter(Boolean).join(' '),
      };
    },
  };
}

export const fixtureNewsProviderAdapter = createFixtureSourceProviderAdapter({
  provider: 'news',
  displayName: 'Fixture News Provider',
  capabilities: ['news'],
  description: 'Mock news adapter backed by article fixture source items.',
  sourceProviders: ['news'],
  contentTypes: ['article'],
  excludeContentTypes: ['risk-note'],
});

export const fixtureVideoProviderAdapter = createFixtureSourceProviderAdapter({
  provider: 'video',
  displayName: 'Fixture Video Provider',
  capabilities: ['video'],
  description: 'Mock video adapter backed by YouTube fixture source items.',
  sourceProviders: ['youtube'],
  contentTypes: ['video'],
  mismatchNote:
    'Adapter provider is video while fixture source items keep provider youtube.',
});

export const fixtureSocialProviderAdapter = createFixtureSourceProviderAdapter({
  provider: 'social',
  displayName: 'Fixture Social Provider',
  capabilities: ['social', 'fandom'],
  description: 'Mock social adapter backed by SNS fixture source items.',
  sourceProviders: ['social', 'community'],
  contentTypes: ['social-post', 'community-signal'],
  mismatchNote:
    'Adapter groups social and community fixture providers for fandom preview coverage.',
});

export const fixtureSearchProviderAdapter = createFixtureSourceProviderAdapter({
  provider: 'search',
  displayName: 'Fixture Search Provider',
  capabilities: ['search'],
  description: 'Mock search adapter backed by search trend fixture source items.',
  sourceProviders: ['search'],
  contentTypes: ['search-trend'],
});

export const fixtureBrandProviderAdapter = createFixtureSourceProviderAdapter({
  provider: 'brand',
  displayName: 'Fixture Brand Provider',
  capabilities: ['brand'],
  description: 'Mock brand adapter backed by brand campaign fixture source items.',
  sourceProviders: ['brand'],
  contentTypes: ['brand-campaign'],
});

export const fixturePerformanceProviderAdapter = createFixtureSourceProviderAdapter({
  provider: 'performance',
  displayName: 'Fixture Performance Provider',
  capabilities: ['performance'],
  description: 'Mock performance adapter backed by event schedule fixture source items.',
  sourceProviders: ['event'],
  contentTypes: ['event-schedule'],
  mismatchNote:
    'Adapter provider is performance while fixture source items keep provider event.',
});

export const fixtureRiskProviderAdapter = createFixtureSourceProviderAdapter({
  provider: 'risk',
  displayName: 'Fixture Risk Provider',
  capabilities: ['risk'],
  description: 'Mock risk adapter backed by risk-note fixture source items.',
  sourceProviders: ['news'],
  contentTypes: ['risk-note'],
  mismatchNote:
    'Adapter provider is risk while fixture source items keep provider news.',
});

export const fixtureSourceProviderAdapters: FandexSourceProviderAdapter[] = [
  fixtureNewsProviderAdapter,
  fixtureVideoProviderAdapter,
  fixtureSocialProviderAdapter,
  fixtureSearchProviderAdapter,
  fixtureBrandProviderAdapter,
  fixturePerformanceProviderAdapter,
  fixtureRiskProviderAdapter,
];
