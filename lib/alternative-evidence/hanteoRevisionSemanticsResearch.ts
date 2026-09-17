export const HANTEO_REVISION_SEMANTICS_RESEARCH_VERSION =
  'hanteo-revision-semantics-research-v1' as const;

export const HANTEO_REVISION_SEMANTICS_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: HANTEO_REVISION_SEMANTICS_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  providerId: 'hanteo-chart' as const,
  publicCorrectionBehaviorVerified: true as const,
  publishedSalesMayBeCorrected: true as const,
  correctionReasonsObserved: Object.freeze([
    'retailer-server-error',
    'collection-server-error',
    'duplicate-transmission',
    'missing-transmission',
    'incorrect-transmission',
    'cancellation-or-refund-adjustment',
  ]),
  fandexRevisionPolicy: 'corrected-value-supersedes-prior-value' as const,
  correctionIsNewIndependentObservation: false as const,
  asKnownAtCollectionMustRemainAvailable: true as const,
  currentResearchUsesLatestResolvedHead: true as const,
  apiRevisionIdentifierVerified: false as const,
  apiSupersessionFieldVerified: false as const,
  apiCorrectionDeliveryMechanismVerified: false as const,
  productionApiRevisionContractResolved: false as const,
  evidenceUrls: Object.freeze([
    'https://www.hanteochart.com/ko/notices',
    'https://hanteochart.com/ko/notices?c=241420',
  ]),
  evidenceNotes: Object.freeze([
    'Official Hanteo notices state that previously reflected sales quantities can be corrected after server/transmission/data validation issues.',
    'Official annual-chart guidance states final annual quantities can differ from previously announced totals after duplicate, cancellation, refund, and other adjustments are reviewed.',
    'These public notices verify correction semantics but do not document an API revision ID, supersession field, or machine-readable correction feed.',
  ]),
});
