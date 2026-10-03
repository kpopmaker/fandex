import type {
  DirectAlbumObservation,
} from '../../alternative-evidence/directAlbumProvider';
import type {
  MusicChartCurrentReadRow,
} from '../../alternative-evidence/musicChartObservationHistory';

export const MUSIC_ALBUM_TEMPORAL_ALIGNMENT_CONTRACT_VERSION =
  'music-album-temporal-alignment-v1' as const;

export type MusicAlbumTemporalComparability =
  | 'comparable'
  | 'conditionally-comparable'
  | 'not-comparable';

export type MusicAlbumTemporalScope = Readonly<{
  source: 'music' | 'album';
  sourceId: string;
  providerPeriod: string | null;
  kind:
    | 'instant'
    | 'hour'
    | 'day'
    | 'week'
    | 'month'
    | 'year'
    | 'calendar-day-proxy'
    | 'provider-range'
    | 'unresolved';
  resolution: 'resolved' | 'proxy' | 'unresolved';
  startAt: string | null;
  endAt: string | null;
  timezone: 'Asia/Seoul' | 'provider-labelled' | null;
  reasonCodes: readonly string[];
}>;

export type MusicAlbumTemporalPairAssessment = Readonly<{
  musicObservationId: string;
  albumObservationId: string;
  musicPlatform: MusicChartCurrentReadRow['platform'];
  albumProviderId: string;
  comparability: MusicAlbumTemporalComparability;
  musicScope: MusicAlbumTemporalScope;
  albumScope: MusicAlbumTemporalScope;
  overlapStartAt: string | null;
  overlapEndAt: string | null;
  reasonCodes: readonly string[];
  numericCombinationAllowed: false;
}>;

export type MusicAlbumTemporalAlignment = Readonly<{
  contractVersion:
    typeof MUSIC_ALBUM_TEMPORAL_ALIGNMENT_CONTRACT_VERSION;
  methodologyDefined: true;
  state:
    | 'aligned'
    | 'conditionally-aligned'
    | 'not-aligned'
    | 'not-evaluable';
  pairs: readonly MusicAlbumTemporalPairAssessment[];
  alignedAlbumObservationIds: readonly string[];
  unalignedAlbumObservationIds: readonly string[];
  numericCombinationAllowed: false;
  scoreFieldsPresent: false;
}>;

const KST = '+09:00';

function validDateParts(
  year: number,
  month: number,
  day: number,
): boolean {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function normalizeDate(
  year: string,
  month: string,
  day: string,
): string | null {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!validDateParts(y, m, d)) return null;
  return `${year}-${month}-${day}`;
}

function compactDate(value: string): string | null {
  const match = /^(\d{4})(\d{2})(\d{2})$/.exec(value);
  return match ? normalizeDate(match[1], match[2], match[3]) : null;
}

function delimitedDates(value: string): readonly string[] {
  const dates: string[] = [];
  const pattern = /(\d{4})[.\/-](\d{2})[.\/-](\d{2})/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(value)) !== null) {
    const normalized = normalizeDate(match[1], match[2], match[3]);
    if (normalized) dates.push(normalized);
  }
  return Object.freeze(dates);
}

function dayBounds(date: string): Readonly<{
  startAt: string;
  endAt: string;
}> {
  return Object.freeze({
    startAt: `${date}T00:00:00.000${KST}`,
    endAt: `${date}T23:59:59.999${KST}`,
  });
}

function monthBounds(compact: string): Readonly<{
  startAt: string;
  endAt: string;
}> | null {
  const match = /^(\d{4})(\d{2})$/.exec(compact);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const start = normalizeDate(match[1], match[2], '01');
  const end = normalizeDate(
    match[1],
    match[2],
    String(lastDay).padStart(2, '0'),
  );
  if (!start || !end) return null;
  return Object.freeze({
    startAt: dayBounds(start).startAt,
    endAt: dayBounds(end).endAt,
  });
}

function yearBounds(yearText: string): Readonly<{
  startAt: string;
  endAt: string;
}> | null {
  if (!/^\d{4}$/.test(yearText)) return null;
  return Object.freeze({
    startAt: `${yearText}-01-01T00:00:00.000${KST}`,
    endAt: `${yearText}-12-31T23:59:59.999${KST}`,
  });
}

function providerRange(
  label: string,
): Readonly<{ startAt: string; endAt: string }> | null {
  const dates = delimitedDates(label);
  if (dates.length < 2) return null;
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (Date.parse(dayBounds(first).startAt) > Date.parse(dayBounds(last).endAt)) {
    return null;
  }
  return Object.freeze({
    startAt: dayBounds(first).startAt,
    endAt: dayBounds(last).endAt,
  });
}

function musicScope(
  row: MusicChartCurrentReadRow,
): MusicAlbumTemporalScope {
  const providerPeriod = row.providerPeriod;

  if (row.freshness.referenceKind === 'provider-observed-at') {
    const parsed = Date.parse(row.freshness.referenceAt);
    if (!Number.isNaN(parsed)) {
      return Object.freeze({
        source: 'music' as const,
        sourceId: row.observationId,
        providerPeriod,
        kind: 'instant' as const,
        resolution: 'resolved' as const,
        startAt: row.freshness.referenceAt,
        endAt: row.freshness.referenceAt,
        timezone: null,
        reasonCodes: Object.freeze([
          'provider-observed-at-used',
        ]),
      });
    }
  }

  const proxy = /^(?:daily-check-date|realtime-check-date):(\d{4}-\d{2}-\d{2})$/
    .exec(providerPeriod ?? '');
  if (proxy) {
    const bounds = dayBounds(proxy[1]);
    return Object.freeze({
      source: 'music' as const,
      sourceId: row.observationId,
      providerPeriod,
      kind: 'calendar-day-proxy' as const,
      resolution: 'proxy' as const,
      startAt: bounds.startAt,
      endAt: bounds.endAt,
      timezone: 'Asia/Seoul' as const,
      reasonCodes: Object.freeze([
        'provider-observation-instant-unavailable',
        'check-date-used-as-calendar-day-proxy',
      ]),
    });
  }

  const exactDay = /^daily:(\d{4}-\d{2}-\d{2})$/
    .exec(providerPeriod ?? '');
  if (exactDay) {
    const bounds = dayBounds(exactDay[1]);
    return Object.freeze({
      source: 'music' as const,
      sourceId: row.observationId,
      providerPeriod,
      kind: 'day' as const,
      resolution: 'resolved' as const,
      startAt: bounds.startAt,
      endAt: bounds.endAt,
      timezone: 'Asia/Seoul' as const,
      reasonCodes: Object.freeze(['provider-day-period-resolved']),
    });
  }

  const realtime = /^realtime:(.+)$/.exec(providerPeriod ?? '');
  if (realtime && !Number.isNaN(Date.parse(realtime[1]))) {
    return Object.freeze({
      source: 'music' as const,
      sourceId: row.observationId,
      providerPeriod,
      kind: 'instant' as const,
      resolution: 'resolved' as const,
      startAt: realtime[1],
      endAt: realtime[1],
      timezone: null,
      reasonCodes: Object.freeze(['provider-realtime-instant-resolved']),
    });
  }

  return Object.freeze({
    source: 'music' as const,
    sourceId: row.observationId,
    providerPeriod,
    kind: 'unresolved' as const,
    resolution: 'unresolved' as const,
    startAt: null,
    endAt: null,
    timezone: null,
    reasonCodes: Object.freeze(['music-provider-period-unresolved']),
  });
}

function albumScope(
  observation: DirectAlbumObservation,
): MusicAlbumTemporalScope {
  const providerPeriod = observation.providerPeriod;
  const unresolved = (
    reason: string,
  ): MusicAlbumTemporalScope => Object.freeze({
    source: 'album' as const,
    sourceId: observation.observationId,
    providerPeriod,
    kind: 'unresolved' as const,
    resolution: 'unresolved' as const,
    startAt: null,
    endAt: null,
    timezone: null,
    reasonCodes: Object.freeze([reason]),
  });

  if (!providerPeriod) return unresolved('album-provider-period-missing');

  const hour = /^hour:(\d{8})-(\d{2})$/.exec(providerPeriod);
  if (hour) {
    const date = compactDate(hour[1]);
    const hourNumber = Number(hour[2]);
    if (!date || hourNumber < 0 || hourNumber > 23) {
      return unresolved('album-hour-period-invalid');
    }
    const hh = String(hourNumber).padStart(2, '0');
    return Object.freeze({
      source: 'album' as const,
      sourceId: observation.observationId,
      providerPeriod,
      kind: 'hour' as const,
      resolution: 'resolved' as const,
      startAt: `${date}T${hh}:00:00.000${KST}`,
      endAt: `${date}T${hh}:59:59.999${KST}`,
      timezone: 'Asia/Seoul' as const,
      reasonCodes: Object.freeze(['provider-hour-period-resolved']),
    });
  }

  const day = /^day:(.+)$/.exec(providerPeriod);
  if (day) {
    const compact = compactDate(day[1]);
    const delimited = delimitedDates(day[1]);
    const date = compact ?? (delimited.length === 1 ? delimited[0] : null);
    if (!date) return unresolved('album-day-period-unresolved');
    const bounds = dayBounds(date);
    return Object.freeze({
      source: 'album' as const,
      sourceId: observation.observationId,
      providerPeriod,
      kind: 'day' as const,
      resolution: 'resolved' as const,
      startAt: bounds.startAt,
      endAt: bounds.endAt,
      timezone: 'Asia/Seoul' as const,
      reasonCodes: Object.freeze(['provider-day-period-resolved']),
    });
  }

  const week = /^week:(.+)$/.exec(providerPeriod);
  if (week) {
    const range = providerRange(week[1]);
    if (!range) {
      return unresolved('album-week-range-unresolved');
    }
    return Object.freeze({
      source: 'album' as const,
      sourceId: observation.observationId,
      providerPeriod,
      kind: 'week' as const,
      resolution: 'resolved' as const,
      startAt: range.startAt,
      endAt: range.endAt,
      timezone: 'provider-labelled' as const,
      reasonCodes: Object.freeze(['provider-week-range-resolved']),
    });
  }

  const month = /^month:(.+)$/.exec(providerPeriod);
  if (month) {
    const providerLabelRange = providerRange(month[1]);
    const range = providerLabelRange ?? monthBounds(month[1]);
    if (!range) return unresolved('album-month-period-unresolved');
    return Object.freeze({
      source: 'album' as const,
      sourceId: observation.observationId,
      providerPeriod,
      kind: 'month' as const,
      resolution: 'resolved' as const,
      startAt: range.startAt,
      endAt: range.endAt,
      timezone: providerLabelRange
        ? 'provider-labelled' as const
        : 'Asia/Seoul' as const,
      reasonCodes: Object.freeze(['provider-month-period-resolved']),
    });
  }

  const year = /^year:(\d{4})$/.exec(providerPeriod);
  if (year) {
    const bounds = yearBounds(year[1]);
    if (!bounds) return unresolved('album-year-period-unresolved');
    return Object.freeze({
      source: 'album' as const,
      sourceId: observation.observationId,
      providerPeriod,
      kind: 'year' as const,
      resolution: 'resolved' as const,
      startAt: bounds.startAt,
      endAt: bounds.endAt,
      timezone: 'Asia/Seoul' as const,
      reasonCodes: Object.freeze(['provider-year-period-resolved']),
    });
  }

  const range = providerRange(providerPeriod);
  if (range) {
    return Object.freeze({
      source: 'album' as const,
      sourceId: observation.observationId,
      providerPeriod,
      kind: 'provider-range' as const,
      resolution: 'resolved' as const,
      startAt: range.startAt,
      endAt: range.endAt,
      timezone: 'provider-labelled' as const,
      reasonCodes: Object.freeze(['provider-range-resolved']),
    });
  }

  return unresolved('album-provider-period-unresolved');
}

function overlap(
  left: MusicAlbumTemporalScope,
  right: MusicAlbumTemporalScope,
): Readonly<{ startAt: string; endAt: string }> | null {
  if (!left.startAt || !left.endAt || !right.startAt || !right.endAt) {
    return null;
  }
  const startMs = Math.max(Date.parse(left.startAt), Date.parse(right.startAt));
  const endMs = Math.min(Date.parse(left.endAt), Date.parse(right.endAt));
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs > endMs) {
    return null;
  }
  return Object.freeze({
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(endMs).toISOString(),
  });
}

export function compareMusicAlbumTemporalPair(input: Readonly<{
  music: MusicChartCurrentReadRow;
  album: DirectAlbumObservation;
}>): MusicAlbumTemporalPairAssessment {
  const music = musicScope(input.music);
  const album = albumScope(input.album);
  const reasons: string[] = [
    ...music.reasonCodes,
    ...album.reasonCodes,
  ];

  if (
    music.resolution === 'unresolved'
    || album.resolution === 'unresolved'
  ) {
    reasons.push('temporal-scope-unresolved');
    return Object.freeze({
      musicObservationId: input.music.observationId,
      albumObservationId: input.album.observationId,
      musicPlatform: input.music.platform,
      albumProviderId: input.album.providerId,
      comparability: 'not-comparable' as const,
      musicScope: music,
      albumScope: album,
      overlapStartAt: null,
      overlapEndAt: null,
      reasonCodes: Object.freeze([...new Set(reasons)].sort()),
      numericCombinationAllowed: false as const,
    });
  }

  const shared = overlap(music, album);
  if (!shared) {
    reasons.push('temporal-ranges-do-not-overlap');
    return Object.freeze({
      musicObservationId: input.music.observationId,
      albumObservationId: input.album.observationId,
      musicPlatform: input.music.platform,
      albumProviderId: input.album.providerId,
      comparability: 'not-comparable' as const,
      musicScope: music,
      albumScope: album,
      overlapStartAt: null,
      overlapEndAt: null,
      reasonCodes: Object.freeze([...new Set(reasons)].sort()),
      numericCombinationAllowed: false as const,
    });
  }

  const exactSameWindow =
    music.resolution === 'resolved'
    && album.resolution === 'resolved'
    && music.startAt === album.startAt
    && music.endAt === album.endAt;

  const comparability: MusicAlbumTemporalComparability =
    exactSameWindow
      ? 'comparable'
      : 'conditionally-comparable';

  reasons.push(
    exactSameWindow
      ? 'exact-temporal-window-match'
      : music.resolution === 'proxy'
        ? 'music-date-proxy-overlaps-album-period'
        : 'temporal-overlap-different-granularity',
  );

  return Object.freeze({
    musicObservationId: input.music.observationId,
    albumObservationId: input.album.observationId,
    musicPlatform: input.music.platform,
    albumProviderId: input.album.providerId,
    comparability,
    musicScope: music,
    albumScope: album,
    overlapStartAt: shared.startAt,
    overlapEndAt: shared.endAt,
    reasonCodes: Object.freeze([...new Set(reasons)].sort()),
    numericCombinationAllowed: false as const,
  });
}

export function evaluateMusicAlbumTemporalAlignment(input: Readonly<{
  musicRows: readonly MusicChartCurrentReadRow[];
  albumObservations: readonly DirectAlbumObservation[];
}>): MusicAlbumTemporalAlignment {
  const pairs = input.albumObservations.flatMap(album =>
    input.musicRows.map(music =>
      compareMusicAlbumTemporalPair({ music, album }),
    ),
  );

  if (input.musicRows.length === 0 || input.albumObservations.length === 0) {
    return Object.freeze({
      contractVersion:
        MUSIC_ALBUM_TEMPORAL_ALIGNMENT_CONTRACT_VERSION,
      methodologyDefined: true as const,
      state: 'not-evaluable' as const,
      pairs: Object.freeze(pairs),
      alignedAlbumObservationIds: Object.freeze([]),
      unalignedAlbumObservationIds: Object.freeze(
        input.albumObservations.map(value => value.observationId).sort(),
      ),
      numericCombinationAllowed: false as const,
      scoreFieldsPresent: false as const,
    });
  }

  const aligned: string[] = [];
  const unaligned: string[] = [];
  let hasConditional = false;

  for (const album of input.albumObservations) {
    const albumPairs = pairs.filter(
      pair => pair.albumObservationId === album.observationId,
    );
    const usable = albumPairs.filter(
      pair => pair.comparability !== 'not-comparable',
    );
    if (usable.length === 0) {
      unaligned.push(album.observationId);
      continue;
    }
    aligned.push(album.observationId);
    if (usable.some(pair =>
      pair.comparability === 'conditionally-comparable'
    )) {
      hasConditional = true;
    }
  }

  const state: MusicAlbumTemporalAlignment['state'] =
    unaligned.length > 0
      ? 'not-aligned'
      : hasConditional
        ? 'conditionally-aligned'
        : 'aligned';

  return Object.freeze({
    contractVersion:
      MUSIC_ALBUM_TEMPORAL_ALIGNMENT_CONTRACT_VERSION,
    methodologyDefined: true as const,
    state,
    pairs: Object.freeze(pairs),
    alignedAlbumObservationIds: Object.freeze(aligned.sort()),
    unalignedAlbumObservationIds: Object.freeze(unaligned.sort()),
    numericCombinationAllowed: false as const,
    scoreFieldsPresent: false as const,
  });
}
