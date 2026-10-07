export const BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION_CONTRACT_VERSION =
  'brand-fit-production-runtime-verification-v1' as const;

export type BrandFitProductionRuntimeVerification = Readonly<{
  contractVersion:
    typeof BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION_CONTRACT_VERSION;
  runtime: 'render-production';
  serviceId: string;
  verifiedRuntimeCommitSha: string;
  productSurface: '/artists/iu/fandex-beta';
  workflowRunId: number;
  workflowJobId: number;
  requiredMarkers: Readonly<{
    valueState: 'verified-commercial-partnership-activity';
    lifecycleDisplay: 'Research';
    materialClass: 'real';
  }>;
  blockerMarkersAbsent: readonly string[];
  sideEffects: Readonly<{
    providerCalls: number;
    blobWrites: number;
    databaseWrites: number;
    productActivations: number;
    publications: number;
  }>;
  verified: boolean;
}>;

export const BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION:
  BrandFitProductionRuntimeVerification = Object.freeze({
    contractVersion:
      BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION_CONTRACT_VERSION,
    runtime: 'render-production' as const,
    serviceId: 'srv-db1fgpegekts73djbji0',
    verifiedRuntimeCommitSha:
      '05c21bb3b4923ed093f7ae14e485daaae4e7bdec',
    productSurface: '/artists/iu/fandex-beta' as const,
    workflowRunId: 37480201624,
    workflowJobId: 112566060764,
    requiredMarkers: Object.freeze({
      valueState:
        'verified-commercial-partnership-activity' as const,
      lifecycleDisplay: 'Research' as const,
      materialClass: 'real' as const,
    }),
    blockerMarkersAbsent: Object.freeze([
      '런타임 확인 필요',
      'durable-stored-evidence-runtime-unavailable',
      'durable-stored-evidence-not-found',
      'runtime-read-failed',
    ]),
    sideEffects: Object.freeze({
      providerCalls: 0,
      blobWrites: 0,
      databaseWrites: 0,
      productActivations: 0,
      publications: 0,
    }),
    verified: true,
  });
