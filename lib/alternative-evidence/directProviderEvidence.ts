import type { DirectAlbumProviderDescriptor, DirectAlbumProviderCapabilities } from './directAlbumProvider';
import { CIRCLE_PROVIDER_DESCRIPTOR, HANTEO_PROVIDER_DESCRIPTOR } from './directAlbumProvider';
import { createDefaultOffOnboarding, type SourceAuthorizationDimensions, type SourceOnboardingRecord } from './onboarding';

export const DIRECT_PROVIDER_EVIDENCE_CONTRACT_VERSION='direct-provider-evidence-v1';
export type ProviderEvidencePacket=Readonly<{providerId:string;providerName:string;officialProductName:string|null;officialEvidenceUrls:readonly string[];acquisitionClass:'public-page-only'|'unknown'|'blocked';productActiveState:'active'|'deprecated'|'unknown';semanticEvidence:string;identityEvidence:string;temporalEvidence:string;revisionEvidence:string;requestEvidence:string;authorizationEvidence:string;capabilityUpgrades:Readonly<Record<string,string>>;certificationCapabilities?:Readonly<{supportsCumulativeCertification:boolean;supportsThresholdCertification:boolean}>;certificationThresholds?:Readonly<{platinum:Readonly<{relation:'>=';value:number}>;million:Readonly<{relation:'>=';value:number}>}>;unresolvedCapabilities:readonly string[];blockers:readonly string[]}>;

export const CIRCLE_PROVIDER_EVIDENCE:ProviderEvidencePacket=Object.freeze({
  providerId:'circle-chart',
  providerName:'Circle Chart',
  officialProductName:'Circle Retail Album Chart / Album Chart / Album certification',
  officialEvidenceUrls:[
    'https://circlechart.kr/page_chart/retail.circle',
    'https://circlechart.kr/page_cert/chart.circle?serviceKey=default',
  ],
  acquisitionClass:'blocked',
  productActiveState:'active',
  semanticEvidence:'Official Retail Album Chart defines its ranking basis as total offline-album sales at retail stores. This is distinct from the general Album Chart and is the Circle construct relevant to completed-purchase-class retail sales.',
  identityEvidence:'Stable provider identity is available at chart level; release/edition/SKU identity contract remains unresolved.',
  temporalEvidence:'Retail Album Chart exposes hourly, daily, weekly, monthly, and yearly views. Formal provider-period API semantics remain undocumented.',
  revisionEvidence:'Correction and revision contract is not documented for automated downstream use.',
  requestEvidence:'Public HTML chart pages and historical query parameters are observable, but no official automated API contract has been verified.',
  authorizationEvidence:'The official Circle Chart footer states that unauthorized AI/ML training or text and data mining (TDM) is not allowed. FANDEX therefore treats automated acquisition as blocked absent separate authorization; normalized storage and derived publication remain separately review-required.',
  capabilityUpgrades:{},
  certificationCapabilities:{supportsCumulativeCertification:true,supportsThresholdCertification:true},
  certificationThresholds:{platinum:{relation:'>=' as const,value:250000},million:{relation:'>=' as const,value:1000000}},
  unresolvedCapabilities:['supportsCumulativeSales','supportsNativePeriodSales','supportsFirstWeekSales','supportsHistoricalQueries','supportsRevisions','supportsArtistIdentity','supportsReleaseIdentity','supportsEditionIdentity','supportsSkuIdentity','supportsFormatIdentity','supportsTerritorySegmentation'],
  blockers:['unauthorized-tdm-prohibited','no-verified-official-api-contract','normalized-storage-and-derived-publication-rights-review-required'],
});

export const HANTEO_PROVIDER_EVIDENCE:ProviderEvidencePacket=Object.freeze({
  providerId:'hanteo-chart',
  providerName:'Hanteo Chart',
  officialProductName:'Hanteo Physical Album Chart / Album Daily and Weekly charts',
  officialEvidenceUrls:[
    'https://www.hanteochart.com/en/about',
    'https://api.hanteochart.com/',
    'https://www.hanteochart.com/ko/notices',
  ],
  acquisitionClass:'public-page-only',
  productActiveState:'active',
  semanticEvidence:'Official Hanteo pages state that the album chart is generated from physical-album sales reported by connected retailers; this supports physical-sales construct compatibility but does not establish a complete consumer universe.',
  identityEvidence:'Stable provider release identity/API mapping contract remains unresolved.',
  temporalEvidence:'Daily/weekly chart periods are exposed. First-week, historical-query, cutoff, and provider-period contracts are not fully documented for FANDEX use.',
  revisionEvidence:'Official notices demonstrate that sales corrections can occur, but machine-readable revision/supersession semantics are not documented.',
  requestEvidence:'A bounded FANDEX one-shot research probe observed HTTP 200 and a payload containing detail.salesVolume. This proves technical schema availability only; official API documentation, authentication terms, pagination/rate limits, and reuse license remain unverified.',
  authorizationEvidence:'Public access and the API landing page do not establish permission for recurring automated acquisition, normalized storage, commercial use, or derived publication. Hanteo provides a separate partnership/proposal inquiry path and retains All Rights Reserved.',
  capabilityUpgrades:{},
  unresolvedCapabilities:['supportsNativePeriodSales','supportsFirstWeekSales','supportsCumulativeSales','supportsHistoricalQueries','supportsRevisions','supportsArtistIdentity','supportsReleaseIdentity','supportsEditionIdentity','supportsSkuIdentity','supportsFormatIdentity','supportsTerritorySegmentation'],
  blockers:['official-api-contract-and-reuse-rights-not-verified','storage-and-derived-publication-rights-review-required','historical-period-and-revision-contract-unresolved'],
});

const unknownCapabilities=():DirectAlbumProviderCapabilities=>Object.freeze({supportsNativePeriodSales:{state:'unknown',evidenceIds:[]},supportsFirstWeekSales:{state:'unknown',evidenceIds:[]},supportsCumulativeSales:{state:'unknown',evidenceIds:[]},supportsHistoricalQueries:{state:'unknown',evidenceIds:[]},supportsRevisions:{state:'unknown',evidenceIds:[]},supportsArtistIdentity:{state:'unknown',evidenceIds:[]},supportsReleaseIdentity:{state:'unknown',evidenceIds:[]},supportsEditionIdentity:{state:'unknown',evidenceIds:[]},supportsSkuIdentity:{state:'unknown',evidenceIds:[]},supportsFormatIdentity:{state:'unknown',evidenceIds:[]},supportsTerritorySegmentation:{state:'unknown',evidenceIds:[]}});

export function buildEvidenceLinkedDescriptor(base:DirectAlbumProviderDescriptor,packet:ProviderEvidencePacket):DirectAlbumProviderDescriptor{
  const acquisitionBlocked=packet.acquisitionClass==='blocked';
  const auth:SourceAuthorizationDimensions={
    acquisitionState:acquisitionBlocked?'blocked':'review-required',
    automationState:acquisitionBlocked?'blocked':'review-required',
    rawStorageState:'review-required',
    normalizedStorageState:'review-required',
    retentionState:'unknown',
    commercialUseState:'contract-required',
    derivedPublicationState:'review-required',
    rawRedistributionState:'blocked',
  };
  const onboarding:SourceOnboardingRecord=createDefaultOffOnboarding({sourceId:base.providerId,sourceName:base.providerName,stage:'official-docs-verified',technicalReadiness:'contract-ready',authorization:auth,evidenceIds:packet.officialEvidenceUrls,blockers:packet.blockers});
  return Object.freeze({...base,onboarding,capabilities:unknownCapabilities()});
}

export const CIRCLE_EVIDENCE_DESCRIPTOR=buildEvidenceLinkedDescriptor(CIRCLE_PROVIDER_DESCRIPTOR,CIRCLE_PROVIDER_EVIDENCE);
export const HANTEO_EVIDENCE_DESCRIPTOR=buildEvidenceLinkedDescriptor(HANTEO_PROVIDER_DESCRIPTOR,HANTEO_PROVIDER_EVIDENCE);
export const DIRECT_PROVIDER_EVIDENCE_PACKETS=Object.freeze({circle:CIRCLE_PROVIDER_EVIDENCE,hanteo:HANTEO_PROVIDER_EVIDENCE});
