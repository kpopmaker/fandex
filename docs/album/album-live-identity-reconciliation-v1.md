# FANDEX Album Live Identity Reconciliation Gate v1

## Status

```text
contract = album-live-identity-reconciliation-v1
artistCandidateGeneration = qualified
reviewedArtistMappingGate = qualified
reviewedReleaseMappingGate = qualified
providerResolverBinding = qualified
liveProviderTransport = already qualified in album-one-shot-live-qualification-v1
productionPersistence = false
productionPublication = false
commercialRightsCleared = false
```

This gate connects live Circle Retail / Hanteo album rows to FANDEX identity without weakening the existing Album Identity Foundation.

A provider label, Barcode, `artistIdx`, or `targetIdx` is never converted directly into a FANDEX canonical ID.

## Existing identity invariant

A strong identity still requires:

```text
resolutionState = resolved
canonical ID != null
reviewState = human-reviewed | provider-verified
```

Machine candidates are not strong identities.

## Artist candidate source

The current candidate catalog is built from `artistUniverseV4`:

```text
id
nameKo
nameEn
profile.aliases
profile.koreanAliases
profile.englishAliases
```

The live audit used 100 FANDEX artist entries.

`artistUniverseV4` is used only for candidate generation. Its seed profiles are not treated as human review evidence.

## Release boundary

No equivalent canonical FANDEX Release catalog was found in the current repository path.

Therefore release identity is fail-closed:

```text
provider release text alone       != FANDEX release ID
Circle Barcode alone              != FANDEX release ID
Hanteo targetIdx alone            != FANDEX release ID
Album Index                       != FANDEX release ID
```

A row can become `resolved` only when an explicit reviewed release mapping exists.

## Reviewed mapping registry

The gate defines two independent mapping classes:

```text
AlbumReviewedArtistMapping
AlbumReviewedReleaseMapping
```

Each mapping requires:

```text
reviewState = human-reviewed | provider-verified
evidenceIds >= 1
```

Artist and release mappings must point to the same FANDEX artist. A disagreement is `conflicting` and blocks normalization.

### Circle keys

```text
providerArtistId = null
providerReleaseId = null
providerSkuId = Barcode
rawArtistText = Artist
rawReleaseText = Album
```

### Hanteo keys

```text
providerArtistId = artistIdx
providerReleaseId = targetIdx
providerSkuId = null
rawArtistText = artist label
rawReleaseText = album target label
```

## Candidate states

```text
resolved
artist-candidate-only
release-review-required
ambiguous
conflicting
no-match
```

Exact alias matches without reviewed mappings remain:

```text
resolutionState = candidate
reviewState = machine-candidate
```

They are not observation-eligible.

## Conservative bilingual label variants

Provider labels frequently combine the same artist in two scripts:

```text
Stray Kids (스트레이 키즈)
아일릿(ILLIT)
LE SSERAFIM (르세라핌)
```

`album-live-identity-label-variants-v1` permits only one conservative transformation:

```text
FULL_NAME (ALIAS)
→ FULL_NAME
→ ALIAS
```

The transform applies only when the entire label is one non-nested parenthetical pair.

Explicitly not implemented:

```text
substring matching
edit distance
fuzzy similarity
token containment
phonetic matching
LLM identity guessing
```

Variants can create machine candidates only. They do not broaden a reviewed provider mapping into a resolved identity.

## Live candidate audit

Bounded run:

```text
GitHub Actions run = 33456925202
Circle requests = 1
Hanteo requests = 1
rawBodiesPersisted = false
salesValuesPersisted = false
databaseReads = 0
databaseWrites = 0
scheduleMutations = 0
publicationAuthorized = false
```

The audit used the original exact-only candidate rule before the conservative bilingual-variant extension.

Observed result:

```text
Artist catalog = 100

Circle Retail = 50 rows
  artist-candidate-only = 16
  no-match = 34
  ambiguous = 0

Hanteo = 20 rows
  artist-candidate-only = 9
  no-match = 11
  ambiguous = 0

Total = 70
artist candidate rows = 25
no-match rows = 45
```

No post-variant count is claimed because the providers were not intentionally re-queried to manufacture a new metric.

## Selected observed candidate examples

```text
Circle
NCT 127     -> nct127
ENHYPEN     -> enhypen
V           -> v
KATSEYE     -> katseye
NCT DREAM   -> nctdream
BABYMONSTER -> babymonster
aespa       -> aespa
NewJeans    -> newjeans

Hanteo
Stray Kids  -> straykids
NCT 127     -> nct127
ENHYPEN     -> enhypen
KATSEYE     -> katseye
TREASURE    -> treasure
BTS         -> bts
V           -> v
ATEEZ       -> ateez
```

Examples that were exact-only `no-match` because the provider label included bilingual formatting included:

```text
Stray Kids (스트레이 키즈)
LE SSERAFIM (르세라핌)
아일릿(ILLIT)
레드벨벳(Red Velvet)
```

These labels motivated the conservative variant layer; they still require reviewed mapping before resolution.

## Adapter integration

Qualified resolver factories feed the existing Provider Adapters without changing their strong identity gates.

Tests prove:

```text
reviewed Circle artist + release mapping
→ Circle Discovery
→ Circle Adapter
→ DirectAlbumObservation
→ Orchestrator completed

reviewed Hanteo artistIdx + targetIdx mappings
→ Hanteo salesVolume Adapter
→ DirectAlbumObservation
→ Orchestrator completed
```

They also prove:

```text
artist mapping only
→ release-review-required

artist/release mappings disagree
→ conflicting

ambiguous candidate labels
→ no winner selected
```

## Non-authorization

This gate does not authorize:

```text
recurring Provider collection
raw Provider persistence
normalized Production persistence
schedule activation
publication
redistribution
commercial use
```

The next technical step is to create a bounded reviewed Artist/Release mapping packet for a small overlap cohort, then run a one-shot live normalization using only those reviewed mappings.
