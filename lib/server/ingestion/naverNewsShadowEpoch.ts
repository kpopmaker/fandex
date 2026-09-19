import { bindCanonicalArtistToNaverNews } from './naverNewsArtistBinding';
import {
  buildNaverNewsSchedulerPlan,
  NAVER_NEWS_SCHEDULER_CADENCE_MINUTES,
  NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  NAVER_NEWS_SCHEDULER_VERSION,
} from './naverNewsScheduler';

export const NAVER_NEWS_SHADOW_EPOCH_CONTRACT_VERSION =
  'v1_naver_news_shadow_epoch' as const;

export const NAVER_NEWS_IU_QSTASH_PRIMARY_PROTOCOL_START =
  '2026-09-15T16:00:00.000Z' as const;

export type NaverNewsShadowEpochContract = Readonly<{
  contractVersion: typeof NAVER_NEWS_SHADOW_EPOCH_CONTRACT_VERSION;
  lifecycle: 'shadow';
  directProductContributionEligible: false;
  canonicalArtistId: string;
  triggerMode: 'qstash-primary';
  schedulerVersion: typeof NAVER_NEWS_SCHEDULER_VERSION;
  cadenceMinutes: typeof NAVER_NEWS_SCHEDULER_CADENCE_MINUTES;
  protocolStart: string;
  historicalDataBeforeProtocolStart: 'outside_epoch';
  backfillAllowed: false;
}>;

const IU_QSTASH_PRIMARY_EPOCH: NaverNewsShadowEpochContract = Object.freeze({
  contractVersion: NAVER_NEWS_SHADOW_EPOCH_CONTRACT_VERSION,
  lifecycle: 'shadow' as const,
  directProductContributionEligible: false as const,
  canonicalArtistId: 'iu',
  triggerMode: 'qstash-primary' as const,
  schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
  cadenceMinutes: NAVER_NEWS_SCHEDULER_CADENCE_MINUTES,
  protocolStart: NAVER_NEWS_IU_QSTASH_PRIMARY_PROTOCOL_START,
  historicalDataBeforeProtocolStart: 'outside_epoch' as const,
  backfillAllowed: false as const,
});

export function getOfficialNaverNewsShadowEpoch(
  canonicalArtistId: string,
): NaverNewsShadowEpochContract {
  const binding = bindCanonicalArtistToNaverNews(canonicalArtistId);
  if (binding.canonicalArtistId !== IU_QSTASH_PRIMARY_EPOCH.canonicalArtistId) {
    throw new Error('naver_news_shadow_epoch_not_configured');
  }

  const plan = buildNaverNewsSchedulerPlan({
    query: binding.query,
    at: IU_QSTASH_PRIMARY_EPOCH.protocolStart,
    display: NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY,
  });
  if (plan.slotStart !== IU_QSTASH_PRIMARY_EPOCH.protocolStart) {
    throw new Error('naver_news_shadow_epoch_contract_invalid');
  }

  return IU_QSTASH_PRIMARY_EPOCH;
}
