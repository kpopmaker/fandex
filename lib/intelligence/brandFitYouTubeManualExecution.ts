import {
  buildBrandFitYouTubeApiRequestDescriptor,
  parseBrandFitYouTubeApiObservation,
} from './brandFitYouTubeApiRequest';
import {
  prepareBrandFitYouTubeEvidenceCandidate,
  type BrandFitCollectionHandoffResult,
} from './brandFitProductionCollectionHandoff';
import {
  IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
} from './brandFitIdentityBindings';
import type {
  BrandFitYouTubeComplianceControls,
} from './brandFitSourceQualification';
import {
  reviewBrandFitStoredEvidenceCandidate,
  type BrandFitStoredEvidenceReviewResult,
} from './brandFitStoredEvidenceReview';
import {
  buildBrandFitImmutableEvidenceObjectCandidate,
  type BrandFitImmutableEvidenceObjectCandidate,
} from './brandFitImmutableEvidenceRecord';

export const BRAND_FIT_YOUTUBE_MANUAL_EXECUTION_VERSION =
  'brand-fit-youtube-manual-execution-v1' as const;

const MAX_RESPONSE_BYTES = 250_000;
const DEFAULT_TIMEOUT_MS = 10_000;

export type BrandFitYouTubeManualFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type BrandFitYouTubeManualExecutionResult =
  | Readonly<{
      status: 'eligible-for-stored-evidence-review';
      contractVersion: typeof BRAND_FIT_YOUTUBE_MANUAL_EXECUTION_VERSION;
      handoff: Extract<
        BrandFitCollectionHandoffResult,
        { status: 'eligible-for-stored-evidence-review' }
      >;
      storedEvidenceReview: Extract<
        BrandFitStoredEvidenceReviewResult,
        { status: 'storage-candidate' }
      >;
      immutableEvidenceObject: BrandFitImmutableEvidenceObjectCandidate;
      providerRequestCount: 1;
      databaseWritePerformed: false;
      productActivationPerformed: false;
      credentialIncludedInOutput: false;
    }>
  | Readonly<{
      status: 'blocked';
      contractVersion: typeof BRAND_FIT_YOUTUBE_MANUAL_EXECUTION_VERSION;
      reason:
        | 'credential-invalid'
        | 'request-failed'
        | 'http-failed'
        | 'response-invalid'
        | 'observation-rejected'
        | 'evidence-handoff-rejected'
        | 'evidence-review-rejected';
      providerRequestCount: 0 | 1;
      databaseWritePerformed: false;
      productActivationPerformed: false;
      credentialIncludedInOutput: false;
    }>;

function blocked(
  reason: Extract<
    BrandFitYouTubeManualExecutionResult,
    { status: 'blocked' }
  >['reason'],
  providerRequestCount: 0 | 1,
): BrandFitYouTubeManualExecutionResult {
  return Object.freeze({
    status: 'blocked' as const,
    contractVersion: BRAND_FIT_YOUTUBE_MANUAL_EXECUTION_VERSION,
    reason,
    providerRequestCount,
    databaseWritePerformed: false as const,
    productActivationPerformed: false as const,
    credentialIncludedInOutput: false as const,
  });
}

function validApiKey(value: string): boolean {
  return (
    value.length >= 8
    && value.length <= 512
    && value === value.trim()
    && !/[\u0000-\u001f\u007f]/.test(value)
  );
}

function responseByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export async function executeBrandFitYouTubeObservation(input: Readonly<{
  apiKey: string;
  compliance: BrandFitYouTubeComplianceControls;
  fetch?: BrandFitYouTubeManualFetch;
  now?: () => Date;
  timeoutMilliseconds?: number;
}>): Promise<BrandFitYouTubeManualExecutionResult> {
  if (!validApiKey(input.apiKey)) {
    return blocked('credential-invalid', 0);
  }

  const request = buildBrandFitYouTubeApiRequestDescriptor();
  const url = new URL(request.endpoint);
  url.searchParams.set('part', request.query.part);
  url.searchParams.set('id', request.query.id);
  url.searchParams.set('key', input.apiKey);

  const externalFetch = input.fetch ?? fetch;
  const timeoutMilliseconds =
    input.timeoutMilliseconds ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    timeoutMilliseconds,
  );

  let response: Response;
  try {
    response = await externalFetch(url, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    return blocked('request-failed', 1);
  }
  clearTimeout(timeout);

  if (!response.ok) {
    return blocked('http-failed', 1);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) {
    return blocked('response-invalid', 1);
  }

  const declaredLength = response.headers.get('content-length');
  if (
    declaredLength !== null
    && Number.isFinite(Number(declaredLength))
    && Number(declaredLength) > MAX_RESPONSE_BYTES
  ) {
    return blocked('response-invalid', 1);
  }

  let body: string;
  try {
    body = await response.text();
  } catch {
    return blocked('response-invalid', 1);
  }
  if (responseByteLength(body) > MAX_RESPONSE_BYTES) {
    return blocked('response-invalid', 1);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return blocked('response-invalid', 1);
  }

  const collectedAt = (input.now ?? (() => new Date()))().toISOString();
  const observation = parseBrandFitYouTubeApiObservation(
    payload,
    collectedAt,
  );
  if (observation.status !== 'ok') {
    return blocked('observation-rejected', 1);
  }

  const handoff = prepareBrandFitYouTubeEvidenceCandidate({
    executionOwner: 'production-operations',
    plan: IU_ESTEE_LAUDER_NEW_NIGHT_YOUTUBE_COLLECTION_PLAN,
    compliance: input.compliance,
    providerObservation: observation.observation,
  });
  if (handoff.status !== 'eligible-for-stored-evidence-review') {
    return blocked('evidence-handoff-rejected', 1);
  }

  const storedEvidenceReview = reviewBrandFitStoredEvidenceCandidate(handoff);
  if (storedEvidenceReview.status !== 'storage-candidate') {
    return blocked('evidence-review-rejected', 1);
  }

  const immutableEvidenceObject =
    buildBrandFitImmutableEvidenceObjectCandidate(storedEvidenceReview);

  return Object.freeze({
    status: 'eligible-for-stored-evidence-review' as const,
    contractVersion: BRAND_FIT_YOUTUBE_MANUAL_EXECUTION_VERSION,
    handoff,
    storedEvidenceReview,
    immutableEvidenceObject,
    providerRequestCount: 1 as const,
    databaseWritePerformed: false as const,
    productActivationPerformed: false as const,
    credentialIncludedInOutput: false as const,
  });
}

export function sanitizeBrandFitYouTubeManualExecutionResult(
  result: BrandFitYouTubeManualExecutionResult,
): unknown {
  if (result.status === 'blocked') return result;

  const evidence = result.handoff.adapterResult.evidence;
  const review = result.storedEvidenceReview;
  return Object.freeze({
    status: result.status,
    contractVersion: result.contractVersion,
    providerRequestCount: result.providerRequestCount,
    databaseWritePerformed: result.databaseWritePerformed,
    productActivationPerformed: result.productActivationPerformed,
    credentialIncludedInOutput: result.credentialIncludedInOutput,
    storedEvidenceReview: Object.freeze({
      status: review.status,
      contractVersion: review.contractVersion,
      evidenceDigest: review.evidenceDigest,
      review: review.review,
      storageWriteAuthorized: review.storageWriteAuthorized,
      productActivationAuthorized: review.productActivationAuthorized,
      publicPublicationAuthorized: review.publicPublicationAuthorized,
    }),
    immutableEvidenceObject: Object.freeze({
      pathname: result.immutableEvidenceObject.pathname,
      body: result.immutableEvidenceObject.body,
      payloadDigest: result.immutableEvidenceObject.payloadDigest,
      evidenceDigest: result.immutableEvidenceObject.evidenceDigest,
      storageWriteAuthorized:
        result.immutableEvidenceObject.storageWriteAuthorized,
      productActivationAuthorized:
        result.immutableEvidenceObject.productActivationAuthorized,
      publicPublicationAuthorized:
        result.immutableEvidenceObject.publicPublicationAuthorized,
    }),
    evidence: Object.freeze({
      variableId: evidence.variableId,
      eventId: evidence.eventId,
      eventType: evidence.eventType,
      relationshipType: evidence.relationshipType,
      identity: evidence.identity,
      source: Object.freeze({
        family: evidence.source.family,
        reliability: evidence.source.reliability,
        sourceUrl: evidence.source.sourceUrl,
        sourcePublishedAt: evidence.source.sourcePublishedAt,
        rightsState: evidence.source.rightsState,
      }),
      time: evidence.time,
      revision: evidence.revision,
      interpretation: evidence.interpretation,
    }),
  });
}
