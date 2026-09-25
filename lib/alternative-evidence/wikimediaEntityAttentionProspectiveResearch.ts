import {
  evaluateWikimediaEntityAttentionAqsTransportResearch,
  type WikimediaAqsAggregateResponse,
  type WikimediaAqsTitleResponse,
  type WikimediaEntityAttentionAqsTransportResult,
} from './wikimediaEntityAttentionAqsTransportResearch';
import type {
  WikimediaEntityAttentionIdentityPage,
  WikimediaEntityAttentionIdentitySnapshot,
} from './wikimediaEntityAttentionResearch';

export const WIKIMEDIA_ENTITY_ATTENTION_PROSPECTIVE_RESEARCH_CONTRACT_VERSION =
  'v1_wikimedia_entity_attention_prospective_research' as const;

export const WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_ARTIST_ID = 'iu' as const;
export const WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_WIKIDATA_QID = 'Q20145' as const;
export const WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_PROJECT = 'en.wikipedia.org' as const;
export const WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_USER_AGENT =
  'FANDEX Wikimedia entity-attention research (https://github.com/kpopmaker/fandex/issues/240)';

const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const ENWIKI_API = 'https://en.wikipedia.org/w/api.php';
const AQS_ROOT = 'https://wikimedia.org/api/rest_v1';
const DEFAULT_TIMEOUT_MILLISECONDS = 10_000;
const MAX_RESPONSE_BYTES = 1_000_000;

export type WikimediaResearchFetch = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export type WikimediaProspectiveResearchDependencies = Readonly<{
  fetch?: WikimediaResearchFetch;
  now?: () => Date;
  timeoutMilliseconds?: number;
}>;

export type WikimediaProspectiveResearchSnapshotEnvelope = Readonly<{
  contractVersion:
    typeof WIKIMEDIA_ENTITY_ATTENTION_PROSPECTIVE_RESEARCH_CONTRACT_VERSION;
  lifecycle: 'research';
  directProductContributionEligible: false;
  productScorePublished: false;
  phase: 'pre-day-identity-snapshot';
  observationDay: string;
  observationTime: Readonly<{
    kind: 'period';
    start: string;
    end: string;
  }>;
  identity: WikimediaEntityAttentionIdentitySnapshot;
}>;

export type WikimediaProspectiveResearchObservation =
  | Readonly<{
      contractVersion:
        typeof WIKIMEDIA_ENTITY_ATTENTION_PROSPECTIVE_RESEARCH_CONTRACT_VERSION;
      lifecycle: 'research';
      directProductContributionEligible: false;
      productScorePublished: false;
      phase: 'post-day-observation';
      status: 'available';
      reason: 'prospective_aqs_entity_attention_available';
      canonicalArtistId: 'iu';
      wikidataQid: 'Q20145';
      project: 'en.wikipedia.org';
      sourceSemantics: 'wikimedia-aqs-per-article-loaded-day';
      unit: 'pageviews';
      observationTime: Readonly<{
        kind: 'period';
        start: string;
        end: string;
      }>;
      collectionTime: string;
      beforeIdentityCapturedAt: string;
      afterIdentityCapturedAt: string;
      eligibleTitles: readonly string[];
      perTitleViews: WikimediaEntityAttentionAqsTransportResult extends infer _T
        ? readonly Readonly<{
            title: string;
            views: number;
            derivation: 'explicit-provider-row' | 'loaded-day-zero-omission';
          }>[]
        : never;
      value: number;
      loadProof: Readonly<{
        aggregateTargetDayPresent: true;
        canonicalTargetDayPresent: true;
      }>;
    }>
  | Readonly<{
      contractVersion:
        typeof WIKIMEDIA_ENTITY_ATTENTION_PROSPECTIVE_RESEARCH_CONTRACT_VERSION;
      lifecycle: 'research';
      directProductContributionEligible: false;
      productScorePublished: false;
      phase: 'post-day-observation';
      status: 'unavailable';
      reason:
        | 'identity-changed-during-observation'
        | 'project-day-not-proven-loaded'
        | 'per-article-day-not-proven-loaded'
        | 'transport-error';
      value: null;
      unit: 'pageviews';
    }>
  | Readonly<{
      contractVersion:
        typeof WIKIMEDIA_ENTITY_ATTENTION_PROSPECTIVE_RESEARCH_CONTRACT_VERSION;
      lifecycle: 'research';
      directProductContributionEligible: false;
      productScorePublished: false;
      phase: 'post-day-observation';
      status: 'data-issue';
      reason:
        | 'invalid-observation-day'
        | 'invalid-pre-day-snapshot'
        | 'snapshot-timing-invalid'
        | 'identity-response-invalid'
        | 'transport-response-invalid';
      value: null;
      unit: 'pageviews';
    }>;

type UnknownRecord = Record<string, unknown>;

function base() {
  return Object.freeze({
    contractVersion:
      WIKIMEDIA_ENTITY_ATTENTION_PROSPECTIVE_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research' as const,
    directProductContributionEligible: false as const,
    productScorePublished: false as const,
  });
}

function dayBounds(day: string): Readonly<{ start: string; end: string }> | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const start = new Date(`${day}T00:00:00.000Z`);
  if (
    !Number.isFinite(start.getTime())
    || start.toISOString().slice(0, 10) !== day
  ) {
    return null;
  }
  return Object.freeze({
    start: start.toISOString(),
    end: new Date(start.getTime() + 86_400_000).toISOString(),
  });
}

function exactIso(value: string): boolean {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function validPage(page: WikimediaEntityAttentionIdentityPage): boolean {
  return (
    Number.isSafeInteger(page.pageId)
    && page.pageId > 0
    && typeof page.title === 'string'
    && page.title.length > 0
    && page.title.trim() === page.title
  );
}

function validSnapshot(
  snapshot: WikimediaEntityAttentionIdentitySnapshot,
): boolean {
  if (
    snapshot.canonicalArtistId !== WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_ARTIST_ID
    || snapshot.wikidataQid !== WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_WIKIDATA_QID
    || snapshot.project !== WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_PROJECT
    || !exactIso(snapshot.capturedAt)
    || !validPage(snapshot.canonicalPage)
    || snapshot.redirects.some((redirect) => !validPage(redirect))
  ) {
    return false;
  }

  const pages = [snapshot.canonicalPage, ...snapshot.redirects];
  return (
    new Set(pages.map((page) => page.pageId)).size === pages.length
    && new Set(pages.map((page) => page.title)).size === pages.length
  );
}

function pageIdentity(page: WikimediaEntityAttentionIdentityPage): string {
  return `${page.pageId}\u0000${page.title}`;
}

function sameIdentity(
  before: WikimediaEntityAttentionIdentitySnapshot,
  after: WikimediaEntityAttentionIdentitySnapshot,
): boolean {
  if (
    before.canonicalArtistId !== after.canonicalArtistId
    || before.wikidataQid !== after.wikidataQid
    || before.project !== after.project
    || pageIdentity(before.canonicalPage) !== pageIdentity(after.canonicalPage)
    || before.redirects.length !== after.redirects.length
  ) {
    return false;
  }

  const left = before.redirects.map(pageIdentity).sort();
  const right = after.redirects.map(pageIdentity).sort();
  return left.every((value, index) => value === right[index]);
}

function requireNow(
  now: (() => Date) | undefined,
): Date {
  const value = (now ?? (() => new Date()))();
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error('wikimedia_research_clock_invalid');
  }
  return value;
}

function timeoutMilliseconds(value: number | undefined): number {
  const timeout = value ?? DEFAULT_TIMEOUT_MILLISECONDS;
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 30_000) {
    throw new Error('wikimedia_research_config_invalid');
  }
  return timeout;
}

function isObject(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const declared = response.headers.get('content-length');
  if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_RESPONSE_BYTES)) {
    try {
      await response.body?.cancel();
    } catch {
      // Preserve the bounded response failure.
    }
    throw new Error('wikimedia_research_response_invalid');
  }

  if (!response.body) {
    throw new Error('wikimedia_research_response_invalid');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const chunks: string[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error('wikimedia_research_response_invalid');
    }
    chunks.push(decoder.decode(value, { stream: true }));
  }
  chunks.push(decoder.decode());

  try {
    return JSON.parse(chunks.join('')) as unknown;
  } catch {
    throw new Error('wikimedia_research_response_invalid');
  }
}

async function fetchJson(
  url: URL,
  dependencies: WikimediaProspectiveResearchDependencies,
): Promise<Readonly<{ status: number; json: unknown }>> {
  const fetchExternal = dependencies.fetch ?? globalThis.fetch;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    timeoutMilliseconds(dependencies.timeoutMilliseconds),
  );
  try {
    let response: Response;
    try {
      response = await fetchExternal(url, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_USER_AGENT,
        },
        cache: 'no-store',
        signal: controller.signal,
      });
    } catch {
      throw new Error('wikimedia_research_request_failed');
    }

    let json: unknown = null;
    if (response.status === 200) {
      json = await readBoundedJson(response);
    } else {
      try {
        await response.body?.cancel();
      } catch {
        // Status is the evidence needed for the fail-closed transport gate.
      }
    }
    return Object.freeze({ status: response.status, json });
  } finally {
    clearTimeout(timer);
  }
}

async function resolveEnwikiTitle(
  dependencies: WikimediaProspectiveResearchDependencies,
): Promise<string> {
  const url = new URL(WIKIDATA_API);
  url.searchParams.set('action', 'wbgetentities');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');
  url.searchParams.set('ids', WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_WIKIDATA_QID);
  url.searchParams.set('props', 'sitelinks');
  url.searchParams.set('sitefilter', 'enwiki');

  const response = await fetchJson(url, dependencies);
  if (response.status !== 200 || !isObject(response.json)) {
    throw new Error('wikimedia_identity_response_invalid');
  }

  const entities = response.json.entities;
  if (!isObject(entities)) throw new Error('wikimedia_identity_response_invalid');
  const entity = entities[WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_WIKIDATA_QID];
  if (!isObject(entity)) throw new Error('wikimedia_identity_response_invalid');
  const sitelinks = entity.sitelinks;
  if (!isObject(sitelinks)) throw new Error('wikimedia_identity_response_invalid');
  const enwiki = sitelinks.enwiki;
  if (!isObject(enwiki) || typeof enwiki.title !== 'string') {
    throw new Error('wikimedia_identity_response_invalid');
  }
  if (!enwiki.title || enwiki.title !== enwiki.title.trim()) {
    throw new Error('wikimedia_identity_response_invalid');
  }
  return enwiki.title;
}

async function resolvePageAndRedirects(
  title: string,
  dependencies: WikimediaProspectiveResearchDependencies,
): Promise<Readonly<{
  canonicalPage: WikimediaEntityAttentionIdentityPage;
  redirects: readonly WikimediaEntityAttentionIdentityPage[];
}>> {
  const redirects: WikimediaEntityAttentionIdentityPage[] = [];
  let continuation: string | null = null;
  let canonicalPage: WikimediaEntityAttentionIdentityPage | null = null;

  do {
    const url = new URL(ENWIKI_API);
    url.searchParams.set('action', 'query');
    url.searchParams.set('format', 'json');
    url.searchParams.set('formatversion', '2');
    url.searchParams.set('titles', title);
    url.searchParams.set('prop', 'info|redirects|pageprops');
    url.searchParams.set('rdnamespace', '0');
    url.searchParams.set('rdlimit', 'max');
    if (continuation) {
      url.searchParams.set('rdcontinue', continuation);
      url.searchParams.set('continue', '||');
    }

    const response = await fetchJson(url, dependencies);
    if (response.status !== 200 || !isObject(response.json)) {
      throw new Error('wikimedia_identity_response_invalid');
    }

    const query = response.json.query;
    if (!isObject(query) || !Array.isArray(query.pages) || query.pages.length !== 1) {
      throw new Error('wikimedia_identity_response_invalid');
    }

    const page = query.pages[0];
    if (!isObject(page) || page.missing === true) {
      throw new Error('wikimedia_identity_response_invalid');
    }

    if (canonicalPage === null) {
      if (
        !Number.isSafeInteger(page.pageid)
        || Number(page.pageid) <= 0
        || typeof page.title !== 'string'
        || !isObject(page.pageprops)
        || page.pageprops.wikibase_item !== WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_WIKIDATA_QID
      ) {
        throw new Error('wikimedia_identity_response_invalid');
      }
      canonicalPage = Object.freeze({
        pageId: Number(page.pageid),
        title: page.title,
      });
    } else if (
      page.pageid !== canonicalPage.pageId
      || page.title !== canonicalPage.title
    ) {
      throw new Error('wikimedia_identity_response_invalid');
    }

    const pageRedirects = page.redirects ?? [];
    if (!Array.isArray(pageRedirects)) {
      throw new Error('wikimedia_identity_response_invalid');
    }
    for (const redirect of pageRedirects) {
      if (
        !isObject(redirect)
        || !Number.isSafeInteger(redirect.pageid)
        || Number(redirect.pageid) <= 0
        || typeof redirect.title !== 'string'
        || !redirect.title
        || redirect.title !== redirect.title.trim()
      ) {
        throw new Error('wikimedia_identity_response_invalid');
      }
      redirects.push(
        Object.freeze({
          pageId: Number(redirect.pageid),
          title: redirect.title,
        }),
      );
    }

    const next = response.json.continue;
    if (next === undefined) {
      continuation = null;
    } else if (isObject(next) && typeof next.rdcontinue === 'string') {
      continuation = next.rdcontinue;
    } else {
      throw new Error('wikimedia_identity_response_invalid');
    }
  } while (continuation !== null);

  if (!canonicalPage) throw new Error('wikimedia_identity_response_invalid');
  const pages = [canonicalPage, ...redirects];
  if (
    new Set(pages.map((page) => page.pageId)).size !== pages.length
    || new Set(pages.map((page) => page.title)).size !== pages.length
  ) {
    throw new Error('wikimedia_identity_response_invalid');
  }

  return Object.freeze({
    canonicalPage,
    redirects: Object.freeze(
      [...redirects].sort((left, right) => left.title.localeCompare(right.title)),
    ),
  });
}

export async function captureWikimediaEntityAttentionIdentitySnapshot(
  dependencies: WikimediaProspectiveResearchDependencies = {},
): Promise<WikimediaEntityAttentionIdentitySnapshot> {
  const title = await resolveEnwikiTitle(dependencies);
  const identity = await resolvePageAndRedirects(title, dependencies);
  const capturedAt = requireNow(dependencies.now).toISOString();

  const snapshot = Object.freeze({
    canonicalArtistId: WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_ARTIST_ID,
    wikidataQid: WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_WIKIDATA_QID,
    project: WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_PROJECT,
    capturedAt,
    canonicalPage: identity.canonicalPage,
    redirects: identity.redirects,
  });

  if (!validSnapshot(snapshot)) {
    throw new Error('wikimedia_identity_response_invalid');
  }
  return snapshot;
}

export async function captureWikimediaEntityAttentionPreDayResearch(
  observationDay: string,
  dependencies: WikimediaProspectiveResearchDependencies = {},
): Promise<WikimediaProspectiveResearchSnapshotEnvelope> {
  const bounds = dayBounds(observationDay);
  if (!bounds) throw new Error('wikimedia_research_observation_day_invalid');

  const snapshot = await captureWikimediaEntityAttentionIdentitySnapshot(dependencies);
  if (Date.parse(snapshot.capturedAt) >= Date.parse(bounds.start)) {
    throw new Error('wikimedia_research_pre_day_snapshot_late');
  }

  return Object.freeze({
    ...base(),
    phase: 'pre-day-identity-snapshot' as const,
    observationDay,
    observationTime: Object.freeze({
      kind: 'period' as const,
      start: bounds.start,
      end: bounds.end,
    }),
    identity: snapshot,
  });
}

function aqsTimestamp(day: string): string {
  return day.replaceAll('-', '') + '00';
}

async function fetchAqsAggregate(
  observationDay: string,
  dependencies: WikimediaProspectiveResearchDependencies,
): Promise<WikimediaAqsAggregateResponse> {
  const target = aqsTimestamp(observationDay);
  const url = new URL(
    `${AQS_ROOT}/metrics/pageviews/aggregate/en.wikipedia.org/all-access/user/daily/${target}/${target}`,
  );
  const response = await fetchJson(url, dependencies);
  if (response.status !== 200) {
    return Object.freeze({ httpStatus: response.status, items: Object.freeze([]) });
  }
  if (!isObject(response.json) || !Array.isArray(response.json.items)) {
    throw new Error('wikimedia_transport_response_invalid');
  }

  const items = response.json.items.map((item) => {
    if (
      !isObject(item)
      || typeof item.timestamp !== 'string'
      || !Number.isSafeInteger(item.views)
      || Number(item.views) < 0
    ) {
      throw new Error('wikimedia_transport_response_invalid');
    }
    return Object.freeze({
      timestamp: item.timestamp,
      views: Number(item.views),
    });
  });
  return Object.freeze({ httpStatus: 200, items: Object.freeze(items) });
}

async function fetchAqsTitle(
  title: string,
  observationDay: string,
  dependencies: WikimediaProspectiveResearchDependencies,
): Promise<WikimediaAqsTitleResponse> {
  const target = aqsTimestamp(observationDay);
  const article = encodeURIComponent(title.replace(/ /g, '_'));
  const url = new URL(
    `${AQS_ROOT}/metrics/pageviews/per-article/en.wikipedia.org/all-access/user/${article}/daily/${target}/${target}`,
  );
  const response = await fetchJson(url, dependencies);
  if (response.status !== 200) {
    return Object.freeze({
      title,
      httpStatus: response.status,
      items: Object.freeze([]),
    });
  }
  if (!isObject(response.json) || !Array.isArray(response.json.items)) {
    throw new Error('wikimedia_transport_response_invalid');
  }

  const items = response.json.items.map((item) => {
    if (
      !isObject(item)
      || typeof item.timestamp !== 'string'
      || !Number.isSafeInteger(item.views)
      || Number(item.views) < 0
    ) {
      throw new Error('wikimedia_transport_response_invalid');
    }
    return Object.freeze({
      timestamp: item.timestamp,
      views: Number(item.views),
    });
  });
  return Object.freeze({
    title,
    httpStatus: 200,
    items: Object.freeze(items),
  });
}

function postDataIssue(
  reason:
    | 'invalid-observation-day'
    | 'invalid-pre-day-snapshot'
    | 'snapshot-timing-invalid'
    | 'identity-response-invalid'
    | 'transport-response-invalid',
): WikimediaProspectiveResearchObservation {
  return Object.freeze({
    ...base(),
    phase: 'post-day-observation' as const,
    status: 'data-issue' as const,
    reason,
    value: null,
    unit: 'pageviews' as const,
  });
}

function postUnavailable(
  reason:
    | 'identity-changed-during-observation'
    | 'project-day-not-proven-loaded'
    | 'per-article-day-not-proven-loaded'
    | 'transport-error',
): WikimediaProspectiveResearchObservation {
  return Object.freeze({
    ...base(),
    phase: 'post-day-observation' as const,
    status: 'unavailable' as const,
    reason,
    value: null,
    unit: 'pageviews' as const,
  });
}

export async function collectWikimediaEntityAttentionPostDayResearch(
  input: Readonly<{
    observationDay: string;
    beforeIdentity: WikimediaEntityAttentionIdentitySnapshot;
  }>,
  dependencies: WikimediaProspectiveResearchDependencies = {},
): Promise<WikimediaProspectiveResearchObservation> {
  const bounds = dayBounds(input.observationDay);
  if (!bounds) return postDataIssue('invalid-observation-day');
  if (!validSnapshot(input.beforeIdentity)) {
    return postDataIssue('invalid-pre-day-snapshot');
  }
  if (Date.parse(input.beforeIdentity.capturedAt) >= Date.parse(bounds.start)) {
    return postDataIssue('snapshot-timing-invalid');
  }

  const collectionClock = requireNow(dependencies.now);
  if (collectionClock.getTime() < Date.parse(bounds.end)) {
    return postDataIssue('snapshot-timing-invalid');
  }

  let afterIdentity: WikimediaEntityAttentionIdentitySnapshot;
  try {
    afterIdentity = await captureWikimediaEntityAttentionIdentitySnapshot({
      ...dependencies,
      now: () => collectionClock,
    });
  } catch {
    return postDataIssue('identity-response-invalid');
  }

  if (Date.parse(afterIdentity.capturedAt) < Date.parse(bounds.end)) {
    return postDataIssue('snapshot-timing-invalid');
  }
  if (!sameIdentity(input.beforeIdentity, afterIdentity)) {
    return postUnavailable('identity-changed-during-observation');
  }

  const eligibleTitles = Object.freeze([
    input.beforeIdentity.canonicalPage.title,
    ...input.beforeIdentity.redirects.map((redirect) => redirect.title),
  ]);

  let aggregate: WikimediaAqsAggregateResponse;
  let titleResponses: readonly WikimediaAqsTitleResponse[];
  try {
    aggregate = await fetchAqsAggregate(input.observationDay, dependencies);
    titleResponses = Object.freeze(
      await Promise.all(
        eligibleTitles.map((title) =>
          fetchAqsTitle(title, input.observationDay, dependencies),
        ),
      ),
    );
  } catch {
    return postDataIssue('transport-response-invalid');
  }

  const transport = evaluateWikimediaEntityAttentionAqsTransportResearch({
    observationDay: input.observationDay,
    canonicalTitle: input.beforeIdentity.canonicalPage.title,
    eligibleTitles,
    aggregate,
    titleResponses,
  });

  if (transport.status === 'unavailable') {
    return postUnavailable(transport.reason);
  }
  if (transport.status === 'data-issue') {
    return postDataIssue('transport-response-invalid');
  }

  return Object.freeze({
    ...base(),
    phase: 'post-day-observation' as const,
    status: 'available' as const,
    reason: 'prospective_aqs_entity_attention_available' as const,
    canonicalArtistId: WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_ARTIST_ID,
    wikidataQid: WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_WIKIDATA_QID,
    project: WIKIMEDIA_ENTITY_ATTENTION_RESEARCH_PROJECT,
    sourceSemantics: 'wikimedia-aqs-per-article-loaded-day' as const,
    unit: 'pageviews' as const,
    observationTime: Object.freeze({
      kind: 'period' as const,
      start: bounds.start,
      end: bounds.end,
    }),
    collectionTime: collectionClock.toISOString(),
    beforeIdentityCapturedAt: input.beforeIdentity.capturedAt,
    afterIdentityCapturedAt: afterIdentity.capturedAt,
    eligibleTitles,
    perTitleViews: transport.perTitleViews,
    value: transport.value,
    loadProof: transport.loadProof,
  });
}
