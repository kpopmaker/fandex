import {
  canonicalJson,
  isSha256,
  sha256Canonical,
} from '../shared/canonicalDigest';
import {
  REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_CONTRACT_VERSION,
  REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_ID,
  type ReportedAlbumSalesProductionSourceCandidate,
} from './reportedAlbumSalesProductionSource';

export const REPORTED_ALBUM_SALES_IMMUTABLE_EVIDENCE_VERSION =
  'reported-album-sales-immutable-evidence-v1' as const;

export const REPORTED_ALBUM_SALES_IMMUTABLE_EVIDENCE_ROOT =
  'fandex/music-album/reported-web/stored-evidence/v1' as const;

export type ReportedAlbumSalesImmutableEvidencePayload = Readonly<{
  contractVersion:
    typeof REPORTED_ALBUM_SALES_IMMUTABLE_EVIDENCE_VERSION;
  kind: 'reported-hanteo-first-week-sales-evidence';
  sourceId: typeof REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_ID;
  canonicalArtistId: string;
  canonicalReleaseId: string;
  observationId: string;
  observationScopeId: string;
  evidenceDigest: string;
  sourceCandidateDigest: string;
  sourceCandidate: ReportedAlbumSalesProductionSourceCandidate;
  storedMaterialClass: 'factual-values-and-provenance-only';
  copyrightedExpressionStored: false;
  numericScoreStored: false;
}>;

export type ReportedAlbumSalesImmutableEvidenceEnvelope =
  ReportedAlbumSalesImmutableEvidencePayload & Readonly<{
    payloadDigest: string;
  }>;

export type ReportedAlbumSalesImmutableEvidenceObjectCandidate =
  Readonly<{
    pathname: string;
    body: string;
    evidenceDigest: string;
    sourceCandidateDigest: string;
    payloadDigest: string;
    storageWriteAuthorized: false;
    productActivationAuthorized: false;
    publicPublicationAuthorized: false;
  }>;

function cleanSegment(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9._-]{0,127}$/.test(normalized)) {
    throw new Error(
      'reported_album_sales_immutable_identity_invalid',
    );
  }
  return normalized;
}

function objectPath(
  canonicalArtistId: string,
  sourceCandidateDigest: string,
): string {
  if (!isSha256(sourceCandidateDigest)) {
    throw new Error(
      'reported_album_sales_immutable_digest_invalid',
    );
  }
  return [
    REPORTED_ALBUM_SALES_IMMUTABLE_EVIDENCE_ROOT,
    cleanSegment(canonicalArtistId),
    sourceCandidateDigest + '.json',
  ].join('/');
}

function assertEligibleCandidate(
  candidate: ReportedAlbumSalesProductionSourceCandidate,
): void {
  if (
    candidate.contractVersion
      !== REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_CONTRACT_VERSION
    || candidate.sourceId
      !== REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_ID
    || candidate.sourceType !== 'reported-web-evidence'
    || candidate.lifecycle !== 'production-candidate'
    || candidate.observationSource !== 'public-reporting-source'
    || candidate.extractionMethod !== 'reviewed-web-evidence'
    || candidate.underlyingProvider !== 'Hanteo Chart'
    || candidate.metricSemantic
      !== 'reported-hanteo-first-week-sales'
    || candidate.underlyingMetricSemantic
      !== 'hanteo-first-week-sales'
    || candidate.canonicalArtistId.trim() === ''
    || candidate.canonicalReleaseId === null
    || candidate.canonicalReleaseId.trim() === ''
    || candidate.releaseIdentityState !== 'resolved'
    || candidate.releaseIdentityReviewState !== 'human-reviewed'
    || candidate.releaseIdentityBindingId === null
    || candidate.observationId.trim() === ''
    || candidate.observationScopeId.trim() === ''
    || candidate.value === null
    || candidate.value <= 0
    || candidate.unit !== 'physical-copies'
    || candidate.providerPeriodStart === null
    || candidate.providerPeriodEnd === null
    || candidate.evidenceRefs.length === 0
    || candidate.conflictState !== 'none'
    || candidate.availability !== 'available'
    || candidate.rightsState !== 'authorized'
    || !isSha256(candidate.evidenceDigest)
    || candidate.blockers.length !== 0
    || candidate.durableNormalizedStorageEligible !== true
    || candidate.productSourceEligible !== true
    || candidate.periodInferenceUsed !== false
    || candidate.directProviderClaim !== false
    || candidate.licensedFeedClaim !== false
    || candidate.numericScoreProduced !== false
  ) {
    throw new Error(
      'reported_album_sales_immutable_source_candidate_invalid',
    );
  }
}

function payloadFromCandidate(
  candidate: ReportedAlbumSalesProductionSourceCandidate,
): ReportedAlbumSalesImmutableEvidencePayload {
  assertEligibleCandidate(candidate);
  const canonicalReleaseId = candidate.canonicalReleaseId;
  if (canonicalReleaseId === null) {
    throw new Error(
      'reported_album_sales_immutable_release_identity_missing',
    );
  }
  const sourceCandidateDigest = sha256Canonical(candidate);

  return Object.freeze({
    contractVersion:
      REPORTED_ALBUM_SALES_IMMUTABLE_EVIDENCE_VERSION,
    kind: 'reported-hanteo-first-week-sales-evidence' as const,
    sourceId: REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_ID,
    canonicalArtistId: candidate.canonicalArtistId,
    canonicalReleaseId,
    observationId: candidate.observationId,
    observationScopeId: candidate.observationScopeId,
    evidenceDigest: candidate.evidenceDigest,
    sourceCandidateDigest,
    sourceCandidate: candidate,
    storedMaterialClass:
      'factual-values-and-provenance-only' as const,
    copyrightedExpressionStored: false as const,
    numericScoreStored: false as const,
  });
}

export function buildReportedAlbumSalesImmutableEvidenceObjectCandidate(
  candidate: ReportedAlbumSalesProductionSourceCandidate,
): ReportedAlbumSalesImmutableEvidenceObjectCandidate {
  const payload = payloadFromCandidate(candidate);
  const payloadDigest = sha256Canonical(payload);
  const envelope: ReportedAlbumSalesImmutableEvidenceEnvelope =
    Object.freeze({
      ...payload,
      payloadDigest,
    });

  return Object.freeze({
    pathname: objectPath(
      payload.canonicalArtistId,
      payload.sourceCandidateDigest,
    ),
    body: canonicalJson(envelope),
    evidenceDigest: payload.evidenceDigest,
    sourceCandidateDigest: payload.sourceCandidateDigest,
    payloadDigest,
    storageWriteAuthorized: false as const,
    productActivationAuthorized: false as const,
    publicPublicationAuthorized: false as const,
  });
}

export function decodeReportedAlbumSalesImmutableEvidenceEnvelope(
  body: string,
): ReportedAlbumSalesImmutableEvidenceEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error(
      'reported_album_sales_immutable_payload_invalid',
    );
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(
      'reported_album_sales_immutable_payload_invalid',
    );
  }

  const row =
    parsed as Partial<ReportedAlbumSalesImmutableEvidenceEnvelope>;
  const candidate =
    row.sourceCandidate as
      | ReportedAlbumSalesProductionSourceCandidate
      | undefined;

  if (!candidate) {
    throw new Error(
      'reported_album_sales_immutable_payload_invalid',
    );
  }
  assertEligibleCandidate(candidate);

  const sourceCandidateDigest = sha256Canonical(candidate);
  const canonicalReleaseId = candidate.canonicalReleaseId;
  if (canonicalReleaseId === null) {
    throw new Error(
      'reported_album_sales_immutable_payload_invalid',
    );
  }

  const payload: ReportedAlbumSalesImmutableEvidencePayload =
    Object.freeze({
      contractVersion:
        REPORTED_ALBUM_SALES_IMMUTABLE_EVIDENCE_VERSION,
      kind: 'reported-hanteo-first-week-sales-evidence',
      sourceId: REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_ID,
      canonicalArtistId: candidate.canonicalArtistId,
      canonicalReleaseId,
      observationId: candidate.observationId,
      observationScopeId: candidate.observationScopeId,
      evidenceDigest: candidate.evidenceDigest,
      sourceCandidateDigest,
      sourceCandidate: candidate,
      storedMaterialClass:
        'factual-values-and-provenance-only',
      copyrightedExpressionStored: false,
      numericScoreStored: false,
    });

  if (
    row.contractVersion
      !== REPORTED_ALBUM_SALES_IMMUTABLE_EVIDENCE_VERSION
    || row.kind
      !== 'reported-hanteo-first-week-sales-evidence'
    || row.sourceId
      !== REPORTED_ALBUM_SALES_PRODUCTION_SOURCE_ID
    || row.canonicalArtistId !== payload.canonicalArtistId
    || row.canonicalReleaseId !== payload.canonicalReleaseId
    || row.observationId !== payload.observationId
    || row.observationScopeId !== payload.observationScopeId
    || row.evidenceDigest !== payload.evidenceDigest
    || row.sourceCandidateDigest !== sourceCandidateDigest
    || row.storedMaterialClass
      !== 'factual-values-and-provenance-only'
    || row.copyrightedExpressionStored !== false
    || row.numericScoreStored !== false
    || !isSha256(row.payloadDigest)
    || row.payloadDigest !== sha256Canonical(payload)
  ) {
    throw new Error(
      'reported_album_sales_immutable_payload_invalid',
    );
  }

  objectPath(
    payload.canonicalArtistId,
    payload.sourceCandidateDigest,
  );

  return Object.freeze({
    ...payload,
    payloadDigest: row.payloadDigest,
  });
}

export function expectedReportedAlbumSalesImmutableEvidencePath(
  envelope: Pick<
    ReportedAlbumSalesImmutableEvidenceEnvelope,
    'canonicalArtistId' | 'sourceCandidateDigest'
  >,
): string {
  return objectPath(
    envelope.canonicalArtistId,
    envelope.sourceCandidateDigest,
  );
}
