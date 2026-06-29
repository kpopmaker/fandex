# FANDEX Naver Query Strategy Draft

Status: draft, local shape-check only.

## Why Query Strategy Exists

Naver News search quality depends heavily on the query string. A single artist
name can produce false positives, stale articles, or unrelated company and fan
community content. FANDEX needs a deterministic query strategy before any real
Naver News API call is introduced.

The query strategy layer turns an artist identity into planned query drafts. It
does not fetch news, does not normalize raw Naver response items, and does not
produce runtime issue scores.

## Separation Before API Calls

`app/data/v4/scoring/naverNewsQueryStrategy.ts` is intentionally separate from
the Naver source adapter.

The planned path is:

```text
artist identity
  -> query strategy
  -> source adapter
  -> raw item normalization
  -> candidate/signal draft
  -> future persistence/scoring
```

The current runtime path remains:

```text
mock issue signals
  -> issue scoring
  -> issue metadata
  -> price/UI
```

The query strategy is not connected to `priceEngine`, `scoreEngine`,
`compatibleHistory`, UI pages, Supabase, or the active adapter registry.

## Artist Identity

Each query strategy input starts with `ArtistNewsQueryIdentity`:

1. `artistName`: required canonical artist name.
2. `aliases`: optional Korean or alternate names.
3. `agency`: optional agency label for identity and contract queries.
4. `disambiguationKeywords`: optional terms that narrow ambiguous names.
5. `excludeKeywords`: optional terms carried forward for future filtering.

The helper warns when `artistName` is empty, when an alias duplicates the artist
name or another alias, and when no query can be produced.

## Alias And Disambiguation

Aliases are useful because Korean entertainment news may use either English
names or Hangul names. The draft strategy can include alias queries by default,
but it dedupes identical query strings so the same query is not scheduled twice.

Disambiguation keywords are appended to generated query tokens. They are meant
for ambiguous names where the artist name alone could match unrelated people,
brands, shows, or companies.

## Query Buckets

The draft supports these buckets:

1. `core_identity`: artist identity, agency, and K-pop identity checks.
2. `comeback_release`: comeback, album, single, teaser, music video, pre-release,
   and release intent.
3. `chart_performance`: chart, Melon, Spotify, Billboard, Circle Chart, digital,
   album, and first-week sales intent.
4. `brand_ads`: brand, ad, ambassador, pictorial, collaboration, and campaign
   intent.
5. `tour_event`: concert, tour, fan meeting, festival, and performance intent.
6. `contract_agency`: contract, renewal, exclusive contract, agency transfer,
   and settlement intent.
7. `controversy_risk`: controversy, apology, clarification, legal, dispute,
   rumor, and hiatus intent.
8. `fandom_community`: fandom, fan club, community, challenge, viral, birthday
   cafe, and support intent.

## Risk Query Priority

`controversy_risk` queries are assigned `watch` priority. They should not be
mixed with positive demand signals by default because rumor-like or adverse
content needs stronger review, duplicate clustering, and reliability checks
before it can influence scoring.

Risk queries can be disabled with `includeRiskQueries: false`. When they are
disabled, the helper emits an informational warning so scheduled coverage gaps
are visible.

## Draft Only

This layer has no real API call. It does not use `fetch`, axios, `.env`, API
keys, Supabase, migrations, or external network access.

`runNaverNewsQueryStrategyShapeCheck()` uses local sample identities only:

1. IVE / Starship / alias `아이브`
2. RIIZE / SM / alias `라이즈`
3. QWER / alias `큐더블유이알`
4. NewJeans / ADOR / alias `뉴진스`

The shape check returns artist count, query count, bucket count, warning count,
covered buckets, sample query strings, and whether blocking errors exist.

## Future TODO

1. Map `artistUniverseV4` records to `ArtistNewsQueryIdentity`.
2. Connect query buckets to source reliability and review policy.
3. Design query schedule and cadence per bucket and priority.
4. Connect approved query drafts to a real API calling adapter.
5. Connect normalized raw items to Supabase persistence after schema approval.
