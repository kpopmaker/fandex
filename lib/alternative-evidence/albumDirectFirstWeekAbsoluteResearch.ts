import { sha256Canonical } from '../shared/canonicalDigest';
import type { AlternativeEvidence } from './contracts';
import type { DirectAlbumObservation } from './directAlbumProvider';
import {
  CANONICAL_ALBUM_FEATURE_INPUT_CONTRACT_VERSION,
  fromDirectAlbumObservation,
  type CanonicalAlbumFeatureInput,
} from './canonicalAlbumFeatureInput';

export const ALBUM_DIRECT_FIRST_WEEK_ABSOLUTE_RESEARCH_VERSION =
  'album-direct-first-week-absolute-research-v1' as const;

export const ALBUM_DIRECT_FIRST_WEEK_ABSOLUTE_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: ALBUM_DIRECT_FIRST_WEEK_ABSOLUTE_RESEARCH_VERSION,
  lifecycle: 'research' as const,
  acceptedSemantic: 'first-week-sale' as const,
  acceptedUnit: 'physical-units' as const,
  acceptedSourceClass: 'direct-provider' as const,
  outputFeatureKey: 'physicalPurchaseAbsoluteLevel' as const,
  outputFeatureRole: 'absolute' as const,
  newsReportedFirstWeekPromotionAllowed: false as const,
  productionEligible: false as const,
  productScorePublished: false as const,
});

export function projectAuthorizedDirectFirstWeekAbsolute(
  observation: DirectAlbumObservation,
  evidence: AlternativeEvidence,
): readonly CanonicalAlbumFeatureInput[] {
  if (observation.semantic !== 'first-week-sale') {
    throw new Error('direct_first_week_absolute_semantic_required');
  }
  if (observation.unit !== 'physical-units') {
    throw new Error('direct_first_week_absolute_physical_units_required');
  }

  const [base] = fromDirectAlbumObservation(observation, evidence);
  if (!base || base.sourceClass !== 'direct-provider') {
    throw new Error('direct_first_week_absolute_direct_source_required');
  }
  if (base.provenance.origin !== 'direct-licensed-provider'
    && base.provenance.origin !== 'authorized-public-api') {
    throw new Error('direct_first_week_absolute_authorized_provenance_required');
  }

  const featureInputId = sha256Canonical({
    contractVersion: CANONICAL_ALBUM_FEATURE_INPUT_CONTRACT_VERSION,
    projectionVersion: ALBUM_DIRECT_FIRST_WEEK_ABSOLUTE_RESEARCH_VERSION,
    sourceFeatureInputId: base.featureInputId,
    sourceObservationId: base.sourceObservationId,
    featureKey: 'physicalPurchaseAbsoluteLevel',
    semantic: base.semantic,
    value: base.value,
    unit: base.unit,
    providerPeriod: base.providerPeriod,
    releaseId: base.releaseId,
  });
  const featureInputFamilyId = sha256Canonical({
    projectionVersion: ALBUM_DIRECT_FIRST_WEEK_ABSOLUTE_RESEARCH_VERSION,
    sourceFeatureInputFamilyId: base.featureInputFamilyId,
    featureKey: 'physicalPurchaseAbsoluteLevel',
    semantic: base.semantic,
    unit: base.unit,
    territory: base.territory,
    periodType: base.periodType,
    releaseId: base.releaseId,
  });

  return Object.freeze([
    Object.freeze({
      ...base,
      featureInputId,
      featureInputFamilyId,
      featureKey: 'physicalPurchaseAbsoluteLevel' as const,
      featureRole: 'absolute' as const,
      eligibilityState: base.availabilityState === 'available'
        ? 'feature-resolver-candidate' as const
        : base.eligibilityState,
      proxyFallbackState: base.availabilityState === 'available'
        ? 'absolute-available' as const
        : base.proxyFallbackState,
      comparabilityState: base.periodType === 'first-week'
        ? 'conditionally-comparable' as const
        : 'not-comparable' as const,
      blockers: Object.freeze([...base.blockers]),
    }),
  ]);
}
