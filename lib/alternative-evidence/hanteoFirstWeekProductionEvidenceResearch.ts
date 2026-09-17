import {
  HANTEO_ALBUM_PRODUCTION_EVIDENCE,
  type AlbumNormalizationFreezeInputs,
  type AlbumProviderProductionEvidence,
} from './albumProductionReadinessResearch';
import { ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS } from './albumNormalizationResearch';
import { HANTEO_FIRST_WEEK_PERIOD_RESEARCH_DESCRIPTOR } from './hanteoFirstWeekPeriodResearch';

export const HANTEO_FIRST_WEEK_PRODUCTION_EVIDENCE_RESEARCH_VERSION =
  'hanteo-first-week-production-evidence-research-v1' as const;

export const HANTEO_FIRST_WEEK_PRODUCTION_EVIDENCE_RESEARCH = Object.freeze({
  ...HANTEO_ALBUM_PRODUCTION_EVIDENCE,
  periodSemantics: 'verified' as const,
  historicalQuerySemantics: 'partially-verified' as const,
  revisionSemantics: 'partially-verified' as const,
  constructEvidence:
    'Hanteo first-week album sales are release-relative physical-unit sales. Official Hanteo News examples define the counting period from release date through six additional KST calendar days. API acquisition/storage/publication rights remain unresolved.',
  evidenceUrls: Object.freeze([
    ...HANTEO_ALBUM_PRODUCTION_EVIDENCE.evidenceUrls,
    ...HANTEO_FIRST_WEEK_PERIOD_RESEARCH_DESCRIPTOR.evidenceUrls,
  ]),
}) satisfies AlbumProviderProductionEvidence;

export const HANTEO_FIRST_WEEK_NORMALIZATION_FREEZE_INPUTS_RESEARCH = Object.freeze({
  sourceAuthorizationResolved: false,
  providerPeriodDefinitionResolved:
    HANTEO_FIRST_WEEK_PRODUCTION_EVIDENCE_RESEARCH.periodSemantics === 'verified',
  baselineDefinitionResolved:
    ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.baselineDefinitionResolved,
  crossReleaseComparabilityResolved:
    ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.crossReleaseComparabilityResolved,
  transformationRuleDefined:
    ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.transformationRuleDefined,
  revisionPolicyResolved:
    ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.revisionPolicyResolved,
}) satisfies AlbumNormalizationFreezeInputs;
