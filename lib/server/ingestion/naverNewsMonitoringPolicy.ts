export type NaverNewsMonitoringActivation = 'manual-only' | 'recurring';
export type NaverNewsMonitoringExpectation = 'on_demand' | 'hourly';
export type NaverNewsRecurringMonitoringPolicy = Readonly<{ activation: 'recurring'; expectation: 'hourly'; graceMinutes: number; freshnessMinutes: number }>;
export type NaverNewsMonitoringPolicy = Readonly<{ activation: NaverNewsMonitoringActivation; expectation: NaverNewsMonitoringExpectation }>;

export const NAVER_NEWS_MANUAL_MONITORING_POLICY: NaverNewsMonitoringPolicy = Object.freeze({ activation: 'manual-only', expectation: 'on_demand' });

export type NaverNewsRecurringMonitoringObservation = Readonly<{
  hasJobs: boolean; observedAt: string; currentSlotStart: string;
  currentSlotOutcome: 'not_run' | 'in_progress' | 'succeeded' | 'failed';
  previousSlotStart: string; previousSlotOutcome: 'not_run' | 'in_progress' | 'succeeded' | 'failed';
  lastSucceededAt: string | null;
  expiredRunning: boolean;
  retryableFailed: boolean;
  deadLetter: boolean;
  malformedSchedulerKey: boolean;
  danglingNormalizedReference: boolean;
  consistencyMismatch: boolean;
}>;

export type NaverNewsRecurringMonitoringSeverity = 'no_data' | 'healthy' | 'attention' | 'critical';

function boundedMinutes(value: number): void {
  if (!Number.isSafeInteger(value) || value < 1 || value > 10_080) throw new Error('naver_news_monitoring_policy_invalid');
}

export function createNaverNewsRecurringMonitoringPolicy(graceMinutes: number, freshnessMinutes: number): NaverNewsRecurringMonitoringPolicy {
  boundedMinutes(graceMinutes); boundedMinutes(freshnessMinutes);
  return Object.freeze({ activation: 'recurring' as const, expectation: 'hourly' as const, graceMinutes, freshnessMinutes });
}

export function evaluateNaverNewsRecurringMonitoringSeverity(
  policy: NaverNewsRecurringMonitoringPolicy,
  observation: NaverNewsRecurringMonitoringObservation,
): NaverNewsRecurringMonitoringSeverity {
  if (policy.activation !== 'recurring' || policy.expectation !== 'hourly') throw new Error('naver_news_monitoring_policy_invalid');
  const parse = (value: string) => { if (typeof value !== 'string' || !value.endsWith('Z')) throw new Error('naver_news_monitoring_policy_invalid'); const parsed = Date.parse(value); if (!Number.isFinite(parsed)) throw new Error('naver_news_monitoring_policy_invalid'); return parsed; };
  const observed = parse(observation.observedAt); const current = parse(observation.currentSlotStart); const previous = parse(observation.previousSlotStart);
  if (observed < current || previous > current || current - previous !== 60 * 60 * 1000) throw new Error('naver_news_monitoring_policy_invalid');
  const success = observation.lastSucceededAt === null ? null : parse(observation.lastSucceededAt);
  if (success !== null && success > observed) throw new Error('naver_news_monitoring_policy_invalid');
  if (!observation.hasJobs) return 'no_data';
  if (observation.deadLetter || observation.malformedSchedulerKey || observation.danglingNormalizedReference || observation.consistencyMismatch) return 'critical';
  const currentAge = Math.floor((observed - current) / 60_000);
  if (observation.retryableFailed || observation.expiredRunning || observation.previousSlotOutcome === 'not_run'
      || (observation.currentSlotOutcome === 'not_run' && currentAge > policy.graceMinutes)
      || (success !== null && Math.floor((observed - success) / 60_000) > policy.freshnessMinutes)) return 'attention';
  return 'healthy';
}
