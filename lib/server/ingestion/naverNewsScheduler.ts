import {
  buildNaverNewsJobIdentity,
  NAVER_NEWS_JOB_MAX_ATTEMPTS,
  NAVER_NEWS_PROVIDER,
  sha256Canonical,
  type NaverNewsIngestionCommand,
} from './naverNewsContracts';

export const NAVER_NEWS_SCHEDULER_VERSION = 'v125_naver_news_scheduler_v1';
export const NAVER_NEWS_SCHEDULER_CADENCE_MINUTES = 60;
export const NAVER_NEWS_SCHEDULER_MAX_CATCHUP_SLOTS = 0;
export const NAVER_NEWS_SCHEDULER_IMMEDIATE_RETRIES = 0;
export const NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY = 100;

const MAX_QUERY_BYTES = 512;

export type NaverNewsSchedulerPlanInput = Readonly<{
  query: string;
  at: string | Date;
  display?: number;
}>;

export type NaverNewsSchedulerPlan = Readonly<{
  schedulerVersion: typeof NAVER_NEWS_SCHEDULER_VERSION;
  activation: 'disabled';
  cadenceMinutes: typeof NAVER_NEWS_SCHEDULER_CADENCE_MINUTES;
  slotStart: string;
  nextSlotStart: string;
  collectionKey: string;
  workerId: string;
  command: NaverNewsIngestionCommand;
  retryPolicy: Readonly<{
    schedulerImmediateRetries: typeof NAVER_NEWS_SCHEDULER_IMMEDIATE_RETRIES;
    repositoryMaxAttempts: typeof NAVER_NEWS_JOB_MAX_ATTEMPTS;
  }>;
  catchUpPolicy: Readonly<{
    maxCatchUpSlots: typeof NAVER_NEWS_SCHEDULER_MAX_CATCHUP_SLOTS;
  }>;
  effects: Readonly<{
    apiCalls: 0;
    databaseConnections: 0;
    databaseQueries: 0;
    databaseWrites: 0;
    schedulesActivated: 0;
    environmentMutations: 0;
  }>;
}>;

function byteLength(value: string): number {
  return Buffer.byteLength(value, 'utf8');
}

function normalizeQuery(value: string): string {
  if (typeof value !== 'string') throw new Error('naver_news_scheduler_query_invalid');
  const normalized = value.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!normalized || byteLength(normalized) > MAX_QUERY_BYTES) {
    throw new Error('naver_news_scheduler_query_invalid');
  }
  return normalized;
}

function parseInstant(value: string | Date): Date {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('naver_news_scheduler_time_invalid');
  return date;
}

function schedulerDisplay(value: number | undefined): number {
  const display = value ?? NAVER_NEWS_SCHEDULER_DEFAULT_DISPLAY;
  if (!Number.isInteger(display) || display < 1 || display > 100) {
    throw new Error('naver_news_scheduler_display_invalid');
  }
  return display;
}

function floorToCadence(date: Date): Date {
  const milliseconds = NAVER_NEWS_SCHEDULER_CADENCE_MINUTES * 60 * 1000;
  return new Date(Math.floor(date.getTime() / milliseconds) * milliseconds);
}

function slotStamp(date: Date): string {
  return date.toISOString()
    .replace(/[-:]/g, '')
    .replace('.000Z', 'z')
    .replace('T', 't');
}

export function buildNaverNewsSchedulerPlan(input: NaverNewsSchedulerPlanInput): NaverNewsSchedulerPlan {
  const query = normalizeQuery(input.query);
  const at = parseInstant(input.at);
  const display = schedulerDisplay(input.display);
  const slot = floorToCadence(at);
  const nextSlot = new Date(slot.getTime() + NAVER_NEWS_SCHEDULER_CADENCE_MINUTES * 60 * 1000);
  const stamp = slotStamp(slot);
  const queryFingerprint = sha256Canonical({
    schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
    query,
  }).slice(0, 12);
  const collectionKey = `sched-v125-naver-news-${stamp}-${queryFingerprint}`;
  const workerId = `scheduler-v125-${stamp}-${queryFingerprint}`;
  const command = Object.freeze({
    provider: NAVER_NEWS_PROVIDER,
    collectionKey,
    query,
    display,
    start: 1,
    sort: 'date' as const,
  });

  buildNaverNewsJobIdentity(command);

  return Object.freeze({
    schedulerVersion: NAVER_NEWS_SCHEDULER_VERSION,
    activation: 'disabled' as const,
    cadenceMinutes: NAVER_NEWS_SCHEDULER_CADENCE_MINUTES,
    slotStart: slot.toISOString(),
    nextSlotStart: nextSlot.toISOString(),
    collectionKey,
    workerId,
    command,
    retryPolicy: Object.freeze({
      schedulerImmediateRetries: NAVER_NEWS_SCHEDULER_IMMEDIATE_RETRIES,
      repositoryMaxAttempts: NAVER_NEWS_JOB_MAX_ATTEMPTS,
    }),
    catchUpPolicy: Object.freeze({
      maxCatchUpSlots: NAVER_NEWS_SCHEDULER_MAX_CATCHUP_SLOTS,
    }),
    effects: Object.freeze({
      apiCalls: 0 as const,
      databaseConnections: 0 as const,
      databaseQueries: 0 as const,
      databaseWrites: 0 as const,
      schedulesActivated: 0 as const,
      environmentMutations: 0 as const,
    }),
  });
}
