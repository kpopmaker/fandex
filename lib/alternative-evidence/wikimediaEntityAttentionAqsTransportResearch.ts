export const WIKIMEDIA_ENTITY_ATTENTION_AQS_TRANSPORT_RESEARCH_CONTRACT_VERSION =
  'v1_wikimedia_entity_attention_aqs_transport_research' as const;

export type WikimediaAqsDailyItem = Readonly<{
  timestamp: string;
  views: number;
}>;

export type WikimediaAqsTitleResponse = Readonly<{
  title: string;
  httpStatus: number;
  items: readonly WikimediaAqsDailyItem[];
}>;

export type WikimediaAqsAggregateResponse = Readonly<{
  httpStatus: number;
  items: readonly WikimediaAqsDailyItem[];
}>;

export type WikimediaEntityAttentionAqsTransportResult =
  | Readonly<{
      contractVersion:
        typeof WIKIMEDIA_ENTITY_ATTENTION_AQS_TRANSPORT_RESEARCH_CONTRACT_VERSION;
      lifecycle: 'research';
      directProductContributionEligible: false;
      productScorePublished: false;
      status: 'available';
      reason: 'aqs_loaded_day_entity_attention_available';
      sourceSemantics: 'wikimedia-aqs-per-article-loaded-day';
      unit: 'pageviews';
      observationDay: string;
      canonicalTitle: string;
      eligibleTitles: readonly string[];
      perTitleViews: readonly Readonly<{
        title: string;
        views: number;
        derivation: 'explicit-provider-row' | 'loaded-day-zero-omission';
      }>[];
      value: number;
      loadProof: Readonly<{
        aggregateTargetDayPresent: true;
        canonicalTargetDayPresent: true;
      }>;
    }>
  | Readonly<{
      contractVersion:
        typeof WIKIMEDIA_ENTITY_ATTENTION_AQS_TRANSPORT_RESEARCH_CONTRACT_VERSION;
      lifecycle: 'research';
      directProductContributionEligible: false;
      productScorePublished: false;
      status: 'unavailable';
      reason:
        | 'project-day-not-proven-loaded'
        | 'per-article-day-not-proven-loaded'
        | 'transport-error';
      value: null;
      unit: 'pageviews';
    }>
  | Readonly<{
      contractVersion:
        typeof WIKIMEDIA_ENTITY_ATTENTION_AQS_TRANSPORT_RESEARCH_CONTRACT_VERSION;
      lifecycle: 'research';
      directProductContributionEligible: false;
      productScorePublished: false;
      status: 'data-issue';
      reason:
        | 'invalid-observation-day'
        | 'invalid-title-set'
        | 'invalid-aggregate-response'
        | 'invalid-title-response';
      value: null;
      unit: 'pageviews';
    }>;

function base() {
  return Object.freeze({
    contractVersion:
      WIKIMEDIA_ENTITY_ATTENTION_AQS_TRANSPORT_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research' as const,
    directProductContributionEligible: false as const,
    productScorePublished: false as const,
  });
}

function unavailable(
  reason:
    | 'project-day-not-proven-loaded'
    | 'per-article-day-not-proven-loaded'
    | 'transport-error',
): WikimediaEntityAttentionAqsTransportResult {
  return Object.freeze({
    ...base(),
    status: 'unavailable' as const,
    reason,
    value: null,
    unit: 'pageviews' as const,
  });
}

function dataIssue(
  reason:
    | 'invalid-observation-day'
    | 'invalid-title-set'
    | 'invalid-aggregate-response'
    | 'invalid-title-response',
): WikimediaEntityAttentionAqsTransportResult {
  return Object.freeze({
    ...base(),
    status: 'data-issue' as const,
    reason,
    value: null,
    unit: 'pageviews' as const,
  });
}

function targetTimestamp(day: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const parsed = new Date(`${day}T00:00:00.000Z`);
  if (
    !Number.isFinite(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== day
  ) {
    return null;
  }
  return day.replaceAll('-', '') + '00';
}

function validItem(item: WikimediaAqsDailyItem): boolean {
  return (
    /^\d{10}$/.test(item.timestamp)
    && Number.isSafeInteger(item.views)
    && item.views >= 0
  );
}

function exactTargetValue(
  items: readonly WikimediaAqsDailyItem[],
  target: string,
): number | null {
  const matches = items.filter((item) => item.timestamp === target);
  return matches.length === 1 ? matches[0].views : null;
}

function validItems(items: readonly WikimediaAqsDailyItem[]): boolean {
  if (items.some((item) => !validItem(item))) return false;
  const timestamps = items.map((item) => item.timestamp);
  return new Set(timestamps).size === timestamps.length;
}

export function evaluateWikimediaEntityAttentionAqsTransportResearch(
  input: Readonly<{
    observationDay: string;
    canonicalTitle: string;
    eligibleTitles: readonly string[];
    aggregate: WikimediaAqsAggregateResponse;
    titleResponses: readonly WikimediaAqsTitleResponse[];
  }>,
): WikimediaEntityAttentionAqsTransportResult {
  const target = targetTimestamp(input.observationDay);
  if (!target) return dataIssue('invalid-observation-day');

  const titles = input.eligibleTitles;
  if (
    input.canonicalTitle.trim() !== input.canonicalTitle
    || input.canonicalTitle.length === 0
    || titles.length === 0
    || titles.some((title) => title.trim() !== title || title.length === 0)
    || new Set(titles).size !== titles.length
    || !titles.includes(input.canonicalTitle)
  ) {
    return dataIssue('invalid-title-set');
  }

  if (
    input.aggregate.httpStatus !== 200
    || !validItems(input.aggregate.items)
  ) {
    if (
      input.aggregate.httpStatus === 404
      || input.aggregate.httpStatus === 429
      || input.aggregate.httpStatus >= 500
    ) {
      return unavailable(
        input.aggregate.httpStatus === 404
          ? 'project-day-not-proven-loaded'
          : 'transport-error',
      );
    }
    return dataIssue('invalid-aggregate-response');
  }

  if (exactTargetValue(input.aggregate.items, target) === null) {
    return unavailable('project-day-not-proven-loaded');
  }

  if (
    input.titleResponses.length !== titles.length
    || new Set(input.titleResponses.map((response) => response.title)).size
      !== titles.length
    || input.titleResponses.some((response) => !titles.includes(response.title))
  ) {
    return dataIssue('invalid-title-response');
  }

  for (const response of input.titleResponses) {
    if (
      response.httpStatus !== 200
      && response.httpStatus !== 404
      && response.httpStatus !== 429
      && response.httpStatus < 500
    ) {
      return dataIssue('invalid-title-response');
    }
    if (response.httpStatus === 200 && !validItems(response.items)) {
      return dataIssue('invalid-title-response');
    }
  }

  const canonical = input.titleResponses.find(
    (response) => response.title === input.canonicalTitle,
  );
  if (!canonical) return dataIssue('invalid-title-response');

  if (
    canonical.httpStatus === 429
    || canonical.httpStatus >= 500
  ) {
    return unavailable('transport-error');
  }

  if (
    canonical.httpStatus !== 200
    || exactTargetValue(canonical.items, target) === null
  ) {
    return unavailable('per-article-day-not-proven-loaded');
  }

  const rows: Array<{
    title: string;
    views: number;
    derivation: 'explicit-provider-row' | 'loaded-day-zero-omission';
  }> = [];

  for (const title of titles) {
    const response = input.titleResponses.find(
      (candidate) => candidate.title === title,
    );
    if (!response) return dataIssue('invalid-title-response');

    if (response.httpStatus === 429 || response.httpStatus >= 500) {
      return unavailable('transport-error');
    }

    const explicit =
      response.httpStatus === 200
        ? exactTargetValue(response.items, target)
        : null;

    rows.push(
      Object.freeze({
        title,
        views: explicit ?? 0,
        derivation:
          explicit === null
            ? ('loaded-day-zero-omission' as const)
            : ('explicit-provider-row' as const),
      }),
    );
  }

  const perTitleViews = Object.freeze(rows);
  const value = perTitleViews.reduce((sum, row) => sum + row.views, 0);

  return Object.freeze({
    ...base(),
    status: 'available' as const,
    reason: 'aqs_loaded_day_entity_attention_available' as const,
    sourceSemantics: 'wikimedia-aqs-per-article-loaded-day' as const,
    unit: 'pageviews' as const,
    observationDay: input.observationDay,
    canonicalTitle: input.canonicalTitle,
    eligibleTitles: Object.freeze([...titles]),
    perTitleViews,
    value,
    loadProof: Object.freeze({
      aggregateTargetDayPresent: true as const,
      canonicalTargetDayPresent: true as const,
    }),
  });
}
