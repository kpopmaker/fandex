import {
  getBrandFitStoredEvidenceCurrentRuntimeForIU,
} from '../../lib/server/product/brandFitStoredEvidenceRuntime';
import {
  adaptBrandFitPointToFandexVariableProduct,
} from '../../lib/product/adapters/brandFitPointFandexVariableProduct';

const EXPECTED_PATHNAME =
  'fandex/brand-fit/stored-evidence/v1/iu/estee-lauder/'
  + 'd597ee9e419cb8c5cd71a2206cc2b33b11652caa20bea3ff1f0fed3b68f91f96.json';
const EXPECTED_SOURCE_PUBLISHED_AT = '2025-08-04T02:30:02Z';
const EXPECTED_COLLECTED_AT = '2026-10-05T13:37:48.538Z';

async function main(): Promise<void> {
  const source = await getBrandFitStoredEvidenceCurrentRuntimeForIU();

  if (source.status !== 'ok') {
    throw new Error(
      'brand_fit_live_product_runtime_source_not_ok:'
        + source.status
        + ':'
        + ('reason' in source ? source.reason : 'unknown'),
    );
  }

  if (source.evidence.length !== 1) {
    throw new Error(
      'brand_fit_live_product_runtime_evidence_count_invalid:'
        + source.evidence.length,
    );
  }

  const evidence = source.evidence[0];
  if (
    evidence.variableId !== 'brandFitPoint'
    || evidence.eventId !== 'brand-fit:youtube:39CUlBDuRSo'
    || evidence.identity.canonicalArtistId !== 'iu'
    || evidence.identity.canonicalBrandId !== 'estee-lauder'
    || evidence.identity.canonicalCampaignId
      !== 'estee-lauder-korea-new-night-campaign-2025-iu'
    || evidence.source.sourcePublishedAt !== EXPECTED_SOURCE_PUBLISHED_AT
    || evidence.source.rightsState !== 'restricted'
    || evidence.time.collectedAt !== EXPECTED_COLLECTED_AT
    || evidence.interpretation.score !== null
    || evidence.interpretation.sentiment !== null
    || evidence.interpretation.inferredDealValue !== null
  ) {
    throw new Error(
      'brand_fit_live_product_runtime_evidence_contract_invalid',
    );
  }

  const adapted = adaptBrandFitPointToFandexVariableProduct({
    canonicalArtistId: 'iu',
    evidence: source.evidence,
  });

  if (adapted.status !== 'ok') {
    throw new Error(
      'brand_fit_live_product_runtime_adapter_blocked:'
        + adapted.reason,
    );
  }

  const record = adapted.record;
  if (
    record.variableId !== 'brandFitPoint'
    || record.canonicalArtistId !== 'iu'
    || record.lifecycleState !== 'research'
    || record.materialClass !== 'real'
    || record.readinessState !== 'research-only'
    || record.availability !== 'available'
    || record.valueRepresentation.kind !== 'event'
    || record.valueRepresentation.state
      !== 'verified-commercial-partnership-activity'
    || record.asOf !== EXPECTED_SOURCE_PUBLISHED_AT
    || record.observationTime.kind !== 'instant'
    || record.observationTime.observedAt !== EXPECTED_SOURCE_PUBLISHED_AT
    || record.collectionTime?.collectedAt !== EXPECTED_COLLECTED_AT
    || record.confidence !== 'insufficient'
    || record.coverage !== 'incomplete'
    || record.freshness !== 'unknown'
    || record.missingReason !== null
    || record.unsupportedReason !== null
    || record.blockerReason !== null
  ) {
    throw new Error(
      'brand_fit_live_product_runtime_product_record_invalid',
    );
  }

  if (
    record.evidenceRefs.some((ref) =>
      ref.includes('score:')
      || ref.includes('numeric:')
    )
  ) {
    throw new Error(
      'brand_fit_live_product_runtime_numeric_boundary_violated',
    );
  }

  process.stdout.write(JSON.stringify({
    status: 'ok',
    probeContractVersion:
      'brand-fit-live-product-runtime-read-probe-v1',
    sourceStatus: source.status,
    evidenceCount: source.evidence.length,
    canonicalArtistId: record.canonicalArtistId,
    canonicalBrandId: evidence.identity.canonicalBrandId,
    canonicalCampaignId: evidence.identity.canonicalCampaignId,
    sourcePublishedAt: evidence.source.sourcePublishedAt,
    rightsState: evidence.source.rightsState,
    numericScore: evidence.interpretation.score,
    productLifecycleState: record.lifecycleState,
    productMaterialClass: record.materialClass,
    productReadinessState: record.readinessState,
    productAvailability: record.availability,
    productValueKind: record.valueRepresentation.kind,
    productValueState:
      record.valueRepresentation.kind === 'event'
        ? record.valueRepresentation.state
        : null,
    expectedPathname: EXPECTED_PATHNAME,
    providerCalls: 0,
    blobWrites: 0,
    databaseWrites: 0,
    productActivations: 0,
    publications: 0,
  }) + '\n');
}

main().catch((error) => {
  process.stderr.write(
    (
      error instanceof Error
        ? error.message
        : 'brand_fit_live_product_runtime_probe_failed'
    ) + '\n',
  );
  process.exitCode = 1;
});
