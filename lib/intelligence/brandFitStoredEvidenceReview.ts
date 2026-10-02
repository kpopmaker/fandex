import {
  IU_ESTEE_LAUDER_NEW_NIGHT_CAMPAIGN_2025_BINDING,
} from './brandFitIdentityBindings';
import type {
  BrandFitCollectionHandoffResult,
} from './brandFitProductionCollectionHandoff';
import type {
  BrandFitPartnershipEvidence,
} from './brandFitPointConstruct';
import { sha256Canonical } from '../shared/canonicalDigest';

export const BRAND_FIT_STORED_EVIDENCE_REVIEW_VERSION =
  'brand-fit-stored-evidence-review-v1' as const;

export type BrandFitStoredEvidenceReviewResult =
  | Readonly<{
      status: 'storage-candidate';
      contractVersion:
        typeof BRAND_FIT_STORED_EVIDENCE_REVIEW_VERSION;
      evidenceDigest: string;
      evidence: BrandFitPartnershipEvidence;
      review: Readonly<{
        identityBound: true;
        sourceQualified: true;
        rightsState: 'restricted';
        rawProviderPayloadStored: false;
        rawTitleStored: false;
        rawDescriptionStored: false;
        numericDerivationEligible: false;
      }>;
      storageWriteAuthorized: false;
      productActivationAuthorized: false;
      publicPublicationAuthorized: false;
    }>
  | Readonly<{
      status: 'blocked';
      contractVersion:
        typeof BRAND_FIT_STORED_EVIDENCE_REVIEW_VERSION;
      reason:
        | 'handoff-not-eligible'
        | 'identity-mismatch'
        | 'source-contract-mismatch'
        | 'rights-state-mismatch'
        | 'retention-contract-mismatch'
        | 'numeric-interpretation-invalid';
      storageWriteAuthorized: false;
      productActivationAuthorized: false;
      publicPublicationAuthorized: false;
    }>;

function blocked(
  reason: Extract<
    BrandFitStoredEvidenceReviewResult,
    { status: 'blocked' }
  >['reason'],
): BrandFitStoredEvidenceReviewResult {
  return Object.freeze({
    status: 'blocked' as const,
    contractVersion: BRAND_FIT_STORED_EVIDENCE_REVIEW_VERSION,
    reason,
    storageWriteAuthorized: false as const,
    productActivationAuthorized: false as const,
    publicPublicationAuthorized: false as const,
  });
}

export function reviewBrandFitStoredEvidenceCandidate(
  handoff: BrandFitCollectionHandoffResult,
): BrandFitStoredEvidenceReviewResult {
  if (handoff.status !== 'eligible-for-stored-evidence-review') {
    return blocked('handoff-not-eligible');
  }

  const adapter = handoff.adapterResult;
  const evidence = adapter.evidence;
  const expected = IU_ESTEE_LAUDER_NEW_NIGHT_CAMPAIGN_2025_BINDING;

  if (
    evidence.identity.canonicalArtistId !== expected.canonicalArtistId
    || evidence.identity.canonicalBrandId !== expected.canonicalBrandId
    || evidence.identity.canonicalCampaignId !== expected.canonicalCampaignId
    || evidence.identity.identityState !== 'resolved'
  ) {
    return blocked('identity-mismatch');
  }

  if (
    evidence.variableId !== 'brandFitPoint'
    || evidence.constructId !== 'verified-commercial-partnership-activity'
    || evidence.eventType !== 'campaign-appearance'
    || evidence.relationshipType !== 'campaign-participant'
    || evidence.source.family !== 'official-brand-youtube-video'
    || evidence.source.reliability !== 'primary-official'
    || evidence.interpretation.evidenceKind !== 'verified-partnership-activity'
  ) {
    return blocked('source-contract-mismatch');
  }

  if (evidence.source.rightsState !== 'restricted') {
    return blocked('rights-state-mismatch');
  }

  if (
    adapter.rawMetadataRetention !== 'refresh-or-delete-within-30-days'
    || adapter.rawTitleStoredInEvidence !== false
    || adapter.rawDescriptionStoredInEvidence !== false
    || handoff.rawProviderPayloadRetentionAuthorized !== false
  ) {
    return blocked('retention-contract-mismatch');
  }

  if (
    evidence.interpretation.score !== null
    || evidence.interpretation.sentiment !== null
    || evidence.interpretation.inferredDealValue !== null
  ) {
    return blocked('numeric-interpretation-invalid');
  }

  return Object.freeze({
    status: 'storage-candidate' as const,
    contractVersion: BRAND_FIT_STORED_EVIDENCE_REVIEW_VERSION,
    evidenceDigest: sha256Canonical(evidence),
    evidence,
    review: Object.freeze({
      identityBound: true as const,
      sourceQualified: true as const,
      rightsState: 'restricted' as const,
      rawProviderPayloadStored: false as const,
      rawTitleStored: false as const,
      rawDescriptionStored: false as const,
      numericDerivationEligible: false as const,
    }),
    storageWriteAuthorized: false as const,
    productActivationAuthorized: false as const,
    publicPublicationAuthorized: false as const,
  });
}
