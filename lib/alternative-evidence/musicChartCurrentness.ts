import type {
  MusicChartCurrentReadModel,
} from './musicChartObservationHistory';
import type {
  MusicChartPlatform,
} from './musicChartObservation';

export const MUSIC_CHART_CURRENTNESS_CONTRACT_VERSION =
  'music-chart-currentness-v1' as const;

export const MUSIC_CHART_DAILY_CADENCE_EVIDENCE = Object.freeze({
  cadence: 'daily' as const,
  timezone: 'Asia/Seoul' as const,
  upstreamWorkflow: '.github/workflows/lastfm-cloud-history.yml',
  upstreamWorkflowName: 'FANDEX Last.fm Cloud History',
  upstreamCron: '0 0 * * *',
  upstreamScheduledLocalTime: '09:00' as const,
  downstreamWorkflow: '.github/workflows/fandex-cloud-v10.yml',
  downstreamWorkflowName: 'FANDEX Cloud v10 Daily',
  downstreamTrigger: 'successful-upstream-workflow-run' as const,
});

export type MusicChartCurrentnessStatus =
  | 'current'
  | 'stale-evidence'
  | 'collection-gap'
  | 'unknown';

export type MusicChartCurrentnessAssessment = Readonly<{
  contractVersion: typeof MUSIC_CHART_CURRENTNESS_CONTRACT_VERSION;
  methodologyDefined: true;
  expectedCadence: 'daily';
  assessmentAsOf: string;
  assessmentDateKst: string;
  observationIds: readonly string[];
  platforms: readonly MusicChartPlatform[];
  providerEvidenceDate: string | null;
  continuityStartDate: string | null;
  continuityEndDate: string | null;
  observedCollectionDates: readonly string[];
  missingScheduledDates: readonly string[];
  calendarDayLag: number | null;
  status: MusicChartCurrentnessStatus;
  reasonCodes: readonly string[];
  thresholdApplied: false;
  scoreFieldsPresent: false;
  legacyHistoryStatusValuesPromoted: false;
}>;

const EXPECTED_PLATFORMS = Object.freeze(
  ['melon', 'genie', 'bugs'] as const,
);

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value;
}

function datePartsInKst(instant: string): string | null {
  const parsed = new Date(instant);
  if (Number.isNaN(parsed.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(parsed);

  const values = new Map(parts.map(part => [part.type, part.value]));
  const year = values.get('year');
  const month = values.get('month');
  const day = values.get('day');
  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
}

function providerEvidenceDate(
  row: MusicChartCurrentReadModel['rows'][number],
): string | null {
  const period = row.providerPeriod ?? '';
  const datePeriod = /^(?:daily-check-date|realtime-check-date|daily):(\d{4}-\d{2}-\d{2})$/
    .exec(period);
  if (datePeriod && validDate(datePeriod[1])) return datePeriod[1];

  const realtime = /^realtime:(.+)$/.exec(period);
  if (realtime) return datePartsInKst(realtime[1]);

  if (row.freshness.referenceKind === 'provider-observed-at') {
    return datePartsInKst(row.freshness.referenceAt);
  }

  return null;
}

function nextDate(value: string): string {
  const parsed = new Date(`${value}T00:00:00Z`);
  parsed.setUTCDate(parsed.getUTCDate() + 1);
  return parsed.toISOString().slice(0, 10);
}

function dayDifference(left: string, right: string): number {
  const leftMs = Date.parse(`${left}T00:00:00Z`);
  const rightMs = Date.parse(`${right}T00:00:00Z`);
  return Math.round((leftMs - rightMs) / (24 * 60 * 60 * 1000));
}

function missingDatesBetween(
  dates: readonly string[],
): readonly string[] {
  if (dates.length < 2) return Object.freeze([]);

  const observed = new Set(dates);
  const missing: string[] = [];
  let cursor = dates[0];
  const end = dates[dates.length - 1];

  while (cursor < end) {
    cursor = nextDate(cursor);
    if (!observed.has(cursor)) missing.push(cursor);
  }

  return Object.freeze(missing);
}

export function assessMusicChartCurrentness(input: Readonly<{
  music: MusicChartCurrentReadModel;
  collectionHistoryDates: readonly string[];
}>): MusicChartCurrentnessAssessment {
  const reasons: string[] = [];
  const assessmentDateKst = datePartsInKst(input.music.asOf);
  if (!assessmentDateKst) {
    throw new Error('music_chart_currentness_as_of_invalid');
  }

  const observationIds = Object.freeze(
    input.music.rows.map(row => row.observationId).sort(),
  );
  const platforms = Object.freeze(
    [...new Set(input.music.rows.map(row => row.platform))].sort(),
  );

  const validHistoryDates = [...new Set(
    input.collectionHistoryDates.filter(validDate),
  )].sort();
  const invalidHistoryDateCount =
    input.collectionHistoryDates.length
    - input.collectionHistoryDates.filter(validDate).length;

  if (invalidHistoryDateCount > 0) {
    reasons.push('collection-history-date-invalid');
  }

  const continuityStartDate = validHistoryDates[0] ?? null;
  const continuityEndDate =
    validHistoryDates[validHistoryDates.length - 1] ?? null;
  const missingScheduledDates =
    missingDatesBetween(validHistoryDates);

  if (missingScheduledDates.length > 0) {
    reasons.push('daily-cadence-gap-detected');
  }

  const uniqueProviderDates = [...new Set(
    input.music.rows
      .map(providerEvidenceDate)
      .filter((value): value is string => value !== null),
  )].sort();

  const allPlatformsPresent =
    platforms.length === EXPECTED_PLATFORMS.length
    && EXPECTED_PLATFORMS.every(platform =>
      platforms.includes(platform));

  if (!allPlatformsPresent) {
    reasons.push('expected-platform-set-incomplete');
  }

  if (input.music.rows.some(row =>
    row.status !== 'ranked' && row.status !== 'not-ranked')) {
    reasons.push('current-read-status-not-usable');
  }

  if (uniqueProviderDates.length === 0) {
    reasons.push('provider-evidence-date-unresolved');
  }
  if (uniqueProviderDates.length > 1) {
    reasons.push('provider-evidence-dates-disagree');
  }

  const date = uniqueProviderDates.length === 1
    ? uniqueProviderDates[0]
    : null;

  if (
    date !== null
    && continuityEndDate !== null
    && continuityEndDate !== date
  ) {
    reasons.push(
      continuityEndDate > date
        ? 'read-model-behind-collection-history'
        : 'collection-history-behind-read-model',
    );
  }

  const calendarDayLag = date === null
    ? null
    : dayDifference(assessmentDateKst, date);

  let status: MusicChartCurrentnessStatus = 'unknown';

  const structuralUnknown =
    invalidHistoryDateCount > 0
    || !allPlatformsPresent
    || input.music.rows.length === 0
    || input.music.rows.some(row =>
      row.status !== 'ranked' && row.status !== 'not-ranked')
    || date === null
    || continuityStartDate === null
    || continuityEndDate === null
    || (
      date !== null
      && continuityEndDate !== null
      && continuityEndDate !== date
    );

  if (structuralUnknown) {
    status = 'unknown';
  } else if (missingScheduledDates.length > 0) {
    status = 'collection-gap';
  } else if (calendarDayLag === 0) {
    status = 'current';
    reasons.push('provider-evidence-date-matches-assessment-date');
  } else if (calendarDayLag !== null && calendarDayLag > 0) {
    status = 'stale-evidence';
    reasons.push('provider-evidence-predates-assessment-date');
  } else {
    status = 'unknown';
    reasons.push('provider-evidence-date-after-assessment-date');
  }

  return Object.freeze({
    contractVersion: MUSIC_CHART_CURRENTNESS_CONTRACT_VERSION,
    methodologyDefined: true as const,
    expectedCadence: 'daily' as const,
    assessmentAsOf: input.music.asOf,
    assessmentDateKst,
    observationIds,
    platforms,
    providerEvidenceDate: date,
    continuityStartDate,
    continuityEndDate,
    observedCollectionDates: Object.freeze(validHistoryDates),
    missingScheduledDates,
    calendarDayLag,
    status,
    reasonCodes: Object.freeze([...new Set(reasons)].sort()),
    thresholdApplied: false as const,
    scoreFieldsPresent: false as const,
    legacyHistoryStatusValuesPromoted: false as const,
  });
}
