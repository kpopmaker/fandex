import type { AlternativeEvidence } from './contracts';
import type { DirectAlbumObservation } from './directAlbumProvider';
import {
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
  canonicalDirectTransformRequired: true as const,
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
  if (base.featureKey !== 'physicalPurchaseAbsoluteLevel'
    || base.featureRole !== 'absolute'
    || base.semantic !== 'first-week-sale'
    || base.periodType !== 'first-week') {
    throw new Error('direct_first_week_absolute_canonical_transform_mismatch');
  }

  return Object.freeze([base]);
}
