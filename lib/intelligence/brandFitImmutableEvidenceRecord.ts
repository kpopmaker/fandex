import {
  canonicalJson,
  isSha256,
  sha256Canonical,
} from '../shared/canonicalDigest';
import type {
  BrandFitPartnershipEvidence,
} from './brandFitPointConstruct';
import type {
  BrandFitStoredEvidenceReviewResult,
} from './brandFitStoredEvidenceReview';

export const BRAND_FIT_IMMUTABLE_EVIDENCE_RECORD_VERSION =
  'brand-fit-immutable-evidence-record-v1' as const;

export const BRAND_FIT_IMMUTABLE_EVIDENCE_ROOT =
  'fandex/brand-fit/stored-evidence/v1' as const;

export type BrandFitImmutableEvidencePayload = Readonly<{
  contractVersion:
    typeof BRAND_FIT_IMMUTABLE_EVIDENCE_RECORD_VERSION;
  kind: 'brand-fit-partnership-evidence';
  canonicalArtistId: string;
  canonicalBrandId: string;
  canonicalCampaignId: string | null;
  eventId: string;
  evidenceDigest: string;
  evidence: BrandFitPartnershipEvidence;
  sourceRightsState: 'restricted';
  numericEligible: false;
}>;

export type BrandFitImmutableEvidenceEnvelope =
  BrandFitImmutableEvidencePayload & Readonly<{
    payloadDigest: string;
  }>;

export type BrandFitImmutableEvidenceObjectCandidate = Readonly<{
  pathname: string;
  body: string;
  payloadDigest: string;
  evidenceDigest: string;
  storageWriteAuthorized: false;
  productActivationAuthorized: false;
  publicPublicationAuthorized: false;
}>;

function cleanSegment(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(normalized)) {
    throw new Error('brand_fit_immutable_record_identity_invalid');
  }
  return normalized;
}

function objectPath(
  artistId: string,
  brandId: string,
  evidenceDigest: string,
): string {
  if (!isSha256(evidenceDigest)) {
    throw new Error('brand_fit_immutable_record_digest_invalid');
  }
  return [
    BRAND_FIT_IMMUTABLE_EVIDENCE_ROOT,
    cleanSegment(artistId),
    cleanSegment(brandId),
    evidenceDigest + '.json',
  ].join('/');
}

function payloadFromReview(
  review: Extract<
    BrandFitStoredEvidenceReviewResult,
    { status: 'storage-candidate' }
  >,
): BrandFitImmutableEvidencePayload {
  const evidence = review.evidence;

  if (
    review.storageWriteAuthorized !== false
    || review.productActivationAuthorized !== false
    || review.publicPublicationAuthorized !== false
    || review.review.rightsState !== 'restricted'
    || review.review.numericDerivationEligible !== false
    || evidence.source.rightsState !== 'restricted'
    || evidence.interpretation.score !== null
    || evidence.interpretation.sentiment !== null
    || evidence.interpretation.inferredDealValue !== null
    || review.evidenceDigest !== sha256Canonical(evidence)
  ) {
    throw new Error('brand_fit_immutable_record_review_invalid');
  }

  return Object.freeze({
    contractVersion: BRAND_FIT_IMMUTABLE_EVIDENCE_RECORD_VERSION,
    kind: 'brand-fit-partnership-evidence' as const,
    canonicalArtistId: evidence.identity.canonicalArtistId,
    canonicalBrandId: evidence.identity.canonicalBrandId,
    canonicalCampaignId: evidence.identity.canonicalCampaignId,
    eventId: evidence.eventId,
    evidenceDigest: review.evidenceDigest,
    evidence,
    sourceRightsState: 'restricted' as const,
    numericEligible: false as const,
  });
}

export function buildBrandFitImmutableEvidenceObjectCandidate(
  review: BrandFitStoredEvidenceReviewResult,
): BrandFitImmutableEvidenceObjectCandidate {
  if (review.status !== 'storage-candidate') {
    throw new Error('brand_fit_immutable_record_review_not_ready');
  }

  const payload = payloadFromReview(review);
  const payloadDigest = sha256Canonical(payload);
  const envelope: BrandFitImmutableEvidenceEnvelope = Object.freeze({
    ...payload,
    payloadDigest,
  });

  return Object.freeze({
    pathname: objectPath(
      payload.canonicalArtistId,
      payload.canonicalBrandId,
      payload.evidenceDigest,
    ),
    body: canonicalJson(envelope),
    payloadDigest,
    evidenceDigest: payload.evidenceDigest,
    storageWriteAuthorized: false as const,
    productActivationAuthorized: false as const,
    publicPublicationAuthorized: false as const,
  });
}

export function decodeBrandFitImmutableEvidenceEnvelope(
  body: string,
): BrandFitImmutableEvidenceEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error('brand_fit_immutable_record_payload_invalid');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('brand_fit_immutable_record_payload_invalid');
  }

  const row = parsed as Partial<BrandFitImmutableEvidenceEnvelope>;
  const evidence = row.evidence as BrandFitPartnershipEvidence | undefined;
  if (!evidence) {
    throw new Error('brand_fit_immutable_record_payload_invalid');
  }

  const payload: BrandFitImmutableEvidencePayload = Object.freeze({
    contractVersion: BRAND_FIT_IMMUTABLE_EVIDENCE_RECORD_VERSION,
    kind: 'brand-fit-partnership-evidence',
    canonicalArtistId: String(row.canonicalArtistId ?? ''),
    canonicalBrandId: String(row.canonicalBrandId ?? ''),
    canonicalCampaignId:
      row.canonicalCampaignId === null
        ? null
        : String(row.canonicalCampaignId ?? ''),
    eventId: String(row.eventId ?? ''),
    evidenceDigest: String(row.evidenceDigest ?? ''),
    evidence,
    sourceRightsState: 'restricted',
    numericEligible: false,
  });

  if (
    row.contractVersion !== BRAND_FIT_IMMUTABLE_EVIDENCE_RECORD_VERSION
    || row.kind !== 'brand-fit-partnership-evidence'
    || row.sourceRightsState !== 'restricted'
    || row.numericEligible !== false
    || !isSha256(payload.evidenceDigest)
    || payload.evidenceDigest !== sha256Canonical(evidence)
    || payload.canonicalArtistId !== evidence.identity.canonicalArtistId
    || payload.canonicalBrandId !== evidence.identity.canonicalBrandId
    || payload.canonicalCampaignId !== evidence.identity.canonicalCampaignId
    || payload.eventId !== evidence.eventId
    || evidence.source.rightsState !== 'restricted'
    || !isSha256(row.payloadDigest)
    || row.payloadDigest !== sha256Canonical(payload)
  ) {
    throw new Error('brand_fit_immutable_record_payload_invalid');
  }

  // Validate path-safe identity eagerly, even though decode itself does not
  // construct or write an object path.
  objectPath(
    payload.canonicalArtistId,
    payload.canonicalBrandId,
    payload.evidenceDigest,
  );

  return Object.freeze({
    ...payload,
    payloadDigest: row.payloadDigest,
  });
}
