import {
  PRODUCT_ACTIVITY_EXPOSURE_CONTRACT_VERSION,
  type ProductActivityExposureDataIssue,
  type ProductActivityExposureEvent,
  type ProductActivityExposurePrecision,
  type ProductActivityExposureProvider,
  type ProductActivityExposureProviderCoverage,
  type ProductActivityExposureReadModelResult,
} from '../contracts/productActivityExposure';
import type {
  ProductPresentation,
  ProductPublication,
} from '../contracts/productState';

const REQUIRED_PROVIDERS = Object.freeze([
  'musicbrainz',
  'youtube',
] as const satisfies readonly ProductActivityExposureProvider[]);

function matchesPrecision(
  value: string,
  precision: ProductActivityExposurePrecision,
) {
  if (precision === 'year') return /^\d{4}$/.test(value);
  if (precision === 'month') return /^\d{4}-\d{2}$/.test(value);
  if (precision === 'day') return /^\d{4}-\d{2}-\d{2}$/.test(value);

  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(
    value,
  );
}

function occurrenceSemanticsValid(event: ProductActivityExposureEvent) {
  if (event.lifecycleState === 'observed') {
    return (
      event.occurredAt !== null
      && event.occurredAtPrecision !== null
      && matchesPrecision(event.occurredAt, event.occurredAtPrecision)
    );
  }

  if (event.lifecycleState === 'planned' || event.lifecycleState === 'cancelled') {
    return event.occurredAt === null && event.occurredAtPrecision === null;
  }

  return true;
}

function missingSemanticsValid(event: ProductActivityExposureEvent) {
  return !(
    event.lifecycleState === 'observed'
    && event.occurredAt !== null
    && !['covered', 'partial'].includes(event.missingState)
  );
}

function creditsValid(event: ProductActivityExposureEvent) {
  const credits = event.providerArtistCredits;
  const canonicalCreditPresent = credits.some(
    (credit) => credit.providerArtistId === event.providerArtistId,
  );

  if (!canonicalCreditPresent) return false;
  if (event.participationScope === 'collaboration') return credits.length >= 2;
  return credits.length === 1;
}

export function buildProductActivityExposureReadModel(input: Readonly<{
  artistId: string;
  events: readonly ProductActivityExposureEvent[];
  providerCoverage: readonly ProductActivityExposureProviderCoverage[];
  publication: ProductPublication;
  presentation?: ProductPresentation;
}>): ProductActivityExposureReadModelResult {
  const artistId = input.artistId.trim();
  const issues: ProductActivityExposureDataIssue[] = [];
  const coverageByProvider = new Map<
    ProductActivityExposureProvider,
    ProductActivityExposureProviderCoverage
  >();

  for (const coverage of input.providerCoverage) {
    if (coverageByProvider.has(coverage.provider)) {
      issues.push({
        code: 'duplicate-provider-coverage',
        provider: coverage.provider,
      });
      continue;
    }
    coverageByProvider.set(coverage.provider, coverage);
  }

  for (const provider of REQUIRED_PROVIDERS) {
    if (!coverageByProvider.has(provider)) {
      issues.push({ code: 'missing-provider-coverage', provider });
    }
  }

  const eventIds = new Set<string>();
  const providerEntityIds = new Set<string>();

  for (const event of input.events) {
    if (event.artistId !== artistId) {
      issues.push({
        code: 'artist-identity-mismatch',
        eventId: event.eventId,
      });
    }

    if (eventIds.has(event.eventId)) {
      issues.push({
        code: 'duplicate-event-id',
        eventId: event.eventId,
      });
    }
    eventIds.add(event.eventId);

    const providerEntityId =
      `${event.sourceProvider}:${event.sourceEntityType}:${event.sourceEntityId}`;
    if (providerEntityIds.has(providerEntityId)) {
      issues.push({
        code: 'duplicate-provider-entity',
        eventId: event.eventId,
      });
    }
    providerEntityIds.add(providerEntityId);

    const coverage = coverageByProvider.get(event.sourceProvider);
    if (
      !coverage
      || coverage.providerArtistId !== event.providerArtistId
    ) {
      issues.push({
        code: 'provider-identity-mismatch',
        eventId: event.eventId,
        provider: event.sourceProvider,
      });
    }

    if (!occurrenceSemanticsValid(event)) {
      issues.push({
        code: 'invalid-occurrence-semantics',
        eventId: event.eventId,
      });
    }

    if (!missingSemanticsValid(event)) {
      issues.push({
        code: 'invalid-missing-semantics',
        eventId: event.eventId,
      });
    }

    if (!creditsValid(event)) {
      issues.push({
        code: 'collaboration-credit-loss',
        eventId: event.eventId,
      });
    }
  }

  if (issues.length > 0) {
    return Object.freeze({
      status: 'data-issue' as const,
      issues: Object.freeze(
        issues,
      ) as readonly [
        ProductActivityExposureDataIssue,
        ...ProductActivityExposureDataIssue[],
      ],
    });
  }

  return Object.freeze({
    status: 'ok' as const,
    model: Object.freeze({
      contractVersion: PRODUCT_ACTIVITY_EXPOSURE_CONTRACT_VERSION,
      identity: Object.freeze({
        sourceArtistId: artistId,
        constructId: 'activityExposure' as const,
      }),
      construct: 'Activity Exposure Event Stream' as const,
      events: Object.freeze([...input.events]),
      providerCoverage: Object.freeze([...input.providerCoverage]),
      dataOrigin: 'observed' as const,
      publication: input.publication,
      presentation: input.presentation ?? 'standard',
    }),
  });
}
