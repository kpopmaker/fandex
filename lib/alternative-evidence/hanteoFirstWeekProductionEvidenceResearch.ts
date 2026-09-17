import {
  HANTEO_ALBUM_PRODUCTION_EVIDENCE,
  type AlbumProviderProductionEvidence,
} from './albumProductionReadinessResearch';
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
