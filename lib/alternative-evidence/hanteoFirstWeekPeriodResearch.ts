import type { AlbumNormalizationFreezeInputs } from './albumProductionReadinessResearch';
import { ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS } from './albumNormalizationResearch';

export const HANTEO_FIRST_WEEK_PERIOD_RESEARCH_CONTRACT_VERSION =
  'hanteo-first-week-period-research-v1' as const;

export const HANTEO_FIRST_WEEK_PERIOD_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: HANTEO_FIRST_WEEK_PERIOD_RESEARCH_CONTRACT_VERSION,
  lifecycle: 'research' as const,
  providerId: 'hanteo-chart' as const,
  semantic: 'first-week-sale' as const,
  unit: 'physical-units' as const,
  periodTimezone: 'KST' as const,
  periodDefinition: 'release-date-through-release-date-plus-six-calendar-days-inclusive' as const,
  calendarDayCount: 7 as const,
  releaseRelative: true as const,
  calendarWeeklyChartEquivalent: false as const,
  providerPeriodDefinitionResolved: true as const,
  apiAcquisitionRightsResolved: false as const,
  apiHistoricalQueryContractResolved: false as const,
  apiRevisionContractResolved: false as const,
  evidenceUrls: Object.freeze([
    'https://www.hanteonews.com/ko/article/93077',
    'https://www.hanteonews.com/ko/article/42716',
    'https://www.hanteonews.com/ko/article/42866',
  ]),
  evidenceNotes: Object.freeze([
    'Hanteo News identifies the first day as the album release date.',
    'Official examples define the Initial Chodong period as seven consecutive calendar dates including release date.',
    'Daily ranking examples identify KST day boundaries separately from the seven-day release-relative period.',
    'This resolves period meaning only; it does not authorize FANDEX API acquisition, storage, retention, or publication.',
  ]),
});

export function buildHanteoFirstWeekNormalizationFreezeInputs(): AlbumNormalizationFreezeInputs {
  return Object.freeze({
    sourceAuthorizationResolved: false,
    providerPeriodDefinitionResolved: HANTEO_FIRST_WEEK_PERIOD_RESEARCH_DESCRIPTOR.providerPeriodDefinitionResolved,
    baselineDefinitionResolved: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.baselineDefinitionResolved,
    crossReleaseComparabilityResolved: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.crossReleaseComparabilityResolved,
    transformationRuleDefined: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.transformationRuleDefined,
    revisionPolicyResolved: ALBUM_NORMALIZATION_INTERNAL_DEFINITION_READINESS.revisionPolicyResolved,
  });
}
