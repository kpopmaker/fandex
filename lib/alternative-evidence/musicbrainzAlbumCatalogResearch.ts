import { sha256Canonical } from '../shared/canonicalDigest';

export const MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_CONTRACT_VERSION =
  'musicbrainz-album-catalog-research-v1';
export const MUSICBRAINZ_PROVIDER_ID = 'musicbrainz';
export const MUSICBRAINZ_API_ROOT = 'https://musicbrainz.org/ws/2';
export const MUSICBRAINZ_SITE_ROOT = 'https://musicbrainz.org';
export const MUSICBRAINZ_RESEARCH_USER_AGENT =
  'FANDEXResearch/0.1 (https://github.com/kpopmaker/fandex)';

export const MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_DESCRIPTOR = Object.freeze({
  contractVersion: MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_CONTRACT_VERSION,
  providerId: MUSICBRAINZ_PROVIDER_ID,
  sourceFamily: 'catalog-identity-provider' as const,
  lifecycle: 'research' as const,
  directProductContributionEligible: false as const,
  productScorePublished: false as const,
  productMethodologyFrozen: false as const,
  productionEligible: false as const,
  liveCallMode: 'manual-research-only' as const,
  pollingAllowed: false as const,
  maxAverageRequestsPerSecond: 1 as const,
  semantics: 'provider-release-group-catalog-observation' as const,
});

export type MusicBrainzArtistCreditResearch = Readonly<{
  providerArtistId: string | null;
  canonicalArtistMatch: boolean;
  providerArtistName: string | null;
  creditedName: string | null;
  joinPhrase: string;
}>;

export type MusicBrainzCanonicalArtistCreditState =
  | 'sole-credit'
  | 'multi-artist-credit'
  | 'absent'
  | 'unresolved';

export type MusicBrainzReleaseGroupResearchObservation = Readonly<{
  contractVersion: typeof MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_CONTRACT_VERSION;
  lifecycle: 'research';
  directProductContributionEligible: false;
  productScorePublished: false;
  productMethodologyFrozen: false;
  providerId: typeof MUSICBRAINZ_PROVIDER_ID;
  canonicalArtistId: string;
  providerArtistId: string;
  providerReleaseGroupId: string;
  title: string;
  firstReleaseDate: string | null;
  primaryType: string | null;
  secondaryTypes: readonly string[];
  artistCredit: readonly MusicBrainzArtistCreditResearch[];
  canonicalArtistCreditState: MusicBrainzCanonicalArtistCreditState;
  providerObservationTime: null;
  collectedAt: string;
  sourceUrl: string;
  providerPayloadDigest: string;
  catalogInclusionMeaning: 'observed-in-provider-artist-release-group-browse';
}>;

export type MusicBrainzAlbumCatalogResearchPage = Readonly<{
  contractVersion: typeof MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_CONTRACT_VERSION;
  lifecycle: 'research';
  directProductContributionEligible: false;
  productScorePublished: false;
  productMethodologyFrozen: false;
  canonicalArtistId: string;
  providerArtistId: string;
  providerReleaseGroupCount: number | null;
  providerOffset: number;
  requestedLimit: number;
  returnedCount: number;
  paginationState: 'provider-count-covered' | 'more-pages-available' | 'provider-count-unknown';
  observations: readonly MusicBrainzReleaseGroupResearchObservation[];
  rawProviderResponse: unknown;
}>;

export type MusicBrainzAlbumCatalogResearchCommand = Readonly<{
  canonicalArtistId: string;
  providerArtistId: string;
  limit: number;
  offset: number;
}>;

export type MusicBrainzAlbumCatalogResearchDependencies = Readonly<{
  fetchImpl: typeof fetch;
  now: () => Date;
  userAgent: string;
}>;

function asRecord(value: unknown): Readonly<Record<string, unknown>> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function finiteNonNegativeInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function parseArtistCredit(
  raw: unknown,
  canonicalProviderArtistId: string,
): readonly MusicBrainzArtistCreditResearch[] {
  if (!Array.isArray(raw)) return Object.freeze([]);
  return Object.freeze(raw.map((entry) => {
    const credit = asRecord(entry);
    const artist = asRecord(credit?.artist);
    const providerArtistId = stringOrNull(artist?.id);
    return Object.freeze({
      providerArtistId,
      canonicalArtistMatch: providerArtistId === canonicalProviderArtistId,
      providerArtistName: stringOrNull(artist?.name),
      creditedName: stringOrNull(credit?.name),
      joinPhrase: typeof credit?.joinphrase === 'string' ? credit.joinphrase : '',
    });
  }));
}

function classifyCanonicalArtistCredit(
  credits: readonly MusicBrainzArtistCreditResearch[],
): MusicBrainzCanonicalArtistCreditState {
  if (credits.length === 0) return 'unresolved';
  if (!credits.some((credit) => credit.canonicalArtistMatch)) return 'absent';
  return credits.length === 1 ? 'sole-credit' : 'multi-artist-credit';
}

function decodeReleaseGroup(
  raw: unknown,
  input: Readonly<{
    canonicalArtistId: string;
    providerArtistId: string;
    collectedAt: string;
  }>,
): MusicBrainzReleaseGroupResearchObservation {
  const row = asRecord(raw);
  if (!row) throw new Error('musicbrainz_release_group_row_invalid');
  const providerReleaseGroupId = stringOrNull(row.id);
  const title = stringOrNull(row.title);
  if (!providerReleaseGroupId) throw new Error('musicbrainz_release_group_id_missing');
  if (!title) throw new Error('musicbrainz_release_group_title_missing');

  const artistCredit = parseArtistCredit(row['artist-credit'], input.providerArtistId);
  const rawSecondaryTypes = row['secondary-types'];
  const secondaryTypes = Array.isArray(rawSecondaryTypes)
    ? Object.freeze(rawSecondaryTypes.filter((value): value is string => typeof value === 'string'))
    : Object.freeze([] as string[]);

  return Object.freeze({
    contractVersion: MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research',
    directProductContributionEligible: false,
    productScorePublished: false,
    productMethodologyFrozen: false,
    providerId: MUSICBRAINZ_PROVIDER_ID,
    canonicalArtistId: input.canonicalArtistId,
    providerArtistId: input.providerArtistId,
    providerReleaseGroupId,
    title,
    firstReleaseDate: stringOrNull(row['first-release-date']),
    primaryType: stringOrNull(row['primary-type']),
    secondaryTypes,
    artistCredit,
    canonicalArtistCreditState: classifyCanonicalArtistCredit(artistCredit),
    providerObservationTime: null,
    collectedAt: input.collectedAt,
    sourceUrl: `${MUSICBRAINZ_SITE_ROOT}/release-group/${providerReleaseGroupId}`,
    providerPayloadDigest: sha256Canonical(raw),
    catalogInclusionMeaning: 'observed-in-provider-artist-release-group-browse',
  });
}

export function buildMusicBrainzReleaseGroupBrowseUrl(
  command: MusicBrainzAlbumCatalogResearchCommand,
): string {
  if (!command.canonicalArtistId.trim()) throw new Error('canonical_artist_id_required');
  if (!command.providerArtistId.trim()) throw new Error('musicbrainz_artist_id_required');
  if (!Number.isSafeInteger(command.limit) || command.limit < 1 || command.limit > 100) {
    throw new Error('musicbrainz_limit_must_be_1_to_100');
  }
  if (!Number.isSafeInteger(command.offset) || command.offset < 0) {
    throw new Error('musicbrainz_offset_must_be_non_negative_integer');
  }
  const query = new URLSearchParams({
    artist: command.providerArtistId,
    limit: String(command.limit),
    offset: String(command.offset),
    inc: 'artist-credits',
    fmt: 'json',
    'release-group-status': 'website-default',
  });
  return `${MUSICBRAINZ_API_ROOT}/release-group?${query.toString()}`;
}

export function decodeMusicBrainzReleaseGroupPage(
  rawProviderResponse: unknown,
  input: Readonly<{
    canonicalArtistId: string;
    providerArtistId: string;
    requestedLimit: number;
    collectedAt: string;
  }>,
): MusicBrainzAlbumCatalogResearchPage {
  const response = asRecord(rawProviderResponse);
  if (!response) throw new Error('musicbrainz_release_group_response_invalid');
  const rawRows = response['release-groups'];
  if (!Array.isArray(rawRows)) throw new Error('musicbrainz_release_groups_missing');

  const providerCount = finiteNonNegativeInteger(response['release-group-count']);
  const providerOffset = finiteNonNegativeInteger(response['release-group-offset']) ?? 0;
  const observations = Object.freeze(rawRows.map((row) => decodeReleaseGroup(row, {
    canonicalArtistId: input.canonicalArtistId,
    providerArtistId: input.providerArtistId,
    collectedAt: input.collectedAt,
  })));
  const paginationState = providerCount === null
    ? 'provider-count-unknown' as const
    : providerOffset + observations.length >= providerCount
      ? 'provider-count-covered' as const
      : 'more-pages-available' as const;

  return Object.freeze({
    contractVersion: MUSICBRAINZ_ALBUM_CATALOG_RESEARCH_CONTRACT_VERSION,
    lifecycle: 'research',
    directProductContributionEligible: false,
    productScorePublished: false,
    productMethodologyFrozen: false,
    canonicalArtistId: input.canonicalArtistId,
    providerArtistId: input.providerArtistId,
    providerReleaseGroupCount: providerCount,
    providerOffset,
    requestedLimit: input.requestedLimit,
    returnedCount: observations.length,
    paginationState,
    observations,
    rawProviderResponse,
  });
}

export function parseMusicBrainzAlbumCatalogResearchCommand(
  argv: readonly string[],
): MusicBrainzAlbumCatalogResearchCommand {
  const values = new Map<string, string>();
  for (const token of argv) {
    if (!token.startsWith('--') || !token.includes('=')) throw new Error('musicbrainz_research_args_must_use_key_value');
    const [key, ...rest] = token.slice(2).split('=');
    values.set(key, rest.join('='));
  }
  const canonicalArtistId = values.get('canonical-artist-id') ?? '';
  const providerArtistId = values.get('provider-artist-id') ?? '';
  const limit = Number(values.get('limit') ?? '100');
  const offset = Number(values.get('offset') ?? '0');
  const command = Object.freeze({ canonicalArtistId, providerArtistId, limit, offset });
  buildMusicBrainzReleaseGroupBrowseUrl(command);
  return command;
}

export async function runMusicBrainzAlbumCatalogResearch(
  argv: readonly string[],
  dependencies: Partial<MusicBrainzAlbumCatalogResearchDependencies> = {},
): Promise<MusicBrainzAlbumCatalogResearchPage> {
  const command = parseMusicBrainzAlbumCatalogResearchCommand(argv);
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const now = dependencies.now ?? (() => new Date());
  const userAgent = dependencies.userAgent ?? MUSICBRAINZ_RESEARCH_USER_AGENT;
  if (!userAgent.trim()) throw new Error('musicbrainz_user_agent_required');

  const url = buildMusicBrainzReleaseGroupBrowseUrl(command);
  const response = await fetchImpl(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': userAgent,
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`musicbrainz_research_http_${response.status}`);
  const rawProviderResponse: unknown = await response.json();
  const collectedAt = now().toISOString();
  return decodeMusicBrainzReleaseGroupPage(rawProviderResponse, {
    canonicalArtistId: command.canonicalArtistId,
    providerArtistId: command.providerArtistId,
    requestedLimit: command.limit,
    collectedAt,
  });
}
