import {
  canonicalJson,
  isSha256,
} from '../shared/canonicalDigest';
import {
  BRAND_FIT_IMMUTABLE_EVIDENCE_ROOT,
  decodeBrandFitImmutableEvidenceEnvelope,
} from './brandFitImmutableEvidenceRecord';

export const BRAND_FIT_PRODUCTION_OBSERVATION_RECEIPT_VERSION =
  'brand-fit-production-observation-receipt-v1' as const;

export type BrandFitProductionObservationReceiptResult =
  | Readonly<{
      status: 'accepted-receipt';
      contractVersion:
        typeof BRAND_FIT_PRODUCTION_OBSERVATION_RECEIPT_VERSION;
      evidenceDigest: string;
      payloadDigest: string;
      pathname: string;
      canonicalArtistId: 'iu';
      canonicalBrandId: 'estee-lauder';
      canonicalCampaignId:
        'estee-lauder-korea-new-night-campaign-2025-iu';
      storageWriteAuthorized: false;
      productActivationAuthorized: false;
      publicPublicationAuthorized: false;
    }>
  | Readonly<{
      status: 'invalid-receipt';
      contractVersion:
        typeof BRAND_FIT_PRODUCTION_OBSERVATION_RECEIPT_VERSION;
      reason:
        | 'json-invalid'
        | 'shape-invalid'
        | 'execution-status-invalid'
        | 'unexpected-sensitive-field'
        | 'review-binding-invalid'
        | 'immutable-record-invalid'
        | 'immutable-binding-invalid'
        | 'identity-invalid'
        | 'authorization-invalid';
    }>;

function invalid(
  reason: Extract<
    BrandFitProductionObservationReceiptResult,
    { status: 'invalid-receipt' }
  >['reason'],
): BrandFitProductionObservationReceiptResult {
  return Object.freeze({
    status: 'invalid-receipt' as const,
    contractVersion: BRAND_FIT_PRODUCTION_OBSERVATION_RECEIPT_VERSION,
    reason,
  });
}

function hasForbiddenField(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasForbiddenField);
  if (!value || typeof value !== 'object') return false;

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase();
    if (
      normalized === 'apikey'
      || normalized === 'api_key'
      || normalized === 'rawproviderpayload'
      || normalized === 'rawpayload'
      || normalized === 'title'
      || normalized === 'description'
    ) {
      return true;
    }
    if (hasForbiddenField(child)) return true;
  }
  return false;
}

function expectedPath(
  evidenceDigest: string,
): string {
  return [
    BRAND_FIT_IMMUTABLE_EVIDENCE_ROOT,
    'iu',
    'estee-lauder',
    evidenceDigest + '.json',
  ].join('/');
}

export function validateBrandFitProductionObservationReceipt(
  body: string,
): BrandFitProductionObservationReceiptResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return invalid('json-invalid');
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return invalid('shape-invalid');
  }

  if (hasForbiddenField(parsed)) {
    return invalid('unexpected-sensitive-field');
  }

  const row = parsed as Record<string, unknown>;
  if (
    row.status !== 'eligible-for-stored-evidence-review'
    || row.contractVersion !== 'brand-fit-youtube-manual-execution-v1'
    || row.providerRequestCount !== 1
    || row.databaseWritePerformed !== false
    || row.productActivationPerformed !== false
    || row.credentialIncludedInOutput !== false
  ) {
    return invalid('execution-status-invalid');
  }

  const review = row.storedEvidenceReview as
    | Record<string, unknown>
    | undefined;
  const immutable = row.immutableEvidenceObject as
    | Record<string, unknown>
    | undefined;
  const evidence = row.evidence;

  if (
    !review
    || !immutable
    || !evidence
    || typeof evidence !== 'object'
    || Array.isArray(evidence)
  ) {
    return invalid('shape-invalid');
  }

  const evidenceDigest = review.evidenceDigest;
  if (
    review.status !== 'storage-candidate'
    || review.contractVersion !== 'brand-fit-stored-evidence-review-v1'
    || !isSha256(evidenceDigest)
    || review.storageWriteAuthorized !== false
    || review.productActivationAuthorized !== false
    || review.publicPublicationAuthorized !== false
  ) {
    return invalid('review-binding-invalid');
  }

  if (
    typeof immutable.body !== 'string'
    || typeof immutable.pathname !== 'string'
    || !isSha256(immutable.payloadDigest)
    || immutable.evidenceDigest !== evidenceDigest
    || immutable.storageWriteAuthorized !== false
    || immutable.productActivationAuthorized !== false
    || immutable.publicPublicationAuthorized !== false
  ) {
    return invalid('immutable-binding-invalid');
  }

  let decoded;
  try {
    decoded = decodeBrandFitImmutableEvidenceEnvelope(immutable.body);
  } catch {
    return invalid('immutable-record-invalid');
  }

  if (
    decoded.evidenceDigest !== evidenceDigest
    || decoded.payloadDigest !== immutable.payloadDigest
    || canonicalJson(decoded.evidence) !== canonicalJson(evidence)
    || immutable.pathname !== expectedPath(evidenceDigest)
  ) {
    return invalid('immutable-binding-invalid');
  }

  if (
    decoded.canonicalArtistId !== 'iu'
    || decoded.canonicalBrandId !== 'estee-lauder'
    || decoded.canonicalCampaignId
      !== 'estee-lauder-korea-new-night-campaign-2025-iu'
    || decoded.evidence.variableId !== 'brandFitPoint'
  ) {
    return invalid('identity-invalid');
  }

  if (
    decoded.sourceRightsState !== 'restricted'
    || decoded.numericEligible !== false
  ) {
    return invalid('authorization-invalid');
  }

  return Object.freeze({
    status: 'accepted-receipt' as const,
    contractVersion: BRAND_FIT_PRODUCTION_OBSERVATION_RECEIPT_VERSION,
    evidenceDigest,
    payloadDigest: decoded.payloadDigest,
    pathname: immutable.pathname,
    canonicalArtistId: 'iu' as const,
    canonicalBrandId: 'estee-lauder' as const,
    canonicalCampaignId:
      'estee-lauder-korea-new-night-campaign-2025-iu' as const,
    storageWriteAuthorized: false as const,
    productActivationAuthorized: false as const,
    publicPublicationAuthorized: false as const,
  });
}
