import type { NaverNewsNormalizedRecord } from '../ingestion/naverNewsContracts';
import {
  FANDEX_OBSERVATION_CONTRACT_VERSION,
  type FandexObservationV1,
} from '../../intelligence/observationContracts';
import { mapFandexDataLifecycle } from '../../intelligence/productionState';
import { createFandexObservation } from './fandexObservationFactory';

const NAVER_NEWS_LIFECYCLE_MAPPING = Object.freeze({
  'normalized-record': 'research',
} as const);

export function projectNaverNewsNormalizedRecord(
  record: NaverNewsNormalizedRecord,
): FandexObservationV1 {
  if (record.provider !== 'naver-news' || record.sourceType !== 'news_article') {
    throw new Error('naver_news_observation_source_contract_invalid');
  }

  return createFandexObservation({
    providerId: record.provider,
    entity: {
      entityType: record.sourceType,
      entityId: null,
      providerEntityId: record.recordId,
      identityState: 'provider-record-only',
    },
    variable: {
      variableId: 'naver-news.normalized-record-presence',
      metricFamily: 'news-evidence',
      role: 'normalized-record',
    },
    value: {
      rawValue: true,
      unit: null,
      missingState: 'observed',
    },
    time: {
      providerPeriodStart: record.publishedAt,
      providerPeriodEnd: record.publishedAt,
      observedAt: null,
      collectedAt: record.collectedAt,
    },
    evidence: {
      evidenceRef: record.rawEvidenceId,
      revision: record.recordSha256,
      conflictState: null,
    },
    lifecycle: mapFandexDataLifecycle({
      sourceState: 'normalized-record',
      materialClass: 'real',
      mapping: NAVER_NEWS_LIFECYCLE_MAPPING,
      blockers: ['naver-news-record-does-not-carry-production-authorization'],
    }),
    contractVersion: FANDEX_OBSERVATION_CONTRACT_VERSION,
  });
}
