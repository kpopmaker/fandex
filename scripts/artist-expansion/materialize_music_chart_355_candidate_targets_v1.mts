import fs from 'node:fs';
import path from 'node:path';
import { artistUniverseV4 } from '../../app/data/v4/artistUniverse';

type ActiveTarget = {
  canonicalArtistId: string;
  artist: string;
  aliases: string[];
};

type Compatibility = {
  canonicalUniverseCount: number;
  sources: {
    music_chart: {
      supportedCanonicalArtistIds: string[];
      unresolvedCanonicalArtistIds: string[];
      unsupportedCanonicalArtistIds: string[];
    };
  };
};

const ROOT = process.cwd();
const ACTIVE_PATH = path.join(ROOT, 'data/fandex-cloud-v10/seed/music_chart_artist_targets_v1.json');
const COMPAT_PATH = path.join(ROOT, 'data/fandex-cloud-v10/seed/artist_source_compatibility_v1.json');
const OUTPUT_PATH = path.join(ROOT, 'music_chart_artist_targets_355_candidate_v1.json');

const compact = (value: string) =>
  value.trim().toLocaleLowerCase().replace(/[^0-9a-z가-힣]+/g, '');

const normalizedKey = (value: string) => compact(value);

const active = JSON.parse(fs.readFileSync(ACTIVE_PATH, 'utf8')) as {
  version: string;
  artists: ActiveTarget[];
};
const compat = JSON.parse(fs.readFileSync(COMPAT_PATH, 'utf8')) as Compatibility;

if (artistUniverseV4.length !== 355) {
  throw new Error(`artist_universe_count_mismatch:${artistUniverseV4.length}`);
}
if (compat.canonicalUniverseCount !== 355) {
  throw new Error(`compatibility_universe_count_mismatch:${compat.canonicalUniverseCount}`);
}

const music = compat.sources.music_chart;
const supported = new Set(music.supportedCanonicalArtistIds);
const unresolved = new Set(music.unresolvedCanonicalArtistIds);
const unsupported = new Set(music.unsupportedCanonicalArtistIds);

if (supported.size !== 21 || unresolved.size !== 334 || unsupported.size !== 0) {
  throw new Error(
    `unexpected_music_compatibility:supported=${supported.size},unresolved=${unresolved.size},unsupported=${unsupported.size}`,
  );
}

const activeById = new Map(active.artists.map((row) => [row.canonicalArtistId, row]));
if (activeById.size !== 21) {
  throw new Error(`active_music_target_count_mismatch:${activeById.size}`);
}
for (const id of supported) {
  if (!activeById.has(id)) throw new Error(`supported_without_reviewed_target:${id}`);
}

const droppedShortAliases: Array<{ canonicalArtistId: string; alias: string }> = [];
const candidateRows = artistUniverseV4.map((artist) => {
  const reviewed = activeById.get(artist.id);
  if (reviewed) {
    return {
      canonicalArtistId: artist.id,
      artist: reviewed.artist,
      aliases: reviewed.aliases,
      bindingStatus: 'reviewed_supported_preserved',
      source: 'music_chart_artist_targets_v1',
    };
  }

  if (!unresolved.has(artist.id)) {
    throw new Error(`artist_not_in_music_compatibility_partition:${artist.id}`);
  }

  const seen = new Set<string>();
  const aliases: string[] = [];
  for (const raw of [
    artist.nameKo,
    artist.nameEn,
    artist.ticker,
    ...artist.profile.aliases,
    ...artist.profile.koreanAliases,
    ...artist.profile.englishAliases,
  ]) {
    const alias = String(raw ?? '').trim();
    if (!alias) continue;
    const key = normalizedKey(alias);
    if (!key) continue;
    if (key.length < 2) {
      droppedShortAliases.push({ canonicalArtistId: artist.id, alias });
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    aliases.push(alias);
  }

  if (aliases.length === 0) {
    throw new Error(`candidate_has_no_safe_aliases:${artist.id}`);
  }

  return {
    canonicalArtistId: artist.id,
    artist: artist.nameKo,
    aliases,
    bindingStatus: 'candidate_only_unresolved',
    source: 'artist_universe_v4',
  };
});

const aliasOwners = new Map<string, Set<string>>();
for (const row of candidateRows) {
  for (const alias of row.aliases) {
    const key = normalizedKey(alias);
    const owners = aliasOwners.get(key) ?? new Set<string>();
    owners.add(row.canonicalArtistId);
    aliasOwners.set(key, owners);
  }
}
const aliasCollisions = [...aliasOwners.entries()]
  .filter(([, owners]) => owners.size > 1)
  .map(([normalizedAlias, owners]) => ({
    normalizedAlias,
    canonicalArtistIds: [...owners].sort(),
  }))
  .sort((a, b) => a.normalizedAlias.localeCompare(b.normalizedAlias));

const payload = {
  version: 'music_chart_artist_targets_355_candidate_v1',
  status: 'candidate_only_non_activating',
  canonicalUniverseVersion: 'artist_universe_v4',
  canonicalUniverseCount: 355,
  preservedReviewedSupportedCount: candidateRows.filter((x) => x.bindingStatus === 'reviewed_supported_preserved').length,
  unresolvedCandidateCount: candidateRows.filter((x) => x.bindingStatus === 'candidate_only_unresolved').length,
  unsupportedCount: unsupported.size,
  aliasPolicy: {
    fuzzyAutoBinding: false,
    displayNameOnlyAutoPromotion: false,
    shortNormalizedAliasMinimumLength: 2,
    ambiguousAliasAutoSelection: false,
  },
  droppedShortAliasCount: droppedShortAliases.length,
  droppedShortAliases,
  aliasCollisionCount: aliasCollisions.length,
  aliasCollisions,
  artists: candidateRows,
  safety: {
    activeTargetSeedModified: false,
    compatibilityRegistryModified: false,
    productCohortModified: false,
    productRuntimeModified: false,
    schedulerModified: false,
    databaseModified: false,
    deploymentAuthorized: false,
    mainMergeAuthorized: false,
  },
};

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(
  [
    'PASS: materialized Music 355 candidate targets',
    'total=355',
    `reviewed=${payload.preservedReviewedSupportedCount}`,
    `unresolvedCandidates=${payload.unresolvedCandidateCount}`,
    `aliasCollisions=${payload.aliasCollisionCount}`,
    `droppedShortAliases=${payload.droppedShortAliasCount}`,
  ].join(' | '),
);
