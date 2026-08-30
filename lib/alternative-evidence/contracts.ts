export const ALTERNATIVE_EVIDENCE_CONTRACT_VERSION = 'alternative-evidence-v1';
export const ALBUM_RESEARCH_CLAIM_CONTRACT_VERSION = 'album-research-claim-v1';

export type AlternativeEvidenceOrigin =
  | 'direct-licensed-provider'
  | 'authorized-public-api'
  | 'retailer-public-observation'
  | 'retailer-api-observation'
  | 'news-reported-provider-value'
  | 'news-reported-agency-value'
  | 'official-artist-or-agency-announcement'
  | 'existing-local-dataset'
  | 'unknown-public-claim';

export type AlternativeEvidence = Readonly<{
  evidenceId: string;
  origin: AlternativeEvidenceOrigin;
  sourceId: string;
  sourceUrl: string | null;
  acquisitionProvider: string;
  reportedProvider: string | null;
  observedAt: string;
  collectedAt: string;
  sourcePublishedAt: string | null;
  evidenceDigest: string;
  researchOnly: true;
  contractVersion: typeof ALTERNATIVE_EVIDENCE_CONTRACT_VERSION;
}>;

export type AlbumResearchClaimSemantic =
  | 'consumer-retail-sale'
  | 'retailer-panel-sale'
  | 'first-day-sale'
  | 'first-week-sale'
  | 'period-sale'
  | 'cumulative-sale'
  | 'preorder'
  | 'shipment'
  | 'chart-certified-unit'
  | 'rank'
  | 'index'
  | 'unknown';

export type AlbumResearchSemanticState =
  | 'clear'
  | 'definition-unverified'
  | 'ambiguous'
  | 'unknown'
  | 'conflicting';

export type AlbumResearchDefinitionState =
  | 'verified'
  | 'unverified'
  | 'not-applicable'
  | 'unknown';

export type AlbumResearchIdentityState =
  | 'resolved'
  | 'candidate'
  | 'ambiguous'
  | 'unresolved'
  | 'conflicting';

export type AlbumResearchIdentityCandidate = Readonly<{
  label: string;
  providerNativeId: string | null;
  source: 'provided-hint' | 'extracted-text' | 'unknown';
}>;

export type AlbumResearchIdentityResolution = Readonly<{
  fandexId: string | null;
  candidate: AlbumResearchIdentityCandidate | null;
  state: AlbumResearchIdentityState;
  reviewed: boolean;
  blockers: readonly string[];
}>;

export type AlbumResearchTemporalContract = Readonly<{
  providerPeriod: string | null;
  reportedPeriod: string | null;
  sourcePublishedAt: string | null;
  observedAt: string;
  collectedAt: string;
  revisionObservedAt: string | null;
  knowledgeMode: 'as-known-at-collection' | 'current-research';
}>;

export type AlbumResearchQualityState =
  | 'clear'
  | 'partial'
  | 'unknown'
  | 'conflicting';

export type AlbumResearchQualityMetadata = Readonly<{
  originQuality: AlbumResearchQualityState;
  providerAttributionClarity: AlbumResearchQualityState;
  semanticClarity: AlbumResearchQualityState;
  unitClarity: AlbumResearchQualityState;
  periodClarity: AlbumResearchQualityState;
  artistIdentityClarity: AlbumResearchQualityState;
  releaseIdentityClarity: AlbumResearchQualityState;
  territoryClarity: AlbumResearchQualityState;
  crossSourceAgreement: AlbumResearchQualityState;
  revisionState: AlbumResearchQualityState;
}>;

export type AlbumResearchShadowEligibility =
  | 'not-eligible'
  | 'normalized-research-ready'
  | 'shadow-feature-eligible';

export type AlbumResearchValueKind =
  | 'exact'
  | 'threshold'
  | 'threshold-label'
  | 'rank'
  | 'index'
  | 'none';

export type AlbumResearchConflictReason =
  | 'different-cutoff'
  | 'different-provider'
  | 'different-territory'
  | 'different-format-scope'
  | 'updated-figure'
  | 'correction'
  | 'source-error'
  | 'unknown';

export type AlbumResearchRevisionContract = Readonly<{
  revisionState: 'original' | 'possible-correction' | 'explicit-correction';
  supersedesClaimId: string | null;
  possibleCorrectionOf: readonly string[];
  conflictReason: AlbumResearchConflictReason | null;
}>;

export type AlbumResearchExtractionSpan = Readonly<{
  ordinal: number;
  start: number;
  end: number;
  text: string;
  textDigest: string;
}>;

export type AlbumResearchClaimBlocker =
  | 'artist-identity-unresolved'
  | 'release-identity-unresolved'
  | 'semantic-unknown'
  | 'semantic-definition-unverified'
  | 'unit-unknown'
  | 'period-unknown'
  | 'exact-value-missing'
  | 'provider-attribution-unknown'
  | 'territory-unknown'
  | 'threshold-only'
  | 'research-only';

export type AlbumResearchClaim = Readonly<{
  contractVersion: typeof ALBUM_RESEARCH_CLAIM_CONTRACT_VERSION;
  claimId: string;
  claimFamilyId: string;
  claimScopeId: string;
  sourceEvidenceId: string;
  origin: AlternativeEvidenceOrigin;
  acquisitionProvider: string;
  reportedProvider: string | null;
  artistId: string | null;
  artistCandidate: AlbumResearchIdentityCandidate | null;
  artistIdentityState: AlbumResearchIdentityState;
  releaseId: string | null;
  releaseCandidate: AlbumResearchIdentityCandidate | null;
  releaseIdentityState: AlbumResearchIdentityState;
  releaseFamilyCandidate: AlbumResearchIdentityCandidate | null;
  semantic: AlbumResearchClaimSemantic;
  semanticState: AlbumResearchSemanticState;
  definitionState: AlbumResearchDefinitionState;
  value: number | null;
  valueKind: AlbumResearchValueKind;
  unit: string | null;
  territory: string | null;
  providerPeriod: string | null;
  reportedPeriod: string | null;
  sourcePublishedAt: string | null;
  observedAt: string;
  collectedAt: string;
  revisionObservedAt: string | null;
  knowledgeMode: AlbumResearchTemporalContract['knowledgeMode'];
  evidenceDigest: string;
  extraction: AlbumResearchExtractionSpan;
  revision: AlbumResearchRevisionContract;
  researchOnly: true;
  shadowEligibility: AlbumResearchShadowEligibility;
  quality: AlbumResearchQualityMetadata;
  blockers: readonly AlbumResearchClaimBlocker[];
}>;

export type AlbumResearchClaimExtractionState =
  | 'no-album-claim'
  | 'claims-extracted'
  | 'claims-extracted-with-blockers';

export type AlbumResearchClaimExtractionResult = Readonly<{
  evidence: AlternativeEvidence;
  state: AlbumResearchClaimExtractionState;
  claims: readonly AlbumResearchClaim[];
  blockers: readonly string[];
}>;
