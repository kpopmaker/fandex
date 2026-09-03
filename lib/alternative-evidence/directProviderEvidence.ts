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
  officialProductName: 'Circle Chart Album Chart / Album certification',
  officialEvidenceUrls: Object.freeze(['https://circlechart.kr/page_cert/chart.circle?serviceKey=default']),
  acquisitionClass: 'public-page-only',
  productActiveState: 'active',
  semanticEvidence: 'Official certification thresholds provide cumulative certification context, not a documented unit feed.',
  identityEvidence: 'Stable provider identity and edition/SKU contract unknown.',
  temporalEvidence: 'Certification is cumulative; native period cadence unknown.',
  revisionEvidence: 'Correction behavior unknown.',
  requestEvidence: 'No official API/request schema verified in this branch.',
  authorizationEvidence: 'Public visibility does not establish automated collection or storage permission.',
  capabilityUpgrades: Object.freeze({}),
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
    'supportsNativePeriodSales',
    'supportsFirstWeekSales',
    'supportsHistoricalQueries',
    'supportsRevisions',
    'supportsArtistIdentity',
    'supportsReleaseIdentity',
    'supportsEditionIdentity',
    'supportsSkuIdentity',
    'supportsFormatIdentity',
    'supportsTerritorySegmentation',
  ]),
  blockers: Object.freeze(['no-verified-official-api-contract', 'storage-and-publication-rights-review-required']),
});

export const HANTEO_PROVIDER_EVIDENCE: ProviderEvidencePacket = Object.freeze({
  providerId: 'hanteo-chart',
  providerName: 'Hanteo Chart',
  officialProductName: 'Hanteo Physical Album Chart / Album Daily, Weekly, and Monthly charts',
  officialEvidenceUrls: Object.freeze([
    'https://www.hanteochart.com/en/about',
    'https://www.hanteochart.com/en/charts/album/weekly',
  ]),
  acquisitionClass: 'public-direct-endpoint',
  productActiveState: 'active',
  semanticEvidence:
    'Direct current Album responses expose row.value as Album Index and detail.salesVolume as physical sales copies. Official Hanteo reporting for the same weekly item/period matches both values, so the adapter uses only detail.salesVolume for physical-units and never falls back to rank or Album Index.',
  identityEvidence:
    'Direct rows expose detail.artistIdx as a provider artist identity and targetIdx as a stable chart-target/item/release candidate. targetIdx is retained in observations, but its exact release-vs-edition entity level remains unqualified; no SKU or Barcode identity is invented.',
  temporalEvidence:
    'Current Daily, Weekly, and Monthly GET contracts are directly qualified with provider-native KST period labels. Historical rank pages are public, but the observed historical page explicitly uses showSales=false/rankOnly=true. The same-site /api/chart-sales route returned the same latest sales list when Week 30 vs Week 29 Referer changed, so it is not qualified as a historical selector. Historical exact-copy public selection remains unverified.',
  revisionEvidence:
    'Official correction behavior exists in the broader evidence record, but Hanteo adapter-level revision/supersession handling is not yet qualified in this code path.',
  requestEvidence:
    'Direct current contracts qualified: GET /v4/ranking/list/ALBUM/DAILY/BASIC?limit=N, GET /v4/ranking/list/ALBUM/WEEKLY/BASIC?limit=N, and GET /v4/ranking/list/ALBUM/MONTHLY/BASIC?limit=N. limit is required; omission returned provider code 602. Success uses code 100 with resultData.resultDatetime and resultData.list[]. Historical exact-copy selector is unverified. Common public API-doc paths (/v3/api-docs, /swagger-ui/index.html, /openapi.json, /api-docs) produced no usable response within bounded 5-second probes; this is not evidence that private or undocumented contracts do not exist.',
  authorizationEvidence:
    'Public technical reachability does not establish automated collection, storage, commercial-use, publication, or redistribution permission.',
  capabilityUpgrades: Object.freeze({
    supportsNativePeriodSales: 'hanteo-direct-response-v1:current-day-week-month-salesVolume',
    supportsArtistIdentity: 'hanteo-direct-response-v1:artistIdx-provider-identity',
  }),
  unresolvedCapabilities: Object.freeze([
    'supportsFirstWeekSales',
    'supportsCumulativeSales',
    'supportsHistoricalQueries',
    'supportsRevisions',
    'supportsReleaseIdentity',
    'supportsEditionIdentity',
    'supportsSkuIdentity',
    'supportsFormatIdentity',
    'supportsTerritorySegmentation',
  ]),
  blockers: Object.freeze([
    'historical-exact-copies-public-selector-unverified',
    'release-identity-level-unqualified',
    'storage-and-publication-rights-review-required',
  ]),
});

function unknownCapabilities(): DirectAlbumProviderCapabilities {
  const unknown = (): ProviderCapability => Object.freeze({ state: 'unknown', evidenceIds: Object.freeze([]) });
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
  const capabilities = { ...unknownCapabilities() } as Record<keyof DirectAlbumProviderCapabilities, ProviderCapability>;
  for (const [key, evidenceId] of Object.entries(packet.capabilityUpgrades) as Array<[
    keyof DirectAlbumProviderCapabilities,
    string,
  ]>) {
    capabilities[key] = Object.freeze({ state: 'true', evidenceIds: Object.freeze([evidenceId]) });
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
  return Object.freeze({ ...base, onboarding, capabilities: evidenceLinkedCapabilities(packet) });
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
