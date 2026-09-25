export const WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_CONTRACT_VERSION =
  'v1_wikimedia_entity_attention_research' as const;

export type WikimediaEntityAttentionIdentityPage = Readonly<{
  pageId: number;
  title: string;
}>;

export type WikimediaEntityAttentionIdentitySnapshot = Readonly<{
  canonicalArtistId: string;
  wikidataQid: string;
  project: 'en.wikipedia.org';
  capturedAt: string;
  canonicalPage: WikimediaEntityAttentionIdentityPage;
  redirects: readonly WikimediaEntityAttentionIdentityPage[];
}>;

export type WikimediaEntityAttentionDumpRow = Readonly<{
  domainCode: 'en' | 'en.m';
  pageTitle: string;
  views: number;
}>;

export type WikimediaEntityAttentionHour = Readonly<{
  hourStart: string;
  completeness: 'complete' | 'missing' | 'invalid';
  rows: readonly WikimediaEntityAttentionDumpRow[];
}>;

export type WikimediaEntityAttentionAvailableResult = Readonly<{
  contractVersion:
    typeof WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_CONTRACT_VERSION;
  lifecycle: 'research';
  directProductContributionEligible: false;
  productScorePublished: false;
  status: 'available';
  reason: 'prospective_entity_attention_available';
  canonicalArtistId: string;
  wikidataQid: string;
  project: 'en.wikipedia.org';
  sourceSemantics: 'wikimedia-public-pageviews-entity-daily';
  unit: 'pageviews';
  observationTime: Readonly<{
    kind: 'period';
    start: string;
    end: string;
  }>;
  collectionTime: string;
  eligibleTitles: readonly string[];
  hourCount: 24;
  perTitleViews: readonly Readonly<{
    title: string;
    views: number;
  }>[];
  value: number;
}>;

export type WikimediaEntityAttentionUnavailableReason =
  | 'identity-changed-during-observation'
  | 'hour-set-incomplete'
  | 'hour-source-incomplete';

export type WikimediaEntityAttentionDataIssueReason =
  | 'invalid-observation-day'
  | 'invalid-collection-time'
  | 'invalid-identity-snapshot'
  | 'identity-snapshot-timing-invalid'
  | 'hour-contract-invalid'
  | 'dump-row-contract-invalid';

export type WikimediaEntityAttentionResearchResult =
  | WikimediaEntityAttentionAvailableResult
  | Readonly<{
      contractVersion:
        typeof WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_CONTRACT_VERSION;
      lifecycle: 'research';
      directProductContributionEligible: false;
      productScorePublished: false;
      status: 'unavailable';
      reason: WikimediaEntityAttentionUnavailableReason;
      value: null;
      unit: 'pageviews';
    }>
  | Readonly<{
      contractVersion:
        typeof WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_CONTRACT_VERSION;
      lifecycle: 'research';
      directProductContributionEligible: false;
      productScorePublished: false;
      status: 'data-issue';
      reason: WikimediaEntityAttentionDataIssueReason;
      value: null;
      unit: 'pageviews';
    }>;

function base() {
  return Object.freeze({
    contractVersion: WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research' as const,
    directProductContributionEligible: false as const,
    productScorePublished: false as const,
  });
}

function unavailable(
  reason: WikimediaEntityAttentionUnavailableReason,
): WikimediaEntityAttentionResearchResult {
  return Object.freeze({
    ...base(),
    status: 'unavailable' as const,
    reason,
    value: null,
    unit: 'pageviews' as const,
  });
}

function dataIssue(
  reason: WikimediaEntityAttentionDataIssueReason,
): WikimediaEntityAttentionResearchResult {
  return Object.freeze({
    ...base(),
    status: 'data-issue' as const,
    reason,
    value: null,
    unit: 'pageviews' as const,
  });
}

function exactIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function dayBounds(day: string): Readonly<{ start: string; end: string }> | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;

  const startDate = new Date(`${day}T00:00:00.000Z`);
  if (
    !Number.isFinite(startDate.getTime())
    || startDate.toISOString().slice(0, 10) !== day
  ) {
    return null;
  }

  const endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1_000);
  return Object.freeze({
    start: startDate.toISOString(),
    end: endDate.toISOString(),
  });
}

function titleKey(page: WikimediaEntityAttentionIdentityPage): string {
  return `${page.pageId}:\u0000${page.title}`;
}

function validPage(page: WikimediaEntityAttentionIdentityPage): boolean {
  return (
    Number.isSafeInteger(page.pageId)
    && page.pageId > 0
    && page.title.trim() === page.title
    && page.title.length > 0
  );
}

function validIdentity(
  snapshot: WikimediaEntityAttentionIdentitySnapshot,
): boolean {
  if (
    snapshot.canonicalArtistId.trim() !== snapshot.canonicalArtistId
    || snapshot.canonicalArtistId.length === 0
    || !/^Q[1-9]\d*$/.test(snapshot.wikidataQid)
    || snapshot.project !== 'en.wikipedia.org'
    || !exactIso(snapshot.capturedAt)
    || !validPage(snapshot.canonicalPage)
    || snapshot.redirects.some((redirect) => !validPage(redirect))
  ) {
    return false;
  }

  const pages = [snapshot.canonicalPage, ...snapshot.redirects];
  const pageIds = pages.map((page) => page.pageId);
  const titles = pages.map((page) => page.title);

  return (
    new Set(pageIds).size === pageIds.length
    && new Set(titles).size === titles.length
  );
}

function sameIdentity(
  before: WikimediaEntityAttentionIdentitySnapshot,
  after: WikimediaEntityAttentionIdentitySnapshot,
): boolean {
  if (
    before.canonicalArtistId !== after.canonicalArtistId
    || before.wikidataQid !== after.wikidataQid
    || before.project !== after.project
    || titleKey(before.canonicalPage) !== titleKey(after.canonicalPage)
    || before.redirects.length !== after.redirects.length
  ) {
    return false;
  }

  const beforeRedirects = before.redirects.map(titleKey).sort();
  const afterRedirects = after.redirects.map(titleKey).sort();

  return beforeRedirects.every(
    (value, index) => value === afterRedirects[index],
  );
}

function expectedHourStarts(dayStart: string): readonly string[] {
  const start = Date.parse(dayStart);
  return Object.freeze(
    Array.from({ length: 24 }, (_, hour) =>
      new Date(start + hour * 60 * 60 * 1_000).toISOString(),
    ),
  );
}

function eligibleTitles(
  snapshot: WikimediaEntityAttentionIdentitySnapshot,
): readonly string[] {
  return Object.freeze([
    snapshot.canonicalPage.title,
    ...snapshot.redirects
      .map((redirect) => redirect.title)
      .sort((left, right) => left.localeCompare(right)),
  ]);
}

export function evaluateWikimediaEntityAttentionResearch(input: Readonly<{
  observationDay: string;
  collectionTime: string;
  beforeIdentity: WikimediaEntityAttentionIdentitySnapshot;
  afterIdentity: WikimediaEntityAttentionIdentitySnapshot;
  hours: readonly WikimediaEntityAttentionHour[];
}>): WikimediaEntityAttentionResearchResult {
  const bounds = dayBounds(input.observationDay);
  if (!bounds) {
    return dataIssue('invalid-observation-day');
  }

  if (!exactIso(input.collectionTime)) {
    return dataIssue('invalid-collection-time');
  }

  if (!validIdentity(input.beforeIdentity) || !validIdentity(input.afterIdentity)) {
    return dataIssue('invalid-identity-snapshot');
  }

  if (
    Date.parse(input.beforeIdentity.capturedAt) >= Date.parse(bounds.start)
    || Date.parse(input.afterIdentity.capturedAt) < Date.parse(bounds.end)
    || Date.parse(input.collectionTime) < Date.parse(bounds.end)
  ) {
    return dataIssue('identity-snapshot-timing-invalid');
  }

  if (!sameIdentity(input.beforeIdentity, input.afterIdentity)) {
    return unavailable('identity-changed-during-observation');
  }

  const expectedHours = expectedHourStarts(bounds.start);
  const actualHours = input.hours.map((hour) => hour.hourStart);
  if (
    input.hours.length !== 24
    || new Set(actualHours).size !== 24
    || expectedHours.some((hour) => !actualHours.includes(hour))
  ) {
    return unavailable('hour-set-incomplete');
  }

  const titles = eligibleTitles(input.beforeIdentity);
  const titleSet = new Set(titles);
  const pairSet = new Set<string>();

  for (const hour of input.hours) {
    if (!exactIso(hour.hourStart) || !expectedHours.includes(hour.hourStart)) {
      return dataIssue('hour-contract-invalid');
    }

    if (hour.completeness !== 'complete') {
      return unavailable('hour-source-incomplete');
    }

    pairSet.clear();
    for (const row of hour.rows) {
      if (
        (row.domainCode !== 'en' && row.domainCode !== 'en.m')
        || !titleSet.has(row.pageTitle)
        || !Number.isSafeInteger(row.views)
        || row.views < 0
      ) {
        return dataIssue('dump-row-contract-invalid');
      }

      const pair = `${row.domainCode}:\u0000${row.pageTitle}`;
      if (pairSet.has(pair)) {
        return dataIssue('dump-row-contract-invalid');
      }
      pairSet.add(pair);
    }
  }

  const totals = new Map(titles.map((title) => [title, 0]));

  for (const hour of input.hours) {
    for (const row of hour.rows) {
      totals.set(row.pageTitle, (totals.get(row.pageTitle) ?? 0) + row.views);
    }
  }

  const perTitleViews = Object.freeze(
    titles.map((title) =>
      Object.freeze({
        title,
        views: totals.get(title) ?? 0,
      }),
    ),
  );
  const value = perTitleViews.reduce((sum, item) => sum + item.views, 0);

  return Object.freeze({
    ...base(),
    status: 'available' as const,
    reason: 'prospective_entity_attention_available' as const,
    canonicalArtistId: input.beforeIdentity.canonicalArtistId,
    wikidataQid: input.beforeIdentity.wikidataQid,
    project: 'en.wikipedia.org' as const,
    sourceSemantics: 'wikimedia-public-pageviews-entity-daily' as const,
    unit: 'pageviews' as const,
    observationTime: Object.freeze({
      kind: 'period' as const,
      start: bounds.start,
      end: bounds.end,
    }),
    collectionTime: input.collectionTime,
    eligibleTitles: titles,
    hourCount: 24 as const,
    perTitleViews,
    value,
  });
}
