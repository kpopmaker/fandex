import type {
  DirectAlbumProviderCapabilities,
  DirectAlbumProviderDescriptor,
  ProviderCapability,
} from './directAlbumProvider';
import {
  CIRCLE_PROVIDER_DESCRIPTOR,
  HANTEO_PROVIDER_DESCRIPTOR,
} from './directAlbumProvider';
import {
  createDefaultOffOnboarding,
  type SourceAuthorizationDimensions,
  type SourceOnboardingRecord,
} from './onboarding';

export const DIRECT_PROVIDER_EVIDENCE_CONTRACT_VERSION = 'direct-provider-evidence-v1';

type CapabilityUpgradeMap = Readonly<Partial<Record<keyof DirectAlbumProviderCapabilities, string>>>;

export type ProviderEvidencePacket = Readonly<{
  providerId: string;
  providerName: string;
  officialProductName: string | null;
  officialEvidenceUrls: readonly string[];
  acquisitionClass: 'public-direct-endpoint' | 'public-page-only' | 'unknown' | 'blocked';
  productActiveState: 'active' | 'deprecated' | 'unknown';
  semanticEvidence: string;
  identityEvidence: string;
  temporalEvidence: string;
  revisionEvidence: string;
  requestEvidence: string;
  authorizationEvidence: string;
  capabilityUpgrades: CapabilityUpgradeMap;
  certificationCapabilities?: Readonly<{
    supportsCumulativeCertification: boolean;
    supportsThresholdCertification: boolean;
  }>;
  certificationThresholds?: Readonly<{
    platinum: Readonly<{ relation: '>='; value: number }>;
    million: Readonly<{ relation: '>='; value: number }>;
  }>;
  unresolvedCapabilities: readonly string[];
  blockers: readonly string[];
}>;

export const CIRCLE_PROVIDER_EVIDENCE: ProviderEvidencePacket = Object.freeze({
  providerId: 'circle-chart',
  providerName: 'Circle Chart',
  officialProductName: 'Circle Retail Album Chart / Album certification',
  officialEvidenceUrls: Object.freeze([
    'https://circlechart.kr/page_chart/retail.circle',
    'https://circlechart.kr/page_cert/chart.circle?serviceKey=default',
  ]),
  acquisitionClass: 'public-direct-endpoint',
  productActiveState: 'active',
  semanticEvidence:
    'Circle official Retail page directly renders rowSum as Sales/판매량. Direct retail_list and retail_hour responses expose rowSum for retail-album period sales.',
  identityEvidence:
    'Daily/Weekly/Monthly/Yearly retail_list rows expose Barcode as a stable SKU/product identity candidate plus Artist and Album text. The directly observed Hourly retail_hour rows expose Artist and Album but no Barcode. Provider-native artist/release/edition IDs remain unverified.',
  temporalEvidence:
    'POST retail_list Daily, Weekly, Monthly, and Yearly requests were directly observed with provider-native period keys and ResultStatus=OK. Hourly uses POST hour_time to resolve the provider date/hour range and POST retail_hour for the selected hour. Invalid-calendar, future, and prelaunch probes all returned HTTP 200 with ResultStatus=Error and no List, so the provider collapses those causes into one period-error shape.',
  revisionEvidence:
    'Provider correction behavior exists in the wider evidence record, but adapter-level revision/supersession handling is not yet qualified in this packet.',
  requestEvidence:
    'Direct public contracts qualified: POST /data/api/chart/retail_list with termGbn and yyyymmdd for day/week/month/year; POST /data/api/chart_func/retail/hour_time with termGbn=hour; POST /data/api/chart/retail_hour with yyyymmdd, HourRange, ListType, and thisHour. JSON roots expose FormToMap/List/ResultStatus and rows at $.List{values}. A known-period retail_list request also succeeded without Cookie or Referer. The official UI renders every returned row with no page/size/offset/limit/cursor parameters observed; tested published charts returned ranks 1-50.',
  authorizationEvidence:
    'Public technical reachability and capability evidence do not establish automation, storage, publication, commercial-use, or redistribution rights.',
  capabilityUpgrades: Object.freeze({
    supportsNativePeriodSales: 'circle-retail-direct-response-v1:rowSum-period-sales',
    supportsHistoricalQueries: 'circle-retail-direct-response-v1:historical-hour-day-week-month-year',
    supportsSkuIdentity: 'circle-retail-direct-response-v1:barcode-sku-identity-non-hour',
  }),
  certificationCapabilities: Object.freeze({
    supportsCumulativeCertification: true,
    supportsThresholdCertification: true,
  }),
  certificationThresholds: Object.freeze({
    platinum: Object.freeze({ relation: '>=' as const, value: 250000 }),
    million: Object.freeze({ relation: '>=' as const, value: 1000000 }),
  }),
  unresolvedCapabilities: Object.freeze([
    'supportsCumulativeSales',
    'supportsFirstWeekSales',
    'supportsRevisions',
    'supportsArtistIdentity',
    'supportsReleaseIdentity',
    'supportsEditionIdentity',
    'supportsFormatIdentity',
    'supportsTerritorySegmentation',
  ]),
  blockers: Object.freeze([
    'revision-and-rate-limit-qualification-required',
    'storage-and-publication-rights-review-required',
  ]),
});

export const HANTEO_PROVIDER_EVIDENCE: ProviderEvidencePacket = Object.freeze({
  providerId: 'hanteo-chart',
  providerName: 'Hanteo Chart',
  officialProductName: 'Hanteo Physical Album Chart / Album Daily and Weekly charts',
  officialEvidenceUrls: Object.freeze(['https://www.hanteochart.com/en/about']),
  acquisitionClass: 'public-page-only',
  productActiveState: 'active',
  semanticEvidence:
    'Official chart context is aggregated physical-sales evidence, not yet a directly qualified upstream quantity contract in this code path.',
  identityEvidence: 'Stable provider identity/API contract remains unqualified here.',
  temporalEvidence: 'Daily/weekly chart periods are documented; direct historical request contract remains unqualified here.',
  revisionEvidence: 'Correction behavior is not yet connected to an implementation contract here.',
  requestEvidence: 'API landing metadata exists; direct schema/auth/pagination/rate limits remain unknown in this code path.',
  authorizationEvidence:
    'Public chart access does not establish automated collection, storage, commercial-use, or redistribution permission.',
  capabilityUpgrades: Object.freeze({}),
  unresolvedCapabilities: Object.freeze([
    'supportsNativePeriodSales',
    'supportsFirstWeekSales',
    'supportsCumulativeSales',
    'supportsHistoricalQueries',
    'supportsRevisions',
    'supportsArtistIdentity',
    'supportsReleaseIdentity',
    'supportsEditionIdentity',
    'supportsSkuIdentity',
    'supportsFormatIdentity',
    'supportsTerritorySegmentation',
  ]),
  blockers: Object.freeze([
    'api-schema-not-verified',
    'storage-and-publication-rights-review-required',
  ]),
});

function unknownCapabilities(): DirectAlbumProviderCapabilities {
  const unknown = (): ProviderCapability => Object.freeze({
    state: 'unknown',
    evidenceIds: Object.freeze([]),
  });
  return Object.freeze({
    supportsNativePeriodSales: unknown(),
    supportsFirstWeekSales: unknown(),
    supportsCumulativeSales: unknown(),
    supportsHistoricalQueries: unknown(),
    supportsRevisions: unknown(),
    supportsArtistIdentity: unknown(),
    supportsReleaseIdentity: unknown(),
    supportsEditionIdentity: unknown(),
    supportsSkuIdentity: unknown(),
    supportsFormatIdentity: unknown(),
    supportsTerritorySegmentation: unknown(),
  });
}

function evidenceLinkedCapabilities(packet: ProviderEvidencePacket): DirectAlbumProviderCapabilities {
  const capabilities = {
    ...unknownCapabilities(),
  } as Record<keyof DirectAlbumProviderCapabilities, ProviderCapability>;

  for (const [key, evidenceId] of Object.entries(packet.capabilityUpgrades) as Array<[
    keyof DirectAlbumProviderCapabilities,
    string,
  ]>) {
    capabilities[key] = Object.freeze({
      state: 'true',
      evidenceIds: Object.freeze([evidenceId]),
    });
  }

  return Object.freeze(capabilities);
}

export function buildEvidenceLinkedDescriptor(
  base: DirectAlbumProviderDescriptor,
  packet: ProviderEvidencePacket,
): DirectAlbumProviderDescriptor {
  const hasCapabilityUpgrades = Object.keys(packet.capabilityUpgrades).length > 0;
  const capabilityEvidenceIds = Object.values(packet.capabilityUpgrades);
  const authorization: SourceAuthorizationDimensions = Object.freeze({
    acquisitionState: 'review-required',
    automationState: 'review-required',
    rawStorageState: 'review-required',
    normalizedStorageState: 'review-required',
    retentionState: 'unknown',
    commercialUseState: 'contract-required',
    derivedPublicationState: 'review-required',
    rawRedistributionState: 'blocked',
  });
  const onboarding: SourceOnboardingRecord = createDefaultOffOnboarding({
    sourceId: base.providerId,
    sourceName: base.providerName,
    stage: hasCapabilityUpgrades ? 'live-adapter-default-off' : 'official-docs-verified',
    technicalReadiness: hasCapabilityUpgrades ? 'adapter-ready' : 'contract-ready',
    authorization,
    evidenceIds: Object.freeze([...packet.officialEvidenceUrls, ...capabilityEvidenceIds]),
    blockers: packet.blockers,
  });

  return Object.freeze({
    ...base,
    onboarding,
    capabilities: evidenceLinkedCapabilities(packet),
  });
}

export const CIRCLE_EVIDENCE_DESCRIPTOR = buildEvidenceLinkedDescriptor(
  CIRCLE_PROVIDER_DESCRIPTOR,
  CIRCLE_PROVIDER_EVIDENCE,
);
export const HANTEO_EVIDENCE_DESCRIPTOR = buildEvidenceLinkedDescriptor(
  HANTEO_PROVIDER_DESCRIPTOR,
  HANTEO_PROVIDER_EVIDENCE,
);

export const DIRECT_PROVIDER_EVIDENCE_PACKETS = Object.freeze({
  circle: CIRCLE_PROVIDER_EVIDENCE,
  hanteo: HANTEO_PROVIDER_EVIDENCE,
});
