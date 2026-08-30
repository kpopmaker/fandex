export type NaverNewsMonitoringActivation = 'manual-only' | 'recurring';
export type NaverNewsMonitoringExpectation = 'on_demand' | 'hourly';
export type NaverNewsRecurringMonitoringPolicy = Readonly<{ activation: 'recurring'; expectation: 'hourly'; graceMinutes: number; freshnessMinutes: number }>;
export type NaverNewsMonitoringPolicy = Readonly<{ activation: NaverNewsMonitoringActivation; expectation: NaverNewsMonitoringExpectation }>;

export const NAVER_NEWS_MANUAL_MONITORING_POLICY: NaverNewsMonitoringPolicy = Object.freeze({ activation: 'manual-only', expectation: 'on_demand' });

export type NaverNewsRecurringMonitoringSignals = Readonly<{
  hasJobs: boolean;
  currentSlotNotRun: boolean;
  previousSlotAbsent: boolean;
  freshnessStale: boolean;
  expiredRunning: boolean;
  retryableFailed: boolean;
  deadLetter: boolean;
  malformedSchedulerKey: boolean;
  danglingNormalizedReference: boolean;
  consistencyMismatch: boolean;
}>;

export type NaverNewsRecurringMonitoringSeverity = 'no_data' | 'healthy' | 'attention' | 'critical';

function boundedMinutes(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 10_080) throw new Error('naver_news_monitoring_policy_invalid');
}

export function createNaverNewsRecurringMonitoringPolicy(graceMinutes: number, freshnessMinutes: number): NaverNewsRecurringMonitoringPolicy & NaverNewsRecurringMonitoringPolicy {
  boundedMinutes(graceMinutes); if (graceMinutes < 1) throw new Error('naver_news_monitoring_policy_invalid');
  boundedMinutes(freshnessMinutes); if (freshnessMinutes < 1) throw new Error('naver_news_monitoring_policy_invalid');
  return Object.freeze({ activation: 'recurring' as const, expectation: 'hourly' as const, graceMinutes, freshnessMinutes });
}

export function evaluateNaverNewsRecurringMonitoringSeverity(
  policy: NaverNewsRecurringMonitoringPolicy,
  signals: NaverNewsRecurringMonitoringSignals,
): NaverNewsRecurringMonitoringSeverity {
  if (policy.activation !== 'recurring' || policy.expectation !== 'hourly') throw new Error('naver_news_monitoring_policy_invalid');
  if (!signals.hasJobs) return 'no_data';
  if (signals.deadLetter || signals.malformedSchedulerKey || signals.danglingNormalizedReference || signals.consistencyMismatch) return 'critical';
  if (signals.retryableFailed || signals.expiredRunning || signals.previousSlotAbsent || signals.freshnessStale) return 'attention';
  return 'healthy';
}
