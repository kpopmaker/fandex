import 'server-only';

import { createHash, timingSafeEqual } from 'node:crypto';

import {
  adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationRuntime,
  type FandexMomentumVerifierOutputAttestationAdapterResult,
} from './naverNewsMomentumVerifierRuntimeAttestation';
import {
  runNaverNewsMomentumNativeVerifier,
  type NaverNewsMomentumNativeVerifierResult,
} from './naverNewsMomentumNativeVerifier';

export const NAVER_NEWS_MOMENTUM_VERIFIER_EXECUTION_CHANNEL_VERSION =
  'v162_naver_news_momentum_native_verifier_execution_channel_v1' as const;

export const NAVER_NEWS_MOMENTUM_VERIFIER_CHANNEL_ENABLED_ENV =
  'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_ENABLED' as const;
export const NAVER_NEWS_MOMENTUM_VERIFIER_CHANNEL_ENABLED_VALUE =
  'approved-v162-research-read-only' as const;
export const NAVER_NEWS_MOMENTUM_VERIFIER_CHANNEL_DEPLOYMENT_ENV =
  'FANDEX_MOMENTUM_NATIVE_VERIFIER_CHANNEL_DEPLOYMENT' as const;
export const NAVER_NEWS_MOMENTUM_VERIFIER_CHANNEL_DEPLOYMENT_VALUE =
  'production' as const;
export const NAVER_NEWS_MOMENTUM_VERIFIER_CHANNEL_SECRET_ENV =
  'FANDEX_MOMENTUM_NATIVE_VERIFIER_SECRET' as const;

export const NAVER_NEWS_MOMENTUM_VERIFIER_EXECUTION_CHANNEL_DESCRIPTOR =
  Object.freeze({
    contractVersion:
      NAVER_NEWS_MOMENTUM_VERIFIER_EXECUTION_CHANNEL_VERSION,
    lifecycle: 'research' as const,
    upstreamNativeVerifierContract:
      'v161_naver_news_momentum_native_verifier_output_v1' as const,
    downstreamAdapterContract:
      'v160_fandex_momentum_verifier_output_attestation_adapter_research_v1' as const,
    productionRuntimeOnly: true as const,
    previewExecutionAllowed: false as const,
    dedicatedAuthorizationRequired: true as const,
    schedulerAuthorizationReused: false as const,
    rawPayloadResponseAllowed: false as const,
    databaseWriteAllowed: false as const,
    productMetricReadAllowed: false as const,
    productMetricWriteAllowed: false as const,
    previewFallbackReadAllowed: false as const,
    registryMutationAllowed: false as const,
    productionActivationAllowed: false as const,
  });

export type NaverNewsMomentumVerifierExecutionChannelConfig = Readonly<{
  secret: string;
}>;

export type NaverNewsMomentumVerifierExecutionChannelRequest = Readonly<{
  contractVersion:
    'v162_naver_news_momentum_native_verifier_execution_request_v1';
  purpose: 'momentum-native-verifier-read-only';
  canonicalArtistId: string;
  throughSlotStart: string;
}>;

export type NaverNewsMomentumVerifierExecutionChannelResponse = Readonly<{
  contractVersion:
    typeof NAVER_NEWS_MOMENTUM_VERIFIER_EXECUTION_CHANNEL_VERSION;
  lifecycle: 'research';
  state: 'executed';
  canonicalArtistId: string;
  source: Readonly<{
    naverEvidenceId: string;
    naverCollectionKey: string;
    naverThroughSlotStart: string;
    naverStatus: 'succeeded';
  }>;
  nativeVerifier: Readonly<{
    digest: string;
    executionId: string;
    executedAt: string;
    databaseReadOnly: true;
    databaseWritesObserved: 0;
    evidenceRows: number;
    distinctEvidenceIds: number;
    distinctItemIndexes: number;
    minItemIndex: number;
    maxItemIndex: number;
    normalizedOutcomes: number;
    missingNormalizedIds: number;
    missingNormalizedRecords: number;
    distinctNormalizedRecords: number;
    joinedPayloadRows: number;
    rawPayloadTextBytes: number;
    normalizedPayloadTextBytes: number;
    rawLinkageSetAuditMd5: string;
    normalizedSetAuditMd5: string;
    rawPayloadMaterializedAuditMd5: string;
    normalizedPayloadMaterializedAuditMd5: string;
    auditFingerprintPurpose: 'read-integrity-only-not-methodology';
  }>;
  v160: Readonly<{
    state: 'attestation-adapted';
    digest: string;
    verifierOutputAccepted: true;
    attestation: NonNullable<
      FandexMomentumVerifierOutputAttestationAdapterResult['attestation']
    >;
  }>;
  effects: Readonly<{
    databaseReads: 2;
    databaseWrites: 0;
    productMetricReads: 0;
    productMetricWrites: 0;
    previewFallbackReads: 0;
    registryMutations: 0;
    productionActivations: 0;
  }>;
}>;

export type NaverNewsMomentumVerifierExecutionChannelDependencies = Readonly<{
  executeNativeVerifier?: typeof runNaverNewsMomentumNativeVerifier;
  adaptVerifierOutput?:
    typeof adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationRuntime;
}>;

function rejected(): never {
  throw new Error('naver_news_momentum_verifier_execution_channel_rejected');
}

function secret(value: unknown): string {
  if (
    typeof value !== 'string'
    || value.length < 24
    || Buffer.byteLength(value, 'utf8') > 512
    || /[\s\u0000-\u001f\u007f]/.test(value)
  ) {
    return rejected();
  }
  return value;
}

function exactIso(value: unknown): string {
  if (typeof value !== 'string') return rejected();
  const timestamp = Date.parse(value);
  if (
    !Number.isFinite(timestamp)
    || new Date(timestamp).toISOString() !== value
  ) {
    return rejected();
  }
  return value;
}

export function readNaverNewsMomentumVerifierExecutionChannelConfig(
  environment: Readonly<Record<string, string | undefined>>,
): NaverNewsMomentumVerifierExecutionChannelConfig {
  if (
    environment.VERCEL_ENV !== 'production'
    || environment[NAVER_NEWS_MOMENTUM_VERIFIER_CHANNEL_ENABLED_ENV]
      !== NAVER_NEWS_MOMENTUM_VERIFIER_CHANNEL_ENABLED_VALUE
    || environment[NAVER_NEWS_MOMENTUM_VERIFIER_CHANNEL_DEPLOYMENT_ENV]
      !== NAVER_NEWS_MOMENTUM_VERIFIER_CHANNEL_DEPLOYMENT_VALUE
  ) {
    return rejected();
  }

  return Object.freeze({
    secret: secret(
      environment[NAVER_NEWS_MOMENTUM_VERIFIER_CHANNEL_SECRET_ENV],
    ),
  });
}

export function isNaverNewsMomentumVerifierExecutionAuthorizationValid(
  authorizationHeader: unknown,
  configuredSecret: string,
): boolean {
  if (
    typeof authorizationHeader !== 'string'
    || !/^Bearer [^,\s]+$/.test(authorizationHeader)
    || typeof configuredSecret !== 'string'
    || configuredSecret.length < 24
  ) {
    return false;
  }

  const supplied = authorizationHeader.slice('Bearer '.length);
  const expectedDigest = createHash('sha256')
    .update(configuredSecret, 'utf8')
    .digest();
  const suppliedDigest = createHash('sha256')
    .update(supplied, 'utf8')
    .digest();

  return timingSafeEqual(expectedDigest, suppliedDigest);
}

export function parseNaverNewsMomentumVerifierExecutionChannelRequest(
  value: unknown,
): NaverNewsMomentumVerifierExecutionChannelRequest {
  if (
    value === null
    || typeof value !== 'object'
    || Array.isArray(value)
  ) {
    return rejected();
  }
  const row = value as Record<string, unknown>;
  const keys = Object.keys(row).sort();
  if (
    keys.join(',')
      !== [
        'canonicalArtistId',
        'contractVersion',
        'purpose',
        'throughSlotStart',
      ].sort().join(',')
    || row.contractVersion
      !== 'v162_naver_news_momentum_native_verifier_execution_request_v1'
    || row.purpose !== 'momentum-native-verifier-read-only'
    || typeof row.canonicalArtistId !== 'string'
    || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(row.canonicalArtistId)
  ) {
    return rejected();
  }

  return Object.freeze({
    contractVersion:
      'v162_naver_news_momentum_native_verifier_execution_request_v1',
    purpose: 'momentum-native-verifier-read-only',
    canonicalArtistId: row.canonicalArtistId,
    throughSlotStart: exactIso(row.throughSlotStart),
  });
}

function buildBoundedResponse(
  native: NaverNewsMomentumNativeVerifierResult,
  adapted: FandexMomentumVerifierOutputAttestationAdapterResult,
): NaverNewsMomentumVerifierExecutionChannelResponse {
  if (
    adapted.state !== 'attestation-adapted'
    || adapted.verifierOutputAccepted !== true
    || adapted.attestation === null
    || adapted.canonicalArtistId !== native.canonicalArtistId
    || adapted.naverEvidenceId !== native.snapshot.naverEvidenceId
    || adapted.naverThroughSlotStart
      !== native.snapshot.naverThroughSlotStart
  ) {
    return rejected();
  }

  const output = native.verifierOutput;
  return Object.freeze({
    contractVersion:
      NAVER_NEWS_MOMENTUM_VERIFIER_EXECUTION_CHANNEL_VERSION,
    lifecycle: 'research' as const,
    state: 'executed' as const,
    canonicalArtistId: native.canonicalArtistId,
    source: Object.freeze({
      naverEvidenceId: native.snapshot.naverEvidenceId,
      naverCollectionKey: native.snapshot.naverCollectionKey,
      naverThroughSlotStart: native.snapshot.naverThroughSlotStart,
      naverStatus: native.snapshot.naverStatus,
    }),
    nativeVerifier: Object.freeze({
      digest: native.digest,
      executionId: output.executionId,
      executedAt: output.executedAt,
      databaseReadOnly: true as const,
      databaseWritesObserved: 0 as const,
      evidenceRows: output.evidenceRows,
      distinctEvidenceIds: output.distinctEvidenceIds,
      distinctItemIndexes: output.distinctItemIndexes,
      minItemIndex: output.minItemIndex,
      maxItemIndex: output.maxItemIndex,
      normalizedOutcomes: output.normalizedOutcomes,
      missingNormalizedIds: output.missingNormalizedIds,
      missingNormalizedRecords: output.missingNormalizedRecords,
      distinctNormalizedRecords: output.distinctNormalizedRecords,
      joinedPayloadRows: output.joinedPayloadRows,
      rawPayloadTextBytes: output.rawPayloadTextBytes,
      normalizedPayloadTextBytes: output.normalizedPayloadTextBytes,
      rawLinkageSetAuditMd5: output.rawLinkageSetAuditMd5,
      normalizedSetAuditMd5: output.normalizedSetAuditMd5,
      rawPayloadMaterializedAuditMd5:
        output.rawPayloadMaterializedAuditMd5,
      normalizedPayloadMaterializedAuditMd5:
        output.normalizedPayloadMaterializedAuditMd5,
      auditFingerprintPurpose: output.auditFingerprintPurpose,
    }),
    v160: Object.freeze({
      state: 'attestation-adapted' as const,
      digest: adapted.digest,
      verifierOutputAccepted: true as const,
      attestation: adapted.attestation,
    }),
    effects: Object.freeze({
      databaseReads: 2 as const,
      databaseWrites: 0 as const,
      productMetricReads: 0 as const,
      productMetricWrites: 0 as const,
      previewFallbackReads: 0 as const,
      registryMutations: 0 as const,
      productionActivations: 0 as const,
    }),
  });
}

export async function runNaverNewsMomentumVerifierExecutionChannel(
  input: Readonly<{
    environment: Readonly<Record<string, string | undefined>>;
    authorizationHeader: unknown;
    requestBody: unknown;
  }>,
  dependencies: NaverNewsMomentumVerifierExecutionChannelDependencies = {},
): Promise<NaverNewsMomentumVerifierExecutionChannelResponse> {
  const config = readNaverNewsMomentumVerifierExecutionChannelConfig(
    input.environment,
  );
  if (
    !isNaverNewsMomentumVerifierExecutionAuthorizationValid(
      input.authorizationHeader,
      config.secret,
    )
  ) {
    return rejected();
  }

  const request = parseNaverNewsMomentumVerifierExecutionChannelRequest(
    input.requestBody,
  );
  const executeNativeVerifier =
    dependencies.executeNativeVerifier
    ?? runNaverNewsMomentumNativeVerifier;
  const native = await executeNativeVerifier(
    {
      canonicalArtistId: request.canonicalArtistId,
      throughSlotStart: request.throughSlotStart,
    },
    input.environment,
  );

  if (
    native.canonicalArtistId !== request.canonicalArtistId
    || native.snapshot.canonicalArtistId !== request.canonicalArtistId
    || native.snapshot.naverThroughSlotStart !== request.throughSlotStart
  ) {
    return rejected();
  }

  const adaptVerifierOutput =
    dependencies.adaptVerifierOutput
    ?? adaptFandexMomentumVerifierOutputToStoredEvidenceAttestationResearch;
  const adapted = adaptVerifierOutput({
    snapshot: native.snapshot,
    verifierOutput: native.verifierOutput,
  });

  return buildBoundedResponse(native, adapted);
}
