export const BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION_CONTRACT_VERSION =
  'brand-fit-production-runtime-verification-v1' as const;

export const BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION =
  Object.freeze({
    contractVersion:
      BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION_CONTRACT_VERSION,
    runtime: 'render-production' as const,
    serviceId: 'srv-db1fgpegekts73djbji0' as const,
    verifiedRuntimeCommitSha:
      'fd5d0330f8eddd04406b308e65b076ca74ccdc99' as const,
    productSurface: '/artists/iu/fandex-beta' as const,
    workflowRunId: 37480201624 as const,
    workflowJobId: 112332605128 as const,
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
    ] as const),
    sideEffects: Object.freeze({
      providerCalls: 0 as const,
      blobWrites: 0 as const,
      databaseWrites: 0 as const,
      productActivations: 0 as const,
      publications: 0 as const,
    }),
    verified: true as const,
  });

export type BrandFitProductionRuntimeVerification =
  typeof BRAND_FIT_PRODUCTION_RUNTIME_VERIFICATION;
